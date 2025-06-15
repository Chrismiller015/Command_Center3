// This file aggregates and exports all feature modules for the Notes plugin.
// This allows service/index.mjs to import them cleanly from a single point.

export * as search from './search.mjs';
export * as versions from './versions.mjs';
export * as linking from './linking.mjs';
export * as reminders from './reminders.mjs';
export * as templates from './templates.mjs';

// Add new feature modules here as they are created