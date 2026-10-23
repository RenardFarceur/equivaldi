
/* ---------- Équipe : qui fait quoi, dépenses, fiches personnelles, contacts utiles ---------- */
const eurRond = v => num(Math.round(Number(v) || 0), 0) + ' €';
const perSeg = () => segCtl('eqPer', [['mois', 'Ce mois'], ['annee', 'Cette année'], ['tout', 'Tout']], periode(ui.eqPer).id);
const debutT = P => P.from ? new Date(P.from + 'T00:00:00').getTime() : 0;
const estGerante = () => !!(window.EQ_MODE && window.EQ && EQ.role === 'gerante');

function chevauxDe(k) {
  const own = chevaux(true).filter(h => pKey(propRef(h)) === k);
  const dps = [];
  chevaux(true).forEach(h => dpsDe(h).forEach(x => { if (pKey(x.qui) === k) dps.push({ h, x }); }));
  return { own, dps };
}
function resumeBilan(a) {
  const parts = [];
  if (a && a.taches) parts.push(`${a.taches} ${pl(a.taches, 'tâche')}`);
  if (a && a.seances) parts.push(`${a.seances} ${pl(a.seances, 'séance')}`);
  if (a && a.dep) parts.push(eur(a.dep));
  return parts.join(' · ') || 'Rien sur la période';
}
function rowPersonne(p, a) {
  const { own, dps } = chevauxDe(p.k);
  const enCours = dps.filter(d => dpActive(d.x));
  const chev = [own.length ? `Propriétaire : ${own.map(h => h.nom).join(', ')}` : '', enCours.length ? `Demi-pension : ${enCours.map(d => d.h.nom).join(', ')}` : ''].filter(Boolean).join(' · ');
  const role = p.m && p.m.role !== 'equipe' ? `<span class="pill${p.m.role === 'gerante' ? ' ok' : ''}">${esc(ROLE_LABEL[p.m.role] || '')}</span>` : '';
  const moi = estMoi(p.k) ? '<span class="pill ok">Toi</span>' : '';
  return `<button type="button" class="row" data-act="open-membre" data-k="${esc(p.k)}">${pav(p, 'm')}<div class="row-main">
    <div class="row-t">${esc(p.nom)} ${moi}${role}</div><div class="row-s">${esc(resumeBilan(a))}</div>${chev ? `<div class="row-s">${esc(chev)}</div>` : ''}
  </div><span class="row-end">${ic('next', 'sm')}</span></button>`;
}
function rowDep(e, sansPayeur = false) {
  const qui = pKey(e.qui) ? nomCourt(e.qui) : 'Payeur à indiquer';
  const sub = [dShort(e.d), e.hid ? hNom(e.hid) : '', sansPayeur ? '' : qui].filter(Boolean).join(' · ');
  return `<button type="button" class="row" data-act="${ACT_DEP[e.coll]}" data-id="${esc(e.id)}">${lead(catDe(e.cat).icon)}<div class="row-main"><div class="row-t">${esc(e.label)}</div><div class="row-s">${esc(sub)}</div></div><span class="row-end num">${eur(e.v)}</span></button>`;
}
/* Fil de l'équipe : la personne, puis ce qu'elle a fait ; dans une fiche, l'objet puis l'action */
function rowFil(it, dansFiche = false) {
  const inner = dansFiche
    ? `${lead(it.icon)}<div class="row-main"><div class="row-t">${esc(it.objet)}</div><div class="row-s">${esc(it.quoi)} · ${esc(quandTxt(it.t))}</div></div>`
    : `${pav(it.r)}<div class="row-main"><div class="row-t">${esc(nomDe(it.r) || "Quelqu'un")}</div><div class="row-s">${esc(it.quoi)} : ${esc(it.objet)} · ${esc(quandTxt(it.t))}</div></div>`;
  return it.act ? `<button type="button" class="row" ${it.act}>${inner}</button>` : `<div class="row">${inner}</div>`;
}

