
/* ---------- Chevaux : liste, rations du jour, fiche ---------- */
function urgentPill(hid) {
  const r = rappels(hid).filter(x => !x.planned)[0];
  if (!r) return '';
  if (r.days < 0) return `<span class="pill danger">${r.type.short} : retard ${nJ(-r.days)}</span>`;
  if (r.days <= cfg().alerte) return `<span class="pill warn">${r.type.short} ${dRel(r.due)}</span>`;
  return '';
}
/* Étiquettes de propriété : propriétaire (sauf la gérante) et demi-pensions en cours */
function proprioPills(h) {
  const pr = propRef(h);
  const prop = pr && !proprioGerante(h) ? `<span class="pill info">${ic('user')}Propriétaire · ${esc(nomCourt(pr).slice(0, 22))}</span>` : '';
  return prop + dpsDe(h).filter(x => dpActive(x)).map(x => `<span class="pill">${ic('card')}Demi-pension · ${esc(nomCourt(x.qui).slice(0, 22))}</span>`).join('');
}
function rowCheval(h) {
  const w = horseWhere(h.id);
  const sub = [ageTxt(h.naissance), h.sexe, h.race].filter(Boolean).join(' · ');
  return `<button type="button" class="row" data-act="open-cheval" data-id="${h.id}">${av(h, 'm')}<div class="row-main">
    <div class="row-t">${esc(h.nom)} ${exTag(h)}${h.archive ? '<span class="pill">Archivé</span>' : ''}</div>
    <div class="row-s trunc">${esc(sub || 'Fiche à compléter')}</div>
    <div class="wrap" style="margin-top:4px"><span class="pill">${ic(w.pre ? 'fence' : 'barn')}${esc(w.txt)}</span>${proprioPills(h)}${urgentPill(h.id)}</div>
  </div><span class="row-end">${ic('next', 'sm')}</span></button>`;
}
VIEWS.chevaux = () => {
  const seg = ui.chevSeg === 'rations' ? 'rations' : 'fiches';
  let html = segCtl('chevSeg', [['fiches', 'Fiches'], ['rations', 'Rations du jour']], seg);
  const hs = chevaux();
  if (seg === 'rations') return { title: 'Chevaux', eyebrow: 'Rations du jour', html: html + rationsDuJour(), fab: null };
  html += hs.length ? `<div class="list">${hs.map(rowCheval).join('')}</div>`
    : emptyH('Aucun cheval', 'Ajoute ta première fiche avec le bouton +. Âge, ration, soins et concours seront regroupés ici.');
  const arch = list('chevaux').filter(h => h.archive).sort(byName);
  if (arch.length) {
    html += `<div class="sec"><button type="button" class="link" data-act="toggle-arch" style="align-self:flex-start">${ui.showArch ? 'Masquer' : 'Afficher'} les chevaux archivés (${arch.length})</button>${ui.showArch ? `<div class="list">${arch.map(rowCheval).join('')}</div>` : ''}</div>`;
  }
  return { title: 'Chevaux', eyebrow: `${hs.length} ${pl(hs.length, 'cheval', 'chevaux')}`, html, fab: () => formCheval(null), fabLabel: 'Nouveau cheval' };
};
ACT['toggle-arch'] = () => { ui.showArch = !ui.showArch; saveUi(); render(); };

