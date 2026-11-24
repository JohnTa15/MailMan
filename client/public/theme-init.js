// Apply the saved theme before first paint to avoid a flash
try {
  var s = JSON.parse(localStorage.getItem('webmail-storage') || '{}').state || {};
  var dark = s.darkMode !== undefined ? s.darkMode : matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
