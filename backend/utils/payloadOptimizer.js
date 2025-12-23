/**
 * Optimisation des payloads API
 * Réduit la taille des réponses JSON
 */
class PayloadOptimizer {
  /**
   * Optimiser une réponse JSON
   */
  optimizeResponse(data, options = {}) {
    const {
      removeNulls = true,
      removeUndefined = true,
      removeEmptyArrays = false,
      removeEmptyObjects = false,
      maxDepth = 10,
    } = options;

    return this.cleanObject(data, {
      removeNulls,
      removeUndefined,
      removeEmptyArrays,
      removeEmptyObjects,
      maxDepth,
      currentDepth: 0,
    });
  }

  /**
   * Nettoyer un objet récursivement
   */
  cleanObject(obj, options) {
    if (options.currentDepth >= options.maxDepth) {
      return obj;
    }

    if (obj === null || obj === undefined) {
      return options.removeNulls || options.removeUndefined ? undefined : obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0 && options.removeEmptyArrays) {
        return undefined;
      }
      return obj.map(item => this.cleanObject(item, {
        ...options,
        currentDepth: options.currentDepth + 1,
      })).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      if (Object.keys(obj).length === 0 && options.removeEmptyObjects) {
        return undefined;
      }

      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.cleanObject(value, {
          ...options,
          currentDepth: options.currentDepth + 1,
        });

        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }

      return cleaned;
    }

    return obj;
  }

  /**
   * Sélectionner seulement les champs nécessaires
   */
  selectFields(data, fields) {
    if (Array.isArray(data)) {
      return data.map(item => this.selectFields(item, fields));
    }

    if (typeof data === 'object' && data !== null) {
      const selected = {};
      fields.forEach(field => {
        if (data.hasOwnProperty(field)) {
          selected[field] = data[field];
        }
      });
      return selected;
    }

    return data;
  }

  /**
   * Compresser les IDs (convertir ObjectId en string court)
   */
  compressIds(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.compressIds(item));
    }

    if (typeof data === 'object' && data !== null) {
      const compressed = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.endsWith('_id') || key === 'id') {
          // Garder les IDs comme strings (déjà optimisé)
          compressed[key] = value;
        } else {
          compressed[key] = this.compressIds(value);
        }
      }
      return compressed;
    }

    return data;
  }
}

module.exports = new PayloadOptimizer();


