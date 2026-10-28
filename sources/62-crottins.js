
/* ---------- Points crottins : chaque action rapporte, la boutique récompense ----------
   Les points ne sont pas stockés : ils se déduisent de ce qui a été fait (tâches cochées, soins gérés,
   concours…). Annuler l'action fait donc disparaître ses crottins, sur tous les téléphones. */
const CROT = {
  debut: '2026-10-25',                        // les actions comptent à partir du lancement du jeu
  tache: { base: 5, exp: .55, max: 40, une: 15 },
  tachesJour: 60,                             // plafond des tâches par personne et par jour : pas de crottins à la chaîne
  faitsMax: 400,                              // coches gardées par tâche (plus d'un an au quotidien)
  soins: { marechal: 20, dentiste: 20, osteo: 20, veto: 20, grippe: 15, tetanos: 15, rhino: 15, vermifuge: 8, autre: 10 },
  rdv: 5,                                     // bonus : rendez-vous prévu à l'avance puis honoré
  delai: 7,                                   // une saisie de plus d'une semaine après les faits ne rapporte rien
  seance: 5, concours: 40, podium: [0, 50, 35, 25],
  entretien: 15, deplacement: 3, balle: 3, ballesJour: 3, livraison: [10, 1, 30]
};
const EFFORTS = [{ id: 'leger', label: 'Léger', x: .6 }, { id: 'normal', label: 'Normal', x: 1 }, { id: 'costaud', label: 'Costaud', x: 2 }];
/* Du moins cher au plus cher : il faut plusieurs mois de coups de main pour le tapis */
const BOUTIQUE = [
  { id: 'biere', nom: 'Une bière offerte', prix: 150, ic: 'biere', tint: 'paille' },
  { id: 'apero', nom: 'Un apéro offert', prix: 300, ic: 'apero', tint: 'ciel' },
  { id: 'repas', nom: 'Un repas offert', prix: 550, ic: 'repas', tint: 'menthe' },
  { id: 'collectif', nom: 'Un cours collectif offert', prix: 800, ic: 'collectif', tint: 'prairie' },
  { id: 'tapis', nom: 'Un tapis offert', prix: 1200, ic: 'tapis', tint: 'ciel' },
  { id: 'particulier', nom: 'Un cours particulier offert', prix: 1500, ic: 'particulier', tint: 'paille' }
];
const RANGS = [
  { min: 0, nom: 'Poulain' }, { min: 200, nom: 'Yearling' }, { min: 600, nom: 'Cheval de club' },
  { min: 1500, nom: 'Cheval de concours' }, { min: 3000, nom: 'Crack' }, { min: 6000, nom: "Légende de l'écurie" }
];
Object.assign(ICONS, {
  biere: '<path d="M6 9.5h9V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M15 11.5h2.3a2.2 2.2 0 0 1 2.2 2.2v1.6a2.2 2.2 0 0 1-2.2 2.2H15"/><path d="M5.6 9.5a2.6 2.6 0 0 1 2.7-3.6 3.1 3.1 0 0 1 5.3.3 2.4 2.4 0 0 1 1.9 3.3"/><path d="M9.3 13v5M12 13v5"/>',
  apero: '<path d="M4.5 4.5h15L12 13Z"/><path d="M12 13v7M8 20.5h8"/><circle cx="14.6" cy="7.4" r="1.4"/><path d="M15.6 6.4 18 3.5"/>',
  repas: '<circle cx="13" cy="12.5" r="6.5"/><circle cx="13" cy="12.5" r="3.2"/><path d="M3.5 3.5v5a1.6 1.6 0 0 0 3.2 0v-5M5.1 8.5v12"/>',
  collectif: '<circle cx="6.5" cy="9.5" r="2.4"/><circle cx="17.5" cy="9.5" r="2.4"/><circle cx="12" cy="7" r="2.7"/><path d="M2.5 19c.4-2.9 2-4.5 4.2-4.5M21.5 19c-.4-2.9-2-4.5-4.2-4.5M7.2 20c.6-3.4 2.4-5.2 4.8-5.2s4.2 1.8 4.8 5.2"/>',
  tapis: '<path d="M4 7c0-1.5 1-2.5 2.5-2.5h9c3 0 5 2.6 5 6V15c0 2.6-1.7 4.5-4.2 4.5H8.2C5.6 19.5 4 17.6 4 15Z"/><path d="M8.6 12.6l1.5-1.6 1.5 1.6 1.5-1.6 1.5 1.6 1.5-1.6"/>',
  particulier: '<path d="M12 3.4l2.2 4.5 4.9.7-3.6 3.5.9 4.9-4.4-2.3-4.4 2.3.9-4.9-3.6-3.5 4.9-.7Z"/><path d="M8.5 20.5h7"/>'
});
/* Le crottin : trois boules dessinées à la main, qui fument un peu */
const crottinSvg = (cls = '') => `<svg class="crottin ${cls}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path class="cr-fume" d="M12.8 7.6c-1.7-1.5-1.7-3 0-4.4M18.6 7.2c-1.5-1.4-1.5-2.8 0-4.1"/><ellipse class="cr-b" cx="10.5" cy="22.6" rx="7" ry="6"/><ellipse class="cr-b" cx="21.6" cy="23.1" rx="6.8" ry="5.8"/><ellipse class="cr-b" cx="16" cy="14.6" rx="6.2" ry="5.4"/><path class="cr-l" d="M7.4 20.6q1.5-2 3.6-2.1M18.5 21.2q1.5-2 3.5-2M12.9 12.6q1.4-1.8 3.4-1.9"/></svg>`;

