/* Connexion, rôles et base Firestore pour la version installable EquiValdi */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, updateProfile
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, getDoc, getDocs, onSnapshot, updateDoc
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDCv_7VGRnPbszuajk1dPGfeEa15_nNB1M',
  authDomain: 'equivaldi.firebaseapp.com',
  projectId: 'equivaldi',
  storageBucket: 'equivaldi.firebasestorage.app',
  messagingSenderId: '438472603797',
  appId: '1:438472603797:web:670fef2053cebb0772c39c'
};
const GERANTE = 'celiacourtois8@gmail.com';   // première gérante du carnet
const ROLE_KEY = 'equivaldi:role:v1';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'fr';
let fs;
try { fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { fs = getFirestore(app); }

/* ---------- Adaptateur : la base Firestore sous la forme attendue par le carnet ---------- */
const code = e => ({ 'permission-denied': 'invalid_argument', 'invalid-argument': 'invalid_argument', 'resource-exhausted': 'quota_exceeded', 'unauthenticated': 'revoked' }[e && e.code] || 'unavailable');
const fail = e => { throw { code: code(e), message: e && e.message }; };
const clean = d => JSON.parse(JSON.stringify(d));
const snapDoc = s => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } });
const docApi = r => ({
  id: r.id, path: r.path,
  set: d => setDoc(r, clean(d)).catch(fail),
  delete: () => deleteDoc(r).catch(fail),
  get: () => getDoc(r).then(snapDoc, fail),
  onSnapshot: (next, err) => onSnapshot(r, { includeMetadataChanges: true }, s => next(snapDoc(s)), e => err && err({ code: code(e), message: e.message }))
});
const db = {
  doc: path => docApi(doc(fs, path)),
  collection: c => ({
    path: c,
    doc: id => docApi(id ? doc(fs, c, id) : doc(collection(fs, c))),
    onSnapshot: (next, err) => onSnapshot(collection(fs, c), { includeMetadataChanges: true },
      q => next({ docs: q.docs.map(snapDoc), size: q.size, empty: q.empty, metadata: { fromCache: q.metadata.fromCache, hasPendingWrites: q.metadata.hasPendingWrites } }),
      e => err && err({ code: code(e), message: e.message }))
  })
};

/* ---------- Écran de connexion ---------- */
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
const errTxt = e => MSG[e && e.code] || 'Ça n\'a pas marché. Réessaie dans un instant.';
function show(html, bind) {
  $a().hidden = false;
  document.body.classList.add('lock');
  body().innerHTML = html;
  if (bind) bind(body());
}
function hide() { $a().hidden = true; document.body.classList.remove('lock'); }
const field = (id, label, type, extra = '') => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" ${extra}></label>`;
const errBox = '<p class="err" id="aErr" role="alert" hidden></p>';
const setErr = (root, m) => { const e = root.querySelector('#aErr'); e.textContent = m || ''; e.hidden = !m; };
async function busy(btn, fn) { btn.disabled = true; try { await fn(); } finally { btn.disabled = false; } }