function rationsDuJour() {
  const hs = chevaux();
  const meals = REPAS.map(r => ({
    r, items: hs.map(h => ({ h, lines: (h.ration || []).filter(l => (l.repas || []).includes(r.id)) })).filter(x => x.lines.length)
  })).filter(m => m.items.length);
  if (!meals.length) return empty('Aucune ration saisie', "Ouvre la fiche d'un cheval, onglet Ration, pour indiquer ce qu'il mange à chaque repas.");
  const hay = consoRations();
  const head = hay ? `<p class="note">Foin distribué : <b>${num(hay)} kg par jour</b> pour ${hs.length} ${pl(hs.length, 'cheval', 'chevaux')}.</p>` : '';
  return `<div style="display:flex;flex-direction:column;gap:12px">${head}${meals.map(m => `<div class="meal"><div class="meal-h">${m.r.label}<span>${m.items.length} ${pl(m.items.length, 'cheval', 'chevaux')}</span></div>${m.items.map(x =>
    `<button type="button" class="feed" data-act="open-cheval" data-id="${x.h.id}" data-sub="ration">${av(x.h)}<div class="row-main"><div class="row-t">${esc(x.h.nom)}</div><ul>${x.lines.map(l =>
      `<li>${esc(l.aliment)}${l.qte != null ? ` <b>${num(l.qte, 2)} ${esc(l.unite || '')}</b>` : ''}</li>`).join('')}</ul></div></button>`).join('')}</div>`).join('')}</div>`;
}

VIEWS.cheval = p => {
  const h = cheval(p.id);
  if (!h) return { title: 'Cheval', html: empty('Fiche introuvable', 'Ce cheval a été supprimé.') };
  const sub = ['fiche', 'ration', 'soins', 'entrainement', 'concours'].includes(p.sub) ? p.sub : 'fiche';
  let html = segCtl('sub', [['fiche', 'Fiche'], ['ration', 'Ration'], ['soins', 'Soins'], ['entrainement', 'Entraînement'], ['concours', 'Concours']], sub, 'scroll');
  let fab = () => formSoin(null, { hid: h.id }), fabLabel = 'Ajouter un soin';
  if (sub === 'fiche') html += ficheHtml(h);
  if (sub === 'ration') { html += rationHtml(h); fab = () => formRation(h.id, null); fabLabel = 'Ajouter un aliment'; }
  if (sub === 'soins') html += soinsHtml(h);
  if (sub === 'entrainement') { html += entrainementHtml(h); fab = () => formSeance(null, { hid: h.id }); fabLabel = 'Ajouter une séance'; }
  if (sub === 'concours') { html += concoursCheval(h); fab = () => formConcours(null, { hid: h.id }); fabLabel = 'Ajouter un concours'; }
  const eyebrow = [ageTxt(h.naissance), h.sexe, h.archive ? 'archivé' : ''].filter(Boolean).join(' · ') || 'Fiche cheval';
  return { title: h.nom, eyebrow, html, fab, fabLabel };
};

const rowRappel = r => `<button type="button" class="row" ${r.planned ? `data-act="edit-soin" data-id="${r.planned.id}"` : `data-act="new" data-what="soin" data-hid="${r.h.id}" data-type="${r.type.id}"`}>${lead(r.type.icon)}<div class="row-main"><div class="row-t">${r.type.label}</div><div class="row-s">Fait le ${dShort(r.last.date)} · rappel le ${dShort(r.due)}</div></div>${rappelPill(r)}</button>`;