/* ---------- Barème ---------- */
function ptsTache(tk) {
  const ef = (EFFORTS.find(e => e.id === tk.effort) || EFFORTS[1]).x;
  const n = tk.freq === 'jours' ? Math.max(1, Math.round(Number(tk.n) || 1)) : 1;
  const base = tk.freq === 'une' ? CROT.tache.une : Math.min(CROT.tache.max, CROT.tache.base * Math.pow(n, CROT.tache.exp));
  return Math.max(2, Math.round(base * ef));
}
/* Tâche faite à plusieurs : les crottins se partagent à parts égales, arrondis au-dessus */
const partTache = (pot, n) => n > 1 ? Math.ceil(pot / n) : pot;
const ptsSoin = s => Math.max(...soinTypes(s).map(x => CROT.soins[x] || CROT.soins.autre)) + (s.planifie ? CROT.rdv : 0);

/* ---------- Moteur : qui a gagné quoi (recalculé à chaque changement de données) ---------- */
let crotMemo = null;
function crottinsEntrees() {
  if (crotMemo && crotMemo.v === dataV && crotMemo.j === todayISO()) return crotMemo.by;
  const D = CROT.debut, t = todayISO(), by = new Map(), vus = new Set();
  const jourT = ms => isoOf(new Date(ms));
  const recent = (o, d, j) => !!(o.creePar && o.creePar.t) && diffDays(d, jourT(o.creePar.t)) <= j;
  const auteur = o => o.creePar ? { uid: o.creePar.uid || null, nom: o.creePar.nom || '' } : null;
  const parT = (a, b) => ((a.creePar && a.creePar.t) || 0) - ((b.creePar && b.creePar.t) || 0);
  const add = (r, e) => {
    if (!(e.pts > 0)) return;
    const k = pKey(r);
    if (!k) return;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(e);
  };
  // tâches cochées : la valeur est fixée au moment de la coche et partagée entre ceux qui l'ont faite,
  // dans la limite du plafond du jour de chacun
  const coches = [], plafond = new Map();
  toutesTaches().forEach(tk => faitsDe(tk).forEach(f => { if (f.d >= D) coches.push({ tk, f, t: f.t || toUTC(f.d) }); }));
  coches.sort((a, b) => a.t - b.t).forEach(({ tk, f, t: T }) => {
    const qui = faitPar(f);
    if (!qui.length) return;
    const part = partTache(Number.isFinite(f.pts) ? f.pts : ptsTache(tk), qui.length);
    qui.forEach(r => {
      const u = `${pKey(r)}|${f.d}`, deja = plafond.get(u) || 0, pts = Math.min(part, CROT.tachesJour - deja);
      if (pts <= 0) return;
      plafond.set(u, deja + pts);
      add(r, { k: `tk:${tk.id}:${f.t || f.d}`, pts, d: f.d, t: T, quoi: qui.length > 1 ? 'Tâche à plusieurs' : 'Tâche', objet: tk.titre, icon: 'tasks' });
    });
  });
  // coches anciennes sorties de l'historique : leurs crottins restent acquis
  toutesTaches().forEach(tk => Object.values(tk.acquis || {}).forEach(a => {
    if (a && a.pts > 0) add({ uid: a.uid || null, nom: a.nom || '' }, { k: `tk:${tk.id}:acquis`, pts: a.pts, d: D, t: toUTC(D), quoi: 'Tâches', objet: tk.titre, icon: 'tasks' });
  }));
  // soins et rendez-vous : pour la personne qui les a gérés (un même soin noté deux fois ne compte qu'une fois)
  list('soins').filter(s => s.statut === 'fait' && s.gerePar && s.faitLe && validISO(s.date) && s.date >= D && s.date <= t)
    .sort((a, b) => a.faitLe - b.faitLe).forEach(s => {
    if (diffDays(s.date, jourT(s.faitLe)) > CROT.delai) return;
    const u = `so|${s.horseId}|${s.date}|${soinTypes(s).slice().sort().join('+')}`;
    if (vus.has(u)) return;
    vus.add(u);
    add(s.gerePar, { k: 'so:' + s.id, pts: ptsSoin(s), d: s.date, t: s.faitLe, quoi: s.planifie ? 'Rendez-vous honoré' : 'Soin géré', objet: `${soinLabel(s)} · ${hNom(s.horseId)}`, icon: soinIcon(s) });
  });
  // concours faits, et le podium en plus
  list('concours').forEach(c => {
    if (!validISO(c.date) || c.date < D || c.date > t || c.statut === 'forfait' || !(c.statut === 'engage' || hasResult(c))) return;
    const r = { uid: c.cavalierUid || null, nom: c.cavalier || '' }, rang = Number(c.rang), T0 = toUTC(c.date) + 12 * 36e5;
    add(r, { k: 'co:' + c.id, pts: CROT.concours, d: c.date, t: T0, quoi: 'Concours', objet: `${c.lieu || 'Concours'} · ${hNom(c.horseId)}`, icon: 'rosette' });
    if (rang >= 1 && rang <= 3) add(r, { k: 'po:' + c.id, pts: CROT.podium[rang], d: c.date, t: T0 + 1, quoi: rang === 1 ? 'Victoire' : 'Podium', objet: `${ordTxt(rang)} · ${c.lieu || 'Concours'}`, icon: 'rosette' });
  });
  // séances faites : une par cheval et par jour
  list('seances').filter(s => s.statut !== 'prevu' && validISO(s.date) && s.date >= D && s.date <= t && recent(s, s.date, CROT.delai)).sort(parT).forEach(s => {
    const r = { uid: s.cavalierUid || null, nom: s.cavalier || '' }, u = `se|${pKey(r)}|${s.horseId}|${s.date}`;
    if (vus.has(u)) return;
    vus.add(u);
    add(r, { k: 'se:' + s.id, pts: CROT.seance, d: s.date, t: s.creePar.t, quoi: 'Séance', objet: `${s.type || 'Séance'} · ${hNom(s.horseId)}`, icon: 'timer' });
  });
  // entretien des prés
  list('entretiens').filter(e => validISO(e.date) && e.date >= D && recent(e, e.date, CROT.delai)).sort(parT).forEach(e => {
    const r = auteur(e), u = `en|${pKey(r)}|${e.preId}|${e.type}|${e.date}`;
    if (vus.has(u)) return;
    vus.add(u);
    add(r, { k: 'en:' + e.id, pts: CROT.entretien, d: e.date, t: e.creePar.t, quoi: 'Entretien', objet: `${e.type || 'Travail'} · ${nomPre(e.preId)}`, icon: 'tool' });
  });
  // chevaux déplacés : un par cheval et par jour
  list('places').filter(p => validISO(p.debut) && p.debut >= D && recent(p, p.debut, 2)).sort(parT).forEach(p => {
    const r = auteur(p), u = `pl|${pKey(r)}|${p.horseId}|${p.debut}`;
    if (vus.has(u)) return;
    vus.add(u);
    add(r, { k: 'pl:' + p.id, pts: CROT.deplacement, d: p.debut, t: p.creePar.t, quoi: 'Déplacement', objet: `${hNom(p.horseId)} → ${nomPre(p.preId)}`, icon: 'move' });
  });
  // foin : balles entamées (trois par jour au plus), livraisons et récoltes
  const jour = new Map();
  list('foin').filter(m => validISO(m.date) && m.date >= D && m.creePar && m.creePar.t).sort(parT).forEach(m => {
    const r = auteur(m);
    if (m.sens === 'out') {
      if (!recent(m, m.date, 2)) return;
      const u = `${pKey(r)}|${m.date}`, deja = jour.get(u) || 0, nb = Math.min(Math.max(1, Number(m.nb) || 1), CROT.ballesJour - deja);
      if (nb <= 0) return;
      jour.set(u, deja + nb);
      add(r, { k: 'fo:' + m.id, pts: CROT.balle * nb, d: m.date, t: m.creePar.t, quoi: nb > 1 ? 'Balles entamées' : 'Balle entamée', objet: `${m.nb} ${balleNom(m.balle, m.nb)}`, icon: 'bale' });
    } else if (recent(m, m.date, CROT.delai)) {
      const [b, parB, max] = CROT.livraison;
      add(r, { k: 'fo:' + m.id, pts: Math.min(max, b + parB * (Number(m.nb) || 0)), d: m.date, t: m.creePar.t, quoi: 'Foin rentré', objet: `${m.nb} ${balleNom(m.balle, m.nb)}`, icon: 'bale' });
    }
  });
  crotMemo = { v: dataV, j: t, by };
  return by;
}
/* Historique des coches d'une tâche : les plus anciennes au-delà de faitsMax sont mises de côté par personne,
   avec les crottins qu'elles valaient, pour que le document reste léger sans que personne ne perde rien */
