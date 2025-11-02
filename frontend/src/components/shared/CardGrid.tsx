import React from 'react';

export interface CardGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    largeDesktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CardGrid: React.FC<CardGridProps> = ({
  children,
  columns = {
    mobile: 1,
    tablet: 1,
    desktop: 1,
    largeDesktop: 1
  },
  gap = 'md',
  className = ''
}) => {
  const gapClass = {
    sm: 'gap-0.5',
    md: 'gap-0.5',
    lg: 'gap-1'
  }[gap];

  // Immer 1 Spalte für bessere Übersichtlichkeit - Cards nehmen volle Breite ein
  return (
    <div 
      className={`flex flex-col ${gapClass} ${className}`}
    >
      {children}
    </div>
  );
};

export default CardGrid;