function ficheHtml(h) {
  const t = todayISO(), w = horseWhere(h.id), has = hasPhoto(h);
  const loc = `<div class="card hhead">
    <button type="button" class="avbtn" data-act="photo" data-id="${h.id}" aria-label="${has ? 'Changer la photo' : 'Ajouter une photo'} de ${esc(h.nom)}">${av(h, 'xl')}<span class="cam">${ic('camera')}</span></button>
    <div class="row-main hhead-main">
      <div class="row-t">${ic(w.pre ? 'fence' : 'barn', 'sm')}<span>${esc(w.txt)}</span></div>
      <div class="row-s">${w.place ? `Depuis le ${dShort(w.place.debut)} · ${nJ(diffDays(w.place.debut, t))}` : 'Pas dans un pré'}</div>
      <button type="button" class="btn small" data-act="new" data-what="move" data-hid="${h.id}">${ic('move', 'sm')}Déplacer</button>
    </div></div>`;
  const R = rappels(h.id).slice(0, 3);
  const rap = R.length ? section('Prochains soins', `<div class="list">${R.map(rowRappel).join('')}</div>`, `<button type="button" class="link" data-act="seg" data-k="sub" data-v="soins">Tout voir ${ic('next', 'sm')}</button>`) : '';
  const lies = tachesTriees(tk => tk.horseId === h.id);
  const tks = lies.length ? section('Tâches', tachesListe(lies)) : '';
  const items = [
    ['Naissance', h.naissance ? `${dFull(h.naissance)} · ${ageTxt(h.naissance)}` : ''],
    ['Sexe', h.sexe], ['Race', h.race], ['Robe', h.robe],
    ['Taille', h.taille ? `${num(h.taille, 0)} cm` : ''], ['Poids', h.poids ? `${num(h.poids, 0)} kg` : ''],
    ['N° SIRE / UELN', h.sire], ['Transpondeur', h.puce]
  ].filter(x => x[1]);
  const dl = items.length ? `<dl class="dl">${items.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    : empty('Fiche à compléter', 'Date de naissance, race, robe, n° SIRE, transpondeur…');
  const notes = h.notes ? `<div class="card"><div class="eyebrow">Notes</div><div style="white-space:pre-wrap">${esc(h.notes)}</div></div>` : '';
  return loc + tks + rap + proprieteHtml(h) + depensesChevalHtml(h) + section('Identité', dl + notes, `<button type="button" class="link" data-act="edit-cheval" data-id="${h.id}">${ic('edit', 'sm')}Modifier</button>`);
}
/* Propriété : à qui est le cheval, qui le prend en demi-pension, à quelles conditions */
function proprieteHtml(h) {
  const t = todayISO(), pr = propRef(h), mp = refMembre(pr), rows = [];
  rows.push(pr
    ? crow(`data-act="edit-prop" data-id="${h.id}"`, `${pav(pr)}<span class="row-main"><span class="row-t">${esc(nomDe(pr))}${estMoi(pr) ? ' <span class="pill ok">Toi</span>' : ''}</span><span class="row-s">Propriétaire${mp ? '' : ' · hors équipe'}</span></span>`, mp && mp.tel, nomDe(pr))
    : `<button type="button" class="row" data-act="edit-prop" data-id="${h.id}">${lead('user')}<div class="row-main"><div class="row-t">Propriétaire</div><div class="row-s">Non renseigné : touche pour l'indiquer</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`);
  dpsDe(h).sort((a, b) => (dpActive(b) - dpActive(a)) || String(b.debut || '').localeCompare(String(a.debut || ''))).forEach(x => {
    const fini = validISO(x.fin) && x.fin < t, futur = validISO(x.debut) && x.debut > t, mx = refMembre(x.qui);
    const det = [joursTxt(x.jours), Number(x.part) > 0 ? eur(x.part) + ' / mois' : '',
      fini ? 'terminée le ' + dShort(x.fin) : futur ? 'à partir du ' + dShort(x.debut) : (validISO(x.debut) ? 'depuis le ' + dShort(x.debut) : '')].filter(Boolean).join(' · ');
    rows.push(crow(`data-act="edit-dp" data-hid="${h.id}" data-id="${esc(x.id)}"`,
      `${pav(x.qui)}<span class="row-main"><span class="row-t">${esc(nomDe(x.qui))}${estMoi(x.qui) ? ' <span class="pill ok">Toi</span>' : ''}${fini ? ' <span class="pill">Terminée</span>' : futur ? ' <span class="pill info">À venir</span>' : ''}</span><span class="row-s">Demi-pension${det ? ' · ' + esc(det) : ''}</span>${x.notes ? `<span class="row-s clamp2">${esc(x.notes)}</span>` : ''}</span>`,
      mx && mx.tel, nomDe(x.qui)));
  });
  const add = sync.readOnly ? '' : `<button type="button" class="link" data-act="new-dp" data-hid="${h.id}">${ic('plus', 'sm')}Demi-pension</button>`;
  return section('Propriété', `<div class="list">${rows.join('')}</div>`, add);
}
/* Dépenses de l'année pour ce cheval, et qui les a payées */
function depensesChevalHtml(h) {
  const yr = todayISO().slice(0, 4);
  const es = depenses(yr + '-01-01').filter(e => e.hid === h.id);
  if (!es.length) return '';
  const tot = es.reduce((s, e) => s + e.v, 0);
  const cats = CATS.map(c => ({ c, v: es.filter(e => e.cat === c.id).reduce((s, e) => s + e.v, 0) })).filter(x => x.v > 0);
  const by = new Map();
  es.forEach(e => { const k = pKey(e.qui) || '_'; if (!by.has(k)) by.set(k, { v: 0, cats: {} }); const b = by.get(k); b.v += e.v; b.cats[e.cat] = (b.cats[e.cat] || 0) + e.v; });
  const rows = [...by.entries()].sort((a, b) => (a[0] === '_') - (b[0] === '_') || b[1].v - a[1].v).map(([k, b]) => {
    const p = personne(k), det = CATS.filter(c => b.cats[c.id]).map(c => `${c.label} ${eur(b.cats[c.id])}`).join(' · ');
    return p
      ? `<button type="button" class="row" data-act="open-membre" data-k="${esc(k)}">${pav(p)}<div class="row-main"><div class="row-t">${esc(p.nom)}</div><div class="row-s">${esc(det)}</div></div><span class="row-end num">${eur(b.v)}</span></button>`
      : `<button type="button" class="row sev-warn" data-act="dep-cheval" data-id="${h.id}">${lead('euro')}<div class="row-main"><div class="row-t">Payeur à indiquer</div><div class="row-s">${esc(det)}</div></div><span class="row-end num">${eur(b.v)}</span></button>`;
  }).join('');
  return section(`Dépenses ${yr}`, `<div class="card"><div class="pnums"><span class="big">${eur(tot)}</span><span class="unit">${esc(cats.map(x => `${x.c.label.toLowerCase()} ${eur(x.v)}`).join(' · '))}</span></div></div><div class="list">${rows}</div>`,
    `<button type="button" class="link" data-act="dep-cheval" data-id="${h.id}">Détail ${ic('next', 'sm')}</button>`);
}
ACT['dep-cheval'] = d => {
  const h = cheval(d.id);
  if (!h) return;
  const yr = todayISO().slice(0, 4);
  const es = depenses(yr + '-01-01').filter(e => e.hid === h.id);
  openSheet(`Dépenses ${yr} · ${h.nom}`, es.length ? `<p class="note">Touche une ligne pour la modifier ou indiquer qui l'a payée.</p><div class="list">${es.map(e => rowDep(e)).join('')}</div>` : empty('Aucune dépense', 'Les coûts des soins, des cours et des engagements de ce cheval apparaîtront ici.'));
};

