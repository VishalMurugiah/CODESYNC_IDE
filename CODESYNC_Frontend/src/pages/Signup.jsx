import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Github, Chrome, Check, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

const Signup = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setApiError('');
    
    try {
      await register({
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      
      // Navigation will be handled by the useEffect hook when isAuthenticated changes
    } catch (error) {
      setApiError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '' };
    
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    
    strength = checks.filter(Boolean).length;
    
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
    
    return { 
      strength, 
      label: labels[strength], 
      color: colors[strength],
      checks 
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-grid"></div>
        <div className="auth-glow"></div>
      </div>

      <header className="auth-header">
        <motion.div 
          className="logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="logo-text">CodeSync</span>
        </motion.div>
        <ThemeSwitcher />
      </header>

      <main className="auth-main">
        <motion.div 
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="auth-card-header">
            <h1>Create your account</h1>
            <p>Join CodeSync and start collaborating</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={errors.name ? 'error' : ''}
                />
              </div>
              {errors.name && (
                <motion.span 
                  className="error-message"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.name}
                </motion.span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                />
              </div>
              {errors.email && (
                <motion.span 
                  className="error-message"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.email}
                </motion.span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className={errors.password ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {formData.password && (
                <motion.div 
                  className="password-strength"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${(passwordStrength.strength / 5) * 100}%`,
                        backgroundColor: passwordStrength.color 
                      }}
                    />
                  </div>
                  <span 
                    className="strength-label"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                  
                  <div className="password-requirements">
                    <div className={`requirement ${passwordStrength.checks[0] ? 'met' : ''}`}>
                      <Check size={12} />
                      At least 8 characters
                    </div>
                    <div className={`requirement ${passwordStrength.checks[1] ? 'met' : ''}`}>
                      <Check size={12} />
                      One uppercase letter
                    </div>
                    <div className={`requirement ${passwordStrength.checks[2] ? 'met' : ''}`}>
                      <Check size={12} />
                      One lowercase letter
                    </div>
                    <div className={`requirement ${passwordStrength.checks[3] ? 'met' : ''}`}>
                      <Check size={12} />
                      One number
                    </div>
                  </div>
                </motion.div>
              )}
              
              {errors.password && (
                <motion.span 
                  className="error-message"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.password}
                </motion.span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? 'error' : ''}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <motion.span 
                  className="error-message"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.confirmPassword}
                </motion.span>
              )}
            </div>

            <div className="terms-wrapper">
              <label className="checkbox-wrapper">
                <input type="checkbox" required />
                <span className="checkmark"></span>
                I agree to the{' '}
                <Link to="/terms" className="terms-link">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="terms-link">Privacy Policy</Link>
              </label>
            </div>

            {apiError && (
              <motion.div 
                className="api-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle size={16} />
                <span>{apiError}</span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="btn-primary auth-submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  Create account
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">
            <motion.button 
              className="btn-secondary social-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Github size={20} />
              GitHub
            </motion.button>
            <motion.button 
              className="btn-secondary social-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Chrome size={20} />
              Google
            </motion.button>
          </div>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </div>
        </motion.div>
      </main>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .auth-background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          overflow: hidden;
        }

        .auth-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(var(--accent-rgb), 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(var(--accent-rgb), 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        .auth-glow {
          position: absolute;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(var(--accent-rgb), 0.15) 0%, transparent 70%);
          border-radius: 50%;
          animation: glow 4s ease-in-out infinite alternate;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        @keyframes glow {
          0% { transform: translateX(-50%) scale(1); opacity: 0.5; }
          100% { transform: translateX(-50%) scale(1.1); opacity: 0.8; }
        }

        .auth-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: var(--bg-overlay);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-primary);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: var(--font-primary);
        }

        .auth-main {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }

        .auth-card {
          width: 100%;
          max-width: 450px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-2xl);
          padding: 2rem;
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(10px);
        }

        .auth-card-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-card-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .auth-card-header p {
          color: var(--text-secondary);
          font-size: 1rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-tertiary);
          z-index: 1;
        }

        .input-wrapper input {
          padding-left: 3rem;
          padding-right: 3rem;
        }

        .input-wrapper input.error {
          border-color: var(--error);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .password-toggle:hover {
          color: var(--accent);
        }

        .error-message {
          color: var(--error);
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .password-strength {
          margin-top: 0.75rem;
        }

        .strength-bar {
          height: 4px;
          background: var(--border-primary);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .strength-fill {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
          border-radius: 2px;
        }

        .strength-label {
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          display: block;
        }

        .password-requirements {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.25rem;
          font-size: 0.75rem;
        }

        .requirement {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-tertiary);
          transition: color 0.3s ease;
        }

        .requirement.met {
          color: var(--success);
        }

        .requirement svg {
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .requirement.met svg {
          opacity: 1;
        }

        .terms-wrapper {
          margin: 0.5rem 0;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .checkbox-wrapper input {
          width: auto;
          margin: 0;
          margin-top: 0.2rem;
        }

        .terms-link {
          color: var(--accent);
          font-weight: 500;
        }

        .terms-link:hover {
          color: var(--accent-hover);
        }

        .auth-submit {
          width: 100%;
          font-size: 1rem;
          font-weight: 600;
          padding: 0.875rem 1.5rem;
          margin-top: 0.5rem;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--text-inverse);
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .auth-divider {
          position: relative;
          text-align: center;
          margin: 2rem 0;
          color: var(--text-tertiary);
          font-size: 0.875rem;
        }

        .auth-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--border-primary);
        }

        .auth-divider span {
          background: var(--bg-elevated);
          padding: 0 1rem;
        }

        .social-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .social-btn {
          justify-content: center;
          font-weight: 500;
        }

        .auth-footer {
          text-align: center;
          margin-top: 2rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .auth-link {
          color: var(--accent);
          font-weight: 600;
        }

        .auth-link:hover {
          color: var(--accent-hover);
        }

        @media (max-width: 768px) {
          .auth-header {
            padding: 1rem;
          }
          
          .auth-main {
            padding: 1rem;
          }
          
          .auth-card {
            padding: 1.5rem;
          }
          
          .social-buttons {
            grid-template-columns: 1fr;
          }
          
          .password-requirements {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Signup;
