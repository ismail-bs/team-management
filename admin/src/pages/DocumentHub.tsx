import { DashboardLayout } from "@/components/DashboardLayout";
import { AddCategoryDialog } from "@/components/dialogs/AddCategoryDialog";
import { ShareDocumentDialog } from "@/components/dialogs/ShareDocumentDialog";
import { EditDocumentDialog } from "@/components/dialogs/EditDocumentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Search, Filter, FileText, Image, File, Download, Share, Eye, MoreHorizontal, Calendar, User, Plus, Trash2, Settings, Edit } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, Document } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface DocumentCategory {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface DocumentStats {
  total: number;
  totalSize: number;
  recentUploads: number;
  mostDownloaded: Document[];
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'application/pdf':
      return <FileText className="h-8 w-8 text-destructive" />;
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <FileText className="h-8 w-8 text-primary" />;
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return <File className="h-8 w-8 text-success" />;
    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return <File className="h-8 w-8 text-warning" />;
    case 'image/png':
    case 'image/jpeg':
    case 'image/gif':
    case 'image/svg+xml':
      return <Image className="h-8 w-8 text-accent" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

export default function DocumentHub() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDocuments({
        search: searchTerm || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 100, // Load more documents initially
      });
      setDocuments(response.data || []);
      
      // Generate categories from documents
      const categoryMap = new Map<string, number>();
      response.data.forEach(doc => {
        if (doc.tags && doc.tags.length > 0) {
          doc.tags.forEach(tag => {
            categoryMap.set(tag, (categoryMap.get(tag) || 0) + 1);
          });
        } else {
          categoryMap.set('Uncategorized', (categoryMap.get('Uncategorized') || 0) + 1);
        }
      });

      const generatedCategories: DocumentCategory[] = Array.from(categoryMap.entries()).map(([name, count], index) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        count,
        color: ['bg-primary', 'bg-success', 'bg-accent', 'bg-warning', 'bg-destructive'][index % 5]
      }));

      setCategories(generatedCategories);
    } catch (error) {
      console.error('Error loading documents:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load documents';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      setDocuments([]); // Set empty array to prevent undefined errors
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiClient.getDocumentStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading document stats:', error);
      // Set default stats to prevent UI errors
      setStats({
        total: 0,
        totalSize: 0,
        recentUploads: 0,
        mostDownloaded: [],
      });
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('description', `Uploaded file: ${file.name}`);
        formData.append('visibility', 'private');

        await apiClient.uploadDocument(formData);
      }
      
      toast({
        title: "Success",
        description: `Successfully uploaded ${files.length} file(s)`
      });
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      if (!doc.downloadUrl) {
        // Fallback: fetch document to get URL
        const fullDoc = await apiClient.getDocumentById(doc?._id);
        if (fullDoc.downloadUrl) {
          window.open(fullDoc.downloadUrl, '_blank');
        } else {
          throw new Error('Download URL not available');
        }
      } else {
        // Use presigned URL directly
        window.open(doc.downloadUrl, '_blank');
      }
      
      toast({
        title: "Success",
        description: "Document download started"
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiClient.deleteDocument(documentId);
      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const handleShareDocument = async (documentId: string, userIds: string[]) => {
    try {
      await apiClient.shareDocument(documentId, userIds);
      toast({
        title: "Success",
        description: "Document shared successfully"
      });
      loadDocuments(); // Reload to show updated sharedWith
    } catch (error) {
      console.error('Error sharing document:', error);
      toast({
        title: "Error",
        description: "Failed to share document",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDocument = async (documentId: string, updates: Partial<Document>) => {
    try {
      await apiClient.updateDocument(documentId, updates);
      toast({
        title: "Success",
        description: "Document updated successfully"
      });
      loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive"
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().replace(/\s+/g, '-') === selectedCategory));
    
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Document Hub</h1>
            <p className="text-muted-foreground">
              {user?.role === 'admin' 
                ? 'View and manage all team documents'
                : 'Manage your documents and view shared files'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              className="hidden"
            />
            <Button 
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-soft">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'admin' ? 'Total Documents (All)' : 'My Documents'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{formatFileSize(stats.totalSize)}</div>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'admin' ? 'Total Size (All)' : 'My Storage Used'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.recentUploads}</div>
                <p className="text-sm text-muted-foreground">Recent Uploads</p>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{categories.length}</div>
                <p className="text-sm text-muted-foreground">Categories</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Categories Overview */}
        {/* TODO: Temporarily commented out - Document Categories section */}
        {/* {categories.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Document Categories</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {categories.map(category => (
                <Card 
                  key={category.id} 
                  className={`shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer ${
                    selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? 'all' : category.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-medium text-sm">{category.name}</h3>
                    <p className="text-2xl font-bold text-foreground">{category.count}</p>
                    <p className="text-xs text-muted-foreground">documents</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )} */}

        {/* Search & Filters */}
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search documents..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* TODO: Temporarily commented out - Filter by Category dropdown */}
              {/* <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Documents {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
            </h2>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-soft animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-muted rounded-full"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Upload your first document to get started'
                  }
                </p>
                {!searchTerm && selectedCategory === 'all' && (
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <Card key={doc?._id} className="shadow-soft hover:shadow-medium transition-all duration-300 group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(doc.mimetype)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate" title={doc.name}>
                            {doc.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setShareDialogOpen(true);
                          }}
                          title="Share"
                        >
                          <Share className="h-3 w-3" />
                        </Button>
                        
                        {/* Edit and Delete buttons only for uploader or admin */}
                        {(doc.uploadedBy?._id === user?._id || user?.role === 'admin') && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setEditDialogOpen(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{doc.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => handleDeleteDocument(doc?._id)}
                                  >
                                    Delete Document
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={doc.uploadedBy?.avatar} />
                          <AvatarFallback className="text-xs">
                            {doc.uploadedBy?.firstName?.[0]}{doc.uploadedBy?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {doc.uploadedBy?.firstName} {doc.uploadedBy?.lastName}
                          {doc.uploadedBy?._id === user?._id && (
                            <span className="text-blue-600 font-medium ml-1">(You)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {doc.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            +{doc.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      {/* TODO: Temporarily commented out - Downloads count */}
                      {/* <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>{doc.downloadCount || 0} downloads</span>
                      </div> */}
                      <div></div>
                      <Badge variant={doc.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
                        {doc.visibility}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Upload Area */}
        <Card className="shadow-soft border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors">
          <CardContent className="p-8 text-center">
            <div 
              className="cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-primary');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary');
                handleFileUpload(e.dataTransfer.files);
              }}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Drop files here or click to upload</h3>
              <p className="text-muted-foreground">
                Support for PDF, DOC, XLS, PPT, images and more
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        {selectedDocument && (
          <>
            <ShareDocumentDialog
              open={shareDialogOpen}
              onOpenChange={setShareDialogOpen}
              documentId={selectedDocument?._id}
              documentName={selectedDocument.name}
              currentlySharedWith={selectedDocument.sharedWith?.map(u => typeof u === 'string' ? u : u?._id) || []}
              onShare={(userIds) => handleShareDocument(selectedDocument?._id, userIds)}
            />
            
            <EditDocumentDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              document={selectedDocument}
              onUpdate={(updates) => handleUpdateDocument(selectedDocument?._id, updates)}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}