function rationHtml(h) {
  const lines = h.ration || [];
  const others = chevaux().some(x => x.id !== h.id && (x.ration || []).length);
  const actions = `<div class="btnrow"><button type="button" class="btn small primary" data-act="new" data-what="ration" data-hid="${h.id}">${ic('plus', 'sm')}Aliment</button>${others ? `<button type="button" class="btn small" data-act="copy-ration" data-hid="${h.id}">${ic('copy', 'sm')}Copier une autre ration</button>` : ''}</div>`;
  if (!lines.length) return emptyH('Pas encore de ration', 'Ajoute chaque aliment avec sa quantité et les repas où il est donné : il apparaîtra dans les rations du jour.') + actions;
  const rows = lines.map(l => {
    const repas = (l.repas || []).map(id => (REPAS.find(r => r.id === id) || {}).label).filter(Boolean).join(', ').toLowerCase();
    const tot = l.qte != null ? `${num(l.qte * nbRepas(l), 2)} ${esc(l.unite || '')}/j` : '';
    return `<button type="button" class="row" data-act="edit-ration" data-hid="${h.id}" data-lid="${l.id}">${lead(estFoin(l) ? 'bale' : 'bowl')}<div class="row-main"><div class="row-t">${esc(l.aliment)}</div><div class="row-s">${l.qte != null ? `${num(l.qte, 2)} ${esc(l.unite || '')} × ` : ''}${esc(repas)}</div></div><span class="row-end num">${tot}</span></button>`;
  }).join('');
  const hay = lines.filter(estFoin).reduce((a, l) => { const q = kgLigne(l); return a + (q != null ? q * nbRepas(l) : 0); }, 0);
  const pct = h.poids && hay ? ` · ${num(hay / h.poids * 100, 1)} % de son poids` : '';
  return `<div class="list">${rows}</div>${hay ? `<p class="note">Foin : <b>${num(hay)} kg par jour</b>${pct}.</p>` : ''}${actions}`;
}

