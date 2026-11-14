/* Connexion, écuries, rôles et base Firestore pour la version installable EquiValdi
   Chaque écurie (« structure ») est un espace séparé : structures/{sid}/… Une personne peut appartenir
   à plusieurs écuries, avec un rôle dans chacune. Les règles (firestore.rules) font respecter la séparation. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, updateProfile,
  deleteUser, reauthenticateWithCredential, EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, getDoc, getDocs, getDocFromServer, getDocsFromServer, getCountFromServer,
  onSnapshot, updateDoc, query, where, writeBatch, deleteField
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDCv_7VGRnPbszuajk1dPGfeEa15_nNB1M',
  authDomain: 'equivaldi.firebaseapp.com',
  projectId: 'equivaldi',
  storageBucket: 'equivaldi.firebasestorage.app',
  messagingSenderId: '438472603797',
  appId: '1:438472603797:web:670fef2053cebb0772c39c'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'fr';
let fs;
try { fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { fs = getFirestore(app); }

/* ---------- Ce téléphone : écurie ouverte, rôle gardé, invitation en attente ---------- */
const K = {
  ecurie: 'equivaldi:ecurie:v1',               // { uid, sid, nom, commune, role, crottinsDepuis, ecuries } : connue avant Firebase
  role: sid => 'equivaldi:role:v1:' + sid,     // rôle gardé, pour ouvrir sans réseau
  invitation: 'equivaldi:invitation',          // code d'un lien ouvert, gardé pendant l'inscription
  migration: 'equivaldi:migration:sid',        // mise à jour en cours : { uid, sid, nom, commune }
  avis: 'equivaldi:avis',                      // message à montrer après un rechargement
  apres: 'equivaldi:apres',                    // écran à ouvrir après le rechargement (administration : 'carte')
  cache: sid => 'carnet-ecurie:cache:v1:' + sid,
  file: sid => 'carnet-ecurie:outbox:v1:' + sid
};
// clés de l'ancien carnet (avant les écuries)
const ANC = { cache: 'carnet-ecurie:cache:v1', file: 'carnet-ecurie:outbox:v1', role: 'equivaldi:role:v1' };
const lis = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (x) { return null; } };
// écurie d'exemple ouverte sur ce téléphone (bridge.js) : ni connexion ni base, tout reste ici
const DEMO = (() => { const l = lis(K.ecurie); return !!(l && l.demo && l.sid === 'exemple'); })();
// version des conditions d'utilisation et de vente acceptées (legal/conditions.html)
const CONDITIONS = '2026-11';
const CGU_LOCAL = 'equivaldi:conditions';
const ecris = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (x) { return false; } };
const COLS = ['chevaux', 'soins', 'pres', 'places', 'entretiens', 'foin', 'concours', 'seances', 'taches', 'stocks', 'consignes', 'messages'];
const JOUR = 86400000;
const ROLES = { gerante: 'Gérante', equipe: 'Peut modifier', lecture: 'Lecture seule', proprio: 'Propriétaire' };
const ROLES_INVITES = ['equipe', 'lecture', 'proprio'];
const roleInvite = r => ROLES_INVITES.includes(r) ? r : 'equipe';
const ecrit = role => role === 'gerante' || role === 'equipe';
// Administration EquiValdi : ce compte gère toutes les écuries sans en être membre (les règles d'accès le connaissent aussi).
// Dans une écurie dont il n'est pas membre, il agit sous le nom « EquiValdi » et n'apparaît dans aucune équipe.
const ADMIN_MAIL = 'bennizdu03@gmail.com';
const FANTOME = { uid: 'equivaldi', nom: 'EquiValdi' };
// Abonnement : essai de 2 mois sans carte, puis 10 €/mois ou 100 €/an
// deux formules (décidé le 12 novembre 2026) : « À la maison » et « Pro » (propriétaires en pension, relevés)
const TARIF = { maison: { mois: 5, an: 50 }, pro: { mois: 20, an: 200 } };
const OFFRES = ['maison', 'pro'];
const offreDe = a => a && a.offre === 'pro' ? 'pro' : 'maison';
// fin de la période payée : à la suite de l'essai ou de la période en cours ; en changeant de formule, tout de suite,
// avec les jours restants convertis au prix de la nouvelle (790 jours au plus, sous la limite des règles)
function periodeAbo(a, now, formule, offre) {
  const en = a.statut === 'abonnee' && (a.fin || 0) > now, change = en && offreDe(a) !== offre;
  let fin = ajouterMois(Math.max(now, a.finEssai || 0, en && !change ? a.fin : 0), formule === 'an' ? 12 : 1);
  if (change) fin += Math.round((a.fin - Math.max(now, a.finEssai || 0)) * TARIF[offreDe(a)].mois / TARIF[offre].mois);
  return Math.min(fin, now + 790 * JOUR);
}
const ajouterMois = (ms, n) => { const d = new Date(ms), j = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() < j) d.setDate(0); return d.getTime(); };
// une période payée commence après ce qui court déjà : l'essai, ou l'abonnement en cours (payer tôt ne fait rien perdre)
const attendre = ms => new Promise(r => setTimeout(r, ms));
const deux = n => String(n).padStart(2, '0');
const isoJour = ms => { const d = new Date(ms); return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`; };
const pl = (n, s) => n > 1 ? s + 's' : s;
// un nom d'écurie dans une phrase : « aux Écuries du Valdi », « du Haras… », « d'Écurie… »
const aNom = n => { const s = String(n || ''); return /^les\s/i.test(s) ? 'aux ' + s.slice(4) : /^le\s/i.test(s) ? 'au ' + s.slice(3) : 'à ' + s; };
const deNom = n => { const s = String(n || ''); return /^les\s/i.test(s) ? 'des ' + s.slice(4) : /^le\s/i.test(s) ? 'du ' + s.slice(3) : /^[aeiouyàâäéèêëîïôöûü]/i.test(s) ? "d'" + s : 'de ' + s; };
const plusAcces = n => n ? `Tu n'as plus accès ${aNom(n)}.` : "Tu n'as plus accès à une écurie.";
const erreur = (message, extra) => Object.assign(new Error(message), { code: 'invitation' }, extra || {});
const estRefus = e => !!(e && e.code === 'permission-denied');
const delai = (p, ms) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(Object.assign(new Error('délai dépassé'), { code: 'deadline-exceeded' })), ms))]);

/* ---------- Codes d'invitation : 8 caractères faciles à lire et à dicter ---------- */
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normCode = s => String(s || '').toUpperCase().replace(/[\s\-‐-—_.]/g, '');
const codeOk = c => /^[A-HJ-NP-Z2-9]{8}$/.test(c);
const joli = c => c.slice(0, 4) + '-' + c.slice(4);
function tireCode() {
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, n => ALPHA[n % ALPHA.length]).join('');   // 32 symboles : tirage sans biais
}
// lien d'invitation ouvert : le code est gardé, puis retiré de l'adresse
try {
  const p = new URLSearchParams(location.search);
  if (p.has('invitation')) {
    const c = normCode(p.get('invitation'));
    if (codeOk(c)) ecris(K.invitation, c);
    p.delete('invitation');
    const q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }
} catch (x) { /* adresse sans paramètres */ }

/* ---------- Adaptateur : la base de l'écurie ouverte, sous la forme attendue par le carnet ---------- */
const code = e => ({ 'permission-denied': 'invalid_argument', 'invalid-argument': 'invalid_argument', 'resource-exhausted': 'quota_exceeded', 'unauthenticated': 'revoked' }[e && e.code] || 'unavailable');
const fail = e => { throw { code: code(e), message: e && e.message }; };
const clean = d => JSON.parse(JSON.stringify(d));
const snapDoc = s => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } });
// Les fiches de l'équipe sont fusionnées, jamais remplacées, et sans le rôle ni l'adresse :
// ceux-là ne changent que par la gérante (changerRole), même si la copie locale est ancienne.
const fiche = d => { const o = clean(d); delete o.role; delete o.email; return o; };
function adaptateur(sid) {
  const base = 'structures/' + sid;
  const refus = e => { if (estRefus(e)) verifierAccesBientot(); };
  const docApi = r => ({
    id: r.id, path: r.path,
    set: d => (String(r.path).startsWith(base + '/membres/') ? setDoc(r, fiche(d), { merge: true }) : setDoc(r, clean(d))).catch(fail),
    delete: () => deleteDoc(r).catch(fail),
    get: () => getDoc(r).then(snapDoc, fail),
    onSnapshot: (next, err) => onSnapshot(r, { includeMetadataChanges: true }, s => next(snapDoc(s)), e => { refus(e); if (err) err({ code: code(e), message: e.message }); })
  });
  return {
    sid,
    doc: path => docApi(doc(fs, base + '/' + path)),
    collection: c => ({
      path: c,
      doc: id => docApi(id ? doc(fs, base + '/' + c, id) : doc(collection(fs, base + '/' + c))),
      onSnapshot: (next, err) => onSnapshot(collection(fs, base + '/' + c), { includeMetadataChanges: true },
        q => next({ docs: q.docs.map(snapDoc), size: q.size, empty: q.empty, metadata: { fromCache: q.metadata.fromCache, hasPendingWrites: q.metadata.hasPendingWrites } }),
        e => { refus(e); if (err) err({ code: code(e), message: e.message }); })
    })
  };
}

/* Propriétaire en pension : le carnet est lu dans les fiches partagées de ses chevaux (partages, une par
   cheval, tenues à jour par l'équipe). Une seule écoute, redistribuée aux collections que l'appli attend ;
   l'équipe se réduit à sa fiche et à celle de la gérante. Rien d'autre de l'écurie n'est lisible. */
function adaptateurProprio(sid, gerante) {
  const A = adaptateur(sid), base = 'structures/' + sid;
  const abos = new Set();
  let dernier = null, stop = null;
  const ecoute = f => {
    abos.add(f);
    if (!stop) stop = onSnapshot(query(collection(fs, base + '/partages'), where('proprio', '==', U.uid)), { includeMetadataChanges: true },
      q => { dernier = q; abos.forEach(g => g(q)); },
      e => { if (estRefus(e)) verifierAccesBientot(); abos.forEach(g => g(null, e)); });
    else if (dernier) f(dernier);
    return () => abos.delete(f);
  };
  const meta = q => ({ fromCache: !!(q && q.metadata.fromCache), hasPendingWrites: false });
  const docs = (q, c) => {
    const vus = new Map();
    (q ? q.docs : []).forEach(d => { const x = d.data() || {}; ((x.donnees || {})[c] || []).forEach(o => { if (o && typeof o.id === 'string' && !vus.has(o.id)) vus.set(o.id, o); }); });
    return [...vus.values()].map(o => ({ id: o.id, exists: true, data: () => o, metadata: meta(q) }));
  };
  const coll = c => ({
    path: c,
    doc: id => A.collection(c).doc(id),
    onSnapshot: (next, err) => {
      if (c === 'membres') {
        // sa fiche et celle de la gérante
        const ids = [...new Set([U.uid, gerante].filter(Boolean))], vus = {};
        const emet = () => { const l = ids.map(i => vus[i]).filter(x => x && x.exists); next({ docs: l, size: l.length, empty: !l.length, metadata: { fromCache: false, hasPendingWrites: false } }); };
        const stops = ids.map(i => A.doc('membres/' + i).onSnapshot(s => { vus[i] = s; emet(); }, e => { vus[i] = null; emet(); }));
        return () => stops.forEach(f => f && f());
      }
      if (c === 'messages') {
        // le fil de ses chevaux avec l'écurie : seulement les messages qui le concernent
        return onSnapshot(query(collection(fs, base + '/messages'), where('proprio', '==', U.uid)), { includeMetadataChanges: true },
          q => next({ docs: q.docs.map(snapDoc), size: q.size, empty: q.empty, metadata: { fromCache: q.metadata.fromCache, hasPendingWrites: q.metadata.hasPendingWrites } }),
          e => { if (err) err({ code: code(e), message: e.message }); });
      }
      return ecoute((q, e) => { if (e) { if (err) err({ code: code(e), message: e.message }); return; } const l = docs(q, c); next({ docs: l, size: l.length, empty: !l.length, metadata: meta(q) }); });
    }
  });
  return {
    sid, proprio: true,
    doc: path => {
      if (path === 'config/reglages' || path === 'config/carte') {
        const r = A.doc(path);
        return Object.assign({}, r, {
          onSnapshot: (next, err) => ecoute((q, e) => {
            if (e) { if (err) err({ code: code(e), message: e.message }); return; }
            const cfg = path === 'config/reglages' ? (q && q.docs.map(d => (d.data() || {}).cfg).find(Boolean)) : null;
            next({ id: path.split('/')[1], exists: !!cfg, data: () => cfg, metadata: meta(q) });
          })
        });
      }
      return A.doc(path);
    },
    collection: coll
  };
}
// L'équipe tient les fiches partagées (une par cheval de propriétaire) et la gérante les relevés
const exigerEquipe = () => { if (!OUV || !(ecrit(OUV.role) || OUV.fantome)) throw erreur("Seule l'équipe de l'écurie peut faire ça."); };
async function partages() {
  exigerEquipe();
  const q = await getDocs(collection(fs, 'structures', OUV.id, 'partages'));
  return q.docs.map(d => Object.assign({ id: d.id }, d.data()));
}
async function ecrirePartage(hid, data) { exigerEquipe(); await setDoc(doc(fs, 'structures', OUV.id, 'partages', hid), JSON.parse(JSON.stringify(data))); }
async function effacerPartage(hid) { exigerEquipe(); await deleteDoc(doc(fs, 'structures', OUV.id, 'partages', hid)); }
async function releves() {
  if (!OUV) return [];
  const c = collection(fs, 'structures', OUV.id, 'releves');
  const q = OUV.role === 'proprio' && !OUV.fantome ? await getDocs(query(c, where('proprio', '==', U.uid))) : await getDocs(c);
  return q.docs.map(d => Object.assign({ id: d.id }, d.data()));
}
async function ecrireReleve(id, data) {
  if (!OUV || !(OUV.role === 'gerante' || OUV.fantome)) throw erreur('Seule la gérante envoie les relevés.');
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw erreur('Relevé inconnu.');
  await delai(setDoc(doc(fs, 'structures', OUV.id, 'releves', id), JSON.parse(JSON.stringify(data))), 15000);
}

