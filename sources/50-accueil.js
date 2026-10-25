
/* ---------- Accueil ---------- */
function alerts() {
  const t = todayISO(), C = cfg(), out = [];
  rappels().forEach(r => {
    if (r.planned) return;
    const act = `data-act="new" data-what="soin" data-hid="${r.h.id}" data-type="${r.type.id}"`;
    if (r.days < 0) out.push({ sev: 'danger', icon: r.type.icon, t: `${r.h.nom} · ${r.type.short}`, s: `En retard de ${nJ(-r.days)} · dernier le ${dShort(r.last.date)}`, act, ord: r.days });
    else if (r.days <= C.alerte) out.push({ sev: 'warn', icon: r.type.icon, t: `${r.h.nom} · ${r.type.short}`, s: `À prévoir ${dRel(r.due)} · dernier le ${dShort(r.last.date)}`, act, ord: r.days });
  });
  list('soins').filter(s => s.statut === 'prevu' && s.date < t && cheval(s.horseId) && !cheval(s.horseId).archive).forEach(s =>
    out.push({ sev: 'warn', icon: soinIcon(s), t: `${hNom(s.horseId)} · ${soinLabel(s)}`, s: `Rendez-vous du ${dShort(s.date)} : à confirmer`, act: `data-act="edit-soin" data-id="${s.id}"`, ord: diffDays(t, s.date) }));
  pres().forEach(p => {
    const st = preStatus(p);
    if (!st.occupe || !st.over) return;
    const nx = prePret(p.id);
    const tip = nx ? ` · ${nx.p.nom} ${nx.s.jamais ? 'est libre' : 'repose depuis ' + nJ(nx.s.repos)}` : '';
    out.push({ sev: 'warn', icon: 'fence', t: `${p.nom} · ${nJ(st.days)} de pâture`, s: `Maximum prévu : ${st.max} j${tip}`, act: `data-act="move-from" data-id="${p.id}"`, ord: st.max - st.days });
  });
  list('concours').forEach(c => {
    const h = cheval(c.horseId);
    if (!h || c.statut === 'forfait') return;
    const n = diffDays(t, c.date), nom = c.lieu || c.discipline || 'Concours';
    const act = `data-act="edit-concours" data-id="${c.id}"`;
    if (n >= 0 && n <= 45) {
      vacCheck(c).filter(i => i.sev === 'danger').forEach(i => out.push({ sev: 'danger', icon: 'syringe', t: `${h.nom} · ${nom} ${dShort(c.date)}`, s: i.msg, act, ord: n - 100 }));
      if (c.statut !== 'engage' && validISO(c.cloture)) {
        const k = diffDays(t, c.cloture);
        if (k <= 7) out.push({ sev: k < 0 ? 'danger' : 'warn', icon: 'rosette', t: `${h.nom} · ${nom} ${dShort(c.date)}`, s: k < 0 ? `Clôture des engagements passée (${dShort(c.cloture)})` : `Engagement à faire ${dRel(c.cloture)}`, act, ord: k });
      }
    }
    if (n < 0 && n >= -30 && !hasResult(c)) out.push({ sev: 'info', icon: 'rosette', t: `${h.nom} · ${nom}`, s: `Résultat du ${dShort(c.date)} à saisir`, act, ord: 50 });
  });
  list('seances').filter(s => s.statut === 'prevu' && validISO(s.date) && s.date < t && cheval(s.horseId) && !cheval(s.horseId).archive).forEach(s =>
    out.push({ sev: 'info', icon: 'timer', t: `${hNom(s.horseId)} · ${s.type || 'Séance'}${s.coach ? ' avec ' + s.coach : ''}`, s: `Séance prévue le ${dShort(s.date)} : à confirmer`, act: `data-act="edit-seance" data-id="${s.id}"`, ord: 40 }));
  const A = autonomie();
  if (A.rate && A.days != null && A.days < 30) out.push({ sev: A.days < 10 ? 'danger' : 'warn', icon: 'bale', t: `Foin : environ ${nJ(Math.floor(A.days))} de stock`, s: `Au rythme de ${num(A.rate, 0)} kg par jour`, act: 'data-act="go" data-tab="foin"', ord: A.days - 30 });
  const rank = { danger: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev] || a.ord - b.ord);
}
const rowAlert = a => `<button type="button" class="row sev-${a.sev}" ${a.act}>${lead(a.icon)}<div class="row-main"><div class="row-t">${esc(a.t)}</div><div class="row-s">${esc(a.s)}</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`;

