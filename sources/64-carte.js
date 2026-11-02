
/* ---------- Carte des prés ----------
   Le plan dessiné par Célia sur la vue aérienne, relevé en mètres : 13 parcelles, la carrière (2), le verger,
   la piste, trois abris et deux abreuvoirs. Vue en 3D isométrique façon maquette, ou vue de dessus.
   Chaque parcelle se relie à un pré du carnet : sa couleur dit où en est la rotation, les chevaux y sont posés
   et changent de pré quand on les fait glisser. Repère : x le long du parcellaire, y en travers (mètres). */
const PLAN = {"beta":23.59,"zones":[{"id":"p1","type":"pre","pts":[[72.7,-32.4],[62.7,-41.0],[38.6,-41.5],[34.8,-42.5],[21.9,-40.8],[20.5,-34.4],[20.5,-23.2],[23.8,-22.2],[70.6,-21.0],[72.9,-21.6],[73.5,-23.0]],"lab":[52.0,-31.4],"n":1,"aire":985},{"id":"p3","type":"pre","pts":[[82.0,10.0],[76.9,10.1],[74.3,9.0],[31.7,11.6],[30.2,21.7],[26.5,26.9],[34.3,27.3],[74.5,22.4],[81.5,22.4],[83.0,19.5]],"lab":[38.2,18.9],"n":3,"aire":754},{"id":"p4","type":"pre","pts":[[121.4,26.9],[120.1,26.1],[104.8,26.5],[94.9,25.0],[74.8,25.1],[43.2,27.2],[23.3,30.4],[13.3,30.9],[11.3,32.9],[11.0,42.6],[12.9,43.6],[43.3,41.9],[48.1,42.7],[76.5,41.5],[114.6,41.5],[120.1,40.2],[121.1,37.8]],"lab":[80.3,33.3],"n":4,"aire":1658},{"id":"p5","type":"pre","pts":[[123.9,-48.4],[111.7,-50.5],[106.6,-49.0],[99.1,-49.4],[93.4,-48.2],[92.9,-38.4],[90.9,-35.5],[85.2,-32.1],[84.9,-27.6],[90.4,-26.8],[103.9,-28.9],[119.7,-28.5],[124.5,-29.9],[125.4,-31.4],[125.5,-37.5]],"lab":[112.6,-39.6],"n":5,"aire":720},{"id":"p6","type":"pre","pts":[[123.5,-27.6],[106.0,-27.7],[93.0,-25.7],[84.5,-25.7],[85.7,-6.9],[88.5,-5.2],[89.3,0.8],[122.0,1.5],[124.0,-7.3]],"lab":[109.0,-13.1],"n":6,"aire":1052},{"id":"p7","type":"pre","pts":[[121.2,3.4],[118.5,2.5],[89.9,2.7],[88.4,5.7],[83.3,11.0],[83.7,22.2],[108.6,24.2],[121.8,23.4],[122.6,19.5]],"lab":[109.8,13.4],"n":7,"aire":768},{"id":"p8","type":"pre","pts":[[-9.4,13.8],[-10.1,17.5],[-8.1,60.6],[-6.6,62.5],[2.3,61.4],[4.4,58.2],[5.1,36.7],[7.4,25.6],[6.2,20.4],[3.9,17.0],[-2.6,13.7]],"lab":[-1.1,25.8],"n":8,"aire":677},{"id":"p9","type":"pre","pts":[[-12.4,13.6],[-26.5,13.8],[-27.1,15.2],[-26.2,34.5],[-26.9,56.0],[-26.1,57.3],[-26.3,62.7],[-25.1,63.5],[-9.7,62.7],[-9.1,61.4],[-11.2,14.2]],"lab":[-18.1,51.4],"n":9,"aire":811},{"id":"p10","type":"pre","pts":[[-29.9,13.5],[-45.3,13.5],[-45.8,14.7],[-44.9,50.2],[-43.9,62.8],[-42.1,63.6],[-28.8,63.5],[-28.2,62.2],[-27.3,32.9],[-28.5,21.6],[-28.1,14.3]],"lab":[-36.4,32.2],"n":10,"aire":860},{"id":"p11","type":"pre","pts":[[-50.5,13.1],[-53.3,14.7],[-65.6,15.6],[-66.6,17.3],[-64.1,60.8],[-65.1,63.1],[-63.9,63.6],[-45.3,63.3],[-44.6,61.8],[-46.3,48.4],[-47.0,14.7]],"lab":[-56.7,25.2],"n":11,"aire":930},{"id":"p12","type":"pre","pts":[[-53.9,9.1],[-55.5,8.4],[-78.1,9.3],[-83.7,27.4],[-88.2,51.9],[-92.5,62.2],[-69.7,63.0],[-66.1,61.7],[-65.3,59.8],[-67.9,25.2],[-67.7,15.5],[-66.6,14.5],[-52.7,13.3],[-52.1,12.0]],"lab":[-77.0,51.2],"n":12,"aire":1052},{"id":"p13","type":"pre","pts":[[5.9,-40.1],[-18.4,-41.1],[-23.3,-36.3],[-26.1,-36.3],[-26.8,-30.0],[-29.2,-27.6],[-33.9,-26.6],[-39.5,-28.1],[-40.2,-24.9],[-39.4,-8.7],[-40.6,2.7],[-14.2,3.8],[-2.0,2.1],[6.5,3.0],[7.4,-1.6],[5.6,-15.7],[6.6,-25.5]],"lab":[-13.7,-16.1],"n":13,"aire":1821},{"id":"p14","type":"pre","pts":[[-53.5,-38.4],[-83.1,-40.2],[-83.9,-36.3],[-83.1,-18.9],[-81.3,-6.9],[-82.2,4.9],[-73.9,6.2],[-54.5,5.6],[-53.8,4.0],[-54.7,-14.2],[-53.1,-22.8]],"lab":[-68.1,-22.1],"n":14,"aire":1301},{"id":"p15","type":"pre","pts":[[-87.2,-39.4],[-93.2,-41.3],[-118.5,-43.7],[-123.0,-28.1],[-135.9,6.2],[-125.5,6.6],[-108.4,4.2],[-94.3,5.7],[-86.0,5.4],[-85.1,2.5],[-85.2,-15.6],[-87.5,-31.8]],"lab":[-106.1,-16.0],"n":15,"aire":1943},{"id":"carriere","type":"carriere","pts":[[60.8,-17.5],[36.2,-19.9],[18.7,-20.0],[17.8,-18.5],[18.8,-17.6],[17.7,-11.8],[18.3,0.2],[24.1,2.4],[38.0,2.2],[60.5,-0.1],[61.4,-5.8]],"lab":[30.1,-8.7],"n":2,"aire":889},{"id":"verger","type":"verger","pts":[[73.8,-16.6],[72.0,-17.3],[63.9,-16.9],[63.4,-4.0],[70.1,-3.4],[73.7,-5.8],[74.7,-8.4]],"lab":[68.8,-9.6],"aire":137},{"id":"piste","type":"piste","pts":[[91.3,-42.8],[82.5,-46.2],[78.8,-50.1],[77.1,-50.9],[66.3,-50.2],[45.5,-51.6],[25.6,-50.9],[19.6,-51.6],[9.9,-50.8],[8.5,-49.2],[7.7,-38.8],[8.4,-25.4],[7.5,-14.8],[9.0,-1.1],[7.0,3.6],[-13.7,5.4],[-37.3,4.9],[-41.2,3.2],[-42.3,0.1],[-42.0,-24.1],[-39.9,-28.8],[-31.9,-29.0],[-29.5,-30.3],[-27.5,-35.8],[-22.9,-38.9],[-21.6,-45.1],[-22.7,-53.8],[-24.0,-56.2],[-27.1,-57.1],[-29.9,-55.5],[-30.8,-53.3],[-29.9,-45.4],[-30.8,-42.8],[-32.4,-41.2],[-36.3,-40.3],[-43.2,-42.6],[-47.1,-42.9],[-50.0,-41.6],[-51.1,-39.7],[-51.8,8.6],[-50.7,10.9],[-49.2,11.6],[-0.5,12.1],[3.8,14.2],[6.9,17.2],[8.9,21.8],[9.1,28.2],[11.1,29.5],[20.0,27.8],[25.2,24.5],[31.3,10.5],[33.6,9.6],[49.1,8.2],[61.9,8.4],[73.1,7.0],[78.8,8.3],[81.6,7.2],[83.6,7.4],[85.8,5.8],[87.6,1.6],[87.8,-1.5],[84.2,-7.8],[82.7,-19.9],[83.5,-24.9],[83.0,-27.0],[84.8,-32.8],[90.4,-37.6]],"lab":[-8.5,8.4],"trous":[[[73.8,-33.4],[76.1,-24.6],[77.2,-7.8],[76.2,-5.0],[72.3,-1.5],[70.1,-0.6],[61.5,-0.8],[60.1,0.9],[37.6,3.0],[23.5,3.1],[17.6,0.6],[16.9,-11.7],[18.0,-17.5],[17.0,-18.4],[17.8,-20.2],[17.2,-24.6],[18.0,-37.6],[18.9,-41.0],[20.6,-42.6],[34.5,-44.9],[62.8,-43.3],[67.1,-40.5]]],"aire":3588}],"abris":[{"c":[84.6,-47.3],"w":13.6,"h":7.2},{"c":[-33.3,-44.1],"w":6.9,"h":13.9},{"c":[-24.6,-33.8],"w":3.5,"h":4.0}],"eau":[{"c":[73.1,-45.3]},{"c":[-43.1,-38.1]}],"arbres":[[66.6,-14.5],[72.9,-11.8],[68.3,-10.0],[63.9,-8.5],[70.2,-5.7]],"obstacles":[[29.9,-8.7],[48.3,-8.6]],"socle":[[129.8,-45.2],[127.2,-52.2],[121.1,-54.3],[112.2,-55.4],[102.8,-53.7],[98.2,-54.3],[91.5,-52.8],[88.2,-49.1],[77.6,-55.8],[40.0,-56.5],[10.3,-56.0],[4.9,-53.2],[3.2,-45.7],[-16.5,-46.1],[-19.0,-57.5],[-20.7,-59.9],[-25.8,-62.1],[-30.5,-61.1],[-34.1,-58.3],[-36.1,-52.1],[-35.5,-45.3],[-46.6,-47.8],[-54.8,-43.9],[-82.6,-45.1],[-86.0,-44.2],[-92.7,-46.2],[-119.2,-48.7],[-121.2,-47.9],[-127.0,-34.5],[-140.9,6.9],[-139.2,10.0],[-135.2,11.7],[-108.2,9.2],[-94.8,10.6],[-84.0,10.0],[-88.5,26.2],[-92.6,48.3],[-97.8,60.8],[-95.8,65.9],[-91.8,67.6],[-25.6,68.5],[3.2,66.3],[6.7,64.1],[9.3,59.4],[9.7,47.6],[12.4,48.5],[43.0,47.0],[118.4,45.7],[126.4,27.3],[127.3,22.5],[126.2,7.5],[129.0,-6.9],[128.5,-26.8],[130.5,-31.8]]};
const ZONES = new Map(PLAN.zones.map(z => [z.id, z]));
const zoneDe = id => ZONES.get(id) || null;
const zoneNom = z => z.type === 'pre' ? `Parcelle ${z.n}` : z.type === 'carriere' ? 'Carrière' : z.type === 'piste' ? 'Piste' : 'Verger';
const zoneCourt = z => z.type === 'pre' ? String(z.n) : zoneNom(z);
const zoneHa = z => Math.round(z.aire / 100) / 100;

