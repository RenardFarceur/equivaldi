/* ---------- Autres stocks : aliments, litière, produits de soin ----------
   Collection « stocks » : des articles { kind: 'article' } et leurs mouvements { kind: 'mvt' }.
   Un article lié à un aliment des rations prévoit sa durée tout seul ; sinon, les sacs ouverts donnent le rythme. */

const STOCK_CATS = [
  { id: 'aliment', l: 'Aliment', icon: 'bowl' }, { id: 'litiere', l: 'Litière', icon: 'barn' },
  { id: 'soin', l: 'Soins', icon: 'pill' }, { id: 'autre', l: 'Autre', icon: 'sac' }
];
const stockCat = id => STOCK_CATS.find(c => c.id === id) || STOCK_CATS[3];
const CONDITIONNEMENTS = ['sac', 'seau', 'ballot', 'bidon', 'botte', 'boîte', 'pièce'];
/* Articles proposés au départ : contenances courantes, à corriger à la première livraison */
const STOCK_SUGG = [
  { nom: 'Granulés', cat: 'aliment', unite: 'sac', contenance: 25, cu: 'kg' },
  { nom: 'Floconnés', cat: 'aliment', unite: 'sac', contenance: 20, cu: 'kg' },
  { nom: 'Luzerne', cat: 'aliment', unite: 'sac', contenance: 20, cu: 'kg' },
  { nom: 'CMV (minéraux)', cat: 'aliment', unite: 'seau', contenance: 10, cu: 'kg' },
  { nom: 'Huile', cat: 'aliment', unite: 'bidon', contenance: 5, cu: 'L' },
  { nom: 'Copeaux', cat: 'litiere', unite: 'ballot', contenance: 20, cu: 'kg' },
  { nom: 'Paille', cat: 'litiere', unite: 'botte', contenance: 15, cu: 'kg' },
  { nom: 'Vermifuges', cat: 'soin', unite: 'pièce', contenance: 1, cu: '' }
];
const STOCK_JOURS = 14;   // jours : l'accueil prévient quand le stock tient moins longtemps

const articles = (tous = false) => list('stocks').filter(x => x.kind === 'article' && (tous || !x.archive)).sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
const mvtsDe = aid => list('stocks').filter(x => x.kind === 'mvt' && x.article === aid && validISO(x.date));
const uniteTxt = (a, n) => { const u = a.unite || 'pièce'; return Math.abs(n) > 1 || n === 0 ? (u === 'pièce' ? 'pièces' : plWords(u)) : u; };
const qteTxt = (a, n) => `${num(n, Number.isInteger(n) ? 0 : 1)} ${uniteTxt(a, n)}`;
const contenanceTxt = a => a.contenance && a.cu ? `${uniteTxt(a, 1)} de ${num(a.contenance, 2)} ${a.cu}` : '';
const memeAliment = (x, y) => String(x || '').trim().toLowerCase() === String(y || '').trim().toLowerCase();

/* Stock, rythme et durée d'un article */
function etatStock(a) {
  const ms = mvtsDe(a.id), t = todayISO();
  const n = Math.round(ms.reduce((s, m) => s + (m.sens === 'in' ? 1 : -1) * (Number(m.qte) || 0), 0) * 100) / 100;
  // d'après les rations : kg (ou litres) par jour des lignes qui portent ce nom d'aliment
  let parJour = 0, lignes = 0, horsUnite = 0;
  if (a.aliment && a.contenance > 0) chevaux().forEach(h => (h.ration || []).forEach(l => {
    if (!memeAliment(l.aliment, a.aliment)) return;
    const q = Number(l.qte);
    if (!Number.isFinite(q) || q <= 0) return;
    const v = a.cu === 'kg' && (l.unite === 'kg' || l.unite === 'g') ? kgLigne(l) : a.cu === 'L' && l.unite === 'L' ? q : null;
    if (v == null) { horsUnite++; return; }
    parJour += v * nbRepas(l); lignes++;
  }));
  const ration = parJour > 0 ? parJour / a.contenance : null;   // unités par jour
  // d'après les sorties (sacs ouverts) des 60 derniers jours, s'il y en a sur au moins deux semaines
  const outs = ms.filter(m => m.sens === 'out' && !m.inventaire && m.date > addDays(t, -60) && m.date <= t);
  let reel = null;
  if (outs.length >= 2) {
    const span = diffDays(outs.reduce((x, m) => (m.date < x ? m.date : x), t), t);
    if (span >= 14) reel = outs.reduce((s, m) => s + (Number(m.qte) || 0), 0) / span;
  }
  const rythme = ration || reel, src = ration ? 'ration' : reel ? 'reel' : null;
  const jours = rythme && n > 0 ? n / rythme : rythme ? 0 : null;
  const bas = a.seuil != null && a.seuil !== '' && n <= Number(a.seuil);
  const sev = n <= 0 ? 'danger' : jours != null && jours < 5 ? 'danger' : (jours != null && jours < STOCK_JOURS) || bas ? 'warn' : null;
  return { n, ration, reel, rythme, src, jours, bas, sev, lignes, horsUnite, parJour };
}