/* ---------- Écrans de connexion (logo vertical, au-dessus de l'appli) ---------- */
const $a = () => document.getElementById('auth');
const body = () => document.getElementById('authBody');
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MSG = {
  'auth/invalid-credential': 'Adresse ou mot de passe incorrect.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec cette adresse : crée-le d\'abord.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse : connecte-toi.',
  'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
  'auth/weak-password': 'Le mot de passe doit faire au moins 6 caractères.',
  'auth/too-many-requests': 'Trop d\'essais. Patiente quelques minutes puis réessaie.',
  'auth/network-request-failed': 'Pas de connexion internet. Réessaie avec du réseau.'
};
const errTxt = e => MSG[e && e.code] || (e && e.code === 'invitation' ? e.message : 'Ça n\'a pas marché. Vérifie ta connexion et réessaie.');
function show(html, bind) {
  $a().hidden = false;
  document.body.classList.add('lock');
  body().innerHTML = html;
  $a().scrollTop = 0;
  if (bind) bind(body());
}
function hide() { $a().hidden = true; document.body.classList.remove('lock'); }
const field = (id, label, type, extra = '') => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" ${extra}></label>`;
const errBox = '<p class="err" id="aErr" role="alert" hidden></p>';
const setErr = (root, m) => { const e = root.querySelector('#aErr'); if (!e) return; e.textContent = m || ''; e.hidden = !m; };
async function busy(btn, fn) { btn.disabled = true; try { await fn(); } finally { if (btn.isConnected) btn.disabled = false; } }
const sortie = '<div class="auth-links"><button type="button" class="link" id="aOut">Se déconnecter</button></div>';
const lierSortie = root => { const b = root.querySelector('#aOut'); if (b) b.addEventListener('click', deconnexion); };
const noteInvitation = () => lis(K.invitation) ? `<div class="box ok"><p class="note" style="color:var(--ink)">Tu as reçu une invitation : connecte-toi, ou crée ton compte, pour rejoindre l'écurie.</p></div>` : '';
const attente = () => show('<p class="auth-wait">Ouverture du carnet…</p>');
const LEGAL = { mentions: './legal/mentions-legales.html', conditions: './legal/conditions.html', confidentialite: './legal/confidentialite.html' };
const lienLegal = (k, t) => `<a href="${LEGAL[k]}" target="_blank" rel="noopener">${t}</a>`;
const liensLegaux = `<p class="auth-legal">${lienLegal('mentions', 'Mentions légales')} · ${lienLegal('conditions', 'Conditions')} · ${lienLegal('confidentialite', 'Confidentialité')}</p>`;
const blocExemple = `<div class="auth-exemple"><button type="button" class="btn" id="aEx">Visiter l'écurie d'exemple</button><p class="hint">Sans compte : une écurie déjà remplie, pour tout essayer. Rien n'est enregistré.</p></div>`;
const lierExemple = root => { const b = root.querySelector('#aEx'); if (b) b.addEventListener('click', () => window.eqExemple && window.eqExemple.entrer()); };
// message laissé avant un rechargement (compte supprimé…), montré une fois sur l'écran de connexion
const avisConnexion = () => {
  let a = '';
  try { a = sessionStorage.getItem(K.avis) || ''; sessionStorage.removeItem(K.avis); } catch (x) { /* rien */ }
  return a ? `<div class="box ok"><p class="note" style="color:var(--ink)">${escH(a)}</p></div>` : '';
};

function ecranConnexion() {
  show(`<form class="form" id="aForm" novalidate>
      <h2 class="auth-t">Connexion</h2>
      ${avisConnexion()}
      ${noteInvitation()}
      ${field('aMail', 'Adresse e-mail', 'email', 'autocomplete="email" required')}
      ${field('aPass', 'Mot de passe', 'password', 'autocomplete="current-password" required')}
      ${errBox}
      <button class="btn primary" type="submit">Se connecter</button>
      <div class="auth-links"><button type="button" class="link" id="aNew">Créer un compte</button><button type="button" class="link" id="aLost">Mot de passe oublié</button></div>
      ${lis(K.invitation) ? '' : blocExemple}
      ${liensLegaux}
    </form>`, root => {
    lierExemple(root);
    root.querySelector('#aForm').addEventListener('submit', e => {
      e.preventDefault();
      busy(e.submitter || root.querySelector('[type=submit]'), async () => {
        try { await signInWithEmailAndPassword(auth, root.querySelector('#aMail').value.trim(), root.querySelector('#aPass').value); }
        catch (x) { setErr(root, errTxt(x)); }
      });
    });
    root.querySelector('#aNew').addEventListener('click', ecranCreation);
    root.querySelector('#aLost').addEventListener('click', async () => {
      const m = root.querySelector('#aMail').value.trim();
      if (!m) { setErr(root, 'Indique ton adresse e-mail, puis touche « Mot de passe oublié ».'); return; }
      try { await sendPasswordResetEmail(auth, m); setErr(root, ''); root.querySelector('#aLost').textContent = 'E-mail envoyé : regarde ta boîte'; }
      catch (x) { setErr(root, errTxt(x)); }
    });
  });
}
function ecranCreation() {
  show(`<form class="form" id="aForm" novalidate>
      <h2 class="auth-t">Créer ton compte</h2>
      ${noteInvitation()}
      ${field('aNom', 'Prénom', 'text', 'autocomplete="given-name" autocapitalize="words" required')}
      ${field('aMail', 'Adresse e-mail', 'email', 'autocomplete="email" required')}
      ${field('aPass', 'Mot de passe (6 caractères minimum)', 'password', 'autocomplete="new-password" required')}
      <p class="hint">Si tu as été invitée ou invité par e-mail, utilise cette adresse.</p>
      <label class="check auth-cgu"><input type="checkbox" id="aCgu" required><span>J'accepte les ${lienLegal('conditions', "conditions d'utilisation")} et la ${lienLegal('confidentialite', 'politique de confidentialité')}.</span></label>
      ${errBox}
      <button class="btn primary" type="submit">Créer mon compte</button>
      <div class="auth-links"><button type="button" class="link" id="aBack">J'ai déjà un compte</button></div>
      ${liensLegaux}
    </form>`, root => {
    root.querySelector('#aForm').addEventListener('submit', e => {
      e.preventDefault();
      const nom = root.querySelector('#aNom').value.trim();
      if (!nom) { setErr(root, 'Indique ton prénom.'); return; }
      if (!root.querySelector('#aCgu').checked) { setErr(root, "Coche la case pour accepter les conditions d'utilisation."); return; }
      ecris(CGU_LOCAL, { version: CONDITIONS, le: Date.now() });
      busy(root.querySelector('[type=submit]'), async () => {
        try {
          const c = await createUserWithEmailAndPassword(auth, root.querySelector('#aMail').value.trim(), root.querySelector('#aPass').value);
          await updateProfile(c.user, { displayName: nom });
          try { localStorage.setItem('carnet-ecurie:moi:v1', JSON.stringify({ nom })); } catch (x) { /* ignoré */ }
          await sendEmailVerification(c.user);
          ecranVerification(c.user);
        } catch (x) { setErr(root, errTxt(x)); }
      });
    });
    root.querySelector('#aBack').addEventListener('click', ecranConnexion);
  });
}
function ecranVerification(u) {
  show(`<div class="form">
      <h2 class="auth-t">Confirme ton adresse</h2>
      <p>Un e-mail de confirmation a été envoyé à <b>${escH(u.email)}</b>. Clique sur le lien qu'il contient, puis reviens ici.</p>
      <p class="hint">Pense à regarder dans les indésirables.</p>
      ${errBox}
      <button class="btn primary" id="aOk">J'ai confirmé mon adresse</button>
      <div class="auth-links"><button type="button" class="link" id="aResend">Renvoyer l'e-mail</button><button type="button" class="link" id="aOut">Se déconnecter</button></div>
    </div>`, root => {
    root.querySelector('#aOk').addEventListener('click', e => busy(e.currentTarget, async () => {
      await u.reload();
      if (!auth.currentUser.emailVerified) { setErr(root, 'L\'adresse n\'est pas encore confirmée. Clique sur le lien reçu par e-mail.'); return; }
      await auth.currentUser.getIdToken(true);
      entrer(auth.currentUser);
    }));
    root.querySelector('#aResend').addEventListener('click', async () => {
      try { await sendEmailVerification(u); setErr(root, ''); root.querySelector('#aResend').textContent = 'E-mail renvoyé'; } catch (x) { setErr(root, errTxt(x)); }
    });
    lierSortie(root);
  });
}
function ecranSouci(u, e) {
  const regles = estRefus(e), stockage = e && e.code === 'stockage';
  show(`<div class="form">
      <h2 class="auth-t">Accès au carnet impossible</h2>
      <p>${stockage ? "Ce téléphone n'arrive pas à garder le carnet en mémoire (stockage plein ou navigation privée). Libère un peu de place, puis touche « Réessayer »."
        : regles ? "La base refuse l'accès : les règles d'accès de Firestore ne sont pas à jour. Recolle le fichier firestore.rules dans Firebase, onglet Règles, publie-le, puis touche « Réessayer »."
        : "Le carnet n'a pas pu joindre la base. Vérifie ta connexion internet, puis touche « Réessayer »."}</p>
      <p class="hint">Code : ${escH((e && e.code) || 'inconnu')}</p>
      <button class="btn primary" id="aRetry">Réessayer</button>
      ${sortie}
    </div>`, root => {
    root.querySelector('#aRetry').addEventListener('click', () => entrer(u));
    lierSortie(root);
  });
}
const message = (titre, texte) => new Promise(fin => show(`<div class="form">
    <h2 class="auth-t">${escH(titre)}</h2><p>${escH(texte)}</p>
    <button class="btn primary" id="aOk">Continuer</button>
  </div>`, root => root.querySelector('#aOk').addEventListener('click', () => fin())));

