/**
 * Script pour initialiser les rôles par défaut
 */
require('dotenv').config();
const mongoose = require('../models/db');
const Role = require('../models/Role');

async function initRoles() {
  try {
    await mongoose.connectionPromise;

    const defaultRoles = [
      {
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Can only view files and folders',
        permissions: {
          files: { read: true, download: true },
          folders: { read: true },
          notes: { read: true },
        },
        is_system: true,
      },
      {
        name: 'member',
        display_name: 'Member',
        description: 'Can create, read, update, and delete files',
        permissions: {
          files: { create: true, read: true, update: true, delete: true, download: true },
          folders: { create: true, read: true, update: true, delete: true },
          notes: { create: true, read: true, update: true, delete: true },
        },
        is_system: true,
      },
      {
        name: 'admin',
        display_name: 'Admin',
        description: 'Can manage team settings and members',
        permissions: {
          files: { create: true, read: true, update: true, delete: true, share: true, download: true },
          folders: { create: true, read: true, update: true, delete: true, share: true },
          notes: { create: true, read: true, update: true, delete: true, share: true },
          admin: { manage_users: true, manage_teams: true, view_audit_logs: true },
        },
        is_system: true,
      },
      {
        name: 'owner',
        display_name: 'Owner',
        description: 'Full access including team deletion',
        permissions: {
          files: { create: true, read: true, update: true, delete: true, share: true, download: true },
          folders: { create: true, read: true, update: true, delete: true, share: true },
          notes: { create: true, read: true, update: true, delete: true, share: true },
          admin: { manage_users: true, manage_teams: true, manage_settings: true, view_audit_logs: true },
        },
        is_system: true,
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`✓ Role "${roleData.display_name}" created`);
      } else {
        console.log(`- Role "${roleData.display_name}" already exists`);
      }
    }

    console.log('✅ Default roles initialized');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing roles:', error);
    process.exit(1);
  }
}

initRoles();