function rowArticle(a) {
  const e = etatStock(a);
  const sub = [e.jours != null ? (e.n > 0 ? `≈ ${nJ(Math.floor(e.jours))}` : 'épuisé') : '', contenanceTxt(a), e.bas && e.n > 0 ? 'seuil d\'alerte atteint' : ''].filter(Boolean).join(' · ') || stockCat(a.cat).l;
  return `<div class="bale-row stock-row" data-key="st-${esc(a.id)}">
    <button type="button" class="stock-main" data-act="open-stock" data-id="${esc(a.id)}">${lead(stockCat(a.cat).icon)}<div class="row-main"><div class="row-t">${esc(a.nom)}</div><div class="row-s${e.sev ? ' sev-' + e.sev : ''}">${esc(sub)}</div></div></button>
    <span class="big" aria-label="${qteTxt(a, e.n)} en stock">${num(e.n, Number.isInteger(e.n) ? 0 : 1)}</span>
    <button type="button" class="stepbtn out" data-act="stock-out" data-id="${esc(a.id)}" aria-label="Ouvrir : ${esc(a.nom)}">${ic('minus')}</button>
    <button type="button" class="stepbtn" data-act="stock-in" data-id="${esc(a.id)}" aria-label="Entrée : ${esc(a.nom)}">${ic('plus')}</button></div>`;
}

/* La vue « Autres stocks », dans l'onglet Foin */
function stocksHtml() {
  const as = articles();
  const ajout = sync.readOnly ? '' : `<button type="button" class="link" data-act="new-article">${ic('plus', 'sm')}Article</button>`;
  if (!as.length) {
    const sugg = sync.readOnly ? '' : `<div class="wrap">${STOCK_SUGG.map((s, i) => `<button type="button" class="chip" data-act="stock-sugg" data-i="${i}">${ic('plus', 'sm')}${esc(s.nom)}</button>`).join('')}</div>`;
    return section('Autres stocks', `${emptyH('Aliments, litière, produits', "Granulés, CMV, copeaux… Touche − à chaque sac ouvert : le carnet prévient avant qu'il n'en manque. Lié aux rations, il calcule même combien de jours il te reste.")}${sugg}`, ajout);
  }
  const groupes = STOCK_CATS.map(c => ({ c, xs: as.filter(a => stockCat(a.cat).id === c.id) })).filter(g => g.xs.length);
  let html = groupes.map(g => section({ aliment: 'Aliments', litiere: 'Litière', soin: 'Produits de soin', autre: 'Autres articles' }[g.c.id], `<div class="card stock-card">${g.xs.map(rowArticle).join('')}</div>`, g === groupes[0] ? ajout : '')).join('');
  html += `<p class="note">Touche − à chaque ${as.length === 1 ? uniteTxt(as[0], 1) : 'sac, seau ou ballot'} ouvert, + à chaque livraison. Touche le nom pour l'historique, les achats et le recomptage.</p>`;
  // achats des 12 derniers mois
  const since = addDays(todayISO(), -365);
  const achats = list('stocks').filter(m => m.kind === 'mvt' && m.sens === 'in' && !m.inventaire && m.date > since && Number(m.prix) > 0);
  if (achats.length) {
    const tot = achats.reduce((s, m) => s + (Number(m.qte) || 0) * Number(m.prix), 0);
    html += section('Achats sur 12 mois', `<div class="stats"><div class="stat"><b>${num(tot, 0)} €</b><span>hors foin</span></div><div class="stat"><b>${num(tot / 12, 0)} €</b><span>par mois</span></div></div>`);
  }
  return html;
}

