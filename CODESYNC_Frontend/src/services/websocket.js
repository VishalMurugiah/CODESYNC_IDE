import { useState, useEffect, useCallback, useRef } from 'react';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.projectId = null;
    this.userId = null;
    this.userName = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Event listeners
    this.listeners = {
      connect: [],
      disconnect: [],
      message: [],
      userJoined: [],
      userLeft: [],
      usersList: [],
      codeChange: [],
      cursorPosition: [],
      fileSelection: [],
      userTyping: [],
      chatMessage: [],
      error: [],
      fileSaved: []
    };
  }

  // Connect to WebSocket server
  connect(projectId, userId, userName) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    this.projectId = projectId;
    this.userId = userId;
    this.userName = userName;
    
    const wsUrl = `ws://localhost:8080/ws/collaboration/${projectId}?userId=${userId}&userName=${encodeURIComponent(userName)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.emit('error', { message: 'Failed to establish WebSocket connection' });
    }
  }

  // Set up WebSocket event listeners
  setupEventListeners() {
    this.ws.onopen = () => {
      console.log('WebSocket connected to project:', this.projectId);
      console.log('WebSocket connection details:', {
        url: this.ws.url,
        readyState: this.ws.readyState,
        protocol: this.ws.protocol
      });
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect', { projectId: this.projectId, userId: this.userId });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.emit('disconnect', { code: event.code, reason: event.reason });
      
      // Attempt to reconnect if not manually closed
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
          this.connect(this.projectId, this.userId, this.userName);
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { message: 'WebSocket connection error' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // Only log important messages to reduce console spam
        if (message.type === 'user_joined' || message.type === 'user_left') {
          console.log('🔄 WebSocket:', message.type, message);
        }
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.error('Raw message data:', event.data);
      }
    };

    // Handle code changes
    this.socket.on('codeChange', (data) => {
      console.log('📥 Received code change:', { userId: data.userId, fileId: data.fileId, contentLength: data.content?.length });
      this.emit('codeChange', data);
    });
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type } = message;
    
    switch (type) {
      case 'user_joined':
        this.emit('userJoined', message);
        break;
      case 'user_left':
        this.emit('userLeft', message);
        break;
      case 'users_list':
        this.emit('usersList', message);
        break;
      case 'code_change':
        this.emit('codeChange', message);
        break;
      case 'cursor_position':
        this.emit('cursorPosition', message);
        break;
      case 'file_selection':
        this.emit('fileSelection', message);
        break;
      case 'user_typing':
        this.emit('userTyping', message);
        break;
      case 'chat_message':
        this.emit('chatMessage', message);
        break;
      case 'file_saved':
        this.emit('fileSaved', message);
        break;
      default:
        this.emit('message', message);
    }
  }

  // Send code changes
  sendCodeChange(data) {
    if (this.isConnected && this.socket) {
      console.log('📤 Sending code change:', { fileId: data.fileId, contentLength: data.content?.length || 0 });
      this.socket.emit('codeChange', {
        userId: this.userId,
        userName: this.userName,
        projectId: this.projectId,
        fileId: data.fileId,
        content: data.content,
        cursor: data.cursor,
        timestamp: Date.now()
      });
    }
  }

  // Send cursor position
  sendCursorPosition(fileId, line, column) {
    this.send({
      type: 'cursor_position',
      fileId,
      line,
      column,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now()
    });
  }

  // Send file selection
  sendFileSelection(fileId, fileName) {
    this.send({
      type: 'file_selection',
      fileId,
      fileName,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now()
    });
  }

  // Send typing indicator
  sendUserTyping(fileId, isTyping) {
    this.send({
      type: 'user_typing',
      fileId,
      isTyping,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now()
    });
  }

  // Send chat message
  sendChatMessage(message) {
    this.send({
      type: 'chat_message',
      message,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now()
    });
  }

  // Send file saved notification
  sendFileSaved(fileId, fileName, content) {
    this.send({
      type: 'file_saved',
      fileId,
      fileName,
      content,
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now()
    });
  }

  // Generic send method
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
      this.isConnected = false;
    }
  }

  // Event listener management
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      projectId: this.projectId,
      userId: this.userId,
      userName: this.userName
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// React hook for using WebSocket service
export const useWebSocket = (projectId, userId, userName) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const serviceRef = useRef(websocketService);

  // Connect when project/user changes
  useEffect(() => {
    if (projectId && userId && userName) {
      console.log('WebSocket connecting with:', { projectId, userId, userName });
      serviceRef.current.connect(projectId, userId, userName);
    }

    return () => {
      if (serviceRef.current.isConnected) {
        console.log('WebSocket disconnecting...');
        serviceRef.current.disconnect();
      }
    };
  }, [projectId, userId, userName]);

  // Set up event listeners
  useEffect(() => {
    const service = serviceRef.current;

    const handleConnect = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
    };
    
    const handleDisconnect = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setConnectedUsers([]);
    };
    
    const handleUserJoined = (data) => {
      console.log('User joined:', data);
      
      // Check both possible locations for user data
      const user = data.user || (data.data && data.data.user);
      
      if (user) {
        // Convert string ID to number if needed
        const processedUser = {
          ...user,
          id: typeof user.id === 'string' ? parseInt(user.id) : user.id
        };
        
        setConnectedUsers(prev => {
          const filtered = prev.filter(u => u.id !== processedUser.id);
          return [...filtered, processedUser];
        });
      } else {
        console.log('No user data in message!');
      }
    };
    
    const handleUserLeft = (data) => {
      console.log('User left:', data.userId);
      
      // Convert userId to number if it's a string to match our user objects
      const userIdToRemove = typeof data.userId === 'string' ? parseInt(data.userId) : data.userId;
      
      setConnectedUsers(prev => prev.filter(u => u.id !== userIdToRemove));
    };
    
    const handleUsersList = (data) => {
      console.log('Users list received:', data.users?.length || 0, 'users');
      
      // Handle users list - this should contain all currently connected users
      const users = data.users || (data.data && data.data.users) || [];
      
      if (Array.isArray(users)) {
        const processedUsers = users.map(user => ({
          ...user,
          id: typeof user.id === 'string' ? parseInt(user.id) : user.id
        }));
        setConnectedUsers(processedUsers);
      }
    };
    
    const handleChatMessage = (data) => {
      console.log('Chat message received:', data);
      setMessages(prev => [...prev, data]);
    };

    const handleError = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    service.on('connect', handleConnect);
    service.on('disconnect', handleDisconnect);
    service.on('userJoined', handleUserJoined);
    service.on('userLeft', handleUserLeft);
    service.on('usersList', handleUsersList);
    service.on('chatMessage', handleChatMessage);
    service.on('error', handleError);

    return () => {
      service.off('connect', handleConnect);
      service.off('disconnect', handleDisconnect);
      service.off('userJoined', handleUserJoined);
      service.off('userLeft', handleUserLeft);
      service.off('usersList', handleUsersList);
      service.off('chatMessage', handleChatMessage);
      service.off('error', handleError);
    };
  }, []);

  const sendMessage = useCallback((message) => {
    if (serviceRef.current.isConnected) {
      serviceRef.current.sendChatMessage(message);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }, []);

  const sendCodeChange = useCallback((data) => {
    if (serviceRef.current.isConnected) {
      serviceRef.current.sendCodeChange(data);
    } else {
      console.warn('Cannot send code change: WebSocket not connected');
    }
  }, []);

  const sendCursorPosition = useCallback((fileId, line, column) => {
    if (serviceRef.current.isConnected) {
      serviceRef.current.sendCursorPosition(fileId, line, column);
    } else {
      console.warn('Cannot send cursor position: WebSocket not connected');
    }
  }, []);

  const sendFileSaved = useCallback((fileId, fileName, content) => {
    if (serviceRef.current.isConnected) {
      serviceRef.current.sendFileSaved(fileId, fileName, content);
    } else {
      console.warn('Cannot send file saved notification: WebSocket not connected');
    }
  }, []);

  return {
    isConnected,
    connectedUsers,
    messages,
    sendMessage,
    sendCodeChange,
    sendCursorPosition,
    sendFileSaved,
    service: serviceRef.current
  };
};

export default websocketService;
