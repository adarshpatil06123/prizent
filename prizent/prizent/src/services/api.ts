import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with base configuration
// Using relative URL - requests will go through the proxy defined in setupProxy.js
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('📤 Axios Request Interceptor:', config.method?.toUpperCase(), config.url);
    
    // Don't add token to login/register endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
    
    if (!isAuthEndpoint) {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token added to request');
      }
    } else {
      console.log('⚠️ Skipping token for auth endpoint');
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 Axios Response Interceptor - SUCCESS:', response.status, response.config.url);
    console.log('Response data:', response.data);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ Axios Response Interceptor - ERROR');
    console.error('Error response:', error.response);
    console.error('Error request:', error.request);
    console.error('Error message:', error.message);
    
    // Handle 401 Unauthorized - redirect to login
    if (error.response && error.response.status === 401) {
      console.log('🚪 401 Unauthorized - Redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
