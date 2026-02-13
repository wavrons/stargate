import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/stargate/' : '/'),
  plugins: [react()],
})
