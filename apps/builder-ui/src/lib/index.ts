// Utility functions for builder UI

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