function garderFaits(tk, fs) {
  if (fs.length <= CROT.faitsMax) return { fait: fs };
  const by = crottinsEntrees(), acquis = Object.assign({}, tk.acquis || {});
  fs.slice(CROT.faitsMax).forEach(f => faitPar(f).forEach(r => {
    const pk = pKey(r), e = (by.get(pk) || []).find(x => x.k === `tk:${tk.id}:${f.t || f.d}`);
    const a = Object.assign({ uid: r.uid || null, nom: r.nom, pts: 0, n: 0 }, acquis[pk]);
    a.n += 1;
    if (e) a.pts += e.pts;
    acquis[pk] = a;
  }));
  return { fait: fs.slice(0, CROT.faitsMax), acquis };
}
function crottinsDe(k, from = null) {
  const es = (k && crottinsEntrees().get(k)) || [];
  const xs = from ? es.filter(e => e.d >= from) : es;
  return { entrees: xs, gagnes: xs.reduce((s, e) => s + e.pts, 0) };
}
/* Bons de la boutique : rangés dans la fiche d'équipe de chacun, un par clé */
function bonsDe(k) {
  const p = personne(k), b = p && p.m && p.m.bons;
  if (!b || typeof b !== 'object') return [];
  return Object.entries(b).map(([id, x]) => Object.assign({ id }, x)).filter(x => x && x.item && Number(x.prix) > 0);
}
const depensesCrottins = k => bonsDe(k).filter(b => b.statut !== 'annule').reduce((s, b) => s + Number(b.prix), 0);
const soldeDe = k => crottinsDe(k).gagnes - depensesCrottins(k);
function rangDe(total) {
  let i = 0;
  RANGS.forEach((r, j) => { if (total >= r.min) i = j; });
  return { i, r: RANGS[i], next: RANGS[i + 1] || null };
}
/* Rythme récent : crottins par semaine sur les quatre dernières semaines (ou depuis le lancement) */
function rythmeDe(k) {
  const t = todayISO(), from = addDays(t, -27), debut = from > CROT.debut ? from : CROT.debut;
  const jours = Math.max(7, diffDays(debut, t) + 1);
  return crottinsDe(k, debut).gagnes / jours * 7;
}
const delaiTxt = sem => sem <= 1 ? 'moins d’une semaine à ton rythme' : sem < 8.5 ? `environ ${Math.ceil(sem)} semaines à ton rythme` : `environ ${Math.round(sem / 4.35)} mois à ton rythme`;
/* L'estimation n'a de sens qu'après une première semaine de jeu */
const rythmeFiable = () => diffDays(CROT.debut, todayISO()) >= 6;

