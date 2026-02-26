import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateDetails: (data) => api.put('/auth/updatedetails', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
};

// User API
export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  searchUsers: (query) => api.get(`/users/search/${query}`),
  updateSkills: (skills) => api.put('/users/skills', { skills }),
  updateInterests: (interests) => api.put('/users/interests', { interests }),
  updateAvailability: (availability) => api.put('/users/availability', { availability }),
  updatePreferences: (projectPreferences) => api.put('/users/preferences', { projectPreferences }),
  rateUser: (id, data) => api.post(`/users/${id}/rate`, data),
  getUserStats: (id) => api.get(`/users/${id}/stats`),
};

// Group API
export const groupAPI = {
  getGroups: (params) => api.get('/groups', { params }),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  requestJoin: (id, message) => api.post(`/groups/${id}/join-request`, { message }),
  approveRequest: (groupId, requestId) => api.put(`/groups/${groupId}/join-request/${requestId}/approve`),
  rejectRequest: (groupId, requestId) => api.put(`/groups/${groupId}/join-request/${requestId}/reject`),
  leaveGroup: (id) => api.post(`/groups/${id}/leave`),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  searchGroups: (query) => api.get(`/groups/search/${query}`),
  getMyGroups: () => api.get('/groups/my-groups'),
};

// Match API
export const matchAPI = {
  findPartners: (limit = 10) => api.get(`/matches/partners?limit=${limit}`),
  findGroups: (limit = 10) => api.get(`/matches/groups?limit=${limit}`),
  getRecommended: (limit = 10) => api.get(`/matches/recommended?limit=${limit}`),
};

// Message API
export const messageAPI = {
  getDirectMessages: (userId, params) => api.get(`/messages/direct/${userId}`, { params }),
  sendDirectMessage: (data) => {
    // Backend expects 'recipientId', not 'recipient'
    const payload = {
      recipientId: data.recipient,
      content: data.content,
      contentType: data.contentType || 'text',
      attachments: data.attachments || []
    };
    return api.post('/messages/direct', payload);
  },
  getGroupMessages: (groupId, params) => api.get(`/messages/group/${groupId}`, { params }),
  sendGroupMessage: (data) => {
    // Backend expects 'groupId', not 'group'
    const payload = {
      groupId: data.group,
      content: data.content,
      contentType: data.contentType || 'text',
      attachments: data.attachments || []
    };
    return api.post('/messages/group', payload);
  },
  getConversations: () => api.get('/messages/conversations'),
  getUnreadCount: () => api.get('/messages/unread/count'),
  markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
};

// Task API
export const taskAPI = {
  getGroupTasks: (groupId, params) => api.get(`/tasks/group/${groupId}`, { params }),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
  addSubtask: (id, title) => api.post(`/tasks/${id}/subtasks`, { title }),
  toggleSubtask: (taskId, subtaskId) => api.put(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`),
  assignTask: (id, userIds) => api.put(`/tasks/${id}/assign`, { userIds }),
  getMyTasks: (params) => api.get('/tasks/my-tasks', { params }),
  getOverdueTasks: () => api.get('/tasks/overdue'),
};

// Report API
export const reportAPI = {
  createReport: (data) => api.post('/reports', data),
  getMyReports: () => api.get('/reports/my-reports'),
};

export default api;