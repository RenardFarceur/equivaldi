
/* ---------- Ma carte des prés : la créer à partir d'un plan envoyé ----------
   La gérante envoie une vue du dessus de ses prés (capture de Géoportail, vue satellite, plan à l'échelle), règle
   l'échelle, puis touche les coins de chaque espace : prés numérotés, carrière, piste, verger, abris, abreuvoirs.
   Le carnet en tire la même maquette que la carte d'origine (3D ou vue de dessus, 64-carte.js). Ou bien elle demande
   à EquiValdi de la dessiner pour elle, à partir du même plan (l'administration la trace ici, sans apparaître).
   Le plan (image) est rangé à part, dans config/plan, et lu seulement ici ; le tracé et la carte publiée sont dans
   config/carte (suivi par toute l'équipe). Coordonnées du tracé : pixels de l'image ; celles de la carte : mètres. */

const ED_T = {
  pre: { l: 'Pré', pl: 'prés', aide: "Touche chaque coin du pré, dans l'ordre, puis « Terminer ». Les coins et les bords des prés voisins s'attrapent tout seuls.", min: 3 },
  carriere: { l: 'Carrière', pl: 'carrières', aide: 'Touche les coins de la carrière, puis « Terminer ».', min: 3 },
  piste: { l: 'Piste', pl: 'pistes', aide: 'Touche le milieu de la piste, de point en point. Si elle fait le tour, finis en touchant le premier point.', min: 2 },
  verger: { l: 'Verger', pl: 'vergers', aide: "Touche les coins du verger (ou d'un bosquet), puis « Terminer ».", min: 3 },
  abri: { l: 'Abri', pl: 'abris', aide: "Touche deux coins opposés de l'abri (zoome d'abord : il est petit sur le plan).", min: 2, max: 2 },
  eau: { l: 'Abreuvoir', pl: 'abreuvoirs', aide: "Touche l'endroit de l'abreuvoir.", min: 1, max: 1 }
};
const ED_ORDRE = ['pre', 'carriere', 'piste', 'verger', 'abri', 'eau'];
const ED_SURFACES = ['pre', 'carriere', 'verger'];
const ED = {
  sid: null, etape: null, img: null, imgEtat: '', chargement: null, t: null, avant: null,
  cur: null, sel: null, som: null, vue: null, host: null, svg: null, ro: null, W: 0, H: 0,
  apercu: null, apercuV: 0, sauveT: null, cadrage: false, geo: null
};
/* Vue aérienne de l'IGN (Géoplateforme, photographies aériennes, licence ouverte) : une adresse ou la position
   du téléphone, puis un carré de 4 × 4 tuiles (≈ 420 m de côté au niveau 18), nord en haut, échelle connue. Le plan
   enregistré ne garde que les coordonnées des tuiles : les images sont relues chez l'IGN. */
const IGN = { n: 4, zMin: 16, zMax: 19, z: 18, tuile: 256 };
const ignUrl = (z, x, y) => `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=${z | 0}&TILEROW=${y | 0}&TILECOL=${x | 0}&FORMAT=image/jpeg`;
const lonX = (lon, z) => (lon + 180) / 360 * 2 ** z;
const latY = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z; };
const xLon = (x, z) => x / 2 ** z * 360 - 180;
const yLat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / 2 ** z; return 180 / Math.PI * Math.atan(Math.sinh(n)); };
const ignMpp = (lat, z) => 156543.03392 * Math.cos(lat * Math.PI / 180) / 2 ** z;   // mètres par pixel
const ignOk = g => !!g && [g.z, g.x0, g.y0, g.n].every(Number.isInteger) && g.z >= IGN.zMin && g.z <= IGN.zMax && g.n >= 1 && g.n <= 6
  && g.x0 >= 0 && g.y0 >= 0 && g.x0 + g.n <= 2 ** g.z && g.y0 + g.n <= 2 ** g.z;
