/* ---------- Santé du cheval : poids et état corporel, documents à échéance, carnet de santé à imprimer ----------
   Tout est rangé dans la fiche du cheval (h.pesees, h.documents) : le partage avec un propriétaire en pension
   et la sauvegarde les emportent sans rien de plus. */

/* Note d'état corporel, grille de 0 à 5 de l'IFCE (3 : bon état) */
const NEC = [
  { v: 0, l: 'Très maigre' }, { v: 1, l: 'Maigre' }, { v: 2, l: 'Mince' },
  { v: 3, l: 'Bon état' }, { v: 4, l: 'Gras' }, { v: 5, l: 'Très gras' }
];
const necTxt = n => { const x = NEC.find(e => e.v === Number(n)); return x ? `${x.v} · ${x.l}` : ''; };
const PESEES_MAX = 60;

/* Poids estimé au ruban (formules INRA reprises par l'IFCE, précision d'environ 25 kg) :
   chevaux de sport 3 × HG + 4,3 × TP − 785 ; poneys de plus d'1 m 3,56 × HG + 3,65 × TP − 714,66 ;
   chevaux de trait 7,3 × TP − 800 (HG : hauteur au garrot, TP : tour de poitrine, en cm) */
const RACES_TRAIT = ['Comtois', 'Percheron', 'Breton', 'Ardennais', 'Boulonnais', 'Cob normand', 'Trait', 'Auxois', 'Poitevin', 'Mulassier'];
function poidsRuban(tour, h) {
  const tp = Number(tour), hg = Number(h && h.taille);
  if (!(tp >= 100 && tp <= 260)) return null;
  const race = String((h && h.race) || '');
  let p, f;
  if (RACES_TRAIT.some(r => race.includes(r))) { p = 7.3 * tp - 800; f = 'chevaux de trait'; }
  else if (!(hg >= 90 && hg <= 200)) return null;
  else if (hg < 149) { p = 3.56 * hg + 3.65 * tp - 714.66; f = 'poneys'; }
  else { p = 3 * hg + 4.3 * tp - 785; f = 'chevaux de selle et de sport'; }
  return p >= 60 ? { kg: Math.round(p / 5) * 5, f } : null;
}

const peseesDe = h => (Array.isArray(h && h.pesees) ? h.pesees : []).filter(x => x && validISO(x.d)).sort((a, b) => a.d.localeCompare(b.d));
/* Le poids de la fiche suit la dernière pesée qui en donne un */
function poidsActuel(lst) { const p = lst.filter(x => x.poids > 0); return p.length ? p[p.length - 1].poids : null; }
function enregistrerPesees(hid, lst) {
  const cur = cheval(hid);
  if (!cur) return;
  lst = lst.sort((a, b) => a.d.localeCompare(b.d)).slice(-PESEES_MAX);
  const p = poidsActuel(lst);
  put('chevaux', Object.assign({}, cur, { pesees: lst }, p ? { poids: p } : {}));
}