/* Fiche d'un article : état, rythme, mouvements */
ACT['open-stock'] = d => push('stock', { id: d.id });
VIEWS.stock = p => {
  const a = get('stocks', p.id);
  if (!a || a.kind !== 'article') return { title: 'Stock', back: true, html: empty('Article introuvable', 'Il a été supprimé.') };
  const e = etatStock(a), ro = sync.readOnly;
  let rythme;
  if (e.src === 'ration') rythme = `${num(e.parJour, 2)} ${a.cu} par jour d'après ${e.lignes} ${pl(e.lignes, 'ligne')} de ration, soit ${num(e.ration, 2)} ${uniteTxt(a, e.ration)} par jour.`;
  else if (e.src === 'reel') rythme = `${num(e.reel, 2)} ${uniteTxt(a, e.reel)} par jour, d'après les ${uniteTxt(a, 2)} ouverts ces dernières semaines.`;
  else rythme = a.aliment ? `Aucune ration ne contient « ${esc(a.aliment)} » en ${a.cu === 'L' ? 'litres' : 'kg ou g'}${e.horsUnite ? ` (${e.horsUnite} ${pl(e.horsUnite, 'ligne')} en mesures ou poignées ne se ${pl(e.horsUnite, 'convertit', 'convertissent')} pas)` : ''}. Touche − à chaque ${uniteTxt(a, 1)} ouvert : au bout de deux semaines, le carnet connaîtra ton rythme.`
    : `Touche − à chaque ${uniteTxt(a, 1)} ouvert : au bout de deux semaines, le carnet connaîtra ton rythme.`;
  const hero = `<div class="hero"><div class="eyebrow">${esc(stockCat(a.cat).l)}${contenanceTxt(a) ? ' · ' + esc(contenanceTxt(a)) : ''}</div>
    <div><span class="big">${num(e.n, Number.isInteger(e.n) ? 0 : 1)}</span><span class="unit"> ${esc(uniteTxt(a, e.n))} en stock</span></div>
    ${e.jours != null ? `<div class="row-s">${e.n > 0 ? `Environ ${nJ(Math.floor(e.jours))}, jusqu'au ${dFull(addDays(todayISO(), Math.floor(e.jours)))}` : 'Stock épuisé'}${e.sev ? ` <span class="pill ${e.sev}">${e.sev === 'danger' ? 'À commander' : 'Bientôt'}</span>` : ''}</div>` : ''}
    ${ro ? '' : `<div class="btnrow"><button type="button" class="btn" data-act="stock-out" data-id="${esc(a.id)}">${ic('minus', 'sm')}Ouvrir 1 ${esc(uniteTxt(a, 1))}</button><button type="button" class="btn primary" data-act="stock-in" data-id="${esc(a.id)}">${ic('plus', 'sm')}Entrée</button></div>`}</div>`;
  const ms = mvtsDe(a.id).sort((x, y) => y.date.localeCompare(x.date) || (y.maj || 0) - (x.maj || 0)).slice(0, 40);
  const rows = ms.map(m => {
    const s = [dFull(m.date), m.depart ? 'stock de départ' : m.inventaire ? 'recomptage' : '', m.origine, m.prix > 0 ? `${eur(m.prix)} le ${uniteTxt(a, 1)}` : '', m.notes].filter(Boolean).join(' · ');
    return `<button type="button" class="row" data-act="edit-mvt" data-id="${esc(m.id)}"><span class="lead ${m.sens === 'in' ? 'in' : 'out'}">${ic(m.sens === 'in' ? 'plus' : 'minus')}</span><div class="row-main"><div class="row-t">${m.sens === 'in' ? 'Entrée' : 'Sortie'} · ${esc(qteTxt(a, Number(m.qte) || 0))}</div><div class="row-s">${esc(s)}</div></div></button>`;
  }).join('');
  const html = hero
    + section('Rythme', `<p class="note">${rythme}</p>${a.seuil != null && a.seuil !== '' ? `<p class="note">Alerte quand il reste ${esc(qteTxt(a, Number(a.seuil)))} ou moins.</p>` : ''}`,
      ro ? '' : `<button type="button" class="link" data-act="edit-article" data-id="${esc(a.id)}">${ic('edit', 'sm')}Modifier</button>`)
    + section('Mouvements', rows ? `<div class="list">${rows}</div>` : '<p class="note">Aucun mouvement.</p>', ro ? '' : `<button type="button" class="link" data-act="stock-compter" data-id="${esc(a.id)}">${ic('check', 'sm')}Recompter</button>`);
  return { title: a.nom, eyebrow: 'Stock', back: true, html, fab: ro ? null : () => formMvt(null, { article: a.id, sens: 'in' }), fabLabel: 'Entrée' };
};

