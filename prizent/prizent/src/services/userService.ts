import apiClient from './api';

export interface User {
  id: number;
  username: string;
  name: string;
  emailId?: string;
  phoneNumber?: string;
  employeeDesignation?: string;
  role: string;
  enabled: boolean;
  clientId: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  emailId?: string;
  phoneNumber?: string;
  employeeDesignation?: string;
  role: string;
  enabled?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  username?: string;
  emailId?: string;
  phoneNumber?: string;
  employeeDesignation?: string;
  role?: string;
  password?: string;
  enabled?: boolean;
}

export interface UsersResponse {
  success: boolean;
  message: string;
  users?: User[];
  user?: User;
  count?: number;
}

const userService = {
  getAllUsers: async (clientId: number): Promise<UsersResponse> => {
    try {
      const response = await apiClient.get(`admin/users?clientId=${clientId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId: number): Promise<UsersResponse> => {
    try {
      const response = await apiClient.get(`admin/users/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  // Create new user
  createUser: async (request: CreateUserRequest, clientId: number): Promise<UsersResponse> => {
    try {
      const response = await apiClient.post(`admin/users?clientId=${clientId}`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (userId: number, request: UpdateUserRequest): Promise<UsersResponse> => {
    try {
      const response = await apiClient.put(`admin/users/${userId}`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Enable user
  enableUser: async (userId: number): Promise<UsersResponse> => {
    try {
      const response = await apiClient.patch(`admin/users/${userId}/enable`);
      return response.data;
    } catch (error: any) {
      console.error('Error enabling user:', error);
      throw error;
    }
  },

  // Disable user
  disableUser: async (userId: number): Promise<UsersResponse> => {
    try {
      const response = await apiClient.patch(`admin/users/${userId}/disable`);
      return response.data;
    } catch (error: any) {
      console.error('Error disabling user:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId: number): Promise<UsersResponse> => {
    try {
      const response = await apiClient.delete(`admin/users/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
};

export default userService;
