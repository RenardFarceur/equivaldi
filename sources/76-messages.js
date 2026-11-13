/* ---------- Consignes de l'écurie et fil propriétaire ↔ écurie ----------
   Pas une messagerie : des consignes courtes épinglées sur l'accueil (le tableau blanc), et un fil par cheval
   de propriétaire, rangé dans sa fiche (formule Pro). Sans serveur, pas de notification : une pastille à l'ouverture.
   Collections « consignes » {texte, hid, jusqua, le, par, lus {uid: {t, nom}}} et « messages » {hid, proprio, de, texte, le, luEcurie, luProprio}. */

const CONS_DUREES = [{ v: '0', l: "Aujourd'hui" }, { v: '3', l: '3 jours' }, { v: '7', l: 'Une semaine' }, { v: '30', l: 'Un mois' }, { v: 'x', l: 'Sans fin' }];
const moiUid = () => moiRef().uid || 'local';
const consignesActives = hid => list('consignes')
  .filter(c => c && c.texte && (!c.jusqua || c.jusqua >= todayISO()) && (hid === undefined || c.hid === hid))
  .sort((a, b) => (b.le || 0) - (a.le || 0));
const consigneVue = c => !!(c.lus && c.lus[moiUid()]) || (c.par && c.par.uid === moiUid());
const consignesNonVues = () => consignesActives().filter(c => !consigneVue(c));
const peutEcrireConsigne = () => !sync.readOnly && !estProprio();

function rowConsigne(c, avecCheval = true) {
  const h = c.hid ? cheval(c.hid) : null, vus = Object.entries(c.lus || {}).filter(([u]) => !c.par || u !== c.par.uid).map(([, v]) => v && v.nom).filter(Boolean);
  const auteur = c.par && c.par.uid === moiUid() ? 'toi' : (c.par && c.par.nom) || "l'équipe";
  const peut = peutEcrireConsigne() && (c.par && c.par.uid === moiUid() || estGerante());
  const s = [avecCheval && h ? h.nom : '', `${auteur}, ${jourHeure(c.le || 0)}`, c.jusqua ? `jusqu'au ${dShort(c.jusqua)}` : ''].filter(Boolean).join(' · ');
  return `<div class="consigne${consigneVue(c) ? '' : ' nouvelle'}" data-key="cons-${esc(c.id)}">
    <div class="consigne-t">${esc(c.texte)}</div>
    <div class="consigne-s">${esc(s)}</div>
    <div class="consigne-pied"><span class="consigne-vus">${vus.length ? `Vu par ${esc(vus.join(', '))}` : 'Personne ne l\'a encore vue'}</span>
      ${consigneVue(c) ? '' : `<button type="button" class="btn small" data-act="cons-vu" data-id="${esc(c.id)}">${ic('check', 'sm')}J'ai vu</button>`}
      ${peut ? `<button type="button" class="link" data-act="cons-edit" data-id="${esc(c.id)}">${ic('edit', 'sm')}Modifier</button>` : ''}</div>
  </div>`;
}
/* Accueil de l'équipe : les consignes en cours, en premier */
function consignesSection() {
  if (estProprio()) return '';
  const cs = consignesActives(), n = consignesNonVues().length;
  const add = peutEcrireConsigne() ? `<button type="button" class="link" data-act="cons-new">${ic('plus', 'sm')}Consigne</button>` : '';
  if (!cs.length) return peutEcrireConsigne() ? section('Consignes', `<p class="note">Une info pour toute l'équipe : « Tornade au pas seulement », « Livraison de foin jeudi ». Elle reste ici jusqu'à la date choisie, et chacun coche « J'ai vu ».</p>`, add) : '';
  return section(`Consignes${n ? ` <span class="count">${n}</span>` : ''}`, `<div class="consignes">${cs.map(c => rowConsigne(c)).join('')}</div>`, add);
}
/* Fiche du cheval : ses consignes en cours, en haut */
function consignesCheval(h) {
  if (estProprio()) return '';
  const cs = consignesActives(h.id);
  return cs.length ? `<div class="consignes">${cs.map(c => rowConsigne(c, false)).join('')}</div>` : '';
}