/* Ouvrir un sac : une sortie d'une unité, tout de suite, avec « Annuler » */
ACT['stock-out'] = d => {
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const a = get('stocks', d.id);
  if (!a) return;
  const e = etatStock(a);
  if (e.n < 1) { toast(`Plus de ${uniteTxt(a, 1)} de ${a.nom.toLowerCase()} en stock : note d'abord la livraison.`); formMvt(null, { article: a.id, sens: 'in' }); return; }
  const m = put('stocks', { kind: 'mvt', article: a.id, date: todayISO(), sens: 'out', qte: 1 });
  render();
  $$(`.stock-row[data-key="st-${CSS.escape(a.id)}"] .big`).forEach(el => fxOnce(el, 'fx-pop', 450));
  toast(`${a.nom} : 1 ${uniteTxt(a, 1)} ouvert · reste ${qteTxt(a, e.n - 1)}`, { undo: () => del('stocks', m.id) });
};
ACT['stock-in'] = d => formMvt(null, { article: d.id, sens: 'in' });
ACT['edit-mvt'] = d => formMvt(d.id);
ACT['new-article'] = () => formArticle(null);
ACT['edit-article'] = d => formArticle(d.id);
ACT['stock-sugg'] = d => {
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const s = STOCK_SUGG[Number(d.i)];
  if (!s) return;
  formArticle(null, s);
};

