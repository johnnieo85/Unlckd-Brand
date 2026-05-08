import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

export function downloadFile(filename: string, content: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const safeStorage = {
  get: (key: string, type: 'local' | 'session' = 'local') => {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage;
      return storage.getItem(key);
    } catch (e) {
      console.warn(`SafeStorage: Access denied for ${type}Storage.getItem(${key})`);
      return null;
    }
  },
  set: (key: string, value: string, type: 'local' | 'session' = 'local') => {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage;
      storage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`SafeStorage: Access denied for ${type}Storage.setItem(${key})`);
      return false;
    }
  },
  remove: (key: string, type: 'local' | 'session' = 'local') => {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage;
      storage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`SafeStorage: Access denied for ${type}Storage.removeItem(${key})`);
      return false;
    }
  },
  clear: (type: 'local' | 'session' = 'local') => {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage;
      storage.clear();
      return true;
    } catch (e) {
      console.warn(`SafeStorage: Access denied for ${type}Storage.clear()`);
      return false;
    }
  },
  isAvailable: (type: 'local' | 'session' = 'local') => {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage;
      const testKey = '__storage_test__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
};