/* ---------- La personne connectée et ses écuries ---------- */
let U = null, MAIL = '', IDX = null, OUV = null;   // compte, adresse, index personnel, écurie ouverte
let ADMIN = false;                                  // compte d'administration EquiValdi
let SUPPRESSION = false;                            // compte en cours de suppression
let CGU_A_FAIRE = false;                            // conditions d'utilisation pas encore acceptées (comptes d'avant)
// invitations remises « à plus tard » : plus reproposées pendant cette visite, même après un rechargement
const VUS = (() => {
  const k = 'equivaldi:plus-tard';
  let s = [];
  try { s = JSON.parse(sessionStorage.getItem(k) || '[]'); } catch (x) { s = []; }
  const set = new Set(Array.isArray(s) ? s : []);
  return { has: c => set.has(c), add: c => { set.add(c); try { sessionStorage.setItem(k, JSON.stringify([...set])); } catch (x) { /* rien */ } } };
})();
const adresse = u => String((u && u.email) || '').toLowerCase();
const prenomGarde = () => { const v = lis('carnet-ecurie:moi:v1'); return v && typeof v.nom === 'string' ? v.nom : ''; };
const nomDe = u => String((u && u.displayName) || prenomGarde() || adresse(u).split('@')[0]).trim().slice(0, 40);
const moiQui = () => ({ uid: U.uid, nom: (typeof moiNom === 'function' && moiNom()) || nomDe(U) });
const indexRef = () => doc(fs, 'utilisateurs', U.uid);
const listeEcuries = () => Object.entries((IDX && IDX.ecuries) || {}).filter(([, x]) => x && typeof x === 'object')
  .map(([id, x]) => ({ id, nom: String(x.nom || 'Écurie'), role: x.role || '' })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
const notifier = () => { try { window.dispatchEvent(new CustomEvent('eq-ecurie')); } catch (x) { /* ancien navigateur */ } };
const tente = p => p.then(v => ({ v }), e => ({ e }));

// 1. L'index personnel : la liste des écuries, pour le sélecteur (la preuve d'accès reste la fiche de membre)
async function lireIndex(u) {
  const s = await getDoc(doc(fs, 'utilisateurs', u.uid));
  const base = { nom: nomDe(u), email: adresse(u) };
  // conditions acceptées à la création du compte (case cochée sur ce téléphone) : notées avec l'index
  const cgu = lis(CGU_LOCAL), acceptees = cgu && cgu.version === CONDITIONS ? { version: CONDITIONS, le: cgu.le || Date.now() } : null;
  if (!s.exists()) {
    const v = Object.assign({ ecuries: {} }, base, acceptees ? { conditions: acceptees } : {});
    setDoc(doc(fs, 'utilisateurs', u.uid), v, { merge: true }).then(() => ecris(CGU_LOCAL, null)).catch(() => {});
    return Object.assign({ derniere: null }, v);
  }
  const d = s.data() || {}, maj = {};
  if (d.email !== base.email || !d.nom) Object.assign(maj, { email: base.email, nom: d.nom || base.nom });
  if (acceptees && !(d.conditions && d.conditions.version === CONDITIONS)) { maj.conditions = acceptees; d.conditions = acceptees; }
  if (Object.keys(maj).length) setDoc(doc(fs, 'utilisateurs', u.uid), maj, { merge: true }).then(() => { if (maj.conditions) ecris(CGU_LOCAL, null); }).catch(() => {});
  return Object.assign({}, d, { ecuries: (d.ecuries && typeof d.ecuries === 'object') ? Object.assign({}, d.ecuries) : {} });
}
const retirerDeLIndex = sids => {
  if (!sids.length) return;
  const maj = { ecuries: {} };
  sids.forEach(s => { maj.ecuries[s] = deleteField(); delete IDX.ecuries[s]; });
  if (sids.includes(IDX.derniere)) { maj.derniere = deleteField(); IDX.derniere = null; }
  setDoc(indexRef(), maj, { merge: true }).catch(() => {});
};
// Accès réel à une écurie : sa fiche et sa propre fiche de membre (refusé = plus membre)
const ecurieDe = (sid, d, role, fantome = false) => ({
  id: sid, nom: d.nom || '', commune: d.commune || '', role: ROLES[role] ? role : 'lecture', crottinsDepuis: d.crottinsDepuis || '',
  creeLe: d.creeLe || null, abonnement: d.abonnement || null, gerante: d.gerante || '', carteDemande: d.carteDemande || null, fantome
});
async function acces(sid, o = {}) {
  try {
    const [s, f] = await Promise.all([getDoc(doc(fs, 'structures', sid)), getDoc(doc(fs, 'structures', sid, 'membres', U.uid))]);
    // l'administration ouvre une écurie dont elle n'est pas membre, sans fiche : invisible pour l'équipe
    if (s.exists() && !f.exists() && ADMIN && o.fantome) return { ok: true, e: ecurieDe(sid, s.data() || {}, 'gerante', true) };
    if (!s.exists() || !f.exists()) {
      if ((s.metadata && s.metadata.fromCache) || (f.metadata && f.metadata.fromCache)) throw Object.assign(new Error('hors ligne'), { code: 'unavailable' });
      return { perdu: true };
    }
    return { ok: true, e: ecurieDe(sid, s.data() || {}, (f.data() || {}).role) };
  } catch (e) { if (estRefus(e)) return { perdu: true }; throw e; }
}
async function estMembre(sid) {
  try { return (await getDoc(doc(fs, 'structures', sid, 'membres', U.uid))).exists(); }
  catch (e) { if (estRefus(e)) return false; throw e; }
}

/* ---------- Parcours à la connexion ---------- */
async function entrer(u) {
  U = u; MAIL = adresse(u); ADMIN = MAIL === ADMIN_MAIL;
  const local = lis(K.ecurie);
  // un autre compte s'est servi de ce téléphone : ses écuries n'ont rien à faire ici
  if (local && local.uid && local.uid !== u.uid) { purgerEcuries(); location.reload(); return; }
  if (!window.EQ_SID) attente();
  try { await parcours(u, local && local.uid === u.uid ? local : null); }
  catch (e) {
    console.error(e);
    // sans réseau : l'écurie de ce téléphone s'ouvre avec ses données et son rôle gardés
    if (!estRefus(e) && local && ouvrirHorsLigne(u, local)) return;
    ecranSouci(u, e);
  }
}
function ouvrirHorsLigne(u, local) {
  const r = local.sid ? lis(K.role(local.sid)) : null;
  if (!r || r.uid !== u.uid || window.EQ_SID !== local.sid) return false;
  IDX = IDX || { ecuries: Object.fromEntries((local.ecuries || []).map(x => [x.id, { nom: x.nom, role: x.role }])), derniere: local.sid };
  demarrer(u, { id: local.sid, nom: local.nom, commune: local.commune, role: r.role, crottinsDepuis: local.crottinsDepuis, creeLe: local.creeLe, abonnement: local.abonnement || null, gerante: local.gerante || '', carteDemande: local.carteDemande || null, fantome: !!local.fantome }, { horsLigne: true });
  return true;
}
async function parcours(u, local) {
  // lectures lancées ensemble, pour ouvrir vite
  const preLocal = local && local.sid ? tente(acces(local.sid, { fantome: !!local.fantome })) : null;
  const preMails = tente(invitationsMail());
  // 1. Index personnel (un refus ici veut dire que les nouvelles règles ne sont pas encore publiées)
  let idx;
  try { idx = await lireIndex(u); }
  catch (e) {
    if (!estRefus(e)) throw e;
    await u.getIdToken(true).catch(() => {});   // adresse confirmée depuis peu : jeton à rafraîchir
    try { idx = await lireIndex(u); }
    catch (e2) { if (estRefus(e2)) { await reglesAnciennes(u, e2); return; } throw e2; }
  }
  IDX = idx;
  CGU_A_FAIRE = !(idx.conditions && idx.conditions.version === CONDITIONS);
  // Administration : l'écurie ouverte depuis « Toutes les écuries », sans en être membre
  if (ADMIN && local && local.fantome && preLocal) {
    const x = await preLocal;
    if (x.v && x.v.ok) { demarrer(u, x.v.e); return; }
    if (x.e && !estRefus(x.e) && ouvrirHorsLigne(u, local)) return;
    ecris(K.ecurie, null);
    local = null;
  }
  // 2. Invitation en attente (lien ouvert ou code tapé)
  const c = lis(K.invitation);
  if (c && !VUS.has(c)) await proposerCode(u, c);
  // 3. Invitations reçues à son adresse, une à la fois
  const m = await preMails;
  for (const inv of (m.v || [])) if (!VUS.has(inv.code) && !IDX.ecuries[inv.structure]) await proposer(u, inv);
  // 5. Ouvrir la dernière écurie si elle est encore accessible, sinon celle de ce téléphone, sinon la première
  const ordre = [IDX.derniere, local && local.sid, ...listeEcuries().map(x => x.id)].filter((s, i, a) => s && a.indexOf(s) === i);
  const perdues = [];
  for (const sid of ordre) {
    let r;
    try {
      if (preLocal && local && sid === local.sid) { const x = await preLocal; if (x.e) throw x.e; r = x.v; }
      else r = await acces(sid);
    } catch (e) {
      if (!estRefus(e) && local && sid === local.sid && ouvrirHorsLigne(u, local)) return;
      throw e;
    }
    if (r.perdu) { perdues.push({ sid, nom: (IDX.ecuries[sid] && IDX.ecuries[sid].nom) || (local && local.sid === sid && local.nom) || '' }); continue; }
    retirerDeLIndex(perdues.map(p => p.sid));
    perdues.forEach(p => { oublierEcurie(p.sid); avis(plusAcces(p.nom)); });
    const recharger = await rangerAnciennesCles(r.e.id);
    demarrer(u, r.e, { recharger });
    return;
  }
  retirerDeLIndex(perdues.map(p => p.sid));
  perdues.forEach(p => oublierEcurie(p.sid));
  const note = perdues.map(p => plusAcces(p.nom)).join(' ');
  // 4. Ancien carnet : mise à jour par la gérante, ou écurie déjà mise à jour à rejoindre
  if (await ancienCarnet(u)) return;
  // 6. Aucune écurie
  ecranAccueil(u, note);
}

/* ---------- Ouvrir une écurie ---------- */
function demarrer(u, e, o = {}) {
  const fantome = !!(e.fantome && ADMIN);
  OUV = {
    id: e.id, nom: e.nom || '', commune: e.commune || '', role: e.role, crottinsDepuis: e.crottinsDepuis || (e.creeLe ? isoJour(e.creeLe) : ''), creeLe: e.creeLe || null,
    abonnement: e.abonnement || null, gerante: e.gerante || '', carteDemande: e.carteDemande || null, fantome
  };
  if (fantome) o = Object.assign({}, o, { sansIndex: true });
  const avant = IDX && IDX.ecuries[e.id] ? Object.assign({}, IDX.ecuries[e.id]) : null;
  if (IDX && !o.horsLigne && !o.sansIndex) IDX.ecuries[e.id] = { nom: OUV.nom || (avant && avant.nom) || '', role: e.role };
  const rec = Object.assign({ uid: u.uid, sid: e.id }, OUV, { ecuries: listeEcuries() });
  delete rec.id;
  ecris(K.ecurie, rec);
  ecris(K.role(e.id), { uid: u.uid, role: e.role });
  // le carnet chargé sur ce téléphone doit être celui de cette écurie : sinon on recharge
  let flag = null;
  try { flag = sessionStorage.getItem('equivaldi:recharge'); } catch (x) { flag = e.id; }
  if (window.EQ_SID !== e.id) {
    const relu = lis(K.ecurie);
    if (relu && relu.sid === e.id) { location.reload(); return; }
    if (window.EQ_SID) { ecranSouci(u, { code: 'stockage' }); return; }
    // stockage indisponible et rien de chargé : on continue sans copie locale
  } else if (o.recharger && flag !== e.id) {
    // clés locales rangées à l'instant : on les recharge (une seule fois par visite)
    try { sessionStorage.setItem('equivaldi:recharge', e.id); } catch (x) { /* rien */ }
    location.reload();
    return;
  }
  try { sessionStorage.removeItem('equivaldi:recharge'); } catch (x) { /* rien */ }
  if (IDX && !o.horsLigne && !o.sansIndex) {
    const maj = {};
    if (!avant || avant.nom !== IDX.ecuries[e.id].nom || avant.role !== e.role) maj.ecuries = { [e.id]: IDX.ecuries[e.id] };
    if (IDX.derniere !== e.id) maj.derniere = e.id;
    IDX.derniere = e.id;
    if (Object.keys(maj).length) setDoc(indexRef(), maj, { merge: true }).catch(() => {});
  }
  const role = e.role, qui = fantome ? FANTOME : { uid: u.uid, nom: u.displayName || '' };
  Object.assign(window.EQ, { email: MAIL, role, admin: ADMIN, ecurie: Object.assign({}, OUV), ecuries: listeEcuries(), conditionsAFaire: CGU_A_FAIRE && !fantome });
  hide();
  window.claude._resolve('user', {
    me: async () => ({ id: qui.uid, name: qui.nom, email: MAIL, isOwner: role === 'gerante', canEdit: ecrit(role), avatarUrl: '', color: '' }),
    id: async () => qui.uid,
    isOwner: async () => role === 'gerante',
    canEdit: async () => ecrit(role),
    can: async n => n === 'data.write' ? ecrit(role) : false,
    profiles: async ids => Object.fromEntries([].concat(ids).map(i => [i, { id: i, name: '' }]))
  });
  window.claude._resolve('db', role === 'proprio' && !fantome ? adaptateurProprio(e.id, e.gerante) : adaptateur(e.id));
  notifier();
  suivreEcurie(e.id);
  if (!o.horsLigne) setTimeout(() => { verifierIndex().catch(() => {}); }, 1500);
  if (!fantome) { noterVisite(e.id); setTimeout(verifierReponses, 2500); }
  let a = '';
  try { a = sessionStorage.getItem(K.avis) || ''; sessionStorage.removeItem(K.avis); } catch (x) { /* rien */ }
  if (a) setTimeout(() => { if (typeof toast === 'function') toast(a); }, 700);
}
// La fiche de l'écurie ouverte, suivie en direct : abonnement payé, essai prolongé, nouveau nom…
let suiviEcurie = null;
function suivreEcurie(sid) {
  if (suiviEcurie) suiviEcurie();
  suiviEcurie = onSnapshot(doc(fs, 'structures', sid), s => {
    if (!s.exists() || !OUV || OUV.id !== sid) return;
    const n = ecurieDe(sid, s.data() || {}, OUV.role, OUV.fantome);
    if (!n.crottinsDepuis && n.creeLe) n.crottinsDepuis = isoJour(n.creeLe);
    const champs = ['nom', 'commune', 'crottinsDepuis', 'creeLe', 'abonnement', 'gerante', 'carteDemande'];
    if (champs.every(k => JSON.stringify(n[k]) === JSON.stringify(OUV[k]))) return;
    champs.forEach(k => { OUV[k] = n[k]; });
    const l = lis(K.ecurie);
    if (l && l.sid === sid) { const r = Object.assign(l, OUV, { sid }); delete r.id; ecris(K.ecurie, r); }
    window.EQ.ecurie = Object.assign({}, OUV);
    notifier();
  }, () => {});
}
const avis = t => { try { const p = sessionStorage.getItem(K.avis); sessionStorage.setItem(K.avis, p ? p + ' ' + t : t); } catch (x) { /* rien */ } };
// Les autres écuries de l'index, vérifiées sans bloquer : celle dont on a été retiré quitte le sélecteur
async function verifierIndex() {
  if (!OUV || !IDX) return;
  const perdues = [];
  await Promise.all(listeEcuries().filter(x => x.id !== OUV.id).map(async x => {
    try { if (!(await estMembre(x.id))) perdues.push(x); } catch (e) { /* hors ligne : on verra plus tard */ }
  }));
  if (!perdues.length) return;
  retirerDeLIndex(perdues.map(x => x.id));
  perdues.forEach(x => oublierEcurie(x.id));
  const l = lis(K.ecurie);
  if (l && l.sid === OUV.id) ecris(K.ecurie, Object.assign(l, { ecuries: listeEcuries() }));
  window.EQ.ecuries = listeEcuries();
  notifier();
  if (typeof toast === 'function') toast(perdues.map(x => plusAcces(x.nom)).join(' '));
}
// Changer d'écurie : la nouvelle est notée sur ce téléphone et dans l'index, puis l'appli se recharge
async function ouvrir(sid) {
  if (!U) return;
  const x = (IDX && IDX.ecuries[sid]) || {};
  const cur = lis(K.ecurie) || {};
  ecris(K.ecurie, { uid: U.uid, sid, nom: x.nom || '', role: x.role || '', ecuries: listeEcuries().length ? listeEcuries() : (cur.ecuries || []) });
  if (IDX) IDX.derniere = sid;
  await Promise.race([setDoc(indexRef(), { derniere: sid }, { merge: true }).catch(() => {}), attendre(1500)]);
  location.reload();
}
// Une écurie perdue ou quittée : sa copie locale et ses envois en attente n'ont plus lieu d'être
function oublierEcurie(sid) {
  try { [K.cache(sid), K.file(sid), K.role(sid), 'equivaldi:vu:' + sid, 'equivaldi:ics:' + sid].forEach(k => localStorage.removeItem(k)); } catch (x) { /* rien */ }
  const l = lis(K.ecurie);
  if (l && l.sid === sid) ecris(K.ecurie, null);
}
function purgerEcuries() {
  const pref = [ANC.cache, ANC.file, ANC.role, K.ecurie, 'equivaldi:vu', 'equivaldi:ics'];
  try { Object.keys(localStorage).filter(k => pref.some(p => k === p || k.startsWith(p + ':'))).forEach(k => localStorage.removeItem(k)); } catch (x) { /* rien */ }
}
// Accès retiré pendant l'utilisation (la base refuse les lectures) : on vérifie, puis on prévient
let verifT = null;
function verifierAccesBientot() {
  if (verifT || !OUV || !U) return;
  verifT = setTimeout(async () => {
    try {
      const r = await acces(OUV.id);
      if (r.perdu) {
        avis(plusAcces(OUV.nom));
        retirerDeLIndex([OUV.id]);
        oublierEcurie(OUV.id);
        await attendre(400);
        location.reload();
        return;
      }
    } catch (e) { /* hors ligne : on réessaiera */ }
    verifT = null;
  }, 1200);
}

/* ---------- Écrans : accueil, création, code, invitation ---------- */
function ecranAccueil(u, note = '') {
  const prenom = nomDe(u).split(' ')[0];
  show(`<div class="form">
      <h2 class="auth-t">Bienvenue${prenom ? ' ' + escH(prenom) : ''} !</h2>
      ${note ? `<div class="box"><p class="note" style="color:var(--ink)">${escH(note)}</p></div>` : ''}
      <p>Pour commencer, crée ton écurie, ou rejoins celle où l'on t'attend avec le code reçu.</p>
      <div class="auth-choix">
        <button class="btn primary" id="aCreer">Créer mon écurie</button>
        <button class="btn" id="aCode">J'ai un code d'invitation</button>
        ${ADMIN ? '<button class="btn" id="aAdmin">Administration : toutes les écuries</button>' : ''}
      </div>
      ${blocExemple}
      ${sortie}
      ${liensLegaux}
    </div>`, root => {
    lierExemple(root);
    root.querySelector('#aCreer').addEventListener('click', () => ecranCreer(u, () => ecranAccueil(u)));
    root.querySelector('#aCode').addEventListener('click', () => ecranCode(u, () => ecranAccueil(u)));
    const ad = root.querySelector('#aAdmin');
    if (ad) ad.addEventListener('click', () => ecranAdmin(u));
    lierSortie(root);
  });
}
// Administration sans écurie à soi : la liste de toutes les écuries, pour en ouvrir une
async function ecranAdmin(u) {
  show('<p class="auth-wait">Chargement des écuries…</p>');
  let l = [], msgs = [];
  try { [l, msgs] = await Promise.all([toutesEcuries(), tousRetours().catch(() => [])]); } catch (e) { ecranSouci(u, e); return; }
  // les messages « Une idée, un souci ? » : les nouveaux en tête
  const nouveaux = msgs.filter(r => r.statut === 'nouveau').length;
  const blocMsgs = msgs.length ? `<h3 class="auth-sous">Messages${nouveaux ? ` · ${nouveaux} ${nouveaux > 1 ? 'nouveaux' : 'nouveau'}` : ''}</h3>
      <div class="list">${msgs.slice(0, 30).map(r => `<button type="button" class="row" data-msg="${escH(r.id)}"><div class="row-main"><div class="row-t">${escH(court(r.texte, 70))}</div><div class="row-s">${escH([r.nom, r.ecurie, new Date(r.le || 0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })].filter(Boolean).join(' · '))}</div></div><span class="pill${r.statut === 'nouveau' ? ' warn' : r.statut === 'repondu' ? ' ok' : ''}">${r.statut === 'nouveau' ? 'Nouveau' : r.statut === 'repondu' ? 'Répondu' : 'Traité'}</span></button>`).join('')}</div>` : '';
  // les cartes des prés demandées à EquiValdi d'abord (les plus anciennes en tête) : « Dessiner » ouvre l'éditeur
  const cartes = l.filter(s => s.carteDemande && s.carteDemande.statut === 'demandee').sort((a, b) => a.carteDemande.le - b.carteDemande.le);
  const jour = ms => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const aDessiner = cartes.length ? `<h3 class="auth-sous">Cartes des prés à dessiner</h3>
      <div class="list">${cartes.map(s => `<button type="button" class="row" data-carte="${escH(s.id)}"><div class="row-main"><div class="row-t">${escH(s.nom || 'Sans nom')}</div><div class="row-s">${escH(['demandée le ' + jour(s.carteDemande.le), s.carteDemande.note ? '« ' + s.carteDemande.note + ' »' : ''].filter(Boolean).join(' · '))}</div></div><span class="pill warn">Dessiner</span></button>`).join('')}</div>
      <h3 class="auth-sous">Toutes les écuries</h3>` : '';
  show(`<div class="form">
      <h2 class="auth-t">${cartes.length ? 'Administration' : 'Toutes les écuries'}</h2>
      <p class="hint">Tu ouvres les écuries sans apparaître dans leur équipe.</p>
      ${blocMsgs}
      ${aDessiner}
      <div class="list">${l.map(s => `<button type="button" class="row" data-sid="${escH(s.id)}"><div class="row-main"><div class="row-t">${escH(s.nom || 'Sans nom')}</div><div class="row-s">${escH(s.commune || '')}</div></div></button>`).join('') || '<p class="hint">Aucune écurie pour le moment.</p>'}</div>
      <div class="auth-links"><button type="button" class="link" id="aBack">Retour</button></div>
    </div>`, root => {
    root.querySelectorAll('[data-sid]').forEach(b => b.addEventListener('click', () => ouvrirAdmin(b.dataset.sid)));
    root.querySelectorAll('[data-carte]').forEach(b => b.addEventListener('click', () => ouvrirAdmin(b.dataset.carte, 'carte')));
    root.querySelectorAll('[data-msg]').forEach(b => b.addEventListener('click', () => ecranMessage(u, msgs.find(r => r.id === b.dataset.msg))));
    root.querySelector('#aBack').addEventListener('click', () => ecranAccueil(u));
  });
}
// Un message, son contexte, et la réponse (visible par la personne dans ses réglages)
function ecranMessage(u, r) {
  if (!r) { ecranAdmin(u); return; }
  const TYPES = { idee: 'Une idée', souci: 'Un souci', question: 'Une question' };
  const quand = ms => new Date(ms || 0).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const ligne = (t, v) => v ? `<div class="row"><div class="row-main"><div class="row-s">${t}</div><div class="row-t">${escH(v)}</div></div></div>` : '';
  show(`<div class="form">
      <h2 class="auth-t">${escH(TYPES[r.type] || 'Message')}</h2>
      <div class="box"><p style="white-space:pre-wrap">${escH(r.texte)}</p></div>
      <div class="list">${ligne('De', [r.nom, r.email].filter(Boolean).join(' · '))}${ligne('Écurie', [r.ecurie, ROLES[r.role]].filter(Boolean).join(' · '))}${ligne('Envoyé le', quand(r.le))}${ligne('Téléphone', r.appareil)}${ligne('Version', r.version)}</div>
      ${r.reponse ? `<div class="box ok"><p class="note" style="color:var(--ink)"><b>Ta réponse du ${escH(quand(r.reponse.le))}</b> ${r.vuLe ? '(lue)' : '(pas encore lue)'}</p><p style="white-space:pre-wrap">${escH(r.reponse.texte)}</p></div>` : ''}
      <label class="field"><span>${r.reponse ? 'Nouvelle réponse' : 'Réponse'}</span><textarea id="aRep" rows="5" maxlength="2000"></textarea></label>
      ${errBox}
      <button class="btn primary" id="aEnv">Envoyer la réponse</button>
      <div class="auth-links"><button type="button" class="link" id="aBack">Retour</button><button type="button" class="link" id="aCl">${r.statut === 'traite' ? 'Rouvrir' : 'Marquer traité'}</button></div>
    </div>`, root => {
    root.querySelector('#aEnv').addEventListener('click', e => busy(e.currentTarget, async () => {
      try { await repondreRetour(r.id, root.querySelector('#aRep').value); ecranAdmin(u); }
      catch (x) { setErr(root, errTxt(x)); }
    }));
    root.querySelector('#aCl').addEventListener('click', e => busy(e.currentTarget, async () => {
      try { await classerRetour(r.id, r.statut === 'traite' ? (r.reponse ? 'repondu' : 'nouveau') : 'traite'); ecranAdmin(u); }
      catch (x) { setErr(root, errTxt(x)); }
    }));
    root.querySelector('#aBack').addEventListener('click', () => ecranAdmin(u));
  });
}
const champsEcurie = (nom = '', commune = '') => `
  ${field('aNomE', "Nom de l'écurie", 'text', `maxlength="40" autocapitalize="words" autocomplete="organization" required value="${escH(nom)}"`)}
  ${field('aCommune', 'Commune (facultatif)', 'text', `maxlength="60" autocapitalize="words" autocomplete="address-level2" value="${escH(commune)}"`)}`;
