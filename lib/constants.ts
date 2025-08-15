export const MESSAGE_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30; // 30 day

// Get APP_URL with fallback for development
export const APP_URL = process.env.NEXT_PUBLIC_URL || 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// Only throw error in production if URL is not set
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_URL) {
  console.warn("NEXT_PUBLIC_URL is not set in production environment");
}
