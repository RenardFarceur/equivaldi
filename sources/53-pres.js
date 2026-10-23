
/* ---------- Prés : rotation, repos, entretien ---------- */
function statusPill(s) {
  if (s.occupe) return s.over ? '<span class="pill warn">À changer</span>' : '<span class="pill hay">En pâture</span>';
  if (s.jamais) return '<span class="pill info">Libre</span>';
  return s.pret ? '<span class="pill ok">Prêt</span>' : '<span class="pill">Au repos</span>';
}
function pcard({ p, s }, detail = false) {
  const sub = (p.surface ? `${num(p.surface, 2)} ha` : 'Surface non renseignée')
    + (s.occupe && p.surface ? ` · ${num(s.horses.length / p.surface, 1)} cheval/ha` : '');
  const inner = `<div class="row-main"><div class="row-t">${esc(p.nom)} ${exTag(p)}</div><div class="row-s">${sub}</div></div>${statusPill(s)}`;
  const head = detail ? `<div class="pcard-h">${inner}</div>` : `<button type="button" class="pcard-h" data-act="open-pre" data-id="${p.id}">${inner}</button>`;
  if (s.occupe) {
    const pct = Math.min(100, Math.round(s.days / s.max * 100));
    return `<article class="pcard">${head}
      <div class="pnums"><span class="big">${s.days}</span><span class="unit">${pl(s.days, 'jour')} de pâture · max ${s.max}</span></div>
      <div class="gauge graze${s.over ? ' over' : ''}" role="img" aria-label="${s.days} jours de pâture sur ${s.max}"><i style="width:${pct}%"></i></div>
      <div class="wrap">${s.horses.map(id => hchip(cheval(id))).join('')}</div>
      <button type="button" class="btn small" data-act="move-from" data-id="${p.id}">${ic('move', 'sm')}Déplacer</button></article>`;
  }
  const add = `<button type="button" class="btn small" data-act="move-to" data-id="${p.id}">${ic('plus', 'sm')}Y mettre des chevaux</button>`;
  if (s.jamais) return `<article class="pcard">${head}<p class="note">Pas encore pâturé dans le carnet.</p>${add}</article>`;
  const pct = Math.min(100, Math.round(s.repos / s.cible * 100));
  return `<article class="pcard">${head}
    <div class="pnums"><span class="big">${s.repos}</span><span class="unit">${pl(s.repos, 'jour')} de repos · objectif ${s.cible}</span></div>
    <div class="gauge" role="img" aria-label="${s.repos} jours de repos sur ${s.cible}"><i style="width:${pct}%"></i></div>${add}</article>`;
}
const col = html => `<div style="display:flex;flex-direction:column;gap:12px">${html}</div>`;

VIEWS.pres = () => {
  const ps = pres().map(p => ({ p, s: preStatus(p) }));
  if (!ps.length) return { title: 'Prés', eyebrow: 'Rotation de pâture', html: emptyH('Aucun pré', 'Ajoute tes parcelles avec le bouton +. Le carnet comptera les jours de pâture et de repos de chacune.'), fab: () => formPre(null), fabLabel: 'Nouveau pré' };
  const occ = ps.filter(x => x.s.occupe).sort((a, b) => b.s.days - a.s.days);
  const prets = ps.filter(x => !x.s.occupe && x.s.pret).sort((a, b) => (b.s.repos ?? -1) - (a.s.repos ?? -1));
  const repos = ps.filter(x => !x.s.occupe && !x.s.pret).sort((a, b) => (b.s.repos / b.s.cible) - (a.s.repos / a.s.cible));
  const surf = ps.reduce((a, x) => a + (Number(x.p.surface) || 0), 0);
  let html = `<div class="stats">
    <div class="stat"><b>${occ.length}</b><span>${pl(occ.length, 'pré occupé', 'prés occupés')}</span></div>
    <div class="stat"><b>${prets.length}</b><span>${pl(prets.length, 'prêt', 'prêts')} à pâturer</span></div>
    <div class="stat"><b>${num(surf, 1)}</b><span>ha au total</span></div></div>`;
  if (occ.length) html += section('En pâture', col(occ.map(x => pcard(x)).join('')));
  if (prets.length) html += section('Prêts à pâturer', col(prets.map(x => pcard(x)).join('')));
  if (repos.length) html += section('Au repos', col(repos.map(x => pcard(x)).join('')));
  const box = chevaux().filter(h => !openPlace(h.id));
  if (box.length) html += section('Au box', `<div class="list"><div class="row">${lead('barn')}<div class="row-main"><div class="wrap">${box.map(hchip).join('')}</div></div><button type="button" class="btn small" data-act="new" data-what="move">Placer</button></div></div>`);
  const arch = list('pres').filter(p => p.archive).sort(byName);
  if (arch.length) html += `<div class="sec"><button type="button" class="link" data-act="toggle-arch-pres" style="align-self:flex-start">${ui.showArchPres ? 'Masquer' : 'Afficher'} les prés archivés (${arch.length})</button>${ui.showArchPres ? `<div class="list">${arch.map(p => `<button type="button" class="row" data-act="open-pre" data-id="${p.id}">${lead('fence')}<div class="row-main"><div class="row-t">${esc(p.nom)}</div></div></button>`).join('')}</div>` : ''}</div>`;
  return { title: 'Prés', eyebrow: 'Rotation de pâture', html, fab: menuPres, fabLabel: 'Ajouter' };
};
ACT['toggle-arch-pres'] = () => { ui.showArchPres = !ui.showArchPres; saveUi(); render(); };