function formConsigne(id, hid) {
  if (!peutEcrireConsigne()) { toast(roMsg(), { danger: true }); return; }
  const ex = id ? get('consignes', id) : null;
  if (id && !ex) return;
  const x = ex ? clone(ex) : { texte: '', hid: hid || '', jusqua: addDays(todayISO(), 3) };
  const hs = chevaux();
  const duree = !x.jusqua ? 'x' : (CONS_DUREES.find(d => d.v !== 'x' && addDays(todayISO(), Number(d.v)) === x.jusqua) || {}).v || 'date';
  const body = `
    ${fld('Consigne', area('f_ctxt', x.texte, 'rows="3" maxlength="280" placeholder="Tornade boite un peu : au pas seulement jusqu\'à vendredi."'))}
    ${hs.length ? grp('Pour', chips('chid', [{ v: '', l: "Toute l'écurie" }, ...hs.map(h => ({ v: h.id, l: h.nom }))], [x.hid || ''])) : ''}
    ${grp("Jusqu'à quand", chips('cdur', [...CONS_DUREES, ...(duree === 'date' ? [{ v: 'date', l: dShort(x.jusqua) }] : [])], [duree]), 'Passée la date, la consigne disparaît toute seule.')}`;
  openSheet(ex ? 'Consigne' : 'Nouvelle consigne', body, {
    submit: ex ? 'Enregistrer' : 'Épingler',
    onSubmit: f => {
      const texte = val('f_ctxt').trim();
      if (texte.length < 3) return 'Écris la consigne en quelques mots.';
      const d = chipVal(f, 'cdur');
      const jusqua = d === 'x' ? null : d === 'date' ? x.jusqua : addDays(todayISO(), Number(d || 3));
      const nouv = !ex;
      Object.assign(x, { texte, hid: hs.length ? (chipVal(f, 'chid') || '') : '', jusqua });
      if (nouv) Object.assign(x, { le: Date.now(), par: moiRef(), lus: {} });
      put('consignes', x);
      toast(nouv ? "Consigne épinglée : toute l'équipe la voit à l'ouverture" : 'Consigne enregistrée');
    },
    delLabel: 'Retirer la consigne',
    onDelete: ex ? () => { const prev = clone(ex); del('consignes', ex.id); toast('Consigne retirée', { undo: () => put('consignes', prev) }); } : null
  });
}
ACT['cons-new'] = d => formConsigne(null, d.hid);
ACT['cons-edit'] = d => formConsigne(d.id);
ACT['cons-vu'] = d => {
  const c = get('consignes', d.id);
  if (!c || consigneVue(c)) return;
  put('consignes', Object.assign({}, c, { lus: Object.assign({}, c.lus || {}, { [moiUid()]: { t: Date.now(), nom: moiNom() || '' } }) }));
  render();
};

/* ----- Le fil d'un cheval de propriétaire ----- */
const filDe = hid => list('messages').filter(m => m && m.hid === hid && m.texte).sort((a, b) => (a.le || 0) - (b.le || 0));
const msgDeLautre = m => estProprio() ? m.de && m.de.uid !== moiUid() : m.de && m.de.role === 'proprio';
const msgNonLu = m => msgDeLautre(m) && !(estProprio() ? m.luProprio : m.luEcurie);
const nonLusFil = hid => filDe(hid).filter(msgNonLu).length;
/* Le fil existe pour un cheval dont le propriétaire est inscrit avec le rôle « Propriétaire », en formule Pro (le propriétaire, lui, l'a toujours) */
function filPossible(h) {
  if (!h) return false;
  if (estProprio()) return h.propUid === moiUid();
  const m = h.propUid && membres().find(x => x.id === h.propUid);
  return !!m && m.role === 'proprio' && offrePro();
}
const nomProprio = h => h.proprietaire || nomDe({ uid: h.propUid, nom: '' }) || 'le propriétaire';
function filRow(h) {
  if (!filPossible(h)) return '';
  const l = filDe(h.id), dern = l[l.length - 1], n = nonLusFil(h.id);
  const s = dern ? `${dern.de && dern.de.uid === moiUid() ? 'Toi' : (dern.de && dern.de.nom) || ''} : ${dern.texte.length > 60 ? dern.texte.slice(0, 57) + '…' : dern.texte}` : estProprio() ? "Une question, une info pour l'écurie ?" : `Écrire à ${nomProprio(h)} au sujet de ${h.nom}`;
  return `<div class="list"><button type="button" class="row" data-act="open-fil" data-hid="${h.id}">${lead('chat')}<div class="row-main"><div class="row-t">${estProprio() ? "Messages avec l'écurie" : `Messages avec ${esc(nomProprio(h))}`}</div><div class="row-s">${esc(s)}</div></div>${n ? `<span class="count">${n}</span>` : `<span class="row-end">${ic('next', 'sm')}</span>`}</button></div>`;
}
/* Accueil de l'équipe : les messages de propriétaires pas encore lus */
function messagesSection() {
  if (estProprio() || !offrePro()) return '';
  const parCheval = chevaux().map(h => ({ h, n: filPossible(h) ? nonLusFil(h.id) : 0 })).filter(x => x.n);
  if (!parCheval.length) return '';
  return section('Messages des propriétaires', `<div class="list">${parCheval.map(({ h, n }) => {
    const dern = filDe(h.id).filter(msgNonLu).pop();
    return `<button type="button" class="row" data-act="open-fil" data-hid="${h.id}">${av(h, 'm')}<div class="row-main"><div class="row-t">${esc(h.nom)} · ${esc(nomProprio(h))}</div><div class="row-s">${esc(dern ? dern.texte.slice(0, 80) : '')}</div></div><span class="count">${n}</span></button>`;
  }).join('')}</div>`);
}
/* Accueil du propriétaire : ses fils avec du nouveau */
function messagesProprioSection() {
  if (!estProprio()) return '';
  const hs = chevaux().filter(h => filPossible(h) && nonLusFil(h.id));
  if (!hs.length) return '';
  return section("Messages de l'écurie", hs.map(filRow).join(''));
}

