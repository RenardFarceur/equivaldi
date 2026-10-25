
/* ---------- Réglages, sauvegarde ---------- */
function dureeTxt(n) {
  if (!n) return 'Pas de rappel automatique';
  if (n % 365 === 0) return n === 365 ? 'Tous les ans' : `Tous les ${n / 365} ans`;
  if (n % 7 === 0 && n < 120) return `Toutes les ${n / 7} semaines`;
  const m = Math.round(n / 30.4);
  return m <= 1 ? `Tous les ${n} jours` : `Environ tous les ${m} mois`;
}
const rinp = (id, v, aria) => `<input class="rinput" id="${id}" inputmode="numeric" autocomplete="off" value="${esc(v ?? '')}" aria-label="${esc(aria)}"><span class="muted small">j</span>`;
const balleRow = b => `<div class="row" data-bid="${esc(b.id)}"><input class="rinput b-nom" style="flex:1;width:auto;text-align:left" value="${esc(b.nom)}" aria-label="Nom du type de balle" autocomplete="off"><input class="rinput b-poids" inputmode="decimal" value="${esc(b.poids)}" aria-label="Poids moyen en kg" autocomplete="off"><span class="muted small">kg</span><button type="button" class="iconbtn" data-act="del-balle" aria-label="Retirer ce type">${ic('trash', 'sm')}</button></div>`;

