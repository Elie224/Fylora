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

  // Vérifier que le fichier source existe
  if (!fs.existsSync(sourceFile)) {
    console.warn('⚠️  Le fichier public/_redirects n\'existe pas');
    // Créer le fichier _redirects s'il n'existe pas
    const redirectsContent = '/*    /index.html   200\n';
    fs.writeFileSync(sourceFile, redirectsContent);
    console.log('✅ Fichier public/_redirects créé');
  }

  // Copier le fichier _redirects dans dist
  fs.copyFileSync(sourceFile, destFile);
  console.log('✅ Fichier _redirects copié dans dist/');
  
  // Vérifier que le fichier a bien été copié
  if (fs.existsSync(destFile)) {
    const content = fs.readFileSync(destFile, 'utf8');
    console.log('✅ Contenu du fichier _redirects:', content.trim());
  } else {
    console.error('❌ Le fichier _redirects n\'a pas été copié dans dist/');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Erreur lors de la copie du fichier _redirects:', error.message);
  process.exit(1);
}

