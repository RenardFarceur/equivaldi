/* ---------- Étiquettes à imprimer : fiche de box (ration, à savoir, QR code) et étiquettes des prés ----------
   Le QR code ouvre la fiche du cheval ou du pré dans l'appli, pour les membres de l'écurie seulement :
   l'adresse ne contient que des identifiants, aucune donnée du carnet. */

/* ----- QR code (norme ISO 18004 : mode octets, correction M, versions 1 à 15) ----- */
const QR = (() => {
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24];   // octets de correction par bloc (niveau M)
  const BLOCS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10];
  const brut = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const nData = v => Math.floor(brut(v) / 8) - ECC[v] * BLOCS[v];
  function diviseur(deg) {
    const r = new Array(deg).fill(0); r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      root = mul(root, 2);
    }
    return r;
  }
  function reste(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); }
    return r;
  }
  function alignements(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.floor((v * 4 + n * 2 + 1) / (n * 2 - 2)) * 2;
    const r = [6];
    for (let i = n - 2; i >= 0; i--) r.push(size - 7 - i * step);
    return r;
  }
  function encoder(texte) {
    const octets = Array.from(new TextEncoder().encode(texte));
    let v = 1;
    for (; v <= 15; v++) if (4 + (v < 10 ? 8 : 16) + octets.length * 8 <= nData(v) * 8) break;
    if (v > 15) throw new Error('Texte trop long pour le QR code');
    // flux de bits : mode octets, longueur, données, terminaison, remplissage
    const bits = [];
    const met = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    met(4, 4); met(octets.length, v < 10 ? 8 : 16); octets.forEach(o => met(o, 8));
    const cap = nData(v) * 8;
    met(0, Math.min(4, cap - bits.length));
    met(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) met(p, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    // blocs, correction d'erreurs, entrelacement
    const nb = BLOCS[v], le = ECC[v], tot = Math.floor(brut(v) / 8), courts = nb - tot % nb, lc = Math.floor(tot / nb), div = diviseur(le);
    const blocs = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const d = data.slice(k, k + lc - le + (i < courts ? 0 : 1)); k += d.length;
      const e = reste(d, div);
      if (i < courts) d.push(0);
      blocs.push(d.concat(e));
    }
    const mots = [];
    for (let i = 0; i < blocs[0].length; i++) blocs.forEach((b, j) => { if (i !== lc - le || j >= courts) mots.push(b[i]); });
    // la matrice
    const size = v * 4 + 17, M = [], F = [];
    for (let y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    const pose = (x, y, b) => { M[y][x] = b; F[y][x] = true; };
    for (let i = 0; i < size; i++) { pose(6, i, i % 2 === 0); pose(i, 6, i % 2 === 0); }
    const chercheur = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) pose(xx, yy, d !== 2 && d !== 4); } };
    chercheur(3, 3); chercheur(size - 4, 3); chercheur(3, size - 4);
    const al = alignements(v), na = al.length;
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pose(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const format = masque => {
      const d = (0 << 3) | masque;   // niveau M : 00
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) pose(8, i, bit(i));
      pose(8, 7, bit(6)); pose(8, 8, bit(7)); pose(7, 8, bit(8));
      for (let i = 9; i < 15; i++) pose(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) pose(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) pose(8, size - 15 + i, bit(i));
      pose(8, size - 8, true);
    };
    format(0);
    if (v >= 7) {
      let r = v;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); pose(a, c, bit); pose(c, a, bit); }
    }
    // les données, en zigzag de deux colonnes
    let n = 0;
    for (let droite = size - 1; droite >= 1; droite -= 2) {
      if (droite === 6) droite = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = droite - j, haut = ((droite + 1) & 2) === 0, y = haut ? size - 1 - vert : vert;
        if (!F[y][x] && n < mots.length * 8) { M[y][x] = ((mots[n >>> 3] >>> (7 - (n & 7))) & 1) === 1; n++; }
      }
    }
    const MASQUES = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
    const appliquer = k => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && MASQUES[k](x, y)) M[y][x] = !M[y][x]; };
    // choix du masque : pénalités des suites, des carrés et de l'équilibre noir/blanc
    const penalite = () => {
      let p = 0, noirs = 0;
      for (let a = 0; a < size; a++) {
        let cl = null, nl = 0, cc = null, nc = 0;
        for (let b = 0; b < size; b++) {
          if (M[a][b] === cl) { nl++; if (nl === 5) p += 3; else if (nl > 5) p++; } else { cl = M[a][b]; nl = 1; }
          if (M[b][a] === cc) { nc++; if (nc === 5) p += 3; else if (nc > 5) p++; } else { cc = M[b][a]; nc = 1; }
          if (M[a][b]) noirs++;
          if (a < size - 1 && b < size - 1 && M[a][b] === M[a][b + 1] && M[a][b] === M[a + 1][b] && M[a][b] === M[a + 1][b + 1]) p += 3;
        }
      }
      return p + Math.floor(Math.abs(noirs * 20 - size * size * 10) / (size * size)) * 10;
    };
    let mieux = 0, pMin = Infinity;
    for (let k = 0; k < 8; k++) { appliquer(k); format(k); const p = penalite(); if (p < pMin) { pMin = p; mieux = k; } appliquer(k); }
    appliquer(mieux); format(mieux);
    return M;
  }
  /* Dessin en SVG, avec la marge blanche de 4 modules exigée par la norme */
  function svg(texte, label = '') {
    const M = encoder(texte), n = M.length, q = 4, d = [];
    M.forEach((ligne, y) => ligne.forEach((b, x) => { if (b) d.push(`M${x + q} ${y + q}h1v1h-1z`); }));
    return `<svg class="qr" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges" role="img" aria-label="${esc(label || 'QR code')}"><rect width="100%" height="100%" fill="#fff"/><path d="${d.join('')}" fill="#000"/></svg>`;
  }
  return { encoder, svg };
})();