const lireEcurie = root => ({ nom: root.querySelector('#aNomE').value.replace(/\s+/g, ' ').trim(), commune: root.querySelector('#aCommune').value.replace(/\s+/g, ' ').trim() });
const nomValide = n => n.length >= 2 && n.length <= 40;
function ecranCreer(u, retour) {
  show(`<form class="form" id="aForm" novalidate>
      <h2 class="auth-t">Créer ton écurie</h2>
      ${champsEcurie()}
      <p class="hint">Tu en es la gérante : tu inviteras ensuite ton équipe, avec un lien ou un code.</p>
      ${errBox}
      <button class="btn primary" type="submit">Créer l'écurie</button>
      <div class="auth-links"><button type="button" class="link" id="aBack">Retour</button></div>
    </form>`, root => {
    root.querySelector('#aForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = lireEcurie(root);
      if (!nomValide(v.nom)) { setErr(root, "Le nom de l'écurie doit faire de 2 à 40 caractères."); return; }
      busy(root.querySelector('[type=submit]'), async () => {
        try { const ec = await creer(v); demarrer(u, ec); }
        catch (x) { setErr(root, errTxt(x)); }
      });
    });
    root.querySelector('#aBack').addEventListener('click', retour);
  });
}
function ecranCode(u, retour) {
  show(`<form class="form" id="aForm" novalidate>
      <h2 class="auth-t">Code d'invitation</h2>
      <p>Tape le code reçu de la gérante de l'écurie : 8 lettres et chiffres.</p>
      ${field('aCodeI', 'Code', 'text', 'class="code-in" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="11" placeholder="ABCD-EF23" required')}
      ${errBox}
      <button class="btn primary" type="submit">Continuer</button>
      <div class="auth-links"><button type="button" class="link" id="aBack">Retour</button></div>
    </form>`, root => {
    const i = root.querySelector('#aCodeI');
    i.addEventListener('input', () => { const c = normCode(i.value).slice(0, 8); const v = c.length > 4 ? joli(c) : c; if (v !== i.value) i.value = v; });
    root.querySelector('#aForm').addEventListener('submit', e => {
      e.preventDefault();
      busy(root.querySelector('[type=submit]'), async () => {
        let inv;
        try { inv = await lireInvitation(i.value); }
        catch (x) { setErr(root, errTxt(x)); return; }
        if (await estMembre(inv.structure).catch(() => false)) { setErr(root, inv.structureNom ? `Tu fais déjà partie ${deNom(inv.structureNom)}.` : 'Tu fais déjà partie de cette écurie.'); return; }
        const ok = await proposer(u, inv, { plusTard: 'Retour' });
        if (ok) entrer(u); else ecranCode(u, retour);
      });
    });
    root.querySelector('#aBack').addEventListener('click', retour);
    setTimeout(() => i.focus(), 50);
  });
}
// Écran « Rejoindre {écurie} » : se résout à true (rejointe) ou false (plus tard)
function proposer(u, inv, o = {}) {
  const role = ROLES[inv.role] || inv.role;
  const qui = inv.par && inv.par.nom ? escH(inv.par.nom) : 'La gérante';
  const quoi = inv.role === 'proprio' ? 'Tu verras ton cheval : ses soins, ses séances, ses concours, où il est au pré, et tes relevés de pension.' : inv.role === 'lecture' ? 'Tu pourras tout consulter, sans rien modifier.' : 'Tu pourras tout noter : chevaux, soins, prés, foin, concours et tâches.';
  return new Promise(fin => show(`<div class="form">
      <h2 class="auth-t">Rejoindre ${escH(inv.structureNom || "l'écurie")}</h2>
      <p>${qui} t'invite à rejoindre <b>${escH(inv.structureNom || "l'écurie")}</b>.</p>
      <div class="box"><div class="wrap"><span class="pill ok">${escH(role)}</span></div><p class="note">${quoi}</p></div>
      ${errBox}
      <div class="auth-choix">
        <button class="btn primary" id="aOui">Rejoindre</button>
        <button class="btn" id="aNon">${escH(o.plusTard || 'Plus tard')}</button>
      </div>
    </div>`, root => {
    root.querySelector('#aOui').addEventListener('click', e => busy(e.currentTarget, async () => {
      try { await rejoindreInv(inv); fin(true); }
      catch (x) { setErr(root, errTxt(x)); }
    }));
    root.querySelector('#aNon').addEventListener('click', () => { VUS.add(inv.code); fin(false); });
  }));
}
// 2. Le code d'un lien ouvert (ou tapé pendant l'inscription)
async function proposerCode(u, c) {
  let inv;
  try { inv = await lireInvitation(c); }
  catch (e) {
    if (e.code !== 'invitation') return;          // sans réseau : on garde le code pour la prochaine fois
    ecris(K.invitation, null);
    if (!e.deja) await message('Invitation', e.message);
    return;
  }
  if (await estMembre(inv.structure).catch(() => false)) { ecris(K.invitation, null); return; }
  await proposer(u, inv);
}
async function lireInvitation(saisie) {
  const c = normCode(saisie);
  if (!codeOk(c)) throw erreur("Ce code n'a pas le bon format : 8 lettres et chiffres, par exemple ABCD-EF23.");
  let s;
  try { s = await getDoc(doc(fs, 'invitations', c)); }
  catch (e) { if (estRefus(e)) throw erreur("Ce code ne correspond à aucune invitation."); throw e; }
  if (!s.exists()) throw erreur("Ce code ne correspond à aucune invitation. Vérifie-le avec la personne qui te l'a donné.");
  const inv = Object.assign({ code: c }, s.data());
  if (inv.utiliseePar) throw erreur(inv.utiliseePar === U.uid ? 'Tu as déjà rejoint cette écurie avec ce code.' : "Ce code a déjà servi : il ne marche qu'une fois. Demande un nouveau lien à la gérante.", { deja: inv.utiliseePar === U.uid });
  if (inv.expire && inv.expire <= Date.now()) throw erreur("Cette invitation a expiré (un lien reste valable 7 jours). Demande-en une nouvelle à la gérante.");
  if (inv.email && String(inv.email).toLowerCase() !== MAIL) throw erreur("Cette invitation a été faite pour une autre adresse e-mail. Connecte-toi avec l'adresse invitée.");
  if (!ROLES_INVITES.includes(inv.role) || typeof inv.structure !== 'string') throw erreur("Cette invitation n'est pas valable.");
  return inv;
}
// Rejoindre = un seul lot : sa fiche de membre, l'invitation marquée utilisée, l'index
async function rejoindreInv(inv) {
  const sid = inv.structure, now = Date.now(), nom = nomDe(U);
  const b = writeBatch(fs);
  b.set(doc(fs, 'structures', sid, 'membres', U.uid), { email: MAIL, role: inv.role, nom, depuis: now, via: inv.code });
  b.update(doc(fs, 'invitations', inv.code), { utiliseePar: U.uid, utiliseeLe: now });
  b.set(indexRef(), { nom, email: MAIL, ecuries: { [sid]: { nom: inv.structureNom || '', role: inv.role } }, derniere: sid }, { merge: true });
  try { await b.commit(); }
  catch (e) { if (estRefus(e)) throw erreur("Cette invitation n'est plus valable (déjà utilisée, expirée ou annulée)."); throw e; }
  IDX.ecuries[sid] = { nom: inv.structureNom || '', role: inv.role };
  IDX.derniere = sid;
  if (lis(K.invitation) === inv.code) ecris(K.invitation, null);
  return { sid, nom: inv.structureNom || '' };
}
// 3. Les invitations faites à son adresse e-mail
async function invitationsMail() {
  const q = await getDocs(query(collection(fs, 'invitations'), where('email', '==', MAIL)));
  const now = Date.now();
  return q.docs.map(d => Object.assign({ code: d.id }, d.data()))
    .filter(i => !i.utiliseePar && (!i.expire || i.expire > now) && ROLES_INVITES.includes(i.role) && typeof i.structure === 'string')
    .sort((a, b) => (a.le || 0) - (b.le || 0));
}
// Créer une écurie = un seul lot : la structure, sa propre fiche de gérante, l'index
async function creer({ nom, commune }) {
  nom = String(nom || '').replace(/\s+/g, ' ').trim();
  commune = String(commune || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!nomValide(nom)) throw erreur("Le nom de l'écurie doit faire de 2 à 40 caractères.");
  const ref = doc(collection(fs, 'structures')), sid = ref.id, now = Date.now(), qui = { uid: U.uid, nom: nomDe(U) };
  const abonnement = { statut: 'essai', debut: now, finEssai: ajouterMois(now, 2) };   // essai de 2 mois, sans carte
  const e = { id: sid, nom, commune, role: 'gerante', crottinsDepuis: isoJour(now), creeLe: now, abonnement, gerante: U.uid };
  const b = writeBatch(fs);
  b.set(ref, { nom, commune, creeLe: now, creePar: qui, gerante: U.uid, crottinsDepuis: e.crottinsDepuis, abonnement });
  b.set(doc(fs, 'structures', sid, 'membres', U.uid), { email: MAIL, role: 'gerante', nom: qui.nom, depuis: now });
  b.set(indexRef(), { nom: qui.nom, email: MAIL, ecuries: { [sid]: { nom, role: 'gerante' } }, derniere: sid }, { merge: true });
  await b.commit();
  IDX.ecuries[sid] = { nom, role: 'gerante' };
  IDX.derniere = sid;
  return e;
}

