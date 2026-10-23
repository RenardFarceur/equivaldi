
/* ---------- Chevaux ---------- */
const chevaux = (all = false) => list('chevaux').filter(h => all || !h.archive).sort(byName);
const cheval = id => get('chevaux', id);
const hNom = id => (cheval(id) || {}).nom || 'Cheval supprimé';
const hColor = h => Math.abs(parseInt(h && h.couleur, 10) || 0) % NB_COULEURS;
/* Photos : une vignette JPEG par cheval, déclarée une seule fois en CSS */
const PHOTO_RE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const photoOk = new Set();
let photoSig = null;
const phKey = id => String(id).replace(/[^A-Za-z0-9_-]/g, '_');
const hasPhoto = h => !!(h && photoOk.has(h.id));
function syncPhotos() {
  const hs = list('chevaux').filter(h => typeof h.photo === 'string' && h.photo);
  const sig = hs.map(h => `${h.id}:${h.photo.length}:${h.photo.slice(-16)}`).sort().join('|');
  if (sig === photoSig) return;
  photoSig = sig;
  photoOk.clear();
  const rules = [];
  hs.forEach(h => { if (PHOTO_RE.test(h.photo)) { photoOk.add(h.id); rules.push(`.av.ph-${phKey(h.id)}{background-image:url("${h.photo}")}`); } });
  let el = document.getElementById('photoCss');
  if (!el) { el = document.createElement('style'); el.id = 'photoCss'; document.body.appendChild(el); }
  el.textContent = rules.join('\n');
}
const av = (h, size = '') => hasPhoto(h)
  ? `<span class="av ${size} photo ph-${phKey(h.id)}" aria-hidden="true"></span>`
  : `<span class="av ${size} hc${hColor(h)}" aria-hidden="true">${esc(initials(h ? h.nom : '?'))}</span>`;
const hchip = h => h ? `<span class="hchip">${av(h, 's')}<span class="trunc">${esc(h.nom)}</span></span>` : '';
const exTag = o => o && o.ex ? '<span class="tag-ex">Exemple</span>' : '';
function nextColor() {
  const used = chevaux(true).map(hColor);
  for (let i = 0; i < NB_COULEURS; i++) if (!used.includes(i)) return i;
  return used.length % NB_COULEURS;
}

/* ---------- Soins & rappels ---------- */
const soinType = id => SOINS.find(s => s.id === id) || SOINS[SOINS.length - 1];
const soinTypes = s => (Array.isArray(s.types) && s.types.length) ? s.types : ['autre'];
function soinLabel(s) {
  return soinTypes(s).map(t => t === 'autre' && s.label ? s.label : soinType(t).short).join(' + ');
}
const soinIcon = s => soinType(soinTypes(s)[0]).icon;
const soinsDe = hid => list('soins').filter(s => s.horseId === hid);

