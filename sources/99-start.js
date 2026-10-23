
/* ---------- Démarrage ---------- */
loadCache();
render();
connect();
let lastDay = todayISO();
setInterval(() => { if (todayISO() !== lastDay) { lastDay = todayISO(); render(); } }, 60000);
