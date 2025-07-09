import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { 
  Play, 
  Save, 
  Share2, 
  Users, 
  Settings, 
  FileText, 
  Download,
  Copy,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  LogOut,
  User,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Send,
  Folder,
  FolderOpen,
  File,
  Plus,
  Briefcase,
  Code,
  Zap,
  AlertCircle,
  Terminal as TerminalIcon
} from 'lucide-react';
import ThemeSwitcher from '../components/ThemeSwitcher';
import ConsoleChat from '../components/ConsoleChat';
import Terminal from '../components/Terminal';
import { useWebSocket } from '../services/websocket';

const Dashboard = () => {
  const { currentTheme } = useTheme();
  
  // Get auth context data
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // Debug log to see what user data we have
  console.log('Dashboard render:', { user, authLoading, isAuthenticated });
  
  // Show loading while auth is being initialized
  if (authLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }
  
  // Debug authentication state
  console.log('🔐 Auth Check:', { 
    isAuthenticated, 
    hasUser: !!user, 
    userId: user?.id, 
    userName: user?.username || user?.name 
  });
  
  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    console.log('❌ User not authenticated, should redirect to login');
    console.log('Auth details:', { isAuthenticated, user });
    // Show a message instead of returning null for debugging
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Authentication failed. Redirecting to login...</p>
        <p>Debug: isAuthenticated={String(isAuthenticated)}, user={JSON.stringify(user)}</p>
      </div>
    );
  }
  
  // Get project context data  
  const { 
    projects, 
    currentProject, 
    projectFiles: files, 
    currentFile,
    isLoading: projectLoading,
    error: projectError,
    loadProjects,
    setCurrentProject,
    loadProjectFiles,
    createProject: createProjectAPI,
    createFile,
    updateFile,
    deleteFile
  } = useProject();

  // Debug: Check if setCurrentProject is available
  console.log('🔍 Dashboard useProject hook result:', { 
    hasSetCurrentProject: typeof setCurrentProject === 'function',
    projectsCount: projects?.length || 0,
    currentProjectId: currentProject?.id,
    projectLoading
  });

  // Force reload projects function
  const forceReloadProjects = async () => {
    console.log('🔄 Force reloading projects...');
    try {
      await loadProjects(true); // Pass true to preserve current project selection
      console.log('✅ Projects reloaded successfully');
    } catch (error) {
      console.error('❌ Failed to reload projects:', error);
    }
  };
  
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(true);
  const [activeBottomPanel, setActiveBottomPanel] = useState('none'); // 'console', 'terminal', 'none'
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    language: 'JavaScript'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // File and project state - declare these before useEffects that use them
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'src/components', 'src/utils', 'src/contexts']));
  const [activeFile, setActiveFile] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showFileContextMenu, setShowFileContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [newFileName, setNewFileName] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(new Set());
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showRemoteUpdateToast, setShowRemoteUpdateToast] = useState(false);
  const [remoteUpdateInfo, setRemoteUpdateInfo] = useState(null);
  
  // Cursor tracking state
  const [userCursors, setUserCursors] = useState(new Map());
  const [userFileInfo, setUserFileInfo] = useState({}); // Changed from Map to object
  const [sidebarUpdateTrigger, setSidebarUpdateTrigger] = useState(0); // Force sidebar re-renders
  const [cursorDecorationsUpdateTrigger, setCursorDecorationsUpdateTrigger] = useState(0); // Force cursor decoration updates
  const cursorsDecorationRef = useRef([]);
  
  // Chat-related state
  const [chatMessages, setChatMessages] = useState([]);
  const chatContainerRef = useRef(null);
  
  const editorRef = useRef(null);
  
  // Handle bottom panel switching
  const handleConsoleToggle = () => {
    if (activeBottomPanel === 'console') {
      setActiveBottomPanel('none');
      setIsConsoleMinimized(true);
    } else {
      setActiveBottomPanel('console');
      setIsConsoleMinimized(false);
      setIsTerminalMinimized(true);
    }
  };

  const handleTerminalToggle = () => {
    if (activeBottomPanel === 'terminal') {
      setActiveBottomPanel('none');
      setIsTerminalMinimized(true);
    } else {
      setActiveBottomPanel('terminal');
      setIsTerminalMinimized(false);
      setIsConsoleMinimized(true);
    }
  };
  
  // WebSocket for real-time collaboration
  const { 
    isConnected, 
    connectedUsers, 
    sendMessage,
    sendCodeChange,
    sendCursorPosition,
    service: wsService
  } = useWebSocket(currentProject?.id, user?.id, user?.fullName || user?.name || user?.username);
  
  // Generate unique cursor colors for users
  const generateUserColor = (userId) => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#dda0dd', '#ff7675', '#74b9ff', '#00b894', '#fdcb6e',
      '#e17055', '#81ecec', '#a29bfe', '#fd79a8', '#6c5ce7',
      '#55a3ff', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
      '#ff9f43', '#ee5a6f', '#00a8ff', '#c44569', '#f8b500',
      '#3c6382', '#40407a', '#706fd3', '#f3a683', '#cf6679'
    ];
    
    // Use userId to generate consistent color for each user
    const hash = String(userId).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Update cursor decorations in editor
  const updateCursorDecorations = useCallback(() => {
    if (!editorRef.current || !window.monaco || !activeFile) {
      console.log('Cannot update decorations:', { 
        hasEditor: !!editorRef.current, 
        hasMonaco: !!window.monaco, 
        activeFile 
      });
      return;
    }
    
    const decorations = [];
    
    console.log('Updating cursor decorations:', { 
      userCursorsCount: userCursors.size, 
      activeFile,
      userCursorsData: Array.from(userCursors.entries())
    });
    
    // Add decorations for all users' cursors (including current user)
    userCursors.forEach((cursorData, userId) => {
      console.log('Checking cursor for user:', userId, 'fileId:', cursorData.fileId, 'activeFile:', activeFile, 'line:', cursorData.line, 'column:', cursorData.column);
      
      // Check if this cursor is for the current active file
      if (cursorData.fileId === activeFile) {
        console.log('Adding cursor decoration for user:', userId, 'at line:', cursorData.line, 'column:', cursorData.column);
        
        // Ensure line and column are numbers and valid
        const line = Number(cursorData.line);
        const column = Number(cursorData.column);
        
        if (line > 0 && column > 0) {
          // Add a cursor line decoration for the full line
          decorations.push({
            range: new window.monaco.Range(line, 1, line, Number.MAX_SAFE_INTEGER),
            options: {
              className: `cursor-line-${userId}`,
              isWholeLine: true,
              stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
            }
          });
          
          // Add a cursor position marker at the exact position - use a range that spans one character
          decorations.push({
            range: new window.monaco.Range(line, column, line, column + 1),
            options: {
              className: `cursor-position-${userId}`,
              stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              zIndex: 1000
            }
          });
          
          console.log(`✅ Added decorations for user ${userId} at line ${line}, column ${column}`);
        } else {
          console.warn(`❌ Invalid cursor position for user ${userId}:`, { line, column });
        }
      }
    });
    
    // Apply decorations
    try {
      const previousDecorations = cursorsDecorationRef.current || [];
      cursorsDecorationRef.current = editorRef.current.deltaDecorations(
        previousDecorations,
        decorations
      );
      console.log('✅ Applied cursor decorations:', decorations.length, 'total decorations, previous:', previousDecorations.length);
    } catch (error) {
      console.warn('❌ Error applying cursor decorations:', error);
    }
  }, [userCursors, activeFile]);

  // Generate dynamic CSS for cursor styles
  const generateCursorStyles = useCallback(() => {
    let styles = '';
    
    console.log('Generating cursor styles for users:', userCursors.size, 'users');
    console.log('UserCursors data:', Array.from(userCursors.entries()));
    
    // Add styles for all users' cursors
    userCursors.forEach((cursorData, userId) => {
      const userColor = generateUserColor(userId);
      const userName = cursorData.userName || `User ${userId}`;
      
      console.log('Adding styles for user:', userId, userColor, userName);
      
      styles += `
        /* Line highlight for user ${userId} */
        .monaco-editor .cursor-line-${userId} {
          background: linear-gradient(90deg, ${userColor}15 0%, ${userColor}05 100%) !important;
          border-left: 3px solid ${userColor} !important;
          position: relative !important;
        }
        
        /* Cursor position marker for user ${userId} */
        .monaco-editor .cursor-position-${userId} {
          position: relative !important;
          border-left: 2px solid ${userColor} !important;
          border-right: 1px solid ${userColor} !important;
          background: ${userColor}20 !important;
          min-width: 2px !important;
        }
        
        .monaco-editor .cursor-position-${userId}::before {
          content: "${userName}" !important;
          position: absolute !important;
          top: -25px !important;
          left: 0px !important;
          background: ${userColor} !important;
          color: white !important;
          padding: 3px 8px !important;
          border-radius: 4px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          z-index: 10000 !important;
          white-space: nowrap !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
          display: block !important;
          pointer-events: none !important;
        }
        
        .monaco-editor .cursor-position-${userId}::after {
          content: "" !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          bottom: 0 !important;
          width: 2px !important;
          background: ${userColor} !important;
          z-index: 9999 !important;
          animation: cursor-blink-${userId} 1.5s ease-in-out infinite !important;
          display: block !important;
          pointer-events: none !important;
        }
        
        @keyframes cursor-blink-${userId} {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `;
    });
    
    console.log('Generated cursor styles length:', styles.length, 'characters');
    return styles;
  }, [userCursors, generateUserColor]);

  // Handle cursor position changes  
  const handleCursorPositionChange = useCallback((position) => {
    if (!activeFile || !position) return;
    
    const currentTab = openTabs.find(tab => tab.id === activeFile);
    if (!currentTab) return;

    console.log('🎯 Cursor position changed:', { 
      line: position.lineNumber, 
      column: position.column, 
      file: currentTab.name,
      activeFile,
      sendCursorPositionAvailable: !!sendCursorPosition
    });

    // Update current user's cursor in the cursors map for decoration FIRST
    setUserCursors(prev => {
      const newMap = new Map(prev);
      newMap.set(user?.id, {
        fileId: activeFile,
        line: position.lineNumber,
        column: position.column,
        userName: user?.fullName || user?.name || user?.username || 'You',
        timestamp: Date.now()
      });
      console.log('🗂️ Updated userCursors map:', newMap.size, 'users, entries:', Array.from(newMap.entries()));
      
      // Force immediate decoration update after state change
      setTimeout(() => {
        console.log('🎨 Immediate decoration update after userCursors state change');
        updateCursorDecorations();
        // Also trigger the useEffect
        setCursorDecorationsUpdateTrigger(prev => prev + 1);
      }, 1);
      
      return newMap;
    });

    // Send cursor position to other users
    if (sendCursorPosition) {
      console.log('📤 Sending cursor position via WebSocket:', {
        fileId: activeFile,
        line: position.lineNumber,
        column: position.column
      });
      sendCursorPosition(activeFile, position.lineNumber, position.column);
    }

    // Update current user's file info for display in sidebar - IMMEDIATELY
    setUserFileInfo(prev => {
      const updatedInfo = {
        projectId: currentProject?.id,
        projectName: currentProject?.name,
        fileName: currentTab.name,
        filePath: currentTab.path || currentTab.name,
        line: position.lineNumber,
        column: position.column,
        timestamp: Date.now() // Add timestamp to force React to detect changes
      };
      
      console.log('🔄 IMMEDIATE userFileInfo update for current user:', {
        userId: user?.id,
        newLine: position.lineNumber,
        newColumn: position.column,
        fileName: currentTab.name,
        activeFile
      });
      
      const newState = {
        ...prev,
        [user?.id]: updatedInfo
      };
      
      return newState;
    });

    // Force sidebar update 
    setSidebarUpdateTrigger(prev => prev + 1);

    // Force cursor decoration update immediately  
    setCursorDecorationsUpdateTrigger(prev => prev + 1);
    setTimeout(() => {
      console.log('🎨 Forcing cursor decoration update from position change');
      updateCursorDecorations();
    }, 5);
    
    // Also trigger another update after a slightly longer delay to ensure it sticks
    setTimeout(() => {
      console.log('🎨 Second decoration update from position change');
      updateCursorDecorations();
      setCursorDecorationsUpdateTrigger(prev => prev + 1);
    }, 50);
    
    console.log('🔍 Cursor position updated, forcing immediate sidebar refresh');
  }, [activeFile, sendCursorPosition, openTabs, currentProject, user, updateCursorDecorations]);

  // Handle editor mount to set up cursor tracking
  const handleEditorDidMount = useCallback((editor, monaco) => {
    console.log('🎯 Monaco editor mounted, setting up aggressive cursor tracking');
    editorRef.current = editor;
    
    // Track cursor position changes - MAIN EVENT
    editor.onDidChangeCursorPosition((e) => {
      console.log('📍 Monaco cursor position event:', e.position);
      handleCursorPositionChange(e.position);
    });
    
    // Track cursor selection changes
    editor.onDidChangeCursorSelection((e) => {
      console.log('📍 Monaco cursor selection event:', e.selection.getStartPosition());
      handleCursorPositionChange(e.selection.getStartPosition());
    });
    
    // Track mouse clicks to ensure cursor position updates
    editor.onMouseDown((e) => {
      if (e.target && e.target.position) {
        console.log('🖱️ Mouse click at position:', e.target.position);
        handleCursorPositionChange(e.target.position);
      }
    });
    
    // Track mouse up events
    editor.onMouseUp((e) => {
      setTimeout(() => {
        const position = editor.getPosition();
        if (position) {
          console.log('🖱️ Mouse up, cursor at:', position);
          handleCursorPositionChange(position);
        }
      }, 10);
    });
    
    // Track when editor gains focus and set cursor position
    editor.onDidFocusEditorText(() => {
      const position = editor.getPosition();
      console.log('🎯 Editor focused, cursor at:', position);
      if (position) {
        handleCursorPositionChange(position);
      }
    });
    
    // Track when editor content changes - this also indicates cursor activity
    editor.onDidChangeModelContent((e) => {
      const position = editor.getPosition();
      if (position) {
        console.log('✏️ Content changed, cursor at:', position);
        handleCursorPositionChange(position);
      }
    });
    
    // Track keyboard navigation
    editor.onKeyDown((e) => {
      // For arrow keys and other navigation keys, update cursor position after a short delay
      const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
      if (navKeys.includes(e.code)) {
        setTimeout(() => {
          const position = editor.getPosition();
          if (position) {
            console.log('⌨️ Navigation key, cursor at:', position);
            handleCursorPositionChange(position);
          }
        }, 10);
      }
    });
    
    // Force initial cursor position after a delay
    setTimeout(() => {
      const position = editor.getPosition();
      console.log('🚀 Initial cursor position after delay:', position);
      if (position) {
        handleCursorPositionChange(position);
      } else {
        // If no position, set to line 1, column 1
        const defaultPosition = { lineNumber: 1, column: 1 };
        console.log('🚀 Setting default cursor position:', defaultPosition);
        handleCursorPositionChange(defaultPosition);
      }
      
      // Force trigger cursor decoration update after initial setup
      setTimeout(() => {
        console.log('🎨 Force triggering cursor decoration update');
        updateCursorDecorations();
      }, 500);
    }, 100);
    
    // More frequent cursor position check for immediate updates
    const intervalId = setInterval(() => {
      const position = editor.getPosition();
      if (position) {
        // Only log periodically to avoid spam, but still update
        handleCursorPositionChange(position);
      }
    }, 200); // Check every 200ms for very responsive updates
    
    return () => {
      clearInterval(intervalId);
    };
  }, [handleCursorPositionChange]);

  // Debug WebSocket state (reduced)
  useEffect(() => {
    console.log('WebSocket State:', { 
      isConnected, 
      usersCount: connectedUsers.length, 
      projectId: currentProject?.id,
      wsServiceAvailable: !!wsService,
      sendCursorPositionAvailable: !!sendCursorPosition
    });
  }, [isConnected, connectedUsers.length, currentProject?.id, wsService, sendCursorPosition]);
  
  // Set up WebSocket listeners for cursor position updates and real-time code sync
  useEffect(() => {
    if (!wsService) return;
    
    const handleCursorPosition = (data) => {
      if (data.userId === user?.id) return; // Don't process own cursor
      
      console.log('Received cursor position from user:', data.userId, data);
      
      setUserCursors(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          fileId: data.fileId,
          line: data.line,
          column: data.column,
          userName: data.userName,
          timestamp: data.timestamp
        });
        
        // Force immediate decoration update after receiving WebSocket cursor data
        setTimeout(() => {
          console.log('🎨 Immediate decoration update after WebSocket cursor');
          updateCursorDecorations();
          // Also trigger the useEffect
          setCursorDecorationsUpdateTrigger(prev => prev + 1);
        }, 1);
        
        return newMap;
      });
      
      // Update user file info
      const currentTab = openTabs.find(tab => tab.id === data.fileId);
      if (currentTab) {
        setUserFileInfo(prev => ({
          ...prev,
          [data.userId]: {
            projectId: currentProject?.id,
            projectName: currentProject?.name,
            fileName: currentTab.name,
            filePath: currentTab.path || currentTab.name,
            line: data.line,
            column: data.column,
            timestamp: Date.now() // Add timestamp to force React updates
          }
        }));
        
        // Force sidebar update when receiving cursor position from other users
        setSidebarUpdateTrigger(prev => prev + 1);
        
        // Force cursor decoration update for the received cursor - multiple attempts
        setCursorDecorationsUpdateTrigger(prev => prev + 1);
        setTimeout(() => {
          console.log('🎨 Forcing decoration update from WebSocket cursor position');
          updateCursorDecorations();
        }, 5);
        
        setTimeout(() => {
          console.log('🎨 Second decoration update from WebSocket cursor position');
          updateCursorDecorations();
          setCursorDecorationsUpdateTrigger(prev => prev + 1);
        }, 50);
      }
    };
    
    const handleFileSelection = (data) => {
      if (data.userId === user?.id) return; // Don't process own file selection
      
      setUserFileInfo(prev => {
        const existingInfo = prev[data.userId] || {};
        return {
          ...prev,
          [data.userId]: {
            ...existingInfo,
            projectId: currentProject?.id,
            projectName: currentProject?.name,
            fileName: data.fileName,
            filePath: data.fileName,
            line: existingInfo.line || 1,
            column: existingInfo.column || 1,
            timestamp: Date.now() // Force React updates
          }
        };
      });
      
      // Force sidebar update when receiving file selection from other users
      setSidebarUpdateTrigger(prev => prev + 1);
    };
    
    const handleCodeChange = (data) => {
      if (data.userId === user?.id) return; // Don't process own code changes
      
      console.log('📝 Received real-time code change from user:', data.userId, 'for file:', data.fileId);
      
      // Only update if the changed file is currently open
      const isFileOpen = openTabs.some(tab => tab.id === data.fileId);
      if (isFileOpen) {
        // Update the code in open tabs
        setOpenTabs(prev => prev.map(tab => 
          tab.id === data.fileId ? { ...tab, content: data.content } : tab
        ));
        
        // Update the editor content if this is the active file
        if (activeFile === data.fileId) {
          console.log('📝 Updating active editor content with real-time changes');
          setCode(data.content);
          
          // Update last saved content to reflect the changes
          setLastSavedContent(data.content);
        }
      }
    };
    
    const handleFileSaved = async (data) => {
      if (data.userId === user?.id) return; // Don't process own save events
      
      console.log('💾 Received file saved notification from user:', data.userId, 'for file:', data.fileId);
      
      // Check if this file is currently open by the current user
      const isFileOpen = openTabs.some(tab => tab.id === data.fileId);
      
      if (isFileOpen) {
        try {
          // Fetch the updated file content from the server
          console.log('📥 Fetching updated file content after save...');
          
          // Update the file content in open tabs immediately
          setOpenTabs(prev => prev.map(tab => 
            tab.id === data.fileId ? { ...tab, content: data.content } : tab
          ));
          
          // Update the editor content if this is the active file
          if (activeFile === data.fileId) {
            console.log('📝 Updating active editor with saved content');
            setCode(data.content);
            setLastSavedContent(data.content);
            
            // Clear unsaved changes for this file since it's now synchronized
            setUnsavedChanges(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.fileId);
              return newSet;
            });
          }
          
          // Show notification to user about the update
          setRemoteUpdateInfo({
            fileName: data.fileName,
            userName: data.userName || 'Another user'
          });
          setShowRemoteUpdateToast(true);
          setTimeout(() => setShowRemoteUpdateToast(false), 3000);
          
          console.log('✅ File content updated from remote save');
          
          // Reload project files to keep the files array in sync
          if (currentProject?.id) {
            await loadProjectFiles(currentProject.id);
          }
        } catch (error) {
          console.error('❌ Error handling remote file save:', error);
        }
      }
    };
    
    const handleUserLeft = (data) => {
      // Clean up cursor and file info when user leaves
      setUserCursors(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
      
      setUserFileInfo(prev => {
        const newObj = { ...prev };
        delete newObj[data.userId];
        return newObj;
      });
    };
    
    const handleUserJoined = (data) => {
      // When a new user joins, they may need to know about current user's location
      if (activeFile && wsService && wsService.isConnected) {
        const currentTab = openTabs.find(tab => tab.id === activeFile);
        if (currentTab) {
          // Send current file selection to the new user
          wsService.sendFileSelection(activeFile, currentTab.name);
        }
      }
    };
    
    wsService.on('cursorPosition', handleCursorPosition);
    wsService.on('fileSelection', handleFileSelection);
    wsService.on('codeChange', handleCodeChange);
    wsService.on('fileSaved', handleFileSaved);
    wsService.on('userLeft', handleUserLeft);
    wsService.on('userJoined', handleUserJoined);
    
    return () => {
      wsService.off('cursorPosition', handleCursorPosition);
      wsService.off('fileSelection', handleFileSelection);
      wsService.off('codeChange', handleCodeChange);
      wsService.off('fileSaved', handleFileSaved);
      wsService.off('userLeft', handleUserLeft);
      wsService.off('userJoined', handleUserJoined);
    };
  }, [wsService, user, openTabs, currentProject, activeFile, files, loadProjectFiles]);
  
  // Update cursor decorations when cursors change - be more aggressive about updates
  useEffect(() => {
    console.log('🎨 Triggering cursor decoration update due to cursor changes', {
      userCursorsSize: userCursors.size,
      activeFile,
      sidebarUpdateTrigger,
      cursorDecorationsUpdateTrigger,
      userCursorsEntries: Array.from(userCursors.entries())
    });
    
    // Use a small delay to ensure Monaco is ready
    const timeoutId = setTimeout(() => {
      updateCursorDecorations();
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [updateCursorDecorations, activeFile, userCursors, sidebarUpdateTrigger, cursorDecorationsUpdateTrigger]);
  
  // Additional effect to trigger decorations when userCursors Map size changes
  useEffect(() => {
    console.log('🎨 userCursors Map size changed:', userCursors.size);
    if (userCursors.size > 0) {
      const timeoutId = setTimeout(() => {
        console.log('🎨 Forcing decoration update due to size change');
        updateCursorDecorations();
      }, 5);
      
      return () => clearTimeout(timeoutId);
    }
  }, [userCursors.size, updateCursorDecorations]);
  
  // Inject dynamic cursor styles into DOM
  useEffect(() => {
    const styleId = 'cursor-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    const styles = generateCursorStyles();
    
    // Add styles for actual cursor decorations
    const debugStyles = `
      /* Base styles for cursor decorations */
      .monaco-editor .view-lines .view-line span[class*="cursor-line-"],
      .monaco-editor .view-lines .view-line span[class*="cursor-position-"] {
        position: relative;
      }
      
      /* Ensure cursor decorations are properly positioned */
      .monaco-editor .view-lines .view-line .cursor-position-marker {
        position: absolute;
        top: 0;
        bottom: 0;
        pointer-events: none;
      }
    `;
    
    styleElement.textContent = styles + debugStyles;
    console.log('Injected cursor styles:', styles ? 'Generated' : 'Empty', 'Length:', styles.length);
  }, [generateCursorStyles]);
  
  // Set current user's location when activeFile changes
  useEffect(() => {
    if (activeFile && currentProject && user?.id) {
      const currentTab = openTabs.find(tab => tab.id === activeFile);
      if (currentTab) {
        setUserFileInfo(prev => {
          const currentInfo = prev[user.id];
          return {
            ...prev,
            [user.id]: {
              projectId: currentProject.id,
              projectName: currentProject.name,
              fileName: currentTab.name,
              filePath: currentTab.path || currentTab.name,
              line: currentInfo?.line || 1,
              column: currentInfo?.column || 1
            }
          };
        });
      }
    }
  }, [activeFile, currentProject, user?.id, openTabs]);
  
  // Create a display list that includes current user if connected and not already in the list
  const currentUserInList = connectedUsers.find(u => u.id === user?.id);
  const allConnectedUsers = useMemo(() => {
    const baseUsers = isConnected ? [
      ...connectedUsers.map(connectedUser => ({
        ...connectedUser,
        color: generateUserColor(connectedUser.id),
        fileInfo: userFileInfo[connectedUser.id],
        isCurrentProject: userFileInfo[connectedUser.id]?.projectId === currentProject?.id
      })),
      ...(currentUserInList ? [] : [{
        id: user?.id || 'current-user',
        name: user?.fullName || user?.name || user?.username || 'You',
        fullName: user?.fullName || user?.name || user?.username || 'You',
        userName: user?.username || 'You',
        color: generateUserColor(user?.id || 'current-user'),
        isSelf: true,
        fileInfo: userFileInfo[user?.id],
        isCurrentProject: true
      }])
    ] : connectedUsers.map(connectedUser => ({
      ...connectedUser,
      color: generateUserColor(connectedUser.id),
      fileInfo: userFileInfo[connectedUser.id],
      isCurrentProject: userFileInfo[connectedUser.id]?.projectId === currentProject?.id
    }));
    
    console.log('🔄 allConnectedUsers recalculated:', {
      baseUsersCount: baseUsers.length,
      userFileInfoKeys: Object.keys(userFileInfo),
      sidebarUpdateTrigger,
      currentUserFileInfo: userFileInfo[user?.id],
      userFileInfoEntries: Object.entries(userFileInfo),
      currentUserId: user?.id,
      currentUserInList: !!currentUserInList
    });
    
    // Debug each user in baseUsers
    baseUsers.forEach((u, index) => {
      console.log(`User ${index}:`, {
        id: u.id,
        isSelf: u.isSelf,
        fileInfo: u.fileInfo,
        name: u.name
      });
    });
    
    return baseUsers;
  }, [isConnected, connectedUsers, currentUserInList, user?.id, user?.fullName, user?.name, user?.username, currentProject?.id, userFileInfo, sidebarUpdateTrigger, generateUserColor]);
  
  // Debug user list - Enhanced with more details
  useEffect(() => {
    console.log('📊 User State Update:', {
      connectedUsersCount: connectedUsers.length,
      userFileInfoKeys: Object.keys(userFileInfo),
      currentUserId: user?.id,
      currentUserFileInfo: userFileInfo[user?.id],
      allConnectedUsersCount: allConnectedUsers.length,
      sidebarUpdateTrigger
    });
    
    // Log each user's file info with more detail
    console.log('📝 All userFileInfo entries:');
    Object.entries(userFileInfo).forEach(([userId, info]) => {
      console.log(`  User ${userId}:`, {
        line: info.line,
        column: info.column,
        fileName: info.fileName,
        timestamp: info.timestamp,
        projectId: info.projectId
      });
    });
    
    // Log allConnectedUsers for comparison
    console.log('👥 All connected users in sidebar:');
    allConnectedUsers.forEach((user, index) => {
      console.log(`  ${index}. ${user.name} (${user.id}):`, {
        isSelf: user.isSelf,
        fileInfo: user.fileInfo,
        line: user.fileInfo?.line,
        column: user.fileInfo?.column
      });
    });
  }, [connectedUsers.length, Object.keys(userFileInfo).length, user?.id, allConnectedUsers.length, sidebarUpdateTrigger, userFileInfo, allConnectedUsers]);
  
  // Total connected users count
  const totalConnectedUsers = allConnectedUsers.length;

  
  // Load projects and files on component mount
  useEffect(() => {
    if (isAuthenticated && user && !projectLoading && !projects.length) {
      console.log('Loading projects for user:', user);
      loadProjects();
    } else {
      console.log('Not loading projects - authenticated:', isAuthenticated, 'user:', !!user, 'loading:', projectLoading, 'projectsCount:', projects.length);
    }
  }, [isAuthenticated, user]); // Removed loadProjects dependency to prevent infinite loop
  
  // Load files when current project changes
  useEffect(() => {
    if (currentProject?.id && !projectLoading) {
      console.log('Loading files for project:', currentProject.id);
      loadProjectFiles(currentProject.id);
    } else {
      console.log('Not loading files - project:', currentProject?.id, 'loading:', projectLoading);
    }
  }, [currentProject?.id]); // Removed loadProjectFiles dependency to prevent infinite loop
  
  // Set code when current file changes (from ProjectContext) - only when no manual selection
  useEffect(() => {
    if (currentFile && openTabs.length === 0) {
      setCode(currentFile.content || '');
      setLanguage(getLanguageFromFilename(currentFile.name));
      setActiveFile(currentFile.id);
      setOpenTabs([currentFile]);
      
      // Update current user's file info
      setUserFileInfo(prev => ({
        ...prev,
        [user?.id]: {
          projectId: currentProject?.id,
          projectName: currentProject?.name,
          fileName: currentFile.name,
          filePath: currentFile.path || currentFile.name,
          line: 1,
          column: 1
        }
      }));
    }
  }, [currentFile, user?.id, currentProject]);

  // Set project language when project changes
  useEffect(() => {
    if (currentProject?.language) {
      // Map project language to editor language
      const mappedLanguage = mapProjectLanguageToEditor(currentProject.language);
      setLanguage(mappedLanguage);
    }
  }, [currentProject?.language]);

  // Helper function to map project language to editor language
  const mapProjectLanguageToEditor = (projectLang) => {
    const langMap = {
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'Python': 'python',
      'Java': 'java',
      'C++': 'cpp',
      'HTML': 'html',
      'CSS': 'css',
      'JSON': 'json'
    };
    return langMap[projectLang] || projectLang.toLowerCase();
  };

  // Clear tabs when project switches
  useEffect(() => {
    if (currentProject) {
      setOpenTabs([]);
      setActiveFile(null);
    }
  }, [currentProject?.id]);
  
  // Helper function to determine language from filename
  const getLanguageFromFilename = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown'
    };
    return langMap[extension] || 'plaintext';
  };

  // Helper function to get file icon based on file extension
  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return <Code size={16} style={{ color: '#f7df1e' }} />;
      case 'ts':
      case 'tsx':
        return <Code size={16} style={{ color: '#3178c6' }} />;
      case 'py':
        return <Code size={16} style={{ color: '#3776ab' }} />;
      case 'java':
        return <Code size={16} style={{ color: '#ed8b00' }} />;
      case 'html':
        return <Code size={16} style={{ color: '#e34c26' }} />;
      case 'css':
        return <Code size={16} style={{ color: '#1572b6' }} />;
      case 'json':
        return <Code size={16} style={{ color: '#000000' }} />;
      case 'md':
        return <FileText size={16} style={{ color: '#083fa1' }} />;
      default:
        return <File size={16} />;
    }
  };

  // Event handlers
  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    navigate('/login');
  };

  const handleSave = async () => {
    if (!activeFile || !currentProject) return;
    
    setIsSaving(true);
    setSaveError('');
    
    try {
      const result = await updateFile(activeFile, {
        content: code
      });
      
      if (result && result.success) {
        console.log('File saved successfully');
        
        // Update the file content in open tabs
        setOpenTabs(prev => prev.map(tab => 
          tab.id === activeFile ? { ...tab, content: code } : tab
        ));
        
        // IMPORTANT: Update the files array with the new content
        // This ensures the terminal gets the latest content
        if (loadProjectFiles && currentProject?.id) {
          await loadProjectFiles(currentProject.id);
        }
        
        // Update the saved content tracking
        setLastSavedContent(code);
        setUnsavedChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(activeFile);
          return newSet;
        });
        
        // Send save notification to other users via WebSocket
        if (wsService && wsService.isConnected) {
          const currentTab = openTabs.find(tab => tab.id === activeFile);
          if (currentTab) {
            console.log('📤 Sending file saved notification to other users');
            wsService.sendFileSaved(activeFile, currentTab.name, code);
          }
        }
        
        // Show save toast notification
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2000);
        
      } else {
        setSaveError(result?.error || 'Failed to save file');
      }
    } catch (error) {
      setSaveError(error.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeChange = (value) => {
    setCode(value || '');
    
    // Update the content in open tabs to preserve changes
    if (activeFile) {
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeFile ? { ...tab, content: value || '' } : tab
      ));
    }
    
    // Send real-time code changes to other users (debounced)
    if (sendCodeChange && activeFile) {
      // Clear existing timeout
      if (window.codeChangeTimeout) {
        clearTimeout(window.codeChangeTimeout);
      }
      
      // Set new timeout to debounce rapid changes
      window.codeChangeTimeout = setTimeout(() => {
        sendCodeChange({
          fileId: activeFile,
          content: value || '',
          cursor: editorRef.current?.getPosition()
        });
      }, 500); // Send after 500ms of inactivity
    }
  };

  // Auto-save function with proper unsaved changes tracking
  const handleAutoSave = useCallback(async () => {
    if (!activeFile || !currentProject) return;
    
    try {
      const result = await updateFile(activeFile, {
        content: code
      });
      
      if (result && result.success) {
        console.log('File auto-saved successfully');
        setLastSavedContent(code);
        setUnsavedChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(activeFile);
          return newSet;
        });
        // Update the saved content in open tabs to mark as saved
        setOpenTabs(prev => prev.map(tab => 
          tab.id === activeFile ? { ...tab, content: code } : tab
        ));
        
        // Send save notification to other users via WebSocket for auto-save too
        if (wsService && wsService.isConnected) {
          const currentTab = openTabs.find(tab => tab.id === activeFile);
          if (currentTab) {
            console.log('📤 Sending auto-save notification to other users');
            wsService.sendFileSaved(activeFile, currentTab.name, code);
          }
        }
        
        // Show save toast notification
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 2000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [activeFile, currentProject, code, updateFile, wsService, openTabs]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback((fileId) => {
    if (!fileId) return false;
    const tab = openTabs.find(t => t.id === fileId);
    const originalFile = files.find(f => f.id === fileId);
    return tab && originalFile && tab.content !== originalFile.content;
  }, [openTabs, files]);

  // Manual save with keyboard shortcut
  const handleManualSave = useCallback(async () => {
    if (activeFile && hasUnsavedChanges(activeFile)) {
      await handleAutoSave();
    }
  }, [activeFile, hasUnsavedChanges, handleAutoSave]);

  // Track unsaved changes when code changes
  useEffect(() => {
    if (activeFile && code !== lastSavedContent) {
      setUnsavedChanges(prev => new Set(prev).add(activeFile));
    }
  }, [code, activeFile, lastSavedContent]);

  // Update lastSavedContent when switching files
  useEffect(() => {
    if (activeFile) {
      const originalFile = files.find(f => f.id === activeFile);
      if (originalFile) {
        setLastSavedContent(originalFile.content || '');
      }
    }
  }, [activeFile, files]);

  // Keyboard shortcut for save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeFile && hasUnsavedChanges(activeFile)) {
        handleAutoSave();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeFile, handleAutoSave]);

  const handleFileSelect = async (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      // Save current file before switching if there are unsaved changes
      if (activeFile && hasUnsavedChanges(activeFile)) {
        await handleAutoSave();
      }
      
      setActiveFile(fileId);
      
      // Initialize current user's cursor position in the new file
      setTimeout(() => {
        if (editorRef.current) {
          const position = editorRef.current.getPosition() || { lineNumber: 1, column: 1 };
          console.log('🔄 File selected, initializing cursor position:', position);
          handleCursorPositionChange(position);
        }
      }, 100);
      
      // Get the latest content from open tabs or file data
      const tabContent = openTabs.find(tab => tab.id === fileId)?.content;
      const fileContent = tabContent !== undefined ? tabContent : file.content;
      
      setCode(fileContent || '');
      setLanguage(getLanguageFromFilename(file.name));
      
      // Add to open tabs if not already open
      if (!openTabs.find(tab => tab.id === fileId)) {
        setOpenTabs(prev => [...prev, { ...file, content: file.content || '' }]);
      }
      
      // Update current user's file info immediately
      setUserFileInfo(prev => ({
        ...prev,
        [user?.id]: {
          projectId: currentProject?.id,
          projectName: currentProject?.name,
          fileName: file.name,
          filePath: file.path || file.name,
          line: 1,
          column: 1
        }
      }));
      
      // Send file selection to other users
      if (wsService && wsService.isConnected) {
        wsService.sendFileSelection(fileId, file.name);
      }
    }
  };

  const handleTabSelect = async (fileId) => {
    // Save current file before switching if there are unsaved changes
    if (activeFile && activeFile !== fileId && hasUnsavedChanges(activeFile)) {
      await handleAutoSave();
    }
    
    setActiveFile(fileId);
    
    // Initialize current user's cursor position in the new file
    setTimeout(() => {
      if (editorRef.current) {
        const position = editorRef.current.getPosition() || { lineNumber: 1, column: 1 };
        console.log('🔄 Tab switched, initializing cursor position:', position);
        handleCursorPositionChange(position);
      }
    }, 100);

    // Find the file in either the files list or open tabs
    const file = files.find(f => f.id === fileId) || openTabs.find(tab => tab.id === fileId);
    if (file) {
      // Use the content from open tabs if available (which includes unsaved changes)
      const tabContent = openTabs.find(tab => tab.id === fileId)?.content;
      const fileContent = tabContent !== undefined ? tabContent : file.content;
      
      setCode(fileContent || '');
      setLanguage(getLanguageFromFilename(file.name));
      
      // Update current user's file info immediately
      setUserFileInfo(prev => ({
        ...prev,
        [user?.id]: {
          projectId: currentProject?.id,
          projectName: currentProject?.name,
          fileName: file.name,
          filePath: file.path || file.name,
          line: 1,
          column: 1,
          timestamp: Date.now()
        }
      }));
      
      // Force sidebar update
      setSidebarUpdateTrigger(prev => prev + 1);
      
      // After the editor updates, get the actual cursor position
      setTimeout(() => {
        if (editorRef.current) {
          const position = editorRef.current.getPosition();
          if (position) {
            console.log('Tab selected, updating cursor position from editor:', position);
            handleCursorPositionChange(position);
          }
        }
      }, 100);
      
      // Debug: Log userFileInfo after update
      setTimeout(() => {
        console.log('🔍 After tab select - userFileInfo:', {
          objectKeysLength: Object.keys(userFileInfo).length,
          currentUserInfo: userFileInfo[user?.id],
          allEntries: Object.entries(userFileInfo)
        });
      }, 200);
      
      // Send file selection to other users
      if (wsService && wsService.isConnected) {
        wsService.sendFileSelection(fileId, file.name);
      }
    }
  };

  const handleTabClose = async (fileId, e) => {
    e.stopPropagation();
    
    // Check if the tab has unsaved changes
    if (hasUnsavedChanges(fileId)) {
      const shouldSave = window.confirm('This file has unsaved changes. Do you want to save before closing?');
      if (shouldSave) {
        // Save the file
        try {
          const tab = openTabs.find(t => t.id === fileId);
          await updateFile(fileId, { content: tab.content });
          console.log('File saved before closing');
        } catch (error) {
          console.error('Failed to save file before closing:', error);
          return; // Don't close if save failed
        }
      }
    }
    
    closeTab(fileId);
  };

  const closeTab = (fileId) => {
    setOpenTabs(prev => prev.filter(tab => tab.id !== fileId));
    
    // If closing active tab, switch to another tab or clear editor
    if (activeFile === fileId) {
      const remainingTabs = openTabs.filter(tab => tab.id !== fileId);
      if (remainingTabs.length > 0) {
        const newActiveTab = remainingTabs[remainingTabs.length - 1];
        setActiveFile(newActiveTab.id);
        setCode(newActiveTab.content || '');
        setLanguage(getLanguageFromFilename(newActiveTab.name));
      } else {
        setActiveFile(null);
        setCode('');
        setLanguage('javascript'); // default language
      }
    }
  };

  const handleProjectSwitch = async (project) => {
    // Save current file before switching projects if there are unsaved changes
    if (activeFile && hasUnsavedChanges(activeFile)) {
      await handleAutoSave();
    }
    
    try {
      // Verify the project is accessible before switching
      console.log('🔄 Switching to project:', project);
      
      // Check if this is a valid project that the user has access to
      const userProjects = projects.filter(p => p.id === project.id);
      if (userProjects.length === 0) {
        console.error('❌ Project not found in user\'s accessible projects:', project.id);
        alert('You do not have access to this project. It may have been deleted or you may not have permission.');
        
        // Reload projects to get the current accessible list
        await loadProjects();
        return;
      }
      
      setCurrentProject(project);
      setShowProjectSwitcher(false);
      setActiveFile(null);
      setOpenTabs([]);
      setCode('');
      setUnsavedChanges(new Set());
      setLastSavedContent('');
      
      // Set the language based on the project
      if (project?.language) {
        setLanguage(mapProjectLanguageToEditor(project.language));
      }
      
      console.log('✅ Successfully switched to project:', project.name);
    } catch (error) {
      console.error('❌ Error switching projects:', error);
      alert('Failed to switch projects: ' + error.message);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim() || !currentProject) return;
    
    try {
      const fileLanguage = getLanguageFromFilename(newFileName.trim());
      
      const fileData = {
        name: newFileName.trim(),
        content: getDefaultContent(fileLanguage),
        language: fileLanguage,
        projectId: currentProject.id
      };
      
      console.log('Creating file with data:', fileData);
      const result = await createFile(fileData);
      console.log('Create file result:', result);
      
      setShowCreateFile(false);
      setNewFileName('');
      
      // Reload files to show the new file
      await loadProjectFiles(currentProject.id);
      
      // If file creation was successful, open it immediately
      if (result && result.success && result.data) {
        const newFile = result.data;
        setActiveFile(newFile.id);
        setCode(newFile.content || '');
        setLanguage(getLanguageFromFilename(newFile.name));
        
        // Add to open tabs
        setOpenTabs(prev => {
          const existingTab = prev.find(tab => tab.id === newFile.id);
          if (!existingTab) {
            return [...prev, newFile];
          }
          return prev;
        });
        
        console.log('File created and opened successfully');
      } else {
        console.error('Failed to create file:', result?.error);
        alert('Failed to create file: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file: ' + error.message);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!currentProject || !fileId) return;
    
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        const result = await deleteFile(fileId);
        
        if (result && result.success) {
          // Remove from open tabs if open
          setOpenTabs(prev => prev.filter(tab => tab.id !== fileId));
          
          // Clear editor if this was the active file
          if (activeFile === fileId) {
            setActiveFile(null);
            setCode('');
          }
          
          // Close context menu
          setShowFileContextMenu(null);
          
          // Reload files to reflect changes
          await loadProjectFiles(currentProject.id);
        } else {
          console.error('Failed to delete file:', result?.error || 'Unknown error');
          alert('Failed to delete file: ' + (result?.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Failed to delete file:', error);
        alert('Failed to delete file: ' + error.message);
      }
    }
  };

  const handleFileRightClick = (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowFileContextMenu(fileId);
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setShowFileContextMenu(null);
    };
    
    if (showFileContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showFileContextMenu]);

  const handleRunCode = async () => {
    if (!activeFile || !code.trim()) {
      alert('Please select a file with code to run');
      return;
    }

    // Force save before running to ensure latest content
    if (hasUnsavedChanges(activeFile)) {
      console.log('🔄 Auto-saving before running...');
      await handleSave();
      
      // Wait a moment for save to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Open terminal if not already open
    if (activeBottomPanel !== 'terminal') {
      setActiveBottomPanel('terminal');
      setIsTerminalMinimized(false);
      setIsConsoleMinimized(true);
    }

    // Wait a moment for terminal to be ready
    setTimeout(() => {
      // Get current file name and pass the most recent content
      const currentTab = openTabs.find(tab => tab.id === activeFile);
      if (currentTab && window.terminalExecuteCommand) {
        console.log('🚀 Executing file:', currentTab.name);
        console.log('📝 Current code content:', code);
        
        // Force the terminal to use the current code content
        window.terminalExecuteCommand(`run ${currentTab.name}`, code);
      }
    }, 100);
  };

  const handleShare = () => {
    console.log('Sharing project...');
    // Here you would implement sharing
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    // Show toast notification
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Add keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, code]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!activeFile || !currentProject) return;
    
    const autoSaveInterval = setInterval(() => {
      const tab = openTabs.find(t => t.id === activeFile);
      const originalFile = files.find(f => f.id === activeFile);
      const hasUnsavedChanges = tab && originalFile && tab.content !== originalFile.content;
      
      if (hasUnsavedChanges) {
        console.log('Auto-saving file...');
        handleAutoSave();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [activeFile, currentProject, openTabs, files, code]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' }
  ];

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  };

  const renderFiles = () => {
    return (
      <>
        {/* Create File Button */}
        <motion.button
          className="create-file-btn"
          onClick={() => setShowCreateFile(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} />
          <span>New File</span>
        </motion.button>

        {/* Files List */}
        {!files || files.length === 0 ? (
          <div className="no-files">
            <FileText size={24} />
            <p>No files in this project</p>
            <p>Create a new file to get started</p>
          </div>
        ) : (
          files.map(file => (
            <motion.div
              key={file.id}
              className={`file-item ${activeFile === file.id ? 'active' : ''}`}
              onClick={() => handleFileSelect(file.id)}
              onContextMenu={(e) => handleFileRightClick(e, file.id)}
              whileHover={{ x: 4 }}
            >
              {getFileIcon(file.name)}
              <span>{file.name}</span>
            </motion.div>
          ))
        )}

        {/* Create File Modal */}
        <AnimatePresence>
          {showCreateFile && (
            <div className="modal-overlay" onClick={() => setShowCreateFile(false)}>
              <motion.div
                className="create-file-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
              >
                <h3>Create New File</h3>
                <input
                  type="text"
                  placeholder="Enter file name (e.g., index.js)"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFile();
                    }
                  }}
                  autoFocus
                />
                <div className="modal-actions">
                  <button onClick={() => setShowCreateFile(false)}>Cancel</button>
                  <button onClick={handleCreateFile} disabled={!newFileName.trim()}>
                    Create File
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* File Context Menu */}
        <AnimatePresence>
          {showFileContextMenu && (
            <motion.div
              className="file-context-menu"
              style={{
                position: 'fixed',
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                zIndex: 10000
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <button
                className="context-menu-item delete"
                onClick={() => handleDeleteFile(showFileContextMenu)}
              >
                <X size={16} />
                Delete File
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  const getUserLocation = (user) => {
    const pathParts = user.cursor.file.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
    
    return {
      folder: folder || 'root',
      file: fileName,
      line: user.cursor.line
    };
  };

  const handleCreateNewProject = () => {
    setShowProjectSwitcher(false);
    setShowCreateProject(true);
  };

  const handleCreateProject = async () => {
    if (!newProjectData.name.trim()) {
      console.log('❌ Project name is required');
      return;
    }
    
    try {
      console.log('🚀 Creating project with data:', newProjectData);
      
      const projectData = {
        name: newProjectData.name.trim(),
        description: newProjectData.description.trim(),
        language: newProjectData.language
      };
      
      console.log('📤 Sending project data to API:', projectData);
      const result = await createProjectAPI(projectData);
      console.log('📥 API response:', result);
      
      if (result.success) {
        console.log('✅ Project created successfully:', result.data);
        
        // Close modal and reset form
        setShowCreateProject(false);
        setNewProjectData({
          name: '',
          description: '',
          language: 'JavaScript'
        });
        
        // Switch to the new project
        setCurrentProject(result.data);
        
        // Create default file based on language
        setTimeout(async () => {
          try {
            const defaultFileName = getDefaultFileName(result.data.language);
            const defaultLanguage = mapProjectLanguageToEditor(result.data.language);
            const defaultContent = getDefaultContent(defaultLanguage);
            
            const fileData = {
              name: defaultFileName,
              content: defaultContent,
              language: defaultLanguage,
              projectId: result.data.id
            };
            
            const fileResult = await createFile(fileData);
            await loadProjectFiles(result.data.id);
            
            // Open the default file immediately
            if (fileResult && fileResult.success && fileResult.data) {
              const newFile = fileResult.data;
              setActiveFile(newFile.id);
              setCode(newFile.content || '');
              setLanguage(getLanguageFromFilename(newFile.name));
              setOpenTabs([newFile]);
            }
          } catch (error) {
            console.error('Failed to create default file:', error);
          }
        }, 500);
        
        // Reload projects to include the new one
        loadProjects();
      } else {
        console.error('❌ Failed to create project:', result.error);
      }
    } catch (error) {
      console.error('❌ Error creating project:', error);
    }
  };

  const getDefaultFileName = (language) => {
    switch (language) {
      case 'Java':
        return 'Main.java';
      case 'Python':
        return 'main.py';
      case 'C++':
        return 'main.cpp';
      case 'TypeScript':
        return 'index.ts';
      case 'HTML':
        return 'index.html';
      case 'CSS':
        return 'styles.css';
      default:
        return 'index.js';
    }
  };

  const getDefaultContent = (language) => {
    const lang = language.toLowerCase();
    switch (lang) {
      case 'javascript':
        return `// Welcome to your new JavaScript project
console.log('Hello, World!');

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('CodeSync'));`;
      
      case 'typescript':
        return `// Welcome to your new TypeScript project
interface User {
  name: string;
  id: number;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const user: User = { name: 'CodeSync', id: 1 };
console.log(greet(user));`;
      
      case 'python':
        return `# Welcome to your new Python project
def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print("Hello, World!")
    print(greet("CodeSync"))`;
      
      case 'java':
        return `// Welcome to your new Java project
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        System.out.println(greet("CodeSync"));
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`;

      case 'c++':
        return `// Welcome to your new C++ project
#include <iostream>
#include <string>

std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << "Hello, World!" << std::endl;
    std::cout << greet("CodeSync") << std::endl;
    return 0;
}`;

      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeSync Project</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>Welcome to your new HTML project!</p>
</body>
</html>`;

      case 'css':
        return `/* Welcome to your new CSS project */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f0f0f0;
}

h1 {
    color: #333;
    text-align: center;
}`;
      
      default:
        return `// Welcome to your new project
// Start coding here!
console.log('Hello, World!');`;
    }
  };

  const getProjectLanguageIcon = (language) => {
    switch (language.toLowerCase()) {
      case 'javascript':
        return <Code size={14} style={{ color: '#f7df1e' }} />;
      case 'typescript':
        return <Code size={14} style={{ color: '#3178c6' }} />;
      case 'python':
        return <Code size={14} style={{ color: '#3776ab' }} />;
      case 'java':
        return <Code size={14} style={{ color: '#ed8b00' }} />;
      case 'c++':
        return <Code size={14} style={{ color: '#00599c' }} />;
      case 'html':
        return <Code size={14} style={{ color: '#e34c26' }} />;
      case 'css':
        return <Code size={14} style={{ color: '#1572b6' }} />;
      case 'react':
        return <Code size={14} style={{ color: '#61dafb' }} />;
      default:
        return <Code size={14} />;
    }
  };

  const getEditorTheme = () => {
    switch (currentTheme) {
      case 'light': return 'light';
      case 'dark': return 'vs-dark';
      case 'cyber': return 'vs-dark';
      case 'neon': return 'vs-dark';
      case 'ocean': return 'vs-dark';
      case 'forest': return 'vs-dark';
      default: return 'vs-dark';
    }
  };



  // Debug project state (enhanced logging)
  useEffect(() => {
    console.log('🔍 Dashboard Debug Info:');
    console.log('  - User:', user?.email || user?.username || 'Not logged in');
    console.log('  - Projects loading:', projectLoading);
    console.log('  - Projects count:', projects?.length || 0);
    console.log('  - Current project:', currentProject?.name || 'None');
    console.log('  - Projects list:', projects?.map(p => ({ id: p.id, name: p.name, description: p.description })) || []);
    
    // Log if user is authenticated
    console.log('  - Is authenticated:', isAuthenticated);
    console.log('  - Auth loading:', authLoading);
  }, [projectLoading, projects?.length, currentProject?.id, user?.id, isAuthenticated, authLoading]);
  
  return (
    <div className={`dashboard ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Loading State - Only show on initial load */}
      {projectLoading && projects.length === 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading projects...</p>
        </div>
      )}

      {/* Error State */}
      {projectError && (
        <motion.div 
          className="error-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={16} />
          <span>{projectError}</span>
          <button onClick={() => loadProjects()}>Retry</button>
        </motion.div>
      )}

      {/* Save Error */}
      {saveError && (
        <motion.div 
          className="error-banner save-error"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={16} />
          <span>{saveError}</span>
          <button onClick={() => setSaveError('')}>Dismiss</button>
        </motion.div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <motion.div 
            className="logo"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="logo-text">CodeSync</span>
          </motion.div>
          
          <div className="project-info">
            <div className="project-details">
              <div className="project-switcher">
                <motion.button
                  className="project-button"
                  onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="project-main">
                    <Briefcase size={16} />
                    <h2>{currentProject?.name || 'Select Project'}</h2>
                    <ChevronDown size={14} className={`chevron ${showProjectSwitcher ? 'open' : ''}`} />
                  </div>
                  <span className="project-description">{currentProject?.description || 'Choose a project to start coding'}</span>
                </motion.button>

                <AnimatePresence>
                  {showProjectSwitcher && (
                    <motion.div
                      className="project-dropdown"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="project-dropdown-header">
                        <span>Switch Project</span>
                      </div>
                      
                      {projects && projects.length > 0 ? (
                        projects.map(project => (
                          <motion.button
                            key={project.id}
                            className={`project-item ${project.id === currentProject?.id ? 'active' : ''}`}
                            onClick={() => handleProjectSwitch(project)}
                            whileHover={{ x: 4 }}
                          >
                            <div className="project-item-main">
                              {getProjectLanguageIcon(project.language || 'JavaScript')}
                              <div className="project-item-info">
                                <span className="project-item-name">{project.name}</span>
                                <span className="project-item-desc">{project.description}</span>
                              </div>
                            </div>
                            <span className="project-language">{project.language || 'JavaScript'}</span>
                          </motion.button>
                        ))
                      ) : (
                        <div className="no-projects-message">
                          <Briefcase size={24} />
                          <p>No projects yet</p>
                          <p>Create your first project to get started!</p>
                        </div>
                      )}
                      
                      <div className="project-dropdown-divider"></div>
                      
                      <motion.button
                        className="project-item refresh"
                        onClick={forceReloadProjects}
                        whileHover={{ x: 4 }}
                      >
                        <Zap size={16} />
                        <span>Refresh Projects</span>
                      </motion.button>
                      
                      <motion.button
                        className="project-item create-new"
                        onClick={handleCreateNewProject}
                        whileHover={{ x: 4 }}
                      >
                        <Plus size={16} />
                        <span>Create New Project</span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {showProjectSwitcher && (
                  <div 
                    className="project-dropdown-overlay"
                    onClick={() => setShowProjectSwitcher(false)}
                  />
                )}

                {/* Create New Project Modal */}
                <AnimatePresence>
                  {showCreateProject && (
                    <div className="modal-overlay" onClick={() => setShowCreateProject(false)}>
                      <motion.div
                        className="create-project-modal"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="modal-header">
                          <h2>Create New Project</h2>
                          <button 
                            className="modal-close"
                            onClick={() => setShowCreateProject(false)}
                          >
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div className="modal-content">
                          <div className="form-group">
                            <label htmlFor="project-name">Project Name *</label>
                            <input
                              id="project-name"
                              type="text"
                              value={newProjectData.name}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter project name"
                              className="form-input"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="project-description">Description</label>
                            <textarea
                              id="project-description"
                              value={newProjectData.description}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Brief description of your project"
                              className="form-textarea"
                              rows={3}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="project-language">Primary Language</label>
                            <select
                              id="project-language"
                              value={newProjectData.language}
                              onChange={(e) => setNewProjectData(prev => ({ ...prev, language: e.target.value }))}
                              className="form-select"
                            >
                              <option value="JavaScript">JavaScript</option>
                              <option value="TypeScript">TypeScript</option>
                              <option value="Python">Python</option>
                              <option value="Java">Java</option>
                              <option value="C++">C++</option>
                              <option value="HTML">HTML</option>
                              <option value="CSS">CSS</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="modal-footer">
                          <button 
                            className="btn-secondary"
                            onClick={() => setShowCreateProject(false)}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn-primary"
                            onClick={handleCreateProject}
                            disabled={!newProjectData.name.trim()}
                          >
                            Create Project
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <span className="project-status">
              <div className="status-dot"></div>
              Synced
            </span>
          </div>
        </div>
        
        <div className="header-center">
          <div className="toolbar">
            <motion.button 
              className="btn-ghost toolbar-btn"
              onClick={handleRunCode}
              disabled={!activeFile || !code.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={!activeFile ? 'Select a file to run' : 'Run current file'}
            >
              <Play size={18} />
              Run
            </motion.button>
            
            <motion.button 
              className="btn-ghost toolbar-btn"
              onClick={handleSave}
              disabled={isSaving || !currentFile}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSaving ? (
                <div className="loading-spinner small"></div>
              ) : (
                <Save size={18} />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </motion.button>
            
            <motion.button 
              className="btn-ghost toolbar-btn"
              onClick={handleShare}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 size={18} />
              Share
            </motion.button>
            
            {/* Debug button - remove in production */}
            <motion.button 
              className="btn-ghost toolbar-btn"
              onClick={() => {
                console.log('🐛 DEBUG STATE:', {
                  userFileInfoKeysLength: Object.keys(userFileInfo).length,
                  userFileInfoEntries: Object.entries(userFileInfo),
                  userCursorsSize: userCursors.size,
                  userCursorsEntries: Array.from(userCursors.entries()),
                  allConnectedUsersCount: allConnectedUsers.length,
                  allConnectedUsers: allConnectedUsers.map(u => ({
                    id: u.id,
                    isSelf: u.isSelf,
                    fileInfo: u.fileInfo
                  })),
                  sidebarUpdateTrigger,
                  currentUserId: user?.id,
                  activeFile,
                  editorPosition: editorRef.current?.getPosition()
                });
                // Force update sidebar
                setSidebarUpdateTrigger(prev => prev + 1);
                // Force cursor decoration update
                setTimeout(() => {
                  console.log('🎨 DEBUG: Forcing cursor decoration update');
                  updateCursorDecorations();
                }, 10);
                // Force current user cursor position update
                if (editorRef.current && activeFile) {
                  const position = editorRef.current.getPosition();
                  if (position) {
                    console.log('🎯 DEBUG: Forcing cursor position update:', position);
                    handleCursorPositionChange(position);
                  }
                }
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Debug State"
            >
              🐛
            </motion.button>
            
            <motion.button 
              className="btn-ghost toolbar-btn"
              onClick={handleTerminalToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={activeBottomPanel === 'terminal' ? 'Hide Terminal' : 'Show Terminal'}
            >
              <TerminalIcon size={18} />
              Terminal
            </motion.button>
            
            <div className="toolbar-divider"></div>
            
            <select 
              value={currentProject?.language ? mapProjectLanguageToEditor(currentProject.language) : language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-greeting">
            Welcome, <strong>{user?.fullName || user?.name || user?.username || 'User'}</strong>
            {user?.roles && user.roles.length > 0 && (
              <div className="user-role">
                <span className={`role-badge ${user.roles[0].toLowerCase()}`}>
                  {user.roles[0]}
                </span>
              </div>
            )}
          </div>
          
          <div className="connected-users">
            <Users size={18} />
            <span className="user-count">{totalConnectedUsers}</span>
            <div className="user-avatars">
              {allConnectedUsers.slice(0, 5).map(connectedUser => (
                <motion.div
                  key={connectedUser.id}
                  className="user-avatar"
                  style={{ borderColor: connectedUser.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  title={connectedUser.isSelf ? 'You' : (connectedUser.fullName || connectedUser.name)}
                >
                  {(connectedUser.fullName || connectedUser.name)?.charAt(0)}
                </motion.div>
              ))}
              {allConnectedUsers.length > 5 && (
                <div className="user-avatar overflow" title={`+${allConnectedUsers.length - 5} more`}>
                  +{allConnectedUsers.length - 5}
                </div>
              )}
            </div>
          </div>
          
          {/* Temporary debug info */}
          
          <ThemeSwitcher />
          
          <motion.button 
            className="btn-ghost"
            onClick={toggleFullscreen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </motion.button>
          
          <div className="dropdown-container">
            <motion.button 
              className="btn-ghost"
              onClick={() => setShowDropdown(!showDropdown)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreHorizontal size={18} />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  className="dropdown-menu"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <button className="dropdown-item">
                    <User size={16} />
                    Profile
                  </button>
                  <button className="dropdown-item">
                    <Settings size={16} />
                    Settings
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {showDropdown && (
              <div 
                className="dropdown-overlay"
                onClick={() => setShowDropdown(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <h3>Files</h3>
            <div className="file-tree">
              {renderFiles()}
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Online Users</h3>
            <div className="user-list">
              {allConnectedUsers.length === 0 ? (
                <div className="no-users">
                  <span>No users online</span>
                </div>
              ) : (
                allConnectedUsers.map(connectedUser => {
                  const fileInfo = connectedUser.fileInfo;
                  const isCurrentProject = connectedUser.isCurrentProject !== false;
                  
                  // Debug logging for sidebar data
                  if (connectedUser.isSelf) {
                    console.log('🔍 Sidebar rendering current user:', {
                      userId: connectedUser.id,
                      fileInfo,
                      hasFileInfo: !!fileInfo,
                      line: fileInfo?.line,
                      column: fileInfo?.column,
                      fileName: fileInfo?.fileName,
                      sidebarUpdateTrigger,
                      userFileInfoRaw: userFileInfo[connectedUser.id],
                      allConnectedUsersLength: allConnectedUsers.length
                    });
                  }
                  
                  return (
                    <motion.div
                      key={connectedUser.id}
                      className={`user-item ${isCurrentProject ? 'current-project' : 'other-project'}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div 
                        className="user-indicator"
                        style={{ backgroundColor: connectedUser.color || '#3b82f6' }}
                      ></div>
                      <div className="user-info">
                        <div className="user-header">
                          <span className="user-name">
                            {connectedUser.isSelf ? 'You' : (connectedUser.fullName || connectedUser.name || connectedUser.userName || 'Unknown User')}
                          </span>
                          {!isCurrentProject && fileInfo?.projectName && (
                            <span className="user-project">
                              <Briefcase size={10} />
                              {fileInfo.projectName}
                            </span>
                          )}
                        </div>
                        <div className="user-location">
                          {fileInfo?.fileName ? (
                            <>
                              <span className="location-folder">
                                {fileInfo.fileName.includes('/') 
                                  ? fileInfo.fileName.substring(0, fileInfo.fileName.lastIndexOf('/') + 1)
                                  : ''
                                }
                              </span>
                              <span className="location-file">
                                {fileInfo.fileName.includes('/') 
                                  ? fileInfo.fileName.substring(fileInfo.fileName.lastIndexOf('/') + 1)
                                  : fileInfo.fileName
                                }
                              </span>
                              <span className="location-line">:{fileInfo.line || 1}</span>
                              {/* Cursor position display */}
                              <div style={{ 
                                fontSize: '10px', 
                                opacity: 0.8, 
                                marginTop: '2px',
                                color: connectedUser.color,
                                fontWeight: 'bold'
                              }}>
                                Line {fileInfo.line || 1}, Col {fileInfo.column || 1}
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="location-folder">~/</span>
                              <span className="location-file">selecting...</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Editor and Console Container */}
        <div className="editor-console-container">
          {/* Editor */}
          <div className="editor-container">
            <div className="editor-header">
              <div className="file-tabs">
                {openTabs.map(tab => {
                  // Check if tab has unsaved changes
                  const originalFile = files.find(f => f.id === tab.id);
                  const hasUnsavedChanges = originalFile && tab.content !== originalFile.content;
                  
                  return (
                    <div 
                      key={tab.id}
                      className={`file-tab ${activeFile === tab.id ? 'active' : ''} ${hasUnsavedChanges ? 'unsaved' : ''}`}
                      onClick={() => handleTabSelect(tab.id)}
                    >
                      {getFileIcon(tab.name)}
                      <span>{tab.name}</span>
                      {hasUnsavedChanges && <span className="unsaved-indicator">•</span>}
                      <button 
                        className="tab-close"
                        onClick={(e) => handleTabClose(tab.id, e)}
                        title="Close file"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {openTabs.length === 0 && (
                  <div className="no-tabs-message">
                    <span>Select a file from the sidebar to start editing</span>
                  </div>
                )}
              </div>
              
              <div className="editor-actions">
                <motion.button 
                  className="btn-ghost editor-action"
                  onClick={handleCopy}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy size={16} />
                </motion.button>
                <motion.button 
                  className="btn-ghost editor-action"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download size={16} />
                </motion.button>
              </div>
            </div>
            
            <div className="editor-wrapper">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                theme={getEditorTheme()}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                  bracketPairColorization: { enabled: true },
                  guides: {
                    bracketPairs: true,
                    indentation: true
                  },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabCompletion: 'on',
                  quickSuggestions: true,
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  formatOnPaste: true,
                  formatOnType: true
                }}
              />
            </div>
          </div>

          {/* Console/Chat */}
          <ConsoleChat 
            projectId={currentProject?.id}
            userId={user?.id}
            isConnected={isConnected}
            isMinimized={isConsoleMinimized}
            onMinimize={handleConsoleToggle}
            connectedUsers={allConnectedUsers}
          />

          {/* Terminal */}
          <Terminal 
            projectId={currentProject?.id}
            userId={user?.id}
            isConnected={isConnected}
            isMinimized={isTerminalMinimized}
            onMinimize={handleTerminalToggle}
            currentFile={activeFile}
            language={language}
            currentFileContent={code}
            currentFileName={openTabs.find(tab => tab.id === activeFile)?.name}
          />
        </div>
      </main>

      <style jsx>{`
        .dashboard {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .dashboard.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
        }

        .dashboard-loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          color: var(--text-primary);
          gap: 1rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-primary);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Header */
        .dashboard-header {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
          min-height: var(--header-height);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .project-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .project-details {
          position: relative;
        }

        .project-switcher {
          position: relative;
        }

        .project-button {
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 200px;
        }

        .project-button:hover {
          background: var(--bg-tertiary);
        }

        .project-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .project-main h2 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
        }

        .chevron {
          transition: transform var(--transition-fast);
          color: var(--text-tertiary);
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .project-description {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-left: 1.5rem;
        }

        .project-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          min-width: 320px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(10px);
          z-index: 999;
          overflow: hidden;
          padding: 0.5rem;
        }

        .project-dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          z-index: 998;
        }

        .project-dropdown-header {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-primary);
          margin: -0.5rem -0.5rem 0.5rem -0.5rem;
          background: var(--bg-secondary);
        }

        .project-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
          text-align: left;
        }

        .project-item:hover {
          background: var(--accent-light);
          color: var(--accent);
        }

        .project-item.active {
          background: var(--accent-light);
          color: var(--accent);
        }

        .project-item.create-new {
          color: var(--success);
          gap: 0.5rem;
          justify-content: flex-start;
        }

        .project-item.create-new:hover {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }

        .project-item.refresh {
          color: var(--accent);
          gap: 0.5rem;
          justify-content: flex-start;
        }

        .project-item.refresh:hover {
          background: var(--accent-light);
          color: var(--accent);
        }

        .project-item-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .project-item-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .project-item-name {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .project-item-desc {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .project-language {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        .project-dropdown-divider {
          height: 1px;
          background: var(--border-primary);
          margin: 0.5rem 0;
        }

        .project-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .header-center {
          flex: 2;
          display: flex;
          justify-content: center;
        }

        .toolbar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-primary);
        }

        .toolbar-btn {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: var(--border-primary);
          margin: 0 0.5rem;
        }

        .language-select {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          padding: 0.5rem 0.75rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          min-width: 120px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          justify-content: flex-end;
        }

        .dropdown-container {
          position: relative;
        }

        .dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          z-index: 998;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 180px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(10px);
          z-index: 999;
          overflow: hidden;
          padding: 0.5rem;
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
          text-align: left;
        }

        .dropdown-item:hover {
          background: var(--accent-light);
          color: var(--accent);
        }

        .dropdown-item.logout {
          color: var(--error);
        }

        .dropdown-item.logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-primary);
          margin: 0.5rem 0;
        }

        .connected-users {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
        }

        .user-count {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .user-avatars {
          display: flex;
          gap: 0.25rem;
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-avatar.overflow {
          background: var(--bg-tertiary);
          border-color: var(--border-primary);
          font-size: 0.625rem;
          color: var(--text-secondary);
        }

        /* Main Content */
        .dashboard-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* Editor and Console Container */
        .editor-console-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Sidebar */
        .dashboard-sidebar {
          width: 250px;
          min-width: 250px;
          max-width: 250px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-primary);
          padding: 1rem;
          overflow-y: auto;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .sidebar-section {
          margin-bottom: 2rem;
        }

        .sidebar-section h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .file-tree {
          display: flex;
          flex-direction: column;
        }

        .file-tree-item {
          display: flex;
          flex-direction: column;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
          min-height: 28px;
        }

        .file-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .file-item.active {
          background: var(--accent-light);
          color: var(--accent);
        }

        .file-item.folder {
          font-weight: 500;
          color: var(--text-primary);
        }

        .file-item.folder:hover {
          background: var(--bg-tertiary);
        }

        .folder-content {
          overflow: hidden;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        .no-users {
          padding: 1rem;
          text-align: center;
          color: var(--text-tertiary);
          font-size: 0.875rem;
          font-style: italic;
        }

        .user-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          background: var(--bg-tertiary);
          transition: all var(--transition-fast);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .user-item.current-project {
          border-left: 3px solid var(--accent);
        }

        .user-item.other-project {
          opacity: 0.7;
          border-left: 3px solid var(--text-tertiary);
        }

        .user-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        .user-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .user-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
          min-width: 0;
          gap: 0.5rem;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
          max-width: 140px;
        }

        .user-project {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-primary);
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .user-location {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          gap: 0.125rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .location-folder {
          color: var(--text-secondary);
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 0;
        }

        .location-file {
          color: var(--accent);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .location-line {
          color: var(--text-tertiary);
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Editor */
        .editor-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          min-height: 0;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-primary);
          flex-shrink: 0;
        }

        .file-tabs {
          display: flex;
          gap: 0.25rem;
        }

        .file-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          font-size: 0.875rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .file-tab.active {
          background: var(--bg-primary);
          border-bottom-color: var(--bg-primary);
        }

        .tab-close {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 0;
          margin-left: 0.25rem;
          font-size: 1rem;
          line-height: 1;
        }

        .tab-close:hover {
          color: var(--text-primary);
        }

        .editor-actions {
          display: flex;
          gap: 0.25rem;
        }

        .editor-action {
          padding: 0.5rem;
        }

        .editor-wrapper {
          flex: 1;
          background: var(--bg-primary);
          min-height: 0;
        }

        /* Console/Chat */
        .console-panel {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-primary);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          resize: vertical;
          overflow: auto;
          min-height: 200px;
          max-height: 50vh;
          position: relative;
        }

        .console-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 4px;
          background: var(--border-primary);
          border-radius: 2px;
          cursor: ns-resize;
          z-index: 10;
        }

        .console-panel:hover::before {
          background: var(--accent);
        }

        .console-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-primary);
          background: var(--bg-tertiary);
        }

        .console-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .console-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .console-action {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .console-content {
          flex: 1;
          padding: 0.75rem 1rem;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          overflow-y: auto;
          background: var(--bg-primary);
          min-height: 100px;
        }

        .user-item.current-project {
          border-left: 3px solid var(--accent);
        }

        .user-item.other-project {
          opacity: 0.7;
          border-left: 3px solid var(--text-tertiary);
        }

        .user-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
          max-width: 140px;
        }
        .user-project {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--bg-primary);
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .user-location {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          gap: 0.125rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .location-folder {
          color: var(--text-secondary);
          opacity: 0.8;
        }

        .location-file {
          color: var(--accent);
          font-weight: 500;
        }

        .location-line {
          color: var(--text-tertiary);
          font-weight: 500;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .create-project-modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                      0 0 0 1px var(--border-primary),
                      0 0 30px rgba(var(--accent-rgb), 0.2);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1001;
          margin: auto;
        }

        .create-project-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, 
            transparent, 
            var(--accent) 20%, 
            var(--accent) 80%, 
            transparent
          );
          opacity: 0.8;
        }

        .create-project-modal::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            ellipse at top,
            rgba(var(--accent-rgb), 0.03) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border-primary);
          background: var(--bg-primary);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent);
          text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3);
        }

        .modal-close {
          background: transparent;
          border: none;
          color: var(--accent);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .modal-close:hover {
          color: var(--accent-hover);
          background: rgba(var(--accent-rgb), 0.1);
        }

        .modal-content {
          padding: 2rem;
          flex: 1;
          overflow-y: auto;
          background: var(--bg-primary);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--accent);
        }

        .form-input,
        .form-textarea,
        .form-select {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: all var(--transition-fast);
          font-family: inherit;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
          background: var(--bg-primary);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--border-primary);
          background: var(--bg-primary);
        }

        .btn-secondary {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--accent);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-secondary:hover {
          background: rgba(var(--accent-rgb), 0.1);
          border-color: var(--accent-hover);
          color: var(--accent-hover);
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: var(--accent);
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--bg-primary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-hover);
          border-color: var(--accent-hover);
          box-shadow: 0 6px 16px rgba(var(--accent-rgb), 0.4);
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Console Chat Styles */
        .console-panel.minimized {
          height: auto;
        }

        .console-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: var(--bg-primary);
        }

        .console-message {
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          background: var(--bg-tertiary);
        }

        .console-message-system {
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
        }

        .console-message-error {
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
        }

        .console-message-user {
          background: var(--bg-secondary);
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .message-user {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .message-time {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .message-content {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .console-input-form {
          padding: 1rem;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-primary);
        }

        .console-input-wrapper {
          display: flex;
          gap: 0.5rem;
        }

        .console-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .console-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        .console-send-btn {
          padding: 0.5rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .console-send-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .console-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .console-minimize-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .console-minimize-btn:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .console-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }

        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .connection-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--error);
        }

        .connection-indicator.connected .connection-dot {
          background: var(--success);
          animation: pulse 2s infinite;
        }

        .connected-users-count {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        @media (max-width: 1024px) {
          .dashboard-sidebar {
            width: 200px;
          }
          
          .header-center {
            flex: 1;
          }
          
          .toolbar {
            gap: 0.25rem;
          }
          
          .toolbar-btn {
            padding: 0.5rem;
          }
          
          .toolbar-btn span {
            display: none;
          }
          
          .console-tab {
            bottom: 0.5rem;
            right: 0.5rem;
          }
          
          .console-panel {
            min-height: 150px;
            max-height: 40vh;
          }

          .user-location {
            flex-direction: row;
            align-items: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
          }

          .user-name {
            max-width: 120px;
          }

          .user-project {
            max-width: 80px;
            font-size: 0.7rem;
          }

          .project-button {
            min-width: 150px;
          }

          .project-dropdown {
            min-width: 280px;
          }
        }

        @media (max-width: 768px) {
          .dashboard-sidebar {
            display: none;
          }
          
          .console-panel {
            min-height: 120px;
            max-height: 35vh;
          }
          
          .console-content {
            min-height: 60px;
          }
          
          .dashboard-header {
            padding: 0.5rem 1rem;
          }
          
          .header-left .project-info {
            display: none;
          }
          
          .dropdown-menu {
            right: -1rem;
          }
          
          .console-tab {
            font-size: 0.875rem;
            padding: 0.5rem 0.75rem;
          }

          .file-tab {
            max-width: 150px;
            overflow: hidden;
          }

          .file-tab span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .project-dropdown {
            min-width: 260px;
            left: -50px;
          }
        }

        /* New File Button */
        .create-file-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem;
          background: var(--bg-hover);
          border: 1px dashed var(--border-primary);
          border-radius: 0.375rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-bottom: 0.75rem;
        }

        .create-file-btn:hover {
          background: var(--bg-secondary);
          border-color: var(--accent);
          color: var(--accent);
        }

        /* File Context Menu */
        .file-context-menu {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 0.5rem;
          box-shadow: var(--shadow-lg);
          padding: 0.5rem;
          min-width: 150px;
        }

        .context-menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem;
          background: transparent;
          border: none;
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .context-menu-item:hover {
          background: var(--bg-hover);
        }

        .context-menu-item.delete {
          color: var(--error);
        }

        .context-menu-item.delete:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* Create File Modal */
        .create-file-modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 0.75rem;
          padding: 1.5rem;
          width: 90%;
          max-width: 400px;
          box-shadow: var(--shadow-xl);
        }

        .create-file-modal h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.125rem;
          font-weight: 600;
        }

        .create-file-modal input {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 0.5rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .create-file-modal input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .modal-actions button {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .modal-actions button:first-child {
          background: var(--bg-primary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
        }

        .modal-actions button:first-child:hover {
          background: var(--bg-hover);
        }

        .modal-actions button:last-child {
          background: var(--accent);
          color: white;
        }

        .modal-actions button:last-child:hover {
          background: var(--accent-hover);
        }

        .modal-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Enhanced File Tabs */
        .file-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          min-width: 0;
          max-width: 200px;
        }

        .file-tab span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-tab.active {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border-color: var(--accent);
        }

        .file-tab.unsaved {
          font-style: italic;
        }

        .file-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .unsaved-indicator {
          color: var(--accent);
          font-weight: bold;
          margin-left: 0.25rem;
          margin-right: 0.25rem;
        }

        .tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: transparent;
          border: none;
          border-radius: 0.25rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .tab-close:hover {
          background: var(--bg-hover);
          color: var(--error);
        }

        .no-tabs-message {
          padding: 0.75rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
          text-align: center;
        }

        /* Project Switcher Fix */
        .project-button {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-primary);
          text-align: left;
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: all var(--transition-fast);
        }

        .project-button:hover {
          background: var(--bg-hover);
        }

        .project-item {
          background: transparent;
          border: none;
          cursor: pointer;
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.375rem;
          transition: all var(--transition-fast);
          text-align: left;
        }

        .project-item:hover {
          background: var(--bg-hover);
        }

        .project-item.active {
          background: var(--accent);
          color: white;
        }

        /* Save Toast Notification */
        .save-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--accent);
          color: var(--bg-primary);
          border: 1px solid var(--accent-hover);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 10000;
          pointer-events: none;
          backdrop-filter: blur(10px);
        }

        /* Remote Update Toast Notification */
        .remote-update-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: 1px solid #059669;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 10000;
          pointer-events: none;
          backdrop-filter: blur(10px);
          max-width: 300px;
          animation: slideInBounce 0.5s ease-out;
        }

        @keyframes slideInBounce {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          60% {
            opacity: 1;
            transform: translateY(-5px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .save-toast,
          .remote-update-toast {
            bottom: 5rem;
            right: 1rem;
            max-width: 280px;
          }
        }

        /* Bottom Panel Positioning Fix */
        .editor-console-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Ensure Terminal and Chat don't overlap */
        .terminal-panel {
          z-index: 5;
        }

        .console-panel {
          z-index: 10;
        }

        /* Fix Chat button positioning to avoid Terminal overlap */
        .console-tab {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 20;
        }

        /* When Terminal is expanded, move Chat button up */
        .terminal-panel:not(.minimized) ~ .console-tab {
          bottom: 22rem;
        }
      `}</style>

      {/* Save Toast Notification */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            className="save-toast"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Save size={16} />
            <span>File saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote Update Toast Notification */}
      <AnimatePresence>
        {showRemoteUpdateToast && remoteUpdateInfo && (
          <motion.div
            className="remote-update-toast"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Users size={16} />
            <span>
              {remoteUpdateInfo.fileName} updated by {remoteUpdateInfo.userName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