/* ---------- Parcelles du plan ↔ prés du carnet ----------
   Un lien enregistré sur le pré (carte) passe en premier ; à défaut, la piste et la carrière se trouvent par leur type,
   les parcelles par le numéro du nom (« Pré 5 », « P5 »). */
const numNom = s => { const r = String(s || '').match(/(?:^|\D)(\d{1,2})(?!\d)/); return r ? Number(r[1]) : null; };
let lienMemo = null;
function liensCarte() {
  if (lienMemo && lienMemo.v === dataV) return lienMemo.m;
  const m = new Map(), pris = new Set(), ps = pres();
  ps.forEach(p => { if (p.carte && ZONES.has(p.carte) && !m.has(p.carte)) { m.set(p.carte, p); pris.add(p.id); } });
  PLAN.zones.forEach(z => {
    if (m.has(z.id) || z.type === 'verger') return;
    const c = ps.filter(p => !pris.has(p.id) && !p.carte && (z.type === 'pre'
      ? !sansRotation(p) && numNom(p.nom) === z.n
      : p.type === z.type || normNom(p.nom) === normNom(zoneNom(z))));
    if (c.length === 1) { m.set(z.id, c[0]); pris.add(c[0].id); }
  });
  lienMemo = { v: dataV, m };
  return m;
}
const zoneDuPre = p => { for (const [k, v] of liensCarte()) if (v.id === p.id) return k; return null; };
/* Choix de la parcelle dans la fiche d'un pré */
function zonesOpts(p) {
  const L = liensCarte();
  return PLAN.zones.filter(z => z.type !== 'verger').map(z => {
    const o = L.get(z.id), autre = o && (!p || o.id !== p.id);
    return { v: z.id, l: zoneCourt(z), cls: autre ? 'pris' : '', aria: autre ? `${zoneNom(z)}, reliée à ${o.nom}` : zoneNom(z) };
  });
}

