
/* ---------- Foin : stock, autonomie, mouvements ---------- */
const balleNom = (id, n = 1) => {
  const b = cfg().balles.find(x => x.id === id);
  const nom = b ? b.nom : (id || 'balle');
  return n > 1 ? plWords(nom) : nom.toLowerCase();
};
function rowFoin(m) {
  const isIn = m.sens === 'in';
  const sub = [dFull(m.date), m.origine, isIn && Number(m.prix) > 0 ? `${num(Number(m.prix), 2)} € la balle` : ''].filter(Boolean).join(' · ');
  return `<button type="button" class="row" data-act="edit-foin" data-id="${m.id}"><span class="lead ${isIn ? 'in' : 'out'}">${ic(isIn ? 'plus' : 'minus')}</span><div class="row-main"><div class="row-t">${isIn ? 'Entrée' : 'Sortie'} · ${m.nb} ${esc(balleNom(m.balle, m.nb))} ${exTag(m)}</div><div class="row-s">${esc(sub)}</div></div></button>`;
}
VIEWS.foin = () => {
  const A = autonomie(), st = A.st, t = todayISO();
  const types = Object.values(st.by).filter(x => !x.orphan || x.n !== 0);
  let html = `<div class="hero"><div class="eyebrow">Stock estimé</div><div><span class="big">${num(st.kg / 1000, 1)}</span><span class="unit"> t de foin</span></div>
    ${types.map(x => `<div class="bale-row"><div class="row-main"><div class="row-t">${esc(x.b.nom)}</div><div class="row-s">≈ ${num(x.poidsMoy, 0)} kg la balle</div></div>
      <span class="big" aria-label="${x.n} en stock">${x.n}</span>
      <button type="button" class="stepbtn out" data-act="foin-out" data-balle="${esc(x.b.id)}" aria-label="Entamer une balle : ${esc(x.b.nom)}">${ic('minus')}</button>
      <button type="button" class="stepbtn" data-act="new" data-what="foin" data-balle="${esc(x.b.id)}" data-sens="in" aria-label="Entrée : ${esc(x.b.nom)}">${ic('plus')}</button></div>`).join('')}
    <p class="note" style="margin-top:6px">Touche − à chaque balle entamée : le carnet en déduit ta consommation réelle.</p></div>`;
  if (A.rate) {
    const jours = Math.floor(A.days), pct = A.besoin ? Math.min(100, Math.round(st.kg / A.besoin * 100)) : 0, ref = balleRef(st);
    const solde = A.solde >= 0
      ? `<span class="pill ok">${ic('check')}Excédent ≈ ${num(A.solde / 1000, 1)} t</span>`
      : `<span class="pill danger">Manque ≈ ${num(-A.solde / 1000, 1)} t${ref ? ` · ${Math.ceil(-A.solde / ref.poidsMoy)} ${esc(plWords(ref.b.nom))}` : ''}</span>`;
    let card = `<div class="card">
      <div class="pnums"><span class="big">${num(jours, 0)}</span><span class="unit">${pl(jours, 'jour')} · jusqu'au ${dFull(addDays(t, jours))}</span></div>
      <div class="row-s">À ${num(A.rate, 0)} kg par jour, ${A.src === 'reel' ? 'calculé sur les balles entamées ces 30 derniers jours' : "d'après le foin des rations"}.</div>
      <div class="gauge graze" role="img" aria-label="Le stock couvre ${pct} % du besoin"><i style="width:${pct}%"></i></div>
      <div class="wrap"><span class="small">Besoin jusqu'au ${dShort(A.finSaison)} : <b>${num(A.besoin / 1000, 1)} t</b></span>${solde}</div>`;
    if (A.reel != null && A.rat > 0) {
      const ecart = Math.abs(A.reel - A.rat) / A.rat > 0.25;
      card += `<p class="note">Rations : ${num(A.rat, 0)} kg/j · balles entamées : ${num(A.reel, 0)} kg/j.${ecart ? " Un écart important vient souvent du gaspillage ou d'une ration à mettre à jour." : ''}</p>`;
    }
    html += section('Autonomie', card + '</div>');
  } else {
    html += section('Autonomie', '<p class="note">Pour savoir combien de jours tu tiens, note le foin des rations en kg (fiche cheval, onglet Ration) ou touche − à chaque balle entamée.</p>');
  }
  const since = addDays(t, -365);
  const buys = list('foin').filter(m => m.sens === 'in' && m.date > since && Number(m.prix) > 0);
  if (buys.length) {
    const eur = buys.reduce((a, m) => a + m.nb * Number(m.prix), 0);
    const kg = buys.reduce((a, m) => a + m.nb * (Number(m.poids) || (st.by[m.balle] ? st.by[m.balle].b.poids : 0)), 0);
    html += section('Achats sur 12 mois', `<div class="stats"><div class="stat"><b>${num(eur, 0)} €</b><span>dépensés</span></div><div class="stat"><b>${kg ? num(eur / kg * 1000, 0) : '–'}</b><span>€ la tonne</span></div><div class="stat"><b>${num(kg / 1000, 1)}</b><span>t achetées</span></div></div>`);
  }
  const mv = list('foin').sort((a, b) => b.date.localeCompare(a.date) || (b.maj || 0) - (a.maj || 0)).slice(0, 40);
  html += section('Mouvements', mv.length ? `<div class="list">${mv.map(rowFoin).join('')}</div>` : empty('Aucun mouvement', 'Ajoute ta première livraison ou récolte avec le bouton +.'),
    `<button type="button" class="link" data-act="new" data-what="foin" data-sens="in">${ic('plus', 'sm')}Entrée</button>`);
  return { title: 'Foin', eyebrow: 'Stock et autonomie', html, fab: () => formFoin(null, { sens: 'in' }), fabLabel: 'Entrée de foin' };
};

