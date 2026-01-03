/**
 * Initialisation automatique des templates de notes
 * Crée les templates par défaut s'ils n'existent pas
 */
const NoteTemplate = require('../models/NoteTemplate');
const logger = require('./logger');

const defaultTemplates = [
  {
    name: 'Note de réunion',
    description: 'Template pour prendre des notes lors d\'une réunion',
    content: '<h1>Réunion - [Date]</h1><h2>Participants</h2><ul><li>Participant 1</li><li>Participant 2</li></ul><h2>Ordre du jour</h2><ol><li>Point 1</li><li>Point 2</li></ol><h2>Décisions</h2><ul><li>Décision 1</li><li>Décision 2</li></ul><h2>Actions</h2><ul><li>Action 1 - Responsable: [Nom] - Échéance: [Date]</li></ul>',
    category: 'meeting',
    is_public: true,
  },
  {
    name: 'Plan de projet',
    description: 'Template pour planifier un projet',
    content: '<h1>Projet: [Nom du projet]</h1><h2>Description</h2><p>Description du projet...</p><h2>Objectifs</h2><ul><li>Objectif 1</li><li>Objectif 2</li></ul><h2>Équipe</h2><ul><li>Membre 1 - Rôle</li><li>Membre 2 - Rôle</li></ul><h2>Planning</h2><ul><li>Phase 1 - Date de début: [Date] - Date de fin: [Date]</li><li>Phase 2 - Date de début: [Date] - Date de fin: [Date]</li></ul><h2>Ressources</h2><ul><li>Ressource 1</li><li>Ressource 2</li></ul>',
    category: 'project',
    is_public: true,
  },
  {
    name: 'Notes de cours',
    description: 'Template pour prendre des notes de cours',
    content: '<h1>[Matière] - [Date]</h1><h2>Chapitre: [Titre]</h2><h3>Points clés</h3><ul><li>Point 1</li><li>Point 2</li></ul><h3>Définitions</h3><p><strong>Terme 1:</strong> Définition...</p><p><strong>Terme 2:</strong> Définition...</p><h3>Exemples</h3><p>Exemple 1...</p><h3>Questions / Remarques</h3><ul><li>Question 1</li></ul>',
    category: 'education',
    is_public: true,
  },
  {
    name: 'Liste de tâches',
    description: 'Template pour organiser vos tâches',
    content: '<h1>Liste de tâches - [Date]</h1><h2>À faire aujourd\'hui</h2><ul><li>☐ Tâche 1</li><li>☐ Tâche 2</li></ul><h2>À faire cette semaine</h2><ul><li>☐ Tâche 3</li><li>☐ Tâche 4</li></ul><h2>À faire ce mois</h2><ul><li>☐ Tâche 5</li><li>☐ Tâche 6</li></ul><h2>Terminé</h2><ul><li>☑ Tâche terminée</li></ul>',
    category: 'work',
    is_public: true,
  },
  {
    name: 'Journal personnel',
    description: 'Template pour un journal personnel',
    content: '<h1>Journal - [Date]</h1><h2>Comment je me sens</h2><p>...</p><h2>Ce qui s\'est passé aujourd\'hui</h2><p>...</p><h2>Ce dont je suis reconnaissant</h2><ul><li>...</li></ul><h2>Objectifs pour demain</h2><ul><li>...</li></ul>',
    category: 'personal',
    is_public: true,
  },
  {
    name: 'Note générale',
    description: 'Template de base pour une note simple',
    content: '<h1>[Titre]</h1><p>Commencez à écrire votre note ici...</p>',
    category: 'general',
    is_public: true,
  },
];

/**
 * Initialiser les templates par défaut
 */
async function initTemplates() {
  try {
    // Vérifier si des templates publics existent déjà
    const existingTemplates = await NoteTemplate.countDocuments({ is_public: true });
    
    if (existingTemplates > 0) {
      logger.logInfo(`Templates already initialized (${existingTemplates} public templates found)`);
      return;
    }

    // Créer les templates par défaut
    logger.logInfo('Initializing default note templates...');
    
    for (const templateData of defaultTemplates) {
      try {
        // Vérifier si le template existe déjà (par nom)
        const existing = await NoteTemplate.findOne({ 
          name: templateData.name, 
          is_public: true 
        });
        
        if (!existing) {
          await NoteTemplate.create(templateData);
          logger.logInfo(`Template created: ${templateData.name} (${templateData.category})`);
        }
      } catch (err) {
        logger.logError(err, { context: 'initTemplates', template: templateData.name });
      }
    }

    const createdCount = await NoteTemplate.countDocuments({ is_public: true });
    logger.logInfo(`✅ Note templates initialized: ${createdCount} public templates available`);
  } catch (error) {
    logger.logError(error, { context: 'initTemplates' });
    // Ne pas bloquer le démarrage si l'initialisation échoue
    console.warn('⚠️  Could not initialize note templates:', error.message);
  }
}

module.exports = { initTemplates };

