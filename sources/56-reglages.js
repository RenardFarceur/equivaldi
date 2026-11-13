
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
  // propriétaire en pension : son écurie, son compte, les messages, rien des réglages du carnet
  if (estProprio()) return { title: 'Réglages', eyebrow: 'EquiValdi', html: monEcurieHtml() + equipeHtml() + retoursHtml() + aProposHtml(), fab: null };
  const C = cfg(), t = todayISO();
  let fin = `${t.slice(0, 4)}-${C.finSaison}`;
  if (!validISO(fin) || fin <= t) fin = `${+t.slice(0, 4) + 1}-${C.finSaison}`;
  const rap = SOINS.filter(T => T.id !== 'autre').map(T =>
    `<div class="row"><div class="row-main"><div class="row-t">${T.label}</div><div class="row-s">${dureeTxt(C.rappels[T.id])}</div></div>${rinp('r_' + T.id, C.rappels[T.id] || '', 'Intervalle en jours : ' + T.label)}</div>`).join('');
  let html = monEcurieHtml() + adminSection() + rubriquesHtml() + equipeHtml() + crotSection() + section('Rappels de soins', `<div class="list">${rap}</div><p class="note">Nombre de jours entre deux soins. 0 ou vide : pas de rappel. Un soin peut aussi porter sa propre date de rappel. Ces réglages sont communs à toutes les personnes du carnet.</p>`);
  // rubriques masquées : leurs réglages restent dans la page (cachés) pour être enregistrés tels quels
  const P = rub('pres'), cache = on => on ? '' : ' hidden';
  html += section(P ? 'Alertes et prés' : 'Alertes', `<div class="list">
    <div class="row"><div class="row-main"><div class="row-t">Prévenir avant l'échéance</div><div class="row-s">Soins à prévoir sur l'accueil</div></div>${rinp('c_alerte', C.alerte, "Jours d'avance")}</div>
    <div class="row"${cache(P)}><div class="row-main"><div class="row-t">Repos visé d'un pré</div><div class="row-s">Avant d'y remettre des chevaux</div></div>${rinp('c_repos', C.repos, 'Jours de repos visés')}</div>
    <div class="row"${cache(P)}><div class="row-main"><div class="row-t">Pâture maximum</div><div class="row-s">Au-delà, l'accueil propose de changer de pré</div></div>${rinp('c_pat', C.paturage, 'Jours de pâture maximum')}</div>
    <div class="row"${cache(P)}><div class="row-main"><div class="row-t">Surface minimum par cheval</div><div class="row-s">En dessous, l'accueil signale le pré chargé. Vide : pas d'alerte</div></div><input class="rinput" id="c_ha" inputmode="decimal" autocomplete="off" placeholder="0,5" value="${C.haMin ? esc(String(C.haMin).replace('.', ',')) : ''}" aria-label="Surface minimum par cheval, en hectares"><span class="muted small">ha</span></div>
  </div>${P ? '<p class="note">Chaque pré peut avoir ses propres durées dans sa fiche.</p>' : ''}`);
  const foin = section('Foin', `<div class="list" id="balles">${C.balles.map(balleRow).join('')}</div>
    <button type="button" class="link" data-act="add-balle" style="align-self:flex-start">${ic('plus', 'sm')}Ajouter un type de balle</button>
    <div class="list"><div class="row"><div class="row-main"><div class="row-t">Fin de saison du foin</div><div class="row-s">Date de mise à l'herbe, pour calculer le besoin</div></div><input class="rinput" type="date" id="c_fin" value="${fin}" style="width:auto" aria-label="Fin de saison du foin"></div></div>`);
  html += rub('foin') ? foin : `<div hidden>${foin}</div>`;
  html += section('À imprimer, à exporter', `<div class="list"><button type="button" class="row" data-act="etiquettes" data-genre="box">${lead('qr')}<div class="row-main"><div class="row-t">Fiches de box et étiquettes des prés</div><div class="row-s">Ration, à savoir et QR code qui ouvre la fiche dans l'appli</div></div><span class="row-end">${ic('next', 'sm')}</span></button>
    <button type="button" class="row" data-act="agenda-ics">${lead('cal')}<div class="row-main"><div class="row-t">Agenda du téléphone</div><div class="row-s">Rendez-vous, rappels et échéances, avec une alarme</div></div><span class="row-end">${ic('next', 'sm')}</span></button></div>`);
  html += `<button type="button" class="btn primary" data-act="save-cfg">${ic('check', 'sm')}Enregistrer les réglages</button>`;
  const gerant = me.owner !== false && !sync.readOnly;
  html += section('Sauvegarde', `<div class="btnrow"><button type="button" class="btn" data-act="export">${ic('download', 'sm')}Exporter</button>${gerant ? `<label class="btn" for="imp">${ic('upload', 'sm')}Restaurer</label><input type="file" id="imp" class="vh" accept=".json,application/json">` : ''}</div>
    <p class="note">${esc(syncText())} L'export crée un fichier de sauvegarde complet, utile avant de changer de téléphone.</p>`);
  const nEx = exCount();
  if (gerant) html += section('Données', `<div class="btnrow">${nEx ? `<button type="button" class="btn" data-act="clear-ex" data-confirm="Confirmer">Effacer les ${nEx} exemples</button>` : ''}<button type="button" class="btn danger" data-act="wipe" data-confirm="Vraiment tout effacer ?">${ic('trash', 'sm')}Tout effacer</button></div>
    <p class="note">Efface les données pour toutes les personnes qui partagent le carnet.</p>`);
  html += retoursHtml() + aProposHtml();
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
  const rawHa = val('c_ha'), haMin = rawHa === '' ? 0 : parseNum(rawHa);
  if (haMin == null || haMin < 0 || haMin > 20) { toast('La surface minimum par cheval se donne en hectares, par exemple 0,5.', { danger: true }); return; }
  const balles = $$('#balles [data-bid]').map(r => ({ id: r.dataset.bid, nom: $('.b-nom', r).value.trim(), poids: parseNum($('.b-poids', r).value) }));
  if (!balles.length) { toast('Garde au moins un type de balle.', { danger: true }); return; }
  if (balles.some(b => !b.nom || !(b.poids > 0))) { toast("Chaque type de balle a besoin d'un nom et d'un poids.", { danger: true }); return; }
  const fs = val('c_fin');
  // les autres réglages communs (contacts utiles…) sont gardés tels quels
  putCfg(Object.assign({}, S.cfg || {}, { rappels, alerte: Math.round(alerte), repos: Math.round(repos), paturage: Math.round(paturage), haMin, balles, finSaison: validISO(fs) ? fs.slice(5) : C.finSaison }));
  toast('Réglages enregistrés');
};
ACT.export = async () => {
  // la carte des prés voyage avec (sans l'image du plan, rangée à part)
  const data = { app: 'carnet-ecurie', version: 1, exporte: new Date().toISOString(), cfg: S.cfg,
    carte: S.carte && (S.carte.plan || S.carte.trace) ? { plan: S.carte.plan || null, trace: S.carte.trace || null } : null };
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
  const lab = { chevaux: 'chevaux', soins: 'soins', pres: 'prés', places: 'séjours au pré', entretiens: 'entretiens', foin: 'mouvements de foin', concours: 'concours', seances: 'séances de travail', taches: 'tâches', stocks: 'articles et mouvements de stock', consignes: 'consignes', messages: 'messages' };
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
  if (d.carte && typeof d.carte === 'object') {
    const plan = nettoiePlan(d.carte.plan);
    if (plan) putCarte({ plan, trace: nettoieTrace(d.carte.trace), publie: Date.now() });
  }
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

