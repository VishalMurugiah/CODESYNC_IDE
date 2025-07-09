import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, MinusCircle, MessageCircle, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI } from '../services/api';
import { useWebSocket } from '../services/websocket';

const ConsoleChat = ({ 
  projectId = 1, // Default to project 1 for now
  userId,
  isConnected = false,
  isMinimized = false,
  onMinimize,
  connectedUsers = [] 
}) => {
  // Get user from auth context
  const { user: authUser } = useAuth();
  const user = authUser || { id: userId || 1, fullName: 'Anonymous User' };
  
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // WebSocket connection - pass parameters directly to the hook
  const {
    isConnected: wsIsConnected,
    connectedUsers: wsConnectedUsers,
    messages: wsMessages,
    sendMessage: sendChatMessage,
    service: wsService
  } = useWebSocket(projectId, user?.id, user?.fullName || user?.username || 'Anonymous User');

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, [projectId]);

  // Set WebSocket connection state
  useEffect(() => {
    setWsConnected(wsIsConnected);
  }, [wsIsConnected]);

  // Listen for WebSocket messages from the hook
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latestMessage = wsMessages[wsMessages.length - 1];
      // Only add WebSocket messages from other users (not own messages)
      if (latestMessage.userId !== user?.id) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          if (!prev.some(msg => 
            msg.message === latestMessage.message && 
            msg.userId === latestMessage.userId && 
            Math.abs(new Date(msg.timestamp) - new Date(latestMessage.timestamp)) < 5000 // Within 5 seconds
          )) {
            return [...prev, {
              id: latestMessage.id || Date.now() + Math.random(),
              type: 'user',
              user: latestMessage.userName || 'Unknown User',
              userId: latestMessage.userId,
              message: latestMessage.message,
              timestamp: new Date(latestMessage.timestamp || Date.now()),
              isOwn: false
            }];
          }
          return prev;
        });
      }
    }
  }, [wsMessages, user?.id]);

  // Load chat history from backend
  const loadChatHistory = async () => {
    try {
      setIsLoading(true);
      console.log('Loading chat history for project:', projectId);
      
      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      console.log('JWT token exists:', !!token);
      console.log('JWT token preview:', token ? token.substring(0, 50) + '...' : 'No token');
      
      const response = await chatAPI.getProjectMessages(projectId, 50);
      console.log('Chat history response:', response);
      
      if (response && Array.isArray(response)) {
        const chatMessages = response.map(msg => ({
          id: msg.id,
          type: 'user',
          user: msg.userFullName || msg.userName || 'Unknown User',
          userId: msg.userId,
          message: msg.content,
          timestamp: new Date(msg.createdAt)
        }));
        setMessages(chatMessages);
      } else {
        // No messages yet, add welcome messages
        setMessages([
          {
            id: 1,
            type: 'system',
            user: 'System',
            message: 'Welcome to CodeSync Console',
            timestamp: new Date()
          },
          {
            id: 2,
            type: 'system',
            user: 'System',
            message: 'Ready for collaborative coding!',
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      addSystemMessage('Failed to load chat history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const addSystemMessage = (text, type = 'system') => {
    addMessage({
      id: Date.now(),
      type,
      user: 'System',
      message: text,
      timestamp: new Date()
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!currentMessage.trim()) return;
    
    try {
      // Send message to backend first
      const messageData = {
        projectId: projectId,
        content: currentMessage.trim(),
        messageType: 'TEXT'
      };
      
      console.log('Sending message to backend:', messageData);
      const response = await chatAPI.sendMessage(messageData);
      console.log('Message sent response:', response);
      
      // Add message to local state immediately (optimistic update)
      const newMessage = {
        id: response.id || Date.now(),
        type: 'user',
        user: user?.fullName || user?.username || 'You',
        userId: user?.id,
        message: currentMessage.trim(),
        timestamp: new Date(),
        isOwn: true // Mark as own message to avoid duplicates from WebSocket
      };
      
      addMessage(newMessage);
      
      // Clear input immediately for better UX
      setCurrentMessage('');
      
      // Send via WebSocket for real-time delivery to other users ONLY (don't add to our own chat)
      // The WebSocket message will be received by other users only
      if (wsConnected) {
        sendChatMessage(currentMessage.trim());
      }
      
      // Focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      
    } catch (error) {
      console.error('Error sending message:', error);
      addSystemMessage('Failed to send message', 'error');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageTypeClass = (type) => {
    switch (type) {
      case 'system':
        return 'console-message-system';
      case 'error':
        return 'console-message-error';
      default:
        return 'console-message-user';
    }
  };

  const getUserColor = (userId) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const index = userId ? parseInt(userId.toString()) % colors.length : 0;
    return colors[index];
  };

  return (
    <>
      {/* Minimized Console Tab */}
      {isMinimized && (
        <motion.div 
          className="console-tab"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={onMinimize}
          whileHover={{ y: -2 }}
        >
          <MessageCircle size={16} />
          <span>Chat</span>
          <ChevronUp size={16} />
          {messages.length > 2 && (
            <div className="notification-badge">
              {messages.length - 2}
            </div>
          )}
        </motion.div>
      )}

      {/* Full Console Panel */}
      {!isMinimized && (
        <div className="console-panel">
          <div className="console-header">
            <div className="console-title">
              <MessageCircle size={16} />
              <span>Console Chat</span>
              <div className={`connection-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
                <div className="connection-dot"></div>
                <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            
            <div className="console-actions">
              <div className="connected-users-count">
                <Users size={14} />
                <span>{connectedUsers.length}</span>
              </div>
              <button 
                className="console-minimize-btn"
                onClick={onMinimize}
                title="Minimize Console"
              >
                <MinusCircle size={16} />
              </button>
            </div>
          </div>

          <motion.div
            className="console-content"
            initial={{ height: 'auto', opacity: 1 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="console-messages">
              {isLoading && (
                <div className="loading-message">
                  <span>Loading chat history...</span>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`console-message ${getMessageTypeClass(msg.type)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="message-header">
                    <span 
                      className="message-user"
                      style={{ 
                        color: msg.type === 'user' ? getUserColor(msg.userId) : undefined 
                      }}
                    >
                      {msg.user}
                    </span>
                    <span className="message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className="message-content">
                    {msg.message}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="console-input-form" onSubmit={handleSendMessage}>
              <div className="console-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder={wsConnected ? "Type a message..." : "Connect to start chatting..."}
                  className="console-input"
                  disabled={!wsConnected}
                />
                <button
                  type="submit"
                  className="console-send-btn"
                  disabled={!currentMessage.trim() || !wsConnected}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <style jsx>{`
        .console-tab {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          background: var(--accent);
          color: var(--text-inverse);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          z-index: 100;
          transition: all var(--transition-fast);
        }

        .console-tab:hover {
          background: var(--accent-hover);
          box-shadow: var(--shadow-glow);
          transform: translateY(-2px);
        }

        .notification-badge {
          background: var(--error);
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 0.25rem;
        }

        .console-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          height: 300px;
          display: flex;
          flex-direction: column;
          margin-top: 1rem;
        }

        .console-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }

        .console-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .connection-indicator.connected {
          color: var(--success);
        }

        .connection-indicator.disconnected {
          color: var(--error);
        }

        .connection-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .console-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .connected-users-count {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .console-minimize-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius);
          transition: all var(--transition-fast);
        }

        .console-minimize-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .console-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .console-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .loading-message {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        .console-message {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .console-message-system {
          opacity: 0.8;
        }

        .console-message-error {
          color: var(--error);
        }

        .console-message-user {
          color: var(--text-primary);
        }

        .message-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
        }

        .message-user {
          font-weight: 600;
        }

        .message-time {
          color: var(--text-secondary);
        }

        .message-content {
          background: var(--bg-tertiary);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius);
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .console-input-form {
          padding: 1rem;
          border-top: 1px solid var(--border);
        }

        .console-input-wrapper {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .console-input {
          flex: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.5rem 0.75rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: all var(--transition-fast);
        }

        .console-input:focus {
          border-color: var(--accent);
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-focus);
        }

        .console-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .console-send-btn {
          background: var(--accent);
          color: var(--text-inverse);
          border: none;
          border-radius: var(--radius);
          padding: 0.5rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .console-send-btn:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .console-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </>
  );
};

export default ConsoleChat;
