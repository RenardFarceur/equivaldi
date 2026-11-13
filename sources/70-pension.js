
/* ---------- Pension : propriétaires et relevés mensuels (version installable) ----------
   Un propriétaire (rôle « Propriétaire ») ne lit pas le carnet de l'écurie : l'équipe tient pour chacun de
   ses chevaux une fiche partagée (partages/{cheval} : la fiche, les soins, séances, concours, où il est), et
   la gérante lui envoie un relevé par mois (releves/{proprio}_{mois} : pension et frais avancés).
   Côté propriétaire, l'appli se réduit à l'accueil de ses chevaux, leurs fiches et ses relevés. */
const estProprio = () => !!(window.EQ_MODE && window.EQ && EQ.role === 'proprio' && !(ecurieOuverte() || {}).fantome);
ROLE_LABEL.proprio = 'Propriétaire';
ROLE_ORD.proprio = 3;
const pensionDe = h => (h && h.pension && Number(h.pension.montant) > 0) ? { montant: Number(h.pension.montant), depuis: validISO(h.pension.depuis) ? h.pension.depuis : null } : null;

/* ----- Fiches partagées : écrites par l'équipe dès que le carnet change ----- */
const peutPartager = () => !!(window.EQ_MODE && window.EQ && typeof EQ.ecrirePartage === 'function' && !estExemple() && !sync.readOnly
  && sync.mode === 'cloud' && ecurieOuverte() && (['gerante', 'equipe'].includes(EQ.role) || ecurieOuverte().fantome) && offrePro());
// sérialisation stable (clés triées) : deux téléphones de l'équipe calculent la même empreinte
const stable = v => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
  : JSON.stringify(v === undefined ? null : v);
const sigPartage = d => { const o = Object.assign({}, d); delete o.maj; delete o.id; return stable(JSON.parse(JSON.stringify(o))); };
function partageDe(h) {
  const pl = list('places').filter(p => p.horseId === h.id).sort((a, b) => String(b.debut || '').localeCompare(String(a.debut || ''))).slice(0, 12);
  const ids = new Set(pl.map(p => p.preId)), C = S.cfg || {};
  const garde = ['rappels', 'alerte', 'repos', 'paturage', 'rubriques'].reduce((o, k) => { if (C[k] !== undefined) o[k] = C[k]; return o; }, {});
  return {
    proprio: h.propUid, cheval: h.id,
    cfg: Object.assign(garde, { crottins: false }),
    donnees: {
      chevaux: [h],
      soins: list('soins').filter(s => s.horseId === h.id),
      seances: list('seances').filter(s => s.horseId === h.id).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 150),
      concours: list('concours').filter(x => x.horseId === h.id),
      places: pl,
      pres: list('pres').filter(p => ids.has(p.id)).map(p => ({ id: p.id, nom: p.nom || '', type: p.type || 'pre', surface: p.surface || null }))
    }
  };
}
let partT = null, partEtat = null, partEnCours = false;
function partagesBientot() { if (!peutPartager()) return; clearTimeout(partT); partT = setTimeout(majPartages, 2500); }
async function majPartages() {
  if (!peutPartager() || partEnCours) return;
  partEnCours = true;
  try {
    const proprios = new Set(membres().filter(m => m.role === 'proprio').map(m => m.id));
    if (!partEtat) {
      const l = await EQ.partages();
      partEtat = {};
      l.forEach(d => { partEtat[d.id] = sigPartage(d); });
    }
    const voulu = {};
    chevaux(true).forEach(h => { if (h.propUid && proprios.has(h.propUid)) voulu[h.id] = partageDe(h); });
    for (const [hid, d] of Object.entries(voulu)) {
      const sg = sigPartage(d);
      if (partEtat[hid] !== sg) { await EQ.ecrirePartage(hid, Object.assign({}, d, { maj: Date.now() })); partEtat[hid] = sg; }
    }
    for (const hid of Object.keys(partEtat)) if (!voulu[hid]) { await EQ.effacerPartage(hid); delete partEtat[hid]; }
  } catch (e) { partEtat = null; /* hors ligne ou règles pas à jour : on réessaiera au prochain changement */ }
  finally { partEnCours = false; }
}

