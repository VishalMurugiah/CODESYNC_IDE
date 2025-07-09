import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    name: 'Light',
    icon: '☀️',
    description: 'Clean and bright interface'
  },
  dark: {
    name: 'Dark', 
    icon: '🌙',
    description: 'Easy on the eyes'
  },
  cyber: {
    name: 'Cyber',
    icon: '🤖',
    description: 'Green-on-black hacker aesthetic'
  },
  neon: {
    name: 'Neon',
    icon: '💜',
    description: 'Vibrant purple cyberpunk vibes'
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    description: 'Cool teal underwater theme'
  },
  forest: {
    name: 'Forest',
    icon: '🌲',
    description: 'Natural green woodland feel'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('codesync-theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('codesync-theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    currentTheme,
    changeTheme,
    themes,
    themeData: themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
