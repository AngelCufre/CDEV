import process from 'node:process';
import { defineConfig } from 'vite';

// `npm run dev` abre el juego en Firefox (donde se prueba), no en el navegador
// predeterminado del sistema. Con BROWSER=... (o BROWSER=none) se puede cambiar.
process.env.BROWSER ??= 'firefox';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    open: true,
  },
});
