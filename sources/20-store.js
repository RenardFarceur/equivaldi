
/* ---------- Données : copie locale + base de l'artifact ---------- */
const COLS = ['chevaux', 'soins', 'pres', 'places', 'entretiens', 'foin', 'concours', 'seances', 'taches'];
const S = { chevaux: {}, soins: {}, pres: {}, places: {}, entretiens: {}, foin: {}, concours: {}, seances: {}, taches: {}, cfg: null };
/* Fiches des membres (version installable) : lues avec le carnet, jamais exportées ni effacées avec lui */
const EXTRA = window.EQ_MODE ? ['membres'] : [];
EXTRA.forEach(k => { S[k] = {}; });
/* Version installable : l'écurie ouverte sur ce téléphone est connue avant Firebase (equivaldi:ecurie:v1).
   Elle nomme la copie locale et la file d'envoi : chaque écurie a les siennes. */
const ECURIE = window.EQ_MODE ? (() => {
  try { const v = JSON.parse(localStorage.getItem('equivaldi:ecurie:v1') || 'null'); return v && typeof v.sid === 'string' && v.sid ? v : null; } catch (e) { return null; }
})() : null;
const SID = ECURIE ? ECURIE.sid : null;
window.EQ_SID = SID;
const CACHE_KEY = window.EQ_MODE ? (SID ? 'carnet-ecurie:cache:v1:' + SID : null) : 'carnet-ecurie:cache:v1';
const OUTBOX_KEY = window.EQ_MODE ? (SID ? 'carnet-ecurie:outbox:v1:' + SID : null) : 'carnet-ecurie:outbox:v1';
const UI_KEY = 'carnet-ecurie:ui:v1';
/* L'écurie ouverte et la liste de mes écuries : celles de Firebase dès qu'il répond, sinon celles gardées ici */
const ecurieOuverte = () => (window.EQ && window.EQ.ecurie) || ECURIE || null;
const mesEcuries = () => (window.EQ && Array.isArray(window.EQ.ecuries) && window.EQ.ecuries.length ? window.EQ.ecuries : (ECURIE && Array.isArray(ECURIE.ecuries) ? ECURIE.ecuries : []));
let outbox = [];
let DB = null;
let dataV = 0;              // change à chaque modification des données (calculs mis en cache)
const sync = { mode: 'loading', error: null, loaded: new Set() };
/* Lecture seule : rôle « Lecture seule », ou écurie dont l'essai est fini sans abonnement (61-abonnement.js) */
let roRole = false;
Object.defineProperty(sync, 'readOnly', { enumerable: true, get: () => roRole || ecurieFigee(), set: v => { roRole = !!v; } });

/* Qui utilise le carnet (partage à plusieurs) */
const me = { uid: null, owner: null, platformName: '' };
const MOI_KEY = 'carnet-ecurie:moi:v1';
let moiMem = '';
function getMoi() {
  try { const v = JSON.parse(localStorage.getItem(MOI_KEY) || 'null'); if (v && typeof v.nom === 'string' && v.nom) return v.nom; } catch (e) { /* stockage indisponible */ }
  return moiMem;
}
/* Mon nom : celui de ma fiche dans l'équipe, sinon le prénom gardé sur ce téléphone */
const moiNom = () => {
  if (window.EQ && window.EQ.ecurie && window.EQ.ecurie.fantome) return 'EquiValdi';   // administration : jamais son prénom
  const m = me.uid && S.membres ? S.membres[me.uid] : null; return (m && String(m.nom || '').trim()) || getMoi() || me.platformName || '';
};
const moiRef = () => ({ uid: me.uid || null, nom: moiNom() });
function setMoi(n) { moiMem = n; try { localStorage.setItem(MOI_KEY, JSON.stringify({ nom: n })); } catch (e) { /* gardé pour cette visite */ } }
const RO_MSG = window.EQ_MODE
  ? "Tu as un accès en lecture seule. Demande à la gérante du carnet de te passer en « Peut modifier »."
  : "Tu as un accès en lecture seule. Demande à la personne qui gère le carnet de te donner le droit « Peut modifier ».";
function setReadOnly() { if (roRole) return; sync.readOnly = true; rerenderSoon(); }
/* Le message qui va avec : essai terminé, ou droit « Lecture seule » */
function roMsg() { return ecurieFigee() ? figeeMsg() : RO_MSG; }
async function connectUser() {
  let u = null;
  try { u = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('user') : null; } catch (e) { u = null; }
  if (!u) return;
  try { const m = await u.me(); me.uid = m.id || null; me.platformName = m.name || ''; me.owner = !!m.isOwner; } catch (e) { /* inconnu */ }
  try { if ((await u.can('data.write')) === false && !me.owner) setReadOnly(); } catch (e) { /* inconnu : on laisse les écritures décider */ }
  rerenderSoon();
}
/* Recharge un document depuis le carnet en ligne (après un refus d'écriture) */
async function resync(op) {
  if (!DB) return;
  try {
    if (op.coll === 'config') { const s = await DB.doc('config/reglages').get(); S.cfg = s.exists ? clone(s.data()) : null; }
    else {
      const s = await DB.collection(op.coll).doc(op.id).get();
      if (s.exists) { const o = clone(s.data()); o.id = s.id; S[op.coll][op.id] = o; } else delete S[op.coll][op.id];
    }
    dataV++;
    saveCache();
    rerenderSoon();
  } catch (e) { /* on réessaiera au prochain chargement */ }
}

