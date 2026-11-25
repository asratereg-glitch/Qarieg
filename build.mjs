// Rebuild js/app.bundle.js from src/ (needs: npm i esbuild). Not needed to run the app.
import { build } from 'esbuild';
await build({ entryPoints: ['src/app.js'], bundle: true, format: 'iife', outfile: 'js/app.bundle.js', target: 'es2020' });
