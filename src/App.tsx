import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateEditTest from './pages/CreateEditTest';
import AddQuestions from './pages/AddQuestions';
import PreviewPublish from './pages/PreviewPublish';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import './styles/components.css';

// Guard for authenticated pages
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Guard for login page (redirects to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

// Standard Admin Layout shell for authenticated dashboard pages
const AdminLayoutShell: React.FC = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="create" element={<CreateEditTest />} />
            <Route path="edit/:id" element={<CreateEditTest />} />
            <Route path=":id/questions" element={<AddQuestions />} />
            <Route path="preview/:id" element={<PreviewPublish />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Authenticated Admin Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <div className="admin-layout">
                  <Sidebar />
                  <div className="main-content">
                    <Navbar />
                    <Dashboard />
                  </div>
                </div>
              </PrivateRoute>
            }
          />

          <Route
            path="/test/*"
            element={
              <PrivateRoute>
                <AdminLayoutShell />
              </PrivateRoute>
            }
          />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
