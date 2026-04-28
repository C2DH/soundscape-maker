import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// @main resolves to the parent src/ folder so this app can import shared
// components directly during development (e.g. import SoundScape from '@main/components/SoundScape').
// server.fs.allow is required because the path crosses the Vite project root.
//
// NOTE: this alias is NOT included in exported ZIPs. The packager generates
// its own vite.config that maps @main to the local src/ of the exported package.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