function lsGet(k) { if (!k) return null; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { if (!k) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
/* Une modification en attente ne part jamais vers une autre écurie que la sienne : rangée dans sa propre file */
const aMoi = o => !o.sid || !SID || o.sid === SID;
function renvoyer(op) {
  if (!op.sid) return;
  const k = 'carnet-ecurie:outbox:v1:' + op.sid, l = lsGet(k);
  lsSet(k, (Array.isArray(l) ? l : []).concat([op]));
}

function loadCache() {
  const c = lsGet(CACHE_KEY);
  if (c && typeof c === 'object') {
    [...COLS, ...EXTRA].forEach(k => { S[k] = (c[k] && typeof c[k] === 'object') ? c[k] : {}; });
    S.cfg = c.cfg || null;
  }
  dataV++;
  const o = lsGet(OUTBOX_KEY);
  outbox = Array.isArray(o) ? o : [];
  const autres = outbox.filter(x => !aMoi(x));
  if (autres.length) { autres.forEach(renvoyer); outbox = outbox.filter(aMoi); saveOutbox(); }
  // les modifications pas encore envoyées restent prioritaires
  outbox.forEach(applyOp);
}
let cacheTimer = null;
function saveCache() {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    const o = { cfg: S.cfg };
    [...COLS, ...EXTRA].forEach(k => { o[k] = S[k]; });
    lsSet(CACHE_KEY, o);
  }, 200);
}
const saveOutbox = () => lsSet(OUTBOX_KEY, outbox);

function applyOp(o) {
  if (o.coll === 'config') { S.cfg = o.op === 'set' ? o.data : null; return; }
  if (!S[o.coll]) return;
  if (o.op === 'set') S[o.coll][o.id] = o.data; else delete S[o.coll][o.id];
}

/* Lecture */
const list = coll => Object.values(S[coll] || {});
const get = (coll, id) => (S[coll] || {})[id];

/* Écriture : immédiate en local, envoyée ensuite dans l'ordre */
let restauration = false;   // pendant une restauration, les fiches gardent leur auteur d'origine
function put(coll, obj) {
  const o = clone(obj);
  if (!o.id) o.id = uid();
  // qui a ajouté la fiche : sert au fil de l'équipe
  if (coll !== 'membres' && !restauration && !S[coll][o.id] && !o.creePar) o.creePar = Object.assign(moiRef(), { t: Date.now() });
  o.maj = Date.now();
  crotAvant();
  S[coll][o.id] = o;
  queue(coll, o.id, 'set', o);
  return o;
}
function del(coll, id) {
  if (!S[coll][id]) return;
  crotAvant();
  delete S[coll][id];
  queue(coll, id, 'del', null);
}
function putCfg(c) {
  S.cfg = clone(c);
  queue('config', 'reglages', 'set', S.cfg);
}
function queue(coll, id, op, data) {
  dataV++;
  const k = coll + '/' + id;
  outbox = outbox.filter(o => o.k !== k);
  outbox.push({ k, coll, id, op, data: data ? clone(data) : null, sid: SID });
  saveOutbox();
  saveCache();
  flushSoon();
  updateSync();
  rerenderSoon();
}

let flushing = false, flushTimer = null, backoff = 2000;
function flushSoon(ms = 300) {
  if (!DB) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, ms);
}
async function flush() {
  if (!DB || flushing) return;
  flushing = true;
  try {
    while (outbox.length && DB) {
      const op = outbox[0];
      // garde-fou : jamais vers une autre écurie que la sienne
      if (op.sid && DB.sid && op.sid !== DB.sid) { outbox = outbox.filter(o => o !== op); saveOutbox(); renvoyer(op); continue; }
      try {
        const ref = DB.collection(op.coll).doc(op.id);
        if (op.op === 'set') await ref.set(op.data); else await ref.delete();
        outbox = outbox.filter(o => o !== op);
        saveOutbox();
        backoff = 2000;
        sync.error = null;
      } catch (e) {
        const code = e && e.code;
        if (code === 'invalid_argument' || code === 'quota_exceeded' || code === 'transform_error') {
          outbox = outbox.filter(o => o !== op);
          saveOutbox();
          resync(op);
          if (code === 'invalid_argument' && !me.owner) {
            setReadOnly();
            sync.error = roMsg();
          } else {
            sync.error = code === 'quota_exceeded'
              ? "Stockage plein : supprime d'anciens mouvements pour continuer."
              : "Une modification n'a pas pu être enregistrée en ligne.";
          }
          toast(sync.error, { danger: true });
        } else if (['revoked', 'not_granted', 'capability_disabled', 'capability_removed'].includes(code)) {
          DB = null;
          sync.mode = 'local';
          break;
        } else {
          clearTimeout(flushTimer);
          flushTimer = setTimeout(flush, backoff);
          backoff = Math.min(backoff * 2, 60000);
          break;
        }
      }
    }
  } finally {
    flushing = false;
    updateSync();
  }
}

