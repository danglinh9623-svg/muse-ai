import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Robustly handle the API Key. 
      // This ensures that even if process.env isn't standard in browser, Vite replaces this string literal at build time.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});