/* Un rappel n'apparaît qu'à partir du premier soin enregistré de ce type */
function rappels(hid) {
  const R = cfg().rappels, t = todayISO(), out = [];
  const hs = hid ? [cheval(hid)].filter(Boolean) : chevaux();
  for (const h of hs) {
    const ss = soinsDe(h.id);
    for (const T of SOINS) {
      const iv = R[T.id];
      if (!iv) continue;
      const faits = ss.filter(s => s.statut !== 'prevu' && soinTypes(s).includes(T.id)).sort((a, b) => b.date.localeCompare(a.date));
      const last = faits[0];
      if (!last) continue;
      const due = validISO(last.prochain) ? last.prochain : addDays(last.date, iv);
      const planned = ss.filter(s => s.statut === 'prevu' && soinTypes(s).includes(T.id) && s.date >= last.date)
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
      out.push({ h, type: T, last, due, planned, days: diffDays(t, due) });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}
function rappelPill(r) {
  const A = cfg().alerte;
  if (r.planned) return `<span class="pill info">${ic('cal')}RDV ${dShort(r.planned.date)}</span>`;
  if (r.days < 0) return `<span class="pill danger">Retard ${nJ(-r.days)}</span>`;
  if (r.days <= A) return `<span class="pill warn">${r.days === 0 ? "Aujourd'hui" : 'Dans ' + nJ(r.days)}</span>`;
  return `<span class="pill ok">${dShort(r.due)}</span>`;
}

/* ---------- Prés & rotation ---------- */
const pres = (all = false) => list('pres').filter(p => all || !p.archive).sort(byName);
const openPlace = hid => list('places').find(p => p.horseId === hid && !p.fin) || null;
function horseWhere(hid) {
  const o = openPlace(hid);
  if (!o) return { txt: 'Au box', pre: null, place: null };
  const p = get('pres', o.preId);
  return { txt: p ? p.nom : 'Pré supprimé', pre: p || null, place: o };
}
/* Périodes d'occupation continues d'un pré (fusion des séjours de chaque cheval) */
function segments(preId) {
  const t = todayISO();
  const recs = list('places').filter(p => p.preId === preId && validISO(p.debut))
    .map(p => ({ a: p.debut, b: p.fin || t, open: !p.fin, h: p.horseId }))
    .sort((x, y) => x.a.localeCompare(y.a));
  const segs = [];
  for (const r of recs) {
    const last = segs[segs.length - 1];
    if (last && r.a <= last.b) {
      if (r.b > last.b) last.b = r.b;
      last.open = last.open || r.open;
      last.horses.add(r.h);
    } else segs.push({ a: r.a, b: r.b, open: r.open, horses: new Set([r.h]) });
  }
  return segs;
}
function preStatus(p) {
  const C = cfg(), t = todayISO();
  const cible = p.repos || C.repos, max = p.paturage || C.paturage;
  const segs = segments(p.id);
  const last = segs[segs.length - 1];
  if (last && last.open) {
    const horses = list('places').filter(x => x.preId === p.id && !x.fin).map(x => x.horseId);
    const days = diffDays(last.a, t);
    return { occupe: true, depuis: last.a, days, horses, max, cible, over: days > max };
  }
  if (!last) return { occupe: false, jamais: true, pret: true, repos: null, cible, max };
  const repos = diffDays(last.b, t);
  return { occupe: false, depuis: last.b, repos, cible, max, pret: repos >= cible };
}
function joursPatures(preId, depuis) {
  return segments(preId).reduce((acc, g) => {
    const a = g.a < depuis ? depuis : g.a;
    return acc + Math.max(0, diffDays(a, g.b));
  }, 0);
}
/* Pré conseillé : le plus reposé, de préférence ayant atteint sa cible */
function prePret(exclude) {
  const c = pres().filter(p => p.id !== exclude).map(p => ({ p, s: preStatus(p) })).filter(x => !x.s.occupe);
  c.sort((a, b) => (b.s.pret - a.s.pret) || ((b.s.repos ?? 9999) - (a.s.repos ?? 9999)));
  return c[0] || null;
}
/* Déplacer des chevaux (preId null = au box). Renvoie un message d'erreur ou une fonction d'annulation */
function moveHorses(hids, preId, date) {
  for (const hid of hids) {
    const o = openPlace(hid);
    if (o && o.debut > date) return { err: `${hNom(hid)} est arrivé dans son pré le ${dFull(o.debut)}, après cette date.` };
  }
  const before = [], created = [];
  for (const hid of hids) {
    const o = openPlace(hid);
    if (o && o.preId === preId) continue;
    if (o) {
      before.push(clone(o));
      if (o.debut === date) del('places', o.id); else put('places', Object.assign({}, o, { fin: date }));
    }
    if (preId) created.push(put('places', { horseId: hid, preId, debut: date, fin: null }).id);
  }
  return {
    n: before.length + created.length ? hids.length : 0,
    undo: () => { created.forEach(id => del('places', id)); before.forEach(o => put('places', o)); }
  };
}

/* ---------- Foin ---------- */
function stock() {
  const C = cfg(), by = {};
  C.balles.forEach(b => { by[b.id] = { b, n: 0, kgIn: 0, nIn: 0 }; });
  list('foin').forEach(m => {
    let x = by[m.balle];
    if (!x) x = by[m.balle] = { b: { id: m.balle, nom: m.balle || 'Balle', poids: m.poids || 0 }, n: 0, kgIn: 0, nIn: 0, orphan: true };
    const nb = Number(m.nb) || 0;
    if (m.sens === 'in') { x.n += nb; x.nIn += nb; x.kgIn += nb * (m.poids || x.b.poids || 0); } else x.n -= nb;
  });
  let kg = 0;
  Object.values(by).forEach(x => {
    x.poidsMoy = x.nIn ? x.kgIn / x.nIn : (x.b.poids || 0);
    x.kg = Math.max(0, x.n) * x.poidsMoy;
    kg += x.kg;
  });
  return { by, kg };
}
const estFoin = l => /foin/i.test(l.aliment || '');
function kgLigne(l) {
  const q = Number(l.qte);
  if (!Number.isFinite(q)) return null;
  if (l.unite === 'kg') return q;
  if (l.unite === 'g') return q / 1000;
  return null;
}
const nbRepas = l => Math.max(1, (l.repas || []).length);
function consoRations() {
  let kg = 0;
  chevaux().forEach(h => (h.ration || []).forEach(l => { if (estFoin(l)) { const q = kgLigne(l); if (q != null) kg += q * nbRepas(l); } }));
  return kg;
}
function consoReelle(st) {
  const t = todayISO();
  const outs = list('foin').filter(m => m.sens === 'out' && validISO(m.date));
  if (!outs.length) return null;
  const first = outs.reduce((a, m) => (m.date < a ? m.date : a), t);
  const span = Math.min(30, diffDays(first, t));
  if (span < 14) return null;
  const from = addDays(t, -span);
  let kg = 0;
  outs.forEach(m => { if (m.date > from && m.date <= t) { const x = st.by[m.balle]; kg += (Number(m.nb) || 0) * (x ? x.poidsMoy : 0); } });
  return kg / span;
}
function autonomie() {
  const st = stock(), C = cfg(), t = todayISO();
  const reel = consoReelle(st), rat = consoRations();
  const rate = reel != null && reel > 0 ? reel : (rat > 0 ? rat : null);
  const src = reel != null && reel > 0 ? 'reel' : 'rations';
  let fin = `${t.slice(0, 4)}-${C.finSaison}`;
  if (!validISO(fin) || fin <= t) fin = `${+t.slice(0, 4) + 1}-${C.finSaison}`;
  const joursSaison = diffDays(t, fin);
  return {
    st, reel, rat, rate, src, finSaison: fin, joursSaison,
    days: rate ? st.kg / rate : null,
    besoin: rate ? rate * joursSaison : null,
    solde: rate ? st.kg - rate * joursSaison : null
  };
}
function balleRef(st) {
  const xs = Object.values(st.by).filter(x => x.poidsMoy > 0);
  xs.sort((a, b) => b.kg - a.kg);
  return xs[0] || null;
}

/* ---------- Concours ---------- */
const nivLabel = id => (NIVEAUX.find(n => n.id === id) || {}).label || '';
const engLabel = id => (ENGAGEMENT.find(n => n.id === id) || {}).label || '';
const hasResult = c => c.rang != null || (c.score && String(c.score).trim());
function engPill(c) {
  const t = todayISO();
  if (c.statut === 'forfait') return '<span class="pill">Forfait</span>';
  if (c.statut === 'engage') return `<span class="pill ok">${ic('check')}Engagé</span>`;
  if (c.date < t) return '';
  if (validISO(c.cloture)) {
    const n = diffDays(t, c.cloture);
    if (n < 0) return '<span class="pill danger">Clôture passée</span>';
    if (n <= 7) return `<span class="pill warn">Engager ${dRel(c.cloture)}</span>`;
    return `<span class="pill">À engager avant le ${dShort(c.cloture)}</span>`;
  }
  return '<span class="pill">À engager</span>';
}
/* Contrôle vaccinal à la date du concours (règles FFE / SHF / FEI) */
function vacCheck(c) {
  const out = [];
  if (!c.horseId || !validISO(c.date) || c.niveau === 'autre') return out;
  const ss = soinsDe(c.horseId).filter(s => validISO(s.date) && s.date <= c.date);
  const last = type => ss.filter(s => soinTypes(s).includes(type)).sort((a, b) => b.date.localeCompare(a.date))[0];
  const fei = c.niveau === 'fei';
  const g = last('grippe');
  if (!g) out.push({ sev: 'warn', short: 'Grippe non renseignée', msg: "Aucun vaccin grippe enregistré pour ce cheval : il est obligatoire en compétition." });
  else {
    const d = diffDays(g.date, c.date), lim = fei ? 203 : 365;
    const prevu = g.statut === 'prevu' ? ' (prévu)' : '';
    if (d > lim) out.push({ sev: 'danger', short: 'Grippe expirée', msg: `Dernier vaccin grippe le ${dFull(g.date)}${prevu} : plus de ${fei ? '6 mois + 21 jours' : '12 mois'} avant le concours.` });
    else out.push({ sev: 'ok', short: 'Grippe OK', msg: `Vaccin grippe du ${dFull(g.date)}${prevu} : valable à la date du concours.` });
  }
  if (['amateur', 'pro', 'shf'].includes(c.niveau)) {
    const r = last('rhino');
    if (!r) out.push({ sev: 'warn', short: 'Rhino non renseignée', msg: `La rhinopneumonie est obligatoire en ${nivLabel(c.niveau)} : aucun vaccin enregistré.` });
    else if (diffDays(r.date, c.date) > 365) out.push({ sev: 'danger', short: 'Rhino expirée', msg: `Dernier vaccin rhinopneumonie le ${dFull(r.date)} : plus de 12 mois avant le concours.` });
    else out.push({ sev: 'ok', short: 'Rhino OK', msg: `Vaccin rhinopneumonie du ${dFull(r.date)} : valable à la date du concours.` });
  }
  const recent = ss.filter(s => soinTypes(s).some(t => soinType(t).vac)).map(s => ({ s, d: diffDays(s.date, c.date) })).filter(x => x.d <= 7)
    .sort((a, b) => a.d - b.d)[0];
  if (recent) {
    out.unshift(recent.d <= 6
      ? { sev: 'danger', short: 'Vaccin < 7 jours', msg: `Injection le ${dFull(recent.s.date)}, ${nJ(recent.d)} avant le concours : aucune injection n'est admise dans les 7 jours qui précèdent.` }
      : { sev: 'warn', short: 'Vaccin à 7 jours', msg: `Injection le ${dFull(recent.s.date)}, pile 7 jours avant : vérifie le délai auprès de l'organisateur.` });
  }
  return out;
}
function statsConcours(hid) {
  const t = todayISO();
  const cs = list('concours').filter(c => (!hid || c.horseId === hid) && c.date < t && c.statut !== 'forfait');
  const ranks = cs.map(c => Number(c.rang)).filter(n => Number.isFinite(n) && n > 0);
  return { sorties: cs.length, podiums: ranks.filter(n => n <= 3).length, victoires: ranks.filter(n => n === 1).length, best: ranks.length ? Math.min(...ranks) : null };
}
const historyValues = (coll, field) => {
  const seen = new Map();
  list(coll).sort((a, b) => (b.maj || 0) - (a.maj || 0)).forEach(o => { const v = (o[field] || '').toString().trim(); if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v); });
  return Array.from(seen.values());
};
const lastUsed = (coll, field) => historyValues(coll, field)[0] || '';
const exCount = () => COLS.reduce((n, k) => n + list(k).filter(o => o.ex).length, 0);

/* ---------- Entraînement ---------- */
const seancesDe = hid => list('seances').filter(s => s.horseId === hid && validISO(s.date));
const intLabel = id => (INTENSITES.find(x => x.id === id) || {}).label || '';
const resLabel = id => (RESSENTIS.find(x => x.id === id) || {}).label || '';
function statsSeances(hid) {
  const t = todayISO(), from = addDays(t, -7);
  const faites = seancesDe(hid).filter(s => s.statut !== 'prevu' && s.date <= t);
  const sem = faites.filter(s => s.date > from);
  const last = faites.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  return { n7: sem.length, min7: sem.reduce((a, s) => a + (Number(s.duree) || 0), 0), last };
}

/* ---------- Tâches partagées ---------- */
const taches = () => list('taches').sort((a, b) => String(a.titre || '').localeCompare(String(b.titre || ''), 'fr'));
const faitsDe = tk => (Array.isArray(tk.fait) ? tk.fait : []).filter(f => f && validISO(f.d))
  .sort((a, b) => b.d.localeCompare(a.d) || (b.t || 0) - (a.t || 0));
/* done = fait pour la période en cours ; retard = jours de retard (0 = à faire aujourd'hui) */
function tacheEtat(tk) {
  const t = todayISO(), fs = faitsDe(tk), last = fs[0] || null;
  if (tk.freq === 'une') {
    if (last) return { done: true, last, visible: last.d >= t, n: 0 };
    const due = validISO(tk.date) ? tk.date : null;
    const days = due ? diffDays(t, due) : null;
    return { done: false, last: null, due, days, retard: days != null && days < 0 ? -days : 0, visible: true, n: 0 };
  }
  const n = tk.freq === 'jours' ? Math.max(1, Math.round(Number(tk.n) || 1)) : 1;
  if (!last) return { done: false, last: null, visible: true, n, retard: 0 };
  const next = addDays(last.d, n);
  const done = next > t;
  return { done, last, next, n, visible: true, retard: done ? 0 : diffDays(next, t) };
}
const freqLabel = tk => tk.freq === 'une'
  ? (validISO(tk.date) ? `Le ${dShort(tk.date)}` : 'Une fois')
  : tk.freq === 'jours'
    ? (Math.round(Number(tk.n)) === 7 ? 'Chaque semaine' : `Tous les ${Math.max(1, Math.round(Number(tk.n) || 1))} jours`)
    : 'Chaque jour';
function faitTxt(f) {
  const qui = f.par ? ` par ${f.par}` : '';
  if (f.d === todayISO()) return `Fait${qui}${f.t ? ' à ' + hTxt(f.t) : " aujourd'hui"}`;
  return `Fait${qui} ${dRel(f.d)}`;
}
