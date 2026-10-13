const ElectronStore = require('electron-store');

const schema = {
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
};

class Store extends ElectronStore {
  constructor() {
    super({
      schema,
      clearInvalidConfig: true,
    });
  }
}

module.exports = Store;
