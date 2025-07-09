import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { projectAPI, fileAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track if initial load has been done to prevent duplicate calls
  const initialLoadDone = useRef(false);

  // Load user projects when authenticated
  useEffect(() => {
    if (isAuthenticated && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadProjects();
    } else if (!isAuthenticated) {
      // Clear data when not authenticated
      initialLoadDone.current = false;
      setProjects([]);
      setCurrentProject(null);
      setProjectFiles([]);
      setCurrentFile(null);
    }
  }, [isAuthenticated]);

  // Load project files when current project changes
  useEffect(() => {
    if (currentProject) {
      loadProjectFiles(currentProject.id);
    } else {
      setProjectFiles([]);
      setCurrentFile(null);
    }
  }, [currentProject]);

  const loadProjects = async (preserveCurrentProject = false) => {
    // Prevent duplicate calls
    if (isLoading) {
      console.log('📂 Already loading projects, skipping...');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📂 Loading projects from API...');
      const response = await projectAPI.getUserProjects();
      console.log('📂 API response:', response);
      
      if (response.success) {
        const projects = response.data || [];
        console.log('📂 Projects loaded successfully:', projects);
        console.log('📂 Number of projects:', projects.length);
        console.log('📂 Project details:', projects.map(p => ({ id: p.id, name: p.name, description: p.description })));
        setProjects(projects);
        
        // If current project is no longer in the list, clear it
        if (currentProject && !projects.find(p => p.id === currentProject.id)) {
          console.log('📂 Current project no longer accessible, clearing...');
          setCurrentProject(null);
          setProjectFiles([]);
          setCurrentFile(null);
        }
        
        // Only auto-select first project if no current project AND we're not preserving current selection
        if (!currentProject && projects.length > 0 && !preserveCurrentProject) {
          console.log('📂 Setting first project as current:', projects[0]);
          setCurrentProject(projects[0]);
        }
      } else {
        const errorMsg = response.message || 'Failed to load projects';
        console.error('📂 Failed to load projects:', errorMsg);
        setError(errorMsg);
        setProjects([]);
      }
    } catch (error) {
      console.error('📂 Error loading projects:', error);
      setError(error.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectFiles = async (projectId) => {
    try {
      setIsLoading(true);
      
      console.log('📄 Loading files for project:', projectId);
      const response = await fileAPI.getProjectFiles(projectId);
      console.log('📄 Files API response:', response);
      
      if (response.success) {
        const files = response.data || [];
        console.log('📄 Files loaded successfully:', files);
        setProjectFiles(files);
        
        // If no current file but files exist, select first one
        if (!currentFile && files.length > 0) {
          console.log('📄 Setting first file as current:', files[0]);
          setCurrentFile(files[0]);
        }
      } else {
        const errorMsg = response.message || 'Failed to load project files';
        console.error('📄 Failed to load files:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('📄 Error loading project files:', error);
      setError(error.message || 'Failed to load project files');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (projectData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await projectAPI.createProject(projectData);
      
      if (response.success) {
        const newProject = response.data;
        setProjects(prev => [...prev, newProject]);
        setCurrentProject(newProject);
        return { success: true, data: newProject };
      } else {
        setError(response.message || 'Failed to create project');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error.message || 'Failed to create project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await projectAPI.deleteProject(projectId);
      
      if (response.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        // If deleted project was current, clear it
        if (currentProject && currentProject.id === projectId) {
          setCurrentProject(null);
        }
        
        return { success: true };
      } else {
        setError(response.message || 'Failed to delete project');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      const errorMessage = error.message || 'Failed to delete project';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const createFile = async (fileData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Make sure projectId is included in the fileData
      const fileDataWithProject = {
        ...fileData,
        projectId: fileData.projectId || currentProject?.id
      };
      
      const response = await fileAPI.createFile(fileDataWithProject);
      
      if (response.success) {
        const newFile = response.data;
        setProjectFiles(prev => [...prev, newFile]);
        setCurrentFile(newFile);
        return { success: true, data: newFile };
      } else {
        setError(response.message || 'Failed to create file');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error creating file:', error);
      const errorMessage = error.message || 'Failed to create file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const updateFile = async (fileId, updateData) => {
    try {
      const response = await fileAPI.updateFile(fileId, updateData);
      
      if (response.success) {
        const updatedFile = response.data;
        
        // Update in project files list
        setProjectFiles(prev => 
          prev.map(file => file.id === fileId ? updatedFile : file)
        );
        
        // Update current file if it's the one being updated
        if (currentFile && currentFile.id === fileId) {
          setCurrentFile(updatedFile);
        }
        
        return { success: true, data: updatedFile };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error updating file:', error);
      return { success: false, error: error.message || 'Failed to update file' };
    }
  };

  const deleteFile = async (fileId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fileAPI.deleteFile(fileId);
      
      if (response.success) {
        setProjectFiles(prev => prev.filter(f => f.id !== fileId));
        
        // If deleted file was current, clear it
        if (currentFile && currentFile.id === fileId) {
          setCurrentFile(null);
        }
        
        return { success: true };
      } else {
        setError(response.message || 'Failed to delete file');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      const errorMessage = error.message || 'Failed to delete file';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const switchProject = async (project) => {
    setCurrentProject(project);
    setCurrentFile(null); // Clear current file when switching projects
  };

  const switchFile = (file) => {
    setCurrentFile(file);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    projects,
    currentProject,
    setCurrentProject,
    projectFiles,
    currentFile,
    isLoading,
    error,
    loadProjects,
    loadProjectFiles,
    createProject,
    deleteProject,
    createFile,
    updateFile,
    deleteFile,
    switchProject,
    switchFile,
    clearError
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
