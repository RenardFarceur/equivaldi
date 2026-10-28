
/* ---------- Tâches partagées : chacun coche, tout le monde voit ---------- */
function tacheSub(tk, e) {
  const pre = tk.preId ? get('pres', tk.preId) : null, h = tk.horseId ? cheval(tk.horseId) : null;
  const qui = tk.resp && pKey(tk.resp) ? (estMoi(tk.resp) ? 'Pour toi' : 'Pour ' + nomCourt(tk.resp)) : '';
  const where = [qui, pre ? pre.nom : '', h ? h.nom : ''].filter(Boolean).join(' · ');
  let st;
  if (e.done) st = faitTxt(e.last) + (e.n > 1 && e.next ? ` · à refaire ${dRel(e.next)}` : '');
  else if (tk.freq === 'une') st = e.due ? (e.days < 0 ? `En retard de ${nJ(-e.days)}` : `À faire ${dRel(e.due)}`) : 'À faire';
  else if (e.last) st = (e.retard > 0 ? `En retard de ${nJ(e.retard)} · ` : '') + `Dernière fois ${dRel(e.last.d)}${nomsFait(e.last) ? ', ' + nomsFait(e.last) : ''}`;
  else st = freqLabel(tk);
  return [where, st].filter(Boolean).join(' · ');
}
function trow(tk) {
  const e = tacheEtat(tk);
  const late = !e.done && e.retard > 0;
  return `<div class="trow${e.done ? ' done' : ''}${late ? ' late' : ''}" data-key="tk-${esc(tk.id)}">
    <button type="button" class="tick" data-act="tick" data-id="${tk.id}" aria-pressed="${e.done}" aria-label="${esc(tk.titre)} : ${e.done ? 'fait, toucher pour annuler' : 'marquer comme fait'}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path pathLength="1" d="M5.5 12.8 10 17.2 18.8 7.2"/></svg></button>
    <button type="button" class="trow-main" data-act="edit-tache" data-id="${tk.id}"><span class="row-t">${esc(tk.titre)}</span><span class="row-s">${esc(tacheSub(tk, e))}</span></button>
    ${trowFin(tk, e)}
  </div>`;
}
/* À droite : ce que rapporte la tâche ; une fois faite, qui l'a faite (toucher pour ajouter quelqu'un) */
function trowFin(tk, e) {
  if (!e.done) return `<span class="trow-pts" title="Rapporte ${ptsTache(tk)} crottins, partagés si vous la faites à plusieurs">+${ptsTache(tk)}${crottinSvg()}</span>`;
  const qui = faitPar(e.last), noms = esc(nomsFait(e.last));
  if (qui.length > 1) {
    const avs = qui.slice(0, 3).map(r => pav(r, 's')).join('') + (qui.length > 3 ? `<span class="av pp s plus" aria-hidden="true">+${qui.length - 3}</span>` : '');
    return sync.readOnly ? `<span class="trow-avec" role="img" aria-label="Faite par ${noms}">${avs}</span>`
      : `<button type="button" class="trow-avec" data-act="tache-qui" data-id="${tk.id}" aria-label="Faite par ${noms} : modifier">${avs}</button>`;
  }
  if (sync.readOnly || membres().length === 1) return '';
  return `<button type="button" class="trow-avec seul" data-act="tache-qui" data-id="${tk.id}" aria-label="Faite à plusieurs ? Ajouter quelqu'un">${ic('avec')}</button>`;
}
function tachesTriees(filter) {
  const xs = taches().filter(filter || (() => true)).map(tk => ({ tk, e: tacheEtat(tk) })).filter(x => x.e.visible);
  // juste après une coche, la liste garde son ordre le temps de l'animation, puis la ligne glisse à sa place
  if (fx.ordre && Date.now() < fx.jusqua) {
    const pos = new Map(fx.ordre.map((id, i) => [id, i]));
    return xs.sort((a, b) => (pos.has(a.tk.id) ? pos.get(a.tk.id) : 999) - (pos.has(b.tk.id) ? pos.get(b.tk.id) : 999));
  }
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
    return section('Tâches', `<div class="empty illu">${brandMark()}<b>Aucune tâche</b>Ajoute les gestes du quotidien : chacun coche quand c'est fait et tout le monde le voit, pour ne rien faire deux fois.${sugg}</div>`, add);
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
const toutFait = () => { const xs = tachesTriees(); return xs.length > 0 && xs.every(x => x.e.done); };
/* Fige l'ordre des tâches un instant, puis laisse les lignes glisser à leur place */
function figeOrdre() {
  fx.ordre = tachesTriees().map(x => x.tk.id);
  fx.jusqua = Date.now() + 1100;
  setTimeout(rerenderSoon, 1150);
}
const aN = n => ({ 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six' })[n] || String(n);
/* Cocher : par défaut au nom de la personne du téléphone ; « qui » quand la tâche a été faite à plusieurs
   (la première personne est enregistrée dans par/uid, les autres dans avec) */
function cocher(id, qui = null) {
  const go = refs => {
    const cur = get('taches', id);
    if (!cur || !refs.length) return;
    const prev = clone(cur), avant = toutFait();
    const f = { d: todayISO(), t: Date.now(), par: refs[0].nom, uid: refs[0].uid || null, pts: ptsTache(cur) };
    if (refs.length > 1) f.avec = refs.slice(1).map(r => ({ uid: r.uid || null, nom: r.nom }));
    figeOrdre();
    put('taches', Object.assign({}, cur, garderFaits(cur, [f, ...faitsDe(cur)])));
    render();
    // la coche se dessine, rebondit et lâche une gerbe de crins
    $$(`.tick[data-id="${CSS.escape(cur.id)}"]`).forEach(el => { fxOnce(el, 'fx-coche', 700); confettis(el); });
    vibre(12);
    if (!avant && toutFait()) {
      // le galop de fête passe après la pluie de crottins
      setTimeout(galop, ui.crotAnim === 'discret' || !mouvementOk() ? 350 : 2900);
      toast("Tout est fait pour aujourd'hui, bravo !", { fete: true, undo: () => put('taches', prev) });
    } else toast(refs.length > 1 ? `${cur.titre} : fait à ${aN(refs.length)}` : `${cur.titre} : fait`, { undo: () => put('taches', prev) });
  };
  if (qui) go(qui); else withName(nom => go([{ uid: me.uid || null, nom }]));
}
ACT.tick = d => {
  if (Date.now() - appuiLong < 900) return;   // l'appui long vient d'ouvrir « Qui l'a faite ? »
  const tk = get('taches', d.id);
  if (!tk) return;
  if (tacheEtat(tk).done) {
    const prev = clone(tk);
    figeOrdre();
    put('taches', Object.assign({}, tk, { fait: faitsDe(tk).slice(1) }));
    toast('Coche retirée', { undo: () => put('taches', prev) });
    return;
  }
  cocher(d.id);
};
/* Appui long sur une case : choisir qui a fait la tâche (à plusieurs, les crottins se partagent) */
let appuiLong = 0;
document.addEventListener('pointerdown', ev => {
  const b = ev.target.closest && ev.target.closest('.tick[data-act="tick"]');
  if (!b || ev.button > 0 || sync.readOnly) return;
  const x0 = ev.clientX, y0 = ev.clientY;
  function fin() {
    clearTimeout(t);
    document.removeEventListener('pointerup', fin, true);
    document.removeEventListener('pointercancel', fin, true);
    document.removeEventListener('pointermove', bouge, true);
  }
  function bouge(e) { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) fin(); }
  const t = setTimeout(() => { fin(); appuiLong = Date.now(); vibre(18); formQui(b.dataset.id); }, 480);
  document.addEventListener('pointerup', fin, true);
  document.addEventListener('pointercancel', fin, true);
  document.addEventListener('pointermove', bouge, true);
});
document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.tick')) e.preventDefault(); });

/* « Qui l'a faite ? » : avant de cocher (appui long) ou après coup (bouton à droite de la tâche faite) */
function formQui(id) {
  const tk = get('taches', id);
  if (!tk) return;
  if (sync.readOnly) { toast(RO_MSG, { danger: true }); return; }
  const e = tacheEtat(tk), f0 = e.done ? e.last : null;
  const moi = { uid: me.uid || null, nom: moiNom() };
  const qui0 = f0 ? faitPar(f0) : (pKey(moi) ? [moi] : []);
  const pot = f0 && Number.isFinite(f0.pts) ? f0.pts : ptsTache(tk);
  // les personnes proposées : l'équipe (ou les prénoms déjà connus), plus celles déjà notées sur la coche
  const opts = [], vus = new Set();
  const ajoute = r => { const k = pKey(r); if (k && !vus.has(k)) { vus.add(k); opts.push({ k, r }); } };
  const ms = membres();
  if (ms.length) ms.forEach(m => ajoute({ uid: m.id, nom: mNom(m) })); else nomsConnus().forEach(n => ajoute({ uid: null, nom: n }));
  qui0.forEach(ajoute);
  const body = `<div class="bq-confirm"><span class="qa-ic menthe">${ic('avec')}</span><p><b>${esc(tk.titre)}</b><br><small>${esc(f0 ? faitTxt(f0) : freqLabel(tk))}</small></p></div>
    ${grp('Qui l’a faite ?', chips('qui', opts.map(o => ({ v: o.k, html: `${pav(o.r, 's')}<span>${esc(nomCourt(o.r))}</span>` })), qui0.map(r => pKey(r)), { multi: true })
      + `<div class="qui-autre">${inp('f_qui_autre', '', 'autocomplete="off" autocapitalize="words" placeholder="Quelqu’un d’autre ? Son prénom" aria-label="Ajouter une autre personne"')}</div>`)}
    <p class="note crot-note" id="w_part"></p>
    ${f0 ? '<p class="note">Astuce : un appui long sur la case permet de choisir qui l’a faite avant de cocher.</p>' : ''}`;
  const lire = f => {
    const ks = new Set(chipVals(f, 'qui')), refs = [];
    const prend = r => { const k = pKey(r); if (k && ks.has(k) && !refs.some(x => pKey(x) === k)) refs.push(r); };
    qui0.forEach(prend);              // ceux déjà notés gardent leur place (la personne qui a coché en tête)
    opts.forEach(o => prend(o.r));
    const autre = val('f_qui_autre').replace(/\s+/g, ' ').trim();
    if (autre) {
      const m = refMembre({ nom: autre }), r = m ? { uid: m.id, nom: mNom(m) } : { uid: null, nom: autre };
      if (!refs.some(x => pKey(x) === pKey(r))) refs.push(r);
    }
    return refs;
  };
  openSheet(f0 ? 'Qui l’a faite ?' : 'Cocher à plusieurs', body, {
    submit: f0 ? 'Enregistrer' : 'C’est fait', local: true,
    onMount: f => {
      const maj = () => {
        const n = lire(f).length;
        $('#w_part').innerHTML = !n ? 'Choisis au moins une personne.'
          : n === 1 ? `${crottinSvg('s')}<b>${pot} ${pl(pot, 'crottin')}</b> pour cette personne.`
          : `${crottinSvg('s')}Les ${pot} crottins se partagent : <b>${partTache(pot, n)} chacun</b>.`;
      };
      f.addEventListener('chipchange', maj);
      $('#f_qui_autre').addEventListener('input', maj);
      maj();
    },
    onSubmit: f => {
      const refs = lire(f);
      if (!refs.length) return 'Choisis au moins une personne.';
      if (!f0) { setTimeout(() => cocher(id, refs), 0); return; }
      if (refs.map(r => pKey(r)).join('|') === qui0.map(r => pKey(r)).join('|')) return;
      const cur = get('taches', id), fs = cur ? faitsDe(cur) : [];
      const i = fs.findIndex(x => x.d === f0.d && (x.t || 0) === (f0.t || 0));
      if (i < 0) return 'Cette coche a changé entre-temps : rouvre la tâche.';
      const nf = Object.assign({}, fs[i], { par: refs[0].nom, uid: refs[0].uid || null });
      if (refs.length > 1) nf.avec = refs.slice(1).map(r => ({ uid: r.uid || null, nom: r.nom })); else delete nf.avec;
      const prev = clone(cur), nfs = fs.slice();
      nfs[i] = nf;
      // déjà compté pour moi : on ajuste en douceur ; si je me rajoute, c'est un vrai gain
      const dedans = rs => rs.some(r => estMoi(r));
      crotDoux = dedans(qui0);
      put('taches', Object.assign({}, cur, { fait: nfs }));
      toast(refs.length > 1 ? `${cur.titre} : fait à ${aN(refs.length)}, ${partTache(pot, refs.length)} crottins chacun` : `${cur.titre} : fait par ${nomCourt(refs[0])}`,
        { undo: () => { crotDoux = dedans(refs); put('taches', prev); } });
    }
  });
}
ACT['tache-qui'] = d => formQui(d.id);
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
    `<div class="row"><div class="row-main"><div class="row-t">${esc(nomsFait(f) || "Quelqu'un")}</div><div class="row-s">${esc(dFull(f.d))}${f.t ? ' · ' + hTxt(f.t) : ''}</div></div></div>`).join('')}</div>`) : '';
  const body = `
    ${fld('Tâche', inp('f_titre', tk.titre, 'required autocomplete="off" autocapitalize="sentences" placeholder="ex. Foin du matin"'))}
    ${ex ? '' : `<div class="wrap">${TACHES_SUGG.map(s => `<button type="button" class="chip" data-act="fill" data-target="f_titre" data-fill="${esc(s.titre)}">${esc(s.titre)}</button>`).join('')}</div>`}
    ${grp('Fréquence', chips('freq', [{ v: 'jour', l: 'Chaque jour' }, { v: 'jours', l: 'Tous les … jours' }, { v: 'une', l: 'Une seule fois' }], tk.freq || 'jour'))}
    <div id="w_n"${tk.freq === 'jours' ? '' : ' hidden'}>${fld('Tous les combien de jours ?', inp('f_n', tk.n || 3, 'inputmode="numeric" autocomplete="off"'), '7 pour une fois par semaine.')}</div>
    <div id="w_date"${tk.freq === 'une' ? '' : ' hidden'}>${fld('À faire le', inp('f_date', tk.date, 'type="date"'), 'Facultatif.')}</div>
    ${ps.length ? grp('Pré', chips('pre', ps.map(p => ({ v: p.id, l: p.nom })), tk.preId ? [tk.preId] : [], { optional: true }), 'Facultatif.') : ''}
    ${hs.length ? grp('Cheval', chips('h', horseOpts(hs), tk.horseId ? [tk.horseId] : [], { optional: true }), 'Facultatif.') : ''}
    ${pickPerson('resp', "Qui s'en charge", tk.resp || null, { autre: false, hint: "Facultatif. Vide : toute l'équipe." })}
    ${grp('Effort', chips('effort', EFFORTS.map(x => ({ v: x.id, l: x.label })), tk.effort || 'normal'), '<span id="w_pts"></span>')}
    ${fld('Consignes', area('f_notes', tk.notes, 'rows="2" placeholder="ex. 2 rounds dans le râtelier, vérifier le niveau d\'eau"'))}
    ${hist}`;
  openSheet(ex ? 'Tâche' : 'Nouvelle tâche', body, {
    focus: ex ? null : '#f_titre',
    onMount: f => {
      // aperçu : ce que rapporte la tâche à chaque fois, selon la fréquence et l'effort
      const apercu = () => {
        const p = ptsTache({ freq: chipVal(f, 'freq') || 'jour', n: parseNum(val('f_n')), effort: chipVal(f, 'effort') || 'normal' });
        $('#w_pts').innerHTML = `Rapporte <b>${p} crottins</b> à chaque fois.`;
      };
      f.addEventListener('chipchange', e => {
        if (e.detail.name === 'freq') {
          const v = chipVal(f, 'freq');
          $('#w_n').hidden = v !== 'jours';
          $('#w_date').hidden = v !== 'une';
        }
        apercu();
      });
      $('#f_n').addEventListener('input', apercu);
      apercu();
    },
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
      Object.assign(tk, { titre, freq, n, date: validISO(date) ? date : null, preId: chipVal(f, 'pre'), horseId: chipVal(f, 'h'), resp: readPerson('resp'), effort: chipVal(f, 'effort') || 'normal', notes: val('f_notes') });
      if (!Array.isArray(tk.fait)) tk.fait = [];
      put('taches', tk);
      toast(ex ? 'Tâche enregistrée' : 'Tâche ajoutée');
    },
    onDelete: ex ? () => {
      const prev = clone(ex);
      // déjà cochée : on la retire de la liste mais son historique (et les crottins gagnés) reste
      if (faitsDe(ex).length) put('taches', Object.assign({}, ex, { retireLe: Date.now() })); else del('taches', ex.id);
      toast('Tâche supprimée', { undo: () => put('taches', prev) });
    } : null
  });
}
ACT['edit-tache'] = d => formTache(d.id);
