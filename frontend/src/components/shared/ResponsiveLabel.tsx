import React from 'react';

export interface ResponsiveLabelProps {
  long: string;      // Vollständiger Text für Desktop
  short?: string;    // Kurzer Text für Mobile (optional, wird automatisch generiert)
  className?: string;
}

/**
 * ResponsiveLabel-Komponente
 * 
 * Zeigt auf Desktop den vollständigen Text, auf Mobile einen kurzen Text.
 * Eliminiert doppelte Label-Definitionen mit `hidden sm:inline` / `inline sm:hidden` Pattern.
 * 
 * @example
 * <ResponsiveLabel long={t('tasks.columns.responsible')} />
 * <ResponsiveLabel long={t('tasks.columns.responsible')} short="Ver." />
 */
const ResponsiveLabel: React.FC<ResponsiveLabelProps> = ({ 
  long, 
  short, 
  className = '' 
}) => {
  // Automatische Short-Text-Generierung: Erste 3-5 Zeichen
  const shortText = short || long.substring(0, 5);
  
  return (
    <>
      <span className={`hidden sm:inline ${className}`}>{long}</span>
      <span className={`inline sm:hidden ${className}`}>{shortText}</span>
    </>
  );
};

export default ResponsiveLabel;