/* ----- Les liens des étiquettes : ?cheval=écurie.id ou ?pre=écurie.id ----- */
const sidLien = () => (ecurieOuverte() && ecurieOuverte().sid) || SID || 'local';
const lienEtiquette = (k, id) => `${location.origin}${location.pathname}?${k}=${encodeURIComponent(sidLien() + '.' + id)}`;
const LIEN_KEY = 'equivaldi:lien';
// au chargement : l'étiquette scannée est gardée le temps de se connecter et d'ouvrir la bonne écurie
try {
  const p = new URLSearchParams(location.search), k = p.has('cheval') ? 'cheval' : p.has('pre') ? 'pre' : null;
  if (k) {
    const [sid, ...reste] = String(p.get(k)).split('.'), id = reste.join('.');
    if (sid && id) sessionStorage.setItem(LIEN_KEY, JSON.stringify({ k, sid, id, le: Date.now() }));
    p.delete(k);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p.toString() : '') + location.hash);
  }
} catch (e) { /* adresse ou stockage indisponible */ }
function suivreLien() {
  let L = null;
  try { L = JSON.parse(sessionStorage.getItem(LIEN_KEY) || 'null'); } catch (e) { L = null; }
  if (!L) return true;
  const fini = () => { try { sessionStorage.removeItem(LIEN_KEY); } catch (e) { /* rien */ } return true; };
  if (Date.now() - (L.le || 0) > 30 * 60000) return fini();
  if (window.EQ_MODE && !(window.EQ && window.EQ.ecurie)) return false;   // pas encore connecté
  const ici = sidLien();
  if (L.sid !== ici) {
    const x = mesEcuries().find(e => e.id === L.sid);
    if (x && window.EQ && typeof EQ.ouvrir === 'function' && !L.essai) {
      sessionStorage.setItem(LIEN_KEY, JSON.stringify(Object.assign(L, { essai: true })));
      toast(`Ouverture ${deNom(x.nom)}…`); EQ.ouvrir(x.id);
      return true;
    }
    toast("Cette étiquette vient d'une écurie dont tu ne fais pas partie : demande à sa gérante de t'inviter.", { danger: true });
    return fini();
  }
  const coll = L.k === 'cheval' ? 'chevaux' : 'pres';
  const o = get(coll, L.id);
  if (!o) {
    if (sync.mode === 'cloud' && !sync.loaded.has(coll) && Date.now() - L.le < 20000) return false;   // le carnet arrive
    if (window.EQ_MODE && sync.mode === 'loading') return false;
    toast(L.k === 'cheval' ? "Ce cheval n'est plus dans le carnet." : "Ce pré n'est plus dans le carnet.", { danger: true });
    return fini();
  }
  if (!$('#sheet').hidden) closeSheet();
  if (L.k === 'cheval') { nav.tab = 'chevaux'; nav.stack = [{ view: 'cheval', id: o.id, sub: 'fiche' }]; }
  else { nav.tab = 'pres'; nav.stack = [{ view: 'pre', id: o.id }]; }
  entree = 'push'; render();
  return fini();
}
(function attendreLien() {
  let n = 0;
  const t = setInterval(() => { n++; if (suivreLien() || n > 1200) clearInterval(t); }, 500);
})();