VIEWS.reglages = () => {
  const C = cfg(), t = todayISO();
  let fin = `${t.slice(0, 4)}-${C.finSaison}`;
  if (!validISO(fin) || fin <= t) fin = `${+t.slice(0, 4) + 1}-${C.finSaison}`;
  const rap = SOINS.filter(T => T.id !== 'autre').map(T =>
    `<div class="row"><div class="row-main"><div class="row-t">${T.label}</div><div class="row-s">${dureeTxt(C.rappels[T.id])}</div></div>${rinp('r_' + T.id, C.rappels[T.id] || '', 'Intervalle en jours : ' + T.label)}</div>`).join('');
  let html = equipeHtml() + section('Crottins', `${segCtl('crotAnim', [['grand', 'Grande animation'], ['discret', 'Discrète']], ui.crotAnim === 'discret' ? 'discret' : 'grand')}
    <p class="note">Ce que montre l'appli quand tu gagnes des crottins, sur ce téléphone.</p>
    <button type="button" class="link" data-act="boutique" style="align-self:flex-start">${crottinSvg('s')}Ouvrir la boutique</button>`) + section('Rappels de soins', `<div class="list">${rap}</div><p class="note">Nombre de jours entre deux soins. 0 ou vide : pas de rappel. Un soin peut aussi porter sa propre date de rappel. Ces réglages sont communs à toutes les personnes du carnet.</p>`);
  html += section('Alertes et prés', `<div class="list">
    <div class="row"><div class="row-main"><div class="row-t">Prévenir avant l'échéance</div><div class="row-s">Soins à prévoir sur l'accueil</div></div>${rinp('c_alerte', C.alerte, "Jours d'avance")}</div>
    <div class="row"><div class="row-main"><div class="row-t">Repos visé d'un pré</div><div class="row-s">Avant d'y remettre des chevaux</div></div>${rinp('c_repos', C.repos, 'Jours de repos visés')}</div>
    <div class="row"><div class="row-main"><div class="row-t">Pâture maximum</div><div class="row-s">Au-delà, l'accueil propose de changer de pré</div></div>${rinp('c_pat', C.paturage, 'Jours de pâture maximum')}</div>
  </div><p class="note">Chaque pré peut avoir ses propres durées dans sa fiche.</p>`);
  html += section('Foin', `<div class="list" id="balles">${C.balles.map(balleRow).join('')}</div>
    <button type="button" class="link" data-act="add-balle" style="align-self:flex-start">${ic('plus', 'sm')}Ajouter un type de balle</button>
    <div class="list"><div class="row"><div class="row-main"><div class="row-t">Fin de saison du foin</div><div class="row-s">Date de mise à l'herbe, pour calculer le besoin</div></div><input class="rinput" type="date" id="c_fin" value="${fin}" style="width:auto" aria-label="Fin de saison du foin"></div></div>`);
  html += `<button type="button" class="btn primary" data-act="save-cfg">${ic('check', 'sm')}Enregistrer les réglages</button>`;
  const gerant = me.owner !== false && !sync.readOnly;
  html += section('Sauvegarde', `<div class="btnrow"><button type="button" class="btn" data-act="export">${ic('download', 'sm')}Exporter</button>${gerant ? `<label class="btn" for="imp">${ic('upload', 'sm')}Restaurer</label><input type="file" id="imp" class="vh" accept=".json,application/json">` : ''}</div>
    <p class="note">${esc(syncText())} L'export crée un fichier de sauvegarde complet, utile avant de changer de téléphone.</p>`);
  const nEx = exCount();
  if (gerant) html += section('Données', `<div class="btnrow">${nEx ? `<button type="button" class="btn" data-act="clear-ex" data-confirm="Confirmer">Effacer les ${nEx} exemples</button>` : ''}<button type="button" class="btn danger" data-act="wipe" data-confirm="Vraiment tout effacer ?">${ic('trash', 'sm')}Tout effacer</button></div>
    <p class="note">Efface les données pour toutes les personnes qui partagent le carnet.</p>`);
  html += `<div class="about">${brandLogo()}</div>`;
  return { title: 'Réglages', eyebrow: 'EquiValdi', html, fab: null };
};
ACT['add-balle'] = () => {
  const box = $('#balles');
  if (box) box.insertAdjacentHTML('beforeend', balleRow({ id: 'b' + uid().slice(-6), nom: '', poids: '' }));
  const last = box && box.lastElementChild;
  if (last) $('.b-nom', last).focus();
};
ACT['del-balle'] = (d, el) => {
  const row = el.closest('[data-bid]');
  if (!row) return;
  if (list('foin').some(m => m.balle === row.dataset.bid)) { toast('Ce type sert déjà dans des mouvements : renomme-le plutôt.', { danger: true }); return; }
  row.remove();
};
ACT['save-cfg'] = () => {
  const C = cfg(), rappels = { autre: 0 };
  for (const T of SOINS) {
    if (T.id === 'autre') continue;
    const raw = val('r_' + T.id), n = raw === '' ? 0 : parseNum(raw);
    if (n == null || n < 0 || !Number.isInteger(n)) { toast(`Intervalle à corriger : ${T.label}.`, { danger: true }); return; }
    rappels[T.id] = n;
  }
  const alerte = parseNum(val('c_alerte')), repos = parseNum(val('c_repos')), paturage = parseNum(val('c_pat'));
  if (!(alerte >= 0) || !(repos >= 1) || !(paturage >= 1)) { toast('Vérifie les nombres de jours des alertes et des prés.', { danger: true }); return; }
  const balles = $$('#balles [data-bid]').map(r => ({ id: r.dataset.bid, nom: $('.b-nom', r).value.trim(), poids: parseNum($('.b-poids', r).value) }));
  if (!balles.length) { toast('Garde au moins un type de balle.', { danger: true }); return; }
  if (balles.some(b => !b.nom || !(b.poids > 0))) { toast("Chaque type de balle a besoin d'un nom et d'un poids.", { danger: true }); return; }
  const fs = val('c_fin');
  // les autres réglages communs (contacts utiles…) sont gardés tels quels
  putCfg(Object.assign({}, S.cfg || {}, { rappels, alerte: Math.round(alerte), repos: Math.round(repos), paturage: Math.round(paturage), balles, finSaison: validISO(fs) ? fs.slice(5) : C.finSaison }));
  toast('Réglages enregistrés');
};
ACT.export = async () => {
  const data = { app: 'carnet-ecurie', version: 1, exporte: new Date().toISOString(), cfg: S.cfg };
  COLS.forEach(k => { data[k] = list(k); });
  const json = JSON.stringify(data, null, 1);
  let dl = null;
  try { dl = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename: `carnet-ecurie-${todayISO()}.json`, data: json }); toast('Sauvegarde enregistrée'); return; }
    catch (e) { if (e && (e.code === 'declined' || e.code === 'rate_limited')) return; }
  }
  openSheet('Sauvegarde', `<p class="note">Copie ce texte et garde-le dans une note ou un e-mail : il permet de tout restaurer.</p><textarea class="code" id="exp" readonly>${esc(json)}</textarea><button type="button" class="btn primary" data-act="copy-exp">${ic('copy', 'sm')}Copier</button>`);
};
ACT['copy-exp'] = () => {
  const ta = $('#exp');
  if (!ta) return;
  const fallback = () => { ta.focus(); ta.select(); toast('Texte sélectionné : copie-le depuis le menu du téléphone.'); };
  try { navigator.clipboard.writeText(ta.value).then(() => toast('Sauvegarde copiée'), fallback); } catch (e) { fallback(); }
};
document.addEventListener('change', e => {
  if (!e.target || e.target.id !== 'imp') return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let d = null;
    try { d = JSON.parse(r.result); } catch (err) { d = null; }
    if (!d || d.app !== 'carnet-ecurie') { toast("Ce fichier n'est pas une sauvegarde du carnet d'écurie.", { danger: true }); return; }
    confirmImport(d);
  };
  r.readAsText(file);
  e.target.value = '';
});
function confirmImport(d) {
  const lab = { chevaux: 'chevaux', soins: 'soins', pres: 'prés', places: 'séjours au pré', entretiens: 'entretiens', foin: 'mouvements de foin', concours: 'concours', seances: 'séances de travail', taches: 'tâches' };
  const rows = COLS.map(k => `<div class="row"><div class="row-main"><div class="row-t">${Array.isArray(d[k]) ? d[k].length : 0} ${lab[k]}</div></div></div>`).join('');
  openSheet('Restaurer la sauvegarde', `<p class="note">Sauvegarde du ${d.exporte ? dFull(String(d.exporte).slice(0, 10)) : 'jour inconnu'} :</p><div class="list">${rows}</div><p class="note">Tes données actuelles seront remplacées par celles du fichier.</p>`, {
    submit: 'Remplacer mes données', onSubmit: () => doImport(d)
  });
}
function doImport(d) {
  const okId = o => o && typeof o === 'object' && typeof o.id === 'string' && /^[A-Za-z0-9_\-~:@+]{1,100}$/.test(o.id);
  restauration = true;
  try {
    COLS.forEach(k => {
      const incoming = (Array.isArray(d[k]) ? d[k] : []).filter(okId);
      const keep = new Set(incoming.map(o => o.id));
      list(k).forEach(o => { if (!keep.has(o.id)) del(k, o.id); });
      incoming.forEach(o => put(k, o));
    });
  } finally { restauration = false; }
  if (d.cfg && typeof d.cfg === 'object') putCfg(d.cfg);
  nav.stack = [];
  render();
  toast('Sauvegarde restaurée');
}
ACT.wipe = () => {
  crotSilence = true;
  COLS.forEach(k => list(k).forEach(o => del(k, o.id)));
  crotSilence = false;
  nav.stack = [];
  nav.tab = 'accueil';
  render();
  toast('Toutes les données ont été effacées');
};

