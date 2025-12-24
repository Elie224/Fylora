// Script pour copier le fichier _redirects dans dist après le build
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../public/_redirects');
const destFile = path.join(__dirname, '../dist/_redirects');

try {
  // Vérifier que le dossier dist existe
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    console.error('❌ Le dossier dist n\'existe pas. Exécutez d\'abord "npm run build"');
    process.exit(1);
  }

  // Copier le fichier _redirects
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, destFile);
    console.log('✅ Fichier _redirects copié dans dist/');
  } else {
    console.warn('⚠️  Le fichier public/_redirects n\'existe pas');
  }
} catch (error) {
  console.error('❌ Erreur lors de la copie du fichier _redirects:', error.message);
  process.exit(1);
}

