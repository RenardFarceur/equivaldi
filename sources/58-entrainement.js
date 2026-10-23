
/* ---------- Entraînement : séances faites ou prévues ---------- */
function seanceRow(s, showHorse = false) {
  const t = todayISO(), h = cheval(s.horseId), prevu = s.statut === 'prevu';
  const title = [s.type || 'Séance', durTxt(s.duree)].filter(Boolean).join(' · ');
  const cav = nomDe({ uid: s.cavalierUid, nom: s.cavalier });
  const who = [prevu && s.heure ? heureTxt(s.heure) : '', s.coach ? `Coach : ${s.coach}` : '', cav ? `Cavalier : ${cav}` : '', s.lieu].filter(Boolean).join(' · ');
  const pills = [
    prevu ? (s.date < t ? '<span class="pill warn">À confirmer</span>' : '<span class="pill info">Prévue</span>') : '',
    s.intensite ? `<span class="pill">${esc(intLabel(s.intensite))}</span>` : '',
    !prevu && s.ressenti ? `<span class="pill ${s.ressenti === 'difficile' ? 'warn' : s.ressenti === 'moyen' ? '' : 'ok'}">${esc(resLabel(s.ressenti))}</span>` : '',
    showHorse && h ? hchip(h) : ''
  ].join('');
  return `<button type="button" class="ccard" data-act="edit-seance" data-id="${s.id}">
    <span class="dblock" aria-hidden="true"><span>${dWeek(s.date)}</span><b>${dDay(s.date)}</b><span>${dMon(s.date)}</span></span>
    <span class="row-main"><span class="row-t">${esc(title)}</span>${who ? `<span class="row-s">${esc(who)}</span>` : ''}${s.notes ? `<span class="row-s clamp2">${esc(s.notes)}</span>` : ''}${pills ? `<span class="wrap" style="margin-top:4px">${pills}</span>` : ''}</span>
  </button>`;
}
function entrainementHtml(h) {
  const t = todayISO(), st = statsSeances(h.id), ss = seancesDe(h.id);
  if (!ss.length) return emptyH('Aucune séance', "Note le travail du jour ou prévois un cours avec ton coach : type, durée, intensité, cavalier, coach, ressenti.")
    + (sync.readOnly ? '' : `<button type="button" class="btn primary" data-act="new" data-what="seance" data-hid="${h.id}">${ic('plus', 'sm')}Ajouter une séance</button>`);
  const repos = st.last ? diffDays(st.last.date, t) : null;
  const stats = `<div class="stats">
    <div class="stat"><b>${st.n7}</b><span>${pl(st.n7, 'séance')} sur 7 jours</span></div>
    <div class="stat"><b>${st.min7 ? durTxt(st.min7) : '0'}</b><span>de travail sur 7 jours</span></div>
    <div class="stat"><b>${repos == null ? '–' : repos + ' j'}</b><span>${repos == null ? 'pas encore de séance faite' : 'depuis la dernière séance'}</span></div></div>`;
  const up = ss.filter(s => s.statut === 'prevu').sort((a, b) => a.date.localeCompare(b.date) || String(a.heure || '').localeCompare(String(b.heure || '')));
  const past = ss.filter(s => s.statut !== 'prevu').sort((a, b) => b.date.localeCompare(a.date) || (b.maj || 0) - (a.maj || 0));
  return stats
    + (up.length ? section('Prévues', `<div class="list">${up.map(s => seanceRow(s)).join('')}</div>`) : '')
    + (past.length ? section('Historique', `<div class="list">${past.slice(0, 60).map(s => seanceRow(s)).join('')}</div>`) : '');
}

