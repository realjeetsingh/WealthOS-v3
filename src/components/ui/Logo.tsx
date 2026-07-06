import React from 'react';

interface LogoProps {
  size?: number | string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 32, className = "" }) => {
  return (
    <img
      src="/logo.png"
      alt="WealthOS Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};

export default Logo;