VIEWS.pre = p => {
  const pre = get('pres', p.id);
  if (!pre) return { title: 'Pré', html: empty('Pré introuvable', 'Ce pré a été supprimé.') };
  const s = preStatus(pre), t = todayISO(), yr = t.slice(0, 4);
  const segs = segments(pre.id).slice().reverse();
  let html = pcard({ p: pre, s }, true);
  html += `<div class="stats">
    <div class="stat"><b>${joursPatures(pre.id, yr + '-01-01')}</b><span>jours pâturés en ${yr}</span></div>
    <div class="stat"><b>${s.cible}</b><span>jours de repos visés</span></div>
    <div class="stat"><b>${s.max}</b><span>jours de pâture max</span></div></div>`;
  const tks = tachesTriees(tk => tk.preId === pre.id);
  html += section('Tâches', tks.length ? tachesListe(tks) : "<p class=\"note\">Foin, eau, crottins… Ajoute les tâches de ce pré : chacun les coche quand c'est fait.</p>",
    sync.readOnly ? '' : `<button type="button" class="link" data-act="new" data-what="tache" data-pid="${pre.id}">${ic('plus', 'sm')}Ajouter</button>`);
  const ents = list('entretiens').filter(e => e.preId === pre.id).sort((a, b) => b.date.localeCompare(a.date));
  html += section('Entretien', ents.length ? `<div class="list">${ents.map(e =>
    `<button type="button" class="row" data-act="edit-entretien" data-id="${e.id}">${lead('tool')}<div class="row-main"><div class="row-t">${esc(e.type)}</div><div class="row-s">${esc([dFull(e.date), e.notes].filter(Boolean).join(' · '))}</div></div></button>`).join('')}</div>`
    : '<p class="note">Hersage, fauche des refus, amendement, clôtures… Note-les avec le bouton +.</p>',
    `<button type="button" class="link" data-act="new" data-what="entretien" data-pid="${pre.id}">${ic('plus', 'sm')}Ajouter</button>`);
  html += section('Historique de pâture', segs.length ? `<div class="list">${segs.map(g =>
    `<div class="row">${lead(g.open ? 'leaf' : 'clock')}<div class="row-main"><div class="row-t">${dShort(g.a)} → ${g.open ? "aujourd'hui" : dShort(g.b)}</div><div class="row-s">${esc([...g.horses].map(hNom).join(', '))}</div></div><span class="row-end num">${nJ(diffDays(g.a, g.b))}</span></div>`).join('')}</div>`
    : "<p class=\"note\">Aucun passage enregistré pour l'instant.</p>");
  if (pre.notes) html += `<div class="card"><div class="eyebrow">Notes</div><div style="white-space:pre-wrap">${esc(pre.notes)}</div></div>`;
  html += `<div class="btnrow"><button type="button" class="btn" data-act="edit-pre" data-id="${pre.id}">${ic('edit', 'sm')}Modifier le pré</button></div>`;
  const eyebrow = [pre.surface ? `${num(pre.surface, 2)} ha` : '', pre.archive ? 'archivé' : ''].filter(Boolean).join(' · ') || 'Pré';
  return { title: pre.nom, eyebrow, html, fab: () => formEntretien(null, { pid: pre.id }), fabLabel: 'Ajouter un entretien' };
};

