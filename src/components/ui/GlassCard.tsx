import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: string; // Optional custom top glowing border color variable
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  glowColor, 
  className = '', 
  style = {},
  ...props 
}) => {
  const cardStyle: React.CSSProperties = {
    ...style,
    ...(glowColor ? { '--card-border-color': glowColor } as React.CSSProperties : {})
  };

  return (
    <div 
      className={`glass-panel stat-card ${className}`} 
      style={cardStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
