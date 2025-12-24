import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      // S'assurer que React est correctement transformé
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    port: 3001, // Changé pour éviter conflit avec d'autres services
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    // Optimisations de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer console.log en production
        drop_debugger: true,
      },
    },
    // Code splitting automatique optimisé
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - React doit être dans le premier chunk
          if (id.includes('node_modules')) {
            // React et React-DOM doivent être ensemble et chargés en premier
            if (id.includes('react') || id.includes('react-dom') || id.includes('react/jsx-runtime')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            return 'vendor';
          }
          // Feature chunks
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('/')[0];
            return `page-${pageName}`;
          }
        },
        // Optimiser les noms de chunks
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Augmenter la limite de taille pour les warnings
    chunkSizeWarningLimit: 1000,
    // S'assurer que React est correctement externalisé
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  // Optimisations de développement
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
