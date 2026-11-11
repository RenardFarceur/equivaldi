/* Pont hors Claude : même interface que window.claude, servie par Firebase (voir firebase.js) */
window.EQ_MODE = true;
window.EQ_VERSION = '__VERSION__';
window.claude = (() => {
  const waits = {};
  const SERVED = ['db', 'user', 'downloads'];
  const slot = n => waits[n] || (waits[n] = (() => { let r; const p = new Promise(res => { r = res; }); p._r = r; return p; })());
  return {
    use: n => SERVED.includes(n) ? slot(n) : Promise.resolve(null),
    _resolve: (n, v) => slot(n)._r(v)
  };
})();
/* Téléchargement direct d'un fichier (sauvegarde) */
window.claude._resolve('downloads', {
  save: ({ filename, data }) => new Promise(res => {
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    res({ status: 'saved' });
  })
});

/* ---------- Écurie d'exemple : visitable sans compte, rien n'est enregistré ----------
   L'écurie ouverte sur ce téléphone devient « exemple » (copie locale régénérée à chaque visite par
   68-exemple.js) ; celle d'avant est gardée de côté et revient quand on quitte l'exemple. */
window.eqExemple = (() => {
  const K = 'equivaldi:ecurie:v1', AVANT = 'equivaldi:avant-exemple';
  const cles = ['carnet-ecurie:cache:v1:exemple', 'carnet-ecurie:outbox:v1:exemple'];
  const lit = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } };
  const jour = ms => { const d = new Date(ms), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
  const actif = () => { const v = lit(); return !!(v && v.demo && v.sid === 'exemple'); };
  function entrer(recharger = true) {
    try {
      const v = lit();
      if (!(v && v.demo)) localStorage.setItem(AVANT, JSON.stringify(v || null));
      const avant = JSON.parse(localStorage.getItem(AVANT) || 'null');
      cles.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(K, JSON.stringify({
        sid: 'exemple', demo: true, nom: 'Écurie des Peupliers', commune: '', role: 'gerante',
        crottinsDepuis: jour(Date.now() - 40 * 86400000), creeLe: Date.now() - 400 * 86400000, abonnement: { statut: 'a_vie' },
        gerante: 'ex-camille', retour: !!(avant && avant.uid), ecuries: []
      }));
    } catch (e) { return false; }
    if (recharger) location.href = location.pathname;
    return true;
  }
  // apres : 'compte' pour ouvrir directement la création de compte
  function quitter(apres) {
    try {
      const avant = localStorage.getItem(AVANT);
      localStorage.removeItem(AVANT);
      cles.forEach(k => localStorage.removeItem(k));
      const v = avant ? JSON.parse(avant) : null;
      if (v && v.sid && !v.demo) localStorage.setItem(K, JSON.stringify(v)); else localStorage.removeItem(K);
      if (apres) sessionStorage.setItem('equivaldi:apres-exemple', apres);
    } catch (e) { /* stockage indisponible */ }
    location.href = location.pathname;
  }
  return { actif, entrer, quitter };
})();
try {
  const p = new URLSearchParams(location.search);
  // lien « ?exemple » (site, QR code) : l'écurie d'exemple s'ouvre directement
  if (p.has('exemple')) {
    window.eqExemple.entrer(false);
    p.delete('exemple');
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p.toString() : '') + location.hash);
  } else if (p.has('invitation') && window.eqExemple.actif()) {
    // un lien d'invitation ouvert pendant la visite : on revient d'abord à son compte
    const avant = JSON.parse(localStorage.getItem('equivaldi:avant-exemple') || 'null');
    localStorage.removeItem('equivaldi:avant-exemple');
    ['carnet-ecurie:cache:v1:exemple', 'carnet-ecurie:outbox:v1:exemple'].forEach(k => localStorage.removeItem(k));
    if (avant && avant.sid && !avant.demo) localStorage.setItem('equivaldi:ecurie:v1', JSON.stringify(avant)); else localStorage.removeItem('equivaldi:ecurie:v1');
  }
} catch (e) { /* adresse sans paramètres ou stockage indisponible */ }
