
/* ---------- Concours : sorties prévues et résultats ---------- */
const plusieursCavaliers = () => new Set(list('concours').map(x => pKey({ uid: x.cavalierUid, nom: x.cavalier })).filter(Boolean)).size > 1;
function ccard(c, showHorse = true) {
  const h = cheval(c.horseId), t = todayISO(), past = c.date < t;
  // le cavalier n'est affiché que si plusieurs personnes sortent en concours
  const cav = (c.cavalier || c.cavalierUid) && plusieursCavaliers() ? nomCourt({ uid: c.cavalierUid, nom: c.cavalier }) : '';
  const meta = [sameYear(c.date) ? '' : c.date.slice(0, 4), c.discipline, nivLabel(c.niveau), c.epreuve, cav].filter(Boolean).join(' · ');
  const pills = past ? '' : engPill(c) + vacCheck(c).filter(i => i.sev !== 'ok').map(i => `<span class="pill ${i.sev}">${ic('alert')}${esc(i.short)}</span>`).join('');
  let res = '';
  if (past) {
    if (c.statut === 'forfait') res = '<span class="pill">Forfait</span>';
    else if (c.rang) res = `<span class="rank">${ordinal(Number(c.rang))}${c.partants ? `<small> / ${c.partants}</small>` : ''}</span>`;
    else if (!hasResult(c)) res = '<span class="pill info">À saisir</span>';
  }
  const hc = showHorse && h ? hchip(h) : '';
  return `<button type="button" class="ccard" data-act="edit-concours" data-id="${c.id}">
    <span class="dblock" aria-hidden="true"><span>${dWeek(c.date)}</span><b>${dDay(c.date)}</b><span>${dMon(c.date)}</span></span>
    <span class="row-main"><span class="row-t">${esc(c.lieu || 'Lieu à préciser')} ${exTag(c)}</span>${meta ? `<span class="row-s">${esc(meta)}</span>` : ''}${past && c.score ? `<span class="row-s">${esc(c.score)}</span>` : ''}${hc || pills ? `<span class="wrap" style="margin-top:4px">${hc}${pills}</span>` : ''}</span>
    ${res ? `<span class="row-end">${res}</span>` : ''}</button>`;
}
VIEWS.concours = () => {
  const t = todayISO(), seg = ui.concSeg === 'resultats' ? 'resultats' : 'avenir';
  const all = list('concours');
  const up = all.filter(c => c.date >= t).sort((a, b) => a.date.localeCompare(b.date) || hNom(a.horseId).localeCompare(hNom(b.horseId)));
  const past = all.filter(c => c.date < t).sort((a, b) => b.date.localeCompare(a.date));
  let html = segCtl('concSeg', [['avenir', `À venir${up.length ? ' · ' + up.length : ''}`], ['resultats', 'Résultats']], seg);
  if (seg === 'avenir') {
    html += up.length ? `<div class="list">${up.map(c => ccard(c)).join('')}</div>`
      : emptyH('Aucun concours prévu', "Ajoute une sortie avec le bouton + : date, lieu, épreuve. Le carnet te rappelle l'engagement et vérifie les vaccins.");
    html += "<p class=\"note\">Vérification des vaccins : rappel grippe de moins de 12 mois (6 mois et 21 jours en FEI), rhinopneumonie en Amateur, Pro et SHF, aucune injection dans les 7 jours avant. La primo-vaccination n'est pas contrôlée.</p>";
  } else if (!past.length) {
    html += emptyH('Aucun résultat', "Les concours passés et leurs classements s'afficheront ici.");
  } else {
    const st = statsConcours();
    html += `<div class="stats"><div class="stat"><b>${st.sorties}</b><span>${pl(st.sorties, 'sortie')}</span></div><div class="stat"><b>${st.podiums}</b><span>${pl(st.podiums, 'podium')}</span></div><div class="stat"><b>${st.victoires}</b><span>${pl(st.victoires, 'victoire')}</span></div></div>`;
    const hs = Array.from(new Set(past.map(c => c.horseId))).map(cheval).filter(Boolean).sort(byName);
    if (hs.length > 1) html += `<div class="list">${hs.map(h => {
      const s = statsConcours(h.id);
      return `<button type="button" class="row" data-act="open-cheval" data-id="${h.id}" data-sub="concours">${av(h, 's')}<span class="row-main"><span class="row-t">${esc(h.nom)}</span><span class="row-s">${s.sorties} ${pl(s.sorties, 'sortie')} · ${s.podiums} ${pl(s.podiums, 'podium')}${s.best ? ` · meilleure place : ${ordTxt(s.best)}` : ''}</span></span><span class="row-end">${ic('next', 'sm')}</span></button>`;
    }).join('')}</div>`;
    html += `<div class="list">${past.map(c => ccard(c)).join('')}</div>`;
  }
  return { title: 'Concours', eyebrow: 'Sorties et résultats', html, fab: () => formConcours(null, {}), fabLabel: 'Nouveau concours' };
};

