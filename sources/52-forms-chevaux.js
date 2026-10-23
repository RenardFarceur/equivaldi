
/* ---------- Formulaires : cheval, ration, soin ---------- */
function formCheval(id) {
  const ex = id ? cheval(id) : null;
  if (id && !ex) return;
  const h = ex ? clone(ex) : { nom: '', couleur: nextColor() };
  let ph = null;
  const body = `
    ${photoField(h)}
    ${fld('Nom', inp('f_nom', h.nom, 'required autocomplete="off" autocapitalize="words" enterkeyhint="next"'))}
    ${fld('Date de naissance', inp('f_naiss', h.naissance, 'type="date"'), "L'âge est calculé automatiquement.")}
    ${grp('Sexe', chips('sexe', SEXES.map(s => ({ v: s, l: s })), h.sexe, { optional: true }))}
    ${fld('Propriétaire', inp('f_prop', h.proprietaire, 'autocomplete="off" autocapitalize="words" placeholder="Pour un cheval en pension"'), 'Laisse vide pour tes propres chevaux.')}
    ${fld('Race', inp('f_race', h.race, 'list="dl-race" autocomplete="off" placeholder="ex. Anglo-Arabe x Selle Français"'))}
    ${fld('Robe', inp('f_robe', h.robe, 'list="dl-robe" autocomplete="off"'))}
    <div class="grid2">${fld('Taille (cm)', inp('f_taille', h.taille, 'inputmode="numeric" autocomplete="off"'))}${fld('Poids (kg)', inp('f_poids', h.poids, 'inputmode="numeric" autocomplete="off"'))}</div>
    ${fld('N° SIRE / UELN', inp('f_sire', h.sire, 'autocomplete="off" autocapitalize="characters"'))}
    ${fld('Transpondeur (puce)', inp('f_puce', h.puce, 'inputmode="numeric" autocomplete="off"'))}
    ${grp('Pastille', chips('coul', Array.from({ length: NB_COULEURS }, (_, i) => ({ v: String(i), html: `<span class="sw hc${i}"></span>`, cls: 'col', aria: `Couleur ${i + 1}` })), String(hColor(h))))}
    ${fld('Notes', area('f_notes', h.notes, 'rows="3" placeholder="Caractère, particularités, assurance…"'))}
    ${ex ? `<label class="check"><input type="checkbox" id="f_arch"${h.archive ? ' checked' : ''}> Archiver (vendu, parti…) : la fiche reste consultable</label>` : ''}
    ${dlist('dl-race', RACES)}${dlist('dl-robe', ROBES)}`;
  openSheet(ex ? 'Modifier la fiche' : 'Nouveau cheval', body, {
    focus: ex ? null : '#f_nom',
    onMount: () => { ph = mountPhoto(h); },
    onSubmit: f => {
      const nom = val('f_nom');
      if (!nom) return 'Indique le nom du cheval.';
      if (ph && ph.busy()) return 'La photo est encore en cours d\'ouverture, réessaie dans un instant.';
      const pr = ph ? ph.result() : { changed: false };
      if (pr.changed) h.photo = pr.photo || null;
      const naiss = val('f_naiss');
      if (naiss && naiss > todayISO()) return 'La date de naissance ne peut pas être dans le futur.';
      Object.assign(h, {
        nom, naissance: naiss || null, sexe: chipVal(f, 'sexe'), race: val('f_race'), robe: val('f_robe'),
        taille: parseNum(val('f_taille')), poids: parseNum(val('f_poids')), sire: val('f_sire'), puce: val('f_puce'),
        couleur: parseInt(chipVal(f, 'coul') || '0', 10), notes: val('f_notes'), proprietaire: val('f_prop')
      });
      if (ex) h.archive = $('#f_arch').checked;
      const saved = put('chevaux', h);
      toast(ex ? 'Fiche enregistrée' : `${nom} ajouté`);
      if (!ex) setTimeout(() => push('cheval', { id: saved.id, sub: 'fiche' }), 50);
    },
    onDelete: ex ? () => deleteHorse(id) : null,
    delConfirm: 'Supprimer aussi son historique ?'
  });
}
function deleteHorse(id) {
  const h = cheval(id);
  if (!h) return;
  ['soins', 'places', 'concours', 'seances'].forEach(k => list(k).filter(o => o.horseId === id).forEach(o => del(k, o.id)));
  list('taches').filter(tk => tk.horseId === id).forEach(tk => put('taches', Object.assign({}, tk, { horseId: null })));
  del('chevaux', id);
  const t = topView();
  if (t && t.view === 'cheval' && t.id === id) nav.stack.pop();
  render();
  toast(`${h.nom} supprimé`);
}
ACT['edit-cheval'] = d => formCheval(d.id);