/* ---------- Code couleur ---------- */
const ETATS_CARTE = [
  ['pature', 'En pâture'], ['bientot', 'Bientôt à changer'], ['changer', 'À changer'],
  ['repos', 'Au repos'], ['pret', 'Prêt'], ['espace', 'Piste, carrière'], ['relier', 'À relier']
];
function etatZone(z) {
  if (z.type === 'verger') return 'verger';
  const p = liensCarte().get(z.id);
  if (!p) return 'relier';
  const s = preStatus(p);
  if (s.sansRotation) return 'espace';
  if (s.occupe) return s.over ? 'changer' : s.days >= Math.max(1, s.max * 0.8) ? 'bientot' : 'pature';
  return s.pret || s.jamais ? 'pret' : 'repos';
}
function etatTxt(z) {
  const p = liensCarte().get(z.id);
  if (!p) return z.type === 'verger' ? '' : 'à relier';
  const s = preStatus(p);
  if (s.sansRotation) return s.occupe ? `${s.horses.length} ${pl(s.horses.length, 'cheval', 'chevaux')}` : 'libre';
  if (s.occupe) return `${s.days} j sur ${s.max}`;
  return s.jamais ? 'libre' : s.pret ? `prêt · ${s.repos} j de repos` : `repos ${s.repos} j sur ${s.cible}`;
}

/* ---------- Projection ----------
   Vue de dessus : orientée comme le plan (nord en haut). 3D : isométrique, le parcellaire dans les axes.
   X = a·x + b·y ; Y = c·x + d·y − z */
const ISO_C = Math.cos(Math.PI / 6);
const PLAN_B = PLAN.beta * Math.PI / 180;
const MATS = { '3d': [ISO_C, -ISO_C, .5, .5], '2d': [Math.cos(PLAN_B), Math.sin(PLAN_B), -Math.sin(PLAN_B), Math.cos(PLAN_B)] };
const PJ = (mode, x, y, z = 0) => { const m = MATS[mode]; return [m[0] * x + m[1] * y, m[2] * x + m[3] * y - (mode === '3d' ? z : 0)]; };
const f1 = v => Math.round(v * 10) / 10;
const pt = (mode, x, y, z) => PJ(mode, x, y, z).map(f1).join(' ');
const chemin = (mode, pts, z = 0) => 'M' + pts.map(p => pt(mode, p[0], p[1], z)).join('L') + 'Z';
/* Hauteurs de maquette (exagérées pour qu'on voie le relief même de loin) */
const HAUT = { socle: 7, tuile: 1.2, carriere: .5, piquet: 2.5, lisse1: 1.15, lisse2: 2.1, mur: 4.2, toit: 5.8, auge: 1.3, tronc: 2.4, houppier: 2.9, barre: 1.7 };
const hautZone = z => z.type === 'carriere' ? HAUT.carriere : z.type === 'piste' ? 0 : HAUT.tuile;

function dansPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const dansZone = (z, x, y) => dansPoly(x, y, z.pts) && !(z.trous || []).some(t => dansPoly(x, y, t));
function alea(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function boite(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  return { x0, y0, x1, y1 };
}
/* Des points au hasard (mais toujours les mêmes) dans une zone, à distance des bords */
function semis(z, n, seed, marge = 1.2) {
  const r = alea(seed), b = boite(z.pts), out = [];
  for (let i = 0; i < n * 8 && out.length < n; i++) {
    const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0);
    if (dansZone(z, x, y) && dansZone(z, x + marge, y) && dansZone(z, x - marge, y) && dansZone(z, x, y + marge) && dansZone(z, x, y - marge)) out.push([x, y]);
  }
  return out;
}
/* Faces verticales tournées vers le spectateur (qui regarde depuis +x +y) */
function cotes(pts, zh, zb, cls) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    let nx = b[1] - a[1], ny = a[0] - b[0];
    const L = Math.hypot(nx, ny) || 1;
    nx /= L; ny /= L;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (dansPoly(mx + nx * .4, my + ny * .4, pts)) { nx = -nx; ny = -ny; }
    if (nx + ny <= .03) continue;
    out.push({ p: mx + my, h: `<path class="${cls} ${nx > ny ? 'fx' : 'fy'}" d="M${pt('3d', a[0], a[1], zh)}L${pt('3d', b[0], b[1], zh)}L${pt('3d', b[0], b[1], zb)}L${pt('3d', a[0], a[1], zb)}Z"/>` });
  }
  return out.sort((u, v) => u.p - v.p).map(o => o.h).join('');
}