function formConcours(id, pre = {}) {
  const ex = id ? get('concours', id) : null;
  if (id && !ex) return;
  const hs = chevaux(), all = chevaux(true);
  if (!all.length) { toast("Ajoute d'abord un cheval."); formCheval(null); return; }
  const t = todayISO();
  let c;
  if (ex) c = clone(ex);
  else if (pre.copy) {
    const o = pre.copy;
    c = { date: o.date, dateFin: o.dateFin, lieu: o.lieu, discipline: o.discipline, niveau: o.niveau, epreuve: o.epreuve, cavalier: o.cavalier, cavalierUid: o.cavalierUid || null, statut: 'a_engager', cloture: o.cloture, frais: o.frais, payePar: o.payePar || null };
  } else c = { date: '', discipline: lastUsed('concours', 'discipline') || null, niveau: lastUsed('concours', 'niveau') || null, statut: 'a_engager' };
  const cavRef = c.cavalier || c.cavalierUid ? { uid: c.cavalierUid || null, nom: c.cavalier || '' } : null;
  const selH = ex ? [ex.horseId] : pre.hid ? [pre.hid] : (hs.length === 1 ? [hs[0].id] : []);
  const passe = !!(ex && ex.date <= t);
  const hOpts = horseOpts(ex ? all.filter(h => !h.archive || h.id === ex.horseId) : hs);
  const resultat = `<div class="box" id="w_res"${ex || (validISO(c.date) && c.date <= t) ? '' : ' hidden'}>
      <div class="eyebrow">Résultat</div>
      <div class="grid2">${fld('Classement', inp('f_rang', c.rang, 'inputmode="numeric" autocomplete="off" placeholder="ex. 3"'))}${fld('Partants', inp('f_part', c.partants, 'inputmode="numeric" autocomplete="off"'))}</div>
      ${fld('Score, points ou temps', inp('f_score', c.score, 'autocomplete="off" placeholder="ex. 0 pt, 38,2 s ou 68,5 %"'))}
    </div>`;
  const checks = ex && !passe ? vacCheck(c) : [];
  const worst = checks.some(i => i.sev === 'danger') ? 'danger' : checks.some(i => i.sev === 'warn') ? 'warn' : 'ok';
  const vac = checks.length ? `<div class="box ${worst}"><div class="eyebrow">Vaccins à la date du concours</div>${checks.map(i =>
    `<div class="issue ${i.sev}">${ic(i.sev === 'ok' ? 'check' : 'alert', 'sm')}<span>${esc(i.msg)}</span></div>`).join('')}</div>` : '';
  const body = `
    ${passe ? resultat : ''}
    ${vac}
    ${grp(ex ? 'Cheval' : 'Chevaux', chips('h', hOpts, selH, { multi: !ex }))}
    <div class="grid2">${fld('Date', inp('f_date', c.date, 'type="date" required'))}${fld('Fin (plusieurs jours)', inp('f_fin', c.dateFin, 'type="date"'))}</div>
    ${fld('Lieu', inp('f_lieu', c.lieu, 'list="dl-lieu" autocomplete="off" placeholder="ex. Poitiers"'))}
    ${grp('Discipline', chips('disc', DISCIPLINES.map(x => ({ v: x, l: x })), c.discipline ? [c.discipline] : [], { optional: true }))}
    ${grp('Niveau', chips('niv', NIVEAUX.map(n => ({ v: n.id, l: n.label })), c.niveau ? [c.niveau] : [], { optional: true }), 'Sert à vérifier les vaccins exigés.')}
    ${fld('Épreuve', inp('f_epr', c.epreuve, 'list="dl-epr" autocomplete="off" placeholder="ex. Club 2 Grand Prix"'))}
    ${pickPerson('cav', 'Cavalier', cavRef, { moi: !cavRef, def: lastUsed('concours', 'cavalier') })}
    ${grp('Engagement', chips('eng', ENGAGEMENT.map(e => ({ v: e.id, l: e.label })), c.statut || 'a_engager'))}
    <div class="grid2">${fld('Clôture des engagements', inp('f_clot', c.cloture, 'type="date"'))}${fld('Frais (€)', inp('f_frais', c.frais != null ? String(c.frais).replace('.', ',') : '', numAttr))}</div>
    ${payeField(c.payePar, 'f_frais', Number(c.frais) || 0)}
    ${passe ? '' : resultat}
    ${fld('Notes', area('f_notes', c.notes, 'rows="2" placeholder="Horaires, box, transport…"'))}
    ${ex && !passe ? `<button type="button" class="btn" id="b_dup">${ic('copy', 'sm')}Dupliquer pour un autre cheval ou une autre épreuve</button>` : ''}
    ${dlist('dl-lieu', historyValues('concours', 'lieu'))}${dlist('dl-epr', historyValues('concours', 'epreuve'))}`;
  const title = ex ? (passe && !hasResult(ex) ? 'Saisir le résultat' : (ex.lieu || 'Concours')) : 'Nouveau concours';
  openSheet(title, body, {
    onMount: () => {
      if (!ex) $('#f_date').addEventListener('change', () => { const d = val('f_date'); $('#w_res').hidden = !(validISO(d) && d <= todayISO()); });
      const b = $('#b_dup');
      if (b) b.addEventListener('click', () => formConcours(null, { copy: ex }));
    },
    onSubmit: f => {
      const hids = chipVals(f, 'h');
      if (!hids.length) return 'Choisis au moins un cheval.';
      const date = val('f_date');
      if (!validISO(date)) return 'Indique la date du concours.';
      const fin = val('f_fin');
      if (fin && fin < date) return 'La date de fin doit suivre la date de début.';
      const clot = val('f_clot');
      if (clot && clot > date) return 'La clôture des engagements doit précéder le concours.';
      const frais = parseNum(val('f_frais'));
      if (val('f_frais') && frais == null) return 'Les frais doivent être un nombre.';
      const rang = parseNum(val('f_rang')), part = parseNum(val('f_part'));
      if (val('f_rang') && (!Number.isInteger(rang) || rang < 1)) return 'Le classement est un nombre entier : 1 pour le premier.';
      if (val('f_part') && (!Number.isInteger(part) || part < 1)) return 'Le nombre de partants est un nombre entier.';
      if (rang && part && rang > part) return 'Le classement ne peut pas dépasser le nombre de partants.';
      const cav = readPerson('cav');
      const base = {
        date, dateFin: fin || null, lieu: val('f_lieu'), discipline: chipVal(f, 'disc'), niveau: chipVal(f, 'niv'), epreuve: val('f_epr'),
        cavalier: cav ? cav.nom : '', cavalierUid: cav ? cav.uid : null, statut: chipVal(f, 'eng') || 'a_engager', cloture: clot || null, frais, payePar: lirePaye(frais),
        rang: rang || null, partants: part || null, score: val('f_score'), notes: val('f_notes')
      };
      if (ex) { put('concours', Object.assign({}, ex, base, { horseId: hids[0] })); toast(hasResult(base) && !hasResult(ex) ? 'Résultat enregistré' : 'Concours enregistré'); return; }
      const ids = hids.map(hid => put('concours', Object.assign({ horseId: hid }, base)).id);
      toast(`Concours ajouté${ids.length > 1 ? ` pour ${ids.length} chevaux` : ''}`, { undo: () => ids.forEach(i => del('concours', i)) });
    },
    onDelete: ex ? () => { del('concours', id); toast('Concours supprimé'); } : null
  });
}
ACT['edit-concours'] = d => formConcours(d.id);
