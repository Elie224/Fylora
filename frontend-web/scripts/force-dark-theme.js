/**
 * Script pour forcer le thème sombre dans tous les fichiers
 * Remplace toutes les conditions theme === 'dark' ? ... : ... par les valeurs du thème sombre
 */

const fs = require('fs');
const path = require('path');

// Mapping des valeurs du thème sombre
const darkThemeValues = {
  // Couleurs de fond
  '#ffffff': '#1e1e1e',
  '#fafbfc': '#121212',
  '#f7fafc': '#2d2d2d',
  '#f0f4f8': '#2d2d2d',
  '#e3f2fd': '#1a237e',
  '#e2e8f0': '#333333',
  '#e0e0e0': '#333333',
  
  // Couleurs de texte
  '#1a202c': '#e0e0e0',
  '#4a5568': '#b0b0b0',
  '#666': '#b0b0b0',
  '#999': '#b0b0b0',
  
  // Ombres
  'rgba(0, 0, 0, 0.08)': 'rgba(0, 0, 0, 0.5)',
  'rgba(0, 0, 0, 0.1)': 'rgba(0, 0, 0, 0.5)',
  'rgba(0, 0, 0, 0.12)': 'rgba(0, 0, 0, 0.6)',
  'rgba(0, 0, 0, 0.15)': 'rgba(0, 0, 0, 0.5)',
  
  // Autres
  'transparent': 'transparent',
  'none': 'none'
};

function replaceThemeConditions(content) {
  // Remplacer theme === 'dark' ? darkValue : lightValue par darkValue
  content = content.replace(/theme\s*===\s*['"]dark['"]\s*\?\s*([^:]+)\s*:\s*([^,;\)\}]+)/g, '$1');
  
  // Remplacer theme === 'light' ? lightValue : darkValue par darkValue
  content = content.replace(/theme\s*===\s*['"]light['"]\s*\?\s*([^:]+)\s*:\s*([^,;\)\}]+)/g, '$2');
  
  return content;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = replaceThemeConditions(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Modifié: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let modifiedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      modifiedCount += processDirectory(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      if (processFile(filePath)) {
        modifiedCount++;
      }
    }
  });
  
  return modifiedCount;
}

// Exécuter le script
const srcPath = path.join(__dirname, '../src');
console.log('🔄 Traitement des fichiers...');
const count = processDirectory(srcPath);
console.log(`\n✅ ${count} fichier(s) modifié(s)`);