VIEWS.equipe = () => {
  const P = periode(ui.eqPer), B = bilan(P.from), ms = membres();
  let html = perSeg();
  html += `<div class="stats">
    <div class="stat"><b>${B.taches}</b><span>${pl(B.taches, 'tâche cochée', 'tâches cochées')}</span></div>
    <div class="stat"><b>${B.seances}</b><span>${pl(B.seances, 'séance', 'séances')} de travail</span></div>
    <div class="stat"><b>${eurRond(B.total)}</b><span>de dépenses</span></div></div>`;
  // les membres, puis les personnes hors équipe qui apparaissent dans le carnet (demi-pension, cavalier, payeur…)
  const keys = new Set(ms.map(m => 'u:' + m.id)), autres = new Set();
  const voir = k => { if (k && k !== '_' && !keys.has(k)) autres.add(k); };
  B.by.forEach((a, k) => voir(k));
  chevaux(true).forEach(h => { voir(pKey(propRef(h))); dpsDe(h).forEach(x => voir(pKey(x.qui))); });
  if (!ms.length) voir(kMoi());
  const na = B.by.get('_');
  const naRow = na && na.dep > 0 ? `<button type="button" class="row sev-warn" data-act="dep-na">${lead('euro')}<div class="row-main"><div class="row-t">${eur(na.dep)} sans payeur</div><div class="row-s">${na.items.length} ${pl(na.items.length, 'dépense')} ${P.label} : touche pour indiquer qui a payé</div></div><span class="row-end">${ic('next', 'sm')}</span></button>` : '';
  const ext = [...autres].map(personne).filter(Boolean).sort(byName).map(p => rowPersonne(p, B.by.get(p.k)));
  if (ms.length) {
    html += section(`L'équipe <span class="count">${ms.length}</span>`, `<div class="list">${ms.map(m => rowPersonne(personne('u:' + m.id), B.by.get('u:' + m.id))).join('')}${naRow}</div>`);
    if (ext.length) html += section('Hors équipe', `<div class="list">${ext.join('')}</div>`);
  } else {
    html += section('Les personnes', ext.length || naRow ? `<div class="list">${ext.join('')}${naRow}</div>`
      : empty('Personne pour l\'instant', "Les prénoms apparaissent dès qu'une tâche est cochée, qu'une séance est notée ou qu'un propriétaire est indiqué."));
  }
  const fil = filEquipe(debutT(P), 25);
  html += section("Ce qui s'est passé", fil.length ? `<div class="list">${fil.map(it => rowFil(it)).join('')}</div>`
    : '<p class="note">Les tâches cochées, les soins, les séances, le foin et les déplacements notés par chacun apparaîtront ici.</p>');
  const cs = contacts();
  html += section('Contacts utiles', cs.length ? `<div class="list">${cs.map(rowContact).join('')}</div>`
    : '<p class="note">Vétérinaire, maréchal, dentiste, coach… Garde leurs numéros ici pour les appeler en un geste.</p>',
    sync.readOnly ? '' : `<button type="button" class="link" data-act="new-contact">${ic('plus', 'sm')}Ajouter</button>`);
  if (estGerante()) html += `<button type="button" class="btn" data-act="equipe">${ic('users', 'sm')}Inviter, gérer les accès</button>`;
  return { title: 'Équipe', eyebrow: ms.length ? `${ms.length} ${pl(ms.length, 'personne')}` : 'Qui fait quoi', html, fab: menuEquipe, fabLabel: 'Ajouter' };
};

