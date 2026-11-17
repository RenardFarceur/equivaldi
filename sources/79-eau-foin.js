
/* ---------- Eau et foin des prés ----------
   Sur chaque pré occupé : « Eau » et « Foin », d'un toucher, avec la dernière fois et qui l'a fait.
   Foin mis : la balle peut sortir du stock en même temps (54-foin.js). Rappel réglable par pré : au-delà,
   une alerte sur l'accueil. Abreuvoir automatique : pas d'eau à suivre.
   Rangé dans la fiche du pré : pres.suivi {eau: {le, d, par}, foin: {le, d, par, balle, nb}},
   pres.suiviHist [{k, le, d, par, balle, nb}] (30 au plus), pres.eauJours, pres.foinJours, pres.eauAuto.
   (Demandé dans le questionnaire, 17/11/2026.) */
const SUIVI = { eau: { l: 'Eau', fait: 'Eau faite', icon: 'drop' }, foin: { l: 'Foin', fait: 'Foin mis', icon: 'bale' } };
const SUIVI_HIST = 30;
const SUIVI_JOURS = [{ v: '', l: 'Pas de rappel' }, { v: '1', l: 'Chaque jour' }, { v: '2', l: 'Tous les 2 jours' }, { v: '3', l: 'Tous les 3 jours' }, { v: '7', l: 'Chaque semaine' }];
const suiviDe = (p, k) => (p && p.suivi && p.suivi[k] && Number.isFinite(p.suivi[k].le) ? p.suivi[k] : null);
const suiviJours = (p, k) => { const n = Number(p && p[k + 'Jours']); return Number.isInteger(n) && n > 0 ? n : null; };
const suiviActif = (p, k) => !(k === 'eau' && p.eauAuto);
const peutSuivre = () => !sync.readOnly && !(typeof estInvite === 'function' && estInvite());
const isoLocal = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* « à 8 h 12 », « hier », « il y a 3 j » */
function quandSuivi(x) {
  const j = diffDays(x.d || isoLocal(x.le), todayISO());
  if (j <= 0) { const d = new Date(x.le); return `à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; }
  return j === 1 ? 'hier' : `il y a ${j} j`;
}
/* En retard ? (rappel réglé, pré occupé) : jamais noté, ou plus vieux que le rappel */
function suiviRetard(p, k, st) {
  const n = suiviJours(p, k);
  if (!n || !suiviActif(p, k) || !(st || preStatus(p)).occupe) return false;
  const x = suiviDe(p, k);
  return !x || diffDays(x.d || isoLocal(x.le), todayISO()) >= n;
}

/* Les deux boutons, sur la carte d'un pré occupé (53-pres.js) */
function suiviBoutons(p, st) {
  if (!st.occupe) return '';
  const ks = Object.keys(SUIVI).filter(k => suiviActif(p, k));
  if (!ks.length) return '';
  const actif = peutSuivre();
  return `<div class="suivi">${ks.map(k => {
    const x = suiviDe(p, k), retard = suiviRetard(p, k, st);
    const quand = x ? quandSuivi(x) : 'à noter';
    const lab = `${SUIVI[k].l} · ${x ? `fait ${quand}` : 'pas encore noté'}${retard ? ' · en retard' : ''}`;
    return `<${actif ? 'button type="button"' : 'div'} class="suivi-b${retard ? ' retard' : ''}${x && !retard && diffDays(x.d || isoLocal(x.le), todayISO()) <= 0 ? ' ok' : ''}" ${actif ? `data-act="pre-${k}" data-id="${p.id}"` : ''} aria-label="${esc(lab)}${actif ? ` : toucher pour noter ${k === 'eau' ? "l'eau faite" : 'le foin mis'}` : ''}">
      <span class="suivi-ic">${ic(SUIVI[k].icon, 'sm')}</span><span class="suivi-t"><b>${SUIVI[k].l}</b><span>${esc(quand)}</span></span>${actif ? `<span class="suivi-plus" aria-hidden="true">${ic(x && !retard && diffDays(x.d || isoLocal(x.le), todayISO()) <= 0 ? 'check' : 'plus', 'sm')}</span>` : ''}</${actif ? 'button' : 'div'}>`;
  }).join('')}</div>`;
}

/* Noter : l'eau d'un toucher ; le foin d'un toucher aussi, ou avec la balle qui sort du stock */
function noterSuivi(pid, k, extra = {}) {
  const p = get('pres', pid);
  if (!p) return null;
  const prev = clone(p), now = Date.now();
  const x = Object.assign({ le: now, d: todayISO(), par: moiRef() }, extra);
  const hist = (Array.isArray(p.suiviHist) ? p.suiviHist : []).slice();
  hist.unshift(Object.assign({ k }, x));
  put('pres', Object.assign({}, p, { suivi: Object.assign({}, p.suivi || {}, { [k]: x }), suiviHist: hist.slice(0, SUIVI_HIST) }));
  vibre(10);
  return prev;
}
ACT['pre-eau'] = d => {
  if (!peutSuivre()) { toast(roMsg(), { danger: true }); return; }
  const p = get('pres', d.id);
  if (!p) return;
  const prev = noterSuivi(p.id, 'eau');
  render();
  $$(`.suivi-b[data-act="pre-eau"][data-id="${CSS.escape(p.id)}"]`).forEach(el => fxOnce(el, 'fx-pop', 450));
  toast(`${p.nom} : eau faite`, { undo: () => put('pres', prev) });
};
ACT['pre-foin'] = d => {
  if (!peutSuivre()) { toast(roMsg(), { danger: true }); return; }
  const p = get('pres', d.id);
  if (!p) return;
  const xs = rub('foin') ? Object.values(stock().by).filter(x => x.n > 0) : [];
  // pas de stock de foin suivi : un toucher suffit
  if (!xs.length) {
    const prev = noterSuivi(p.id, 'foin');
    render();
    $$(`.suivi-b[data-act="pre-foin"][data-id="${CSS.escape(p.id)}"]`).forEach(el => fxOnce(el, 'fx-pop', 450));
    toast(`${p.nom} : foin mis`, { undo: () => put('pres', prev) });
    return;
  }
  // sinon : quelle balle ? (la même que la dernière fois dans ce pré, proposée d'office)
  const der = suiviDe(p, 'foin'), defaut = der && der.balle && xs.some(x => x.b.id === der.balle) ? der.balle : xs.length === 1 ? xs[0].b.id : '';
  openSheet(`Foin mis · ${p.nom}`, `
    ${grp('Sortie du stock', chips('fballe', xs.map(x => ({ v: x.b.id, html: `<span class="two"><span>${esc(x.b.nom)}</span><small>${x.n} en stock</small></span>` })).concat([{ v: 'aucune', l: 'Sans toucher au stock' }]), defaut || 'aucune'),
      'Une balle entamée sort du stock : le carnet en déduit ta consommation.')}
    ${fld('Combien ?', inp('f_fnb', der && der.nb ? der.nb : 1, 'inputmode="numeric" autocomplete="off"'))}`, {
    submit: 'Foin mis', local: true,
    onSubmit: f => {
      const balle = chipVal(f, 'fballe') || 'aucune';
      let nb = null, mvt = null;
      if (balle !== 'aucune') {
        nb = parseNum(val('f_fnb'));
        if (!nb || nb <= 0 || !Number.isInteger(nb)) return 'Indique un nombre de balles entier.';
        const dispo = (stock().by[balle] || {}).n || 0;
        if (nb > dispo) return `Il ne reste que ${dispo} ${balleNom(balle, 2)} en stock.`;
        mvt = put('foin', { date: todayISO(), sens: 'out', balle, nb, origine: '', notes: `Mis au pré : ${p.nom}`, preId: p.id });
      }
      const prev = noterSuivi(p.id, 'foin', balle !== 'aucune' ? { balle, nb } : {});
      closeSheet(); render();
      const reste = balle !== 'aucune' ? (stock().by[balle] || {}).n : null;
      toast(balle !== 'aucune' ? `${p.nom} : ${nb} ${balleNom(balle, nb)} · reste ${reste}` : `${p.nom} : foin mis`, { undo: () => { put('pres', prev); if (mvt) del('foin', mvt.id); } });
      return false;
    }
  });
};
WRITE_ACTS.add('pre-eau'); WRITE_ACTS.add('pre-foin');

/* Fiche du pré : la dernière fois, qui, le rappel, l'historique */
function suiviSection(p) {
  const st = preStatus(p), regle = peutSuivre() ? `<button type="button" class="link" data-act="pre-suivi-regler" data-id="${p.id}">${ic('edit', 'sm')}Régler</button>` : '';
  const ligne = k => {
    if (!suiviActif(p, k)) return `<div class="row">${lead(SUIVI[k].icon)}<div class="row-main"><div class="row-t">${SUIVI[k].l}</div><div class="row-s">Abreuvoir automatique : rien à noter</div></div></div>`;
    const x = suiviDe(p, k), n = suiviJours(p, k), retard = suiviRetard(p, k, st);
    const qui = x ? nomDe(x.par) : '';
    const s = [x ? `${x.d === todayISO() ? "Aujourd'hui" : dShort(x.d || isoLocal(x.le))} ${quandSuivi(x).startsWith('à') ? quandSuivi(x) : ''}`.trim() + (qui ? ` · ${qui}` : '') + (x.balle ? ` · ${x.nb} ${balleNom(x.balle, x.nb)}` : '') : 'Pas encore noté',
      n ? `rappel : ${SUIVI_JOURS.find(o => o.v === String(n)).l.toLowerCase()}` : ''].filter(Boolean).join(' · ');
    return `<div class="row${retard ? ' sev-warn' : ''}">${lead(SUIVI[k].icon)}<div class="row-main"><div class="row-t">${SUIVI[k].l}${retard ? ' · à faire' : ''}</div><div class="row-s">${esc(s)}</div></div></div>`;
  };
  const hist = (Array.isArray(p.suiviHist) ? p.suiviHist : []).filter(x => x && SUIVI[x.k] && Number.isFinite(x.le)).slice(0, 12);
  return section('Eau et foin', `<div class="list">${ligne('eau')}${ligne('foin')}</div>
    ${hist.length ? `<details class="mat-hist"><summary>Les ${hist.length} derniers passages</summary><ul>${hist.map(x => `<li><b>${SUIVI[x.k].fait}</b> · ${esc(dShort(x.d || isoLocal(x.le)))} ${esc(quandSuivi(x).startsWith('à') ? quandSuivi(x) : '')}${nomDe(x.par) ? ' · ' + esc(nomDe(x.par)) : ''}${x.balle ? ' · ' + esc(`${x.nb} ${balleNom(x.balle, x.nb)}`) : ''}</li>`).join('')}</ul></details>` : ''}
    ${!st.occupe ? '<p class="note">Les boutons Eau et Foin apparaissent sur le pré quand des chevaux y sont.</p>' : ''}`, regle);
}
ACT['pre-suivi-regler'] = d => {
  const p = get('pres', d.id);
  if (!p || !peutSuivre()) return;
  openSheet(`Eau et foin · ${p.nom}`, `
    ${grp('Abreuvoir', chips('eauauto', [{ v: 'remplir', l: 'À remplir' }, { v: 'auto', l: 'Automatique' }], p.eauAuto ? 'auto' : 'remplir'), 'Automatique : le bouton Eau disparaît de ce pré.')}
    <div id="w_eauj"${p.eauAuto ? ' hidden' : ''}>${grp("Rappel pour l'eau", chips('eauj', SUIVI_JOURS, String(suiviJours(p, 'eau') || '')))}</div>
    ${grp('Rappel pour le foin', chips('foinj', SUIVI_JOURS, String(suiviJours(p, 'foin') || '')), "Une alerte sur l'accueil quand le pré est occupé et que ça n'a pas été noté depuis ce délai.")}`, {
    onMount: f => f.addEventListener('chipchange', e => { if (e.detail.name === 'eauauto') $('#w_eauj').hidden = chipVal(f, 'eauauto') === 'auto'; }),
    onSubmit: f => {
      const auto = chipVal(f, 'eauauto') === 'auto', ej = Number(chipVal(f, 'eauj')) || null, fj = Number(chipVal(f, 'foinj')) || null;
      put('pres', Object.assign({}, get('pres', p.id), { eauAuto: auto, eauJours: auto ? null : ej, foinJours: fj }));
      toast('Réglé');
    }
  });
};

/* Accueil : eau ou foin en retard dans un pré occupé */
function alertesEauFoin(out) {
  if (!rub('pres') || (typeof estInvite === 'function' && estInvite())) return;
  pres(true).filter(p => !p.archive).forEach(p => {
    const st = preStatus(p);
    if (!st.occupe) return;
    Object.keys(SUIVI).forEach(k => {
      if (!suiviRetard(p, k, st)) return;
      const x = suiviDe(p, k), j = x ? diffDays(x.d || isoLocal(x.le), todayISO()) : null;
      out.push({ sev: 'warn', icon: SUIVI[k].icon, t: `${p.nom} · ${k === 'eau' ? 'eau à faire' : 'foin à mettre'}`,
        s: x ? `Dernière fois ${j === 1 ? 'hier' : `il y a ${nJ(j)}`}${nomDe(x.par) ? ` (${nomDe(x.par)})` : ''}` : `Pas encore noté · ${st.horses.map(hNom).join(', ')}`,
        act: `data-act="open-pre" data-id="${p.id}"`, ord: -1 });
    });
  });
}