function menuPres() {
  const mi = (what, icon, t, s) => `<button type="button" class="row" data-act="new" data-what="${what}">${lead(icon)}<div class="row-main"><div class="row-t">${t}</div><div class="row-s">${s}</div></div></button>`;
  openSheet('Prés', `<div class="list">
    ${mi('move', 'move', 'Déplacer des chevaux', 'Changer de pré ou rentrer au box')}
    ${mi('entretien', 'tool', 'Entretien de pré', 'Hersage, fauche des refus, clôtures…')}
    ${mi('pre', 'fence', 'Nouveau pré', 'Ajouter une parcelle')}</div>`);
}

function formMove(pre = {}) {
  const hs = chevaux(), ps = pres();
  if (!hs.length) { toast("Ajoute d'abord un cheval."); formCheval(null); return; }
  if (!ps.length) { toast("Ajoute d'abord un pré."); formPre(null); return; }
  let dest = pre.to || null, sel = [];
  if (pre.from) {
    sel = list('places').filter(x => x.preId === pre.from && !x.fin).map(x => x.horseId);
    const nx = prePret(pre.from);
    if (!dest && nx) dest = nx.p.id;
  }
  if (pre.hid) sel = [pre.hid];
  const destOpts = ps.filter(p => p.id !== pre.from).map(p => {
    const s = preStatus(p);
    const sub = s.occupe ? `occupé · ${nJ(s.days)}` : s.jamais ? 'libre' : `repos ${nJ(s.repos)}${s.pret ? ' · prêt' : ''}`;
    return { v: p.id, html: `<span class="two"><span>${esc(p.nom)}</span><small>${esc(sub)}</small></span>` };
  });
  destOpts.push({ v: '__box', html: `${ic('barn', 'sm')}<span>Box / écurie</span>` });
  const from = pre.from ? get('pres', pre.from) : null;
  const body = `
    ${from ? `<p class="note">Depuis <b>${esc(from.nom)}</b></p>` : ''}
    ${grp('Vers', chips('dest', destOpts, dest ? [dest] : []))}
    ${grp('Chevaux', chips('h', horseOpts(hs, h => horseWhere(h.id).txt), sel, { multi: true }) + (hs.length > 2 ? '<button type="button" class="link" data-act="all-h" style="align-self:flex-start">Tout le monde</button>' : ''))}
    ${fld('Date', inp('f_date', todayISO(), 'type="date" required'), 'Change la date si le déplacement a eu lieu avant.')}`;
  openSheet('Déplacer des chevaux', body, {
    submit: 'Déplacer',
    onSubmit: f => {
      const d = chipVal(f, 'dest');
      if (!d) return 'Choisis où vont les chevaux.';
      const hids = chipVals(f, 'h');
      if (!hids.length) return 'Choisis au moins un cheval.';
      const date = val('f_date');
      if (!validISO(date)) return 'Indique la date.';
      if (date > todayISO()) return 'La date ne peut pas être dans le futur.';
      const preId = d === '__box' ? null : d;
      const r = moveHorses(hids, preId, date);
      if (r.err) return r.err;
      const destName = preId ? get('pres', preId).nom : 'au box';
      toast(`${hids.length > 1 ? hids.length + ' chevaux' : hNom(hids[0])} → ${destName}`, { undo: r.undo });
    }
  });
}
ACT['move-from'] = d => formMove({ from: d.id });
ACT['move-to'] = d => formMove({ to: d.id });