VIEWS.membre = p => {
  const P = periode(ui.eqPer), B = bilan(P.from), pe = personne(p.k);
  if (!pe) return { title: 'Équipe', html: empty('Fiche introuvable', "Cette personne ne fait plus partie de l'équipe.") };
  const m = pe.m, a = B.by.get(pe.k), moi = estMoi(pe.k);
  const modif = !!(m && (m.id === me.uid || estGerante()));
  const dispo = m && Array.isArray(m.dispo) && m.dispo.length ? joursTxt(m.dispo) : '';
  const btns = [m && m.tel ? `<a class="btn small" href="${esc(telHref(m.tel))}">${ic('phone', 'sm')}${esc(m.tel)}</a>` : '',
    modif ? `<button type="button" class="btn small" data-act="edit-profil" data-uid="${esc(m.id)}">${ic('edit', 'sm')}${moi ? 'Modifier ma fiche' : 'Modifier'}</button>` : ''].join('');
  let html = `<div class="card phead">${pav(pe, 'xl')}<div class="row-main">
    <div class="row-t">${esc(pe.nom)}${moi ? ' <span class="pill ok">Toi</span>' : ''}</div>
    <div class="row-s">${esc(m ? (ROLE_LABEL[m.role] || '') : 'Hors équipe')}</div>
    ${m && m.email ? `<div class="row-s trunc">${esc(m.email)}</div>` : ''}
    ${dispo ? `<div class="row-s">Jours de présence : ${esc(dispo)}</div>` : ''}
    ${btns ? `<div class="btnrow">${btns}</div>` : ''}</div></div>`;
  html += perSeg();
  html += `<div class="stats">
    <div class="stat"><b>${a ? a.taches : 0}</b><span>${pl(a ? a.taches : 0, 'tâche cochée', 'tâches cochées')}</span></div>
    <div class="stat"><b>${a ? a.seances : 0}</b><span>${pl(a ? a.seances : 0, 'séance')}${a && a.minutes ? ' · ' + durTxt(a.minutes) : ''}</span></div>
    <div class="stat"><b>${eurRond(a ? a.dep : 0)}</b><span>de dépenses</span></div></div>`;
  const { own, dps } = chevauxDe(pe.k);
  const rowH = (h, sub) => `<button type="button" class="row" data-act="open-cheval" data-id="${h.id}">${av(h)}<div class="row-main"><div class="row-t">${esc(h.nom)}</div><div class="row-s">${esc(sub)}</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`;
  if (own.length || dps.length) html += section('Chevaux', `<div class="list">${[
    ...own.map(h => rowH(h, 'Propriétaire')),
    ...dps.map(({ h, x }) => rowH(h, ['Demi-pension', joursTxt(x.jours), Number(x.part) > 0 ? eur(x.part) + ' / mois' : '', dpActive(x) ? '' : (validISO(x.fin) && x.fin < todayISO() ? 'terminée' : 'à venir')].filter(Boolean).join(' · ')))
  ].join('')}</div>`);
  if (a && a.items.length) {
    const cats = CATS.filter(c => a.cats[c.id]).map(c => `<span class="pill">${ic(c.icon)}${c.label} ${eur(a.cats[c.id])}</span>`).join('');
    html += section(`Dépenses ${P.label}`, `<div class="wrap">${cats}</div><div class="list">${a.items.slice(0, 40).map(e => rowDep(e, true)).join('')}</div>`);
  }
  const resp = tachesTriees(tk => pKey(tk.resp) === pe.k);
  if (resp.length) html += section(moi ? 'Mes tâches' : 'Ses tâches', tachesListe(resp));
  const fil = filEquipe(debutT(P), 20, pe.k);
  if (fil.length) html += section(`Activité ${P.label}`, `<div class="list">${fil.map(it => rowFil(it, true)).join('')}</div>`);
  const ss = list('seances').filter(s => s.statut !== 'prevu' && validISO(s.date) && (!P.from || s.date >= P.from) && pKey({ uid: s.cavalierUid, nom: s.cavalier }) === pe.k)
    .sort((x, y) => y.date.localeCompare(x.date));
  if (ss.length) html += section(`Séances ${P.label}`, `<div class="list">${ss.slice(0, 10).map(s => seanceRow(s, true)).join('')}</div>`);
  if (m && (m.materiel || m.notes)) html += section('Matériel et infos', `<div class="card">${m.materiel ? `<div><div class="eyebrow">Matériel</div><div style="white-space:pre-wrap">${esc(m.materiel)}</div></div>` : ''}${m.notes ? `<div><div class="eyebrow">Notes</div><div style="white-space:pre-wrap">${esc(m.notes)}</div></div>` : ''}</div>`);
  else if (modif && moi) html += '<p class="note">Ajoute ton téléphone, tes jours de présence et ton matériel avec « Modifier ma fiche » : toute l\'équipe les verra.</p>';
  return { title: pe.nom, eyebrow: moi ? 'Ma fiche' : (m ? 'Équipe' : 'Hors équipe'), html, fab: null };
};
ACT['open-membre'] = d => { if (d.k) push('membre', { k: d.k }); };
ACT['ma-fiche'] = () => { const k = kMoi(); if (k) push('membre', { k }); else toast("Ta fiche n'est pas encore chargée."); };