/* ---------- Dessin ---------- */
function dessinSol(mode) {
  const d3 = mode === '3d';
  let h = '';
  // le socle de la maquette : terre en 3D, une ombre douce dessous
  if (d3) {
    h += `<path class="c-ombre" d="${chemin('3d', PLAN.socle.map(([x, y]) => [x + 3, y + 3]), -HAUT.socle - 1.5)}"/>`;
    h += `<g class="c-cotes">${cotes(PLAN.socle, 0, -HAUT.socle, 'c-terre')}</g>`;
  }
  h += `<path class="c-socle" d="${chemin(mode, PLAN.socle)}"/>`;
  // la piste, en sable, avec des traces de sabots
  const pi = zoneDe('piste');
  const traces = semis(pi, 140, 7, .6).map(([x, y]) => { const [X, Y] = PJ(mode, x, y); return `M${f1(X - .45)} ${f1(Y)}h.9`; }).join('');
  h += `<g class="z zt-piste" data-zone="piste"><path class="z-top" fill-rule="evenodd" d="${chemin(mode, pi.pts)}${(pi.trous || []).map(t => chemin(mode, t)).join('')}"/><path class="c-traces" d="${traces}"/></g>`;
  // les parcelles, la carrière et le verger : des dalles d'herbe (ou de sable) un peu en relief
  const zs = PLAN.zones.filter(z => z.type !== 'piste').map(z => ({ z, p: d3 ? Math.max(...z.pts.map(([x, y]) => x + y)) : 0 })).sort((a, b) => a.p - b.p);
  zs.forEach(({ z }, i) => {
    const zh = hautZone(z);
    const herbe = z.type === 'carriere' ? '' : semis(z, Math.min(70, Math.round(z.aire / 32)), 31 + i * 17).map(([x, y]) => {
      const [X, Y] = PJ(mode, x, y, zh);
      return `M${f1(X - .55)} ${f1(Y - 1.05)}L${f1(X)} ${f1(Y)}L${f1(X + .55)} ${f1(Y - 1.05)}`;
    }).join('');
    h += `<g class="z zt-${z.type}" data-zone="${z.id}">${d3 ? `<g class="c-cotes">${cotes(z.pts, zh, 0, 'z-cote')}</g>` : ''}<path class="z-top" d="${chemin(mode, z.pts, zh)}"/>${herbe ? `<path class="c-herbe" d="${herbe}"/>` : ''}</g>`;
  });
  return h;
}
function dessinObjets(mode) {
  const d3 = mode === '3d', items = [];
  const prof = (x, y) => d3 ? x + y : PJ('2d', x, y)[1];
  const add = (x, y, h) => items.push({ p: prof(x, y), h });
  if (d3) {
    // clôtures : piquets et deux lisses le long de chaque bord (blanches autour de la carrière)
    PLAN.zones.filter(z => z.type !== 'piste').forEach(z => {
      const zh = hautZone(z), cls = z.type === 'carriere' ? 'c-cl blanc' : 'c-cl';
      z.pts.forEach((a, i) => {
        const b = z.pts[(i + 1) % z.pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 3.4));
        let d = `M${pt('3d', a[0], a[1], zh + HAUT.lisse1)}L${pt('3d', b[0], b[1], zh + HAUT.lisse1)}M${pt('3d', a[0], a[1], zh + HAUT.lisse2)}L${pt('3d', b[0], b[1], zh + HAUT.lisse2)}`;
        for (let k = 0; k < n; k++) {
          const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n;
          d += `M${pt('3d', x, y, zh)}L${pt('3d', x, y, zh + HAUT.piquet)}`;
        }
        add((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, `<path class="${cls}" d="${d}"/>`);
      });
    });
  }
  // abris : murs en bois, toit en pente, ouverts devant
  PLAN.abris.forEach(({ c: [cx, cy], w, h }) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    if (!d3) {
      const P = (x, y) => pt('2d', x, y);
      add(cx, cy, `<g class="c-abri"><path class="ab-toit" d="M${P(x0, y0)}L${P(x1, y0)}L${P(x1, y1)}L${P(x0, y1)}Z"/><path class="ab-fait" d="M${P(x0, cy)}L${P(x1, cy)}"/></g>`);
      return;
    }
    const P = (x, y, z) => pt('3d', x, y, z), m = HAUT.mur, t = HAUT.toit, o = .5;
    add(x1, y1, `<g class="c-abri">
      <path class="ab-mur fx" d="M${P(x1, y0, 0)}L${P(x1, y1, 0)}L${P(x1, y1, m)}L${P(x1, y0, t)}Z"/>
      <path class="ab-mur fy" d="M${P(x0, y1, 0)}L${P(x1, y1, 0)}L${P(x1, y1, m)}L${P(x0, y1, m)}Z"/>
      <path class="ab-trou" d="M${P(x0 + .7, y1, 0)}L${P(x1 - .7, y1, 0)}L${P(x1 - .7, y1, m - .8)}L${P(x0 + .7, y1, m - .8)}Z"/>
      <path class="ab-toit" d="M${P(x0 - o, y0 - o, t + .15)}L${P(x1 + o, y0 - o, t + .15)}L${P(x1 + o, y1 + o, m - .15)}L${P(x0 - o, y1 + o, m - .15)}Z"/>
      <path class="ab-rive" d="M${P(x1 + o, y0 - o, t + .15)}L${P(x1 + o, y1 + o, m - .15)}L${P(x1 + o, y1 + o, m - .55)}L${P(x1 + o, y0 - o, t - .25)}Z"/></g>`);
  });
  // abreuvoirs : un bac galvanisé plein d'eau
  PLAN.eau.forEach(({ c: [cx, cy] }) => {
    const x0 = cx - 1.3, x1 = cx + 1.3, y0 = cy - .55, y1 = cy + .55, a = HAUT.auge;
    if (!d3) {
      const P = (x, y) => pt('2d', x, y);
      add(cx, cy, `<g class="c-eau"><path class="eau-bord" d="M${P(x0, y0)}L${P(x1, y0)}L${P(x1, y1)}L${P(x0, y1)}Z"/><path class="eau-o" d="M${P(x0 + .3, y0 + .25)}L${P(x1 - .3, y0 + .25)}L${P(x1 - .3, y1 - .25)}L${P(x0 + .3, y1 - .25)}Z"/></g>`);
      return;
    }
    const P = (x, y, z) => pt('3d', x, y, z);
    add(x1, y1, `<g class="c-eau">
      <path class="eau-bord fx" d="M${P(x1, y0, 0)}L${P(x1, y1, 0)}L${P(x1, y1, a)}L${P(x1, y0, a)}Z"/>
      <path class="eau-bord fy" d="M${P(x0, y1, 0)}L${P(x1, y1, 0)}L${P(x1, y1, a)}L${P(x0, y1, a)}Z"/>
      <path class="eau-haut" d="M${P(x0, y0, a)}L${P(x1, y0, a)}L${P(x1, y1, a)}L${P(x0, y1, a)}Z"/>
      <path class="eau-o" d="M${P(x0 + .25, y0 + .2, a)}L${P(x1 - .25, y0 + .2, a)}L${P(x1 - .25, y1 - .2, a)}L${P(x0 + .25, y1 - .2, a)}Z"/></g>`);
  });
  // verger : des pommiers
  const zv = zoneDe('verger'), hv = hautZone(zv);
  PLAN.arbres.forEach(([x, y], i) => {
    const r = HAUT.houppier;
    const pommes = [[-.9, -.4], [.8, .3], [-.1, 1]].map(([dx, dy]) => `<circle class="pomme" cx="${f1(dx * r * .55)}" cy="${f1(dy * r * .55)}" r=".42"/>`).join('');
    if (!d3) {
      const [X, Y] = PJ('2d', x, y);
      add(x, y, `<g class="c-arbre" transform="translate(${f1(X)} ${f1(Y)})"><circle class="arb-ombre" cx=".9" cy=".9" r="${r}"/><circle class="arb-h" r="${r}"/><circle class="arb-l" cx="-.8" cy="-.8" r="${f1(r * .45)}"/>${pommes}</g>`);
      return;
    }
    const [X, Y] = PJ('3d', x, y, hv), hc = HAUT.tronc + r * .8;
    add(x, y, `<g class="c-arbre" transform="translate(${f1(X)} ${f1(Y)})"><ellipse class="arb-ombre" cx=".6" cy=".3" rx="${f1(r * 1.1)}" ry="${f1(r * .55)}"/><path class="arb-tronc" d="M0 0V${f1(-hc)}"/><g transform="translate(0 ${f1(-hc)})"><circle class="arb-h" r="${r}"/><circle class="arb-l" cx="-.9" cy="-.9" r="${f1(r * .45)}"/>${pommes}</g></g>`);
  });
  // carrière : deux obstacles
  const zc = zoneDe('carriere'), hc = hautZone(zc);
  PLAN.obstacles.forEach(([x, y]) => {
    if (!d3) { add(x, y, `<path class="c-barre" d="M${pt('2d', x, y - 2)}L${pt('2d', x, y + 2)}"/>`); return; }
    add(x, y + 2, `<g class="c-obst"><path class="obst-ch" d="M${pt('3d', x, y - 2, hc)}L${pt('3d', x, y - 2, hc + HAUT.barre + .4)}M${pt('3d', x, y + 2, hc)}L${pt('3d', x, y + 2, hc + HAUT.barre + .4)}"/><path class="c-barre" d="M${pt('3d', x, y - 2, hc + HAUT.barre)}L${pt('3d', x, y + 2, hc + HAUT.barre)}"/></g>`);
  });
  // chaque objet dans son groupe : l'animation d'arrivée (CSS) ne doit pas écraser leur position (attribut transform)
  return items.sort((a, b) => a.p - b.p).map(o => `<g>${o.h}</g>`).join('');
}