function formRation(hid, lid) {
  const h = cheval(hid);
  if (!h) return;
  const lines = (h.ration || []).map(x => Object.assign({}, x));
  const l = lid ? lines.find(x => x.id === lid) : { aliment: '', qte: null, unite: 'kg', repas: ['matin', 'soir'] };
  if (!l) return;
  const used = Array.from(new Set(chevaux(true).flatMap(x => (x.ration || []).map(y => y.aliment)).filter(Boolean)));
  const body = `
    ${fld('Aliment', inp('f_alim', l.aliment, 'list="dl-alim" autocomplete="off" required'))}
    <div class="wrap">${ALIM_RAPIDES.map(a => `<button type="button" class="chip" data-act="fill" data-target="f_alim" data-fill="${esc(a)}">${esc(a)}</button>`).join('')}</div>
    ${fld('Quantité par repas', inp('f_qte', l.qte != null ? String(l.qte).replace('.', ',') : '', numAttr + ' placeholder="ex. 1,5"'), 'Pour le foin, note-la en kg : elle sert à calculer ton autonomie.')}
    ${grp('Unité', chips('unite', UNITES.map(u => ({ v: u, l: u })), l.unite || 'kg'))}
    ${grp('Repas', chips('repas', REPAS.map(r => ({ v: r.id, l: r.label })), l.repas || [], { multi: true }), 'La quantité est donnée à chaque repas choisi.')}
    ${dlist('dl-alim', Array.from(new Set([...used, ...ALIMENTS])))}`;
  openSheet(lid ? `Ration de ${h.nom}` : `Ajouter à la ration de ${h.nom}`, body, {
    focus: lid ? null : '#f_alim',
    onSubmit: f => {
      const aliment = val('f_alim');
      if (!aliment) return "Indique l'aliment.";
      const raw = val('f_qte'), qte = parseNum(raw);
      if (raw && (qte == null || qte <= 0)) return 'La quantité doit être un nombre positif, par exemple 1,5.';
      const repas = chipVals(f, 'repas');
      if (!repas.length) return 'Choisis au moins un repas.';
      Object.assign(l, { aliment, qte, unite: chipVal(f, 'unite') || 'kg', repas });
      if (!lid) { l.id = uid(); lines.push(l); }
      put('chevaux', Object.assign({}, h, { ration: lines }));
      toast(lid ? 'Ration mise à jour' : `${aliment} ajouté à la ration`);
    },
    onDelete: lid ? () => { put('chevaux', Object.assign({}, h, { ration: lines.filter(x => x.id !== lid) })); toast('Aliment retiré de la ration'); } : null,
    delLabel: 'Retirer'
  });
}
ACT['edit-ration'] = d => formRation(d.hid, d.lid);
ACT.fill = d => { const el = document.getElementById(d.target); if (el) { el.value = d.fill; el.focus(); } };
ACT['copy-ration'] = d => {
  const h = cheval(d.hid);
  if (!h) return;
  const src = chevaux().filter(x => x.id !== h.id && (x.ration || []).length);
  openSheet(`Ration de ${h.nom}`, `
    ${grp('Copier la ration de', chips('src', horseOpts(src, x => `${x.ration.length} ${pl(x.ration.length, 'aliment')}`), src.length === 1 ? [src[0].id] : []))}
    ${(h.ration || []).length ? '<p class="note">La ration actuelle sera remplacée. Tu pourras ensuite ajuster les quantités.</p>' : ''}`, {
    submit: 'Copier',
    onSubmit: f => {
      const s = cheval(chipVal(f, 'src'));
      if (!s) return 'Choisis un cheval.';
      put('chevaux', Object.assign({}, h, { ration: (s.ration || []).map(l => Object.assign({}, l, { id: uid() })) }));
      toast(`Ration de ${s.nom} copiée`);
    }
  });
};

