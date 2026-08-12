import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['dietarily-unrequitable-miah.ngrok-free.dev'],
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true
      },
      '/auth': 'http://localhost:5000',
      '/parking': 'http://localhost:5000',
      '/slots': 'http://localhost:5000',
      '/bookings': 'http://localhost:5000',
      '/qr': 'http://localhost:5000',
      '/payments': 'http://localhost:5000',
      '/p2p': 'http://localhost:5000'
    }
  }
})