function formSeance(id, pre = {}) {
  const ex = id ? get('seances', id) : null;
  if (id && !ex) return;
  const hs = chevaux(), all = chevaux(true);
  if (!all.length) { toast("Ajoute d'abord un cheval."); formCheval(null); return; }
  const t = todayISO();
  const s = ex ? clone(ex) : { date: t, type: null };
  const selH = ex ? [ex.horseId] : pre.hid ? [pre.hid] : (hs.length === 1 ? [hs[0].id] : []);
  const auto = d => (d > todayISO() ? 'prevu' : 'fait');
  const statut0 = ex ? (ex.statut === 'prevu' ? 'prevu' : 'fait') : auto(s.date);
  const hOpts = horseOpts(ex ? all.filter(h => !h.archive || h.id === ex.horseId) : hs);
  const lieux = Array.from(new Set([...historyValues('seances', 'lieu'), ...LIEUX]));
  const body = `
    ${grp(ex ? 'Cheval' : 'Chevaux', chips('h', hOpts, selH, { multi: !ex }))}
    <div class="grid2">${fld('Date', inp('f_date', s.date, 'type="date" required'))}${fld('Heure', inp('f_heure', s.heure, 'type="time"'), 'Facultatif.')}</div>
    ${grp('Statut', chips('statut', [{ v: 'fait', l: 'Faite' }, { v: 'prevu', l: 'Prévue' }], statut0))}
    ${ex && ex.statut === 'prevu' ? `<button type="button" class="btn" id="b_done">${ic('check', 'sm')}Marquer faite</button>` : ''}
    ${grp('Type de travail', chips('type', TYPES_SEANCE.map(x => ({ v: x, l: x })), s.type ? [s.type] : []))}
    ${fld('Durée (minutes)', inp('f_duree', s.duree, 'inputmode="numeric" autocomplete="off" placeholder="ex. 45"'))}
    <div class="wrap">${DUREES.map(m => `<button type="button" class="chip" data-act="fill" data-target="f_duree" data-fill="${m}">${durTxt(m)}</button>`).join('')}</div>
    ${grp('Intensité', chips('int', INTENSITES.map(x => ({ v: x.id, l: x.label })), s.intensite ? [s.intensite] : [], { optional: true }))}
    ${fld('Coach (s\'il y en a un)', inp('f_coach', s.coach, 'list="dl-coach" autocomplete="off" autocapitalize="words"'), 'Laisse vide pour une séance sans coach.')}
    ${pickPerson('cav', 'Cavalier', ex && (s.cavalier || s.cavalierUid) ? { uid: s.cavalierUid || null, nom: s.cavalier || '' } : null, { moi: !ex, def: lastUsed('seances', 'cavalier') })}
    ${fld('Lieu', inp('f_lieu', s.lieu, 'list="dl-lieux" autocomplete="off" placeholder="Carrière, manège, extérieur…"'))}
    ${fld('Contenu, objectifs', area('f_notes', s.notes, 'rows="3" placeholder="ex. transitions, épaule en dedans, gymnastique à 1 m"'))}
    <div id="w_res"${statut0 === 'fait' ? '' : ' hidden'}>${grp('Ressenti', chips('res', RESSENTIS.map(x => ({ v: x.id, l: x.label })), s.ressenti ? [s.ressenti] : [], { optional: true }))}</div>
    ${fld('Prix du cours (€)', inp('f_cout', s.cout != null ? String(s.cout).replace('.', ',') : '', numAttr), 'Facultatif.')}
    ${payeField(s.payePar, 'f_cout', Number(s.cout) || 0)}
    ${dlist('dl-coach', historyValues('seances', 'coach'))}${dlist('dl-lieux', lieux)}`;
  openSheet(ex ? (ex.statut === 'prevu' ? 'Séance prévue' : 'Séance') : 'Séance de travail', body, {
    onMount: f => {
      let touched = false;
      const showRes = () => { $('#w_res').hidden = (chipVal(f, 'statut') || auto(val('f_date'))) !== 'fait'; };
      f.addEventListener('chipchange', e => { if (e.detail.name === 'statut') { touched = true; showRes(); } });
      $('#f_date').addEventListener('change', () => {
        if (!touched && validISO(val('f_date'))) setChips(f, 'statut', [auto(val('f_date'))]);
        showRes();
      });
      const b = $('#b_done');
      if (b) b.addEventListener('click', () => {
        setChips(f, 'statut', ['fait']);
        if (val('f_date') > todayISO()) $('#f_date').value = todayISO();
        touched = true;
        showRes();
        b.hidden = true;
        toast('Ajoute le ressenti si tu veux, puis Enregistrer.');
      });
    },
    onSubmit: f => {
      const hids = chipVals(f, 'h');
      if (!hids.length) return 'Choisis au moins un cheval.';
      const date = val('f_date');
      if (!validISO(date)) return 'Indique la date.';
      const statut = chipVal(f, 'statut') || auto(date);
      if (statut === 'fait' && date > todayISO()) return 'Une séance faite ne peut pas être datée dans le futur : choisis « Prévue ».';
      const type = chipVal(f, 'type');
      if (!type) return 'Choisis le type de travail.';
      const dRaw = val('f_duree'), duree = parseNum(dRaw);
      if (dRaw && (!duree || duree <= 0 || duree > 600)) return 'La durée se note en minutes, par exemple 45.';
      const coutRaw = val('f_cout'), cout = parseNum(coutRaw);
      if (coutRaw && (cout == null || cout < 0)) return 'Le prix doit être un nombre, par exemple 35.';
      const heure = val('f_heure'), cav = readPerson('cav');
      const base = {
        date, heure: /^\d{2}:\d{2}$/.test(heure) ? heure : null, statut, type, duree: duree ? Math.round(duree) : null,
        intensite: chipVal(f, 'int'), coach: val('f_coach'), cavalier: cav ? cav.nom : '', cavalierUid: cav ? cav.uid : null, lieu: val('f_lieu'), notes: val('f_notes'),
        ressenti: statut === 'fait' ? chipVal(f, 'res') : null, cout, payePar: lirePaye(cout)
      };
      if (ex) { put('seances', Object.assign({}, ex, base, { horseId: hids[0] })); toast('Séance enregistrée'); return; }
      const ids = hids.map(hid => put('seances', Object.assign({ horseId: hid }, base)).id);
      toast(`${statut === 'prevu' ? 'Séance prévue' : 'Séance notée'}${ids.length > 1 ? ` pour ${ids.length} chevaux` : ''}`, { undo: () => ids.forEach(i => del('seances', i)) });
    },
    onDelete: ex ? () => { const prev = clone(ex); del('seances', ex.id); toast('Séance supprimée', { undo: () => put('seances', prev) }); } : null
  });
}
ACT['edit-seance'] = d => formSeance(d.id);
