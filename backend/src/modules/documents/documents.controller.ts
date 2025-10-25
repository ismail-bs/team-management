import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import {
  UploadDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
  ShareDocumentDto,
} from './dto/document.dto.js';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        project: {
          type: 'string',
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private', 'project'],
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      required: ['file', 'name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return await this.documentsService.uploadDocument(
      file,
      uploadDocumentDto,
      req.user.sub,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async findAll(
    @Query() query: DocumentQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.documentsService.findAll(query, req.user.sub);

    // Transform to standard paginated response format
    return {
      data: result.documents,
      total: result.total,
      page: result.page,
      limit: query.limit || 10,
      totalPages: result.totalPages,
    };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent documents' })
  @ApiResponse({
    status: 200,
    description: 'Recent documents retrieved successfully',
  })
  async getRecentDocuments(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ) {
    return await this.documentsService.getRecentDocuments(req.user.sub, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiResponse({
    status: 200,
    description: 'Document statistics retrieved successfully',
  })
  async getDocumentStats(@Request() req: AuthenticatedRequest) {
    const [stats, mostDownloaded] = await Promise.all([
      this.documentsService.getDocumentStats(req.user.sub),
      this.documentsService.getMostDownloadedDocuments(req.user.sub, 5),
    ]);

    // Frontend expects: total, totalSize, recentUploads, mostDownloaded
    return {
      total: stats.totalDocuments,
      totalSize: stats.totalStorageUsed,
      recentUploads: stats.documentsThisMonth,
      mostDownloaded: mostDownloaded.map((item) => ({
        name: item.document.name,
        downloads: item.downloads,
        id: item.document?._id?.toString(),
      })),
    };
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get documents by project' })
  @ApiResponse({
    status: 200,
    description: 'Project documents retrieved successfully',
  })
  async getDocumentsByProject(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.documentsService.getDocumentsByProject(
      projectId,
      req.user.sub,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.documentsService.findOne(id, req.user.sub);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for a document' })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
  })
  async getDownloadUrl(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.documentsService.getDownloadUrl(id, req.user.sub);
  }

  @Get(':id/download-direct')
  @ApiOperation({ summary: 'Download document directly' })
  @ApiResponse({ status: 200, description: 'Document downloaded successfully' })
  async downloadDocument(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      const downloadUrl = await this.documentsService.getDownloadUrl(
        id,
        req.user.sub,
      );
      res.redirect(downloadUrl.url);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to download document',
        error: errorMessage,
      });
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.documentsService.update(
      id,
      updateDocumentDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share a document with users' })
  @ApiResponse({ status: 200, description: 'Document shared successfully' })
  async shareDocument(
    @Param('id') id: string,
    @Body() shareDocumentDto: ShareDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.documentsService.shareDocument(
      id,
      shareDocumentDto,
      req.user.sub,
    );
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Unshare a document from users' })
  @ApiResponse({ status: 200, description: 'Document unshared successfully' })
  async unshareDocument(
    @Param('id') id: string,
    @Body() shareDocumentDto: ShareDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // For unsharing, we'll use the first userId from the array
    const targetUserId = shareDocumentDto.userIds[0];
    return await this.documentsService.unshareDocument(
      id,
      req.user.sub,
      targetUserId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document (Uploader or Admin)' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return await this.documentsService.remove(id, req.user.sub, req.user.role);
  }
}