/* ----- Relevés : pension du mois et frais avancés par l'écurie ----- */
const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const moisDe = iso => String(iso || todayISO()).slice(0, 7);
const moisTxt = m => { const [y, n] = String(m).split('-').map(Number); return `${MOIS_NOMS[(n || 1) - 1]} ${y}`; };
const moisDecale = (m, d) => { const [y, n] = m.split('-').map(Number), t = new Date(Date.UTC(y, n - 1 + d, 1)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`; };
const finMois = m => { const [y, n] = m.split('-').map(Number); return `${m}-${String(new Date(Date.UTC(y, n, 0)).getUTCDate()).padStart(2, '0')}`; };
const cleProprio = r => r.uid ? r.uid : 'n-' + String(r.nom || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const idReleve = (cle, m) => `${cle}_${m}`;
/* Les propriétaires à qui l'écurie envoie un relevé : ceux d'un cheval en pension (montant indiqué) */
function proprietairesPension() {
  const out = new Map();
  chevaux(true).forEach(h => {
    const r = propRef(h);
    if (!r || !pensionDe(h)) return;
    const m = refMembre(r), cle = cleProprio(m ? { uid: m.id } : r);
    if (m && m.role === 'gerante') return;   // ses propres chevaux : pas de relevé
    if (!out.has(cle)) out.set(cle, { cle, uid: m ? m.id : null, nom: m ? mNom(m) : nomDe(r), membre: m || null, chevaux: [] });
    out.get(cle).chevaux.push(h);
  });
  return [...out.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
function lignesCalculees(P, m) {
  const deb = `${m}-01`, fin = finMois(m), hs = new Set(P.chevaux.map(h => h.id)), L = [];
  const avance = p => p && (p.uid || p.nom) && !(P.uid ? p.uid === P.uid : !p.uid && String(p.nom || '').trim().toLowerCase() === P.nom.toLowerCase());
  const dans = d => validISO(d) && d >= deb && d <= fin;
  P.chevaux.forEach(h => {
    const pe = pensionDe(h);
    if (pe && (!pe.depuis || pe.depuis <= fin)) L.push({ id: 'p-' + h.id, date: deb, libelle: `Pension ${/^[aeiouyhâàéèêëîïôöûü]/i.test(h.nom) ? "d'" : 'de '}${h.nom}`, montant: pe.montant, type: 'pension' });
  });
  list('soins').filter(s => hs.has(s.horseId) && s.statut !== 'prevu' && dans(s.date) && Number(s.cout) > 0 && avance(s.payePar))
    .forEach(s => L.push({ id: 's-' + s.id, date: s.date, libelle: `${soinLabel(s)} · ${hNom(s.horseId)}${s.praticien ? ' (' + s.praticien + ')' : ''}`, montant: Number(s.cout), type: 'soin', avance: nomDe(s.payePar) }));
  list('concours').filter(c => hs.has(c.horseId) && c.statut !== 'forfait' && dans(c.date) && Number(c.frais) > 0 && avance(c.payePar))
    .forEach(c => L.push({ id: 'c-' + c.id, date: c.date, libelle: `Engagement ${c.lieu || c.discipline || 'concours'} · ${hNom(c.horseId)}`, montant: Number(c.frais), type: 'concours', avance: nomDe(c.payePar) }));
  list('seances').filter(s => hs.has(s.horseId) && s.statut !== 'prevu' && dans(s.date) && Number(s.cout) > 0 && avance(s.payePar))
    .forEach(s => L.push({ id: 'e-' + s.id, date: s.date, libelle: `${s.type || 'Cours'}${s.coach ? ' avec ' + s.coach : ''} · ${hNom(s.horseId)}`, montant: Number(s.cout), type: 'cours', avance: nomDe(s.payePar) }));
  return L.sort((a, b) => (a.type === 'pension' ? -1 : 0) - (b.type === 'pension' ? -1 : 0) || a.date.localeCompare(b.date));
}
/* Brouillon de la gérante (lignes écartées, lignes ajoutées), gardé sur son téléphone jusqu'à l'envoi */
const brouillon = (cle, m) => (ui.releves && ui.releves[idReleve(cle, m)]) || { exclus: [], extras: [] };
function majBrouillon(cle, m, f) {
  const b = brouillon(cle, m), n = f({ exclus: [...(b.exclus || [])], extras: [...(b.extras || [])] });
  ui.releves = Object.assign({}, ui.releves, { [idReleve(cle, m)]: n });
  saveUi();
}
function releveDe(P, m) {
  const b = brouillon(P.cle, m), ex = new Set(b.exclus || []);
  const calc = lignesCalculees(P, m), extras = (b.extras || []).map(x => Object.assign({ type: 'autre' }, x));
  const lignes = [...calc, ...extras].map(l => Object.assign({}, l, { exclu: ex.has(l.id) }));
  const total = Math.round(lignes.filter(l => !l.exclu).reduce((s, l) => s + (Number(l.montant) || 0), 0) * 100) / 100;
  return { lignes, total };
}
let REL = null, relEnCours = null;   // relevés déjà envoyés (lus en ligne)
function chargerReleves(forcer = false) {
  if (!window.EQ_MODE || !window.EQ || estExemple() || (!forcer && (REL || relEnCours))) return relEnCours;
  relEnCours = EQ.releves().then(l => { REL = l; }, () => { REL = REL || []; }).then(() => { relEnCours = null; rerenderSoon(); });
  return relEnCours;
}
const releveEnvoye = (cle, m) => (REL || []).find(r => r.id === idReleve(cle, m)) || null;
const sigLignes = l => stable(l.filter(x => !x.exclu).map(x => [x.id, x.libelle, Number(x.montant)]));
function statutPill(env, R) {
  if (!env) return '<span class="pill">À envoyer</span>';
  if (env.statut === 'regle') return '<span class="pill ok">Réglé</span>';
  if (R && sigLignes(R.lignes) !== sigLignes(env.lignes || [])) return '<span class="pill warn">Modifié</span>';
  return '<span class="pill info">Envoyé</span>';
}

/* Onglet Équipe › Pension (gérante et équipe) */
function pensionSection() {
  if (estProprio()) return '';
  const ps = proprietairesPension();
  if (!ps.length) return '';
  if (!offrePro()) return section('Pension', `<div class="verrou-ligne">${verrouHtml('pension')}</div>`);
  if (window.EQ_MODE && !REL) chargerReleves();
  const m = /^\d{4}-\d{2}$/.test(ui.relMois || '') ? ui.relMois : moisDe();
  const rows = ps.map(P => {
    const R = releveDe(P, m), env = releveEnvoye(P.cle, m);
    return `<button type="button" class="row" data-act="releve" data-cle="${esc(P.cle)}" data-m="${m}">${pav(P.uid ? { uid: P.uid, nom: P.nom } : { nom: P.nom })}<div class="row-main"><div class="row-t">${esc(P.nom)}</div><div class="row-s">${esc(P.chevaux.map(h => h.nom).join(', '))}${P.membre ? '' : ' · sans compte'}</div></div>
      <span class="row-end rel-fin"><b>${eur(R.total)}</b>${statutPill(env, R)}</span></button>`;
  }).join('');
  return section(`Pension · ${moisTxt(m)}`, `<div class="wrap rel-mois">${[-1, 0].map(d => { const x = moisDecale(moisDe(), d); return `<button type="button" class="btn small${x === m ? ' primary' : ''}" data-act="rel-mois" data-m="${x}">${moisTxt(x)}</button>`; }).join('')}</div>
    <div class="list">${rows}</div><p class="note">La pension se règle dans la fiche du cheval (Propriété). Les soins, cours et engagements payés par l'écurie s'ajoutent d'eux-mêmes.</p>`);
}
ACT['rel-mois'] = d => { ui.relMois = d.m; saveUi(); render(); };
ACT.releve = d => push('releve', { cle: d.cle, m: d.m });

VIEWS.releve = p => {
  const P = proprietairesPension().find(x => x.cle === p.cle), m = p.m || moisDe();
  if (!P) return { title: 'Relevé', html: emptyH('Plus de pension', "Ce propriétaire n'a plus de cheval en pension."), back: true };
  const R = releveDe(P, m), env = releveEnvoye(P.cle, m), g = window.EQ_MODE ? estGerante() : me.owner !== false;
  const lignes = R.lignes.map(l => `<div class="row rel-l${l.exclu ? ' exclu' : ''}">
      ${g && !(env && env.statut === 'regle') ? `<button type="button" class="rel-tog" role="switch" aria-checked="${!l.exclu}" aria-label="Compter cette ligne" data-act="rel-tog" data-cle="${esc(P.cle)}" data-m="${m}" data-id="${esc(l.id)}"><i></i></button>` : ''}
      <div class="row-main"><div class="row-t">${esc(l.libelle)}</div><div class="row-s">${esc([l.type === 'pension' ? moisTxt(m) : dShort(l.date), l.avance ? 'avancé par ' + l.avance : l.type === 'autre' ? 'ajouté à la main' : ''].filter(Boolean).join(' · '))}</div></div>
      <b class="rel-mt">${eur(l.montant)}</b>${l.type === 'autre' && g ? `<button type="button" class="iconbtn" data-act="rel-del" data-cle="${esc(P.cle)}" data-m="${m}" data-id="${esc(l.id)}" aria-label="Retirer cette ligne">${ic('trash', 'sm')}</button>` : ''}</div>`).join('');
  const etat = env ? `<p class="note">${env.statut === 'regle' ? `Réglé le ${dShort(isoOf(new Date(env.regleLe || env.envoyeLe)))}` : `Envoyé le ${dShort(isoOf(new Date(env.envoyeLe)))}${sigLignes(R.lignes) !== sigLignes(env.lignes || []) ? ` (${eur(env.total)}) : des lignes ont changé depuis, renvoie-le` : ''}`}.</p>` : '';
  const actions = g ? `<div class="btnrow">
      ${P.uid && !(env && env.statut === 'regle') ? `<button type="button" class="btn primary" data-act="rel-envoyer" data-cle="${esc(P.cle)}" data-m="${m}">${ic('partage', 'sm')}${env ? 'Renvoyer' : 'Envoyer'} à ${esc(P.nom)}</button>` : ''}
      <button type="button" class="btn" data-act="rel-copier" data-cle="${esc(P.cle)}" data-m="${m}">${ic('copy', 'sm')}Copier le texte</button>
      <button type="button" class="btn" data-act="rel-pdf" data-cle="${esc(P.cle)}" data-m="${m}">${ic('download', 'sm')}PDF</button>
      ${env && env.statut === 'regle' ? `<button type="button" class="btn" data-act="rel-regle" data-cle="${esc(P.cle)}" data-m="${m}" data-s="envoye">Pas encore réglé</button>` : `<button type="button" class="btn" data-act="rel-regle" data-cle="${esc(P.cle)}" data-m="${m}" data-s="regle">${ic('check', 'sm')}Marquer réglé</button>`}
    </div>` : '';
  return {
    title: `Relevé · ${P.nom}`, back: true,
    html: `<div class="wrap rel-mois">${[-1, 0, 1].map(d => { const x = moisDecale(m, d); return x > moisDe() ? '' : `<button type="button" class="btn small${x === m ? ' primary' : ''}" data-act="rel-voir" data-cle="${esc(P.cle)}" data-m="${x}">${moisTxt(x)}</button>`; }).join('')}</div>`
      + section(moisTxt(m), `<div class="list">${lignes || '<div class="row"><div class="row-s">Rien ce mois-ci</div></div>'}</div>
        ${g && !(env && env.statut === 'regle') ? `<button type="button" class="link" data-act="rel-ajout" data-cle="${esc(P.cle)}" data-m="${m}" style="align-self:flex-start">${ic('plus', 'sm')}Ajouter une ligne</button>` : ''}
        <div class="rel-total"><span>Total</span><b>${eur(R.total)}</b></div>${etat}`)
      + actions
  };
};
ACT['rel-voir'] = d => { const t = topView(); if (t && t.view === 'releve') { t.m = d.m; render(); } };
ACT['rel-tog'] = d => { majBrouillon(d.cle, d.m, b => { const s = new Set(b.exclus); s.has(d.id) ? s.delete(d.id) : s.add(d.id); b.exclus = [...s]; return b; }); render(); };
ACT['rel-del'] = d => { majBrouillon(d.cle, d.m, b => { b.extras = b.extras.filter(x => x.id !== d.id); return b; }); render(); };
ACT['rel-ajout'] = d => {
  openSheet('Ajouter une ligne', fld('Libellé', inp('f_rlib', '', 'placeholder="Couverture lavée, complément, transport…" maxlength="80"'))
    + fld('Montant (€)', inp('f_rmt', '', 'inputmode="decimal" placeholder="0"'))
    + fld('Date', inp('f_rdate', todayISO() < `${d.m}-01` || todayISO() > finMois(d.m) ? `${d.m}-01` : todayISO(), `type="date" min="${d.m}-01" max="${finMois(d.m)}"`)), {
    local: true, focus: '#f_rlib',
    onSubmit: () => {
      const lib = val('f_rlib'), mt = parseFloat(String(val('f_rmt')).replace(',', '.'));
      if (!lib) return 'Indique le libellé.';
      if (!Number.isFinite(mt) || mt === 0) return 'Indique le montant.';
      majBrouillon(d.cle, d.m, b => { b.extras.push({ id: 'x-' + uid(), libelle: lib.slice(0, 80), montant: Math.round(mt * 100) / 100, date: validISO(val('f_rdate')) ? val('f_rdate') : `${d.m}-01` }); return b; });
      render();
    }
  });
};
const texteReleve = (P, m, R) => [`Relevé de ${moisTxt(m)} · ${(ecurieOuverte() || {}).nom || 'écurie'}`, `Pour ${P.nom}`, '',
  ...R.lignes.filter(l => !l.exclu).map(l => `${l.type === 'pension' ? '' : dShort(l.date) + ' · '}${l.libelle} : ${eur(l.montant)}`), '', `Total : ${eur(R.total)}`].join('\n');
function trouveP(d) { return proprietairesPension().find(x => x.cle === d.cle); }
ACT['rel-copier'] = async d => {
  const P = trouveP(d);
  if (!P) return;
  try { await navigator.clipboard.writeText(texteReleve(P, d.m, releveDe(P, d.m))); toast('Texte copié : colle-le dans un message.'); }
  catch (e) { toast("La copie n'a pas marché sur ce téléphone.", { danger: true }); }
};
async function ecrireReleveDe(P, m, statut) {
  const R = releveDe(P, m), env = releveEnvoye(P.cle, m), now = Date.now();
  const doc = { proprio: P.uid || '', nom: P.nom, mois: m, chevaux: P.chevaux.map(h => h.nom),
    lignes: R.lignes.filter(l => !l.exclu).map(l => ({ id: l.id, date: l.date, libelle: l.libelle, montant: Number(l.montant), type: l.type, avance: l.avance || '' })),
    total: R.total, statut, envoyeLe: env && env.envoyeLe && statut === 'regle' ? env.envoyeLe : now, regleLe: statut === 'regle' ? now : null, par: { uid: me.uid, nom: moiNom() } };
  if (env && statut === 'envoye' && env.statut === 'regle') { doc.lignes = env.lignes; doc.total = env.total; doc.envoyeLe = env.envoyeLe; }
  await EQ.ecrireReleve(idReleve(P.cle, m), doc);
  REL = (REL || []).filter(r => r.id !== idReleve(P.cle, m)).concat([Object.assign({ id: idReleve(P.cle, m) }, doc)]);
}
ACT['rel-envoyer'] = async (d, el) => {
  const P = trouveP(d);
  if (!P || !P.uid) return;
  if (el) el.disabled = true;
  try { await ecrireReleveDe(P, d.m, 'envoye'); toast(`Relevé envoyé : ${P.nom} le voit dans l'appli.`, { fete: true }); render(); }
  catch (e) { if (el && el.isConnected) el.disabled = false; toast(eqMsg(e, "Le relevé n'a pas pu partir : vérifie ta connexion."), { danger: true }); }
};
ACT['rel-regle'] = async (d, el) => {
  const P = trouveP(d);
  if (!P) return;
  if (el) el.disabled = true;
  try { await ecrireReleveDe(P, d.m, d.s === 'regle' ? 'regle' : 'envoye'); toast(d.s === 'regle' ? 'Relevé marqué réglé' : 'Relevé de nouveau à régler'); render(); }
  catch (e) { if (el && el.isConnected) el.disabled = false; toast(eqMsg(e, "Ça n'a pas pu s'enregistrer : vérifie ta connexion."), { danger: true }); }
};

/* ----- Côté propriétaire : ses chevaux et ses relevés ----- */
function accueilProprio() {
  const html = [], e = ecurieOuverte() || {}, hs = chevaux();
  const cg = bandeauConditions();
  if (cg) html.push(cg);
  html.push(`<div class="card proprio-bonjour"><div class="row-main"><b>Bonjour ${esc(moiNom() || '')}</b><span class="small muted">Tes chevaux à ${esc(e.nom || "l'écurie")}. C'est l'équipe qui tient le carnet : tu vois tout ce qu'elle note pour eux.</span></div></div>`);
  if (sync.mode === 'loading') { html.push(`<div class="loading">${brandLogo()}<p class="note">Ouverture…</p></div>`); return { title: "Aujourd'hui", html: html.join('') }; }
  if (!hs.length) {
    html.push(emptyH('Pas encore de cheval ici', "La gérante doit t'indiquer comme propriétaire dans la fiche de ton cheval (rubrique Propriété)."));
    return { title: "Aujourd'hui", html: html.join('') };
  }
  const t = todayISO();
  html.push(messagesProprioSection());   // réponses de l'écurie pas encore lues (76-messages.js)
  html.push(section(hs.length > 1 ? 'Tes chevaux' : 'Ton cheval', `<div class="list">${hs.map(h => {
    const pl = openPlace(h.id), p = pl && get('pres', pl.preId);
    const ou = p ? `${p.nom} depuis ${diffDays(pl.debut, t) <= 0 ? "aujourd'hui" : nJ(diffDays(pl.debut, t))}` : 'Au box';
    const s7 = list('seances').filter(s => s.horseId === h.id && s.statut !== 'prevu' && validISO(s.date) && s.date > addDays(t, -7) && s.date <= t).length;
    const ds = list('soins').filter(s => s.horseId === h.id && s.statut !== 'prevu').sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    return `<button type="button" class="row" data-act="open-cheval" data-id="${h.id}">${av(h, 'm')}<div class="row-main"><div class="row-t">${esc(h.nom)}</div>
      <div class="row-s">${esc([ou, s7 ? `${s7} ${pl2(s7, 'séance')} cette semaine` : '', ds ? `${soinLabel(ds)} le ${dShort(ds.date)}` : ''].filter(Boolean).join(' · '))}</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`;
  }).join('')}</div>`));
  const al = alerts().filter(a => !/data-act="(pre|open-pre|move|foin|foin-out-pick|open-stock)"/.test(a.act || '') && !/^Foin/.test(a.t || ''));
  html.push(section('À surveiller', al.length ? `<div class="list">${al.map(rowAlert).join('')}</div>` : emptyH('Tout est à jour', 'Les rappels de vaccins, de vermifuge et de maréchal de tes chevaux s\'afficheront ici.')));
  html.push(section('Les 30 prochains jours', agendaHtml(agenda()), `<button type="button" class="link" data-act="agenda-ics">${ic('cal', 'sm')}Mon agenda</button>`));
  if (!REL) chargerReleves();
  const r = (REL || []).slice().sort((a, b) => String(b.mois).localeCompare(String(a.mois)))[0];
  if (r) html.push(section('Dernier relevé', `<div class="list">${ligneReleveProprio(r)}</div>`, `<button type="button" class="link" data-act="go" data-tab="releves">Tous ${ic('next', 'sm')}</button>`));
  return { title: "Aujourd'hui", html: html.join('') };
}
const pl2 = (n, s) => pl(n, s);
const ligneReleveProprio = r => `<button type="button" class="row" data-act="rel-proprio" data-id="${esc(r.id)}">${lead('euro')}<div class="row-main"><div class="row-t">${esc(moisTxt(r.mois))}</div><div class="row-s">${esc((r.chevaux || []).join(', '))}</div></div>
  <span class="row-end rel-fin"><b>${eur(r.total)}</b>${r.statut === 'regle' ? '<span class="pill ok">Réglé</span>' : '<span class="pill warn">À régler</span>'}</span></button>`;
VIEWS.releves = () => {
  if (!REL) chargerReleves();
  const l = (REL || []).slice().sort((a, b) => String(b.mois).localeCompare(String(a.mois)));
  return { title: 'Relevés', html: section('Tes relevés de pension', l.length ? `<div class="list">${l.map(ligneReleveProprio).join('')}</div>`
    : emptyH(REL ? 'Aucun relevé pour l\'instant' : 'Chargement…', 'Chaque mois, la gérante t\'envoie ici le relevé de la pension et des frais avancés pour tes chevaux.')) };
};
ACT['rel-proprio'] = d => push('relProprio', { id: d.id });
VIEWS.relProprio = p => {
  const r = (REL || []).find(x => x.id === p.id);
  if (!r) return { title: 'Relevé', back: true, html: emptyH('Relevé introuvable', '') };
  return {
    title: `Relevé · ${moisTxt(r.mois)}`, back: true,
    html: section(esc((r.chevaux || []).join(', ')), `<div class="list">${(r.lignes || []).map(l => `<div class="row rel-l"><div class="row-main"><div class="row-t">${esc(l.libelle)}</div><div class="row-s">${esc([l.type === 'pension' ? moisTxt(r.mois) : dShort(l.date), l.avance ? 'avancé par ' + l.avance : ''].filter(Boolean).join(' · '))}</div></div><b class="rel-mt">${eur(l.montant)}</b></div>`).join('')}</div>
      <div class="rel-total"><span>Total</span><b>${eur(r.total)}</b></div>
      <p class="note">${r.statut === 'regle' ? `Réglé le ${dShort(isoOf(new Date(r.regleLe || r.envoyeLe)))}. Merci !` : `Envoyé le ${dShort(isoOf(new Date(r.envoyeLe)))} par ${esc((r.par && r.par.nom) || 'la gérante')}. À régler directement à l'écurie.`}</p>`)
      + `<div class="btnrow"><button type="button" class="btn" data-act="rel-pdf-p" data-id="${esc(r.id)}">${ic('download', 'sm')}Imprimer ou enregistrer en PDF</button></div>`
  };
};

/* ----- Relevé en PDF (impression : 71-sante.js) ----- */
function releveDocHtml(o) {
  const e = ecurieOuverte() || {}, lignes = (o.lignes || []).filter(l => !l.exclu);
  const etat = o.statut === 'regle' ? `Réglé le ${dFull(isoOf(new Date(o.regleLe || o.envoyeLe)))}.` : o.envoyeLe ? `Envoyé le ${dFull(isoOf(new Date(o.envoyeLe)))}. À régler à l'écurie.` : '';
  return `<article class="carnet releve-doc">
    <header class="cn-tete"><div><p class="cn-sur">Relevé de pension · ${esc(moisTxt(o.mois))}</p><h2>${esc(o.nom)}</h2></div><p class="cn-date">Édité le ${dFull(todayISO())}</p></header>
    <dl class="cn-id">${e.nom ? `<dt>Écurie</dt><dd>${esc([e.nom, e.commune].filter(Boolean).join(', '))}</dd>` : ''}<dt>${(o.chevaux || []).length > 1 ? 'Chevaux' : 'Cheval'}</dt><dd>${esc((o.chevaux || []).join(', ') || '—')}</dd><dt>Période</dt><dd>${esc(moisTxt(o.mois))}</dd></dl>
    <section class="cn-bloc"><table><thead><tr><th>Date</th><th>Détail</th><th class="cn-mt">Montant</th></tr></thead><tbody>
      ${lignes.map(l => `<tr><td>${l.type === 'pension' ? esc(moisTxt(o.mois)) : esc(dFull(l.date))}</td><td>${esc(l.libelle)}${l.avance ? `<br><span class="cn-vide">avancé par ${esc(l.avance)}</span>` : ''}</td><td class="cn-mt">${eur(l.montant)}</td></tr>`).join('') || '<tr><td colspan="3">Rien ce mois-ci</td></tr>'}
    </tbody><tfoot><tr><th colspan="2">Total</th><th class="cn-mt">${eur(o.total)}</th></tr></tfoot></table></section>
    ${etat ? `<p class="cn-txt">${etat}</p>` : ''}
    <footer class="cn-pied">Relevé établi par ${esc(e.nom || "l'écurie")} avec EquiValdi : il récapitule la pension et les frais avancés du mois, il ne tient pas lieu de facture.</footer>
  </article>`;
}
ACT['rel-pdf'] = d => {
  const P = trouveP(d);
  if (!P) return;
  const R = releveDe(P, d.m), env = releveEnvoye(P.cle, d.m);
  imprimer(releveDocHtml({ nom: P.nom, mois: d.m, chevaux: P.chevaux.map(h => h.nom), lignes: R.lignes, total: R.total, statut: env && env.statut, envoyeLe: env && env.envoyeLe, regleLe: env && env.regleLe }), `Relevé ${moisTxt(d.m)} ${P.nom}`);
};
ACT['rel-pdf-p'] = d => {
  const r = (REL || []).find(x => x.id === d.id);
  if (r) imprimer(releveDocHtml(r), `Relevé ${moisTxt(r.mois)} ${r.nom || ''}`.trim());
};
