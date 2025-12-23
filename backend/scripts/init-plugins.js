/**
 * Script pour initialiser les plugins disponibles
 */
require('dotenv').config();
const mongoose = require('../models/db');
const Plugin = require('../models/Plugin');

async function initPlugins() {
  try {
    await mongoose.connectionPromise;

    const defaultPlugins = [
      {
        name: 'google_drive',
        display_name: 'Google Drive',
        description: 'Sync files with Google Drive',
        type: 'storage',
        provider: 'google_drive',
        is_active: true,
        is_system: true,
      },
      {
        name: 'dropbox',
        display_name: 'Dropbox',
        description: 'Sync files with Dropbox',
        type: 'storage',
        provider: 'dropbox',
        is_active: true,
        is_system: true,
      },
      {
        name: 'onedrive',
        display_name: 'OneDrive',
        description: 'Sync files with Microsoft OneDrive',
        type: 'storage',
        provider: 'onedrive',
        is_active: true,
        is_system: true,
      },
    ];

    for (const pluginData of defaultPlugins) {
      const existingPlugin = await Plugin.findOne({ name: pluginData.name });
      if (!existingPlugin) {
        await Plugin.create(pluginData);
        console.log(`✓ Plugin "${pluginData.display_name}" created`);
      } else {
        console.log(`- Plugin "${pluginData.display_name}" already exists`);
      }
    }

    console.log('✅ Default plugins initialized');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing plugins:', error);
    process.exit(1);
  }
}

initPlugins();