function menuEquipe() {
  const mi = (act, icon, t, s) => `<button type="button" class="row" data-act="${act}">${lead(icon)}<div class="row-main"><div class="row-t">${t}</div><div class="row-s">${s}</div></div></button>`;
  openSheet('Ajouter', `<div class="list">
    ${estGerante() ? mi('equipe', 'users', "Inviter quelqu'un", 'Par adresse e-mail, avec ses droits') : ''}
    ${mi('new-dp', 'card', 'Demi-pension', 'Qui prend quel cheval, quels jours')}
    ${mi('new-contact', 'phone', 'Contact utile', 'Vétérinaire, maréchal, coach…')}
    ${me.uid && get('membres', me.uid) ? mi('edit-profil-moi', 'user', 'Ma fiche', 'Téléphone, jours de présence, matériel') : ''}
  </div>`);
}

/* Fiche personnelle : chacun tient la sienne, la gérante peut toutes les corriger */
function formProfil(uidM) {
  const m = get('membres', uidM);
  if (!m || !m.role) { toast("La fiche n'est pas encore chargée : réessaie dans un instant."); return; }
  const moi = uidM === me.uid;
  const coul = Number.isInteger(m.couleur) ? m.couleur : hashCol(normNom(mNom(m)));
  const body = `
    ${fld('Prénom', inp('f_pnom', mNom(m), 'required autocomplete="given-name" autocapitalize="words"'))}
    ${fld('Téléphone', inp('f_tel', m.tel || '', 'type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78"'), "Visible par toute l'équipe, pour s'appeler en un geste.")}
    ${grp('Jours de présence', chips('dispo', JOURS.map(j => ({ v: String(j.id), l: j.l })), (Array.isArray(m.dispo) ? m.dispo : []).map(String), { multi: true }), "Les jours où tu passes à l'écurie : ils s'affichent sur l'accueil le jour venu.")}
    ${fld('Matériel personnel', area('f_mat', m.materiel || '', 'rows="3" placeholder="Selle, filet, tapis, couvertures, bombe…"'))}
    ${fld('Notes', area('f_pnotes', m.notes || '', 'rows="2" placeholder="Personne à prévenir, préférences, véhicule…"'))}
    ${grp('Pastille', chips('pcoul', Array.from({ length: NB_COULEURS }, (_, i) => ({ v: String(i), html: `<span class="sw hc${i}"></span>`, cls: 'col', aria: `Couleur ${i + 1}` })), String(coul)))}`;
  openSheet(moi ? 'Ma fiche' : `Fiche de ${mNom(m)}`, body, {
    local: moi,   // chacun peut tenir sa fiche à jour, même en lecture seule
    onSubmit: f => {
      const nom = val('f_pnom').replace(/\s+/g, ' ');
      if (!nom) return 'Indique le prénom.';
      if (nom.length > 40) return 'Un prénom court suffit.';
      const tel = val('f_tel');
      if (tel && tel.replace(/[^\d]/g, '').length < 6) return 'Ce numéro de téléphone semble incomplet.';
      const cur = get('membres', uidM);
      if (!cur || !cur.role) return "La fiche n'est pas encore chargée : réessaie dans un instant.";
      put('membres', Object.assign({}, cur, {
        nom, tel, dispo: chipVals(f, 'dispo').map(Number), materiel: val('f_mat'), notes: val('f_pnotes'),
        couleur: parseInt(chipVal(f, 'pcoul') || String(coul), 10)
      }));
      if (moi) setMoi(nom);
      toast('Fiche enregistrée');
    }
  });
}
ACT['edit-profil'] = d => formProfil(d.uid);
ACT['edit-profil-moi'] = () => formProfil(me.uid);

/* Contacts utiles : gardés dans les réglages communs du carnet */
const METIER_IC = { 'Vétérinaire': 'stetho', 'Maréchal': 'shoe', 'Dentiste': 'tooth', 'Ostéopathe': 'hands', 'Coach': 'timer', 'Fourrage': 'bale', 'Sellerie': 'tool', 'Transport': 'move' };
function contacts() {
  const cs = (S.cfg && Array.isArray(S.cfg.contacts) ? S.cfg.contacts : []).filter(c => c && c.id && c.nom);
  const ord = c => { const i = METIERS.indexOf(c.metier); return i < 0 ? 99 : i; };
  return cs.slice().sort((a, b) => ord(a) - ord(b) || byName(a, b));
}
const rowContact = c => crow(`data-act="edit-contact" data-id="${esc(c.id)}"`,
  `${lead(METIER_IC[c.metier] || 'user')}<span class="row-main"><span class="row-t">${esc(c.nom)}</span><span class="row-s">${esc([c.metier, c.tel].filter(Boolean).join(' · ') || 'Touche pour compléter')}</span>${c.notes ? `<span class="row-s clamp2">${esc(c.notes)}</span>` : ''}</span>`, c.tel, c.nom);
