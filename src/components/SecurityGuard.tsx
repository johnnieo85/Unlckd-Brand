import React, { useEffect } from 'react';

/**
 * SecurityGuard Component
 * Implements basic client-side deterrents to prevent unauthorized inspection
 * and copying of the application structure.
 */
export const SecurityGuard: React.FC = () => {
  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable DevTools and Security-related Keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+I (Chrome, Firefox, Safari)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+C (Inspect)
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+S (Save Page)
      if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Clear Console on Load and set a proprietary warning
    console.clear();
    console.log(
      "%c UNLCKD PRO TRAINER - PROTECTED CONTENT ",
      "background: #10B981; color: white; font-size: 20px; font-weight: bold; padding: 10px;"
    );
    console.log(
      "%c This application and its structure are proprietary. Unauthorized attempts to copy or reverse-engineer this platform are strictly prohibited. ",
      "color: #888; font-style: italic; font-size: 12px;"
    );

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null; // This component doesn't render anything visible
};
