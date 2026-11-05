import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev` serves over HTTPS (self-signed) so the phone gets features
// that need a secure context, like keeping the screen awake.
// `npm run dev:http` serves plain HTTP if the certificate gets in the way.
const useHttps = !process.env.HTTP;

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    // Listen on all interfaces so a phone on the same Wi-Fi can connect.
    host: true,
    port: 5173,
    // The phone only talks to Vite; /api is forwarded to the Express server.
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