function onSnap(coll, snap) {
  const partial = snap.metadata && snap.metadata.fromCache;
  const next = partial ? Object.assign({}, S[coll]) : {};
  snap.docs.forEach(d => { if (d.exists) { const o = clone(d.data()); o.id = d.id; next[d.id] = o; } });
  S[coll] = next;
  dataV++;
  outbox.filter(o => o.coll === coll).forEach(applyOp);
  if (!partial) sync.loaded.add(coll);
  saveCache();
  rerenderSoon();
}
function onSnapErr(make, err) {
  const code = err && err.code;
  if (code === 'revoked') { DB = null; sync.mode = 'local'; updateSync(); return; }
  if (code === 'unavailable') setTimeout(make, 5000);
}
function subscribe(coll) {
  const make = () => {
    if (!DB) return;
    try { DB.collection(coll).onSnapshot(s => onSnap(coll, s), e => onSnapErr(make, e)); } catch (e) { /* ignoré */ }
  };
  make();
}
function subscribeCfg() {
  const make = () => {
    if (!DB) return;
    try {
      DB.doc('config/reglages').onSnapshot(snap => {
        if (outbox.some(o => o.k === 'config/reglages')) return;
        if (snap.exists) S.cfg = clone(snap.data());
        else if (!(snap.metadata && snap.metadata.fromCache)) S.cfg = null;
        dataV++;
        saveCache();
        rerenderSoon();
      }, e => onSnapErr(make, e));
    } catch (e) { /* ignoré */ }
  };
  make();
}
async function connect() {
  let db = null;
  try { db = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('db') : null; } catch (e) { db = null; }
  if (!db) { sync.mode = 'local'; updateSync(); rerenderSoon(); return; }
  DB = db;
  connectUser();
  sync.mode = 'cloud';
  [...COLS, ...EXTRA].forEach(subscribe);
  subscribeCfg();
  flushSoon(50);
  updateSync();
}
window.addEventListener('online', () => flushSoon(100));
/* Écurie ouverte, renommée ou mieux connue (date des crottins…) : on redessine */
window.addEventListener('eq-ecurie', () => { dataV++; rerenderSoon(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { flushSoon(100); rerenderSoon(); } });

function updateSync() {
  const b = document.getElementById('sync');
  if (!b) return;
  const n = outbox.length;
  b.className = 'sync ' + (sync.mode === 'local' ? 'local' : n ? 'wait' : sync.mode === 'cloud' ? 'ok' : '');
  const r = document.getElementById('settingsBtn');
  if (r) r.setAttribute('aria-label', 'Réglages. ' + syncText());
}
function syncText() {
  const n = outbox.length;
  if (sync.mode === 'local') return n
    ? `Enregistré sur ce téléphone. ${n} ${pl(n, 'modification')} en attente d'envoi.`
    : 'Enregistré sur ce téléphone uniquement (pas de connexion au carnet en ligne).';
  if (n) return `${n} ${pl(n, 'modification')} en attente d'envoi. Elles partiront dès que la connexion revient.`;
  if (sync.mode === 'cloud') return 'Tout est enregistré dans ton carnet privé.';
  return 'Ouverture du carnet…';
}

/* Réglages fusionnés avec les valeurs par défaut */
function cfg() {
  const c = S.cfg || {};
  return {
    rappels: Object.assign({}, DEF_RAPPELS, c.rappels || {}),
    balles: (Array.isArray(c.balles) && c.balles.length) ? c.balles : DEF_BALLES,
    finSaison: /^\d{2}-\d{2}$/.test(c.finSaison || '') ? c.finSaison : '04-30',
    alerte: Number.isFinite(c.alerte) ? c.alerte : 14,
    repos: Number.isFinite(c.repos) ? c.repos : 35,
    paturage: Number.isFinite(c.paturage) ? c.paturage : 10,
    boutique: Array.isArray(c.boutique) ? c.boutique : null,   // null : la liste de départ
    crottins: c.crottins !== false                              // points crottins dans cette écurie
  };
}

/* Préférences d'affichage (onglet choisi…), propres à ce téléphone */
const ui = Object.assign({ chevSeg: 'fiches', concSeg: 'avenir', showArch: false, crotAnim: 'grand' }, lsGet(UI_KEY) || {});
const saveUi = () => lsSet(UI_KEY, ui);
