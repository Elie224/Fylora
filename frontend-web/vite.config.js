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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 3, // Multi-pass compression pour meilleure réduction
        unsafe: true, // Optimisations non sécurisées mais plus agressives
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false, // Supprimer tous les commentaires
      },
    },
    // OPTIMISATION ULTRA: Code splitting intelligent pour réduire la taille initiale
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Séparer les vendors par taille et fréquence d'utilisation
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Regrouper les autres vendors plus petits
            return 'vendor';
          }
        },
        // Optimiser les noms de chunks pour le cache
        chunkFileNames: 'assets/[name]-[hash:8].js',
        entryFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8].[ext]',
        // Optimiser la taille des chunks
        compact: true,
      },
      // Tree shaking agressif
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
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
    sourcemap: false, // Désactiver en production pour réduire la taille
    // Optimisation CSS
    cssCodeSplit: true,
    cssMinify: true,
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