function alimentsDesRations() {
  const s = new Map();
  chevaux().forEach(h => (h.ration || []).forEach(l => { const n = String(l.aliment || '').trim(); if (n && !estFoin(l) && !s.has(n.toLowerCase())) s.set(n.toLowerCase(), n); }));
  return [...s.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

function formArticle(id, pre = null) {
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const ex = id ? get('stocks', id) : null;
  if (id && !ex) return;
  const x = ex ? clone(ex) : Object.assign({ kind: 'article', nom: '', cat: 'aliment', unite: 'sac', contenance: null, cu: 'kg', aliment: '', seuil: null }, pre || {});
  const rat = alimentsDesRations();
  if (!ex && pre && pre.cat === 'aliment') { const m = rat.find(r => memeAliment(r, pre.nom)); x.aliment = m || ''; }
  const ratOpts = [{ v: '', l: 'Aucune' }, ...rat.map(r => ({ v: r, l: r }))];
  if (x.aliment && !rat.some(r => memeAliment(r, x.aliment))) ratOpts.push({ v: x.aliment, l: x.aliment });
  const body = `
    ${fld('Nom', inp('f_anom', x.nom, `list="dl-alim" maxlength="40" placeholder="Granulés, copeaux, CMV…" autocomplete="off"`))}
    ${grp('Catégorie', chips('acat', STOCK_CATS.map(c => ({ v: c.id, l: c.l })), [x.cat]))}
    ${grp('Conditionnement', chips('aun', CONDITIONNEMENTS.map(u => ({ v: u, l: u })), [x.unite]))}
    <div class="grid2">${fld('Contenance', inp('f_acont', x.contenance != null ? String(x.contenance).replace('.', ',') : '', numAttr + ' placeholder="ex. 25"'))}${grp('En', chips('acu', [{ v: 'kg', l: 'kg' }, { v: 'L', l: 'litres' }], x.cu ? [x.cu] : [], { optional: true }))}</div>
    <div id="w_arat"${x.cat === 'aliment' ? '' : ' hidden'}>${grp('Aliment des rations', chips('arat', ratOpts, [x.aliment || '']), rat.length ? 'Les rations qui le contiennent (en kg, g ou litres) donnent le rythme du stock.' : "Aucune ration n'a encore d'aliment autre que le foin : note-les dans la fiche des chevaux, onglet Ration.")}</div>
    ${fld("Prévenir quand il en reste", inp('f_aseuil', x.seuil != null ? x.seuil : '', 'inputmode="numeric" autocomplete="off" placeholder="ex. 2"'), "Facultatif. L'accueil prévient aussi quand le stock ne tient plus deux semaines.")}
    ${ex ? '' : fld("Combien en as-tu aujourd'hui ?", inp('f_ainit', '', numAttr + ' placeholder="0"'), 'Le stock de départ, compté maintenant.')}
    ${dlist('dl-alim', [...new Set([...rat, ...ALIMENTS.filter(a => !/foin/i.test(a)), 'Copeaux', 'Paille', 'Litière de chanvre', 'Granulés de bois'])])}`;
  openSheet(ex ? ex.nom : 'Nouvel article', body, {
    onMount: f => f.addEventListener('chipchange', e => {
      if (e.detail.name === 'acat') $('#w_arat').hidden = chipVal(f, 'acat') !== 'aliment';
    }),
    onSubmit: f => {
      const nom = val('f_anom');
      if (nom.length < 2) return "Donne un nom à l'article.";
      if (articles(true).some(a => a.id !== x.id && memeAliment(a.nom, nom) && !a.archive)) return `« ${nom} » existe déjà dans les stocks.`;
      const rawC = val('f_acont'), cont = parseNum(rawC);
      if (rawC && !(cont > 0)) return 'La contenance doit être un nombre, par exemple 25.';
      const rawS = val('f_aseuil'), seuil = parseNum(rawS);
      if (rawS && !(seuil >= 0)) return 'Le seuil doit être un nombre, par exemple 2.';
      const rawI = ex ? '' : val('f_ainit'), init = parseNum(rawI);
      if (rawI && !(init >= 0)) return 'Le stock de départ doit être un nombre.';
      const cat = chipVal(f, 'acat') || 'autre', cu = chipVal(f, 'acu') || '';
      if (cat === 'aliment' && chipVal(f, 'arat') && !(cont > 0 && cu)) return 'Pour suivre les rations, indique la contenance en kg ou en litres.';
      Object.assign(x, { nom, cat, unite: chipVal(f, 'aun') || 'sac', contenance: cont > 0 ? cont : null, cu, aliment: cat === 'aliment' ? (chipVal(f, 'arat') || '') : '', seuil: rawS ? seuil : null });
      const a = put('stocks', x);
      if (init > 0) put('stocks', { kind: 'mvt', article: a.id, date: todayISO(), sens: 'in', qte: init, inventaire: true, depart: true });
      toast(ex ? 'Article enregistré' : `${nom} ajouté aux stocks`);
      if (!ex) setTimeout(() => push('stock', { id: a.id }), 0);
    },
    delLabel: 'Retirer des stocks',
    onDelete: ex ? () => {
      // les mouvements restent (achats sur 12 mois) : l'article est seulement rangé
      const prev = clone(ex);
      put('stocks', Object.assign({}, ex, { archive: true }));
      back();
      toast(`${ex.nom} retiré des stocks`, { undo: () => put('stocks', prev) });
    } : null
  });
}

function formMvt(id, pre = {}) {
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const ex = id ? get('stocks', id) : null;
  if (id && !ex) return;
  const as = articles(true);
  const m = ex ? clone(ex) : { kind: 'mvt', article: pre.article || (articles()[0] || {}).id, sens: pre.sens === 'out' ? 'out' : 'in', qte: 1, date: todayISO() };
  const a0 = get('stocks', m.article);
  if (!as.length) { formArticle(null); return; }
  const origines = [...new Set(list('stocks').filter(x => x.kind === 'mvt' && x.origine).map(x => x.origine))];
  const body = `
    ${pre.article || ex ? '' : grp('Article', chips('mart', articles().map(a => ({ v: a.id, l: a.nom })), [m.article]))}
    ${grp('Mouvement', chips('msens', [{ v: 'in', l: 'Entrée : livraison, achat' }, { v: 'out', l: 'Sortie : ouvert, donné, perdu' }], [m.sens]))}
    <div class="grid2">${fld('Quantité', inp('f_mq', String(m.qte).replace('.', ','), numAttr))}${fld('Date', inp('f_md', m.date, 'type="date"'))}</div>
    <div id="w_min" style="display:flex;flex-direction:column;gap:16px"${m.sens === 'in' ? '' : ' hidden'}>
      ${fld(`Prix ${a0 ? 'par ' + esc(uniteTxt(a0, 1)) : 'unitaire'} (€)`, inp('f_mprix', m.prix != null ? String(m.prix).replace('.', ',') : '', numAttr + ' placeholder="Facultatif"'))}
      ${payeField(m.payePar, 'f_mprix', Number(m.prix) || 0)}
      ${fld('Fournisseur', inp('f_morig', m.origine, 'list="dl-morig" maxlength="60" autocomplete="off" placeholder="Coopérative, sellerie…"'))}
    </div>
    ${fld('Note', inp('f_mnote', m.notes, 'maxlength="120"'))}
    ${dlist('dl-morig', origines)}`;
  openSheet(ex ? `Mouvement · ${a0 ? a0.nom : 'stock'}` : a0 && pre.article ? `${a0.nom} · ${m.sens === 'in' ? 'entrée' : 'sortie'}` : 'Mouvement de stock', body, {
    onMount: f => f.addEventListener('chipchange', e => { if (e.detail.name === 'msens') $('#w_min').hidden = chipVal(f, 'msens') !== 'in'; }),
    onSubmit: f => {
      const aid = pre.article || ex ? m.article : chipVal(f, 'mart'), a = get('stocks', aid);
      if (!a) return "Choisis l'article.";
      const sens = chipVal(f, 'msens') || 'in', q = parseNum(val('f_mq')), date = val('f_md');
      if (!(q > 0)) return 'La quantité doit être un nombre positif.';
      if (!validISO(date)) return 'Indique la date.';
      if (date > todayISO()) return "La date ne peut pas être dans le futur.";
      if (sens === 'out') {
        let dispo = etatStock(a).n;
        if (ex) dispo += (ex.sens === 'out' ? 1 : -1) * (Number(ex.qte) || 0);
        if (q > dispo + 1e-9) return `Il ne reste que ${qteTxt(a, Math.max(0, dispo))} : note d'abord l'entrée, ou recompte le stock.`;
      }
      const rawP = sens === 'in' ? val('f_mprix') : '', prix = parseNum(rawP);
      if (rawP && !(prix >= 0)) return 'Le prix doit être un nombre, par exemple 18,50.';
      const saved = put('stocks', Object.assign(m, { article: aid, sens, qte: q, date, prix: rawP ? prix : null, payePar: rawP ? lirePaye(prix * q) : null, origine: sens === 'in' ? val('f_morig') : '', notes: val('f_mnote') }));
      toast(ex ? 'Mouvement enregistré' : `${a.nom} : ${sens === 'in' ? '+' : '−'}${qteTxt(a, q)}`, ex ? {} : { undo: () => del('stocks', saved.id) });
    },
    onDelete: ex ? () => { const prev = clone(ex); del('stocks', ex.id); toast('Mouvement supprimé', { undo: () => put('stocks', prev) }); } : null
  });
}

/* Recompter : le carnet ajoute l'écart comme mouvement « recomptage » */
ACT['stock-compter'] = d => {
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const a = get('stocks', d.id);
  if (!a) return;
  const n = etatStock(a).n;
  openSheet(`Recompter · ${a.nom}`, `<p class="note">Le carnet en compte ${esc(qteTxt(a, n))}. Combien y en a-t-il vraiment ?</p>${fld('Stock réel', inp('f_cpt', String(n).replace('.', ','), numAttr))}`, {
    submit: 'Corriger le stock', focus: '#f_cpt',
    onSubmit: () => {
      const v = parseNum(val('f_cpt'));
      if (!(v >= 0)) return 'Indique un nombre, 0 si le stock est vide.';
      const e = Math.round((v - n) * 100) / 100;
      if (!e) { toast('Le compte était juste'); return; }
      const m = put('stocks', { kind: 'mvt', article: a.id, date: todayISO(), sens: e > 0 ? 'in' : 'out', qte: Math.abs(e), inventaire: true });
      toast(`Stock corrigé : ${qteTxt(a, v)}`, { undo: () => del('stocks', m.id) });
    }
  });
};

/* Alertes de l'accueil : stock épuisé, sous le seuil, ou qui ne tient plus deux semaines */
function alertesStocks(out) {
  if (!rub('foin')) return;
  articles().forEach(a => {
    const e = etatStock(a);
    if (!e.sev) return;
    const t = e.n <= 0 ? `${a.nom} : plus de stock` : e.jours != null && e.jours < STOCK_JOURS ? `${a.nom} : environ ${nJ(Math.floor(e.jours))} de stock` : `${a.nom} : ${qteTxt(a, e.n)} en stock`;
    const s = e.n <= 0 ? (e.rythme ? 'À commander' : 'Note la prochaine livraison') : e.bas ? `Seuil d'alerte : ${qteTxt(a, Number(a.seuil))}` : `Il reste ${qteTxt(a, e.n)}`;
    out.push({ sev: e.sev, icon: stockCat(a.cat).icon, t, s, act: `data-act="open-stock" data-id="${esc(a.id)}"`, ord: e.jours != null ? e.jours - STOCK_JOURS : 0 });
  });
}
