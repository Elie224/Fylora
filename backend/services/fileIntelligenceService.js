/**
 * Service d'intelligence pour fichiers
 * OCR, résumé, extraction de mots-clés, détection de sensibilité
 */
const FileMetadata = require('../models/FileMetadata');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

class FileIntelligenceService {
  /**
   * Traiter un fichier pour extraire les métadonnées intelligentes
   */
  async processFile(fileId, userId, filePath, mimeType, storageType = 'local', storagePath = null) {
    try {
      let metadata = await FileMetadata.findOne({ file_id: fileId });
      if (!metadata) {
        metadata = new FileMetadata({
          file_id: fileId,
          user_id: userId,
        });
      }

      // OCR pour PDF et images
      if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
        await this.extractOCR(filePath, mimeType, metadata, storageType, storagePath);
      }

      // Extraction de texte pour fichiers texte
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        await this.extractText(filePath, metadata, storageType, storagePath);
      }

      // Détection de données sensibles
      await this.detectSensitiveData(filePath, mimeType, metadata, storageType, storagePath);

      // Extraction de mots-clés
      await this.extractKeywords(metadata);

      // Génération de résumé
      await this.generateSummary(metadata);

      // Suggestion de chiffrement
      await this.suggestEncryption(metadata);

      metadata.updated_at = new Date();
      await metadata.save();

