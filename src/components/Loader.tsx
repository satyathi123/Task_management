import React from 'react';
import '../styles/components.css';

const Loader: React.FC = () => {
  return (
    <div className="loader-container" role="status">
      <div className="spinner"></div>
    </div>
  );
};

export default Loader;