function agenda() {
  const t = todayISO(), lim = addDays(t, 30), C = cfg(), items = [];
  list('soins').filter(s => s.statut === 'prevu' && s.date >= t && s.date <= lim && cheval(s.horseId)).forEach(s =>
    items.push({ d: s.date, icon: soinIcon(s), t: `${soinLabel(s)} · ${hNom(s.horseId)}`, s: [s.praticien, s.notes].filter(Boolean).join(' · ') || 'Rendez-vous prévu', act: `data-act="edit-soin" data-id="${s.id}"` }));
  list('concours').filter(c => c.date >= t && c.date <= lim && c.statut !== 'forfait').forEach(c =>
    items.push({ d: c.date, icon: 'rosette', t: `${c.lieu || 'Concours'} · ${hNom(c.horseId)}`, s: [c.discipline, nivLabel(c.niveau), c.epreuve].filter(Boolean).join(' · ') || 'Concours', act: `data-act="edit-concours" data-id="${c.id}"` }));
  list('seances').filter(s => s.statut === 'prevu' && validISO(s.date) && s.date >= t && s.date <= lim && cheval(s.horseId)).forEach(s =>
    items.push({ d: s.date, h: s.heure || '', icon: 'timer', t: `${s.type || 'Séance'}${s.coach ? ' avec ' + s.coach : ''} · ${hNom(s.horseId)}`, s: [heureTxt(s.heure), s.lieu, nomDe({ uid: s.cavalierUid, nom: s.cavalier })].filter(Boolean).join(' · ') || 'Séance prévue', act: `data-act="edit-seance" data-id="${s.id}"` }));
  rappels().filter(r => !r.planned && r.days > C.alerte && r.due <= lim).forEach(r =>
    items.push({ d: r.due, icon: r.type.icon, t: `Rappel ${r.type.short} · ${r.h.nom}`, s: `Dernier le ${dShort(r.last.date)}`, act: `data-act="new" data-what="soin" data-hid="${r.h.id}" data-type="${r.type.id}"` }));
  return items.sort((a, b) => a.d.localeCompare(b.d) || String(a.h || '').localeCompare(String(b.h || '')));
}
function agendaHtml(items) {
  if (!items.length) return empty('Rien de prévu sur 30 jours', 'Les rendez-vous (véto, maréchal, dentiste…), les concours et les prochains rappels apparaîtront ici.');
  let html = '', cur = null, buf = [];
  const flushDay = () => {
    if (cur) html += `<div class="tl-day">${cur === todayISO() ? "Aujourd'hui" : esc(dDayHead(cur))}</div><div class="list">${buf.join('')}</div>`;
    buf = [];
  };
  items.forEach(it => {
    if (it.d !== cur) { flushDay(); cur = it.d; }
    buf.push(`<button type="button" class="row" ${it.act}>${lead(it.icon)}<div class="row-main"><div class="row-t">${esc(it.t)}</div><div class="row-s">${esc(it.s)}</div></div></button>`);
  });
  flushDay();
  return `<div style="display:flex;flex-direction:column;gap:8px">${html}</div>`;
}
function auPreHtml() {
  const ps = pres().map(p => ({ p, s: preStatus(p) }));
  if (!ps.length) return empty('Aucun pré', "Ajoute tes parcelles dans l'onglet Prés pour suivre la rotation.");
  const occ = ps.filter(x => x.s.occupe).sort((a, b) => b.s.days - a.s.days);
  const ready = ps.filter(x => !x.s.occupe && x.s.pret).sort((a, b) => (b.s.repos ?? -1) - (a.s.repos ?? -1));
  const box = chevaux().filter(h => !openPlace(h.id));
  const rows = [];
  occ.forEach(({ p, s }) => rows.push(`<button type="button" class="row" data-act="open-pre" data-id="${p.id}">${lead('leaf')}<div class="row-main"><div class="row-t">${esc(p.nom)}</div><div class="row-s">${esc(s.horses.map(hNom).join(', '))}</div></div><span class="pill ${s.over ? 'warn' : 'hay'}">${s.days === 0 ? "Aujourd'hui" : nJ(s.days)}</span></button>`));
  ready.slice(0, 2).forEach(({ p, s }) => rows.push(`<button type="button" class="row" data-act="move-to" data-id="${p.id}">${lead('check')}<div class="row-main"><div class="row-t">${esc(p.nom)}</div><div class="row-s">${s.jamais ? 'Libre' : `Prêt · ${nJ(s.repos)} de repos`}</div></div><span class="pill ok">Prêt</span></button>`));
  if (box.length) rows.push(`<button type="button" class="row" data-act="new" data-what="move">${lead('barn')}<div class="row-main"><div class="row-t">Au box</div><div class="row-s">${esc(box.map(h => h.nom).join(', '))}</div></div><span class="row-end">${ic('move', 'sm')}</span></button>`);
  return rows.length ? `<div class="list">${rows.join('')}</div>` : empty('Tous les prés se reposent', 'Utilise « Déplacer » pour mettre des chevaux au pré.');
}
function foinMini() {
  const A = autonomie(), st = A.st;
  const parts = Object.values(st.by).filter(x => x.n > 0).map(x => `${x.n} ${x.n > 1 ? plWords(x.b.nom) : x.b.nom.toLowerCase()}`);
  const t = parts.length ? `${parts.join(' · ')} <span class="muted">≈ ${num(st.kg / 1000, 1)} t</span>` : 'Aucun stock saisi';
  const s = A.rate ? `Environ ${nJ(Math.floor(A.days))} de foin, jusqu'au ${dShort(addDays(todayISO(), Math.floor(A.days)))}`
    : "Note les balles entamées ou le foin des rations pour estimer l'autonomie";
  return `<div class="list"><button type="button" class="row" data-act="go" data-tab="foin">${lead('bale')}<div class="row-main"><div class="row-t">${t}</div><div class="row-s">${esc(s)}</div></div><span class="row-end">${ic('next', 'sm')}</span></button></div>`;
}
function quickHtml() {
  const occN = pres().filter(p => preStatus(p).occupe).length;
  const st = stock();
  const nB = Object.values(st.by).reduce((n, x) => n + Math.max(0, x.n), 0);
  const t = todayISO();
  const n7 = list('seances').filter(s => s.statut !== 'prevu' && validISO(s.date) && s.date > addDays(t, -7) && s.date <= t).length;
  // grosses touches « autocollant » : pastille de couleur irrégulière, comme dessinée à la main
  const qa = (act, icon, tint, t1, t2) => `<button type="button" class="qa" ${act}><span class="qa-ic ${tint}">${ic(icon)}</span><span>${t1}<small>${esc(t2)}</small></span></button>`;
  return `<div class="quick">
    ${qa('data-act="new" data-what="soin"', 'syringe', 'ciel', 'Soin / RDV', 'vaccin, maréchal, véto')}
    ${qa('data-act="new" data-what="seance"', 'timer', 'menthe', 'Séance', n7 ? `${n7} ${pl(n7, 'séance')} sur 7 jours` : 'plat, saut, longe, cours')}
    ${qa('data-act="new" data-what="move"', 'move', 'prairie', 'Déplacer', occN ? `${occN} ${pl(occN, 'pré occupé', 'prés occupés')}` : 'rotation des prés')}
    ${qa('data-act="foin-out-pick"', 'bale', 'paille', 'Balle entamée', `${nB} ${pl(nB, 'balle')} en stock`)}
  </div>`;
}
function bienvenueHtml() {
  const step = (n, t, s, what) => `<button type="button" class="row" data-act="new" data-what="${what}"><span class="lead"><b class="big" style="font-size:20px">${n}</b></span><div class="row-main"><div class="row-t">${t}</div><div class="row-s">${s}</div></div><span class="row-end">${ic('plus', 'sm')}</span></button>`;
  return `<div class="welcome">${brandLogo()}</div>` + section('Pour commencer', `<div class="list">
    ${step(1, 'Ajoute tes chevaux', 'Nom, date de naissance, puis ration et soins', 'cheval')}
    ${step(2, 'Ajoute tes prés', 'Surface, jours de repos visés', 'pre')}
    ${step(3, 'Place les chevaux au pré', 'Le carnet compte ensuite les jours de pâture et de repos', 'move')}
    ${step(4, 'Saisis ton stock de foin', 'Rounds ou petites bottes, achetés ou récoltés', 'foin')}
  </div>`);
}
VIEWS.accueil = () => {
  const html = [];
  const vide = !chevaux(true).length && !pres(true).length && !list('foin').length && !list('taches').length;
  if (exCount()) html.push(`<div class="banner">${ic('info')}<div class="row-main"><b>Ce sont des exemples</b><span class="small">Trois chevaux fictifs pour découvrir le carnet. Efface-les pour commencer avec les tiens.</span></div><button type="button" class="btn small" data-act="clear-ex" data-confirm="Confirmer">Effacer</button></div>`);
  if (vide) {
    if (sync.mode === 'loading') html.push(`<div class="loading">${brandLogo()}<p class="note">Ouverture du carnet…</p></div>`);
    else html.push(bienvenueHtml());
    return { title: "Aujourd'hui", html: html.join(''), fab: menuAjouter };
  }
  if (sync.readOnly) html.push(`<div class="banner ro">${ic('lock')}<div class="row-main"><b>Lecture seule</b><span class="small">${esc(RO_MSG)}</span></div></div>`);
  else html.push(quickHtml());
  html.push(presentsHtml());
  html.push(tachesSection());
  const al = alerts();
  html.push(section('À traiter', al.length ? `<div class="list">${al.map(rowAlert).join('')}</div>`
    : emptyH("Rien d'urgent", "Les rappels de soins, les prés à changer et les concours à préparer s'afficheront ici.")));
  html.push(section('Au pré', auPreHtml(), `<button type="button" class="link" data-act="go" data-tab="pres">Rotation ${ic('next', 'sm')}</button>`));
  html.push(section('Les 30 prochains jours', agendaHtml(agenda())));
  html.push(section('Foin', foinMini()));
  return { title: "Aujourd'hui", html: html.join(''), fab: menuAjouter };
};