      return metadata;
    } catch (error) {
      console.error('Error processing file intelligence:', error);
      throw error;
    }
  }

  /**
   * Extraire le texte via OCR (simulation - nécessiterait Tesseract.js ou similaire)
   */
  async extractOCR(filePath, mimeType, metadata, storageType = 'local', storagePath = null) {
    try {
      // Simulation OCR - Dans un vrai système, utiliser Tesseract.js ou Google Cloud Vision
      // Pour l'instant, on marque comme traité mais sans texte extrait
      metadata.ocr_processed_at = new Date();
      metadata.ocr_confidence = 0.8; // Simulation
      
      // Si c'est un PDF, essayer d'extraire le texte avec pdf-parse
      if (mimeType === 'application/pdf') {
        try {
          const pdfParse = require('pdf-parse');
          let dataBuffer;
          
          // Si le fichier est sur Cloudinary, le télécharger d'abord
          if (storageType === 'cloudinary' && storagePath) {
            const cloudinaryService = require('./cloudinaryService');
            const axios = require('axios');
            const downloadUrl = cloudinaryService.generateDownloadUrl(storagePath, 'file.pdf');
            const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            dataBuffer = Buffer.from(response.data);
          } else {
            // Lire depuis le stockage local
            dataBuffer = await fs.readFile(filePath);
          }
          
          const pdfData = await pdfParse(dataBuffer);
          if (pdfData.text) {
            metadata.ocr_text = pdfData.text.substring(0, 10000); // Limiter à 10k caractères
            metadata.page_count = pdfData.numpages;
          }
        } catch (err) {
          console.warn('PDF parsing failed:', err.message);
        }
      }
    } catch (error) {
      console.error('OCR extraction failed:', error);
    }
  }

  /**
   * Extraire le texte d'un fichier texte
   */
  async extractText(filePath, metadata, storageType = 'local', storagePath = null) {
    try {
      let content = '';
      
      // Si le fichier est sur Cloudinary, le télécharger d'abord
      if (storageType === 'cloudinary' && storagePath) {
        const cloudinaryService = require('./cloudinaryService');
        const axios = require('axios');
        const downloadUrl = cloudinaryService.generateDownloadUrl(storagePath, 'file.txt');
        const response = await axios.get(downloadUrl, { responseType: 'text' });
        content = response.data;
      } else {
        // Lire depuis le stockage local
        content = await fs.readFile(filePath, 'utf-8');
      }
      
      metadata.ocr_text = content.substring(0, 10000); // Limiter
    } catch (error) {
      console.error('Text extraction failed:', error);
    }
  }

  /**
   * Détecter les données sensibles dans un fichier
   */
  async detectSensitiveData(filePath, mimeType, metadata, storageType = 'local', storagePath = null) {
    try {
      let content = '';
      
      // Lire le contenu selon le type
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        // Si le fichier est sur Cloudinary, le télécharger d'abord
        if (storageType === 'cloudinary' && storagePath) {
          const cloudinaryService = require('./cloudinaryService');
          const axios = require('axios');
          const downloadUrl = cloudinaryService.generateDownloadUrl(storagePath, 'file.txt');
          const response = await axios.get(downloadUrl, { responseType: 'text' });
          content = response.data;
        } else {
          content = await fs.readFile(filePath, 'utf-8');
        }
      } else if (metadata.ocr_text) {
        content = metadata.ocr_text;
      }

      const sensitiveTypes = [];
      let sensitivityScore = 0;

      // Détecter les numéros de carte de crédit
      const creditCardRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
      if (creditCardRegex.test(content)) {
        sensitiveTypes.push('credit_card');
        sensitivityScore += 0.3;
      }

      // Détecter les emails
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = content.match(emailRegex);
      if (emails && emails.length > 5) {
        sensitiveTypes.push('email');
        sensitivityScore += 0.1;
      }

      // Détecter les numéros de téléphone
      const phoneRegex = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
      if (phoneRegex.test(content)) {
        sensitiveTypes.push('phone');
        sensitivityScore += 0.1;
      }

      // Détecter les mots-clés sensibles
      const sensitiveKeywords = ['password', 'secret', 'api_key', 'token', 'ssn', 'social security'];
      const foundKeywords = sensitiveKeywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundKeywords.length > 0) {
        sensitiveTypes.push('other');
        sensitivityScore += 0.2;
      }

      metadata.sensitive_data_detected = sensitiveTypes.length > 0;
      metadata.sensitive_types = sensitiveTypes;
      metadata.sensitivity_score = Math.min(1, sensitivityScore);
    } catch (error) {
      console.error('Sensitive data detection failed:', error);
    }
  }

  /**
   * Extraire les mots-clés d'un texte
   */
  async extractKeywords(metadata) {
    try {
      if (!metadata.ocr_text) return;

      const text = metadata.ocr_text.toLowerCase();
      
      // Mots vides à ignorer
      const stopWords = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'à', 'dans', 'sur', 'avec', 'pour', 'par', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with']);

      // Extraire les mots (simplifié)
      const words = text.match(/\b[a-zàâäéèêëïîôöùûüÿç]{3,}\b/gi) || [];
      
      // Compter les occurrences
      const wordCount = {};
      words.forEach(word => {
        const lowerWord = word.toLowerCase();
        if (!stopWords.has(lowerWord)) {
          wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
        }
      });

      // Prendre les 10 mots les plus fréquents
      const sortedWords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      metadata.keywords = sortedWords.map(([keyword, count]) => ({
        keyword,
        confidence: Math.min(1, count / words.length * 10),
        source: 'auto',
      }));
    } catch (error) {
      console.error('Keyword extraction failed:', error);
    }
  }

  /**
   * Générer un résumé automatique
   */
  async generateSummary(metadata) {
    try {
      if (!metadata.ocr_text || metadata.ocr_text.length < 100) return;

      const text = metadata.ocr_text;
      // Résumé simple : prendre les premières phrases
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      const summary = sentences.slice(0, 3).join(' ').substring(0, 500);

      metadata.summary = summary;
      metadata.summary_generated_at = new Date();
    } catch (error) {
      console.error('Summary generation failed:', error);
    }
  }

  /**
   * Suggérer le chiffrement si nécessaire
   */
  async suggestEncryption(metadata) {
    try {
      if (metadata.sensitive_data_detected && metadata.sensitivity_score > 0.5) {
        metadata.encryption_recommended = true;
        metadata.encryption_reason = 'Données sensibles détectées dans le fichier';
      } else if (metadata.sensitive_types && metadata.sensitive_types.includes('credit_card')) {
        metadata.encryption_recommended = true;
        metadata.encryption_reason = 'Numéro de carte de crédit détecté';
      } else {
        metadata.encryption_recommended = false;
      }
    } catch (error) {
      console.error('Encryption suggestion failed:', error);
    }
  }
}

module.exports = new FileIntelligenceService();


