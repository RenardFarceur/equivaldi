/* Pont hors Claude : même interface que window.claude, servie par Firebase (voir firebase.js) */
window.EQ_MODE = true;
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
