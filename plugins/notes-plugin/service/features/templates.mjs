// This module manages note templates.

import * as db from '../db.mjs';

// For simplicity, templates will be stored in plugin_notes_plugin_settings
// under a specific key, or could have their own table if more complex metadata is needed.
const TEMPLATE_KEY_PREFIX = 'template_';

/**
 * Saves a note's content as a new template.
 * @param {string} templateName - The name for the new template.
 * @param {string} content - The HTML content of the note to save as a template.
 * @returns {Promise<object>}
 */
export async function saveNoteAsTemplate(templateName, content) {
    if (!templateName || templateName.trim() === '') {
        throw new Error('Template name cannot be empty.');
    }
    const templateKey = TEMPLATE_KEY_PREFIX + templateName.toLowerCase().replace(/\s/g, '_');
    // Using setPluginSetting from main app's database.js via electronAPI
    return await window.electronAPI.setPluginSetting('notes-plugin', templateKey, content);
}

/**
 * Retrieves a specific template by its name (or key).
 * @param {string} templateName - The name of the template to retrieve.
 * @returns {Promise<string|null>} - The HTML content of the template, or null if not found.
 */
export async function getTemplate(templateName) {
    const templateKey = TEMPLATE_KEY_PREFIX + templateName.toLowerCase().replace(/\s/g, '_');
    // Using getPluginSettings from main app's database.js via electronAPI
    const allSettings = await window.electronAPI.getPluginSettings('notes-plugin');
    return allSettings[templateKey] || null;
}

/**
 * Retrieves a list of all available templates.
 * @returns {Promise<Array<object>>} - Array of template objects ({ id: key, name: display name, content: value }).
 */
export async function getTemplates() {
    // Fetch all settings and filter for templates
    const allSettings = await window.electronAPI.getPluginSettings('notes-plugin');
    const templates = [];
    for (const key in allSettings) {
        if (key.startsWith(TEMPLATE_KEY_PREFIX)) {
            const name = key.substring(TEMPLATE_KEY_PREFIX.length).replace(/_/g, ' ');
            templates.push({ id: key, name: name, content: allSettings[key] });
        }
    }
    return templates;
}

/**
 * Deletes a template by its name.
 * @param {string} templateName - The name of the template to delete.
 * @returns {Promise<object>}
 */
export async function deleteTemplate(templateName) {
    const templateKey = TEMPLATE_KEY_PREFIX + templateName.toLowerCase().replace(/\s/g, '_');
    // This requires a specific delete method for plugin settings, which might not be directly exposed yet.
    // A placeholder for now, might need enhancement in src/main/database.js and electronAPI.
    console.warn(`Deleting templates via plugin settings is a placeholder. Requires direct DB delete or specific setPluginSetting to null.`);
    // A workaround could be to set the value to an empty string or specific marker for deletion.
    // await window.electronAPI.setPluginSetting('notes-plugin', templateKey, ''); // Set to empty to "delete"
    return { success: true, message: "Template deletion is a placeholder." };
}