function menuAjouter() {
  const mi = (what, icon, t, s) => `<button type="button" class="row" data-act="new" data-what="${what}">${lead(icon)}<div class="row-main"><div class="row-t">${t}</div><div class="row-s">${s}</div></div></button>`;
  openSheet('Ajouter', `<div class="list">
    ${mi('soin', 'syringe', 'Soin ou rendez-vous', 'Vaccin, vermifuge, maréchal, dentiste, véto…')}
    ${mi('seance', 'timer', 'Séance de travail', 'Plat, obstacle, longe, cours avec coach…')}
    ${mi('tache', 'tasks', 'Tâche à cocher', 'Foin, eau, clôtures… visible par toute l\'équipe')}
    ${mi('move', 'move', 'Déplacer des chevaux', 'Changer de pré ou rentrer au box')}
    ${mi('foin', 'bale', 'Mouvement de foin', 'Livraison, récolte ou balle entamée')}
    ${mi('concours', 'rosette', 'Concours', 'Sortie prévue ou résultat')}
    ${mi('entretien', 'tool', 'Entretien de pré', 'Hersage, fauche des refus, clôtures…')}
    ${mi('cheval', 'shoe', 'Cheval', 'Nouvelle fiche')}
    ${mi('pre', 'fence', 'Pré', 'Nouvelle parcelle')}
  </div>`);
}