// le carré de tuiles centré sur un point
function ignCadre(lat, lon, z) {
  const fx = lonX(lon, z), fy = latY(lat, z), n = IGN.n;
  const g = { z, n, x0: Math.max(0, Math.round(fx - n / 2)), y0: Math.max(0, Math.round(fy - n / 2)) };
  return { img: { ign: g, w: n * IGN.tuile, h: n * IGN.tuile, lat, lon }, cx: (fx - g.x0) * IGN.tuile, cy: (fy - g.y0) * IGN.tuile };
}
const r1 = v => Math.round(v * 10) / 10;
const edDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const edEl = id => (ED.t && ED.t.els.find(e => e.id === id)) || null;
const edId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- Géométrie ---------- */
function aireP(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(s) / 2;
}
function projSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  if (!L2) return a.slice();
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return [a[0] + t * dx, a[1] + t * dy];
}
/* Enveloppe convexe (chaîne monotone) */
function enveloppe(points) {
  const p = points.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/* Un point bien à l'intérieur d'une zone (là où va son numéro) : le plus loin possible des bords */
function interieur(pts, trous) {
  const b = boite(pts), anneaux = [pts].concat(trous || []);
  const dedans = (x, y) => dansPoly(x, y, pts) && !(trous || []).some(t => dansPoly(x, y, t));
  const bord = (x, y) => { let m = Infinity; anneaux.forEach(r => r.forEach((a, i) => { m = Math.min(m, edDist([x, y], projSeg([x, y], a, r[(i + 1) % r.length]))); })); return m; };
  let best = null, bd = -1;
  const essai = (x, y) => { if (!dedans(x, y)) return; const d = bord(x, y); if (d > bd) { bd = d; best = [x, y]; } };
  const N = 18, sx = (b.x1 - b.x0) / N, sy = (b.y1 - b.y0) / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) essai(b.x0 + (i + .5) * sx, b.y0 + (j + .5) * sy);
  if (best) { const c = best.slice(); for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) essai(c[0] + i * sx / 4, c[1] + j * sy / 4); }
  return best || [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
}
/* La piste : un couloir de largeur w autour de la ligne tracée (une boucle donne un anneau : bord extérieur + trou) */
function bandeau(pts, w, ferme) {
  const n = pts.length, h = w / 2;
  const normale = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  const G = [], D = [];
  for (let i = 0; i < n; i++) {
    const prev = ferme ? pts[(i - 1 + n) % n] : pts[i - 1], next = ferme ? pts[(i + 1) % n] : pts[i + 1];
    let nx, ny, m = h;
    if (prev && next) {
      const n1 = normale(prev, pts[i]), n2 = normale(pts[i], next), sx = n1[0] + n2[0], sy = n1[1] + n2[1], L = Math.hypot(sx, sy);
      if (L < 1e-6) { [nx, ny] = n1; } else { nx = sx / L; ny = sy / L; m = h / Math.max(.35, nx * n1[0] + ny * n1[1]); }
    } else [nx, ny] = prev ? normale(prev, pts[i]) : normale(pts[i], next);
    G.push([pts[i][0] + nx * m, pts[i][1] + ny * m]);
    D.push([pts[i][0] - nx * m, pts[i][1] - ny * m]);
  }
  if (ferme && n >= 3) return aireP(G) >= aireP(D) ? { pts: G, trous: [D] } : { pts: D, trous: [G] };
  return { pts: G.concat(D.reverse()), trous: null };
}
/* Mètres par pixel de l'image, d'après l'échelle posée */
function edEchelle(t) {
  const e = t && t.ech;
  if (!e || !e.a || !e.b || !(e.m > 0)) return null;
  const d = edDist(e.a, e.b);
  return d > 2 ? e.m / d : null;
}
/* L'angle du parcellaire sur l'image (radians, entre −45° et 45°) : la moyenne des bords, pondérée par leur longueur */
function edAngle(els) {
  let C = 0, Sn = 0;
  els.forEach(e => {
    if (!ED_SURFACES.includes(e.type) || e.pts.length < 3) return;
    e.pts.forEach((a, i) => {
      const b = e.pts[(i + 1) % e.pts.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (!L) return;
      const th = Math.atan2(dy, dx);
      C += L * Math.cos(4 * th); Sn += L * Math.sin(4 * th);
    });
  });
  return C || Sn ? Math.atan2(Sn, C) / 4 : 0;
}
/* Un abri : rectangle dans l'axe du parcellaire, donné par deux coins opposés */
function rectAbri(a, b, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const vers = q => [c * q[0] + s * q[1], -s * q[0] + c * q[1]], depuis = q => [c * q[0] - s * q[1], s * q[0] + c * q[1]];
  const A = vers(a), B = vers(b), x0 = Math.min(A[0], B[0]), x1 = Math.max(A[0], B[0]), y0 = Math.min(A[1], B[1]), y1 = Math.max(A[1], B[1]);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(depuis);
}

/* ---------- Du tracé (pixels) à la carte (mètres) ---------- */
function planDepuisTrace(t) {
  const s = edEchelle(t);
  if (!s || !t.els.length) return null;
  const th = edAngle(t.els), beta = -th * 180 / Math.PI + 90 * ((t.rot || 0) % 4);
  const b = beta * Math.PI / 180, cb = Math.cos(b), sb = Math.sin(b);
  const P = q => { const X = q[0] * s, Y = q[1] * s; return [cb * X - sb * Y, sb * X + cb * Y]; };
  const tous = [];
  t.els.forEach(e => e.pts.forEach(q => tous.push(P(q))));
  const bb = boite(tous), ox = (bb.x0 + bb.x1) / 2, oy = (bb.y0 + bb.y1) / 2;
  const Q = q => { const r = P(q); return [r1(r[0] - ox), r1(r[1] - oy)]; };
  const zones = [], abris = [], eau = [], cpt = {}, ids = new Set();
  t.els.forEach(e => {
    if (e.type === 'abri') {
      if (e.pts.length < 2) return;
      const a = Q(e.pts[0]), c = Q(e.pts[1]);
      abris.push({ c: [r1((a[0] + c[0]) / 2), r1((a[1] + c[1]) / 2)], w: r1(Math.max(2.5, Math.abs(c[0] - a[0]))), h: r1(Math.max(2.5, Math.abs(c[1] - a[1]))) });
      return;
    }
    if (e.type === 'eau') { if (e.pts.length) eau.push({ c: Q(e.pts[0]) }); return; }
    if (!ED_T[e.type] || e.pts.length < ED_T[e.type].min || (e.type !== 'piste' && e.pts.length < 3)) return;
    let pts = e.pts.map(Q), trous = null;
    if (e.type === 'piste') {
      const r = bandeau(pts, Math.max(1.5, Math.min(30, e.larg || 4)), !!e.ferme);
      pts = r.pts.map(q => q.map(r1));
      trous = r.trous ? r.trous.map(tr => tr.map(q => q.map(r1))) : null;
    }
    cpt[e.type] = (cpt[e.type] || 0) + 1;
    const z = { id: '', type: e.type, pts };
    if (e.type === 'pre') {
      z.n = e.n;
      let id = 'p' + e.n, k = 1;
      while (ids.has(id)) id = 'p' + e.n + '-' + (++k);
      z.id = id;
    } else {
      z.id = e.type + (cpt[e.type] > 1 ? cpt[e.type] : '');
      if (cpt[e.type] > 1) z.nom = ED_T[e.type].l + ' ' + cpt[e.type];
    }
    ids.add(z.id);
    if (e.nom) z.nom = e.nom;
    if (trous) z.trous = trous;
    z.aire = Math.round(aireP(pts) - (trous || []).reduce((a, tr) => a + aireP(tr), 0));
    z.lab = interieur(pts, trous).map(r1);
    zones.push(z);
  });
  if (!zones.length) return null;
  // des pommiers en rangs dans les vergers, deux obstacles dans les carrières
  const arbres = [], obstacles = [];
  zones.filter(z => z.type === 'verger').forEach(z => {
    const bx = boite(z.pts), pas = 5.5, out = [];
    for (let x = bx.x0 + pas / 2; x < bx.x1; x += pas) for (let y = bx.y0 + pas / 2; y < bx.y1; y += pas) {
      const r = alea(Math.round(x * 31 + y * 17) >>> 0), xx = x + (r() - .5) * 1.4, yy = y + (r() - .5) * 1.4;
      if (dansZone(z, xx, yy) && dansZone(z, xx + 1.5, yy) && dansZone(z, xx - 1.5, yy) && dansZone(z, xx, yy + 1.5) && dansZone(z, xx, yy - 1.5)) out.push([r1(xx), r1(yy)]);
    }
    arbres.push(...(out.length ? out.slice(0, 40) : [z.lab.slice()]));
  });
  zones.filter(z => z.type === 'carriere').forEach(z => {
    const bx = boite(z.pts), lx = bx.x1 - bx.x0, ly = bx.y1 - bx.y0;
    if (Math.min(lx, ly) < 10) return;
    const long = lx >= ly;
    [1 / 3, 2 / 3].forEach(f => {
      const x = long ? bx.x0 + lx * f : (bx.x0 + bx.x1) / 2, y = long ? (bx.y0 + bx.y1) / 2 : bx.y0 + ly * f;
      if (dansZone(z, x, y)) obstacles.push(long ? [r1(x), r1(y)] : [r1(x), r1(y), 'x']);
    });
  });
  // le socle de la maquette : tout le terrain, avec 5 m de marge
  const pts = [];
  zones.forEach(z => z.pts.forEach(q => pts.push(q)));
  abris.forEach(a => { pts.push([a.c[0] - a.w / 2, a.c[1] - a.h / 2], [a.c[0] + a.w / 2, a.c[1] + a.h / 2], [a.c[0] - a.w / 2, a.c[1] + a.h / 2], [a.c[0] + a.w / 2, a.c[1] - a.h / 2]); });
  eau.forEach(e => pts.push(e.c));
  const autour = [];
  pts.forEach(q => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; autour.push([q[0] + 5 * Math.cos(a), q[1] + 5 * Math.sin(a)]); } });
  return { beta: Math.round(beta * 100) / 100, zones, abris, eau, arbres, obstacles, socle: enveloppe(autour).map(q => q.map(r1)) };
}

/* ---------- Qui peut créer la carte, et l'invitation dans l'onglet Prés ---------- */
function edPeut() {
  const e = ecurieOuverte();
  return !!window.EQ_MODE && !!e && (!!e.fantome || e.role === 'gerante') && !sync.readOnly;
}
const edNb = t => (t && Array.isArray(t.els) ? t.els.length : 0);
function carteAFaireHtml() {
  const e = ecurieOuverte() || {}, d = e.carteDemande, n = edNb(S.carte && S.carte.trace), peut = edPeut();
  let t, p, bt = '';
  if (d && d.statut === 'demandee') {
    t = 'Ta carte est en préparation';
    p = `Demandée à EquiValdi le ${dJour(d.le)}, à partir de ton plan. Elle apparaîtra ici dès qu'elle sera prête.`;
    if (peut) bt = `<button type="button" class="btn small" data-act="carte-editer">${ic('edit', 'sm')}${e.fantome ? 'Dessiner la carte' : 'La dessiner moi-même'}</button>`;
  } else if (n && peut) {
    t = 'Ta carte est commencée';
    p = `${n} ${pl(n, 'espace')} ${pl(n, 'tracé')} sur ton plan. Reprends là où tu en étais.`;
    bt = `<button type="button" class="btn small primary" data-act="carte-editer">Continuer ma carte</button>`;
  } else {
    t = 'La carte de tes prés, en 3D';
    p = "Envoie une vue du dessus de tes prés (une capture de Géoportail, par exemple) et touche les coins de chaque pré : le carnet en fait une maquette où l'on voit d'un coup d'œil où en est la rotation et où sont les chevaux.";
    bt = peut ? `<button type="button" class="btn small primary" data-act="carte-editer">${ic('image', 'sm')}Créer ma carte</button>`
      : `<p class="small muted">La gérante peut créer la carte de l'écurie à partir d'un plan.</p>`;
  }
  return `<div class="verrou-carte c-afaire" data-key="c-afaire"><div class="carte" data-key="carte" data-garde></div>
    <div class="verrou-voile"><span class="qa-ic menthe">${ic('fence')}</span><b>${esc(t)}</b><p class="small">${esc(p)}</p>${bt}</div></div>`;
}

