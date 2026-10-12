const { defineConfig } = require('@electron/store');
const Store = defineConfig({
  schema: {
    darkMode: {
      type: 'boolean',
      default: false,
    },
    primaryColor: {
      type: 'string',
      default: '#0ea5e9',
    },
    language: {
      type: 'string',
      default: 'en',
    },
  },
  configFileDir: '.config/mailman',
  clearInvalidConfig: true,
});

module.exports = Store;
