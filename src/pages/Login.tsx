import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import '../styles/components.css';

const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    // Clear any stale token before login attempt
    localStorage.removeItem('preproute_token');
    localStorage.removeItem('preproute_user');

    try {
      const response = await authService.login(userId, password);

      // API may return { status: "success", data: [...] } or { success: true, data: {...} }
      const isSuccess =
        response.success === true ||
        response.status === 'success' ||
        response.message?.toLowerCase().includes('success');

      // data can be an array [{token, user}] or object {token, user}
      const dataObj = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const token = dataObj?.token || response.token;

      if (isSuccess && token) {
        login(token, {
          userId: userId,
          name: dataObj?.user?.name || dataObj?.name || 'Admin',
          role: dataObj?.user?.role || dataObj?.role || 'Admin',
        });
        navigate('/dashboard');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Failed to login. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container flex fade-in" style={{ minHeight: '100vh', width: '100vw' }}>
      {/* Left panel - SVG illustration and branding */}
      <div
        className="login-left flex flex-column items-center justify-between"
        style={{
          flex: 1,
          backgroundColor: '#f3f6fc',
          padding: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}>
          {/* Custom SVG Robot illustration matching Figma */}
          <svg
            viewBox="0 0 400 400"
            width="100%"
            height="auto"
            style={{ marginBottom: '2rem' }}
          >
            <rect width="400" height="400" rx="20" fill="#f3f6fc" />
            {/* Table */}
            <line x1="50" y1="280" x2="350" y2="280" stroke="#708090" strokeWidth="4" strokeLinecap="round" />
            <line x1="80" y1="280" x2="80" y2="380" stroke="#708090" strokeWidth="4" />
            <line x1="320" y1="280" x2="320" y2="380" stroke="#708090" strokeWidth="4" />
            {/* Laptop */}
            <polygon points="120,270 200,270 220,280 100,280" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
            <rect x="130" y="220" width="60" height="50" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            <path d="M 130 220 L 190 220" stroke="#94a3b8" strokeWidth="2" />
            {/* Robot Base/Body */}
            <rect x="230" y="160" width="40" height="120" rx="20" fill="white" stroke="#3b82f6" strokeWidth="3" />
            <rect x="240" y="180" width="20" height="80" rx="10" fill="#eff6ff" />
            <line x1="230" y1="200" x2="210" y2="210" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="210" cy="210" r="4" fill="#3b82f6" />
            {/* Robot Head */}
            <rect x="225" y="100" width="50" height="50" rx="10" fill="white" stroke="#3b82f6" strokeWidth="3" />
            {/* Robot Eyes */}
            <circle cx="240" cy="120" r="4" fill="#1e3a8a" />
            <circle cx="260" cy="120" r="4" fill="#1e3a8a" />
            <path d="M 245 135 Q 250 140 255 135" stroke="#1e3a8a" strokeWidth="2" fill="none" />
            {/* Graduation Cap */}
            <polygon points="250,75 220,85 250,95 280,85" fill="#1e293b" />
            <rect x="242" y="85" width="16" height="10" fill="#1e293b" />
            <line x1="280" y1="85" x2="290" y2="105" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="290" cy="105" r="3" fill="#f59e0b" />
            {/* Sparkles / Details */}
            <path d="M 90 180 L 100 190 M 100 180 L 90 190" stroke="#f59e0b" strokeWidth="2" />
            <path d="M 330 230 L 340 240 M 340 230 L 330 240" stroke="#f59e0b" strokeWidth="2" />
          </svg>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Elevate Learning with PrepRoute
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage assessments, design comprehensive curricula, and track student success in real-time.
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div
        className="login-right flex items-center justify-center"
        style={{
          flex: 1,
          backgroundColor: 'white',
          padding: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
              <div className="logo-icon">P</div>
              <h1 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.8rem', color: 'var(--primary-color)' }}>
                PrepRoute
              </h1>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Login</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Use your company provided login details
            </p>
          </div>

          {error && (
            <div
              className="badge badge-danger"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                borderRadius: 'var(--radius-md)',
                justifyContent: 'flex-start',
                textAlign: 'left',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="login_form">
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="userId" className="form-label">User ID</label>
              <input
                type="text"
                id="userId"
                className="form-input"
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}>
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
              disabled={loading}
              id="login_btn"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
