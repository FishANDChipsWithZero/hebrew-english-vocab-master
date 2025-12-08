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
      className={`btn-back-gaming ${small ? 'btn-back-gaming--small' : ''} ${className || ''}`}
      aria-label={typeof children === 'string' ? `${title} ${children}` : title}
    >
      <span className="hidden sm:inline">{children || title}</span>
      <span className="icon" aria-hidden="true">
        {/* Inline SVG arrow in blue rounded square */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
          <rect x="0" y="0" width="24" height="24" rx="5" fill="#69C8FF" />
          <path d="M15 7L10 12L15 17" stroke="#042033" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
};

export default BackButton;
