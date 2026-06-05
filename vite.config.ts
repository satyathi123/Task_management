import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all /api/* requests to the Railway backend (bypasses browser CORS)
      '/api': {
        target: 'https://admin-moderator-backend-staging.up.railway.app',
        changeOrigin: true,
        // secure: false bypasses SSL certificate validation errors on Railway's self-signed cert
        secure: false,
      },
    },
  },
})
