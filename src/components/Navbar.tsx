import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/components.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Generate breadcrumbs from route path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter((p) => p && p !== 'edit');
    if (paths.length === 0) {
      return [{ label: 'Dashboard', path: '/dashboard', active: true }];
    }

    const breadcrumbs = [{ label: 'Dashboard', path: '/dashboard', active: false }];

    if (paths[0] === 'test') {
      breadcrumbs.push({ label: 'Test Creation', path: '/dashboard', active: false });
      if (paths[1] === 'create') {
        breadcrumbs.push({ label: 'Create Test', path: '/test/create', active: true });
      } else if (paths[1] === 'questions' || paths[2] === 'questions') {
        breadcrumbs.push({ label: 'Add Questions', path: '#', active: true });
      } else if (paths[1] === 'preview' || paths[2] === 'preview') {
        breadcrumbs.push({ label: 'Preview & Publish', path: '#', active: true });
      } else {
        breadcrumbs.push({ label: 'Edit Test', path: '#', active: true });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="navbar">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
            {crumb.active ? (
              <span className="breadcrumb-item active">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="breadcrumb-item">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="navbar-actions">
        <div className="nav-notification" title="Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </div>

        <div className="profile-dropdown">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100"
            alt="Alex Wando"
            className="profile-img"
          />
          <div className="profile-info">
            <span className="profile-name">{user?.name || 'Alex Wando'}</span>
            <span className="profile-role">{user?.role || 'Admin'}</span>
          </div>
        </div>

        <button onClick={logout} className="nav-notification" title="Log Out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