function formSoin(id, pre = {}) {
  const ex = id ? get('soins', id) : null;
  if (id && !ex) return;
  const hs = chevaux(), all = chevaux(true);
  if (!all.length) { toast("Ajoute d'abord un cheval."); formCheval(null); return; }
  const s = ex ? clone(ex) : { types: pre.type ? [pre.type] : [], date: todayISO() };
  const selH = ex ? [ex.horseId] : pre.hid ? [pre.hid] : (hs.length === 1 ? [hs[0].id] : []);
  const multi = !ex;
  const auto = d => (d > todayISO() ? 'prevu' : 'fait');
  const statut0 = ex ? (ex.statut === 'prevu' ? 'prevu' : 'fait') : auto(s.date);
  const hOpts = horseOpts(ex ? all.filter(h => !h.archive || h.id === ex.horseId) : hs);
  const body = `
    ${grp(multi ? 'Chevaux' : 'Cheval', chips('h', hOpts, selH, { multi }) + (multi && hs.length > 2 ? '<button type="button" class="link" data-act="all-h" style="align-self:flex-start">Tout le monde</button>' : ''))}
    ${grp('Soin', chips('types', SOINS.map(T => ({ v: T.id, html: `${ic(T.icon, 'sm')}<span>${T.short}</span>` })), s.types, { multi: true }), 'Plusieurs choix possibles : grippe + tétanos en une injection, par exemple.')}
    <div id="w_label"${(s.types || []).includes('autre') ? '' : ' hidden'}>${fld('Précision', inp('f_label', s.label, 'placeholder="ex. coproscopie, radio, échographie" autocomplete="off"'))}</div>
    <div class="grid2">${fld('Date', inp('f_date', s.date, 'type="date" required'))}${grp('Statut', chips('statut', [{ v: 'fait', l: 'Fait' }, { v: 'prevu', l: 'Prévu' }], statut0))}</div>
    ${ex && ex.statut === 'prevu' ? `<button type="button" class="btn" id="b_done">${ic('check', 'sm')}Marquer fait aujourd'hui</button>` : ''}
    <div class="grid2">${fld('Praticien', inp('f_prat', s.praticien, 'list="dl-prat" autocomplete="off"'))}${fld('Produit', inp('f_prod', s.produit, 'list="dl-prod" autocomplete="off" placeholder="vaccin, vermifuge…"'))}</div>
    <div class="grid2">${fld('Coût (€)', inp('f_cout', s.cout != null ? String(s.cout).replace('.', ',') : '', numAttr))}${fld('Prochain rappel', inp('f_proch', s.prochain, 'type="date"'), 'Vide : calculé selon les réglages')}</div>
    ${fld('Notes', area('f_notes', s.notes, 'rows="2"'))}
    ${dlist('dl-prat', historyValues('soins', 'praticien'))}${dlist('dl-prod', historyValues('soins', 'produit'))}`;
  openSheet(ex ? soinLabel(ex) : 'Soin ou rendez-vous', body, {
    onMount: f => {
      let touched = false;
      f.addEventListener('chipchange', e => {
        if (e.detail.name === 'statut') touched = true;
        if (e.detail.name === 'types') $('#w_label').hidden = !chipVals(f, 'types').includes('autre');
      });
      $('#f_date').addEventListener('change', () => { if (!touched && validISO(val('f_date'))) setChips(f, 'statut', [auto(val('f_date'))]); });
      const b = $('#b_done');
      if (b) b.addEventListener('click', () => {
        if (sync.readOnly) { toast(RO_MSG, { danger: true }); return; }
        put('soins', Object.assign({}, ex, { date: todayISO(), statut: 'fait' })); closeSheet(); toast('Soin marqué comme fait');
      });
    },
    onSubmit: f => {
      const hids = chipVals(f, 'h');
      if (!hids.length) return 'Choisis au moins un cheval.';
      const types = chipVals(f, 'types');
      if (!types.length) return 'Choisis le type de soin.';
      const date = val('f_date');
      if (!validISO(date)) return 'Indique la date.';
      const statut = chipVal(f, 'statut') || auto(date);
      if (statut === 'fait' && date > todayISO()) return 'Un soin fait ne peut pas être daté dans le futur : choisis « Prévu ».';
      const coutRaw = val('f_cout'), cout = parseNum(coutRaw);
      if (coutRaw && cout == null) return 'Le coût doit être un nombre, par exemple 45 ou 45,50.';
      const proch = val('f_proch');
      if (proch && proch <= date) return 'Le prochain rappel doit tomber après la date du soin.';
      const base = { types, label: types.includes('autre') ? val('f_label') : '', date, statut, praticien: val('f_prat'), produit: val('f_prod'), cout, prochain: proch || null, notes: val('f_notes') };
      if (ex) { put('soins', Object.assign({}, ex, base, { horseId: hids[0] })); toast('Soin enregistré'); return; }
      const ids = hids.map(hid => put('soins', Object.assign({ horseId: hid }, base)).id);
      toast(`${statut === 'prevu' ? 'Rendez-vous noté' : 'Soin enregistré'}${ids.length > 1 ? ` pour ${ids.length} chevaux` : ''}`, { undo: () => ids.forEach(i => del('soins', i)) });
    },
    onDelete: ex ? () => { del('soins', ex.id); toast('Soin supprimé'); } : null
  });
}
ACT['edit-soin'] = d => formSoin(d.id);
ACT['all-h'] = () => { const f = $('#sf'); if (f) setChips(f, 'h', chevaux().map(h => h.id)); };
