import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { opinionNgApiPlugin } from './src/server/apiPlugin';

export default defineConfig({
  plugins: [react(), opinionNgApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});