/* Courbe de poids : les dates sont placées à leur vraie distance */
function courbePoids(h, lst) {
  const pts = lst.filter(x => x.poids > 0).slice(-12);
  if (pts.length < 2) return '';
  const W = 320, H = 96, px = 34, py = 14;
  const t0 = new Date(pts[0].d).getTime(), t1 = new Date(pts[pts.length - 1].d).getTime() || t0 + 1;
  let lo = Math.min(...pts.map(p => p.poids)), hi = Math.max(...pts.map(p => p.poids));
  if (hi - lo < 20) { const m = (hi + lo) / 2; lo = m - 10; hi = m + 10; }
  const X = d => px + (t1 === t0 ? 0 : (new Date(d).getTime() - t0) / (t1 - t0)) * (W - px - 10);
  const Y = v => py + (1 - (v - lo) / (hi - lo)) * (H - 2 * py);
  const ligne = pts.map(p => `${X(p.d).toFixed(1)},${Y(p.poids).toFixed(1)}`).join(' ');
  const dern = pts[pts.length - 1];
  return `<svg class="courbe" viewBox="0 0 ${W} ${H}" role="img" aria-label="Poids de ${esc(h.nom)} : ${pts.map(p => `${num(p.poids, 0)} kg le ${dShort(p.d)}`).join(', ')}">
    <line x1="${px}" x2="${W - 10}" y1="${Y(hi).toFixed(1)}" y2="${Y(hi).toFixed(1)}" class="c-grille"/><line x1="${px}" x2="${W - 10}" y1="${Y(lo).toFixed(1)}" y2="${Y(lo).toFixed(1)}" class="c-grille"/>
    <text x="${px - 6}" y="${(Y(hi) + 4).toFixed(1)}" class="c-txt" text-anchor="end">${num(Math.round(hi), 0)}</text><text x="${px - 6}" y="${(Y(lo) + 4).toFixed(1)}" class="c-txt" text-anchor="end">${num(Math.round(lo), 0)}</text>
    <polyline points="${ligne}" class="c-ligne"/>
    ${pts.map(p => `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.poids).toFixed(1)}" r="${p === dern ? 4.5 : 3}" class="c-pt${p === dern ? ' dern' : ''}"/>`).join('')}
  </svg>`;
}

function poidsHtml(h) {
  const lst = peseesDe(h), ro = sync.readOnly;
  const add = ro ? '' : `<button type="button" class="link" data-act="new-pesee" data-hid="${h.id}">${ic('plus', 'sm')}Pesée</button>`;
  if (!lst.length) return section('Poids et état', `<p class="note">Note de temps en temps le poids (balance ou ruban) et l'état corporel : la courbe montre tout de suite si ${esc(h.nom)} prend ou perd.${h.poids ? ` Poids indiqué dans la fiche : <b>${num(h.poids, 0)} kg</b>.` : ''}</p>`, add);
  const avecPoids = lst.filter(x => x.poids > 0), dern = avecPoids[avecPoids.length - 1];
  let resume = '';
  if (dern) {
    // écart avec la pesée d'environ un mois avant au moins
    const avant = [...avecPoids].reverse().find(x => diffDays(x.d, dern.d) >= 21);
    const ecart = avant ? dern.poids - avant.poids : null;
    resume = `<div class="poids-r"><b class="num">${num(dern.poids, 0)} kg</b><span>${dern.estime ? 'estimé au ruban' : 'pesé'} le ${dShort(dern.d)}${ecart != null ? ` · <span class="${Math.abs(ecart) >= Math.max(15, dern.poids * 0.03) ? 'ecart' : ''}">${ecart > 0 ? '+' : ecart < 0 ? '−' : '±'}${num(Math.abs(ecart), 0)} kg depuis le ${dShort(avant.d)}</span>` : ''}</span></div>`;
  }
  const nec = [...lst].reverse().find(x => x.nec != null);
  if (nec) resume += `<p class="note">État corporel : <b>${necTxt(nec.nec)}</b> (le ${dShort(nec.d)})</p>`;
  const rows = [...lst].reverse().slice(0, 6).map(x => {
    const t = [x.poids ? `${num(x.poids, 0)} kg${x.estime ? ' (ruban)' : ''}` : '', x.nec != null ? `état ${x.nec}` : ''].filter(Boolean).join(' · ') || 'Pesée';
    const s = [dFull(x.d), x.tour ? `tour de poitrine ${num(x.tour, 0)} cm` : '', x.note].filter(Boolean).join(' · ');
    return `<button type="button" class="row" data-act="edit-pesee" data-hid="${h.id}" data-id="${esc(x.id)}">${lead('poids')}<div class="row-main"><div class="row-t">${esc(t)}</div><div class="row-s">${esc(s)}</div></div></button>`;
  }).join('');
  return section('Poids et état', `<div class="card poids">${resume}${courbePoids(h, lst)}</div><div class="list">${rows}</div>${lst.length > 6 ? `<p class="note">${lst.length} pesées en tout, toutes reprises dans le carnet de santé.</p>` : ''}`, add);
}

