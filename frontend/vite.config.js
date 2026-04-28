import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: ['team12.unr.dev', 'localhost', '127.0.0.1']
  }
});