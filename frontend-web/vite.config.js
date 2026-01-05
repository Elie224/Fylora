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
    copyPublicDir: true,
    // OPTIMISATION ULTRA: Minification agressive
    // TEMPORAIRE: Désactivé pour debug - réactiver après correction
    minify: 'esbuild', // Plus rapide et moins agressif que terser
    // terserOptions: {
    //   compress: {
    //     drop_console: false, // TEMPORAIRE: Garder console pour debug
    //     drop_debugger: false,
    //     pure_funcs: [], // TEMPORAIRE: Ne pas supprimer les fonctions
    //     passes: 1, // Réduire les passes pour debug
    //     unsafe: false, // Désactiver les optimisations non sécurisées
    //   },
    //   mangle: {
    //     safari10: true,
    //   },
    //   format: {
    //     comments: false,
    //   },
    // },
    // OPTIMISATION ULTRA: Code splitting intelligent pour réduire la taille initiale
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Séparer les vendors par taille et fréquence d'utilisation
          if (id.includes('node_modules')) {
            // CRITIQUE: React et Zustand doivent être dans le même chunk pour éviter les erreurs de chargement
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react/jsx-runtime') ||
              id.includes('zustand') ||
              id.includes('use-sync-external-store')
            ) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Regrouper les autres vendors
            return 'vendor';
          }
          // Ne pas créer de chunks pour le code source (tout dans index.js)
          return undefined;
        },
        // Optimiser les noms de chunks pour le cache
        chunkFileNames: 'assets/[name]-[hash:8].js',
        entryFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8].[ext]',
        // Optimiser la taille des chunks
        compact: true,
      },
      // Tree shaking - moins agressif pour éviter de supprimer le code nécessaire
      treeshake: {
        moduleSideEffects: 'no-external', // Garder les side effects pour les modules internes
        propertyReadSideEffects: true, // Garder les propriétés lues
        tryCatchDeoptimization: true, // Garder les try/catch
      },
    },
    // Augmenter la limite de taille pour les warnings
    chunkSizeWarningLimit: 500, // Réduire pour forcer l'optimisation
    // Compression des assets
    assetsInlineLimit: 4096, // Inline les petits assets (< 4KB)
    // S'assurer que React est correctement externalisé
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Source maps seulement en développement
    sourcemap: true, // TEMPORAIRE: Activer pour debug - désactiver après correction
    // Optimisation CSS
    cssCodeSplit: true,
    cssMinify: true,
  },
  // Optimisations de développement
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'react/jsx-runtime',
      'zustand',
      'use-sync-external-store/shim/index.js'
    ],
    force: true, // Forcer la pré-optimisation
  },
  // S'assurer que les dépendances sont correctement résolues
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // S'assurer que React est toujours résolu correctement
      'react': 'react',
      'react-dom': 'react-dom',
    },
  },
});