/* ---------- Ancien carnet (avant les écuries) : mise à jour ---------- */
const anciennesCles = () => { try { return localStorage.getItem(ANC.cache) != null || (lis(ANC.file) || []).length > 0; } catch (x) { return false; } };
// Les clés locales de l'ancien carnet deviennent celles de l'écurie mise à jour : les modifications
// faites hors ligne avant la mise à jour partent au bon endroit (sauf vider : déjà recopiées par la gérante)
function rangerAnciennes(sid, vider = false) {
  try {
    const cache = localStorage.getItem(ANC.cache), file = lis(ANC.file);
    if (cache != null && localStorage.getItem(K.cache(sid)) == null) localStorage.setItem(K.cache(sid), cache);
    if (!vider && Array.isArray(file) && file.length) ecris(K.file(sid), (lis(K.file(sid)) || []).concat(file.map(o => Object.assign({}, o, { sid }))));
    if (vider) ecris(K.file(sid), []);
    [ANC.cache, ANC.file, ANC.role].forEach(k => localStorage.removeItem(k));
  } catch (x) { /* stockage indisponible */ }
}
// Téléphone qui garde des clés de l'ancien carnet : si la gérante a fait la mise à jour, on les range
async function rangerAnciennesCles(sidOuvert) {
  if (!anciennesCles()) return false;
  let mq = null;
  try { const m = await getDoc(doc(fs, 'config', 'migration')); mq = m.exists() ? m.data() : null; }
  catch (e) { return false; }
  if (!mq || typeof mq.structure !== 'string') return false;   // pas encore mis à jour : on attend
  const S = mq.structure;
  if (S !== sidOuvert) {
    const r = await acces(S).catch(() => null);
    if (!r) return false;
    if (r.perdu) { [ANC.cache, ANC.file, ANC.role].forEach(k => { try { localStorage.removeItem(k); } catch (x) { /* rien */ } }); return false; }
    if (!IDX.ecuries[S]) { IDX.ecuries[S] = { nom: r.e.nom, role: r.e.role }; setDoc(indexRef(), { ecuries: { [S]: IDX.ecuries[S] } }, { merge: true }).catch(() => {}); }
  }
  rangerAnciennes(S);
  return S === sidOuvert;
}
// 4. Ancien membre sans écurie : rejoindre l'écurie mise à jour, attendre la gérante, ou faire la mise à jour
async function ancienCarnet(u) {
  let a = null;
  try { const s = await getDoc(doc(fs, 'membres', u.uid)); a = s.exists() ? s.data() : null; }
  catch (e) { if (estRefus(e)) return false; throw e; }
  if (!a) return false;
  let mq = null;
  try { const m = await getDoc(doc(fs, 'config', 'migration')); mq = m.exists() ? m.data() : null; }
  catch (e) { if (!estRefus(e)) throw e; }
  if (mq && typeof mq.structure === 'string') {
    const r = await acces(mq.structure);
    if (!r.ok) return false;
    // sa fiche est déjà recopiée : l'écurie entre dans son index et ses clés locales la suivent
    IDX.ecuries[r.e.id] = { nom: r.e.nom, role: r.e.role };
    IDX.derniere = r.e.id;
    await Promise.race([setDoc(indexRef(), { nom: nomDe(u), email: MAIL, ecuries: { [r.e.id]: IDX.ecuries[r.e.id] }, derniere: r.e.id }, { merge: true }).catch(() => {}), attendre(4000)]);
    rangerAnciennes(r.e.id);
    demarrer(u, r.e, { recharger: true });
    return true;
  }
  if (a.role === 'gerante') ecranMigration(u);
  else ecranAttenteMigration(u);
  return true;
}
function ecranAttenteMigration(u) {
  show(`<div class="form">
      <h2 class="auth-t">Mise à jour du carnet</h2>
      <p>La gérante met le carnet à jour. Réessaie dans quelques minutes.</p>
      <button class="btn primary" id="aRetry">Réessayer</button>
      ${sortie}
    </div>`, root => {
    root.querySelector('#aRetry').addEventListener('click', e => busy(e.currentTarget, () => entrer(u)));
    lierSortie(root);
  });
}
// Nouvelle version publiée avant les nouvelles règles : on attend, avec une sauvegarde possible
async function reglesAnciennes(u, err) {
  let a = null;
  try { const s = await getDoc(doc(fs, 'membres', u.uid)); a = s.exists() ? s.data() : null; } catch (x) { a = null; }
  if (!a) { ecranSouci(u, err); return; }
  const g = a.role === 'gerante';
  show(`<div class="form">
      <h2 class="auth-t">Mise à jour en attente</h2>
      ${g ? `<p>La nouvelle version du carnet est prête, mais ses règles d'accès ne sont pas encore publiées dans Firebase.</p>
        <p class="hint">Télécharge d'abord une sauvegarde. Colle ensuite le fichier firestore.rules dans Firebase › Firestore Database › Règles, touche « Publier », puis « Réessayer » ici.</p>`
      : '<p>La gérante met le carnet à jour. Réessaie dans quelques minutes.</p>'}
      ${errBox}
      <div class="auth-choix">
        ${g ? '<button class="btn" id="aSave">Télécharger une sauvegarde</button>' : ''}
        <button class="btn primary" id="aRetry">Réessayer</button>
      </div>
      ${sortie}
    </div>`, root => {
    const s = root.querySelector('#aSave');
    if (s) s.addEventListener('click', e => busy(e.currentTarget, async () => {
      try { const src = await lireAncien(false); appliquerFileAncienne(src); telecharger(sauvegardeJson(src), `carnet-ecurie-${isoJour(Date.now())}.json`); setErr(root, ''); s.textContent = 'Sauvegarde téléchargée'; }
      catch (x) { setErr(root, "La sauvegarde n'a pas pu être lue. Vérifie ta connexion et réessaie."); }
    }));
    root.querySelector('#aRetry').addEventListener('click', e => busy(e.currentTarget, () => entrer(u)));
    lierSortie(root);
  });
}
// Lecture complète de l'ancien carnet, depuis le serveur. Seulement les collections qu'il avait : les règles
// d'avant refusent toutes les autres (stocks, consignes, messages…), et une seule lecture refusée ferait tout échouer.
const COLS_ANCIENS = ['chevaux', 'soins', 'pres', 'places', 'entretiens', 'foin', 'concours', 'seances', 'taches'];
async function lireAncien(avecInvitations) {
  const src = { cols: {}, cfg: null, membres: {}, invitations: [] };
  const lots = await Promise.all([
    ...COLS_ANCIENS.map(c => getDocsFromServer(collection(fs, c))),
    getDocFromServer(doc(fs, 'config', 'reglages')),
    getDocsFromServer(collection(fs, 'membres')),
    avecInvitations ? getDocsFromServer(query(collection(fs, 'invitations'), where('par', '==', U.uid))) : null
  ]);
  COLS.forEach(c => { src.cols[c] = {}; });
  COLS_ANCIENS.forEach((c, i) => { lots[i].docs.forEach(d => { src.cols[c][d.id] = d.data(); }); });
  const n = COLS_ANCIENS.length, r = lots[n];
  src.cfg = r.exists() ? r.data() : null;
  lots[n + 1].docs.forEach(d => { src.membres[d.id] = d.data(); });
  if (lots[n + 2]) src.invitations = lots[n + 2].docs.map(d => Object.assign({ email: String(d.id).toLowerCase() }, d.data()));
  return src;
}
const fusionner = (a, b) => {
  const o = Object.assign({}, a);
  Object.keys(b || {}).forEach(k => {
    const x = b[k], y = o[k];
    o[k] = (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x) && !Array.isArray(y)) ? fusionner(y, x) : x;
  });
  return o;
};
// Les modifications de ce téléphone pas encore envoyées à l'ancien carnet sont ajoutées à la copie
function appliquerFileAncienne(src) {
  const file = lis(ANC.file);
  if (!Array.isArray(file)) return 0;
  file.forEach(o => {
    if (!o || typeof o.coll !== 'string' || typeof o.id !== 'string') return;
    if (o.coll === 'config') { if (o.id === 'reglages') src.cfg = o.op === 'set' ? o.data : null; return; }
    if (o.coll === 'membres') {
      if (o.op === 'set' && src.membres[o.id] && o.data) { const f = Object.assign({}, o.data); delete f.role; delete f.email; src.membres[o.id] = fusionner(src.membres[o.id], f); }
      return;
    }
    if (!src.cols[o.coll]) return;
    if (o.op === 'set' && o.data) src.cols[o.coll][o.id] = o.data; else if (o.op !== 'set') delete src.cols[o.coll][o.id];
  });
  return file.length;
}
// Sauvegarde au format de l'export actuel (Réglages › Exporter), avec en plus les fiches de l'équipe
function sauvegardeJson(src) {
  const data = { app: 'carnet-ecurie', version: 1, exporte: new Date().toISOString(), cfg: src.cfg };
  COLS.forEach(c => { data[c] = Object.entries(src.cols[c]).map(([id, d]) => Object.assign({}, d, { id })); });
  data.membres = Object.entries(src.membres).map(([id, d]) => Object.assign({}, d, { id }));
  return JSON.stringify(data, null, 1);
}
function telecharger(texte, nom) {
  const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
// Écritures par lots : nombre limité (règles d'accès) et taille limitée (photos dans les fiches)
const TAILLE_LOT = 5 * 1024 * 1024;
const octets = s => { try { return new TextEncoder().encode(s).length; } catch (x) { return s.length * 2; } };
async function ecrireParLots(ops, max, suivi) {
  let b = writeBatch(fs), n = 0, taille = 0, faits = 0;
  const envoyer = async () => { await delai(b.commit(), 180000); faits += n; if (suivi) suivi(faits); b = writeBatch(fs); n = 0; taille = 0; };
  for (const o of ops) {
    const t = octets(JSON.stringify(o.data));
    if (n && (n >= max || taille + t > TAILLE_LOT)) await envoyer();
    b.set(doc(fs, o.path), o.data); n++; taille += t;
  }
  if (n) await envoyer();
}
async function compte(path) {
  try { return (await getCountFromServer(collection(fs, path))).data().count; }
  catch (e) { if (estRefus(e)) throw e; return (await getDocsFromServer(collection(fs, path))).size; }
}
// Même nombre de fiches qu'avant ; s'il y en a plus (quelqu'un a déjà rejoint), toutes les anciennes doivent y être
async function concorde(path, ids) {
  const k = await compte(path);
  if (k === ids.length) return { ok: true, k };
  if (k < ids.length) return { ok: false, k };
  const la = new Set((await getDocsFromServer(collection(fs, path))).docs.map(d => d.id));
  return { ok: ids.every(id => la.has(id)), k };
}
const ETAPES = ['Sauvegarde sur ce téléphone', "Création de l'écurie", "L'équipe", 'Le carnet', 'Les invitations en attente', 'Vérification', "Ouverture de l'écurie"];
function ecranMigration(u, msg = '') {
  const rep = lis(K.migration), reprise = !!(rep && rep.uid === u.uid && rep.sid);
  show(`<form class="form" id="aForm" novalidate>
      <h2 class="auth-t">Mise à jour du carnet</h2>
      <p>EquiValdi accueille maintenant plusieurs écuries, chacune dans son propre espace. Ton carnet devient ta première écurie : tout est recopié (chevaux, prés, foin, concours, tâches, équipe et crottins), après une sauvegarde téléchargée sur ce téléphone.</p>
      ${reprise ? '<div class="box"><p class="note" style="color:var(--ink)">La mise à jour a été interrompue : elle reprend là où elle s\'était arrêtée.</p></div>' : ''}
      ${champsEcurie(reprise ? rep.nom : '', reprise ? rep.commune : '')}
      ${errBox}
      <button class="btn primary" type="submit">${reprise ? 'Reprendre la mise à jour' : 'Mettre à jour'}</button>
      ${sortie}
    </form>`, root => {
    if (msg) setErr(root, msg);
    root.querySelector('#aForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = lireEcurie(root);
      if (!nomValide(v.nom)) { setErr(root, "Le nom de l'écurie doit faire de 2 à 40 caractères."); return; }
      migrer(u, v);
    });
    lierSortie(root);
  });
}
function ecranProgres() {
  const etats = ETAPES.map(() => 'afaire'), det = ETAPES.map(() => '');
  let root = null;
  show(`<div class="form">
      <h2 class="auth-t">Mise à jour du carnet</h2>
      <ol class="auth-etapes" id="aEtapes"></ol>
      <p class="hint" id="aEtat" aria-live="polite"></p>
      ${errBox}
      <div class="auth-choix" id="aFin" hidden></div>
    </div>`, r => { root = r; });
  const dessine = () => {
    root.querySelector('#aEtapes').innerHTML = ETAPES.map((t, i) => `<li class="${etats[i]}"><i aria-hidden="true"></i><span>${t}</span>${det[i] ? `<small>${escH(det[i])}</small>` : ''}</li>`).join('');
  };
  dessine();
  return {
    root,
    etape(n, e, d) {
      etats[n - 1] = e;
      if (d != null) det[n - 1] = d;
      dessine();
      if (e === 'encours') root.querySelector('#aEtat').textContent = ETAPES[n - 1] + '…';
    },
    detail(n, d) { det[n - 1] = d; dessine(); },
    echec(n, texte, boutons) {
      if (n) etats[n - 1] = 'ko';
      dessine();
      root.querySelector('#aEtat').textContent = '';
      setErr(root, texte);
      const f = root.querySelector('#aFin');
      f.innerHTML = boutons;
      f.hidden = false;
      return f;
    },
    fin(texte, boutons) {
      root.querySelector('#aEtat').textContent = texte;
      root.querySelector('#aEtat').classList.add('ok');
      const f = root.querySelector('#aFin');
      f.innerHTML = boutons;
      f.hidden = false;
      const b = f.querySelector('.primary');
      if (b) b.focus();
      return f;
    }
  };
}
// La mise à jour : sauvegarde, écurie, équipe, carnet, invitations, vérification, puis seulement le marqueur
async function migrer(u, v) {
  const uid = u.uid, qui = { uid, nom: nomDe(u) };
  let rep = lis(K.migration);
  if (!rep || rep.uid !== uid || !rep.sid) rep = { uid, sid: doc(collection(fs, 'structures')).id };
  Object.assign(rep, { nom: v.nom, commune: v.commune });
  ecris(K.migration, rep);
  const S = rep.sid, base = 'structures/' + S, P = ecranProgres();
  let n = 1, sauvegarde = '';
  const nomFichier = `carnet-ecurie-avant-mise-a-jour-${isoJour(Date.now())}.json`;
  try {
    // 1. Sauvegarde complète, avant toute écriture
    P.etape(1, 'encours');
    const src = await lireAncien(true);
    const nFile = appliquerFileAncienne(src);
    sauvegarde = sauvegardeJson(src);
    telecharger(sauvegarde, nomFichier);
    const nDocs = COLS.reduce((s, c) => s + Object.keys(src.cols[c]).length, 0);
    P.etape(1, 'fait', `${nDocs} ${pl(nDocs, 'fiche')} · ${nomFichier}${nFile ? ` · ${nFile} ${pl(nFile, 'modification')} de ce téléphone ${nFile > 1 ? 'incluses' : 'incluse'}` : ''}`);
    // 2. L'écurie (déjà créée si la mise à jour reprend)
    n = 2; P.etape(2, 'encours');
    let existe = false;
    try { existe = (await getDocFromServer(doc(fs, base))).exists(); } catch (e) { if (!estRefus(e)) throw e; }
    const moi = src.membres[uid] || {};
    if (!existe) {
      const now = Date.now(), b = writeBatch(fs);
      b.set(doc(fs, base), { nom: v.nom, commune: v.commune, creeLe: now, creePar: qui, gerante: uid, crottinsDepuis: '2026-10-25', abonnement: { statut: 'fondatrice', debut: now } });
      b.set(doc(fs, base, 'membres', uid), clean(Object.assign({}, moi, { email: MAIL, role: 'gerante', nom: moi.nom || qui.nom, depuis: moi.depuis || now })));
      await delai(b.commit(), 60000);
    } else {
      await delai(updateDoc(doc(fs, base), { nom: v.nom, commune: v.commune }), 60000);
      await delai(setDoc(doc(fs, base, 'membres', uid), clean(Object.assign({}, moi, { email: MAIL, role: 'gerante', nom: moi.nom || qui.nom }))), 60000);
    }
    P.etape(2, 'fait', v.nom + (v.commune ? ' · ' + v.commune : ''));
    // 3. L'équipe : les mêmes personnes, avec tous les champs de leur fiche (bons compris)
    n = 3; P.etape(3, 'encours');
    const autres = Object.entries(src.membres).filter(([id]) => id !== uid).map(([id, m]) => ({ path: `${base}/membres/${id}`, data: clean(m) }));
    const nM = autres.length + 1;
    await ecrireParLots(autres, 4, k => P.detail(3, `${k + 1} sur ${nM}`));   // 4 par lot : la règle de recopie lit 4 documents
    P.etape(3, 'fait', `${nM} ${pl(nM, 'personne')}`);
    // 4. Le carnet : 9 collections et les réglages, mêmes identifiants
    n = 4; P.etape(4, 'encours');
    const ops = [];
    COLS.forEach(c => Object.entries(src.cols[c]).forEach(([id, d]) => ops.push({ path: `${base}/${c}/${id}`, data: clean(d) })));
    if (src.cfg) ops.push({ path: `${base}/config/reglages`, data: clean(src.cfg) });
    P.detail(4, `0 sur ${ops.length}`);
    await ecrireParLots(ops, 9, k => P.detail(4, `${k} sur ${ops.length}`));   // 9 par lot : chaque écriture lit 2 documents dans les règles
    P.etape(4, 'fait', `${ops.length} ${pl(ops.length, 'fiche')}`);
    // 5. Les invitations en attente (anciennes, par adresse) deviennent des invitations par e-mail avec un code
    n = 5; P.etape(5, 'encours');
    const inscrits = new Set(Object.values(src.membres).map(m => String(m.email || '').toLowerCase()));
    const deja = new Set((await getDocsFromServer(query(collection(fs, 'invitations'), where('structure', '==', S)))).docs.map(d => String(d.data().email || '').toLowerCase()));
    const opsI = [];
    for (const i of src.invitations) {
      if (!i.email || !i.email.includes('@') || inscrits.has(i.email) || deja.has(i.email)) continue;
      opsI.push({ path: 'invitations/' + await codeLibre(), data: { structure: S, structureNom: v.nom, role: i.role === 'lecture' ? 'lecture' : 'equipe', email: i.email, par: qui, le: Number.isFinite(i.le) ? i.le : Date.now() } });
      deja.add(i.email);
    }
    await ecrireParLots(opsI, 18);
    const nI = [...deja].filter(Boolean).length;
    P.etape(5, 'fait', nI ? `${nI} ${pl(nI, 'invitation')}` : 'Aucune');
    // 6. Vérification : nombre de fiches par collection, ancien contre nouveau
    n = 6; P.etape(6, 'encours');
    const ecarts = [];
    const cmp = async (lib, chemin, ids) => { const r = await concorde(chemin, ids); if (!r.ok) ecarts.push(`${lib} : ${ids.length} dans l'ancien carnet, ${r.k} dans l'écurie`); };
    await Promise.all([
      ...COLS.map(c => cmp(c, `${base}/${c}`, Object.keys(src.cols[c]))),
      cmp('équipe', `${base}/membres`, [...new Set([...Object.keys(src.membres), uid])]),
      (async () => { const r = (await getDocFromServer(doc(fs, base, 'config', 'reglages'))).exists(); if (r !== !!src.cfg) ecarts.push('réglages : absents de l\'écurie'); })()
    ]);
    if (ecarts.length) {
      P.echec(6, `Les nombres ne concordent pas (${ecarts.join(' ; ')}). L'ancien carnet n'a pas changé et reste lisible : touche « Réessayer » pour recopier.`,
        '<button class="btn primary" id="aRetry">Réessayer</button><button class="btn" id="aSave">Retélécharger la sauvegarde</button>');
      lierEchec(u, v, P, sauvegarde, nomFichier);
      return;
    }
    P.etape(6, 'fait', 'Tout concorde');
    // 7. Seulement maintenant : le marqueur, l'index, et les clés locales de ce téléphone
    n = 7; P.etape(7, 'encours');
    await delai(setDoc(doc(fs, 'config', 'migration'), { structure: S, le: Date.now(), par: qui }), 60000);
    IDX.ecuries[S] = { nom: v.nom, role: 'gerante' };
    IDX.derniere = S;
    await delai(setDoc(indexRef(), { nom: qui.nom, email: MAIL, ecuries: { [S]: IDX.ecuries[S] }, derniere: S }, { merge: true }), 60000);
    rangerAnciennes(S, true);
    ecris(K.migration, null);
    P.etape(7, 'fait', 'Mise à jour terminée');
    const f = P.fin(`C'est fait : ${v.nom} est prête. Ton équipe la retrouve en rouvrant l'appli.`,
      `<button class="btn primary" id="aGo">Ouvrir ${escH(v.nom)}</button><button class="btn" id="aSave">Retélécharger la sauvegarde</button>`);
    f.querySelector('#aSave').addEventListener('click', () => telecharger(sauvegarde, nomFichier));
    f.querySelector('#aGo').addEventListener('click', () => demarrer(u, { id: S, nom: v.nom, commune: v.commune, role: 'gerante', crottinsDepuis: '2026-10-25', creeLe: Date.now() }, { recharger: true }));
  } catch (e) {
    console.error(e);
    const txt = estRefus(e) ? "La base a refusé une écriture : vérifie que les nouvelles règles d'accès sont bien publiées, puis réessaie."
      : "La connexion s'est interrompue. L'ancien carnet n'a pas changé : touche « Réessayer », la mise à jour reprend là où elle en était.";
    P.echec(n, txt, `<button class="btn primary" id="aRetry">Réessayer</button>${sauvegarde ? '<button class="btn" id="aSave">Retélécharger la sauvegarde</button>' : ''}`);
    lierEchec(u, v, P, sauvegarde, nomFichier);
  }
}
function lierEchec(u, v, P, sauvegarde, nomFichier) {
  const r = P.root.querySelector('#aRetry'), s = P.root.querySelector('#aSave');
  if (r) r.addEventListener('click', () => migrer(u, v));
  if (s) s.addEventListener('click', () => telecharger(sauvegarde, nomFichier));
}

/* ---------- Gestion de l'écurie ouverte (window.EQ) ---------- */
const exigerGerante = () => { if (!OUV || OUV.role !== 'gerante') throw erreur("Seule la gérante de l'écurie peut faire ça."); };
async function codeLibre() {
  for (let i = 0; i < 8; i++) {
    const c = tireCode();
    if (!(await getDoc(doc(fs, 'invitations', c))).exists()) return c;
  }
  throw erreur("Le code n'a pas pu être créé. Réessaie.");
}
async function nouvelleInvitation(champs) {
  exigerGerante();
  for (let i = 0; i < 4; i++) {
    const c = await codeLibre();
    try {
      await setDoc(doc(fs, 'invitations', c), Object.assign({ structure: OUV.id, structureNom: OUV.nom, par: moiQui(), le: Date.now() }, champs));
      return c;
    } catch (e) { if (!estRefus(e) || i === 3) throw e; }   // code pris entre-temps : on en tire un autre
  }
}
async function quitter() {
  if (!OUV) return;
  if (OUV.role === 'gerante') throw erreur("Passe d'abord la gérance à quelqu'un de l'équipe : une écurie garde toujours sa gérante.");
  const sid = OUV.id, autres = listeEcuries().filter(x => x.id !== sid);
  const b = writeBatch(fs);
  b.delete(doc(fs, 'structures', sid, 'membres', U.uid));
  b.set(indexRef(), { ecuries: { [sid]: deleteField() }, derniere: autres.length ? autres[0].id : deleteField() }, { merge: true });
  await b.commit();
  oublierEcurie(sid);
  if (autres.length) ecris(K.ecurie, { uid: U.uid, sid: autres[0].id, nom: autres[0].nom, role: autres[0].role, ecuries: autres });
  avis(OUV.nom ? `Tu as quitté ${OUV.nom}.` : "Tu as quitté l'écurie.");
  location.reload();
}
async function renommer({ nom, commune }) {
  exigerGerante();
  nom = String(nom || '').replace(/\s+/g, ' ').trim();
  commune = String(commune || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!nomValide(nom)) throw erreur("Le nom de l'écurie doit faire de 2 à 40 caractères.");
  const sid = OUV.id;
  await Promise.race([updateDoc(doc(fs, 'structures', sid), { nom, commune }), attendre(4000)]);
  Object.assign(OUV, { nom, commune });
  IDX.ecuries[sid] = { nom, role: OUV.role };
  setDoc(indexRef(), { ecuries: { [sid]: IDX.ecuries[sid] } }, { merge: true }).catch(() => {});
  const l = lis(K.ecurie);
  if (l && l.sid === sid) ecris(K.ecurie, Object.assign(l, { nom, commune, ecuries: listeEcuries() }));
  Object.assign(window.EQ, { ecurie: Object.assign({}, OUV), ecuries: listeEcuries() });
  notifier();
  // les invitations en attente portent le nouveau nom
  invitations().then(ls => { if (!ls.length) return; const b = writeBatch(fs); ls.forEach(i => b.update(doc(fs, 'invitations', i.code), { structureNom: nom })); return b.commit(); }).catch(() => {});
}
async function passerGerance(cible) {
  exigerGerante();
  if (!cible || cible === U.uid) throw erreur('Choisis une autre personne de l\'équipe.');
  const sid = OUV.id, f = await getDoc(doc(fs, 'structures', sid, 'membres', cible));
  if (!f.exists() || f.data().role !== 'equipe') throw erreur('La gérance se passe à une personne qui a le droit « Peut modifier ».');
  const b = writeBatch(fs);
  b.update(doc(fs, 'structures', sid), { gerante: cible });
  b.update(doc(fs, 'structures', sid, 'membres', cible), { role: 'gerante' });
  b.update(doc(fs, 'structures', sid, 'membres', U.uid), { role: 'equipe' });
  b.set(indexRef(), { ecuries: { [sid]: { nom: OUV.nom, role: 'equipe' } } }, { merge: true });
  await b.commit();
  ecris(K.role(sid), { uid: U.uid, role: 'equipe' });
  avis(`Gérance passée : ${f.data().nom || 'la nouvelle gérante'} gère maintenant ${OUV.nom || "l'écurie"}.`);
  location.reload();
}
async function invitations() {
  if (!OUV) return [];
  const q = await getDocs(query(collection(fs, 'invitations'), where('structure', '==', OUV.id)));
  return q.docs.map(d => Object.assign({ code: d.id }, d.data())).filter(i => !i.utiliseePar).sort((a, b) => (b.le || 0) - (a.le || 0));
}
async function retirerMembre(cible) {
  exigerGerante();
  if (cible === U.uid) throw erreur('Pour partir, passe d\'abord la gérance.');
  const ref = doc(fs, 'structures', OUV.id, 'membres', cible), f = await getDoc(ref);
  const mail = f.exists() ? String(f.data().email || '').toLowerCase() : '';
  await deleteDoc(ref);
  // ses invitations encore en attente sont annulées aussi
  if (mail) { const ls = await invitations().catch(() => []); await Promise.all(ls.filter(i => i.email === mail).map(i => deleteDoc(doc(fs, 'invitations', i.code)))).catch(() => {}); }
}
async function deconnexion() {
  purgerEcuries();
  // nouvelle connexion : les invitations remises à plus tard seront reproposées
  try { ['equivaldi:plus-tard', K.avis, 'equivaldi:recharge'].forEach(k => sessionStorage.removeItem(k)); } catch (x) { /* rien */ }
  await signOut(auth).catch(() => {});
  location.reload();
}

/* ---------- Abonnement : paiement fictif en attendant Shine ou Tebex ---------- */
// La gérante abonne son écurie (1 mois ou 1 an), à la suite de l'essai ou de l'abonnement en cours.
async function payerFictif(formule, offre = 'maison') {
  exigerGerante();
  if (!['mois', 'an'].includes(formule) || !OFFRES.includes(offre)) throw erreur('Choisis une formule.');
  const now = Date.now(), a = Object.assign({}, OUV.abonnement || {});
  const nouveau = Object.assign(a, {
    statut: 'abonnee', formule, offre, fin: periodeAbo(a, now, formule, offre),
    paiement: { fournisseur: 'fictif', montant: TARIF[offre][formule], le: now, ref: 'DEMO-' + tireCode() }
  });
  try { await delai(updateDoc(doc(fs, 'structures', OUV.id), { abonnement: nouveau }), 20000); }
  catch (e) { if (estRefus(e)) throw erreur("Le paiement n'a pas pu être enregistré."); throw e; }
  OUV.abonnement = nouveau;
  window.EQ.ecurie = Object.assign({}, OUV);
  notifier();
  return nouveau;
}

/* ---------- Administration EquiValdi : toutes les écuries ---------- */
const exigerAdmin = () => { if (!ADMIN) throw erreur("Réservé à l'administration EquiValdi."); };
async function toutesEcuries() {
  exigerAdmin();
  const q = await getDocs(collection(fs, 'structures'));
  return q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.creeLe || 0) - (a.creeLe || 0));
}
async function equipeDe(sid) {
  exigerAdmin();
  return (await getDocs(collection(fs, 'structures', sid, 'membres'))).docs.map(d => Object.assign({ uid: d.id }, d.data()));
}
// prolonger l'essai, enregistrer un paiement reçu (Shine, virement…), passer à vie, arrêter l'abonnement
async function gererAbonnement(sid, action, formule, offre = 'maison') {
  exigerAdmin();
  const ref = doc(fs, 'structures', sid), s = await getDoc(ref);
  if (!s.exists()) throw erreur("Cette écurie n'existe plus.");
  const now = Date.now(), a = Object.assign({}, (s.data() || {}).abonnement || {});
  if (action === 'essai') a.finEssai = ajouterMois(Math.max(now, a.finEssai || 0), 1);
  else if (action === 'payer') {
    if (!['mois', 'an'].includes(formule) || !OFFRES.includes(offre)) throw erreur('Choisis une formule.');
    Object.assign(a, { statut: 'abonnee', formule, offre, fin: periodeAbo(a, now, formule, offre), paiement: { fournisseur: 'manuel', montant: TARIF[offre][formule], le: now, par: MAIL } });
  } else if (action === 'a_vie') a.statut = 'a_vie';
  else if (action === 'arreter') Object.assign(a, { statut: 'essai', fin: 0 });
  else throw erreur('Action inconnue.');
  await delai(updateDoc(ref, { abonnement: a }), 20000);
  if (OUV && OUV.id === sid) { OUV.abonnement = a; window.EQ.ecurie = Object.assign({}, OUV); notifier(); }
  return a;
}
// ouvrir une écurie sans en être membre : rien n'est écrit dans son équipe ni dans l'index
// (apres : 'carte' ouvre directement l'éditeur de la carte des prés, pour une carte demandée)
async function ouvrirAdmin(sid, apres) {
  exigerAdmin();
  if (apres) ecris(K.apres, apres);
  if (listeEcuries().some(x => x.id === sid)) return ouvrir(sid);
  const s = await getDoc(doc(fs, 'structures', sid));
  ecris(K.ecurie, { uid: U.uid, sid, nom: s.exists() ? (s.data() || {}).nom || '' : '', fantome: true, ecuries: listeEcuries() });
  location.reload();
}
/* ---------- Carte des prés : la gérante demande à EquiValdi de la dessiner ---------- */
function majOuv(champs) {
  Object.assign(OUV, champs);
  const l = lis(K.ecurie);
  if (l && l.sid === OUV.id) ecris(K.ecurie, Object.assign(l, champs));
  window.EQ.ecurie = Object.assign({}, OUV);
  notifier();
}
async function demanderCarte(note, par) {
  exigerGerante();
  if (OUV.fantome) throw erreur("L'administration dessine la carte elle-même.");
  const v = { statut: 'demandee', le: Date.now(), par: { uid: U.uid, nom: String((par && par.nom) || nomDe(U)).trim().slice(0, 60) }, note: String(note || '').trim().slice(0, 800) };
  await delai(updateDoc(doc(fs, 'structures', OUV.id), { carteDemande: v }), 15000);
  majOuv({ carteDemande: v });
  return v;
}
// la carte publiée (par la gérante ou par l'administration) : la demande est faite
async function carteFaite() {
  const d = OUV && OUV.carteDemande;
  if (!d || d.statut !== 'demandee' || OUV.role !== 'gerante') return null;
  const v = Object.assign({}, d, { statut: 'faite', faiteLe: Date.now(), faitePar: OUV.fantome ? 'equivaldi' : 'gerante' });
  await delai(updateDoc(doc(fs, 'structures', OUV.id), { carteDemande: v }), 15000);
  majOuv({ carteDemande: v });
  return v;
}
async function quitterAdmin() {
  const x = listeEcuries();
  if (x.length) return ouvrir(IDX && IDX.derniere && x.some(y => y.id === IDX.derniere) ? IDX.derniere : x[0].id);
  ecris(K.ecurie, null);
  location.reload();
}

/* ---------- Dernière activité de l'écurie (pour l'administration) ----------
   Une fois toutes les 12 heures au plus, la personne qui ouvre l'écurie note la date : la console
   d'administration voit ainsi les écuries actives et celles qui ne servent plus. */
function noterVisite(sid) {
  const k = 'equivaldi:vu:' + sid, l = Number(lis(k)) || 0, now = Date.now();
  if (now - l < 12 * 3600000) return;
  updateDoc(doc(fs, 'structures', sid), { vu: now }).then(() => ecris(k, now)).catch(() => {});
}

/* ---------- « Une idée, un souci ? » : messages à EquiValdi et réponses ---------- */
const TYPES_RETOUR = ['idee', 'souci', 'question'];
const court = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
async function envoyerRetour({ type, texte }) {
  if (!U) throw erreur('Connecte-toi pour écrire à EquiValdi.');
  const t = String(texte || '').trim().slice(0, 2000);
  if (t.length < 3) throw erreur('Écris quelques mots.');
  const ref = doc(collection(fs, 'retours'));
  const r = {
    uid: U.uid, nom: court(moiQui().nom, 60), email: court(MAIL, 120),
    sid: OUV ? OUV.id : '', ecurie: OUV ? court(OUV.nom, 60) : '', role: OUV && !OUV.fantome ? OUV.role : '',
    type: TYPES_RETOUR.includes(type) ? type : 'idee', texte: t,
    version: court(window.EQ_VERSION, 30), appareil: court(navigator.userAgent, 200), le: Date.now(), statut: 'nouveau'
  };
  try { await delai(setDoc(ref, r), 15000); }
  catch (e) { if (estRefus(e)) throw erreur("Le message n'a pas pu partir : les règles d'accès de la base ne sont pas à jour."); throw e; }
  return Object.assign({ id: ref.id }, r);
}
async function mesRetours() {
  if (!U) return [];
  const q = await getDocs(query(collection(fs, 'retours'), where('uid', '==', U.uid)));
  return q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.le || 0) - (a.le || 0));
}
async function retourVu(id) {
  await updateDoc(doc(fs, 'retours', id), { vuLe: Date.now() });
  window.EQ.reponses = Math.max(0, (window.EQ.reponses || 0) - 1);
  notifier();
}
// au démarrage : une réponse d'EquiValdi pas encore lue ? (une seule fois par visite)
function verifierReponses() {
  if (!U || !OUV || OUV.fantome) return;
  mesRetours().then(l => {
    const n = l.filter(r => r.reponse && !r.vuLe).length;
    window.EQ.reponses = n;
    notifier();
    let dit = false;
    try { dit = sessionStorage.getItem('equivaldi:reponse-vue') === '1'; sessionStorage.setItem('equivaldi:reponse-vue', '1'); } catch (x) { /* rien */ }
    if (n && !dit && typeof toast === 'function') toast(n > 1 ? `EquiValdi a répondu à ${n} de tes messages : Réglages.` : 'EquiValdi a répondu à ton message : Réglages.');
  }).catch(() => {});
}
// administration : les réponses au questionnaire public (questionnaire.html)
async function reponsesSondage() {
  exigerAdmin();
  const q = await getDocs(collection(fs, 'sondage'));
  return q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.le || 0) - (a.le || 0));
}
// administration : tous les messages, la réponse, le classement
async function tousRetours() {
  exigerAdmin();
  const q = await getDocs(collection(fs, 'retours'));
  return q.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.le || 0) - (a.le || 0));
}
async function repondreRetour(id, texte) {
  exigerAdmin();
  const t = String(texte || '').trim().slice(0, 2000);
  if (!t) throw erreur('Écris la réponse.');
  const reponse = { texte: t, le: Date.now() };
  await delai(updateDoc(doc(fs, 'retours', id), { reponse, statut: 'repondu', vuLe: deleteField() }), 15000);
  return reponse;
}
async function classerRetour(id, statut) {
  exigerAdmin();
  if (!['nouveau', 'repondu', 'traite'].includes(statut)) throw erreur('État inconnu.');
  await delai(updateDoc(doc(fs, 'retours', id), { statut }), 15000);
}

/* ---------- Conditions d'utilisation : les comptes créés avant les acceptent une fois ---------- */
async function accepterConditions() {
  if (!U) return;
  const v = { version: CONDITIONS, le: Date.now() };
  await delai(setDoc(indexRef(), { conditions: v }, { merge: true }), 15000);
  if (IDX) IDX.conditions = v;
  CGU_A_FAIRE = false;
  window.EQ.conditionsAFaire = false;
  notifier();
}

/* ---------- Mes données et suppression du compte (RGPD) ---------- */
// les écuries de l'index, vérifiées sur la base : celles que je gère seule (supprimées avec mon compte),
// celles que je gère avec d'autres (la gérance doit d'abord passer), celles dont je suis membre (je les quitte)
async function analyseSuppression() {
  if (!U) throw erreur('Connecte-toi d\'abord.');
  const res = { bloquees: [], supprimees: [], quittees: [] };
  for (const x of listeEcuries()) {
    let st;
    try { st = await getDoc(doc(fs, 'structures', x.id)); }
    catch (e) { if (estRefus(e)) continue; throw e; }
    if (!st.exists()) continue;
    const d = st.data() || {}, e = { id: x.id, nom: d.nom || x.nom };
    if (d.gerante !== U.uid) { res.quittees.push(e); continue; }
    const m = await getDocs(collection(fs, 'structures', x.id, 'membres'));
    (m.size > 1 ? res.bloquees : res.supprimees).push(e);
  }
  return res;
}
async function mesDonnees() {
  if (!U) throw erreur('Connecte-toi d\'abord.');
  const out = { app: 'equivaldi', type: 'donnees-personnelles', exporte: new Date().toISOString(), compte: { uid: U.uid, email: MAIL, prenom: nomDe(U) }, index: null, ecuries: [], messages: [] };
  try { const s = await getDoc(indexRef()); out.index = s.exists() ? s.data() : null; } catch (e) { /* hors ligne */ }
  for (const x of listeEcuries()) {
    try { const f = await getDoc(doc(fs, 'structures', x.id, 'membres', U.uid)); out.ecuries.push({ id: x.id, nom: x.nom, role: x.role, fiche: f.exists() ? f.data() : null }); }
    catch (e) { out.ecuries.push({ id: x.id, nom: x.nom, role: x.role, fiche: null }); }
  }
  try { out.messages = (await mesRetours()).map(r => { const o = Object.assign({}, r); delete o.uid; return o; }); } catch (e) { /* rien */ }
  return out;
}
const lots = async (refs, fn) => { for (let i = 0; i < refs.length; i += 400) { const b = writeBatch(fs); refs.slice(i, i + 400).forEach(r => fn(b, r)); await b.commit(); } };
// une écurie dont je suis la seule personne : son carnet, ses invitations, puis l'écurie et ma fiche (même lot)
async function effacerEcurie(sid) {
  for (const c of [...COLS, 'config', 'partages', 'releves']) {
    const q = await getDocs(collection(fs, 'structures', sid, c));
    await lots(q.docs.map(d => d.ref), (b, r) => b.delete(r));
  }
  const inv = await getDocs(query(collection(fs, 'invitations'), where('structure', '==', sid)));
  await lots(inv.docs.map(d => d.ref), (b, r) => b.delete(r));
  const b = writeBatch(fs);
  b.delete(doc(fs, 'structures', sid, 'membres', U.uid));
  b.delete(doc(fs, 'structures', sid));
  await b.commit();
  oublierEcurie(sid);
}
async function supprimerCompte(motDePasse) {
  if (!U || !auth.currentUser) throw erreur('Connecte-toi d\'abord.');
  if (ADMIN) throw erreur("Le compte d'administration ne se supprime pas depuis l'appli.");
  // Firebase demande une connexion récente : le mot de passe confirme que c'est bien toi
  try { await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, String(motDePasse || ''))); }
  catch (e) { throw (e && ['auth/invalid-credential', 'auth/wrong-password', 'auth/missing-password'].includes(e.code)) ? erreur('Mot de passe incorrect.') : e; }
  const a = await analyseSuppression();
  if (a.bloquees.length) throw erreur(`Passe d'abord la gérance ${a.bloquees.map(x => deNom(x.nom)).join(' et ')} à quelqu'un de l'équipe.`);
  for (const x of a.supprimees) await effacerEcurie(x.id);
  for (const x of a.quittees) {
    try { await deleteDoc(doc(fs, 'structures', x.id, 'membres', U.uid)); } catch (e) { if (!estRefus(e)) throw e; }
    oublierEcurie(x.id);
  }
  const r = await getDocs(query(collection(fs, 'retours'), where('uid', '==', U.uid)));
  await lots(r.docs.map(d => d.ref), (b, x) => b.delete(x));
  await deleteDoc(indexRef());
  SUPPRESSION = true;   // l'écran de connexion attend le rechargement (qui montre le message)
  await deleteUser(auth.currentUser);
  purgerEcuries();
  try { ['carnet-ecurie:moi:v1', CGU_LOCAL, 'carnet-ecurie:ui:v1'].forEach(k => localStorage.removeItem(k)); Object.keys(localStorage).filter(k => k.startsWith('equivaldi:vu:')).forEach(k => localStorage.removeItem(k)); } catch (x) { /* rien */ }
  avis(a.supprimees.length ? `Ton compte a été supprimé, avec ${a.supprimees.map(x => x.nom).join(', ')} et tout son carnet.` : 'Ton compte a été supprimé.');
  location.reload();
}

