/**
 * Service OCR Multilingue
 * Utilise Tesseract.js pour l'OCR local ou API cloud pour meilleure précision
 */

const logger = require('../utils/logger');
const Tesseract = require('tesseract.js');

class OCRService {
  constructor() {
    this.workers = new Map(); // Cache des workers Tesseract
    this.supportedLanguages = ['fra', 'eng', 'ara', 'spa', 'deu', 'ita', 'por'];
  }

  /**
   * Obtenir ou créer un worker Tesseract pour une langue
   */
  async getWorker(language = 'fra') {
    const langCode = this.mapLanguageToTesseract(language);
    const workerKey = `worker_${langCode}`;

    if (this.workers.has(workerKey)) {
      return this.workers.get(workerKey);
    }

    try {
      const worker = await Tesseract.createWorker(langCode, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            // Logger seulement les erreurs
          }
        },
      });

      this.workers.set(workerKey, worker);
      logger.logInfo('Tesseract worker created', { language: langCode });

      return worker;
    } catch (err) {
      logger.logError(err, { context: 'tesseract_worker_creation', language: langCode });
      throw err;
    }
  }

  /**
   * Mapper les langues vers les codes Tesseract
   */
  mapLanguageToTesseract(language) {
    const mapping = {
      'fr': 'fra',
      'en': 'eng',
      'ar': 'ara',
      'es': 'spa',
      'de': 'deu',
      'it': 'ita',
      'pt': 'por',
    };

    return mapping[language] || 'fra'; // Français par défaut
  }

  /**
   * Extraire le texte d'une image
   */
  async extractText(imageBuffer, options = {}) {
    const {
      language = 'fra',
      detectLanguage = false,
    } = options;

    try {
      const langCode = this.mapLanguageToTesseract(language);
      const worker = await this.getWorker(language);

      // Détecter la langue si demandé
      let detectedLanguage = langCode;
      if (detectLanguage) {
        try {
          const { data } = await worker.detect(imageBuffer);
          detectedLanguage = data.script || langCode;
        } catch (detectErr) {
          logger.logWarn('Language detection failed, using provided language', {
            error: detectErr.message,
            language: langCode,
          });
        }
      }

      // Si la langue détectée est différente, créer un nouveau worker
      if (detectedLanguage !== langCode) {
        const detectedWorker = await this.getWorker(detectedLanguage);
        const { data } = await detectedWorker.recognize(imageBuffer);
        return {
          text: data.text,
          confidence: data.confidence,
          language: detectedLanguage,
          words: data.words || [],
        };
      }

      // Extraire le texte
      const { data } = await worker.recognize(imageBuffer);

      return {
        text: data.text,
        confidence: data.confidence,
        language: detectedLanguage,
        words: data.words || [],
        paragraphs: data.paragraphs || [],
        lines: data.lines || [],
      };
    } catch (err) {
      logger.logError(err, {
        context: 'ocr_extraction',
        language,
      });
      throw new Error(`OCR extraction failed: ${err.message}`);
    }
  }

  /**
   * Extraire le texte d'un PDF (première page)
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      // Tesseract ne supporte pas directement les PDF
      // Il faut convertir en image d'abord
      // Pour l'instant, on retourne une erreur
      throw new Error('PDF OCR not yet implemented. Please convert PDF to image first.');
    } catch (err) {
      logger.logError(err, { context: 'pdf_ocr' });
      throw err;
    }
  }

  /**
   * Traiter un fichier et extraire le texte
   */
  async processFile(fileBuffer, mimeType, options = {}) {
    try {
      // Vérifier le type MIME
      if (!mimeType.startsWith('image/')) {
        throw new Error(`Unsupported MIME type for OCR: ${mimeType}`);
      }

      // Extraire le texte
      const result = await this.extractText(fileBuffer, options);

      logger.logInfo('OCR processing completed', {
        confidence: result.confidence,
        language: result.language,
        textLength: result.text.length,
      });

      return result;
    } catch (err) {
      logger.logError(err, {
        context: 'ocr_process_file',
        mimeType,
      });
      throw err;
    }
  }

  /**
   * Nettoyer les workers (à appeler lors de l'arrêt)
   */
  async cleanup() {
    for (const [key, worker] of this.workers.entries()) {
      try {
        await worker.terminate();
        logger.logInfo('Tesseract worker terminated', { workerKey: key });
      } catch (err) {
        logger.logError(err, { context: 'tesseract_worker_cleanup', workerKey: key });
      }
    }
    this.workers.clear();
  }

  /**
   * Vérifier si l'OCR est disponible
   */
  isAvailable() {
    try {
      // Vérifier si Tesseract est disponible
      return typeof Tesseract !== 'undefined';
    } catch (err) {
      return false;
    }
  }
}

// Instance singleton
const ocrService = new OCRService();

// Nettoyer les workers lors de l'arrêt
process.on('SIGTERM', async () => {
  await ocrService.cleanup();
});

process.on('SIGINT', async () => {
  await ocrService.cleanup();
});

module.exports = ocrService;

