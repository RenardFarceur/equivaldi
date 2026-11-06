
/* ---------- Démarrage ---------- */
loadCache();
if (window.EQ_MODE) {
  // après « Dessiner la carte » dans l'administration : l'éditeur de la carte de l'écurie ouverte
  try {
    const apres = JSON.parse(localStorage.getItem('equivaldi:apres') || 'null');
    localStorage.removeItem('equivaldi:apres');
    if (apres === 'carte') { nav.tab = 'pres'; ui.presVue = 'carte'; nav.stack = [{ view: 'carteEd' }]; }
  } catch (e) { /* stockage indisponible */ }
}
render();
connect();
let lastDay = todayISO();
setInterval(() => { if (todayISO() !== lastDay) { lastDay = todayISO(); render(); } }, 60000);
