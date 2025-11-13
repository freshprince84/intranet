import React, { useEffect, useState } from 'react';

interface OnboardingOverlayProps {
  target?: string; // CSS-Selector für zu highlightendes Element
  isActive: boolean;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ target, isActive }) => {
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const [maskId] = useState(() => `onboarding-mask-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!isActive || !target) {
      setElementRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setElementRect(rect);
      } else {
        setElementRect(null);
      }
    };

    // Initiale Position
    updateRect();

    // Update bei Scroll und Resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    // Intersection Observer für bessere Performance
    const element = document.querySelector(target);
    if (element) {
      const observer = new IntersectionObserver(
        () => updateRect(),
        { threshold: 0 }
      );
      observer.observe(element);

      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [target, isActive]);

  if (!isActive || !target || !elementRect) {
    return null;
  }

  return (
    <>
      {/* Dunkles Overlay über gesamte Seite */}
      <div className="fixed inset-0 z-40 bg-black/50" />

      {/* SVG-Mask für Spotlight-Effekt */}
      <svg className="fixed inset-0 z-40 pointer-events-none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <mask id={maskId}>
            {/* Schwarzer Hintergrund (alles abdecken) */}
            <rect width="100%" height="100%" fill="black" />
            {/* Weißes Rechteck für Spotlight (Element sichtbar machen) */}
            <rect
              x={elementRect.left}
              y={elementRect.top}
              width={elementRect.width}
              height={elementRect.height}
              fill="white"
              rx="8"
            />
          </mask>
        </defs>
        {/* Overlay mit Mask */}
        <rect
          width="100%"
          height="100%"
          fill="black"
          opacity="0.5"
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* Border um Ziel-Element */}
      <div
        className="fixed z-50 border-4 border-blue-500 rounded-lg pointer-events-none transition-all duration-200"
        style={{
          left: `${elementRect.left - 4}px`,
          top: `${elementRect.top - 4}px`,
          width: `${elementRect.width + 8}px`,
          height: `${elementRect.height + 8}px`,
        }}
      />
    </>
  );
};

export default OnboardingOverlay;