/* ---------- Ouvrir, fermer ---------- */
// le tracé lu dans la base, remis au propre (identifiants, nombres, types connus)
function nettoieTrace(tr) {
  if (!tr || typeof tr !== 'object' || !Array.isArray(tr.els)) return { w: 0, h: 0, ech: null, rot: 0, els: [] };
  const els = tr.els.slice(0, 400).map(e => {
    if (!e || !ED_T[e.type] || typeof e.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(e.id)) return null;
    const o = { id: e.id, type: e.type, pts: ptsOk(e.pts, 2000) };
    if (!o.pts.length) return null;
    if (e.type === 'pre') o.n = nbOk(e.n) ? Math.max(1, Math.min(999, Math.round(e.n))) : 1;
    if (e.type === 'piste') { o.larg = nbOk(e.larg) ? Math.max(1, Math.min(30, e.larg)) : 4; o.ferme = e.ferme === true; }
    const nom = texteOk(e.nom, 40);
    if (nom) o.nom = nom;
    return o;
  }).filter(Boolean);
  const E = tr.ech && typeof tr.ech === 'object' ? { a: ptOk(tr.ech.a), b: ptOk(tr.ech.b), m: nbOk(tr.ech.m) && tr.ech.m > 0 ? tr.ech.m : 50, ok: tr.ech.ok === true } : null;
  return { w: nbOk(tr.w) ? tr.w : 0, h: nbOk(tr.h) ? tr.h : 0, ech: E, rot: nbOk(tr.rot) ? ((Math.round(tr.rot) % 4) + 4) % 4 : 0, els };
}
function edPrepare() {
  const sid = idEcurie(ecurieOuverte());
  if (ED.sid === sid && ED.t) return;
  clearTimeout(ED.sauveT);
  const tr = S.carte && S.carte.trace;
  Object.assign(ED, { sid, etape: null, img: null, imgEtat: '', chargement: null, cur: null, sel: null, som: null, vue: null, apercu: null, sauveT: null, cadrage: false, geo: null, avant: null,
    t: nettoieTrace(tr) });
}
ACT['carte-editer'] = () => {
  if (!edPeut()) { toast(sync.readOnly ? roMsg() : "Seule la gérante peut créer la carte de l'écurie."); return; }
  if (!premium()) { ACT.abonner({ raison: 'carte' }); return; }
  edPrepare();
  ED.etape = null; ED.cur = null; ED.sel = null; ED.som = null;
  (nav.stack[nav.stack.length - 1] || nav).savedY = window.scrollY;
  nav.stack.push({ view: 'carteEd' });
  entree = null;
  render();
};
ACT['ed-fermer'] = () => {
  if (ED.sauveT) edSauve(true);
  ED.cur = null; ED.apercu = null;
  if (topView() && topView().view === 'carteEd') back(); else render();
};

/* ---------- Le plan : choisi, réduit, envoyé (ou relu) ---------- */
async function edReduire(f) {
  const d = await decodeImage(f);
  let max = 2000;
  for (let essai = 0; essai < 6; essai++) {
    const r = Math.min(1, max / Math.max(d.w, d.h)), w = Math.round(d.w * r), h = Math.round(d.h * r);
    const c = newCanvas(w, h), x = ctx2d(c);
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.drawImage(d.img, 0, 0, w, h);
    for (const q of [.82, .72, .62]) { const src = c.toDataURL('image/jpeg', q); if (src.length <= 880000) return { src, w, h }; }
    max = Math.round(max * .8);
  }
  throw new Error('image trop lourde');
}
async function edFichier(f) {
  if (!f) return;
  ED.imgEtat = 'prep'; render();
  try {
    const im = await edReduire(f);
    Object.assign(ED, { img: im, vue: null, etape: 'echelle', cur: null, sel: null, som: null, apercu: null, cadrage: false, geo: null, avant: null, t: { w: im.w, h: im.h, ech: null, rot: 0, els: [] } });
    edEnvoyerPlan();
    edSauve(true);
  } catch (e) {
    ED.imgEtat = ED.img ? 'ok' : '';
    toast("Cette image n'a pas pu être ouverte. Essaie une capture d'écran (JPEG ou PNG).", { danger: true });
  }
  render();
}
function edEnvoyerPlan() {
  const im = ED.img;
  if (!im) return;
  if (!DB) { ED.imgEtat = 'attente'; return; }
  ED.imgEtat = 'envoi';
  const doc = im.ign ? Object.assign({ source: 'ign', lat: im.lat, lon: im.lon, w: im.w, h: im.h, le: Date.now(), par: moiRef() }, im.ign)
    : { image: im.src, w: im.w, h: im.h, le: Date.now(), par: moiRef() };
  DB.doc('config/plan').set(doc).then(
    () => { if (ED.img === im) { ED.imgEtat = 'ok'; rerenderSoon(); } },
    () => { if (ED.img === im) { ED.imgEtat = 'erreur'; rerenderSoon(); toast("Le plan n'a pas pu être envoyé : vérifie ta connexion.", { danger: true }); } });
}
function edCharger() {
  if (ED.img || ED.chargement || ['absent', 'erreur-lecture', 'prep'].includes(ED.imgEtat) || !DB) return;
  const sid = ED.sid;
  ED.imgEtat = 'charge';
  ED.chargement = DB.doc('config/plan').get().then(s => {
    if (ED.sid !== sid) return;
    const d = s.exists ? s.data() : null;
    if (d && typeof d.image === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.image) && nbOk(d.w) && nbOk(d.h) && d.w > 0 && d.h > 0) {
      ED.img = { src: d.image, w: d.w, h: d.h };
      ED.imgEtat = 'ok';
      if (!ED.t.w) Object.assign(ED.t, { w: d.w, h: d.h });
    } else if (d && d.source === 'ign' && ignOk({ z: d.z, x0: d.x0, y0: d.y0, n: d.n }) && Number.isFinite(d.lat) && Number.isFinite(d.lon)) {
      const g = { z: d.z, x0: d.x0, y0: d.y0, n: d.n };
      ED.img = { ign: g, w: g.n * IGN.tuile, h: g.n * IGN.tuile, lat: d.lat, lon: d.lon };
      ED.imgEtat = 'ok';
      if (!ED.t.w) Object.assign(ED.t, { w: ED.img.w, h: ED.img.h });
    } else ED.imgEtat = 'absent';
  }, () => { if (ED.sid === sid) ED.imgEtat = 'erreur-lecture'; }).then(() => { ED.chargement = null; rerenderSoon(); });
}
/* Le tracé est enregistré au fil de l'eau (brouillon) : la carte publiée ne change qu'avec « Publier » */
function edSauve(now) {
  clearTimeout(ED.sauveT);
  ED.sauveT = null;
  const go = () => {
    ED.sauveT = null;
    if (!ED.t || ED.sid !== idEcurie(ecurieOuverte()) || (ED.cadrage && ED.avant)) return;
    putCarte(Object.assign({}, S.carte || {}, { trace: clone(ED.t), tmaj: Date.now() }));
  };
  if (now) go(); else ED.sauveT = setTimeout(go, 1200);
}

