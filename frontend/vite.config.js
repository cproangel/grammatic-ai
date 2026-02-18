import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// TilshunosAI Configuration
// Frontend: http://localhost:5175 (FIXED)
// Backend:  http://localhost:8000 (FIXED)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[Proxy Error]', err.message);
          });
        }
      }
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true
  }
})
