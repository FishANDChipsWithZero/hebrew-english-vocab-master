import React from 'react';

interface BackButtonProps {
  onClick?: () => void;
  title?: string;
  small?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick, title = 'חזור', small = true, children, className }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg text-2xl opacity-60 hover:opacity-100 transition-opacity font-bold ${className || ''}`}
      aria-label={typeof children === 'string' ? `${title} ${children}` : title}
    >
      ×
    </button>
  );
};

export default BackButton;