/* ----- Les cartes à imprimer ----- */
const ETQ_TAILLES = [{ v: 'a5', l: 'Grande (2 par page)' }, { v: 'a6', l: 'Petite (4 par page)' }];
function rationParRepas(h) {
  return REPAS.map(r => ({ r, l: (h.ration || []).filter(x => x && x.aliment && (x.repas || []).includes(r.id)) })).filter(x => x.l.length);
}
function carteBox(h) {
  const e = ecurieOuverte() || {}, rp = rationParRepas(h);
  const ident = [h.sexe, h.race, h.robe, validISO(h.naissance) ? ageTxt(h.naissance) : ''].filter(Boolean).join(' · ');
  const notes = String(h.notes || '').trim();
  const prop = h.proprietaire || '';
  return `<div class="etq etq-box">
    <div class="etq-tete">${av(h, 'xl')}<div class="etq-nom"><b>${esc(h.nom)}</b><span>${esc(ident)}</span></div>${QR.svg(lienEtiquette('cheval', h.id), `QR code de la fiche de ${h.nom}`)}</div>
    <div class="etq-corps">
      <div class="etq-ration">${rp.length ? rp.map(x => `<div class="etq-repas"><span>${esc(x.r.label)}</span><ul>${x.l.map(l => `<li>${esc(l.aliment)}${l.qte != null ? ` <b>${num(l.qte, 2)} ${esc(l.unite || '')}</b>` : ''}</li>`).join('')}</ul></div>`).join('') : '<p class="etq-vide">Ration à noter dans la fiche du cheval.</p>'}</div>
      ${notes ? `<div class="etq-savoir"><span>À savoir</span><p>${esc(notes.length > 220 ? notes.slice(0, 217) + '…' : notes)}</p></div>` : ''}
    </div>
    <div class="etq-pied"><span>${[prop ? `Propriétaire : ${esc(prop)}` : '', `Ration au ${dFull(todayISO())}`, e.nom ? esc(e.nom) : ''].filter(Boolean).join(' · ')}</span><span class="etq-scan">QR code : sa fiche dans EquiValdi</span></div>
  </div>`;
}
function cartePre(p) {
  const e = ecurieOuverte() || {};
  return `<div class="etq etq-pre">
    <div class="etq-nom"><b>${esc(p.nom)}</b><span>${esc([typeEspace(p).label, p.surface ? `${num(p.surface, 2)} ha` : ''].filter(Boolean).join(' · '))}</span></div>
    ${QR.svg(lienEtiquette('pre', p.id), `QR code du pré ${p.nom}`)}
    <span class="etq-scan">Scanne pour voir qui y est, déplacer des chevaux${e.nom ? ' · ' + esc(e.nom) : ''}</span>
  </div>`;
}
function feuilles(cartes, taille) {
  const parPage = taille === 'a5' ? 2 : 4, pages = [];
  for (let i = 0; i < cartes.length; i += parPage) pages.push(`<div class="etq-page etq-${taille}">${cartes.slice(i, i + parPage).join('')}</div>`);
  return pages.join('');
}