/* ---------- La carte : état, vue, montage ---------- */
const carte = { mode: null, sel: null, filtre: null, plein: false, vues: { '3d': null, '2d': null }, host: null, svg: null, W: 0, H: 0, sig: '', boites: {} };
const modeCarte = () => ui.carte3d === false ? '2d' : '3d';
/* Boîte englobante du dessin (avec le relief en 3D) */
function boiteCarte(mode) {
  if (carte.boites[mode]) return carte.boites[mode];
  const ps = PLAN.socle.map(([x, y]) => PJ(mode, x, y));
  if (mode === '3d') PLAN.socle.forEach(([x, y]) => { ps.push(PJ('3d', x, y, 9)); ps.push(PJ('3d', x + 3, y + 3, -HAUT.socle - 1.5)); });
  const b = boite(ps), m = 6;
  return (carte.boites[mode] = { x: b.x0 - m, y: b.y0 - m, w: b.x1 - b.x0 + 2 * m, h: b.y1 - b.y0 + 2 * m });
}
const fitK = mode => { const b = boiteCarte(mode); return Math.min(carte.W / b.w, carte.H / b.h); };
function vueDe(mode) {
  if (!carte.vues[mode]) { const b = boiteCarte(mode); carte.vues[mode] = { k: 1, cx: b.x + b.w / 2, cy: b.y + b.h / 2 }; }
  return carte.vues[mode];
}
const kpx = () => fitK(carte.mode) * vueDe(carte.mode).k;
function borneVue(v, mode) {
  const b = boiteCarte(mode);
  v.k = Math.min(9, Math.max(1, v.k));
  v.cx = Math.min(b.x + b.w, Math.max(b.x, v.cx));
  v.cy = Math.min(b.y + b.h, Math.max(b.y, v.cy));
  return v;
}
function viewBoxDe(mode, v) {
  const k = fitK(mode) * v.k, w = carte.W / k, h = carte.H / k;
  return { x: v.cx - w / 2, y: v.cy - h / 2, w, h, k };
}
function appliqueVue() {
  if (!carte.svg || !carte.W) return;
  const v = borneVue(vueDe(carte.mode), carte.mode), vb = viewBoxDe(carte.mode, v);
  carte.svg.setAttribute('viewBox', `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
  carte.svg.style.setProperty('--trait', `${Math.min(2.2, .55 + .28 * v.k).toFixed(2)}px`);
  // pastilles, noms et chevaux gardent leur taille à l'écran ; les noms apparaissent quand on s'approche
  const s = Math.min(1, .66 + .17 * v.k) / vb.k;
  carte.svg.querySelectorAll('[data-ancre]').forEach(g => {
    g.setAttribute('transform', `translate(${g.getAttribute('data-ancre')}) scale(${s.toFixed(4)})`);
  });
  carte.svg.querySelectorAll('.c-lab').forEach(g => {
    const z = zoneDe(g.getAttribute('data-lz')), b = boite(z.pts);
    const taille = Math.min(b.x1 - b.x0, b.y1 - b.y0) * vb.k;
    g.classList.toggle('detail', taille > 64 || (z.type !== 'pre' && taille > 30));
  });
  const pz = carte.host && carte.host.querySelector('.c-zoom-pct');
  if (pz) pz.textContent = v.k > 1.05 ? `×${num(v.k, 1)}` : '';
}
function monteCarte(host) {
  carte.host = host;
  carte.mode = modeCarte();
  host.innerHTML = `<svg class="c-svg" role="img" aria-label="Carte des prés" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="c-outils">
      <div class="c-seg" role="group" aria-label="Vue de la carte"><button type="button" data-vue="3d">3D</button><button type="button" data-vue="2d">2D</button></div>
      <div class="c-zoom"><button type="button" data-zoom="1" aria-label="Rapprocher">${ic('plus', 'sm')}</button><button type="button" data-zoom="-1" aria-label="Éloigner">${ic('minus', 'sm')}</button><button type="button" data-zoom="0" aria-label="Tout voir">${ic('cible', 'sm')}</button></div>
      <span class="c-zoom-pct" aria-hidden="true"></span>
    </div>
    <button type="button" class="c-plein" aria-label="Agrandir la carte">${ic('agrandir', 'sm')}</button>
    <div class="c-boxo" data-box="1" aria-label="Au box"></div>
    <div class="c-info" hidden></div>`;
  carte.svg = host.querySelector('svg');
  host.querySelectorAll('[data-vue]').forEach(b => b.addEventListener('click', () => basculeVue(b.dataset.vue)));
  host.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    const z = Number(b.dataset.zoom), v = vueDe(carte.mode);
    if (!z) { const bb = boiteCarte(carte.mode); Object.assign(v, { k: 1, cx: bb.x + bb.w / 2, cy: bb.y + bb.h / 2 }); }
    else zoomA(carte.W / 2, carte.H / 2, z > 0 ? 1.6 : 1 / 1.6);
    appliqueVue();
  }));
  host.querySelector('.c-plein').addEventListener('click', () => pleinEcran(!carte.plein));
  gestes(host);
  if (carte.ro) carte.ro.disconnect();
  if (window.ResizeObserver) { carte.ro = new ResizeObserver(() => { if (carte.host === host && host.isConnected && taille()) appliqueVue(); }); carte.ro.observe(host); }
  taille();
  dessine();
}
function pleinEcran(on) {
  const host = carte.host;
  carte.plein = on;
  if (!host) return;
  host.classList.toggle('plein', on);
  document.body.classList.toggle('lock', on);
  host.querySelector('.c-plein').setAttribute('aria-label', on ? 'Réduire la carte' : 'Agrandir la carte');
  host.querySelector('.c-plein').innerHTML = ic(on ? 'close' : 'agrandir', 'sm');
  carte.sig = '';
  requestAnimationFrame(() => { taille(); majCarteDyn(); });
}
function taille() {
  if (!carte.host) return false;
  const r = carte.host.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height);
  if (!W || !H || (W === carte.W && H === carte.H)) return false;
  carte.W = W; carte.H = H;
  return true;
}
/* Tout redessiner (changement de vue) */
function dessine(arrivee = false) {
  const mode = carte.mode;
  carte.svg.classList.remove('bascule');
  carte.svg.classList.toggle('d3', mode === '3d');
  carte.svg.innerHTML = `<defs><clipPath id="cRond" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>
    <g class="c-sol">${dessinSol(mode)}</g><g class="c-objets${arrivee ? ' c-arrive' : ''}">${dessinObjets(mode)}</g><g class="c-labs"></g><g class="c-pions"></g>`;
  carte.host.querySelectorAll('[data-vue]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vue === mode)));
  carte.sig = '';
  majCarteDyn();
}
/* Appelé après chaque rendu de l'écran */
function majCarte() {
  const host = document.querySelector('#view .carte');
  if (!host) {
    if (carte.plein) { carte.plein = false; document.body.classList.remove('lock'); }
    if (carte.ro) { carte.ro.disconnect(); carte.ro = null; }
    carte.host = null; carte.svg = null;
    return;
  }
  if (host !== carte.host || !host.querySelector('svg')) { monteCarte(host); return; }
  majCarteDyn();
}
/* Ce qui bouge avec les données : couleurs, noms, chevaux */
function majCarteDyn() {
  if (!carte.svg) return;
  const L = liensCarte();
  const sig = [carte.mode, carte.sel, carte.filtre, carte.plein, dataV].join('|');
  if (sig === carte.sig) { appliqueVue(); return; }
  carte.sig = sig;
  carte.svg.querySelectorAll('.z').forEach(g => {
    const z = zoneDe(g.getAttribute('data-zone')), e = etatZone(z);
    g.setAttribute('class', `z zt-${z.type} z-${e}${carte.sel === z.id ? ' sel' : ''}${carte.filtre && carte.filtre !== e ? ' terne' : ''}`);
  });
  carte.svg.classList.toggle('filtre', !!carte.filtre);
  // pastilles : numéro (et nom, état quand on s'approche)
  const mode = carte.mode;
  carte.svg.querySelector('.c-labs').innerHTML = PLAN.zones.map(z => {
    const p = L.get(z.id), [X, Y] = PJ(mode, z.lab[0], z.lab[1], hautZone(z));
    const nom = p ? p.nom : zoneNom(z), e = etatZone(z), st = etatTxt(z);
    const badge = z.type === 'pre' ? `<circle class="lab-rond" r="10.5"/><text class="lab-n" y="4.2">${z.n}</text>` : '';
    const ty = z.type === 'pre' ? 24 : 4;
    return `<g class="c-lab l-${e}${z.type === 'pre' ? '' : ' l-nom'}" data-lz="${z.id}" data-ancre="${f1(X)} ${f1(Y)}">${badge}
      <text class="lab-t" y="${ty}">${esc(nom)}</text>${st ? `<text class="lab-s" y="${ty + 13}">${esc(st)}</text>` : ''}</g>`;
  }).join('');
  // les chevaux, posés dans leur pré
  const parZone = new Map();
  chevaux().forEach(h => {
    const o = openPlace(h.id);
    if (!o) return;
    for (const [zid, p] of L) if (p.id === o.preId) { if (!parZone.has(zid)) parZone.set(zid, []); parZone.get(zid).push(h); break; }
  });
  let pions = '';
  parZone.forEach((hs, zid) => {
    const z = zoneDe(zid), [X, Y] = PJ(mode, z.lab[0], z.lab[1], hautZone(z));
    const cols = Math.min(hs.length, 3), y0 = mode === '3d' ? -12 : -30;
    hs.forEach((h, i) => {
      const dx = (i % cols - (cols - 1) / 2) * 30, dy = y0 - Math.floor(i / cols) * 33;
      pions += `<g class="c-pion" data-pion="${h.id}" data-ancre="${f1(X)} ${f1(Y)}" aria-label="${esc(h.nom)}">${pionSvg(h, dx, dy, mode)}</g>`;
    });
  });
  carte.svg.querySelector('.c-pions').innerHTML = pions;
  // le box, dans un coin de la carte : on y glisse un cheval pour le rentrer, on l'en sort pour le mettre au pré
  const box = chevaux().filter(h => !openPlace(h.id)), bo = carte.host.querySelector('.c-boxo');
  // en plein écran, la fiche sous la carte est cachée : un petit encart la résume
  const inf = carte.host.querySelector('.c-info'), zs = carte.plein && carte.sel && zoneDe(carte.sel);
  if (inf) {
    inf.hidden = !zs;
    if (zs) {
      const p = L.get(zs.id), st = etatTxt(zs);
      inf.innerHTML = `<div class="c-info-t"><b>${esc(p ? p.nom : zoneNom(zs))}</b>${st ? `<span>${esc(st)}</span>` : ''}</div>`
        + (p ? `<button type="button" class="btn small" data-act="open-pre" data-id="${p.id}">Ouvrir</button>`
          : zs.type === 'verger' ? '' : `<button type="button" class="btn small" data-act="carte-reduire">Relier</button>`);
    }
  }
  if (bo) bo.innerHTML = `<span class="c-boxo-t">${ic('barn', 'sm')}Box</span>${box.slice(0, 6).map(h => `<span class="c-bpion" data-pion="${h.id}" title="${esc(h.nom)}" aria-label="${esc(h.nom)}, au box">${av(h, 's')}</span>`).join('')}${box.length > 6 ? `<span class="c-boxo-n">+${box.length - 6}</span>` : ''}`;
  appliqueVue();
}
function pionSvg(h, dx, dy, mode) {
  const c = hColor(h), r = 13, tige = mode === '3d' ? 11 : 0, cy = dy - tige - (mode === '3d' ? r : 0);
  const fond = hasPhoto(h) && PHOTO_RE.test(h.photo)
    ? `<circle r="${r}" cx="${dx}" cy="${cy}" style="fill:var(--h${c})"/><image href="${esc(h.photo)}" x="${dx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" clip-path="url(#cRond)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle r="${r}" cx="${dx}" cy="${cy}" style="fill:var(--h${c})"/><text class="pion-i" x="${dx}" y="${cy + 4.6}">${esc(initials(h.nom))}</text>`;
  return (mode === '3d' ? `<ellipse class="pion-ombre" cx="${dx}" cy="${dy}" rx="9" ry="4"/><path class="pion-tige" d="M${dx} ${dy}V${dy - tige}"/>` : `<ellipse class="pion-ombre" cx="${dx + 1}" cy="${cy + r - 1}" rx="10" ry="4"/>`)
    + fond + `<circle class="pion-bord" r="${r}" cx="${dx}" cy="${cy}"/>`;
}

/* ---------- 3D ⇄ 2D : le plan pivote et se couche (ou se redresse), puis la maquette se monte ---------- */
function decompose(a, b, c, d) {
  const sx = Math.hypot(a, b), th = Math.atan2(b, a);
  return { th, sx, sh: (a * c + b * d) / sx, sy: (a * d - b * c) / sx };
}
function basculeVue(mode) {
  if (!carte.svg || mode === carte.mode) return;
  ui.carte3d = mode === '3d'; saveUi();
  const ancien = carte.mode, vo = viewBoxDe(ancien, vueDe(ancien));
  // garder le même endroit au centre, au même zoom
  const A = MATS[ancien], B = MATS[mode], det = A[0] * A[3] - A[1] * A[2];
  const v0 = vueDe(ancien), wx = (A[3] * v0.cx - A[1] * v0.cy) / det, wy = (-A[2] * v0.cx + A[0] * v0.cy) / det;
  const [ncx, ncy] = PJ(mode, wx, wy);
  carte.vues[mode] = borneVue({ k: v0.k, cx: ncx, cy: ncy }, mode);
  const vn = viewBoxDe(mode, carte.vues[mode]);
  const fin = () => { carte.mode = mode; dessine(true); };
  const sol = carte.svg.querySelector('.c-sol');
  if (!mouvementOk() || !sol) { fin(); return; }
  carte.host.querySelectorAll('[data-vue]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vue === mode)));
  carte.svg.classList.add('bascule');
  // M = r · B · A⁻¹ ; t = vo.o − r · vn.o
  const r = vn.k / vo.k, inv = [A[3] / det, -A[1] / det, -A[2] / det, A[0] / det];
  const M = [r * (B[0] * inv[0] + B[1] * inv[2]), r * (B[0] * inv[1] + B[1] * inv[3]), r * (B[2] * inv[0] + B[3] * inv[2]), r * (B[2] * inv[1] + B[3] * inv[3])];
  const D = decompose(M[0], M[2], M[1], M[3]), tx = vo.x - r * vn.x, ty = vo.y - r * vn.y;
  const t0 = performance.now(), dur = 620;
  const pas = now => {
    const u = Math.min(1, (now - t0) / dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const th = D.th * e, sx = 1 + (D.sx - 1) * e, sy = 1 + (D.sy - 1) * e, sh = D.sh * e, co = Math.cos(th), si = Math.sin(th);
    sol.setAttribute('transform', `matrix(${co * sx} ${si * sx} ${co * sh - si * sy} ${si * sh + co * sy} ${tx * e} ${ty * e})`);
    if (u < 1) requestAnimationFrame(pas); else fin();
  };
  requestAnimationFrame(pas);
}

/* ---------- Gestes : glisser pour se déplacer, pincer pour zoomer, toucher une parcelle, glisser un cheval ---------- */
function zoomA(sx, sy, f) {
  const v = vueDe(carte.mode), vb = viewBoxDe(carte.mode, v);
  const ux = vb.x + sx / vb.k, uy = vb.y + sy / vb.k;
  v.k = Math.min(9, Math.max(1, v.k * f));
  const k2 = fitK(carte.mode) * v.k;
  v.cx = ux - sx / k2 + carte.W / k2 / 2;
  v.cy = uy - sy / k2 + carte.H / k2 / 2;
  borneVue(v, carte.mode);
}
function gestes(host) {
  const svg = carte.svg, pts = new Map();
  let geste = null, dernierTap = 0, tapXY = null;
  const loc = e => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, loc(e));
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], v = vueDe(carte.mode);
      geste = { type: 'pince', d0: Math.hypot(a[0] - b[0], a[1] - b[1]), k0: v.k, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
      annuleDrag();
      return;
    }
    const pion = e.target.closest && e.target.closest('[data-pion]');
    geste = { type: 'attente', x0: e.clientX, y0: e.clientY, t0: Date.now(), last: loc(e), pion: pion && !sync.readOnly ? pion.getAttribute('data-pion') : null, cible: e.target };
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = loc(e);
    pts.set(e.pointerId, p);
    if (!geste) return;
    if (geste.type === 'pince' && pts.size >= 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const v = vueDe(carte.mode), k1 = fitK(carte.mode) * v.k;
      v.cx -= (m[0] - geste.m[0]) / k1; v.cy -= (m[1] - geste.m[1]) / k1;
      geste.m = m;
      zoomA(m[0], m[1], geste.k0 * d / geste.d0 / v.k);
      appliqueVue();
      return;
    }
    const moved = Math.hypot(e.clientX - geste.x0, e.clientY - geste.y0);
    if (geste.type === 'attente' && moved > 7) {
      if (geste.pion) { geste.type = 'cheval'; debutDrag(geste.pion, e); }
      else geste.type = 'pan';
    }
    if (geste.type === 'pan') {
      const v = vueDe(carte.mode), k = fitK(carte.mode) * v.k;
      v.cx -= (p[0] - geste.last[0]) / k; v.cy -= (p[1] - geste.last[1]) / k;
      borneVue(v, carte.mode);
      appliqueVue();
    } else if (geste.type === 'cheval') suitDrag(e);
    geste.last = p;
  });
  const fin = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!geste) return;
    if (geste.type === 'cheval') { lacheDrag(e); geste = null; return; }
    if (geste.type === 'pince') { if (!pts.size) geste = null; return; }
    if (geste.type === 'attente' && e.type === 'pointerup' && Date.now() - geste.t0 < 600) {
      const now = Date.now(), p = loc(e);
      if (now - dernierTap < 320 && tapXY && Math.hypot(p[0] - tapXY[0], p[1] - tapXY[1]) < 30) { zoomA(p[0], p[1], 1.8); appliqueVue(); dernierTap = 0; }
      else { dernierTap = now; tapXY = p; toucheCarte(geste.cible); }
    }
    geste = null;
  };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', fin);
  svg.addEventListener('wheel', e => { e.preventDefault(); const p = loc(e); zoomA(p[0], p[1], Math.exp(-e.deltaY * .0022)); appliqueVue(); }, { passive: false });
}
function toucheCarte(t) {
  const pion = t && t.closest && t.closest('[data-pion]');
  let zid = null;
  if (pion) {
    const o = openPlace(pion.getAttribute('data-pion'));
    if (o) for (const [k, p] of liensCarte()) if (p.id === o.preId) zid = k;
  } else {
    const g = t && t.closest && t.closest('[data-zone]');
    zid = g ? g.getAttribute('data-zone') : null;
  }
  carte.sel = zid === carte.sel && !pion ? null : zid;
  vibre(8);
  render();
  if (carte.sel) { const f = document.querySelector('.c-fiche'); if (f && f.getBoundingClientRect().top > window.innerHeight - 120) f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

/* ---------- Glisser un cheval (depuis la carte ou depuis le box) ---------- */
let drag = null;
function debutDrag(hid, e) {
  const h = cheval(hid);
  if (!h) return;
  const g = document.createElement('div');
  g.className = 'c-fantome';
  g.innerHTML = av(h, 'm');
  document.body.appendChild(g);
  drag = { hid, g, cible: null };
  if (carte.svg) carte.svg.classList.add('glisse');
  document.querySelectorAll(`[data-pion="${CSS.escape(hid)}"]`).forEach(el => el.classList.add('parti'));
  vibre(12);
  suitDrag(e);
}
function suitDrag(e) {
  if (!drag) return;
  drag.g.style.transform = `translate(${e.clientX - 24}px, ${e.clientY - 62}px)`;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const z = el && el.closest && el.closest('[data-zone]'), bx = el && el.closest && el.closest('[data-box]');
  const cible = z ? z.getAttribute('data-zone') : bx ? 'box' : null;
  if (cible === drag.cible) return;
  drag.cible = cible;
  document.querySelectorAll('.c-svg .z.cible, .c-boxo.cible').forEach(x => x.classList.remove('cible'));
  if (z) z.classList.add('cible'); else if (bx) bx.classList.add('cible');
}
function annuleDrag() {
  if (!drag) return;
  drag.g.remove();
  if (carte.svg) carte.svg.classList.remove('glisse');
  document.querySelectorAll('.parti').forEach(el => el.classList.remove('parti'));
  document.querySelectorAll('.c-svg .z.cible, .c-boxo.cible').forEach(x => x.classList.remove('cible'));
  drag = null;
}
function lacheDrag(e) {
  if (!drag) return;
  const { hid, cible } = drag;
  annuleDrag();
  if (cible) deplaceVers(hid, cible);
}
function deplaceVers(hid, cible) {
  const h = cheval(hid);
  if (!h || sync.readOnly) return;
  const o = openPlace(hid);
  if (cible === 'box') {
    if (!o) return;
    const r = moveHorses([hid], null, todayISO());
    if (r.err) { toast(r.err, { danger: true }); return; }
    toast(`${h.nom} → au box`, { undo: r.undo });
    return;
  }
  const z = zoneDe(cible), p = liensCarte().get(cible);
  if (z.type === 'verger') { toast('Le verger n’accueille pas de chevaux.'); return; }
  if (!p) { carte.sel = cible; render(); toast(`${zoneNom(z)} n’est reliée à aucun pré : choisis-le ci-dessous.`); return; }
  if (o && o.preId === p.id) return;
  const r = moveHorses([hid], p.id, todayISO());
  if (r.err) { toast(r.err, { danger: true }); return; }
  carte.sel = cible;
  toast(`${h.nom} → ${p.nom}`, { undo: r.undo });
}
/* Depuis le box (sous la carte) */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.c-boxo [data-pion]');
  if (!b || sync.readOnly || e.button > 0) return;
  const hid = b.getAttribute('data-pion'), x0 = e.clientX, y0 = e.clientY;
  let parti = false;
  const bouge = ev => {
    if (!parti && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 7) { parti = true; debutDrag(hid, ev); }
    if (parti) { ev.preventDefault(); suitDrag(ev); }
  };
  const fin = ev => {
    document.removeEventListener('pointermove', bouge);
    document.removeEventListener('pointerup', fin);
    document.removeEventListener('pointercancel', fin);
    if (parti) { if (ev.type === 'pointerup') lacheDrag(ev); else annuleDrag(); }
    else if (ev.type === 'pointerup') { const h = cheval(hid); if (h) toast(`Fais glisser ${h.nom} sur une parcelle pour le mettre au pré.`); }
  };
  document.addEventListener('pointermove', bouge, { passive: false });
  document.addEventListener('pointerup', fin);
  document.addEventListener('pointercancel', fin);
});