function formPre(id) {
  const ex = id ? get('pres', id) : null;
  if (id && !ex) return;
  const p = ex ? clone(ex) : { nom: '' };
  const C = cfg();
  const body = `
    ${fld('Nom', inp('f_nom', p.nom, 'required autocomplete="off" autocapitalize="sentences" placeholder="ex. Pré du bas"'))}
    ${fld('Surface (ha)', inp('f_surf', p.surface != null ? String(p.surface).replace('.', ',') : '', numAttr + ' placeholder="ex. 1,5"'))}
    <div class="grid2">${fld('Repos visé (jours)', inp('f_repos', p.repos, `inputmode="numeric" autocomplete="off" placeholder="${C.repos}"`))}${fld('Pâture max (jours)', inp('f_pat', p.paturage, `inputmode="numeric" autocomplete="off" placeholder="${C.paturage}"`))}</div>
    <p class="hint">Laisse vide pour garder les valeurs des réglages : ${C.repos} jours de repos, ${C.paturage} jours de pâture.</p>
    ${fld('Notes', area('f_notes', p.notes, 'rows="3" placeholder="Abreuvoir, abri, type d\'herbe, clôture…"'))}
    ${ex ? `<label class="check"><input type="checkbox" id="f_arch"${p.archive ? ' checked' : ''}> Archiver ce pré</label>` : ''}`;
  openSheet(ex ? 'Modifier le pré' : 'Nouveau pré', body, {
    focus: ex ? null : '#f_nom',
    onSubmit: () => {
      const nom = val('f_nom');
      if (!nom) return 'Indique le nom du pré.';
      const surface = parseNum(val('f_surf'));
      if (val('f_surf') && (surface == null || surface <= 0)) return 'La surface doit être un nombre positif, en hectares.';
      const repos = parseNum(val('f_repos')), pat = parseNum(val('f_pat'));
      if ((val('f_repos') && (repos == null || repos < 1)) || (val('f_pat') && (pat == null || pat < 1))) return "Les durées doivent être d'au moins 1 jour.";
      Object.assign(p, { nom, surface, repos: repos ? Math.round(repos) : null, paturage: pat ? Math.round(pat) : null, notes: val('f_notes') });
      if (ex) p.archive = $('#f_arch').checked;
      put('pres', p);
      toast(ex ? 'Pré enregistré' : `${nom} ajouté`);
    },
    onDelete: ex ? () => deletePre(id) : null,
    delConfirm: 'Supprimer aussi son historique ?'
  });
}
function deletePre(id) {
  const p = get('pres', id);
  ['places', 'entretiens'].forEach(k => list(k).filter(o => o.preId === id).forEach(o => del(k, o.id)));
  list('taches').filter(tk => tk.preId === id).forEach(tk => put('taches', Object.assign({}, tk, { preId: null })));
  del('pres', id);
  const t = topView();
  if (t && t.view === 'pre' && t.id === id) nav.stack.pop();
  render();
  toast(`${p ? p.nom : 'Pré'} supprimé`);
}
ACT['edit-pre'] = d => formPre(d.id);

function formEntretien(id, pre = {}) {
  const ex = id ? get('entretiens', id) : null;
  if (id && !ex) return;
  const ps = pres(true).filter(p => !p.archive || (ex && ex.preId === p.id));
  if (!ps.length) { toast("Ajoute d'abord un pré."); formPre(null); return; }
  const e = ex ? clone(ex) : { preId: pre.pid || (ps.length === 1 ? ps[0].id : null), type: null, date: todayISO() };
  const body = `
    ${grp('Pré', chips('pre', ps.map(p => ({ v: p.id, l: p.nom })), e.preId ? [e.preId] : []))}
    ${grp('Travail', chips('type', ENTRETIENS.map(x => ({ v: x, l: x })), e.type ? [e.type] : []))}
    ${fld('Date', inp('f_date', e.date, 'type="date" required'))}
    ${fld('Notes', area('f_notes', e.notes, 'rows="2" placeholder="Produit, quantité, prestataire…"'))}`;
  openSheet(ex ? 'Entretien' : 'Entretien de pré', body, {
    onSubmit: f => {
      const preId = chipVal(f, 'pre');
      if (!preId) return 'Choisis le pré.';
      const type = chipVal(f, 'type');
      if (!type) return 'Choisis le travail effectué.';
      const date = val('f_date');
      if (!validISO(date)) return 'Indique la date.';
      put('entretiens', Object.assign(e, { preId, type, date, notes: val('f_notes') }));
      toast('Entretien noté');
    },
    onDelete: ex ? () => { del('entretiens', id); toast('Entretien supprimé'); } : null
  });
}
ACT['edit-entretien'] = d => formEntretien(d.id);
