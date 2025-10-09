import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DocumentModel,
  DocumentDocument,
  DocumentVisibility,
} from './schemas/document.schema';
import {
  UploadDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
  ShareDocumentDto,
  DocumentStatsDto,
} from './dto/document.dto';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private s3Client: S3Client | null;
  private bucketName: string;

  constructor(
    @InjectModel(DocumentModel.name)
    private documentModel: Model<DocumentDocument>,
    private configService: ConfigService,
  ) {
    // Check if AWS credentials are configured
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );

    if (
      !accessKeyId ||
      !secretAccessKey ||
      accessKeyId === 'your-aws-access-key-id' ||
      secretAccessKey === 'your-aws-secret-access-key'
    ) {
      console.warn(
        'AWS credentials not properly configured. Document upload will use local storage fallback.',
      );
      this.s3Client = null;
    } else {
      const awsConfig = {
        region: this.configService.get<string>('aws.region') || 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      };

      this.s3Client = new S3Client(awsConfig);
    }

    this.bucketName =
      this.configService.get<string>('aws.s3BucketName') ||
      'team-management-platform-files';
  }

  async uploadDocument(
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto,
    userId: string,
  ): Promise<DocumentDocument & { downloadUrl?: string }> {
    try {
      // Validate file
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Check if S3 is configured
      if (!this.s3Client) {
        throw new InternalServerErrorException(
          'File storage not configured. Please configure AWS S3 credentials.',
        );
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
      const s3Key = `documents/${userId}/${uniqueFileName}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(uploadCommand);

      // Save document metadata to database
      const document = new this.documentModel({
        name: uploadDocumentDto.name,
        description: uploadDocumentDto.description,
        originalName: file.originalname,
        fileName: uniqueFileName,
        mimeType: file.mimetype,
        size: file.size,
        s3Key,
        s3Bucket: this.bucketName,
        uploadedBy: new Types.ObjectId(userId),
        project: uploadDocumentDto.project
          ? new Types.ObjectId(uploadDocumentDto.project)
          : undefined,
        visibility: uploadDocumentDto.visibility || 'private',
        tags: uploadDocumentDto.tags || [],
        sharedWith:
          uploadDocumentDto.sharedWith?.map((id) => new Types.ObjectId(id)) ||
          [],
        downloadCount: 0,
        version: 1,
        isLatestVersion: true,
      });

      const savedDoc = await document.save();

      // Populate before returning
      const populatedDoc = (await this.documentModel
        .findById(savedDoc._id)
        .populate('uploadedBy', 'firstName lastName email avatar')
        .populate('project', 'name')
        .exec()) as DocumentDocument;

      // Generate presigned URL and attach to document
      const documentWithUrl: any = populatedDoc.toObject();

      if (this.s3Client) {
        try {
          const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
          });

          const url = await getSignedUrl(this.s3Client, command, {
            expiresIn: 3600, // 1 hour
          });

          documentWithUrl.downloadUrl = url;
        } catch (error) {
          console.error('Failed to generate presigned URL:', error);
          // Don't fail the request if URL generation fails
        }
      }

      return documentWithUrl as DocumentDocument & { downloadUrl?: string };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload document');
    }
  }

  async findAll(
    query: DocumentQueryDto,
    userId: string,
  ): Promise<{
    documents: DocumentDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      project,
      visibility,
      status = 'active',
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      uploadedBy,
      mimeType,
    } = query;

    // Build filter
    const filter: Record<string, unknown> = { status };

    // Access control: user can see their own documents, shared documents, and public documents
    filter.$or = [
      { uploadedBy: new Types.ObjectId(userId) },
      { sharedWith: new Types.ObjectId(userId) },
      { visibility: DocumentVisibility.PUBLIC },
    ];

    if (search) {
      filter.$text = { $search: search };
    }

    if (project) {
      filter.project = new Types.ObjectId(project);
    }

    if (visibility) {
      filter.visibility = visibility;
    }

    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    if (uploadedBy) {
      filter.uploadedBy = new Types.ObjectId(uploadedBy);
    }

    if (mimeType) {
      filter.mimeType = mimeType;
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .populate('uploadedBy', 'firstName lastName email avatar')
        .populate('project', 'name')
        .populate('sharedWith', 'firstName lastName email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter),
    ]);

    // Generate presigned URLs for all documents
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const docObj: any = doc.toObject();

        if (this.s3Client) {
          try {
            const command = new GetObjectCommand({
              Bucket: this.bucketName,
              Key: doc.s3Key,
            });

            const url = await getSignedUrl(this.s3Client, command, {
              expiresIn: 3600, // 1 hour
            });

            docObj.downloadUrl = url;
          } catch (error) {
            console.error(
              'Failed to generate presigned URL for document:',
              doc._id,
              error,
            );
            // Continue without URL
          }
        }

        return docObj;
      }),
    );

    return {
      documents: documentsWithUrls,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<DocumentDocument & { downloadUrl?: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid document ID');
    }

    const document = await this.documentModel
      .findById(id)
      .populate('uploadedBy', 'firstName lastName email avatar')
      .populate('project', 'name')
      .populate('sharedWith', 'firstName lastName email avatar')
      .exec();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access permissions
    const hasAccess =
      document.uploadedBy._id.toString() === userId ||
      document.sharedWith.some((user) => user._id.toString() === userId) ||
      document.visibility === DocumentVisibility.PUBLIC;

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this document');
    }

    // Generate presigned URL and attach to document
    const documentWithUrl: any = document.toObject();

    if (this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: document.s3Key,
        });

        const url = await getSignedUrl(this.s3Client, command, {
          expiresIn: 3600, // 1 hour
        });

        documentWithUrl.downloadUrl = url;
      } catch (error) {
        console.error('Failed to generate presigned URL:', error);
        // Don't fail the request if URL generation fails
      }
    }

    return documentWithUrl as DocumentDocument & { downloadUrl?: string };
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
  ): Promise<DocumentDocument> {
    const document = await this.findOne(id, userId);

    // Only the uploader can update the document
    if (document.uploadedBy._id.toString() !== userId) {
      throw new ForbiddenException('Only the document uploader can update it');
    }

    Object.assign(document, updateDocumentDto);

    if (updateDocumentDto.sharedWith) {
      document.sharedWith = updateDocumentDto.sharedWith.map(
        (id) => new Types.ObjectId(id),
      );
    }

    return await document.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const document = await this.findOne(id, userId);

    // Only the uploader can delete the document
    if (document.uploadedBy._id.toString() !== userId) {
      throw new ForbiddenException('Only the document uploader can delete it');
    }

    try {
      // Check if S3 is configured
      if (!this.s3Client) {
        throw new InternalServerErrorException(
          'File storage not configured. Please configure AWS S3 credentials.',
        );
      }

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: document.s3Key,
      });

      await this.s3Client.send(deleteCommand);

      // Delete from database
      await this.documentModel.findByIdAndDelete(id);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete document');
    }
  }

  async getDownloadUrl(
    id: string,
    userId: string,
  ): Promise<{ url: string; document: DocumentDocument }> {
    const document = await this.findOne(id, userId);

    try {
      // Check if S3 is configured
      if (!this.s3Client) {
        throw new InternalServerErrorException(
          'File storage not configured. Please configure AWS S3 credentials.',
        );
      }

      // Generate presigned URL for download
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: document.s3Key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      }); // 1 hour

      // Update download statistics
      document.downloadCount = (document.downloadCount || 0) + 1;
      document.lastDownloadedAt = new Date();
      document.lastDownloadedBy = new Types.ObjectId(userId);
      await document.save();

      return { url, document };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate download URL');
    } finally {
      // Suppress unused variable warning
    }
  }

  async shareDocument(
    id: string,
    shareDocumentDto: ShareDocumentDto,
    userId: string,
  ): Promise<DocumentDocument> {
    const document = await this.findOne(id, userId);

    // Only the uploader can share the document
    if (document.uploadedBy._id.toString() !== userId) {
      throw new ForbiddenException('Only the document uploader can share it');
    }

    // Add new users to sharedWith array (avoid duplicates)
    const existingSharedIds = document.sharedWith.map((id) => id.toString());
    const newSharedIds = shareDocumentDto.userIds.filter(
      (id) => !existingSharedIds.includes(id),
    );

    document.sharedWith.push(
      ...newSharedIds.map((id) => new Types.ObjectId(id)),
    );

    return await document.save();
  }

  async unshareDocument(
    id: string,
    userId: string,
    targetUserId: string,
  ): Promise<DocumentDocument> {
    const document = await this.findOne(id, userId);

    // Only the uploader can unshare the document
    if (document.uploadedBy._id.toString() !== userId) {
      throw new ForbiddenException('Only the document uploader can unshare it');
    }

    document.sharedWith = document.sharedWith.filter(
      (id) => id.toString() !== targetUserId,
    );

    return await document.save();
  }

  async getDocumentsByProject(
    projectId: string,
    userId: string,
  ): Promise<DocumentDocument[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    return await this.documentModel
      .find({
        project: new Types.ObjectId(projectId),
        status: 'active',
        $or: [
          { uploadedBy: new Types.ObjectId(userId) },
          { sharedWith: new Types.ObjectId(userId) },
          {
            visibility: {
              $in: [
                DocumentVisibility.PUBLIC,
                DocumentVisibility.PRIVATE,
                DocumentVisibility.TEAM,
              ],
            },
          },
        ],
      })
      .populate('uploadedBy', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDocumentStats(userId: string): Promise<DocumentStatsDto> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [
      totalDocuments,
      totalStorageResult,
      totalDownloadsResult,
      documentsThisMonth,
      documentsByTypeResult,
    ] = await Promise.all([
      this.documentModel.countDocuments({
        uploadedBy: new Types.ObjectId(userId),
        status: 'active',
      }),
      this.documentModel.aggregate([
        {
          $match: { uploadedBy: new Types.ObjectId(userId), status: 'active' },
        },
        { $group: { _id: null, totalSize: { $sum: '$size' } } },
      ]),
      this.documentModel.aggregate([
        {
          $match: { uploadedBy: new Types.ObjectId(userId), status: 'active' },
        },
        { $group: { _id: null, totalDownloads: { $sum: '$downloadCount' } } },
      ]),
      this.documentModel.countDocuments({
        uploadedBy: new Types.ObjectId(userId),
        status: 'active',
        createdAt: { $gte: currentMonth },
      }),
      this.documentModel.aggregate([
        {
          $match: { uploadedBy: new Types.ObjectId(userId), status: 'active' },
        },
        { $group: { _id: '$mimeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const documentsByType: Record<string, number> = {};
    documentsByTypeResult.forEach((item) => {
      documentsByType[item._id] = item.count;
    });

    return {
      totalDocuments,
      totalStorageUsed: totalStorageResult[0]?.totalSize || 0,
      totalDownloads: totalDownloadsResult[0]?.totalDownloads || 0,
      documentsThisMonth,
      documentsByType,
    };
  }

  async checkDocumentExists(s3Key: string): Promise<boolean> {
    try {
      // Check if S3 is configured
      if (!this.s3Client) {
        return false;
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getRecentDocuments(
    userId: string,
    limit: number = 10,
  ): Promise<DocumentDocument[]> {
    return await this.documentModel
      .find({
        $or: [
          { uploadedBy: new Types.ObjectId(userId) },
          { sharedWith: new Types.ObjectId(userId) },
        ],
        status: 'active',
      })
      .populate('uploadedBy', 'firstName lastName email avatar')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getMostDownloadedDocuments(
    userId: string,
    limit: number = 10,
  ): Promise<Array<{ document: DocumentDocument; downloads: number }>> {
    const results = await this.documentModel
      .find({
        $or: [
          { uploadedBy: new Types.ObjectId(userId) },
          { sharedWith: new Types.ObjectId(userId) },
        ],
        status: 'active',
        downloadCount: { $gt: 0 }, // Only documents with downloads
      })
      .populate('uploadedBy', 'firstName lastName email avatar')
      .populate('project', 'name')
      .sort({ downloadCount: -1, lastDownloadedAt: -1 })
      .limit(limit)
      .exec();

    return results.map((doc) => ({
      document: doc as DocumentDocument,
      downloads: doc.downloadCount || 0,
    }));
  }
}
