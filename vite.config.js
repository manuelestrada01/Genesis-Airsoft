import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // mantener tu puerto actual
    allowedHosts: ["virulently-phonolitic-adelia.ngrok-free.dev"], // 👈 añadí esta línea
  },
})