ACT.etiquettes = d => push('etiquettes', { genre: d.genre || 'box', ids: d.id ? [d.id] : null });
VIEWS.etiquettes = p => {
  const genre = p.genre === 'pres' ? 'pres' : 'box';
  const tous = genre === 'box' ? chevaux() : pres(true);
  if (!p.sel) p.sel = p.ids ? p.ids.filter(id => tous.some(o => o.id === id)) : tous.map(o => o.id);
  if (!p.taille) p.taille = genre === 'box' ? 'a5' : 'a6';
  const sel = tous.filter(o => p.sel.includes(o.id));
  const types = segCtl('etqGenre', [['box', 'Fiches de box'], ...(rub('pres') && pres(true).length ? [['pres', 'Prés']] : [])], genre);
  const choix = tous.length ? `<div class="chips-libres" role="group">${tous.map(o => `<button type="button" class="chip" data-act="etq-sel" data-id="${esc(o.id)}" aria-pressed="${p.sel.includes(o.id)}">${esc(o.nom)}</button>`).join('')}</div>` : '';
  const tailles = `<div class="chips-libres" role="group">${ETQ_TAILLES.map(t => `<button type="button" class="chip" data-act="etq-taille" data-v="${t.v}" aria-pressed="${p.taille === t.v}">${t.l}</button>`).join('')}</div>`;
  const cartes = sel.map(o => genre === 'box' ? carteBox(o) : cartePre(o));
  const html = types
    + section(genre === 'box' ? 'Chevaux' : 'Prés', tous.length ? choix : `<p class="note">${genre === 'box' ? 'Aucun cheval dans le carnet.' : 'Aucun pré dans le carnet.'}</p>`,
      tous.length > 1 ? `<button type="button" class="link" data-act="etq-tous">${p.sel.length === tous.length ? 'Aucun' : 'Tous'}</button>` : '')
    + section('Format', tailles)
    + (cartes.length ? `<div class="btnrow"><button type="button" class="btn primary" data-act="etq-imprimer">${ic('download', 'sm')}Imprimer ou enregistrer en PDF</button></div>
      <p class="note">${genre === 'box' ? 'À glisser dans une pochette plastique sur la porte du box. Le QR code ouvre la fiche du cheval dans EquiValdi, seulement pour les membres de l\'écurie (sur iPhone, il s\'ouvre dans Safari : connecte-toi une fois dans Safari). Réimprime quand la ration change.' : 'À plastifier et fixer à l\'entrée du pré. Le QR code ouvre le pré dans EquiValdi, seulement pour les membres de l\'écurie.'}</p>
      <div class="etq-apercu etq-${p.taille}">${cartes.join('')}</div>` : '');
  return { title: 'Étiquettes', eyebrow: 'À imprimer', back: true, fab: null, html };
};
const etqVue = () => { const t = topView(); return t && t.view === 'etiquettes' ? t : null; };
ACT['etq-sel'] = d => { const t = etqVue(); if (!t) return; t.sel = t.sel.includes(d.id) ? t.sel.filter(x => x !== d.id) : [...t.sel, d.id]; render(); };
ACT['etq-tous'] = () => { const t = etqVue(); if (!t) return; const tous = (t.genre === 'pres' ? pres(true) : chevaux()).map(o => o.id); t.sel = t.sel.length === tous.length ? [] : tous; render(); };
ACT['etq-taille'] = d => { const t = etqVue(); if (!t) return; t.taille = d.v; render(); };
const etqGenreAvant = ACT.seg;
ACT.seg = (d, el) => {
  const t = etqVue();
  if (d.k === 'etqGenre' && t) { if (t.genre !== d.v) Object.assign(t, { genre: d.v, sel: null, ids: null, taille: null }); entree = 'seg'; render(); return; }
  etqGenreAvant(d, el);
};
ACT['etq-imprimer'] = () => {
  const t = etqVue();
  if (!t) return;
  const tous = t.genre === 'pres' ? pres(true) : chevaux(), sel = tous.filter(o => t.sel.includes(o.id));
  if (!sel.length) { toast('Choisis au moins une étiquette.'); return; }
  imprimer(feuilles(sel.map(o => t.genre === 'pres' ? cartePre(o) : carteBox(o)), t.taille), t.genre === 'pres' ? 'Étiquettes des prés' : sel.length === 1 ? `Fiche de box ${sel[0].nom}` : 'Fiches de box');
};
