import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Types for API responses
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  department?: string | { _id: string; name: string };
  location?: string;
  status: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  joinDate: string;
  lastLogin?: string;
  tasksCompleted: number;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate?: string;
  deadline?: string;
  projectManager: User;
  teamMembers: User[];
  taskCount: number;
  completedTaskCount: number;
  budget?: number;
  spentBudget?: number;
  progress: number;
  tags?: string[];
  clientName?: string;
  clientEmail?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  archivedAt?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project: Project;
  assignedTo?: User;
  createdBy: User;
  dueDate?: string;
  progress: number;
  tags?: string[];
  estimatedHours?: number;
  actualHours: number;
  comments?: Array<{
    user: User;
    comment: string;
    createdAt: string;
  }>;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedBy: User;
    uploadedAt: string;
  }>;
  dependencies?: Task[];
  subtasks?: Task[];
  parentTask?: Task;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  type: 'team-meeting' | 'one-on-one' | 'project-review' | 'standup' | 'retrospective' | 'other';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  organizer: User;
  participants: User[];
  project?: Project;
  agenda?: string;
  notes?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  name: string;
  description?: string;
  filename: string;
  originalName: string;
  mimetype: string;
  mimeType?: string; // Backend uses mimeType
  size: number;
  project?: Project;
  uploadedBy: User;
  visibility: 'public' | 'private' | 'team';
  tags?: string[];
  version: number;
  sharedWith?: User[];
  downloadCount: number;
  downloadUrl?: string; // Presigned S3 URL (expires in 1 hour)
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  description?: string;
  name?: string;
  type: 'direct' | 'group' | 'project';
  participants: User[];
  project?: Project;
  lastMessage?: Message;
  unreadCount: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  content: string;
  sender: User;
  conversation: string;
  messageType: 'text' | 'file' | 'image';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
  }>;
  readBy: Array<{
    user: User;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Centralized API client for all backend communication
 * Handles authentication, token refresh, error handling, and request/response transformation
 */
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // Initialize axios client with base configuration
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  /**
   * Sets up request and response interceptors for authentication and error handling
   * - Request interceptor: Adds JWT token to all requests
   * - Response interceptor: Handles 401 errors with automatic token refresh
   */
  private setupInterceptors() {
    // Request interceptor to add auth token to all requests
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for automatic token refresh and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - attempt automatic refresh
          try {
            await this.refreshToken();
            // Retry the original request with new token
            if (error.config) {
              return this.client.request(error.config);
            }
          } catch (refreshError) {
            // Clear tokens if refresh fails (user must re-login)
            this.clearToken();
            // Let AuthContext handle redirect to login
            return Promise.reject(this.handleError(error));
          }
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private loadTokenFromStorage() {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.token = token;
    }
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const message = (error.response.data as { message?: string })?.message || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      return new Error('Network error - please check your connection');
    } else {
      return new Error('Request failed');
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Create a new axios instance without interceptors to avoid infinite loop
      const refreshClient = axios.create({
        baseURL: this.client.defaults.baseURL,
        timeout: 10000,
      });

      const response = await refreshClient.post('/auth/refresh', {
        refreshToken: refreshToken,
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      this.setToken(accessToken);
      localStorage.setItem('refresh_token', newRefreshToken);
    } catch (error) {
      // Clear tokens but don't redirect - let the calling code handle it
      this.clearToken();
      throw error;
    }
  }

  // ==================== Authentication Endpoints ====================
  
  /**
   * Authenticates user with email and password
   * Stores access and refresh tokens in localStorage
   * @param email - User email address
   * @param password - User password
   * @returns Login response with tokens and user data
   * @throws Error if credentials are invalid or rate limit exceeded
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post('/auth/login', { email, password });
    const data = response.data;
    this.setToken(data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
    location?: string;
  }): Promise<LoginResponse> {
    const response = await this.client.post('/auth/register', userData);
    const data = response.data;
    this.setToken(data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    return data;
  }

  async inviteUser(inviteData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
  }): Promise<{ message: string; inviteToken: string }> {
    const response = await this.client.post('/auth/invite', inviteData);
    return response.data;
  }

  async acceptInvite(acceptData: {
    token: string;
    password: string;
    phone?: string;
    location?: string;
  }): Promise<LoginResponse> {
    const response = await this.client.post('/auth/accept-invite', acceptData);
    const data = response.data;
    this.setToken(data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/users/profile');
    return response.data;
  }

  // Users endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    department?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<User>> {
    console.log('📡 API Client: getUsers called with params:', params);
    const response = await this.client.get('/users', { params });
    console.log('📡 API Client: Request URL:', response.config.url);
    console.log('📡 API Client: Request params:', response.config.params);
    return response.data;
  }

  async getProjectManagers(): Promise<User[]> {
    const response = await this.client.get('/users/project-managers');
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await this.client.patch(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  async updateCurrentUser(userData: Partial<User>): Promise<User> {
    const response = await this.client.patch('/users/profile', userData);
    return response.data;
  }

  // Projects endpoints
  async getProjects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    projectManager?: string;
    teamMember?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Project>> {
    const response = await this.client.get('/projects', { params });
    return response.data;
  }

  async getProjectById(id: string): Promise<Project> {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate: string;
    endDate?: string;
    projectManager: string;
    teamMembers?: string[];
    budget?: number;
    tags?: string[];
  }): Promise<Project> {
    const response = await this.client.post('/projects', projectData);
    return response.data;
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    const response = await this.client.patch(`/projects/${id}`, projectData);
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.delete(`/projects/${id}`);
  }

  async getProjectStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    overdue: number;
  }> {
    const response = await this.client.get('/projects/stats');
    return response.data;
  }

  async getMyProjects(): Promise<Project[]> {
    const response = await this.client.get('/projects/my-projects');
    return response.data;
  }

  async addProjectTeamMember(projectId: string, userId: string): Promise<Project> {
    const response = await this.client.post(`/projects/${projectId}/team-members`, { userId });
    return response.data;
  }

  async removeProjectTeamMember(projectId: string, userId: string): Promise<Project> {
    const response = await this.client.delete(`/projects/${projectId}/team-members`, {
      data: { userId }
    });
    return response.data;
  }

  // Tasks endpoints
  async getTasks(params?: {
    page?: number;
    limit?: number;
    project?: string;
    assignedTo?: string;
    createdBy?: string;
    status?: string;
    priority?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    search?: string;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Task>> {
    const response = await this.client.get('/tasks', { params });
    return response.data;
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await this.client.get(`/tasks/${id}`);
    return response.data;
  }

  async createTask(taskData: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    project: string;
    assignedTo?: string;
    dueDate?: string;
    progress?: number;
    tags?: string[];
    estimatedHours?: number;
    parentTask?: string;
    dependencies?: string[];
  }): Promise<Task> {
    const response = await this.client.post('/tasks', taskData);
    return response.data;
  }

  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    const response = await this.client.patch(`/tasks/${id}`, taskData);
    return response.data;
  }

  async deleteTask(id: string): Promise<void> {
    await this.client.delete(`/tasks/${id}`);
  }

  async getTaskStats(userId?: string, projectId?: string): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    overdue: number;
    completedThisWeek: number;
    completedThisMonth: number;
  }> {
    const response = await this.client.get('/tasks/stats', {
      params: { userId, projectId },
    });
    return response.data;
  }

  async getMyTasks(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Task>> {
    const response = await this.client.get('/tasks/my-tasks', { params });
    return response.data;
  }

  async getTasksByProject(projectId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Task>> {
    const response = await this.client.get(`/tasks/project/${projectId}`, { params });
    return response.data;
  }

  async addTaskComment(taskId: string, comment: string): Promise<Task> {
    const response = await this.client.post(`/tasks/${taskId}/comments`, { comment });
    return response.data;
  }

  async deleteTaskComment(taskId: string, commentIndex: number): Promise<Task> {
    const response = await this.client.delete(`/tasks/${taskId}/comments/${commentIndex}`);
    return response.data;
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<Task> {
    const response = await this.client.patch(`/tasks/${taskId}/progress`, { progress });
    return response.data;
  }

  // Meetings endpoints
  async getMeetings(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    project?: string;
    startDate?: string;
    endDate?: string;
    timeFilter?: 'upcoming' | 'past';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Meeting>> {
    const response = await this.client.get('/meetings', { params });
    return response.data;
  }

  async getMeetingById(id: string): Promise<Meeting> {
    const response = await this.client.get(`/meetings/${id}`);
    return response.data;
  }

  async createMeeting(meetingData: {
    title: string;
    description?: string;
    type: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    participants: string[];
    project?: string;
    agenda?: string;
    isRecurring?: boolean;
    recurringFrequency?: string;
    recurringEndDate?: string;
  }): Promise<Meeting> {
    const response = await this.client.post('/meetings', meetingData);
    return response.data;
  }

  async updateMeeting(id: string, meetingData: Partial<Meeting>): Promise<Meeting> {
    const response = await this.client.patch(`/meetings/${id}`, meetingData);
    return response.data;
  }

  async deleteMeeting(id: string): Promise<void> {
    await this.client.delete(`/meetings/${id}`);
  }

  async getUpcomingMeetings(): Promise<Meeting[]> {
    const response = await this.client.get('/meetings/upcoming');
    return response.data;
  }

  async respondToMeeting(meetingId: string, status: 'accepted' | 'declined' | 'pending'): Promise<Meeting> {
    const response = await this.client.post(`/meetings/${meetingId}/respond`, { status });
    return response.data;
  }

  // Documents endpoints
  async getDocuments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    project?: string;
    mimetype?: string;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Document>> {
    const response = await this.client.get('/documents', { params });
    return response.data;
  }

  async getDocumentById(id: string): Promise<Document> {
    const response = await this.client.get(`/documents/${id}`);
    return response.data;
  }

  async uploadDocument(formData: FormData): Promise<Document> {
    const response = await this.client.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateDocument(id: string, documentData: Partial<Document>): Promise<Document> {
    const response = await this.client.patch(`/documents/${id}`, documentData);
    return response.data;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.client.delete(`/documents/${id}`);
  }

  async getDocumentStats(): Promise<{
    total: number;
    totalSize: number;
    recentUploads: number;
    mostDownloaded: Document[];
  }> {
    const response = await this.client.get('/documents/stats');
    return response.data;
  }

  async downloadDocument(id: string): Promise<Blob> {
    try {
      // Get document with presigned URL included
      const document = await this.getDocumentById(id);
      
      if (!document.downloadUrl) {
        throw new Error('Download URL not available. File storage may not be configured.');
      }
      
      // Fetch the file from the presigned URL
      const fileResponse = await fetch(document.downloadUrl);
      
      if (!fileResponse.ok) {
        throw new Error('Failed to download file from storage');
      }
      
      return await fileResponse.blob();
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download document');
    }
  }

  // Chat endpoints
  async getConversations(): Promise<Conversation[]> {
    const response = await this.client.get('/chat/conversations');
    return response.data;
  }

  async getConversationById(id: string): Promise<Conversation> {
    const response = await this.client.get(`/chat/conversations/${id}`);
    return response.data;
  }

  async createConversation(conversationData: {
    title?: string;
    type: 'direct' | 'group' | 'project';
    participants: string[];
    project?: string;
  }): Promise<Conversation> {
    const payload: Record<string, unknown> = {
      type: conversationData.type,
      participants: conversationData.participants,
    };
    
    // Use title directly
    if (conversationData.title) {
      payload.title = conversationData.title;
    }
    
    if (conversationData.project) {
      payload.project = conversationData.project;
    }
    
    const response = await this.client.post('/chat/conversations', payload);
    return response.data;
  }

  async updateConversation(conversationId: string, conversationData: Partial<Conversation>): Promise<Conversation> {
    const response = await this.client.patch(`/chat/conversations/${conversationId}`, conversationData);
    return response.data;
  }

  async addConversationParticipant(conversationId: string, userId: string): Promise<Conversation> {
    const response = await this.client.post(`/chat/conversations/${conversationId}/participants`, { userId });
    return response.data;
  }

  async removeConversationParticipant(conversationId: string, userId: string): Promise<Conversation> {
    const response = await this.client.delete(`/chat/conversations/${conversationId}/participants`, {
      data: { userId }
    });
    return response.data;
  }

  async getMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<Message[]> {
    const response = await this.client.get('/chat/messages', {
      params: {
        conversation: conversationId,
        ...params
      },
    });
    // Backend returns array directly, not paginated response
    return response.data;
  }

  async sendMessage(conversationId: string, messageData: {
    content: string;
    messageType?: 'text' | 'file' | 'image';
    attachments?: File[];
  }): Promise<Message> {
    // If there are attachments, use FormData
    if (messageData.attachments && messageData.attachments.length > 0) {
      const formData = new FormData();
      formData.append('conversation', conversationId);
      formData.append('content', messageData.content);
      formData.append('type', messageData.messageType || 'text');
      
      messageData.attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await this.client.post('/chat/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    
    // For text-only messages, use JSON
    const response = await this.client.post('/chat/messages', {
      conversation: conversationId,
      content: messageData.content,
      type: messageData.messageType || 'text',
    });
    return response.data;
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const response = await this.client.patch(`/chat/messages/${messageId}`, { content });
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.client.delete(`/chat/messages/${messageId}`);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await this.client.post(`/chat/messages/${messageId}/read`);
  }

  async getUnreadCount(conversationId: string): Promise<{ count: number }> {
    const response = await this.client.get(`/chat/conversations/${conversationId}/unread-count`);
    return response.data;
  }

  // Additional missing endpoints
  async getRecentDocuments(limit?: number): Promise<Document[]> {
    const response = await this.client.get('/documents/recent', {
      params: { limit }
    });
    return response.data;
  }

  async getDocumentsByProject(projectId: string): Promise<Document[]> {
    const response = await this.client.get(`/documents/project/${projectId}`);
    return response.data;
  }

  async shareDocument(documentId: string, userIds: string[]): Promise<Document> {
    const response = await this.client.post(`/documents/${documentId}/share`, { userIds });
    return response.data;
  }

  async unshareDocument(documentId: string, userIds: string[]): Promise<Document> {
    const response = await this.client.delete(`/documents/${documentId}/share`, {
      data: { userIds }
    });
    return response.data;
  }

  async getMeetingsByProject(projectId: string): Promise<Meeting[]> {
    const response = await this.client.get(`/meetings/project/${projectId}`);
    return response.data;
  }
// Create and export a singleton instance
  async getDepartments(): Promise<Array<{
    _id: string;
    name: string;
    description?: string;
    head?: { _id: string; firstName: string; lastName: string };
    employeeCount: number;
    isActive: boolean;
  }>> {
    // Add timestamp to prevent caching (no custom headers needed)
    const response = await this.client.get('/departments', {
      params: { _t: Date.now() }
    });
    return response.data;
  }

  async getDepartmentById(id: string) {
    const response = await this.client.get(`/departments/${id}`);
    return response.data;
  }

  async createDepartment(departmentData: {
    name: string;
    description?: string;
    head?: string;
  }) {
    const response = await this.client.post('/departments', departmentData);
    return response.data;
  }

  async updateDepartment(id: string, departmentData: {
    name?: string;
    description?: string;
    head?: string;
    isActive?: boolean;
  }) {
    const response = await this.client.patch(`/departments/${id}`, departmentData);
    return response.data;
  }

  async deleteDepartment(id: string): Promise<void> {
    await this.client.delete(`/departments/${id}`);
  }

  // User management endpoints (Admin)
  async getUserStats() {
    const response = await this.client.get('/users/stats/overview');
    return response.data;
  }

  async updateUserById(id: string, userData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
    department?: string;
    location?: string;
    status?: string;
    bio?: string;
    skills?: string[];
    avatar?: string;
  }) {
    const response = await this.client.patch(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }
}

// Update the singleton instance  
export const apiClient = new ApiClient();
export default apiClient;
