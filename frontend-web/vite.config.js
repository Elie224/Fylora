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
    // Code splitting désactivé temporairement pour résoudre l'erreur React
    // Tous les vendors seront dans un seul chunk pour éviter les problèmes d'ordre de chargement
    rollupOptions: {
      output: {
        manualChunks: undefined, // Désactiver le code splitting pour tester
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
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime'],
    force: true, // Forcer la pré-optimisation
  },
  // S'assurer que les dépendances sont correctement résolues
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
});