/* ---------- Compteur de l'en-tête ---------- */
let crotVu = null, crotRaf = 0, crotTenu = 0;
function compteVers(v) {
  const el = document.getElementById('crotN');
  if (!el) return;
  if (crotVu === null || !mouvementOk()) { crotVu = v; el.textContent = num(v, 0); return; }
  if (v === crotVu) return;
  const de = crotVu, t0 = performance.now(), dur = Math.min(1000, 300 + Math.abs(v - de) * 15);
  crotVu = v;
  cancelAnimationFrame(crotRaf);
  const pas = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = num(Math.round(de + (v - de) * e), 0);
    if (p < 1) crotRaf = requestAnimationFrame(pas);
  };
  crotRaf = requestAnimationFrame(pas);
}
/* Pendant une animation, le compteur attend l'arrivée des crottins (avec une limite de sécurité) */
function tenirCompteur(ms) { crotTenu = Date.now() + ms; setTimeout(majCrottins, ms + 30); }
function lacherCompteur() { crotTenu = 0; majCrottins(); }
function majCrottins() {
  const b = document.getElementById('crotBtn');
  if (!b) return;
  const k = kMoi();
  b.hidden = !k;
  if (!k) return;
  const v = soldeDe(k);
  b.classList.toggle('peut', BOUTIQUE.some(it => v >= it.prix));
  b.setAttribute('aria-label', `${num(v, 0)} ${pl(v, 'crottin')} : ouvrir la boutique`);
  if (Date.now() >= crotTenu) compteVers(v);
}

/* ---------- Gains et pertes pendant une action ---------- */
let crotPhoto = null, crotT = null, crotSilence = false, crotScene = false;
/* Partage d'une tâche déjà comptée : on ajuste en douceur (pas de grand spectacle ni de perte en rouge) */
let crotDoux = false;
const photoCrottins = () => { const m = new Map(); crottinsEntrees().forEach((es, k) => m.set(k, new Map(es.map(e => [e.k, e])))); return m; };
/* Appelé juste avant chaque enregistrement fait sur ce téléphone */
function crotAvant() {
  if (crotSilence || restauration) return;
  if (!crotPhoto) { crotPhoto = photoCrottins(); tenirCompteur(400); }
  clearTimeout(crotT);
  crotT = setTimeout(crotApres, 90);
}
function crotApres() {
  const avant = crotPhoto;
  crotPhoto = null;
  const doux = crotDoux;
  crotDoux = false;
  if (!avant) return;
  const apres = photoCrottins(), moi = kMoi(), total = m => m ? [...m.values()].reduce((s, e) => s + e.pts, 0) : 0;
  let mien = null;
  const autres = [];
  new Set([...avant.keys(), ...apres.keys()]).forEach(k => {
    const a = avant.get(k) || new Map(), b = apres.get(k) || new Map(), plus = [];
    let d = 0;
    b.forEach((e, ek) => { const o = a.get(ek); if (!o) { d += e.pts; plus.push(e); } else d += e.pts - o.pts; });
    a.forEach((e, ek) => { if (!b.has(ek)) d -= e.pts; });
    if (!d) return;
    if (k === moi) mien = { d, plus }; else autres.push({ k, d });
  });
  if (mien && mien.d > 0) {
    const e = mien.plus[0], label = mien.plus.length === 1 ? `${e.quoi} · ${e.objet}` : mien.plus.length > 1 ? `${mien.plus.length} actions récompensées` : 'Crottins gagnés';
    crotGain(mien.d, label, total(avant.get(moi)), total(apres.get(moi)), doux);
  } else {
    if (mien) { if (doux) crotBulle(`−${num(Math.abs(mien.d), 0)} · tâche partagée`); else crotPerte(mien.d); }
    lacherCompteur();
  }
  autres.forEach((x, i) => setTimeout(() => crotBulle(`${x.d > 0 ? '+' : '−'}${num(Math.abs(x.d), 0)} pour ${nomCourt(personne(x.k) || {})}${doux && x.d < 0 ? ' · partage' : ''}`, x.d < 0 && !doux), 300 + i * 500));
}

