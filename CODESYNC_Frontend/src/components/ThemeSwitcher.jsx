import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Palette, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { currentTheme, changeTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeName) => {
    changeTheme(themeName);
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher">
      <motion.button
        className="theme-trigger"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Palette size={20} />
        <span className="theme-name">{themes[currentTheme].name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="theme-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="theme-header">
              <Palette size={16} />
              <span>Choose Theme</span>
            </div>
            
            <div className="theme-grid">
              {Object.entries(themes).map(([key, theme]) => (
                <motion.button
                  key={key}
                  className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                  onClick={() => handleThemeChange(key)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-theme={key}
                >
                  <div className="theme-preview">
                    <span className="theme-icon">{theme.icon}</span>
                    <div className="theme-colors">
                      <div className="color-bar bg-primary"></div>
                      <div className="color-bar bg-secondary"></div>
                      <div className="color-bar accent"></div>
                    </div>
                  </div>
                  
                  <div className="theme-info">
                    <div className="theme-title">
                      {theme.name}
                      {currentTheme === key && (
                        <motion.div
                          className="check-icon"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                        >
                          <Check size={14} />
                        </motion.div>
                      )}
                    </div>
                    <div className="theme-description">{theme.description}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div 
          className="theme-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <style jsx>{`
        .theme-switcher {
          position: relative;
          z-index: 1000;
        }

        .theme-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .theme-trigger:hover {
          background: var(--bg-tertiary);
          border-color: var(--accent);
          box-shadow: var(--shadow-md);
        }

        .theme-name {
          min-width: 60px;
          text-align: left;
        }

        .theme-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          z-index: 999;
        }

        .theme-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 320px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(10px);
          z-index: 1001;
          overflow: hidden;
        }

        .theme-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-primary);
          font-weight: 600;
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .theme-grid {
          padding: 0.5rem;
          display: grid;
          gap: 0.5rem;
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: transparent;
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
          position: relative;
        }

        .theme-option:hover {
          background: var(--accent-light);
          border-color: var(--accent);
          transform: translateX(2px);
        }

        .theme-option.active {
          background: var(--accent-light);
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .theme-preview {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .theme-icon {
          font-size: 1.5rem;
          line-height: 1;
        }

        .theme-colors {
          display: flex;
          gap: 2px;
          width: 24px;
        }

        .color-bar {
          width: 6px;
          height: 24px;
          border-radius: 1px;
        }

        .color-bar.bg-primary {
          background: var(--bg-primary);
          border: 1px solid var(--border-secondary);
        }

        .color-bar.bg-secondary {
          background: var(--bg-secondary);
        }

        .color-bar.accent {
          background: var(--accent);
        }

        .theme-info {
          flex: 1;
          min-width: 0;
        }

        .theme-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .check-icon {
          color: var(--accent);
          display: flex;
          align-items: center;
        }

        .theme-description {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          line-height: 1.3;
        }

        @media (max-width: 768px) {
          .theme-dropdown {
            min-width: 280px;
            right: -1rem;
          }
          
          .theme-name {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ThemeSwitcher;
