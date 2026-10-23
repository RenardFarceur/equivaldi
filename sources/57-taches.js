
/* ---------- Tâches partagées : chacun coche, tout le monde voit ---------- */
function tacheSub(tk, e) {
  const pre = tk.preId ? get('pres', tk.preId) : null, h = tk.horseId ? cheval(tk.horseId) : null;
  const qui = tk.resp && pKey(tk.resp) ? (estMoi(tk.resp) ? 'Pour toi' : 'Pour ' + nomCourt(tk.resp)) : '';
  const where = [qui, pre ? pre.nom : '', h ? h.nom : ''].filter(Boolean).join(' · ');
  let st;
  if (e.done) st = faitTxt(e.last) + (e.n > 1 && e.next ? ` · à refaire ${dRel(e.next)}` : '');
  else if (tk.freq === 'une') st = e.due ? (e.days < 0 ? `En retard de ${nJ(-e.days)}` : `À faire ${dRel(e.due)}`) : 'À faire';
  else if (e.last) st = (e.retard > 0 ? `En retard de ${nJ(e.retard)} · ` : '') + `Dernière fois ${dRel(e.last.d)}${e.last.par ? ', ' + e.last.par : ''}`;
  else st = freqLabel(tk);
  return [where, st].filter(Boolean).join(' · ');
}
function trow(tk) {
  const e = tacheEtat(tk);
  const late = !e.done && e.retard > 0;
  return `<div class="trow${e.done ? ' done' : ''}${late ? ' late' : ''}">
    <button type="button" class="tick" data-act="tick" data-id="${tk.id}" aria-pressed="${e.done}" aria-label="${esc(tk.titre)} : ${e.done ? 'fait, toucher pour annuler' : 'marquer comme fait'}">${ic('check')}</button>
    <button type="button" class="trow-main" data-act="edit-tache" data-id="${tk.id}"><span class="row-t">${esc(tk.titre)}</span><span class="row-s">${esc(tacheSub(tk, e))}</span></button>
  </div>`;
}
function tachesTriees(filter) {
  const xs = taches().filter(filter || (() => true)).map(tk => ({ tk, e: tacheEtat(tk) })).filter(x => x.e.visible);
  return xs.sort((a, b) => (a.e.done - b.e.done)
    || (a.e.done ? ((b.e.last.t || 0) - (a.e.last.t || 0)) : ((b.e.retard || 0) - (a.e.retard || 0)))
    || String(a.tk.titre).localeCompare(String(b.tk.titre), 'fr'));
}
const tachesListe = xs => `<div class="list">${xs.map(x => trow(x.tk)).join('')}</div>`;
function tachesSection() {
  const xs = tachesTriees();
  const add = sync.readOnly ? '' : `<button type="button" class="link" data-act="new" data-what="tache">${ic('plus', 'sm')}Ajouter</button>`;
  if (!xs.length) {
    if (taches().length) return section('Tâches', empty('Rien en cours', 'Les tâches ponctuelles déjà faites sont rangées. Ajoute-en une nouvelle si besoin.'), add);
    const sugg = sync.readOnly ? '' : `<div class="sugg">${chips('sugg', TACHES_SUGG.map((s, i) => ({ v: String(i), l: s.titre })), [], { multi: true })}</div>
      <button type="button" class="btn primary small" data-act="add-sugg">${ic('plus', 'sm')}Ajouter ces tâches</button>`;
    return section('Tâches', `<div class="empty"><b>Aucune tâche</b>Ajoute les gestes du quotidien : chacun coche quand c'est fait et tout le monde le voit, pour ne rien faire deux fois.${sugg}</div>`, add);
  }
  const nDone = xs.filter(x => x.e.done).length;
  return section(`Tâches <span class="count">${nDone}/${xs.length}</span>`, tachesListe(xs), add);
}

/* Prénom affiché à côté des coches (demandé une fois par téléphone) */
function withName(cb) {
  const n = window.EQ_MODE ? moiNom() : getMoi();
  if (n) { cb(n); return; }
  openSheet('Qui coche ?', fld('Ton prénom', inp('f_moi', me.platformName || '', 'autocomplete="given-name" autocapitalize="words" required'),
    "Il s'affiche à côté des tâches que tu coches, pour que les autres sachent qui les a faites. Il reste sur ce téléphone."), {
    focus: '#f_moi', submit: 'Valider et cocher', local: true,
    onSubmit: () => {
      const v = val('f_moi');
      if (!v) return 'Indique ton prénom.';
      if (v.length > 40) return 'Un prénom court suffit.';
      setMoi(v);
      setTimeout(() => cb(v), 0);
    }
  });
}
ACT.tick = d => {
  const tk = get('taches', d.id);
  if (!tk) return;
  if (tacheEtat(tk).done) {
    const prev = clone(tk);
    put('taches', Object.assign({}, tk, { fait: faitsDe(tk).slice(1) }));
    toast('Coche retirée', { undo: () => put('taches', prev) });
    return;
  }
  withName(nom => {
    const cur = get('taches', d.id);
    if (!cur) return;
    const prev = clone(cur);
    const f = { d: todayISO(), t: Date.now(), par: nom, uid: me.uid || null };
    put('taches', Object.assign({}, cur, { fait: [f, ...faitsDe(cur)].slice(0, 30) }));
    toast(`${cur.titre} : fait`, { undo: () => put('taches', prev) });
  });
};
ACT['add-sugg'] = () => {
  const sel = chipVals(document, 'sugg').map(Number).filter(i => TACHES_SUGG[i]);
  if (!sel.length) { toast('Touche une ou plusieurs tâches pour les choisir.'); return; }
  const ids = sel.map(i => { const s = TACHES_SUGG[i]; return put('taches', { titre: s.titre, freq: s.freq, n: s.n || null, fait: [] }).id; });
  toast(`${ids.length} ${pl(ids.length, 'tâche ajoutée', 'tâches ajoutées')}`, { undo: () => ids.forEach(i => del('taches', i)) });
};