function formPesee(hid, id) {
  const h = cheval(hid);
  if (!h) return;
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const ex = id ? peseesDe(h).find(x => x.id === id) : null;
  if (id && !ex) return;
  const x = ex ? clone(ex) : { id: 'pz' + uid(), d: todayISO(), poids: null, nec: null, tour: null, note: '' };
  const body = `
    ${fld('Date', inp('f_pd', x.d, `type="date" max="${todayISO()}"`))}
    <div class="grid2">${fld('Poids (kg)', inp('f_pkg', x.poids && !x.estime ? x.poids : '', numAttr + ' placeholder="ex. 520"'))}${fld('Tour de poitrine (cm)', inp('f_ptour', x.tour || '', numAttr + ' placeholder="ex. 190"'), 'Mesuré au ruban, juste derrière le garrot.')}</div>
    <p class="note" id="w_est"></p>
    ${grp('État corporel', chips('nec', NEC.map(e => ({ v: String(e.v), l: String(e.v), aria: `${e.v} : ${e.l}` })), x.nec != null ? [String(x.nec)] : [], { optional: true }), "De 0 (très maigre) à 5 (très gras), 3 étant le bon état. On regarde l'encolure, le dos, les côtes et la croupe.")}
    ${fld('Note', inp('f_pnote', x.note, 'maxlength="120" placeholder="Après le changement de ration, en sortie de pré…"'))}`;
  openSheet(ex ? `Pesée · ${h.nom}` : `Nouvelle pesée · ${h.nom}`, body, {
    onMount: f => {
      const maj = () => {
        const e = poidsRuban(parseNum(val('f_ptour')), h), w = $('#w_est');
        w.innerHTML = e ? `Au ruban : environ <b>${num(e.kg, 0)} kg</b> (± 25 kg, formule INRA pour les ${e.f}).${val('f_pkg') ? '' : ' Ce poids sera noté comme estimé.'}`
          : val('f_ptour') && !h.taille && !RACES_TRAIT.some(r => String(h.race || '').includes(r)) ? `Indique la taille de ${esc(h.nom)} dans sa fiche pour estimer le poids au ruban.` : '';
      };
      $('#f_ptour').addEventListener('input', maj); $('#f_pkg').addEventListener('input', maj); maj();
    },
    onSubmit: f => {
      const d = val('f_pd');
      if (!validISO(d)) return 'Indique la date.';
      if (d > todayISO()) return 'La pesée ne peut pas être dans le futur.';
      const rawP = val('f_pkg'), rawT = val('f_ptour'), p = parseNum(rawP), tour = parseNum(rawT), necV = chipVal(f, 'nec');
      if (rawP && !(p >= 30 && p <= 1300)) return 'Le poids doit être en kilos, entre 30 et 1 300.';
      if (rawT && !(tour >= 60 && tour <= 300)) return 'Le tour de poitrine doit être en centimètres, par exemple 190.';
      const e = !rawP && rawT ? poidsRuban(tour, h) : null;
      if (!rawP && !rawT && necV == null) return "Note au moins le poids, le tour de poitrine ou l'état corporel.";
      Object.assign(x, { d, poids: rawP ? Math.round(p) : e ? e.kg : null, estime: !rawP && !!e, tour: rawT ? Math.round(tour) : null, nec: necV != null ? Number(necV) : null, note: val('f_pnote') });
      const cur = cheval(hid);
      enregistrerPesees(hid, peseesDe(cur).filter(z => z.id !== x.id).concat(x));
      toast(ex ? 'Pesée enregistrée' : x.poids ? `${h.nom} : ${num(x.poids, 0)} kg` : 'Pesée enregistrée');
    },
    onDelete: ex ? () => {
      const cur = cheval(hid), prev = clone(cur);
      enregistrerPesees(hid, peseesDe(cur).filter(z => z.id !== x.id));
      toast('Pesée supprimée', { undo: () => put('chevaux', prev) });
    } : null
  });
}
ACT['new-pesee'] = d => formPesee(d.hid);
ACT['edit-pesee'] = d => formPesee(d.hid, d.id);

