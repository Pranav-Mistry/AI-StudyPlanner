import React from 'react';

const Card = ({ children, className = '', hover = false }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-lg p-6 ${hover ? 'card-hover' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
