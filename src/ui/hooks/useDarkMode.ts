import { useState, useEffect, useCallback } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDarkMode = async () => {
      try {
        const result = await window.electronAPI.getSetting('darkMode');
        if (result.success && result.data !== null) {
          setIsDarkMode(result.data === 'true');
        }
      } catch (err) {
        console.error('Failed to load dark mode setting:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDarkMode();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, isLoading]);

  const toggleDarkMode = useCallback(async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await window.electronAPI.setSetting('darkMode', String(newValue));
    } catch (err) {
      console.error('Failed to save dark mode setting:', err);
    }
  }, [isDarkMode]);

  return { isDarkMode, toggleDarkMode, isLoading };
}
