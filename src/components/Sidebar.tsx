import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  CheckSquare,
  Users,
  Building,
  UserCheck,
  FolderOpen,
  DollarSign,
  Hourglass,
  MessageSquare,
  Bell,
  Settings,
} from 'lucide-react';
import '../styles/components.css';

const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <FileText size={20} />, label: 'Test Creation', path: '/test/create' },
    { icon: <HelpCircle size={20} />, label: 'Help Centre', path: '#' },
    { icon: <CheckSquare size={20} />, label: 'Tasks', path: '#' },
    { icon: <Users size={20} />, label: 'Students', path: '#' },
    { icon: <Building size={20} />, label: 'Institutes', path: '#' },
    { icon: <UserCheck size={20} />, label: 'Moderators', path: '#' },
    { icon: <FolderOpen size={20} />, label: 'Repository', path: '#' },
    { icon: <DollarSign size={20} />, label: 'Pricing', path: '#' },
    { icon: <Hourglass size={20} />, label: 'Schedules', path: '#' },
    { icon: <MessageSquare size={20} />, label: 'Discussions', path: '#' },
    { icon: <Bell size={20} />, label: 'Notifications', path: '#' },
    { icon: <Settings size={20} />, label: 'Settings', path: '#' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">P</div>
        <span className="logo-text">PrepRoute</span>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-item ${isActive && item.path !== '#' ? 'active' : ''}`
            }
            onClick={(e) => {
              if (item.path === '#') {
                e.preventDefault();
              }
            }}
            title={item.label}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