function formTache(id, pre = {}) {
  const ex = id ? get('taches', id) : null;
  if (id && !ex) return;
  const tk = ex ? clone(ex) : { titre: '', freq: 'jour', n: 3, preId: pre.pid || null, horseId: pre.hid || null };
  const ps = pres(), hs = chevaux();
  const fs = ex ? faitsDe(ex).slice(0, 10) : [];
  const hist = fs.length ? grp('Dernières fois', `<div class="list">${fs.map(f =>
    `<div class="row"><div class="row-main"><div class="row-t">${esc(f.par || "Quelqu'un")}</div><div class="row-s">${esc(dFull(f.d))}${f.t ? ' · ' + hTxt(f.t) : ''}</div></div></div>`).join('')}</div>`) : '';
  const body = `
    ${fld('Tâche', inp('f_titre', tk.titre, 'required autocomplete="off" autocapitalize="sentences" placeholder="ex. Foin du matin"'))}
    ${ex ? '' : `<div class="wrap">${TACHES_SUGG.map(s => `<button type="button" class="chip" data-act="fill" data-target="f_titre" data-fill="${esc(s.titre)}">${esc(s.titre)}</button>`).join('')}</div>`}
    ${grp('Fréquence', chips('freq', [{ v: 'jour', l: 'Chaque jour' }, { v: 'jours', l: 'Tous les … jours' }, { v: 'une', l: 'Une seule fois' }], tk.freq || 'jour'))}
    <div id="w_n"${tk.freq === 'jours' ? '' : ' hidden'}>${fld('Tous les combien de jours ?', inp('f_n', tk.n || 3, 'inputmode="numeric" autocomplete="off"'), '7 pour une fois par semaine.')}</div>
    <div id="w_date"${tk.freq === 'une' ? '' : ' hidden'}>${fld('À faire le', inp('f_date', tk.date, 'type="date"'), 'Facultatif.')}</div>
    ${ps.length ? grp('Pré', chips('pre', ps.map(p => ({ v: p.id, l: p.nom })), tk.preId ? [tk.preId] : [], { optional: true }), 'Facultatif.') : ''}
    ${hs.length ? grp('Cheval', chips('h', horseOpts(hs), tk.horseId ? [tk.horseId] : [], { optional: true }), 'Facultatif.') : ''}
    ${pickPerson('resp', "Qui s'en charge", tk.resp || null, { autre: false, hint: "Facultatif. Vide : toute l'équipe." })}
    ${fld('Consignes', area('f_notes', tk.notes, 'rows="2" placeholder="ex. 2 rounds dans le râtelier, vérifier le niveau d\'eau"'))}
    ${hist}`;
  openSheet(ex ? 'Tâche' : 'Nouvelle tâche', body, {
    focus: ex ? null : '#f_titre',
    onMount: f => f.addEventListener('chipchange', e => {
      if (e.detail.name !== 'freq') return;
      const v = chipVal(f, 'freq');
      $('#w_n').hidden = v !== 'jours';
      $('#w_date').hidden = v !== 'une';
    }),
    onSubmit: f => {
      const titre = val('f_titre');
      if (!titre) return 'Indique la tâche, par exemple « Foin du matin ».';
      const freq = chipVal(f, 'freq') || 'jour';
      let n = null;
      if (freq === 'jours') {
        n = parseNum(val('f_n'));
        if (!Number.isInteger(n) || n < 1 || n > 365) return 'Indique un nombre de jours entre 1 et 365.';
      }
      const date = freq === 'une' ? val('f_date') : '';
      Object.assign(tk, { titre, freq, n, date: validISO(date) ? date : null, preId: chipVal(f, 'pre'), horseId: chipVal(f, 'h'), resp: readPerson('resp'), notes: val('f_notes') });
      if (!Array.isArray(tk.fait)) tk.fait = [];
      put('taches', tk);
      toast(ex ? 'Tâche enregistrée' : 'Tâche ajoutée');
    },
    onDelete: ex ? () => { const prev = clone(ex); del('taches', ex.id); toast('Tâche supprimée', { undo: () => put('taches', prev) }); } : null
  });
}
ACT['edit-tache'] = d => formTache(d.id);