function ecranConnexion() {
  show(`<form class="form" id="aForm" novalidate>
      <h2 class="auth-t">Connexion</h2>
      ${field('aMail', 'Adresse e-mail', 'email', 'autocomplete="email" required')}
      ${field('aPass', 'Mot de passe', 'password', 'autocomplete="current-password" required')}
      ${errBox}
      <button class="btn primary" type="submit">Se connecter</button>
      <div class="auth-links"><button type="button" class="link" id="aNew">Créer un compte</button><button type="button" class="link" id="aLost">Mot de passe oublié</button></div>
    </form>`, root => {
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
      ${field('aNom', 'Prénom', 'text', 'autocomplete="given-name" autocapitalize="words" required')}
      ${field('aMail', 'Adresse e-mail', 'email', 'autocomplete="email" required')}
      ${field('aPass', 'Mot de passe (6 caractères minimum)', 'password', 'autocomplete="new-password" required')}
      <p class="hint">Utilise l'adresse à laquelle tu as été invitée ou invité.</p>
      ${errBox}
      <button class="btn primary" type="submit">Créer mon compte</button>
      <div class="auth-links"><button type="button" class="link" id="aBack">J'ai déjà un compte</button></div>
    </form>`, root => {
    root.querySelector('#aForm').addEventListener('submit', e => {
      e.preventDefault();
      const nom = root.querySelector('#aNom').value.trim();
      if (!nom) { setErr(root, 'Indique ton prénom.'); return; }
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
    root.querySelector('#aOut').addEventListener('click', deconnexion);
  });
}
function ecranPasInvite(u) {
  show(`<div class="form">
      <h2 class="auth-t">Pas encore invité</h2>
      <p>L'adresse <b>${escH(u.email)}</b> n'a pas encore accès au carnet. Demande à la gérante de t'inviter avec cette adresse, puis touche « Réessayer ».</p>
      <button class="btn primary" id="aRetry">Réessayer</button>
      <div class="auth-links"><button type="button" class="link" id="aOut">Se déconnecter</button></div>
    </div>`, root => {
    root.querySelector('#aRetry').addEventListener('click', () => entrer(u));
    root.querySelector('#aOut').addEventListener('click', deconnexion);
  });
}

function ecranSouci(u, e) {
  const regles = e && e.code === 'permission-denied';
  show(`<div class="form">
      <h2 class="auth-t">Accès au carnet impossible</h2>
      <p>${regles ? "La base refuse l'accès : les règles d'accès de Firestore ne sont pas encore à jour. Recolle le fichier firestore.rules dans Firebase, onglet Règles, puis touche « Réessayer »." : "Le carnet n'a pas pu joindre la base. Vérifie ta connexion internet, puis touche « Réessayer »."}</p>
      <p class="hint">Code : ${escH((e && e.code) || 'inconnu')}</p>
      <button class="btn primary" id="aRetry">Réessayer</button>
      <div class="auth-links"><button type="button" class="link" id="aOut">Se déconnecter</button></div>
    </div>`, root => {
    root.querySelector('#aRetry').addEventListener('click', () => entrer(u));
    root.querySelector('#aOut').addEventListener('click', deconnexion);
  });
}

/* ---------- Rôles ---------- */
let ROLE = null, ME = null;
async function entrer(u) {
  const mail = (u.email || '').toLowerCase();
  let role = null, souci = null;
  try { const c = JSON.parse(localStorage.getItem(ROLE_KEY) || 'null'); if (c && c.uid === u.uid) role = c.role; } catch (x) { /* rien en cache */ }
  try {
    const m = await getDoc(doc(fs, 'membres', u.uid)).catch(e => (e && e.code === 'permission-denied') ? null : Promise.reject(e));
    if (m && m.exists()) role = m.data().role;
    else {
      let r = mail === GERANTE ? 'gerante' : null;
      if (!r) {
        const inv = await getDoc(doc(fs, 'invitations', mail)).catch(() => null);
        if (inv && inv.exists()) r = inv.data().role;
      }
      if (r) { await setDoc(doc(fs, 'membres', u.uid), { email: mail, role: r, nom: u.displayName || '', depuis: Date.now() }); role = r; }
      else role = null;
    }
  } catch (e) { souci = e; }
  if (!role && souci) { ecranSouci(u, souci); return; }
  if (!role) { ecranPasInvite(u); return; }
  try { localStorage.setItem(ROLE_KEY, JSON.stringify({ uid: u.uid, role })); } catch (x) { /* ignoré */ }
  ROLE = role;
  ME = u;
  window.EQ.email = mail;
  window.EQ.role = role;
  hide();
  window.claude._resolve('user', {
    me: async () => ({ id: u.uid, name: u.displayName || '', email: mail, isOwner: role === 'gerante', canEdit: role !== 'lecture', avatarUrl: '', color: '' }),
    id: async () => u.uid,
    isOwner: async () => role === 'gerante',
    canEdit: async () => role !== 'lecture',
    can: async n => n === 'data.write' ? role !== 'lecture' : false,
    profiles: async ids => Object.fromEntries([].concat(ids).map(i => [i, { id: i, name: '' }]))
  });
  window.claude._resolve('db', db);
}
async function deconnexion() {
  try { ['carnet-ecurie:cache:v1', 'carnet-ecurie:outbox:v1', ROLE_KEY].forEach(k => localStorage.removeItem(k)); } catch (x) { /* ignoré */ }
  await signOut(auth).catch(() => {});
  location.reload();
}

/* ---------- Équipe (gérante) ---------- */
window.EQ = {
  email: '', role: '',
  deconnexion,
  membres: async () => (await getDocs(collection(fs, 'membres'))).docs.map(d => Object.assign({ uid: d.id, moi: ME && d.id === ME.uid }, d.data())),
  invitations: async () => (await getDocs(collection(fs, 'invitations'))).docs.map(d => Object.assign({ email: d.id }, d.data())),
  inviter: (email, role) => setDoc(doc(fs, 'invitations', email.trim().toLowerCase()), { role, par: ME ? ME.uid : null, le: Date.now() }),
  annulerInvitation: email => deleteDoc(doc(fs, 'invitations', email)),
  changerRole: (uid, role) => updateDoc(doc(fs, 'membres', uid), { role }),
  retirerMembre: uid => deleteDoc(doc(fs, 'membres', uid)),
  lien: () => location.origin + location.pathname
};

onAuthStateChanged(auth, u => {
  if (!u) { ecranConnexion(); return; }
  if (!u.emailVerified) { ecranVerification(u); return; }
  entrer(u);
});

/* ---------- Hors ligne : mise en cache de l'appli ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
