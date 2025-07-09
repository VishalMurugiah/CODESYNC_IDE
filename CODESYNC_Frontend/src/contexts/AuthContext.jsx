import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Debug log
  console.log('AuthProvider state:', { user, token: !!token, isLoading, isAuthenticated });

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    console.log('Initializing auth...', { hasToken: !!storedToken, hasUser: !!storedUser });

    if (storedToken && storedUser) {
      try {
        // Don't set authenticated state until validation is complete
        setToken(storedToken);

        // Validate token with backend first
        await authAPI.validateToken();
        
        // Get fresh user data
        const userData = await userAPI.getCurrentUser();
        console.log('Fresh user data from API:', userData);
        
        // Only set authenticated state after successful validation
        setUser(userData.data || userData); // Handle both response formats
        setIsAuthenticated(true);
        
        console.log('Token validation successful');
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      // No stored credentials, user is not authenticated
      setIsAuthenticated(false);
    }
    
    setIsLoading(false);
  };

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      
      const response = await authAPI.login(credentials);
      console.log('Login response:', response);
      
      if (response.success && response.data) {
        const jwtResponseData = response.data;
        const { token: newToken, id, username, email, fullName, roles } = jwtResponseData;
        
        // Create user object from JWT response
        const userData = { id, username, email, fullName, roles: roles || ['WRITE'] };
        
        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, data: userData };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please check your credentials.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      
      const response = await authAPI.register(userData);
      console.log('Register response:', response);
      
      if (response.success && response.data) {
        const jwtResponseData = response.data;
        const { token: newToken, id, username, email, fullName, roles } = jwtResponseData;
        
        // Create user object from JWT response
        const newUser = { id, username, email, fullName, roles: roles || ['WRITE'] };
        
        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        // Update state
        setToken(newToken);
        setUser(newUser);
        setIsAuthenticated(true);
        
        return { success: true, data: newUser };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Throw the error so it can be caught in the component
      throw new Error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if backend call fails
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasRole = (role) => {
    return user && user.roles && user.roles.includes(role);
  };

  const isAdmin = () => hasRole('ADMIN');
  const canWrite = () => hasRole('WRITE') || hasRole('ADMIN');
  const canRead = () => hasRole('READ') || hasRole('WRITE') || hasRole('ADMIN');

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    clearAuth,
    hasRole,
    isAdmin,
    canWrite,
    canRead
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
