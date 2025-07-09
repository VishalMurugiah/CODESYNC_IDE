import axios from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // The backend returns data in the format: { success: boolean, message: string, data: T }
    // We need to return this format to the frontend
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Return a consistent error format
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'An unexpected error occurred';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', {
      username: credentials.email, // Backend expects username field
      password: credentials.password
    });
    return response;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', {
      username: userData.email, // Backend expects username field
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName
    });
    return response;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response;
  },

  validateToken: async () => {
    const response = await apiClient.get('/auth/validate');
    return response;
  }
};

// User API
export const userAPI = {
  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me');
    return response;
  },

  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response;
  }
};

// Project API
export const projectAPI = {
  createProject: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response;
  },

  getUserProjects: async () => {
    const response = await apiClient.get('/projects');
    return response;
  },

  getProject: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response;
  },

  deleteProject: async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response;
  }
};

// File API
export const fileAPI = {
  createFile: async (fileData) => {
    // Ensure we send the correct structure to backend
    const requestData = {
      name: fileData.name,
      content: fileData.content || '',
      language: fileData.language || 'javascript',
      projectId: fileData.projectId,
      filePath: fileData.filePath || '' // Optional
    };
    const response = await apiClient.post('/files', requestData);
    return response;
  },

  getProjectFiles: async (projectId) => {
    const response = await apiClient.get(`/files/project/${projectId}`);
    return response;
  },

  getFile: async (fileId) => {
    const response = await apiClient.get(`/files/${fileId}`);
    return response;
  },

  updateFile: async (fileId, updateData) => {
    // Backend expects just content in the request body
    const requestData = {
      content: updateData.content || updateData
    };
    const response = await apiClient.put(`/files/${fileId}`, requestData);
    return response;
  },

  deleteFile: async (fileId) => {
    const response = await apiClient.delete(`/files/${fileId}`);
    return response;
  }
};

// Chat API
export const chatAPI = {
  sendMessage: async (messageData) => {
    const response = await apiClient.post('/chat/messages', messageData);
    return response;
  },

  getProjectMessages: async (projectId, limit = 50) => {
    const response = await apiClient.get(`/chat/projects/${projectId}/messages?limit=${limit}`);
    return response;
  },

  getProjectMessageCount: async (projectId) => {
    const response = await apiClient.get(`/chat/projects/${projectId}/count`);
    return response;
  }
};

// Export the configured axios instance for custom requests
export default apiClient;