/* ---------- Animations ---------- */
const pillRect = () => { const b = document.getElementById('crotBtn'); return b && !b.hidden ? b.getBoundingClientRect() : { left: window.innerWidth - 90, top: 8, width: 70, height: 38 }; };
function crotGain(d, label, avant, apres, doux = false) {
  const fin = () => {
    lacherCompteur();
    fxOnce(document.getElementById('crotBtn'), 'fx-pop', 600);
    const r0 = rangDe(avant), r1 = rangDe(apres);
    if (r1.i > r0.i) setTimeout(() => crotRang(r1.r), 500);
  };
  if (!mouvementOk() || !Element.prototype.animate) { lacherCompteur(); crotBulle(`+${num(d, 0)} ${pl(d, 'crottin')}`); return; }
  vibre(15);
  if (ui.crotAnim !== 'discret' && !crotScene && !doux) crotSpectacle(d, label, fin);
  else crotMini(d, fin);
}
const boule = (x, y) => { const b = document.createElement('i'); b.className = 'crot-boule'; b.style.left = x + 'px'; b.style.top = y + 'px'; return b; };
/* Vol d'une boule jusqu'au compteur, en arc */
function volVersCompteur(b, x0, y0, delai, fin) {
  const p = pillRect(), tx = p.left + 20 - x0, ty = p.top + p.height / 2 - y0, mx = tx * .45 - 30, my = Math.min(0, ty) - 70;
  const a = b.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${mx}px,${my}px) scale(.85)`, offset: .45 },
    { transform: `translate(${tx}px,${ty}px) scale(.35)`, opacity: .85 }
  ], { duration: 620, delay: delai, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'forwards' });
  a.onfinish = () => { b.remove(); if (fin) fin(); };
}
/* Le grand spectacle : le cheval du logo arrive, lève la queue, fait ses crottins, qui filent au compteur */
function crotSpectacle(d, label, fin) {
  crotScene = true;
  tenirCompteur(3200);
  const L = fxLayer(), W = window.innerWidth, H = window.innerHeight;
  const cx = W / 2, cy = Math.max(170, Math.min(H * .38, 320));
  const sc = document.createElement('div');
  sc.className = 'crot-scene';
  sc.innerHTML = `<div class="crot-voile"></div><div class="crot-halo"></div><div class="crot-rayons">${Array.from({ length: 10 }, (_, i) => `<i style="transform:rotate(${i * 36}deg) translateY(-118px)"></i>`).join('')}</div>
    <div class="crot-cheval">${brandMark()}</div>
    <div class="crot-txt"><b>+${num(d, 0)}</b><span>${pl(d, 'crottin')}</span><small>${esc(label)}</small></div>`;
  L.appendChild(sc);
  const [voile, halo, rayons, cheval, txt] = sc.children;
  // voile sur l'écran, sous l'en-tête : le compteur reste bien visible
  const haut = document.getElementById('top');
  voile.style.top = (haut ? Math.max(0, haut.getBoundingClientRect().bottom) : 0) + 'px';
  voile.animate([{ opacity: 0, easing: 'ease-out' }, { opacity: .86, offset: .08 }, { opacity: .86, offset: .84, easing: 'ease-in' }, { opacity: 0 }], { duration: 2800, fill: 'forwards' });
  halo.style.left = rayons.style.left = cx + 'px';
  halo.style.top = rayons.style.top = (cy + 18) + 'px';
  cheval.style.left = (cx + 18) + 'px'; cheval.style.top = cy + 'px';
  txt.style.left = cx + 'px'; txt.style.top = (cy + 112) + 'px';
  const ease = 'cubic-bezier(.34,1.56,.64,1)';
  halo.animate([{ transform: 'scale(.2)', opacity: 0, easing: 'ease-out' }, { transform: 'scale(1)', opacity: 1, offset: .14 }, { transform: 'scale(1)', opacity: 1, offset: .8, easing: 'ease-in' }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 2700, fill: 'forwards' });
  rayons.animate([{ transform: 'scale(.3) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(25deg)', opacity: 1, offset: .2 }, { transform: 'scale(1.05) rotate(70deg)', opacity: 1, offset: .8 }, { transform: 'scale(1.2) rotate(90deg)', opacity: 0 }], { duration: 2700, fill: 'forwards' });
  cheval.animate([{ transform: 'translateX(-46px) translateY(20px) scale(.55)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: ease, fill: 'backwards' });
  const queue = cheval.querySelector('.lg-queue');
  if (queue) queue.animate([{ transform: 'none' }, { transform: 'rotate(42deg)', offset: .22 }, { transform: 'rotate(36deg)', offset: .5 }, { transform: 'rotate(42deg)', offset: .78 }, { transform: 'none' }], { duration: 1150, delay: 380, easing: 'ease-in-out' });
  // les crottins tombent sous la queue, rebondissent et restent posés un instant
  // géométrie du cheval (128 × 126, centré sur cx + 18, cy) : la queue est à gauche, les sabots en bas
  const n = Math.min(7, 2 + Math.ceil(d / 10)), bw = 128, bh = 126, bl = cx + 18 - bw / 2, bt = cy - bh / 2;
  const x0 = bl + bw * .21, y0 = bt + bh * .56, sol = bt + bh * .9;
  const boules = [];
  for (let i = 0; i < n; i++) {
    const b = boule(x0, y0), dx = -12 - i * 13 + (i % 2 ? 6 : -4), dy = sol - y0 - (i % 3) * 3;
    sc.appendChild(b);
    b.animate([
      { transform: 'translate(0,0) scale(.4)', opacity: 0 },
      { transform: `translate(${dx * .3}px,${dy * .1}px) scale(.9)`, opacity: 1, offset: .15 },
      { transform: `translate(${dx}px,${dy}px) scale(1.05,.9)`, offset: .62, easing: 'ease-out' },
      { transform: `translate(${dx}px,${dy - 13}px) scale(.96,1.04)`, offset: .8, easing: 'ease-in' },
      { transform: `translate(${dx}px,${dy}px) scale(1)` }
    ], { duration: 560, delay: 520 + i * 110, easing: 'ease-in', fill: 'both' });
    boules.push({ b, x: x0 + dx, y: y0 + dy });
  }
  txt.animate([{ transform: 'translate(-50%,0) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,0) scale(1.12)', opacity: 1, offset: .6 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 520, delay: 640, easing: 'ease-out', fill: 'backwards' });
  // envol vers le compteur
  setTimeout(() => {
    let arrives = 0;
    boules.forEach(({ b, x, y }, i) => {
      b.getAnimations().forEach(a => { try { a.commitStyles(); } catch (e) { /* ancien navigateur */ } a.cancel(); });
      b.style.transform = '';
      b.style.left = x + 'px'; b.style.top = y + 'px';
      volVersCompteur(b, x, y, i * 70, () => { if (++arrives === 1 && fin) fin(); });
    });
  }, 1650);
  setTimeout(() => cheval.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(40px,-26px) rotate(8deg)', opacity: 1, offset: .4 }, { transform: 'translate(120px,0) rotate(0deg)', opacity: 0 }], { duration: 560, easing: 'ease-in', fill: 'forwards' }), 1850);
  setTimeout(() => txt.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-14px)' }], { duration: 380, fill: 'forwards' }), 2150);
  setTimeout(() => { sc.remove(); crotScene = false; }, 2900);
}
/* Version discrète : un « +5 » près du compteur et deux crottins qui y filent */
function crotMini(d, fin) {
  tenirCompteur(1400);
  const L = fxLayer(), W = window.innerWidth, H = window.innerHeight;
  let arrives = 0;
  for (let i = 0; i < 2; i++) {
    const x = W / 2 + (i ? 16 : -16), y = H * .55, b = boule(x, y);
    L.appendChild(b);
    b.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
    volVersCompteur(b, x, y, 180 + i * 90, () => { if (++arrives === 1 && fin) fin(); });
  }
  crotBulle(`+${num(d, 0)}`);
}
/* Perte : le compteur sursaute et un crottin tombe */
function crotPerte(d) {
  const p = pillRect(), b = boule(p.left + 20, p.top + p.height / 2);
  fxLayer().appendChild(b);
  if (Element.prototype.animate && mouvementOk()) {
    b.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(-14px,46px) rotate(-40deg)', opacity: 1, offset: .5 }, { transform: 'translate(-26px,150px) rotate(-90deg)', opacity: 0 }], { duration: 800, easing: 'ease-in' }).onfinish = () => b.remove();
  } else b.remove();
  fxOnce(document.getElementById('crotBtn'), 'fx-secoue', 500);
  crotBulle(`−${num(Math.abs(d), 0)} ${pl(Math.abs(d), 'crottin')}`, true);
}
/* Petite étiquette sous le compteur */
function crotBulle(txt, perte = false) {
  const p = pillRect(), el = document.createElement('div');
  el.className = 'crot-bulle' + (perte ? ' perte' : '');
  el.textContent = txt;
  el.style.right = Math.max(8, window.innerWidth - (p.left + p.width)) + 'px';
  // les étiquettes s'empilent sous le compteur au lieu de se recouvrir
  const deja = [...fxLayer().querySelectorAll('.crot-bulle')].map(b => b.getBoundingClientRect().bottom);
  el.style.top = (deja.length ? Math.max(...deja) + 6 : p.top + p.height + 8) + 'px';
  fxLayer().appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
/* Nouveau rang : bannière, saut du cheval et gerbe de crins */
function crotRang(r) {
  if (!mouvementOk()) { toast(`Nouveau rang : ${r.nom} !`, { fete: true }); return; }
  vibre([30, 60, 30]);
  const el = document.createElement('div');
  el.className = 'crot-rang';
  el.innerHTML = `${brandMark()}<div><small>Nouveau rang</small><b>${esc(r.nom)}</b></div>`;
  fxLayer().appendChild(el);
  el.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.08) rotate(2deg)', opacity: 1, offset: .35 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .85 }, { transform: 'translate(-50%,-50%) scale(.9)', opacity: 0 }], { duration: 2600, easing: 'ease-out' }).onfinish = () => el.remove();
  setTimeout(() => confettis(el), 450);
  setTimeout(() => confettis(el), 900);
}
/* Achat : les crottins quittent le compteur pour la récompense, qui reçoit son tampon */
function crotAchat(card) {
  if (!card || !mouvementOk() || !Element.prototype.animate) return;
  const p = pillRect(), r = card.getBoundingClientRect(), L = fxLayer();
  for (let i = 0; i < 5; i++) {
    const x = p.left + 20, y = p.top + p.height / 2, b = boule(x, y);
    L.appendChild(b);
    const tx = r.left + r.width * (.3 + i * .1) - x, ty = r.top + r.height / 2 - y;
    b.animate([{ transform: 'translate(0,0) scale(.4)' }, { transform: `translate(${tx * .5}px,${ty * .5 - 50}px) scale(.9)`, offset: .45 }, { transform: `translate(${tx}px,${ty}px) scale(.8)`, opacity: 0 }], { duration: 650, delay: i * 80, easing: 'cubic-bezier(.45,0,.4,1)' }).onfinish = () => b.remove();
  }
  setTimeout(() => {
    const st = document.createElement('div');
    st.className = 'bon-tampon';
    st.textContent = 'Bon';
    st.style.left = (r.left + r.width / 2) + 'px'; st.style.top = (r.top + r.height / 2) + 'px';
    L.appendChild(st);
    st.animate([{ transform: 'translate(-50%,-50%) scale(2.6) rotate(-4deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(.95) rotate(-12deg)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-12deg)', opacity: 1, offset: .8 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-12deg)', opacity: 0 }], { duration: 1600, easing: 'ease-out' }).onfinish = () => st.remove();
    confettis(st);
    vibre(20);
  }, 650);
}

/* ---------- Boutique ---------- */
function carteRecompense(it, solde, rythme, peutAcheter) {
  const ok = solde >= it.prix, pct = Math.max(0, Math.min(100, Math.round(solde / it.prix * 100)));
  const reste = it.prix - solde;
  const quand = ok ? 'Tu peux l’échanger dès maintenant' : `Encore ${num(reste, 0)} ${pl(reste, 'crottin')}${rythmeFiable() && rythme > 0.5 ? ` · ${delaiTxt(reste / rythme)}` : ''}`;
  return `<div class="bq-item${ok ? ' ok' : ''}" data-key="bq-${it.id}">
    <span class="qa-ic ${it.tint}">${ic(it.ic)}</span>
    <div class="row-main"><div class="row-t">${esc(it.nom)}</div>
      <div class="bq-prix">${num(it.prix, 0)} ${crottinSvg('s')}</div>
      <div class="gauge"><i style="width:${pct}%"></i></div>
      <div class="row-s">${esc(quand)}</div></div>
    ${ok && peutAcheter ? `<button type="button" class="btn small primary" data-act="echanger" data-id="${it.id}">Échanger</button>` : ''}
  </div>`;
}
const itemDe = id => BOUTIQUE.find(x => x.id === id) || null;
VIEWS.boutique = () => {
  const k = kMoi(), solde = k ? soldeDe(k) : 0, tot = k ? crottinsDe(k).gagnes : 0, R = rangDe(tot), rythme = k ? rythmeDe(k) : 0;
  const peutAcheter = !!(window.EQ_MODE && window.EQ && me.uid && get('membres', me.uid));
  const pctR = R.next ? Math.round((tot - R.r.min) / (R.next.min - R.r.min) * 100) : 100;
  let html = `<div class="card bq-hero">${crottinSvg('xl')}<div class="row-main">
      <div class="bq-solde"><b id="bqSolde">${num(solde, 0)}</b><span>${pl(solde, 'crottin')} à dépenser</span></div>
      <div class="row-s">${num(tot, 0)} ${pl(tot, 'gagné')} en tout${rythmeFiable() && rythme > 0.5 ? ` · environ ${num(rythme, 0)} par semaine en ce moment` : ''}</div>
      <div class="wrap"><span class="pill ok">${esc(R.r.nom)}</span>${R.next ? `<span class="small muted">encore ${num(R.next.min - tot, 0)} pour devenir ${esc(R.next.nom)}</span>` : ''}</div>
      ${R.next ? `<div class="gauge"><i style="width:${pctR}%"></i></div>` : ''}
    </div></div>
    <button type="button" class="link" data-act="crot-regles" style="align-self:flex-start">${crottinSvg('s')}Comment gagner des crottins ?</button>`;
  html += section('Récompenses', `<div class="bq-list">${BOUTIQUE.map(it => carteRecompense(it, solde, rythme, peutAcheter)).join('')}</div>
    ${peutAcheter ? '' : '<p class="note">Les échanges se font dans l’appli installable, avec ton compte de l’équipe.</p>'}`);
  // mes bons
  const mes = k ? bonsDe(k).filter(b => b.statut !== 'annule').sort((a, b) => (b.t || 0) - (a.t || 0)) : [];
  if (mes.length) html += section('Mes bons', `<div class="list">${mes.map(b => {
    const it = itemDe(b.item) || { nom: b.nom || 'Récompense', ic: 'particulier', tint: 'paille' };
    const etat = b.statut === 'offert' ? `<span class="pill ok">${ic('check')}Offert ${b.offertLe ? dRel(isoOf(new Date(b.offertLe))) : ''}</span>` : '<span class="pill info">À recevoir</span>';
    return `<div class="row"><span class="qa-ic ${it.tint}">${ic(it.ic)}</span><div class="row-main"><div class="row-t">${esc(it.nom)}</div><div class="row-s">${num(Number(b.prix), 0)} crottins · le ${dShort(isoOf(new Date(b.t || Date.now())))}</div><div class="wrap" style="margin-top:4px">${etat}</div></div>${b.statut === 'attente' ? `<button type="button" class="btn small" data-act="bon-annuler" data-id="${esc(b.id)}" data-confirm="Rembourser ?">Annuler</button>` : ''}</div>`;
  }).join('')}</div>`);
  // la gérante voit les bons à offrir de toute l'équipe
  if (estGerante()) {
    const att = [];
    membres().forEach(m => bonsDe('u:' + m.id).filter(b => b.statut === 'attente').forEach(b => att.push({ m, b })));
    att.sort((a, b) => (a.b.t || 0) - (b.b.t || 0));
    html += section(`Bons à offrir${att.length ? ` <span class="count">${att.length}</span>` : ''}`, att.length ? `<div class="list">${att.map(({ m, b }) => {
      const it = itemDe(b.item) || { nom: b.nom || 'Récompense' };
      return `<div class="row">${pav({ uid: m.id })}<div class="row-main"><div class="row-t">${esc(nomCourt({ uid: m.id }))} · ${esc(it.nom)}</div><div class="row-s">Demandé ${esc(dRel(isoOf(new Date(b.t || Date.now()))))}</div></div><button type="button" class="btn small primary" data-act="bon-offert" data-uid="${esc(m.id)}" data-id="${esc(b.id)}">C’est offert</button></div>`;
    }).join('')}</div>` : '<p class="note">Quand quelqu’un échange ses crottins, son bon apparaît ici : tu le marques offert une fois la récompense donnée.</p>');
  }
  return { title: 'Boutique', eyebrow: 'Points crottins', html, fab: null };
};
ACT.boutique = () => { const t = topView(); if (t && t.view === 'boutique') return; push('boutique'); };
ACT['crot-regles'] = () => {
  const tl = (f, n) => ptsTache({ freq: f, n });
  const ligne = (icon, t, s, p) => `<div class="row">${lead(icon)}<div class="row-main"><div class="row-t">${t}</div>${s ? `<div class="row-s">${s}</div>` : ''}</div><span class="row-end bq-pts">${p}</span></div>`;
  openSheet('Gagner des crottins', `<div class="list">
    ${ligne('tasks', 'Tâche quotidienne', 'Foin, eau, tour des chevaux…', `+${tl('jour')}`)}
    ${ligne('tasks', 'Tâche tous les 3 jours', 'Plus la tâche est rare, plus elle rapporte', `+${tl('jours', 3)}`)}
    ${ligne('tasks', 'Tâche hebdomadaire', 'Ou ponctuelle : +' + CROT.tache.une, `+${tl('jours', 7)}`)}
    ${ligne('tool', 'Effort de la tâche', 'Léger ×0,6 · Costaud ×2', '')}
    ${ligne('tasks', 'Plafond des tâches', 'Par personne et par jour', `${CROT.tachesJour} max`)}
    ${ligne('avec', 'Tâche à plusieurs', 'Appui long sur la case, ou le bouton à droite d’une tâche cochée : les crottins se partagent à parts égales', '')}
    ${ligne('shoe', 'Rendez-vous géré', 'Maréchal, véto, dentiste, ostéo · vaccin +15 · vermifuge +8', `+${CROT.soins.marechal}`)}
    ${ligne('cal', 'Rendez-vous prévu puis honoré', 'En plus du soin', `+${CROT.rdv}`)}
    ${ligne('rosette', 'Concours fait', 'Pour le cavalier', `+${CROT.concours}`)}
    ${ligne('rosette', 'Podium', `3e +${CROT.podium[3]} · 2e +${CROT.podium[2]}`, `+${CROT.podium[1]}`)}
    ${ligne('timer', 'Séance de travail', 'Une par cheval et par jour', `+${CROT.seance}`)}
    ${ligne('tool', 'Entretien de pré', 'Hersage, clôtures, fauche…', `+${CROT.entretien}`)}
    ${ligne('bale', 'Foin rentré', 'Livraison ou récolte', `+${CROT.livraison[0]} à ${CROT.livraison[2]}`)}
    ${ligne('bale', 'Balle entamée', `${CROT.ballesJour} par jour au plus`, `+${CROT.balle}`)}
    ${ligne('move', 'Chevaux déplacés', 'Un par cheval et par jour', `+${CROT.deplacement}`)}
  </div>
  <p class="note">Annuler une action retire ses crottins. Ce qui est noté trop tard ne rapporte rien : une semaine au plus après coup, deux jours pour les déplacements et les balles entamées. Le compteur part du ${dFull(CROT.debut)}.</p>`);
};
ACT.echanger = d => {
  const it = itemDe(d.id), k = kMoi();
  if (!it || !k || !window.EQ || !me.uid) return;
  if (soldeDe(k) < it.prix) { toast('Pas encore assez de crottins.', { danger: true }); return; }
  openSheet(it.nom, `<div class="bq-confirm"><span class="qa-ic ${it.tint}">${ic(it.ic)}</span><p>Échanger <b>${num(it.prix, 0)} crottins</b> contre ${esc(it.nom.charAt(0).toLowerCase() + it.nom.slice(1))} ?</p></div>
    <p class="note">Ton bon apparaît chez la gérante, qui le marque offert une fois la récompense donnée. Tu peux l’annuler tant qu’il n’est pas offert.</p>`, {
    submit: `Échanger ${num(it.prix, 0)} crottins`, local: true,
    onSubmit: () => {
      const id = 'b' + uid();
      EQ.bon(me.uid, id, { item: it.id, nom: it.nom, prix: it.prix, t: Date.now(), statut: 'attente' })
        .catch(() => toast("L'échange n'a pas pu être enregistré.", { danger: true }));
      setTimeout(() => crotAchat(document.querySelector(`[data-key="bq-${it.id}"]`)), 320);
      toast(`Bon pour ${it.nom.charAt(0).toLowerCase() + it.nom.slice(1)} !`, { fete: true, undo: () => EQ.bon(me.uid, id, { statut: 'annule', annuleLe: Date.now() }) });
    }
  });
};
ACT['bon-annuler'] = d => {
  if (!window.EQ || !me.uid) return;
  EQ.bon(me.uid, d.id, { statut: 'annule', annuleLe: Date.now() }).catch(() => toast("L'annulation n'a pas pu être enregistrée.", { danger: true }));
  toast('Bon annulé : tes crottins te sont rendus');
};
ACT['bon-offert'] = (d, el) => {
  if (!window.EQ || !estGerante()) return;
  EQ.bon(d.uid, d.id, { statut: 'offert', offertLe: Date.now(), offertPar: moiRef() }).catch(() => toast("La modification n'a pas pu être enregistrée.", { danger: true }));
  confettis(el);
  toast('Récompense marquée offerte');
};

/* ---------- Classement de l'équipe ---------- */
function classementCrottins(P) {
  const rows = [];
  crottinsEntrees().forEach((es, k) => {
    const p = personne(k);
    if (!p) return;
    const pts = es.filter(e => !P.from || e.d >= P.from).reduce((s, e) => s + e.pts, 0);
    if (pts > 0) rows.push({ p, pts, tot: es.reduce((s, e) => s + e.pts, 0) });
  });
  rows.sort((a, b) => b.pts - a.pts || byName(a.p, b.p));
  if (!rows.length) return `<p class="note">Personne n’a encore gagné de crottins ${P.label}. Coche une tâche pour ouvrir le bal !</p>`;
  const max = rows[0].pts;
  return `<div class="list">${rows.map((x, i) => `<button type="button" class="row" data-act="open-membre" data-k="${esc(x.p.k)}">
    <span class="podium p${i < 3 ? i + 1 : 0}">${i + 1}</span>${pav(x.p)}
    <div class="row-main"><div class="row-t">${esc(x.p.nom)}${estMoi(x.p.k) ? ' <span class="pill ok">Toi</span>' : ''}</div><div class="row-s">${esc(rangDe(x.tot).r.nom)}</div>
      <div class="gauge"><i style="width:${Math.round(x.pts / max * 100)}%"></i></div></div>
    <span class="row-end bq-pts">${num(x.pts, 0)} ${crottinSvg('s')}</span></button>`).join('')}</div>`;
}