/* ---------- Autour de la carte : légende, box, fiche de la parcelle choisie ---------- */
function carteHtml() {
  return `<div class="carte" data-key="carte" data-garde></div>${legendeHtml()}${horsCarteHtml()}<div class="c-fiche" data-key="c-fiche">${ficheZone()}</div>`;
}
function legendeHtml() {
  const presents = new Set(PLAN.zones.map(etatZone));
  const items = ETATS_CARTE.filter(([k]) => presents.has(k) || ['pature', 'repos', 'pret'].includes(k))
    .map(([k, l]) => `<button type="button" class="c-leg" data-act="carte-filtre" data-etat="${k}" aria-pressed="${carte.filtre === k}"><i class="c-sw c-sw-${k}"></i>${l}</button>`);
  return `<div class="c-legende" data-key="c-leg" role="group" aria-label="Code couleur">${items.join('')}</div>`;
}
/* Chevaux dans un pré qui n'est pas sur le plan */
function horsCarteHtml() {
  const L = liensCarte(), sur = new Set([...L.values()].map(p => p.id));
  const ailleurs = chevaux().filter(h => { const o = openPlace(h.id); return o && !sur.has(o.preId); });
  return ailleurs.length ? `<p class="note c-ailleurs" data-key="c-hors">Hors carte : ${ailleurs.map(h => `${esc(h.nom)} (${esc(horseWhere(h.id).txt)})`).join(', ')}</p>` : '';
}
function ficheZone() {
  const z = carte.sel && zoneDe(carte.sel);
  if (!z) return `<p class="note c-aide">Touche une parcelle pour voir où elle en est. Fais glisser un cheval d’une parcelle à l’autre pour le déplacer.</p>`;
  const p = liensCarte().get(z.id);
  const tete = `<div class="c-zfiche-h"><span class="eyebrow">${zoneNom(z)} · ≈ ${num(zoneHa(z), 2)} ha</span><button type="button" class="iconbtn" data-act="carte-sel" data-zone="" aria-label="Fermer">${ic('close', 'sm')}</button></div>`;
  if (z.type === 'verger') return tete + `<article class="pcard"><div class="pcard-h"><div class="row-main"><div class="row-t">Verger</div><div class="row-s">Les pommiers, au bout de la carrière</div></div></div><p class="note">Pas de chevaux ici.</p></article>`;
  if (!p) {
    const libres = pres().filter(x => !zoneDuPre(x) && (z.type === 'pre' ? !sansRotation(x) : true));
    const nouveau = z.type === 'pre' ? `Pré ${z.n}` : zoneNom(z);
    return tete + `<article class="pcard"><div class="pcard-h"><div class="row-main"><div class="row-t">${zoneNom(z)}</div><div class="row-s">Pas encore reliée au carnet</div></div><span class="pill">À relier</span></div>
      ${libres.length ? `<p class="note">C’est lequel de tes espaces ?</p><div class="wrap">${libres.map(x => `<button type="button" class="chip" data-act="carte-relier" data-zone="${z.id}" data-id="${x.id}">${esc(x.nom)}</button>`).join('')}</div>` : ''}
      ${sync.readOnly ? '' : `<button type="button" class="btn small" data-act="carte-creer" data-zone="${z.id}">${ic('plus', 'sm')}Créer « ${esc(nouveau)} »</button>`}</article>`;
  }
  return tete + pcard({ p, s: preStatus(p) });
}
ACT['carte-filtre'] = d => { carte.filtre = carte.filtre === d.etat ? null : d.etat; render(); };
ACT['carte-sel'] = d => { carte.sel = d.zone || null; render(); };
/* Quitter le plein écran pour voir la fiche de la parcelle choisie */
ACT['carte-reduire'] = () => {
  pleinEcran(false);
  setTimeout(() => { const f = document.querySelector('.c-fiche'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
};
ACT['carte-relier'] = d => {
  const z = zoneDe(d.zone), p = get('pres', d.id);
  if (!z || !p) return;
  list('pres').filter(o => o.id !== p.id && o.carte === z.id).forEach(o => put('pres', Object.assign({}, o, { carte: null })));
  const maj = Object.assign({}, p, { carte: z.id });
  if (!p.surface) maj.surface = zoneHa(z);
  put('pres', maj);
  toast(`${p.nom} → ${zoneNom(z)}${p.surface ? '' : ` · surface estimée ${num(zoneHa(z), 2)} ha`}`);
};
ACT['carte-creer'] = d => {
  const z = zoneDe(d.zone);
  if (!z) return;
  formPre(null, { nom: z.type === 'pre' ? `Pré ${z.n}` : zoneNom(z), type: z.type === 'pre' ? 'pre' : z.type, carte: z.id, surface: zoneHa(z) });
};