function soinsHtml(h) {
  const t = todayISO(), yr = t.slice(0, 4);
  const R = rappels(h.id);
  const ss = soinsDe(h.id).sort((a, b) => b.date.localeCompare(a.date));
  const rap = R.length ? `<div class="list">${R.map(rowRappel).join('')}</div>`
    : `<p class="note">Les rappels apparaissent dès qu'un soin à intervalle (vaccin, vermifuge, maréchal, dentiste, ostéo) est enregistré. Les intervalles se règlent dans les réglages.</p>`;
  const cost = ss.filter(s => s.date.startsWith(yr) && s.statut !== 'prevu').reduce((a, s) => a + (Number(s.cout) || 0), 0);
  const hist = ss.length ? `<div class="list">${ss.map(rowSoin).join('')}</div>${cost ? `<p class="note">Dépenses de soins en ${yr} : <b>${num(cost, 2)} €</b></p>` : ''}`
    : emptyH('Aucun soin enregistré', 'Utilise le bouton + pour noter un vaccin, un vermifuge, le passage du maréchal…');
  return section('Rappels', rap) + section('Historique', hist);
}
function rowSoin(s) {
  const sub = [dFull(s.date), s.praticien, s.produit].filter(Boolean).join(' · ');
  const end = s.statut === 'prevu' ? '<span class="pill info">Prévu</span>' : (s.cout ? `<span class="row-end num">${num(Number(s.cout), 2)} €</span>` : '');
  return `<button type="button" class="row" data-act="edit-soin" data-id="${s.id}">${lead(soinIcon(s))}<div class="row-main"><div class="row-t">${esc(soinLabel(s))} ${exTag(s)}</div><div class="row-s">${esc(sub)}</div></div>${end}</button>`;
}
function concoursCheval(h) {
  const t = todayISO(), st = statsConcours(h.id);
  const cs = list('concours').filter(c => c.horseId === h.id).sort((a, b) => b.date.localeCompare(a.date));
  if (!cs.length) return emptyH('Aucun concours', 'Ajoute une sortie avec le bouton + : date, lieu, épreuve, puis le résultat.');
  const stats = `<div class="stats"><div class="stat"><b>${st.sorties}</b><span>${pl(st.sorties, 'sortie')}</span></div><div class="stat"><b>${st.podiums}</b><span>${pl(st.podiums, 'podium')}</span></div><div class="stat"><b>${st.best ? ordinal(st.best) : '–'}</b><span>meilleure place</span></div></div>`;
  const up = cs.filter(c => c.date >= t).reverse(), past = cs.filter(c => c.date < t);
  return stats + (up.length ? section('À venir', `<div class="list">${up.map(c => ccard(c, false)).join('')}</div>`) : '')
    + (past.length ? section('Résultats', `<div class="list">${past.map(c => ccard(c, false)).join('')}</div>`) : '');
}