/* ---------- L'écran ---------- */
function edEtape() {
  // un plan déjà envoyé se relit dès que la base répond
  if (!ED.img) return ED.imgEtat === 'charge' || ED.imgEtat === 'prep' || (!DB && ED.t && ED.t.w && !ED.imgEtat) ? 'charge' : 'plan';
  if (ED.cadrage && ED.img.ign) return 'cadrage';
  // l'échelle n'est prise qu'une fois sa longueur confirmée (« Valider l'échelle »)
  if (ED.etape === 'echelle' || !edEchelle(ED.t) || !ED.t.ech.ok) return 'echelle';
  if (ED.etape === 'apercu' && planOk(ED.apercu)) return 'apercu';
  return 'trace';
}
const ED_TITRES = { charge: 'Le plan', plan: 'Le plan', cadrage: 'La vue aérienne', echelle: "L'échelle", trace: 'Les espaces', apercu: 'La maquette' };
const ED_PAS = { charge: 1, plan: 1, cadrage: 1, echelle: 2, trace: 3, apercu: 4 };
VIEWS.carteEd = () => {
  const T = { title: 'Ma carte des prés', eyebrow: 'Prés', fab: null };
  if (!edPeut()) return Object.assign(T, { html: emptyH('Réservé à la gérante', "La gérante crée la carte de l'écurie à partir d'un plan.") });
  edPrepare();
  edCharger();
  const et = edEtape();
  if (et === 'apercu') prepPlan('apercu');
  const env = { envoi: 'Envoi du plan…', attente: 'Le plan partira dès que le réseau revient', erreur: 'Plan non envoyé' }[ED.imgEtat];
  const tete = `<div class="ed-tete"><button type="button" class="iconbtn" data-act="ed-fermer" aria-label="Fermer">${ic('close')}</button>
    <div class="ed-titre"><span class="eyebrow">Ma carte des prés · ${ED_PAS[et]}/4</span><b>${ED_TITRES[et]}</b></div>
    ${env ? `<span class="ed-envoi${ED.imgEtat === 'erreur' ? ' err' : ''}">${ED.imgEtat === 'erreur' ? `<button type="button" class="link" data-act="ed-renvoyer">${env} · Réessayer</button>` : env}</span>` : ''}</div>`;
  const zone = et === 'apercu' ? `<div class="carte ed-carte" data-key="carte" data-garde></div>`
    : ED.img ? `<div class="ed-zone" data-key="ed-zone" data-garde></div>`
    : `<div class="ed-vide" data-key="ed-vide">${et === 'charge' ? `<p class="note">${ED.imgEtat === 'prep' ? 'Préparation du plan…' : 'Chargement du plan…'}</p>` : edExigences()}</div>`;
  return Object.assign(T, { html: `<div class="ed ed-${et}" data-key="ed">${tete}${zone}<div class="ed-pan" data-key="ed-pan-${et}">${edPanneau(et)}</div></div>` });
};
/* Ce qu'il faut pour un bon plan : les mêmes exigences que pour la carte d'origine */
function edExigences() {
  return `<div class="ed-exig">
    <h3>Le plan de tes prés</h3>
    <p><b>Le plus simple :</b> cherche l'adresse de l'écurie (ou ta position si tu y es). La vue aérienne de l'IGN arrive avec son échelle et le nord en haut : il ne reste qu'à toucher les coins des prés.</p>
    <p><b>Ou envoie ton propre plan :</b></p>
    <ol>
      <li><b>Une vue du dessus.</b> Une capture de Géoportail (photographies aériennes, conseillé), de Google Maps en vue satellite, ou un plan dessiné à l'échelle.</li>
      <li><b>Tout l'espace, en entier.</b> Tous les prés, la piste, la carrière, les abris et les abreuvoirs.</li>
      <li><b>Une échelle.</b> La barre « 50 m » de Géoportail, ou une longueur que tu connais (une clôture, un bâtiment).</li>
      <li><b>Le nord en haut</b>, si possible : la vue de dessus de la carte sera orientée comme ton plan.</li>
    </ol>
    <p class="small muted">Ensuite tu poses l'échelle et tu touches les coins de chaque pré : compte quelques minutes. Ou bien EquiValdi dessine la carte pour toi à partir du même plan. Le plan reste dans ton écurie.</p>
  </div>`;
}
const edFichierBtn = (txt, cls = 'btn primary') => `<label class="${cls} ed-fichier">${ic('image', 'sm')}${txt}<input type="file" accept="image/*" id="edFichier" hidden></label>`;
function edResume(els) {
  const t = ED_ORDRE.map(ty => { const n = els.filter(e => e.type === ty).length; return n ? `${n} ${n > 1 ? ED_T[ty].pl : ED_T[ty].l.toLowerCase()}` : ''; }).filter(Boolean);
  return t.length ? t.join(' · ') : "Rien de tracé pour l'instant.";
}
function edMesure(e) {
  const s = edEchelle(ED.t);
  if (!s || !e) return '';
  if (ED_SURFACES.includes(e.type) && e.pts.length >= 3) return `≈ ${num(aireP(e.pts) * s * s / 10000, 2)} ha`;
  if (e.type === 'piste' && e.pts.length >= 2) { let L = 0; e.pts.forEach((q, i) => { if (i || e.ferme) L += edDist(q, e.pts[(i - 1 + e.pts.length) % e.pts.length]); }); return `${num(L * s, 0)} m de long`; }
  if (e.type === 'abri' && e.pts.length === 2) { const r = rectAbri(e.pts[0], e.pts[1], edAngle(ED.t.els)); return `${num(edDist(r[0], r[1]) * s, 1)} × ${num(edDist(r[1], r[2]) * s, 1)} m`; }
  return '';
}
const edNumLibre = () => { const pris = new Set(ED.t.els.filter(e => e.type === 'pre').map(e => e.n)); let n = 1; while (pris.has(n)) n++; return n; };
const edNomEl = e => e.type === 'pre' ? `Pré ${e.n}` : ED_T[e.type].l;
// la gérante peut confier le tracé à EquiValdi (pas l'administration elle-même, ni deux fois)
function edDemandable() {
  const e = ecurieOuverte() || {}, d = e.carteDemande;
  return !!ED.img && !e.fantome && e.role === 'gerante' && !(d && d.statut === 'demandee');
}
function edPanneau(et) {
  const e = ecurieOuverte() || {}, t = ED.t;
  if (et === 'charge') return `<p class="note">Un instant…</p>`;
  if (et === 'plan') {
    const G = ED.geo || {};
    const res = (G.res || []).map((r, i) => `<button type="button" class="row" data-act="ed-geo" data-i="${i}">${lead('home')}<div class="row-main"><div class="row-t">${esc(r.label)}</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`).join('');
    return `<div class="ed-ligne ed-adr"><input id="edAdr" value="${esc(G.q || '')}" placeholder="Adresse ou commune de l'écurie" autocomplete="street-address" enterkeyhint="search" aria-label="Adresse de l'écurie">
      <button type="button" class="btn primary" data-act="ed-chercher"${G.charge ? ' disabled' : ''}>${G.charge ? 'Recherche…' : 'Chercher'}</button></div>
      ${res ? `<div class="list">${res}</div>` : G.vide ? `<p class="small muted">Rien trouvé : essaie avec la commune, ou ta position.</p>` : ''}
      <div class="btnrow"><button type="button" class="btn small" data-act="ed-position">${ic('cible', 'sm')}Ma position</button>${edFichierBtn('Envoyer mon plan', 'btn small')}</div>
      ${ED.imgEtat === 'erreur-lecture' ? `<p class="small muted">Le plan déjà envoyé n'a pas pu être relu : vérifie ta connexion, ou choisis-le à nouveau.</p>` : ''}`;
  }
  if (et === 'cadrage') {
    const z = ED.img.ign.z;
    return `<p class="ed-aide"><b>Cadre tes prés.</b> Fais glisser la vue ; les flèches décalent le carré si les prés débordent. Tout doit tenir dedans.</p>
      <div class="ed-fleches">${[['n', '↑', 'Vers le nord'], ['o', '←', "Vers l'ouest"], ['e', '→', "Vers l'est"], ['s', '↓', 'Vers le sud']].map(([d, t, a]) => `<button type="button" class="btn small" data-act="ed-decale" data-d="${d}" aria-label="${a}">${t}</button>`).join('')}
      <button type="button" class="btn small" data-act="ed-ignz" data-z="-1"${z <= IGN.zMin ? ' disabled' : ''}>Plus large</button><button type="button" class="btn small" data-act="ed-ignz" data-z="1"${z >= IGN.zMax ? ' disabled' : ''}>Plus près</button></div>
      ${ED.avant && ED.avant.t.els.length ? `<p class="small muted">Les espaces déjà tracés suivront la nouvelle vue.</p>` : ''}
      <div class="btnrow"><button type="button" class="btn primary" data-act="ed-ign-ok">${ic('check', 'sm')}Utiliser cette vue</button>${ED.avant ? `<button type="button" class="btn small" data-act="ed-recadrer-annuler">Annuler</button>` : ''}${ED.avant && ED.avant.t.els.length ? '' : `<button type="button" class="btn small" data-act="ed-nouveau-plan">Autre adresse</button>`}</div>
      <p class="small muted">≈ ${num(ignMpp(ED.img.lat, z) * ED.img.w, 0)} m de côté · Photographies aériennes © IGN</p>`;
  }
  if (et === 'echelle') {
    const E = t.ech || {}, ok = E.a && E.b;
    return `<p class="ed-aide"><b>Pose l'échelle.</b> ${ok ? 'Ajuste les deux bouts si besoin, puis indique la longueur.' : `Touche les deux bouts de la barre d'échelle${E.a ? ' : encore un' : ''} (ou d'une longueur que tu connais). Écarte deux doigts pour zoomer.`}</p>
      ${ok ? `<div class="ed-ligne"><label for="edM">Cette longueur mesure</label><input id="edM" value="${esc(String(E.m || 50).replace('.', ','))}" inputmode="decimal" autocomplete="off"><span>m</span></div>` : ''}
      <div class="btnrow"><button type="button" class="btn primary" data-act="ed-echelle-ok"${ok ? '' : ' disabled'}>Valider l'échelle</button>
      ${t.els.length ? '' : edFichierBtn('Changer de plan', 'btn small')}
      ${edDemandable() ? `<button type="button" class="btn small" data-act="ed-demander">EquiValdi la dessine pour moi</button>` : ''}</div>`;
  }
  if (et === 'trace') {
    if (ED.cur) {
      const c = ED.cur, d = ED_T[c.type], n = c.pts.length, ok = n >= Math.max(d.min, c.type === 'piste' ? 2 : d.min);
      return `<p class="ed-aide"><b>${esc(edNomEl(c))}${n ? ` · ${n} ${pl(n, 'point')}` : ''}</b> ${esc(d.aide)}</p>
        <div class="btnrow">${d.max ? '' : `<button type="button" class="btn primary" data-act="ed-fini"${ok ? '' : ' disabled'}>${ic('check', 'sm')}Terminer</button>`}
        <button type="button" class="btn small" data-act="ed-retire"${n ? '' : ' disabled'}>${ic('undo', 'sm')}Retirer le point</button>
        <button type="button" class="btn small" data-act="ed-abandon">Abandonner</button></div>`;
    }
    const s = ED.sel && edEl(ED.sel);
    if (s) {
      const m = edMesure(s);
      const champ = s.type === 'pre' ? `<div class="ed-ligne"><label for="edNum">Numéro du pré</label><input id="edNum" value="${s.n}" inputmode="numeric" autocomplete="off"></div>`
        : s.type === 'piste' ? `<div class="ed-ligne"><label for="edLarg">Largeur</label><input id="edLarg" value="${esc(String(s.larg || 4).replace('.', ','))}" inputmode="decimal" autocomplete="off"><span>m</span></div>` : '';
      const doublon = s.type === 'pre' && t.els.some(o => o !== s && o.type === 'pre' && o.n === s.n);
      return `<p class="ed-aide"><b>${esc(edNomEl(s))}</b>${m ? ` ${m} ·` : ''} Fais glisser les points pour les ajuster${ED_SURFACES.includes(s.type) || s.type === 'piste' ? ', ou les petits points du milieu pour en ajouter' : ''}.</p>
        ${champ}${doublon ? `<p class="small" style="color:var(--danger)">Un autre pré porte déjà le numéro ${s.n}.</p>` : ''}
        <div class="btnrow">${s.type === 'pre' ? `<button type="button" class="btn primary" data-act="ed-ajout" data-type="pre">${ic('plus', 'sm')}Pré suivant</button>` : ''}
        <button type="button" class="btn small${s.type === 'pre' ? '' : ' primary'}" data-act="ed-ok">${ic('check', 'sm')}OK</button>
        ${ED.som != null && s.pts.length > Math.max(3, ED_T[s.type].min) ? `<button type="button" class="btn small" data-act="ed-retire-som">Retirer ce point</button>` : ''}
        <button type="button" class="btn small danger" data-act="ed-suppr" data-confirm="Supprimer ${esc(edNomEl(s).toLowerCase())} ?">${ic('trash', 'sm')}Supprimer</button></div>`;
    }
    const d = e.carteDemande, note = e.fantome && d && d.statut === 'demandee'
      ? `<div class="ed-demande"><b>Demande de ${esc((d.par && d.par.nom) || 'la gérante')}</b> · ${esc(dJour(d.le))}${d.note ? `<p>« ${esc(d.note)} »</p>` : ''}</div>` : '';
    const zonesOk = t.els.some(x => x.type !== 'abri' && x.type !== 'eau');
    return `${note}<p class="ed-aide"><b>Ajoute chaque espace</b> en touchant ses coins sur le plan, puis regarde la maquette. ${esc(edResume(t.els))}</p>
      <div class="ed-ajout">${ED_ORDRE.map(ty => `<button type="button" class="chip" data-act="ed-ajout" data-type="${ty}"><i class="ed-pastille et-${ty}"></i>${ED_T[ty].l}</button>`).join('')}</div>
      <div class="btnrow"><button type="button" class="btn primary" data-act="ed-apercu"${zonesOk ? '' : ' disabled'}>Voir la maquette</button>
      ${ED.img && ED.img.ign ? `<button type="button" class="btn small" data-act="ed-recadrer">${ic('cible', 'sm')}Recadrer la vue</button>` : `<button type="button" class="btn small" data-act="ed-reechelle">${ic('regle', 'sm')}Échelle</button>`}
      ${edDemandable() ? `<button type="button" class="btn small" data-act="ed-demander">EquiValdi la dessine pour moi</button>` : ''}
      ${t.els.length ? `<button type="button" class="btn small" data-act="ed-nouveau-plan" data-confirm="Effacer le tracé ?">Changer de plan</button>` : ''}</div>`;
  }
  // la maquette
  const P = ED.apercu, L = liensCarte();
  const sp = P.zones.filter(z => z.type === 'pre'), ha = P.zones.reduce((a, z) => a + (z.type === 'piste' ? 0 : z.aire), 0) / 10000;
  const manque = P.zones.filter(z => z.type !== 'verger' && !L.has(z.id));
  const nums = sp.map(z => z.n), doublons = nums.filter((n, i) => nums.indexOf(n) !== i);
  return `<p class="ed-aide"><b>${sp.length} ${pl(sp.length, 'pré')}, ≈ ${num(ha, 2)} ha en tout.</b> Si la surface te paraît fausse, revois l'échelle. « Tourner » montre la maquette sous un autre angle.</p>
    ${doublons.length ? `<p class="small" style="color:var(--danger)">Plusieurs prés portent le numéro ${[...new Set(doublons)].join(', ')}.</p>` : ''}
    ${manque.length ? `<label class="check"><input type="checkbox" id="edCreerPres" checked> Ajouter au carnet ${manque.length > 1 ? `les ${manque.length} espaces` : "l'espace"} qui ${manque.length > 1 ? "n'y sont" : "n'y est"} pas encore (${esc(manque.slice(0, 4).map(z => z.type === 'pre' ? `Pré ${z.n}` : zoneNom(z)).join(', '))}${manque.length > 4 ? '…' : ''})</label>` : ''}
    <div class="btnrow"><button type="button" class="btn primary" data-act="ed-publier">${ic('check', 'sm')}Publier la carte</button>
    <button type="button" class="btn small" data-act="ed-tourner">${ic('tourner', 'sm')}Tourner</button>
    <button type="button" class="btn small" data-act="ed-retour">Revenir au plan</button></div>`;
}

