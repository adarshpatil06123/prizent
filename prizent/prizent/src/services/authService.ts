import apiClient from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;      // UUID
    username: string;
    clientId: string; // Changed from number to string
    roles: string[];
  };
}

const authService = {
  // Login
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const requestBody = { username, password };

    try {
      const response = await apiClient.post('auth/login', requestBody);

      // Store token in localStorage if login successful
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);

      const errorMessage = error.response?.data?.message || error.message || 'Network error occurred';
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Call backend logout endpoint - Authorization header will be added by interceptor
        await apiClient.post('auth/logout', {});
      }
    } catch (error) {
      console.error('Error calling backend logout:', error);
      // Continue with local logout even if backend call fails
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    
    // Basic check - you can add JWT expiry validation here
    try {
      // Simple validation - check if token exists and user data is valid
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        // Token exists but no user data - invalid state
        localStorage.removeItem('token');
        return false;
      }
      let user = null;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        // Invalid JSON
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
      }
      if (!user || !user.username) {
        // Invalid user data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
      }
      return true;
    } catch (error) {
      // Unexpected error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      // If parsing fails, clear invalid user and return null
      localStorage.removeItem('user');
      return null;
    }
  },

  // Get token
  getToken: (): string | null => {
    return localStorage.getItem('token');
  }
};

export default authService;