/* ---------- Gérer à plusieurs ---------- */
function equipeHtml() {
  if (window.EQ_MODE && window.EQ) return section('Ton compte', `<div class="card">
    <div class="row-main"><div class="row-t">${esc(EQ.email)}</div><div class="row-s">${esc(ROLE_LABEL[EQ.role] || '')}</div></div>
    ${fld('Ton prénom', inp('f_moi', moiNom(), 'autocomplete="given-name" autocapitalize="words"'), "Affiché dans l'équipe et à côté des tâches que tu coches.")}
    <div class="btnrow">
      <button type="button" class="btn small" data-act="save-moi">${ic('check', 'sm')}Enregistrer le prénom</button>
      <button type="button" class="btn small" data-act="ma-fiche">${ic('user', 'sm')}Ma fiche</button>
      ${EQ.role === 'gerante' ? `<button type="button" class="btn small" data-act="equipe">${ic('users', 'sm')}Gérer l'équipe</button>` : ''}
      <button type="button" class="btn small" data-act="deconnexion">Se déconnecter</button>
    </div>
  </div>`);
  return section('Gérer à plusieurs', `<div class="card">
    <p class="note" style="color:var(--ink)">Pour partager le carnet : depuis un ordinateur, ouvre cette page sur claude.ai, clique sur <b>Partager</b>, invite chaque personne par e-mail et choisis <b>Peut modifier</b>. Chacun se connecte avec son compte Claude et voit les mêmes données, en direct.</p>
    <p class="note">N'active pas « Toute personne ayant le lien » : les invités ne pourraient plus que consulter.</p>
    ${fld('Ton prénom', inp('f_moi', getMoi() || me.platformName || '', 'autocomplete="given-name" autocapitalize="words"'), 'Affiché à côté des tâches que tu coches. Il reste sur ce téléphone.')}
    <button type="button" class="btn small" data-act="save-moi" style="align-self:flex-start">${ic('check', 'sm')}Enregistrer le prénom</button>
  </div>`);
}
/* Équipe de la version installable : invitations par adresse e-mail et rôles */
ACT.deconnexion = () => { if (window.EQ) EQ.deconnexion(); };
ACT.equipe = () => equipeSheet();
async function equipeSheet(msg = '') {
  if (!window.EQ) return;
  let mb = [], inv = [];
  try { [mb, inv] = await Promise.all([EQ.membres(), EQ.invitations()]); }
  catch (e) { toast("Impossible de charger l'équipe : vérifie ta connexion.", { danger: true }); return; }
  // une invitation dont la personne a déjà créé son compte est terminée : on la retire
  const inscrits = new Set(mb.map(m => String(m.email || '').toLowerCase()));
  const faites = inv.filter(i => inscrits.has(String(i.email).toLowerCase()));
  inv = inv.filter(i => !inscrits.has(String(i.email).toLowerCase()));
  if (faites.length) Promise.all(faites.map(i => EQ.annulerInvitation(i.email))).catch(() => { /* réessayé à la prochaine ouverture */ });
  const lien = EQ.lien();
  const membres = mb.sort((a, b) => (a.role === 'gerante' ? -1 : 0) - (b.role === 'gerante' ? -1 : 0)).map(m => `<div class="row"><div class="row-main">
      <div class="row-t">${esc(m.nom || m.email)}${m.moi ? ' <span class="pill ok">Toi</span>' : ''}</div><div class="row-s">${esc(m.email)} · ${esc(ROLE_LABEL[m.role] || m.role)}</div>
      ${m.role === 'gerante' ? '' : `<div class="wrap" style="margin-top:6px"><button type="button" class="btn small" data-act="eq-role" data-uid="${esc(m.uid)}" data-role="${m.role === 'lecture' ? 'equipe' : 'lecture'}">${m.role === 'lecture' ? 'Passer en « Peut modifier »' : 'Passer en lecture seule'}</button><button type="button" class="btn small danger" data-act="eq-del" data-uid="${esc(m.uid)}" data-confirm="Confirmer le retrait">Retirer</button></div>`}
    </div></div>`).join('');
  const invites = inv.map(i => `<div class="row"><div class="row-main"><div class="row-t">${esc(i.email)}</div><div class="row-s">Invitation en attente · ${esc(ROLE_LABEL[i.role] || i.role)}</div></div><button type="button" class="btn small" data-act="eq-inv-del" data-mail="${esc(i.email)}">Annuler</button></div>`).join('');
  openSheet("L'équipe", `
    ${msg ? `<div class="box ok"><div class="issue ok">${ic('check', 'sm')}<span>${esc(msg)}</span></div></div>` : ''}
    ${grp('Membres', `<div class="list">${membres || '<div class="row"><div class="row-s">Aucun membre</div></div>'}</div>`)}
    ${inv.length ? grp('Invitations en attente', `<div class="list">${invites}</div>`) : ''}
    ${fld('Inviter une adresse e-mail', inp('f_inv', '', 'type="email" autocomplete="off" placeholder="prenom@exemple.fr"'))}
    ${grp('Droits', chips('invrole', [{ v: 'equipe', l: 'Peut modifier' }, { v: 'lecture', l: 'Lecture seule' }], 'equipe'))}
    <div class="box"><p class="note" style="color:var(--ink)">Envoie ensuite le lien de l'appli à la personne. Elle crée son compte avec cette adresse e-mail.</p><p class="note" style="overflow-wrap:anywhere"><b>${esc(lien)}</b></p><button type="button" class="btn small" data-act="eq-copy">${ic('copy', 'sm')}Copier le lien</button></div>`, {
    submit: 'Inviter',
    onSubmit: f => {
      const mail = val('f_inv').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return 'Indique une adresse e-mail valide.';
      EQ.inviter(mail, chipVal(f, 'invrole') || 'equipe')
        .then(() => equipeSheet(`${mail} est invité. Envoie-lui le lien de l'appli.`))
        .catch(() => toast("L'invitation n'a pas pu être enregistrée.", { danger: true }));
      return false;
    }
  });
}
const eqDo = (p, ok) => p.then(() => equipeSheet(ok)).catch(() => toast("La modification n'a pas pu être enregistrée.", { danger: true }));
ACT['eq-role'] = d => eqDo(EQ.changerRole(d.uid, d.role), 'Droits modifiés.');
ACT['eq-del'] = d => eqDo(EQ.retirerMembre(d.uid), 'Personne retirée du carnet.');
ACT['eq-inv-del'] = d => eqDo(EQ.annulerInvitation(d.mail), 'Invitation annulée.');
ACT['eq-copy'] = () => {
  const txt = `Rejoins le carnet d'écurie EquiValdi : ${EQ.lien()}`;
  try { navigator.clipboard.writeText(txt).then(() => toast('Lien copié'), () => toast(txt)); } catch (e) { toast(txt); }
};
ACT['save-moi'] = () => {
  const v = val('f_moi').replace(/\s+/g, ' ').slice(0, 40);
  if (!v) { toast('Indique ton prénom.'); return; }
  setMoi(v);
  // version installable : le prénom de la fiche d'équipe suit, sur tous les téléphones
  const m = me.uid ? get('membres', me.uid) : null;
  if (m && m.role && m.nom !== v) put('membres', Object.assign({}, m, { nom: v }));
  toast('Prénom enregistré');
};