function quickOut(balle) {
  const x = stock().by[balle];
  if (!x || x.n <= 0) { toast('Plus de balle de ce type en stock.'); return; }
  const m = put('foin', { date: todayISO(), sens: 'out', balle, nb: 1 });
  toast(`Sortie : 1 ${balleNom(balle)} · reste ${x.n - 1}`, { undo: () => del('foin', m.id) });
}
ACT['foin-out'] = d => { closeSheet(); quickOut(d.balle); };
ACT['foin-out-pick'] = () => {
  const xs = Object.values(stock().by).filter(x => x.n > 0);
  if (!xs.length) { toast('Aucune balle en stock : ajoute une entrée de foin.'); formFoin(null, { sens: 'in' }); return; }
  if (xs.length === 1) { quickOut(xs[0].b.id); return; }
  openSheet('Quelle balle entames-tu ?', `<div class="list">${xs.map(x =>
    `<button type="button" class="row" data-act="foin-out" data-balle="${esc(x.b.id)}">${lead('bale')}<div class="row-main"><div class="row-t">${esc(x.b.nom)}</div><div class="row-s">${x.n} en stock</div></div><span class="row-end">${ic('minus')}</span></button>`).join('')}</div>`);
};

function formFoin(id, pre = {}) {
  const ex = id ? get('foin', id) : null;
  if (id && !ex) return;
  const C = cfg();
  const m = ex ? clone(ex) : { sens: pre.sens === 'out' ? 'out' : 'in', balle: pre.balle || C.balles[0].id, nb: 1, date: todayISO() };
  const bOpts = C.balles.map(b => ({ v: b.id, l: b.nom }));
  if (ex && !C.balles.some(b => b.id === ex.balle)) bOpts.push({ v: ex.balle, l: ex.balle });
  const origines = Array.from(new Set([...pres(true).map(p => 'Récolte ' + p.nom), ...historyValues('foin', 'origine')]));
  const defW = b => (C.balles.find(x => x.id === b) || {}).poids || '';
  const body = `
    ${grp('Mouvement', chips('sens', [{ v: 'in', l: 'Entrée : achat, récolte' }, { v: 'out', l: 'Sortie : balle entamée' }], m.sens))}
    ${grp('Type de balle', chips('balle', bOpts, m.balle), 'Types et poids moyens se règlent dans les réglages.')}
    <div class="grid2">${fld('Nombre', inp('f_nb', m.nb, 'inputmode="numeric" autocomplete="off" required'))}${fld('Date', inp('f_date', m.date, 'type="date" required'))}</div>
    <div id="w_in" style="display:flex;flex-direction:column;gap:16px"${m.sens === 'in' ? '' : ' hidden'}>
      <div class="grid2">${fld('Poids par balle (kg)', inp('f_poids', m.poids, `${numAttr} placeholder="${defW(m.balle)}"`))}${fld('Prix par balle (€)', inp('f_prix', m.prix != null ? String(m.prix).replace('.', ',') : '', numAttr + ' placeholder="vide si récolte"'))}</div>
      ${fld('Provenance', inp('f_orig', m.origine, `list="dl-orig" autocomplete="off" placeholder="Récolte d'un pré, fournisseur…"`))}
    </div>
    ${fld('Notes', area('f_notes', m.notes, 'rows="2" placeholder="Qualité, coupe, humidité…"'))}
    ${dlist('dl-orig', origines)}`;
  openSheet(ex ? 'Mouvement de foin' : 'Foin', body, {
    onMount: f => {
      f.addEventListener('chipchange', e => {
        if (e.detail.name === 'sens') $('#w_in').hidden = chipVal(f, 'sens') !== 'in';
        if (e.detail.name === 'balle') $('#f_poids').placeholder = defW(chipVal(f, 'balle'));
      });
    },
    onSubmit: f => {
      const sens = chipVal(f, 'sens') || 'in', balle = chipVal(f, 'balle');
      if (!balle) return 'Choisis le type de balle.';
      const nb = parseNum(val('f_nb'));
      if (!nb || nb <= 0 || !Number.isInteger(nb)) return 'Le nombre de balles doit être un entier positif.';
      const date = val('f_date');
      if (!validISO(date)) return 'Indique la date.';
      if (sens === 'out') {
        const x = stock().by[balle];
        let dispo = x ? x.n : 0;
        if (ex && ex.balle === balle) dispo += ex.sens === 'out' ? ex.nb : -ex.nb;
        if (nb > dispo) return `Il ne reste que ${Math.max(0, dispo)} ${balleNom(balle, 2)} en stock. Enregistre d'abord l'entrée correspondante.`;
      }
      const poids = sens === 'in' ? parseNum(val('f_poids')) : null;
      if (sens === 'in' && val('f_poids') && (poids == null || poids <= 0)) return 'Le poids doit être un nombre positif.';
      const prix = sens === 'in' ? parseNum(val('f_prix')) : null;
      if (sens === 'in' && val('f_prix') && (prix == null || prix < 0)) return 'Le prix doit être un nombre.';
      const saved = put('foin', Object.assign(m, { sens, balle, nb, date, poids, prix, origine: sens === 'in' ? val('f_orig') : '', notes: val('f_notes') }));
      toast(ex ? 'Mouvement enregistré' : `${sens === 'in' ? 'Entrée' : 'Sortie'} : ${nb} ${balleNom(balle, nb)}`, ex ? {} : { undo: () => del('foin', saved.id) });
    },
    onDelete: ex ? () => { del('foin', id); toast('Mouvement supprimé'); } : null
  });
}
ACT['edit-foin'] = d => formFoin(d.id);