/* ---------- Écurie d'exemple : l'appli tourne sans compte ni base ---------- */
const PAS_EXEMPLE = "C'est l'écurie d'exemple : rien n'est enregistré ici. Crée ton écurie pour le faire pour de vrai.";
function demarrerExemple() {
  const l = lis(K.ecurie) || {};
  OUV = {
    id: 'exemple', nom: l.nom || "Écurie d'exemple", commune: '', role: 'gerante', crottinsDepuis: l.crottinsDepuis || '', creeLe: l.creeLe || null,
    abonnement: { statut: 'a_vie' }, gerante: 'ex-camille', carteDemande: null, fantome: false, demo: true, retour: !!l.retour
  };
  const non = async () => { throw erreur(PAS_EXEMPLE); };
  Object.keys(window.EQ).forEach(k => { if (typeof window.EQ[k] === 'function') window.EQ[k] = non; });
  Object.assign(window.EQ, {
    email: '', role: 'gerante', admin: false, demo: true, ecurie: Object.assign({}, OUV), ecuries: [], conditionsAFaire: false, reponses: 0,
    lien: () => location.origin + location.pathname, code: joli, tarif: TARIF,
    carteFaite: async () => null,
    invitations: async () => [],
    membres: async () => (typeof list === 'function' ? list('membres') : []).map(m => Object.assign({ uid: m.id, moi: m.id === 'ex-camille', email: '' }, m)),
    bon: async (uid, id, data) => { if (typeof bonLocal === 'function') bonLocal(uid, id, data); },
    deconnexion: async () => window.eqExemple.quitter(),
    ouvrir: async () => window.eqExemple.quitter(),
    quitterAdmin: async () => window.eqExemple.quitter()
  });
  hide();
  window.claude._resolve('user', {
    me: async () => ({ id: 'ex-camille', name: 'Camille', email: '', isOwner: true, canEdit: true, avatarUrl: '', color: '' }),
    id: async () => 'ex-camille', isOwner: async () => true, canEdit: async () => true,
    can: async n => n === 'data.write', profiles: async ids => Object.fromEntries([].concat(ids).map(i => [i, { id: i, name: '' }]))
  });
  window.claude._resolve('db', null);
  notifier();
}