/* ---------- Le plan à l'écran : image, tracé, poignées ---------- */
function majEditeur() {
  const ed = document.querySelector('#view .ed');
  document.body.classList.toggle('ed-ouvert', !!ed);
  if (!ed) { if (ED.ro) { ED.ro.disconnect(); ED.ro = null; } ED.host = null; ED.svg = null; return; }
  if (ED.imgEtat === 'attente' && DB) edEnvoyerPlan();
  const host = ed.querySelector('.ed-zone');
  if (!host || !ED.img) { ED.host = null; ED.svg = null; return; }
  if (host !== ED.host || !host.querySelector('svg')) { edMonte(host); return; }
  edDessine();
}
function edMonte(host) {
  ED.host = host;
  host.innerHTML = `<svg class="ed-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ton plan"><image class="ed-img" x="0" y="0" width="${Number(ED.img.w)}" height="${Number(ED.img.h)}" preserveAspectRatio="none"/><g class="ed-els"></g><g class="ed-curg"></g><g class="ed-ech"></g><g class="ed-hs"></g></svg>
    <div class="ed-outils c-zoom"><button type="button" data-edzoom="1" aria-label="Rapprocher">${ic('plus', 'sm')}</button><button type="button" data-edzoom="-1" aria-label="Éloigner">${ic('minus', 'sm')}</button><button type="button" data-edzoom="0" aria-label="Tout voir">${ic('cible', 'sm')}</button></div>`;
  ED.svg = host.querySelector('svg');
  if (ED.img.ign) {
    // les tuiles de l'IGN, posées côte à côte (adresses construites avec des nombres seulement)
    const g = ED.img.ign, T = IGN.tuile, im = ED.svg.querySelector('.ed-img'), NS = 'http://www.w3.org/2000/svg';
    for (let j = 0; j < g.n; j++) for (let i = 0; i < g.n; i++) {
      const t = document.createElementNS(NS, 'image');
      ['x', i * T, 'y', j * T, 'width', T + .5, 'height', T + .5].reduce((a, v, k, l) => { if (k % 2 === 0) t.setAttribute(v, l[k + 1]); return a; }, 0);
      t.setAttribute('preserveAspectRatio', 'none');
      t.setAttribute('class', 'ed-tuile');
      t.setAttribute('href', ignUrl(g.z, g.x0 + i, g.y0 + j));
      im.parentNode.insertBefore(t, im);
    }
    im.remove();
    host.insertAdjacentHTML('beforeend', '<span class="ed-credit">© IGN</span>');
  } else ED.svg.querySelector('.ed-img').setAttribute('href', ED.img.src);   // l'image du plan : jamais écrite dans le HTML
  host.querySelectorAll('[data-edzoom]').forEach(b => b.addEventListener('click', () => {
    const z = Number(b.dataset.edzoom);
    if (!z) ED.vue = null; else edZoomA(ED.W / 2, ED.H / 2, z > 0 ? 1.6 : 1 / 1.6);
    edApplique(true);
  }));
  edGestes(ED.svg);
  if (ED.ro) ED.ro.disconnect();
  if (window.ResizeObserver) { ED.ro = new ResizeObserver(() => { if (ED.host === host && host.isConnected && edTaille()) edApplique(true); }); ED.ro.observe(host); }
  edTaille();
  edApplique(true);
}
function edTaille() {
  if (!ED.host) return false;
  const r = ED.host.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height);
  if (!W || !H || (W === ED.W && H === ED.H)) return false;
  ED.W = W; ED.H = H;
  return true;
}
const edFit = () => Math.min(ED.W / ED.img.w, ED.H / ED.img.h) || 1;
function edVue() { if (!ED.vue) ED.vue = { k: 1, cx: ED.img.w / 2, cy: ED.img.h / 2 }; return ED.vue; }
function edVB() { const v = edVue(), k = edFit() * v.k, w = ED.W / k, h = ED.H / k; return { x: v.cx - w / 2, y: v.cy - h / 2, w, h, k }; }
function edBorne() { const v = edVue(); v.k = Math.min(14, Math.max(1, v.k)); v.cx = Math.min(ED.img.w, Math.max(0, v.cx)); v.cy = Math.min(ED.img.h, Math.max(0, v.cy)); }
function edApplique(redessine) {
  if (!ED.svg || !ED.W) return;
  edBorne();
  const vb = edVB();
  ED.svg.setAttribute('viewBox', `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
  if (redessine) edDessine();
}
function edZoomA(sx, sy, f) {
  const v = edVue(), vb = edVB(), ux = vb.x + sx / vb.k, uy = vb.y + sy / vb.k;
  v.k = Math.min(14, Math.max(1, v.k * f));
  const k2 = edFit() * v.k;
  v.cx = ux - sx / k2 + ED.W / k2 / 2;
  v.cy = uy - sy / k2 + ED.H / k2 / 2;
}
function edDessine() {
  if (!ED.svg || !ED.img || !ED.W) return;
  const vb = edVB(), k = vb.k, s = edEchelle(ED.t), et = edEtape(), th = edAngle(ED.t.els);
  const P = q => `${r1(q[0])},${r1(q[1])}`, pts = l => l.map(P).join(' ');
  const centre = l => [l.reduce((a, q) => a + q[0], 0) / l.length, l.reduce((a, q) => a + q[1], 0) / l.length];
  const larg = e => s ? Math.max(2 / k, (e.larg || 4) / s) : 8 / k;
  let els = '', labs = '';
  ED.t.els.forEach(e => {
    const sel = ED.sel === e.id ? ' sel' : '';
    if (e.type === 'eau') { if (e.pts[0]) els += `<circle class="ed-el et-eau${sel}" data-el="${e.id}" cx="${r1(e.pts[0][0])}" cy="${r1(e.pts[0][1])}" r="${r1(7 / k)}"/>`; return; }
    if (e.type === 'abri') { if (e.pts.length === 2) els += `<polygon class="ed-el et-abri${sel}" data-el="${e.id}" points="${pts(rectAbri(e.pts[0], e.pts[1], th))}"/>`; return; }
    if (e.type === 'piste') {
      const tag = e.ferme ? 'polygon' : 'polyline';
      els += `<${tag} class="ed-piste${sel}" data-el="${e.id}" points="${pts(e.pts)}" style="stroke-width:${r1(larg(e))}px"/><${tag} class="ed-piste-c" points="${pts(e.pts)}"/>`;
      return;
    }
    els += `<polygon class="ed-el et-${e.type}${sel}" data-el="${e.id}" points="${pts(e.pts)}"/>`;
    const c = centre(e.pts);
    labs += `<text class="ed-n" x="${r1(c[0])}" y="${r1(c[1])}" style="font-size:${r1((e.type === 'pre' ? 17 : 12) / k)}px;stroke-width:${Math.max(.1, r1(3 / k))}px">${e.type === 'pre' ? e.n : esc(ED_T[e.type].l)}</text>`;
  });
  ED.svg.querySelector('.ed-els').innerHTML = els + labs;
  // l'espace en cours de tracé
  let cur = '';
  const c = ED.cur;
  if (c && c.pts.length) {
    if (c.type === 'piste') cur += `<polyline class="ed-piste" points="${pts(c.pts)}" style="stroke-width:${r1(larg(c))}px"/>`;
    if (c.type === 'abri' && c.pts.length === 2) cur += `<polygon class="ed-el et-abri" points="${pts(rectAbri(c.pts[0], c.pts[1], th))}"/>`;
    if (ED_SURFACES.includes(c.type) && c.pts.length >= 3) cur += `<polygon class="ed-el et-${c.type} ed-encours" points="${pts(c.pts)}"/>`;
    cur += `<polyline class="ed-cur" points="${pts(c.pts)}"/>`;
  }
  ED.svg.querySelector('.ed-curg').innerHTML = cur;
  // l'échelle
  let ech = '';
  const E = ED.t.ech;
  if (et === 'echelle' && E) {
    if (E.a && E.b) {
      const m = [(E.a[0] + E.b[0]) / 2, (E.a[1] + E.b[1]) / 2];
      ech += `<line class="ed-ech-l" x1="${r1(E.a[0])}" y1="${r1(E.a[1])}" x2="${r1(E.b[0])}" y2="${r1(E.b[1])}"/><text class="ed-n ed-ech-t" x="${r1(m[0])}" y="${r1(m[1] - 16 / k)}" style="font-size:${r1(15 / k)}px;stroke-width:${Math.max(.1, r1(3 / k))}px">${E.m > 0 ? esc(num(E.m, 1)) + ' m' : '? m'}</text>`;
    }
    ['a', 'b'].forEach(w => { if (E[w]) ech += `<circle class="ed-h ech" data-ech="${w}" cx="${r1(E[w][0])}" cy="${r1(E[w][1])}" r="${r1(11 / k)}"/>`; });
  }
  ED.svg.querySelector('.ed-ech').innerHTML = ech;
  // les poignées : points du tracé en cours, ou de l'espace choisi (et les petits points du milieu pour en ajouter)
  let hs = '';
  const poignees = (l, id, milieux, ferme) => {
    if (milieux) l.forEach((q, i) => {
      if (!ferme && i === l.length - 1) return;
      const n = l[(i + 1) % l.length];
      hs += `<circle class="ed-m" data-m="${id}:${i}" cx="${r1((q[0] + n[0]) / 2)}" cy="${r1((q[1] + n[1]) / 2)}" r="${r1(7 / k)}"/>`;
    });
    l.forEach((q, i) => {
      const premier = id === 'cur' && i === 0 && l.length >= 3 && c && c.type !== 'abri';
      hs += `<circle class="ed-h${premier ? ' premier' : ''}${id === ED.sel && ED.som === i ? ' actif' : ''}" data-h="${id}:${i}" cx="${r1(q[0])}" cy="${r1(q[1])}" r="${r1((premier ? 12 : 9) / k)}"/>`;
    });
  };
  if (et === 'trace') {
    if (c) poignees(c.pts, 'cur', false, false);
    else if (ED.sel) {
      const e = edEl(ED.sel);
      if (e) poignees(e.pts, e.id, ED_SURFACES.includes(e.type) || e.type === 'piste', e.type !== 'piste' || e.ferme);
    }
  }
  ED.svg.querySelector('.ed-hs').innerHTML = hs;
}
/* Un coin posé près d'un coin (ou d'un bord) d'un pré, d'une carrière ou d'un verger déjà tracés s'y accroche :
   les clôtures voisines se rejoignent. Plus on zoome, plus l'aimant est fin (il se mesure à l'écran). */
function aimante(p, exclu) {
  const k = edVB().k;
  let best = null, bd = 13 / k;
  ED.t.els.forEach(e => {
    if (e === exclu || !ED_SURFACES.includes(e.type)) return;
    e.pts.forEach(q => { const d = edDist(p, q); if (d < bd) { bd = d; best = [q[0], q[1]]; } });
  });
  if (best) return best;
  bd = 8 / k;
  ED.t.els.forEach(e => {
    if (e === exclu || !ED_SURFACES.includes(e.type)) return;
    e.pts.forEach((a, i) => { const q = projSeg(p, a, e.pts[(i + 1) % e.pts.length]), d = edDist(p, q); if (d < bd) { bd = d; best = q; } });
  });
  return best || p;
}
function edGestes(svg) {
  const pts = new Map();
  let g = null;
  const loc = e => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const versImage = ([sx, sy]) => { const vb = edVB(); return [vb.x + sx / vb.k, vb.y + sy / vb.k]; };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    try { svg.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
    pts.set(e.pointerId, loc(e));
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g = { type: 'pince', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k0: edVue().k, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
      return;
    }
    const h = e.target.closest && e.target.closest('[data-h],[data-m],[data-ech]');
    g = { type: 'attente', x0: e.clientX, y0: e.clientY, last: loc(e), cible: e.target,
      po: h ? { h: h.getAttribute('data-h'), m: h.getAttribute('data-m'), ech: h.getAttribute('data-ech') } : null };
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = loc(e);
    pts.set(e.pointerId, p);
    if (!g) return;
    if (g.type === 'pince') {
      if (pts.size < 2) return;
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const v = edVue(), k1 = edVB().k;
      v.cx -= (m[0] - g.m[0]) / k1; v.cy -= (m[1] - g.m[1]) / k1;
      g.m = m;
      edZoomA(m[0], m[1], g.k0 * d / g.d0 / v.k);
      edApplique(true);
      return;
    }
    if (g.type === 'attente' && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 6) g.type = g.po && edEtape() !== 'apercu' ? 'poignee' : 'pan';
    if (g.type === 'pan') {
      const v = edVue(), k = edVB().k;
      v.cx -= (p[0] - g.last[0]) / k; v.cy -= (p[1] - g.last[1]) / k;
      edApplique(false);
    } else if (g.type === 'poignee') edBouge(g.po, versImage(p));
    g.last = p;
  });
  const fin = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!g) return;
    if (g.type === 'pince') { if (!pts.size) g = null; return; }
    if (g.type === 'poignee') { edFinBouge(); g = null; return; }
    if (g.type === 'attente' && e.type === 'pointerup') edTape(versImage(loc(e)), g.po, g.cible);
    g = null;
  };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', fin);
  svg.addEventListener('wheel', e => { e.preventDefault(); const p = loc(e); edZoomA(p[0], p[1], Math.exp(-e.deltaY * .0022)); edApplique(true); }, { passive: false });
}
function edTape(p, po, cible) {
  const et = edEtape(), t = ED.t;
  if (et === 'echelle') {
    if (po && po.ech) return;
    t.ech = t.ech || { a: null, b: null, m: 50 };
    if (!t.ech.a) t.ech.a = p;
    else if (!t.ech.b) t.ech.b = p;
    else t.ech[edDist(p, t.ech.a) < edDist(p, t.ech.b) ? 'a' : 'b'] = p;
    t.ech.a = t.ech.a && t.ech.a.map(r1); t.ech.b = t.ech.b && t.ech.b.map(r1);
    vibre(8); edSauve(); edDessine(); render();
    return;
  }
  if (et !== 'trace') return;
  const k = edVB().k, c = ED.cur;
  if (c) {
    const d = ED_T[c.type];
    // toucher le premier point (sa poignée, 12 px à l'écran) ferme le tracé ; un coin voisin, même proche, s'ajoute
    if (!d.max && c.pts.length >= 3 && edDist(p, c.pts[0]) * k < 14) { if (c.type === 'piste') c.ferme = true; edFinir(); return; }
    const q = ED_SURFACES.includes(c.type) ? aimante(p, null) : p;
    if (c.pts.some(r => edDist(r, q) * k < 4)) return;   // le même point touché deux fois : pas de doublon
    c.pts.push(q);
    vibre(6);
    if (d.max && c.pts.length >= d.max) { edFinir(); return; }
    edDessine(); render();
    return;
  }
  if (po && po.h) { const [id, i] = po.h.split(':'); if (id === ED.sel) { ED.som = Number(i); edDessine(); render(); } return; }
  if (po && po.m) {
    const [id, i] = po.m.split(':'), e = edEl(id);
    if (e) { const j = Number(i), n = e.pts[(j + 1) % e.pts.length]; e.pts.splice(j + 1, 0, [r1((e.pts[j][0] + n[0]) / 2), r1((e.pts[j][1] + n[1]) / 2)]); ED.som = j + 1; edSauve(); edDessine(); render(); }
    return;
  }
  const el = cible && cible.closest && cible.closest('[data-el]');
  ED.sel = el ? el.getAttribute('data-el') : null;
  ED.som = null;
  vibre(6); edDessine(); render();
}
function edBouge(po, p) {
  if (po.ech) { ED.t.ech[po.ech] = p; edDessine(); return; }
  if (po.m) {
    const [id, i] = po.m.split(':'), e = edEl(id);
    if (!e) return;
    const j = Number(i);
    e.pts.splice(j + 1, 0, p);
    po.m = null; po.h = id + ':' + (j + 1); ED.sel = id; ED.som = j + 1;
  }
  if (po.h) {
    const [id, i] = po.h.split(':'), j = Number(i), e = id === 'cur' ? ED.cur : edEl(id);
    if (!e || !e.pts[j]) return;
    e.pts[j] = ED_SURFACES.includes(e.type) ? aimante(p, e) : p;
    edDessine();
  }
}
function edFinBouge() {
  const ar = l => l.forEach((q, i) => { l[i] = q.map(r1); });
  if (ED.t.ech) ['a', 'b'].forEach(w => { if (ED.t.ech[w]) ED.t.ech[w] = ED.t.ech[w].map(r1); });
  ED.t.els.forEach(e => ar(e.pts));
  if (ED.cur) ar(ED.cur.pts);
  edSauve(); edDessine(); render();
}
function edFinir() {
  const c = ED.cur;
  if (!c) return;
  ED.cur = null;
  if (c.pts.length < ED_T[c.type].min) { render(); return; }
  const e = { id: edId(), type: c.type, pts: c.pts.map(q => q.map(r1)) };
  if (c.type === 'pre') e.n = c.n;
  if (c.type === 'piste') { e.larg = c.larg || 4; e.ferme = !!c.ferme; }
  ED.t.els.push(e);
  ED.sel = e.id; ED.som = null;
  vibre(12); edSauve(); edDessine(); render();
}

/* ---------- Boutons ---------- */
ACT['ed-ajout'] = d => {
  if (!ED_T[d.type] || !ED.t) return;
  ED.sel = null; ED.som = null;
  ED.cur = { type: d.type, pts: [] };
  if (d.type === 'pre') ED.cur.n = edNumLibre();
  if (d.type === 'piste') ED.cur.larg = 4;
  render(); edDessine();
};
ACT['ed-fini'] = () => edFinir();
ACT['ed-retire'] = () => { if (ED.cur && ED.cur.pts.length) { ED.cur.pts.pop(); edDessine(); render(); } };
ACT['ed-abandon'] = () => { ED.cur = null; edDessine(); render(); };
ACT['ed-ok'] = () => { ED.sel = null; ED.som = null; edDessine(); render(); };
ACT['ed-suppr'] = () => { if (!ED.sel) return; ED.t.els = ED.t.els.filter(e => e.id !== ED.sel); ED.sel = null; ED.som = null; edSauve(); edDessine(); render(); };
ACT['ed-retire-som'] = () => {
  const e = edEl(ED.sel);
  if (!e || ED.som == null || e.pts.length <= Math.max(3, ED_T[e.type].min)) return;
  e.pts.splice(ED.som, 1); ED.som = null;
  edSauve(); edDessine(); render();
};
ACT['ed-echelle-ok'] = () => {
  const E = ED.t.ech, inp = $('#edM'), m = inp ? parseNum(inp.value) : E && E.m;
  if (!E || !E.a || !E.b) return;
  if (!(m > 0) || m > 5000) { toast('Indique la longueur en mètres (par exemple 50).', { danger: true }); return; }
  E.m = m;
  E.ok = true;
  if (!edEchelle(ED.t)) { toast("Les deux bouts sont trop proches : zoome et pose-les aux deux extrémités de l'échelle.", { danger: true }); return; }
  ED.etape = 'trace';
  edSauve(true); render();
};
ACT['ed-reechelle'] = () => { ED.cur = null; ED.sel = null; ED.etape = 'echelle'; render(); };
ACT['ed-nouveau-plan'] = () => {
  Object.assign(ED, { img: null, imgEtat: 'absent', vue: null, etape: null, cur: null, sel: null, som: null, apercu: null, cadrage: false, geo: null, avant: null, t: { w: 0, h: 0, ech: null, rot: 0, els: [] } });
  edSauve(true); render();
};
ACT['ed-renvoyer'] = () => { edEnvoyerPlan(); render(); };
/* ----- Vue aérienne de l'IGN ----- */
function edCadrer(lat, lon, z = IGN.z) {
  const c = ignCadre(lat, lon, z);
  Object.assign(ED, { img: c.img, imgEtat: '', cadrage: true, geo: null, etape: null, cur: null, sel: null, som: null, apercu: null, vue: { k: 1.4, cx: c.cx, cy: c.cy }, t: { w: c.img.w, h: c.img.h, ech: null, rot: 0, els: [] } });
  render();
}
ACT['ed-chercher'] = async () => {
  const q = (val('edAdr') || '').trim();
  if (q.length < 3) { toast("Écris l'adresse ou la commune de l'écurie.", { danger: true }); return; }
  ED.geo = { q, charge: true }; render();
  try {
    const r = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=5`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const res = (j.features || []).map(f => ({ label: String((f.properties && f.properties.label) || '').slice(0, 120), lon: Number(f.geometry && f.geometry.coordinates[0]), lat: Number(f.geometry && f.geometry.coordinates[1]) }))
      .filter(x => x.label && Number.isFinite(x.lat) && Number.isFinite(x.lon) && Math.abs(x.lat) < 85);
    if (res.length === 1) { edCadrer(res[0].lat, res[0].lon); return; }
    ED.geo = { q, res, vide: !res.length };
  } catch (e) {
    ED.geo = { q };
    toast("La recherche n'a pas marché : vérifie ta connexion, ou utilise ta position.", { danger: true });
  }
  render();
};
ACT['ed-geo'] = d => { const r = ED.geo && ED.geo.res && ED.geo.res[Number(d.i)]; if (r) edCadrer(r.lat, r.lon); };
ACT['ed-position'] = () => {
  if (!navigator.geolocation) { toast("Ce téléphone ne donne pas sa position : cherche l'adresse.", { danger: true }); return; }
  toast('Recherche de ta position…');
  navigator.geolocation.getCurrentPosition(p => edCadrer(p.coords.latitude, p.coords.longitude),
    () => toast("Position refusée ou introuvable : cherche plutôt l'adresse.", { danger: true }), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
};
// le centre de la vue, en coordonnées géographiques
function edCentre() {
  const g = ED.img.ign, v = edVue();
  return { lon: xLon(g.x0 + v.cx / IGN.tuile, g.z), lat: yLat(g.y0 + v.cy / IGN.tuile, g.z) };
}
ACT['ed-decale'] = d => {
  if (!ED.img || !ED.img.ign) return;
  const g = ED.img.ign, k = { n: [0, -1], s: [0, 1], o: [-1, 0], e: [1, 0] }[d.d] || [0, 0], c = edCentre();
  const T = IGN.tuile, x = lonX(c.lon, g.z) + k[0], y = latY(c.lat, g.z) + k[1];
  edCadrer(yLat(y, g.z), xLon(x, g.z), g.z);
  ED.vue.k = edVue().k;
};
ACT['ed-ignz'] = d => {
  if (!ED.img || !ED.img.ign) return;
  const z = Math.min(IGN.zMax, Math.max(IGN.zMin, ED.img.ign.z + Number(d.z))), c = edCentre();
  edCadrer(c.lat, c.lon, z);
};
// revenir à la vue aérienne depuis le tracé, autour de ce qu'on regarde ; le tracé est gardé de côté
ACT['ed-recadrer'] = () => {
  if (!ED.img || !ED.img.ign || ED.cur) return;
  const c = edCentre();
  ED.avant = { img: ED.img, t: clone(ED.t), vue: ED.vue ? Object.assign({}, ED.vue) : null };
  edCadrer(c.lat, c.lon, ED.img.ign.z);
};
ACT['ed-recadrer-annuler'] = () => {
  const a = ED.avant;
  if (!a) return;
  Object.assign(ED, { img: a.img, t: a.t, vue: a.vue, cadrage: false, avant: null, etape: null, cur: null, sel: null, som: null, apercu: null });
  render();
};
// un point de l'ancienne vue dans la nouvelle (coordonnées des tuiles, d'un niveau de zoom à l'autre)
function edReporter(p, de, vers) {
  const f = 2 ** (vers.z - de.z), T = IGN.tuile;
  return [r1((de.x0 * T + p[0]) * f - vers.x0 * T), r1((de.y0 * T + p[1]) * f - vers.y0 * T)];
}
ACT['ed-ign-ok'] = () => {
  if (!ED.img || !ED.img.ign) return;
  const im = ED.img, mpp = ignMpp(im.lat, im.ign.z), L = 50 / mpp, a = [r1(im.w * .06), r1(im.h * .94)];
  // l'échelle est connue : une barre de 50 m posée en bas à gauche, déjà validée
  ED.t = { w: im.w, h: im.h, ech: { a, b: [r1(a[0] + L), a[1]], m: 50, ok: true }, rot: 0, els: [] };
  const av = ED.avant;
  let hors = 0;
  if (av && av.img && av.img.ign && av.t.els.length) {
    ED.t.rot = av.t.rot || 0;
    ED.t.els = av.t.els.map(e => Object.assign({}, e, { pts: e.pts.map(p => edReporter(p, av.img.ign, im.ign)) }));
    hors = ED.t.els.filter(e => e.pts.some(([x, y]) => x < 0 || y < 0 || x > im.w || y > im.h)).length;
  }
  Object.assign(ED, { cadrage: false, avant: null, etape: null, cur: null, sel: null, som: null, apercu: null });
  edEnvoyerPlan();
  edSauve(true);
  render();
  toast(hors ? `Vue changée. ${hors} ${pl(hors, 'espace')} dépasse${hors > 1 ? 'nt' : ''} du carré : décale la vue ou ajuste ${hors > 1 ? 'leurs' : 'ses'} points.`
    : av && av.t.els.length ? 'Vue changée : tes espaces ont suivi.' : "Vue enregistrée, avec son échelle. Ajoute maintenant tes prés.", hors ? { danger: true } : undefined);
};
ACT['ed-apercu'] = () => {
  const p = planDepuisTrace(ED.t);
  if (!p) { toast('Trace au moins un pré, la carrière ou la piste.', { danger: true }); return; }
  ED.apercu = p; ED.apercuV++; ED.etape = 'apercu'; ED.sel = null; ED.cur = null;
  render();
};
ACT['ed-tourner'] = () => {
  ED.t.rot = ((ED.t.rot || 0) + 1) % 4;
  ED.apercu = planDepuisTrace(ED.t); ED.apercuV++;
  edSauve(); render();
};
ACT['ed-retour'] = () => { ED.etape = 'trace'; ED.apercu = null; render(); };
ACT['ed-publier'] = () => {
  const plan = ED.apercu;
  if (!planOk(plan) || !edPeut()) return;
  const creer = !!($('#edCreerPres') && $('#edCreerPres').checked);
  clearTimeout(ED.sauveT); ED.sauveT = null;
  putCarte(Object.assign({}, S.carte || {}, { plan, trace: clone(ED.t), publie: Date.now(), par: moiRef() }));
  if (creer) {
    prepPlan('ecurie');
    const L = liensCarte();
    PLAN.zones.filter(z => z.type !== 'verger' && !L.has(z.id)).forEach(z => put('pres', {
      type: z.type === 'pre' ? 'pre' : z.type, nom: z.type === 'pre' ? `Pré ${z.n}` : zoneNom(z), surface: zoneHa(z), repos: null, paturage: null, notes: '', carte: z.id
    }));
  }
  if (window.EQ && EQ.carteFaite) EQ.carteFaite().catch(() => {});
  ED.apercu = null; ED.etape = null;
  nav.stack = nav.stack.filter(x => x.view !== 'carteEd');
  nav.tab = 'pres'; ui.tab = 'pres'; ui.presVue = 'carte'; saveUi();
  entree = 'back';
  render();
  window.scrollTo(0, 0);
  toast('Ta carte des prés est prête !', { fete: true });
};
/* EquiValdi la dessine : la demande part avec le plan déjà envoyé */
ACT['ed-demander'] = () => {
  const e = ecurieOuverte();
  if (!ED.img || !window.EQ || !e || e.role !== 'gerante') return;
  if (ED.imgEtat === 'erreur' || ED.imgEtat === 'attente') edEnvoyerPlan();
  openSheet('EquiValdi dessine ta carte', `
    <p class="note" style="color:var(--ink)">On trace ta carte à partir de ton plan, avec les mêmes exigences que la carte d'origine : chaque pré à sa place et numéroté, la piste, la carrière, le verger, les abris et les abreuvoirs. Elle apparaîtra dans l'onglet Prés, pour toute l'équipe.</p>
    ${fld('Ce qu’il faut savoir', area('edNote', '', 'rows="4" maxlength="800" placeholder="Les numéros de tes prés, où sont la piste, la carrière, les abris et les abreuvoirs…"'))}
    <p class="hint">Le plus sûr : avant d'envoyer ta capture, entoure chaque pré et écris son numéro (outil « Annoter » du téléphone), et marque la piste, la carrière, les abris et les abreuvoirs. Sinon, décris-les ici.</p>`, {
    submit: 'Envoyer la demande',
    onSubmit: () => envoi(EQ.demanderCarte(val('edNote'), moiRef()), () => {
      closeSheet();
      if (ED.sauveT) edSauve(true);
      ED.cur = null; ED.sel = null;
      nav.stack = nav.stack.filter(x => x.view !== 'carteEd');
      nav.tab = 'pres'; ui.tab = 'pres'; ui.presVue = 'carte'; saveUi();
      entree = 'back'; render();
      toast("C'est demandé : ta carte apparaîtra dans l'onglet Prés dès qu'elle sera prête.");
    }, "La demande n'a pas pu être envoyée : vérifie ta connexion.")
  });
};
/* Les champs du panneau (échelle, numéro, largeur) et le choix du plan */
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'edM' && ED.t && ED.t.ech) { const v = parseNum(e.target.value); if (v > 0) { ED.t.ech.m = v; edDessine(); } }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'edAdr') { e.preventDefault(); ACT['ed-chercher'](); } });
document.addEventListener('change', e => {
  const id = e.target && e.target.id;
  if (id === 'edFichier') { const f = e.target.files && e.target.files[0]; e.target.value = ''; edFichier(f); return; }
  if (id === 'edNum') {
    const el = edEl(ED.sel), v = parseNum(e.target.value);
    if (el && el.type === 'pre' && v != null && v >= 1 && v <= 999) { el.n = Math.round(v); edSauve(); edDessine(); }
    render();
    return;
  }
  if (id === 'edLarg') {
    const el = edEl(ED.sel), v = parseNum(e.target.value);
    if (el && el.type === 'piste' && v != null && v >= 1 && v <= 30) { el.larg = v; edSauve(); edDessine(); }
    render();
  }
});