function formContact(id) {
  const ex = id ? contacts().find(c => c.id === id) : null;
  if (id && !ex) return;
  const c = ex ? clone(ex) : { id: 'c' + uid(), nom: '', metier: null, tel: '', notes: '' };
  const noms = Array.from(new Set([...historyValues('soins', 'praticien'), ...historyValues('seances', 'coach')]));
  const body = `
    ${fld('Nom', inp('f_cnom', c.nom, 'required autocomplete="off" autocapitalize="words" list="dl-cnom" placeholder="ex. Dr Martin, clinique vétérinaire"'))}
    ${grp('Métier', chips('metier', METIERS.map(x => ({ v: x, l: x })), c.metier ? [c.metier] : [], { optional: true }))}
    ${fld('Téléphone', inp('f_ctel', c.tel, 'type="tel" inputmode="tel" autocomplete="off"'))}
    ${fld('Notes', area('f_cnotes', c.notes, 'rows="2" placeholder="Urgences, horaires, adresse…"'))}
    ${dlist('dl-cnom', noms)}`;
  openSheet(ex ? ex.nom : 'Contact utile', body, {
    focus: ex ? null : '#f_cnom',
    onSubmit: f => {
      const nom = val('f_cnom');
      if (!nom) return 'Indique le nom.';
      Object.assign(c, { nom, metier: chipVal(f, 'metier'), tel: val('f_ctel'), notes: val('f_cnotes') });
      putCfg(Object.assign({}, S.cfg || {}, { contacts: [...contacts().filter(x => x.id !== c.id), c] }));
      toast(ex ? 'Contact enregistré' : `${nom} ajouté aux contacts`);
    },
    onDelete: ex ? () => { const prev = clone(S.cfg || {}); putCfg(Object.assign({}, S.cfg || {}, { contacts: contacts().filter(x => x.id !== id) })); toast('Contact supprimé', { undo: () => putCfg(prev) }); } : null
  });
}
ACT['edit-contact'] = d => formContact(d.id);
ACT['new-contact'] = () => formContact(null);

/* Dépenses sans payeur : on les attribue une par une, ou toutes d'un coup */
ACT['dep-na'] = () => {
  const P = periode(ui.eqPer);
  const es = depenses(P.from).filter(e => !pKey(e.qui));
  if (!es.length) return;
  const tot = es.reduce((s, e) => s + e.v, 0);
  openSheet('Qui a payé ?', `<p class="note">${es.length} ${pl(es.length, 'dépense')} ${P.label} sans payeur, pour ${eur(tot)}. Touche une ligne pour la corriger, ou attribue-les toutes à la même personne.</p>
    <div class="list">${es.map(e => rowDep(e, true)).join('')}</div>
    ${pickPerson('attrib', 'Tout attribuer à', null, { moi: true, autre: false })}`, {
    submit: 'Attribuer',
    onSubmit: () => {
      const r = readPerson('attrib');
      if (!r) return 'Choisis une personne.';
      const prev = [];
      es.forEach(e => { const o = get(e.coll, e.id); if (o && !pKey(o.payePar)) { prev.push([e.coll, clone(o)]); put(e.coll, Object.assign({}, o, { payePar: r })); } });
      toast(`${prev.length} ${pl(prev.length, 'dépense attribuée', 'dépenses attribuées')} à ${nomCourt(r)}`, { undo: () => prev.forEach(([k, o]) => put(k, o)) });
    }
  });
};

/* Accueil : qui est attendu aujourd'hui */
function presentsHtml() {
  const ps = presentsAujourdhui();
  if (!ps.length) return '';
  return section("Aujourd'hui à l'écurie", `<div class="list">${ps.map(x => `<button type="button" class="row" data-act="open-membre" data-k="${esc(x.k)}">${pav(x.ref)}<div class="row-main"><div class="row-t">${esc(nomDe(x.ref))}${estMoi(x.k) ? ' <span class="pill ok">Toi</span>' : ''}</div><div class="row-s">${esc(x.chevaux.length ? 'Demi-pension · ' + x.chevaux.map(h => h.nom).join(', ') : 'Jour de présence')}</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`).join('')}</div>`);
}