window.EQ = {
  email: '', role: '', admin: false, ecurie: null, ecuries: [],
  tarif: TARIF,
  payerFictif,
  toutesEcuries, equipeDe, gererAbonnement, ouvrirAdmin, quitterAdmin,
  demanderCarte, carteFaite,
  partages, ecrirePartage, effacerPartage, releves, ecrireReleve,
  envoyerRetour, mesRetours, retourVu, tousRetours, reponsesSondage, repondreRetour, classerRetour,
  accepterConditions, analyseSuppression, mesDonnees, supprimerCompte,
  conditions: CONDITIONS, legal: LEGAL, demo: false, reponses: 0, conditionsAFaire: false,
  deconnexion,
  ouvrir,
  creer: async v => { const e = await creer(v); await ouvrir(e.id); return e.id; },
  infoInvitation: lireInvitation,
  rejoindre: async c => {
    const inv = await lireInvitation(c);
    if (await estMembre(inv.structure)) throw erreur(inv.structureNom ? `Tu fais déjà partie ${deNom(inv.structureNom)}.` : 'Tu fais déjà partie de cette écurie.');
    return rejoindreInv(inv);
  },
  quitter,
  renommer,
  passerGerance,
  inviterLien: async role => {
    const c = await nouvelleInvitation({ role: roleInvite(role), expire: Date.now() + 7 * JOUR });
    return { code: c, url: location.origin + location.pathname + '?invitation=' + c };
  },
  inviter: async (email, role) => {
    const mail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw erreur('Indique une adresse e-mail valide.');
    exigerGerante();
    const [ls, mb] = await Promise.all([invitations(), window.EQ.membres()]);
    if (mb.some(m => String(m.email || '').toLowerCase() === mail)) throw erreur('Cette adresse fait déjà partie de l\'écurie.');
    if (ls.some(i => i.email === mail)) throw erreur('Cette adresse a déjà une invitation en attente.');
    const c = await nouvelleInvitation({ role: roleInvite(role), email: mail });
    return { code: c };
  },
  invitations,
  annulerInvitation: async c => { exigerGerante(); await deleteDoc(doc(fs, 'invitations', c)); },
  membres: async () => (await getDocs(collection(fs, 'structures', OUV.id, 'membres'))).docs.map(d => Object.assign({ uid: d.id, moi: !!U && d.id === U.uid }, d.data())),
  changerRole: async (uid, role) => {
    exigerGerante();
    if (!ROLES_INVITES.includes(role)) throw erreur('Pour la gérance, utilise « Passer la gérance ».');
    await updateDoc(doc(fs, 'structures', OUV.id, 'membres', uid), { role });
  },
  retirerMembre,
  // bon de la boutique : écrit seul, sous sa clé, pour ne jamais écraser les autres bons de la fiche
  bon: async (uid, id, data) => setDoc(doc(fs, 'structures', OUV.id, 'membres', uid), { bons: { [id]: data } }, { merge: true }),
  lien: () => location.origin + location.pathname,
  code: joli
};