const NEW = {
  soin: d => formSoin(null, { hid: d.hid, type: d.type }),
  move: d => formMove({ hid: d.hid }),
  foin: d => formFoin(null, { balle: d.balle, sens: d.sens }),
  concours: d => formConcours(null, { hid: d.hid }),
  entretien: d => formEntretien(null, { pid: d.pid }),
  cheval: () => formCheval(null),
  pre: () => formPre(null),
  ration: d => formRation(d.hid, null),
  seance: d => formSeance(null, { hid: d.hid }),
  tache: d => formTache(null, { pid: d.pid, hid: d.hid })
};
ACT.new = d => { const f = NEW[d.what]; if (f) f(d); };
ACT['clear-ex'] = () => {
  crotSilence = true;
  setTimeout(() => { crotSilence = false; }, 0);
  let n = 0;
  COLS.forEach(k => list(k).filter(o => o.ex).forEach(o => { del(k, o.id); n++; }));
  // ce qui avait été saisi sur les chevaux, prés ou balles d'exemple part avec eux
  ['soins', 'places', 'concours'].forEach(k => list(k).filter(o => !cheval(o.horseId)).forEach(o => del(k, o.id)));
  ['places', 'entretiens'].forEach(k => list(k).filter(o => !get('pres', o.preId)).forEach(o => del(k, o.id)));
  Object.values(stock().by).forEach(x => {
    let manque = -x.n;
    list('foin').filter(m => m.sens === 'out' && m.balle === x.b.id).sort((a, b) => (b.maj || 0) - (a.maj || 0))
      .forEach(m => { if (manque > 0) { manque -= m.nb; del('foin', m.id); } });
  });
  nav.stack = [];
  render();
  toast(`${n} exemples effacés. À toi de jouer !`);
};