/* ---------- Documents du cheval ---------- */
const DOCS = [
  { id: 'assurance', l: 'Assurance', icon: 'doc', ph: 'Assureur, type de garantie', num: 'N° de contrat' },
  { id: 'livret', l: 'Livret signalétique', icon: 'doc', ph: 'Passeport, livret', num: 'N° du livret' },
  { id: 'carte', l: "Carte d'immatriculation", icon: 'card', ph: 'Carte SIRE', num: 'N° de la carte' },
  { id: 'sanitaire', l: 'Certificat sanitaire', icon: 'stetho', ph: 'Test de Coggins, certificat de voyage', num: 'Référence' },
  { id: 'contrat', l: 'Contrat', icon: 'doc', ph: 'Pension, demi-pension, location', num: 'Référence' },
  { id: 'autre', l: 'Autre document', icon: 'doc', ph: 'Intitulé', num: 'Numéro' }
];
const docType = id => DOCS.find(x => x.id === id) || DOCS[DOCS.length - 1];
const DOC_AVANCE = 30;   // jours : l'accueil prévient un mois avant l'échéance
const docsDe = h => (Array.isArray(h && h.documents) ? h.documents : []).filter(x => x && x.id);
const docTitre = x => x.type === 'autre' && x.nom ? x.nom : docType(x.type).l;
function docPill(x) {
  if (!validISO(x.echeance)) return '';
  const j = diffDays(todayISO(), x.echeance);
  if (j < 0) return '<span class="pill danger">Échu</span>';
  if (j <= DOC_AVANCE) return `<span class="pill warn">${j === 0 ? "Aujourd'hui" : `Dans ${nJ(j)}`}</span>`;
  return '';
}
function documentsHtml(h) {
  const lst = docsDe(h).sort((a, b) => (a.echeance || '9999').localeCompare(b.echeance || '9999') || docTitre(a).localeCompare(docTitre(b), 'fr'));
  const add = sync.readOnly ? '' : `<button type="button" class="link" data-act="new-doc" data-hid="${h.id}">${ic('plus', 'sm')}Document</button>`;
  if (!lst.length) return section('Documents', `<p class="note">Assurance, livret, carte d'immatriculation, certificat sanitaire… Avec une date d'échéance, l'accueil prévient un mois avant.</p>`, add);
  return section('Documents', `<div class="list">${lst.map(x => {
    const s = [x.type !== 'autre' ? x.nom : '', x.numero, validISO(x.echeance) ? `jusqu'au ${dFull(x.echeance)}` : ''].filter(Boolean).join(' · ');
    return `<button type="button" class="row" data-act="edit-doc" data-hid="${h.id}" data-id="${esc(x.id)}">${lead(docType(x.type).icon)}<div class="row-main"><div class="row-t">${esc(docTitre(x))}</div><div class="row-s">${esc(s || 'Sans échéance')}</div></div>${docPill(x)}</button>`;
  }).join('')}</div>`, add);
}
function formDoc(hid, id) {
  const h = cheval(hid);
  if (!h) return;
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const ex = id ? docsDe(h).find(x => x.id === id) : null;
  if (id && !ex) return;
  const x = ex ? clone(ex) : { id: 'doc' + uid(), type: null, nom: '', numero: '', echeance: null, note: '' };
  const body = `
    ${grp('Document', chips('dtype', DOCS.map(t => ({ v: t.id, l: t.l })), x.type ? [x.type] : []))}
    ${fld('Intitulé', inp('f_dnom', x.nom, `maxlength="80" placeholder="${esc(docType(x.type).ph)}"`))}
    <div class="grid2">${fld('Numéro', inp('f_dnum', x.numero, 'maxlength="40" autocomplete="off"'))}${fld('Échéance', inp('f_dech', x.echeance, 'type="date"'), 'Vide : pas de rappel.')}</div>
    ${fld('Note', area('f_dnote', x.note, 'rows="2" maxlength="300" placeholder="Garanties, où est rangé l\'original, qui contacter…"'))}`;
  openSheet(ex ? `${docTitre(ex)} · ${h.nom}` : `Document · ${h.nom}`, body, {
    onMount: f => f.addEventListener('chipchange', e => {
      if (e.detail.name !== 'dtype') return;
      const t = docType(chipVal(f, 'dtype'));
      $('#f_dnom').placeholder = t.ph; $('#f_dnum').closest('label').querySelector('span').textContent = t.num;
    }),
    onSubmit: f => {
      const type = chipVal(f, 'dtype');
      if (!type) return 'Choisis le type de document.';
      if (type === 'autre' && !val('f_dnom')) return "Donne un intitulé au document.";
      const ech = val('f_dech');
      if (ech && !validISO(ech)) return "La date d'échéance n'est pas valable.";
      Object.assign(x, { type, nom: val('f_dnom'), numero: val('f_dnum'), echeance: ech || null, note: val('f_dnote') });
      const cur = cheval(hid);
      put('chevaux', Object.assign({}, cur, { documents: docsDe(cur).filter(z => z.id !== x.id).concat(x) }));
      const j = validISO(x.echeance) ? diffDays(todayISO(), x.echeance) : null;
      toast(j != null && j < 0 ? 'Document enregistré : il est déjà échu' : 'Document enregistré');
    },
    onDelete: ex ? () => {
      const cur = cheval(hid), prev = clone(cur);
      put('chevaux', Object.assign({}, cur, { documents: docsDe(cur).filter(z => z.id !== x.id) }));
      toast('Document supprimé', { undo: () => put('chevaux', prev) });
    } : null
  });
}
ACT['new-doc'] = d => formDoc(d.hid);
ACT['edit-doc'] = d => formDoc(d.hid, d.id);

/* Alertes de l'accueil : documents échus ou à renouveler dans le mois */
function alertesSante(out) {
  chevaux().forEach(h => docsDe(h).forEach(x => {
    if (!validISO(x.echeance)) return;
    const j = diffDays(todayISO(), x.echeance);
    if (j > DOC_AVANCE) return;
    out.push({ sev: j < 0 ? 'danger' : 'warn', icon: docType(x.type).icon, t: `${h.nom} · ${docTitre(x)}`,
      s: j < 0 ? `Échu depuis le ${dShort(x.echeance)}` : `À renouveler ${dRel(x.echeance)}`, act: `data-act="edit-doc" data-hid="${h.id}" data-id="${esc(x.id)}"`, ord: j });
  }));
}

/* ---------- Carnet de santé : à montrer au vétérinaire, à imprimer ou à enregistrer en PDF ---------- */
ACT.carnet = d => push('carnet', { id: d.id });
function carnetHtml(h) {
  const t = todayISO(), e = ecurieOuverte(), ss = soinsDe(h.id).filter(s => s.statut !== 'prevu' && validISO(s.date)).sort((a, b) => b.date.localeCompare(a.date));
  const cell = v => `<td>${v ? esc(v) : '<span class="cn-vide">—</span>'}</td>`;
  const table = (tetes, lignes, vide) => lignes.length
    ? `<table><thead><tr>${tetes.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${lignes.map(l => `<tr>${l.map(cell).join('')}</tr>`).join('')}</tbody></table>`
    : `<p class="cn-rien">${vide}</p>`;
  const bloc = (titre, inner) => `<section class="cn-bloc"><h3>${titre}</h3>${inner}</section>`;
  const deTypes = ids => ss.filter(s => soinTypes(s).some(x => ids.includes(x)));
  const vac = deTypes(SOINS.filter(x => x.vac).map(x => x.id)).filter(s => s.date >= addDays(t, -365 * 6));
  const verm = deTypes(['vermifuge']).filter(s => s.date >= addDays(t, -730));
  const autres = ss.filter(s => soinTypes(s).some(x => !SOINS.find(y => y.id === x && (y.vac || y.id === 'vermifuge'))) && s.date >= addDays(t, -730));
  const lesTypes = (s, garde) => soinTypes(s).filter(garde).map(x => x === 'autre' && s.label ? s.label : soinType(x).label).join(', ');
  const R = rappels(h.id).sort((a, b) => a.due.localeCompare(b.due));
  const prevus = soinsDe(h.id).filter(s => s.statut === 'prevu' && s.date >= t).sort((a, b) => a.date.localeCompare(b.date));
  const pz = peseesDe(h).reverse();
  const docs = docsDe(h).sort((a, b) => (a.echeance || '9999').localeCompare(b.echeance || '9999'));
  const prop = h.proprietaire || nomDe({ uid: h.propUid, nom: '' });
  const ident = [['Sexe', h.sexe], ['Race', h.race], ['Robe', h.robe], ['Naissance', validISO(h.naissance) ? `${dFull(h.naissance)} (${ageTxt(h.naissance)})` : ''],
    ['Taille', h.taille ? `${num(h.taille, 0)} cm` : ''], ['Poids', h.poids ? `${num(h.poids, 0)} kg` : ''], ['N° SIRE / UELN', h.sire], ['Transpondeur', h.puce],
    ['Propriétaire', prop], ['Écurie', e && e.nom ? [e.nom, e.commune].filter(Boolean).join(', ') : '']].filter(([, v]) => v);
  const ration = (h.ration || []).filter(l => l && l.aliment).map(l => `${l.aliment}${l.qte != null ? ` ${num(l.qte, 2)} ${l.unite || ''}` : ''}${(l.repas || []).length ? ` (${l.repas.map(r => (REPAS.find(x => x.id === r) || { label: r }).label.toLowerCase()).join(', ')})` : ''}`);
  return `<article class="carnet">
    <header class="cn-tete"><div><p class="cn-sur">Carnet de santé</p><h2>${esc(h.nom)}</h2></div><p class="cn-date">Édité le ${dFull(t)}</p></header>
    <dl class="cn-id">${ident.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${bloc('Prochains rappels', table(['Soin', 'Dernier', 'À faire le'], [...prevus.map(s => [soinLabel(s), '', `${dFull(s.date)} (prévu${s.praticien ? ', ' + s.praticien : ''})`]),
      ...R.filter(r => !r.planned).map(r => [r.type.label, dFull(r.last.date), dFull(r.due) + (r.days < 0 ? ' (en retard)' : '')])], 'Aucun rappel en cours.'))}
    ${bloc('Vaccinations', table(['Date', 'Vaccin', 'Produit, lot', 'Praticien'], vac.map(s => [dFull(s.date), lesTypes(s, x => soinType(x).vac), s.produit, s.praticien]), 'Aucun vaccin noté ces six dernières années.'))}
    ${bloc('Vermifuges', table(['Date', 'Produit', 'Par'], verm.map(s => [dFull(s.date), s.produit, s.praticien]), 'Aucun vermifuge noté ces deux dernières années.'))}
    ${bloc('Soins et visites', table(['Date', 'Soin', 'Praticien', 'Notes'], autres.map(s => [dFull(s.date), lesTypes(s, x => !soinType(x).vac && x !== 'vermifuge'), s.praticien, [s.produit, s.notes].filter(Boolean).join(' · ')]), 'Aucun soin noté ces deux dernières années.'))}
    ${pz.length ? bloc('Poids et état corporel', table(['Date', 'Poids', 'État (0 à 5)', 'Note'], pz.slice(0, 12).map(x => [dFull(x.d), x.poids ? `${num(x.poids, 0)} kg${x.estime ? ' (ruban)' : ''}` : '', x.nec != null ? necTxt(x.nec) : '', x.note]), '')) : ''}
    ${ration.length ? bloc('Ration actuelle', `<p class="cn-txt">${esc(ration.join(' · '))}</p>`) : ''}
    ${docs.length ? bloc('Documents', table(['Document', 'Numéro', 'Échéance'], docs.map(x => [[docTitre(x), x.type !== 'autre' ? x.nom : ''].filter(Boolean).join(' · '), x.numero, validISO(x.echeance) ? dFull(x.echeance) : '']), '')) : ''}
    ${h.notes ? bloc('À savoir', `<p class="cn-txt">${esc(h.notes)}</p>`) : ''}
    <footer class="cn-pied">Tenu avec EquiValdi${e && e.nom ? ` · ${esc(e.nom)}` : ''} · les données viennent du carnet de l'écurie, à vérifier avec le livret du cheval.</footer>
  </article>`;
}
VIEWS.carnet = p => {
  const h = cheval(p.id);
  if (!h) return { title: 'Carnet de santé', html: empty('Fiche introuvable', 'Ce cheval a été supprimé.'), back: true };
  return { title: `Carnet · ${h.nom}`, eyebrow: 'Carnet de santé', back: true, fab: null,
    html: `<div class="btnrow"><button type="button" class="btn primary" data-act="carnet-imprimer" data-id="${h.id}">${ic('download', 'sm')}Imprimer ou enregistrer en PDF</button></div>
      <p class="note">À montrer au vétérinaire, ou à joindre à un dossier d'assurance ou de vente. Sur le téléphone, choisis « Enregistrer en PDF » dans la fenêtre d'impression.</p>${carnetHtml(h)}` };
};
ACT['carnet-imprimer'] = d => { const h = cheval(d.id); if (h) imprimer(carnetHtml(h), `Carnet de santé ${h.nom} ${todayISO()}`); };

/* Impression : seul le bloc #impression sort sur le papier ; le titre de la page donne le nom du PDF */
function imprimer(html, titre) {
  let el = document.getElementById('impression');
  if (!el) { el = document.createElement('div'); el.id = 'impression'; document.body.appendChild(el); }
  el.innerHTML = html;
  const avant = document.title;
  document.title = titre;
  const fin = () => { document.title = avant; window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  setTimeout(() => { try { window.print(); } catch (e) { fin(); toast("L'impression n'est pas possible sur cet appareil.", { danger: true }); } }, 50);
}