if (DEMO) demarrerExemple();
else {
  // rien de l'écurie n'est connu sur ce téléphone : on attend la connexion derrière l'écran d'accueil
  if (!window.EQ_SID) attente();
  onAuthStateChanged(auth, u => {
    if (!u) {
      if (SUPPRESSION) return;
      // en quittant l'écurie d'exemple par « Créer mon compte »
      let apres = '';
      try { apres = sessionStorage.getItem('equivaldi:apres-exemple') || ''; sessionStorage.removeItem('equivaldi:apres-exemple'); } catch (x) { /* rien */ }
      if (apres === 'compte') ecranCreation(); else ecranConnexion();
      return;
    }
    if (!u.emailVerified) { ecranVerification(u); return; }
    entrer(u);
  });
}

/* ---------- Hors ligne : mise en cache de l'appli ---------- */
if ('serviceWorker' in navigator) {
  const avaitControleur = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(reg => {
    // l'appli installée reste souvent ouverte en arrière-plan : on regarde s'il y a du nouveau en revenant dessus
    let vu = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || Date.now() - vu < 5 * 60000) return;
      vu = Date.now(); reg.update().catch(() => {});
    });
  }).catch(() => {}));
  // une nouvelle version vient de s'installer : proposer de recharger (jamais d'office, une saisie peut être en cours)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitControleur) return;
    toast('Nouvelle version d\'EquiValdi', { action: { label: 'Recharger', fn: () => location.reload() }, duree: 15000 });
  });
}
