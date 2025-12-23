import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative paths so GitHub Pages project sites load assets correctly.
  base: "./",
  plugins: [react()],
})