ACT['open-fil'] = d => push('fil', { hid: d.hid });
let filMarque = null;
VIEWS.fil = p => {
  const h = cheval(p.hid);
  if (!h || !filPossible(h)) return { title: 'Messages', back: true, html: emptyH('Fil indisponible', "Ce cheval n'a plus de propriétaire inscrit, ou la formule Pro n'est plus active.") };
  const l = filDe(h.id);
  // marquer lu ce que l'autre a écrit (une fois le fil affiché)
  if (l.some(msgNonLu)) { clearTimeout(filMarque); filMarque = setTimeout(() => marquerFilLu(h.id), 400); }
  const peut = estProprio() || !sync.readOnly;
  const bulles = l.length ? l.map(m => {
    const moi = m.de && m.de.uid === moiUid();
    // à droite : ce que « mon côté » a écrit (moi, ou toute l'équipe quand je suis de l'écurie)
    const cote = estProprio() ? moi : !!(m.de && m.de.role !== 'proprio');
    return `<div class="bulle${cote ? ' moi' : ''}"><div class="bulle-t">${esc(m.texte)}</div><div class="bulle-s">${esc(moi ? 'Toi' : (m.de && m.de.nom) || '')} · ${esc(jourHeure(m.le || 0))}</div></div>`;
  }).join('') : `<p class="note">${estProprio() ? `Écris à l'équipe de l'écurie au sujet de ${esc(h.nom)} : la réponse arrivera ici.` : `Écris à ${esc(nomProprio(h))} au sujet de ${esc(h.nom)} : ${esc(nomProprio(h))} le lira en ouvrant l'appli.`}</p>`;
  const brouillon = (ui.filBrouillon || {})[h.id] || '';
  const compose = peut ? `<div class="fil-compose"><label class="sr-only" for="filTexte">Ton message</label><textarea id="filTexte" data-hid="${h.id}" rows="2" maxlength="1000" placeholder="${estProprio() ? "Ton message à l'écurie" : `Ton message à ${esc(nomProprio(h))}`}">${esc(brouillon)}</textarea>
      <button type="button" class="btn primary" data-act="fil-envoyer" data-hid="${h.id}">${ic('send', 'sm')}Envoyer</button></div>
      <p class="note">Pas de notification sur le téléphone pour l'instant : ${estProprio() ? "l'équipe" : esc(nomProprio(h))} voit le message en ouvrant l'appli. Pour une urgence, appelle.</p>`
    : `<p class="note">${esc(roMsg())}</p>`;
  return { title: h.nom, eyebrow: estProprio() ? "Messages avec l'écurie" : `Messages avec ${nomProprio(h)}`, back: true, fab: null, html: `<div class="fil">${bulles}</div>${compose}` };
};
function marquerFilLu(hid) {
  const t = topView();
  if (!t || t.view !== 'fil' || t.hid !== hid) return;
  filDe(hid).filter(msgNonLu).forEach(m => put('messages', Object.assign({}, m, estProprio() ? { luProprio: true } : { luEcurie: true })));
}
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'filTexte') { ui.filBrouillon = ui.filBrouillon || {}; ui.filBrouillon[e.target.dataset.hid] = e.target.value; }
});
ACT['fil-envoyer'] = d => {
  const h = cheval(d.hid);
  if (!h || !filPossible(h)) return;
  if (!estProprio() && sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const ta = $('#filTexte'), texte = (ta ? ta.value : '').trim();
  if (!texte) { toast('Écris ton message avant de l\'envoyer.'); if (ta) ta.focus(); return; }
  const r = ROLE_DE_MOI();
  put('messages', { hid: h.id, proprio: estProprio() ? moiUid() : h.propUid, de: { uid: moiUid(), nom: moiNom() || '', role: r }, texte: texte.slice(0, 1000), le: Date.now(),
    luEcurie: !estProprio(), luProprio: estProprio() });
  if (ui.filBrouillon) delete ui.filBrouillon[h.id];
  if (ta) ta.value = '';   // le rendu garde les champs saisis : on vide celui-ci
  render();
  setTimeout(() => { const f = $('#view .fil'); if (f) f.lastElementChild && f.lastElementChild.scrollIntoView({ block: 'end' }); }, 50);
};
/* Le rôle de qui écrit : gérante, équipe ou propriétaire */
function ROLE_DE_MOI() { return estProprio() ? 'proprio' : estGerante() ? 'gerante' : 'equipe'; }
