
/* ---------- Matériel du cheval et couvertures ----------
   Dans la fiche du cheval : son matériel (couvertures avec leur grammage, chemises, selle, filet, protections…)
   et ce qu'il porte en ce moment, avec la date de pose. Tout est rangé dans la fiche (chevaux.materiel, chevaux.couv,
   chevaux.couvHist) : la propriétaire en pension le voit, la sauvegarde l'emporte, aucune règle nouvelle.
   Onglet Chevaux › « Couvertures » : qui porte quoi, pour toute l'écurie. (Demandé dans le questionnaire, 15/11/2026.) */
const MATERIEL = [
  { id: 'couverture', l: 'Couverture', icon: 'couv', ph: "ex. Imperméable d'extérieur", porte: true },
  { id: 'chemise', l: 'Chemise', icon: 'couv', ph: 'ex. Séchante, anti-mouches, polaire', porte: true },
  { id: 'selle', l: 'Selle', icon: 'tool', ph: 'ex. Selle mixte 17,5 pouces' },
  { id: 'filet', l: 'Filet et mors', icon: 'tool', ph: 'ex. Filet cob, mors olive 125 mm' },
  { id: 'tapis', l: 'Tapis, amortisseur', icon: 'tool', ph: 'ex. Tapis de dressage noir' },
  { id: 'protections', l: 'Protections', icon: 'tool', ph: 'ex. Guêtres, cloches, bandes' },
  { id: 'licol', l: 'Licol et longe', icon: 'tool', ph: 'ex. Licol cuir taille cheval' },
  { id: 'autre', l: 'Autre', icon: 'tool', ph: 'ex. Masque anti-mouches, bonnet' }
];
const matType = id => MATERIEL.find(t => t.id === id) || MATERIEL[MATERIEL.length - 1];
const GRAMMAGES = [0, 50, 100, 150, 200, 300, 400];
const COUV_HIST = 40;
const materielDe = h => (Array.isArray(h && h.materiel) ? h.materiel : []).filter(x => x && x.id);
const couvertesDe = h => materielDe(h).filter(x => matType(x.type).porte);
const matNom = x => x.nom || matType(x.type).l;
const grammeTxt = g => Number.isFinite(g) ? `${num(g, 0)} g` : '';
const matDetail = x => [matType(x.type).porte && Number.isFinite(x.grammage) ? grammeTxt(x.grammage) : '', x.taille, x.note].filter(Boolean).join(' · ');
/* Ce que le cheval porte : { items, total (grammes), depuis } ; null si rien n'a jamais été noté */
function couvDe(h) {
  const c = h && h.couv;
  if (!c || !validISO(c.depuis)) return null;
  const items = (Array.isArray(c.mids) ? c.mids : []).map(id => materielDe(h).find(x => x.id === id)).filter(Boolean);
  const g = items.filter(x => Number.isFinite(x.grammage));
  return { items, depuis: c.depuis, total: g.length ? g.reduce((t, x) => t + x.grammage, 0) : null };
}
const couvTxt = c => !c.items.length ? 'Sans couverture'
  : c.items.map(x => `${matNom(x)}${Number.isFinite(x.grammage) ? ' ' + grammeTxt(x.grammage) : ''}`).join(' + ');
const depuisTxt = iso => { const j = diffDays(iso, todayISO()); return j <= 0 ? "depuis aujourd'hui" : j === 1 ? 'depuis hier' : `depuis le ${dShort(iso)} · ${nJ(j)}`; };

/* Fiche du cheval : ce qu'il porte, puis son matériel */
function couvRow(h) {
  const c = couvDe(h), a = couvertesDe(h);
  if (!c && !a.length) return '';
  const t = c ? couvTxt(c) : 'Couverture : à noter';
  const s = c ? `${c.items.length > 1 && c.total != null ? `${grammeTxt(c.total)} en tout · ` : ''}${depuisTxt(c.depuis)}` : 'Note ce que le cheval porte en ce moment';
  return `<div class="list"><${sync.readOnly ? 'div' : 'button type="button"'} class="row" ${sync.readOnly ? '' : `data-act="couv-changer" data-hid="${h.id}"`}>${lead('couv')}<div class="row-main"><div class="row-t">${esc(t)}</div><div class="row-s">${esc(s)}</div></div>${sync.readOnly ? '' : `<span class="pill">Changer</span>`}</${sync.readOnly ? 'div' : 'button'}></div>`;
}
function materielHtml(h) {
  const lst = materielDe(h).slice().sort((a, b) => MATERIEL.indexOf(matType(a.type)) - MATERIEL.indexOf(matType(b.type)) || (a.grammage || 0) - (b.grammage || 0) || matNom(a).localeCompare(matNom(b), 'fr'));
  const add = sync.readOnly ? '' : `<button type="button" class="link" data-act="new-mat" data-hid="${h.id}">${ic('plus', 'sm')}Matériel</button>`;
  if (!lst.length) return section('Matériel', `<p class="note">Couvertures et leur grammage, chemises, selle, filet, protections… Avec ses couvertures notées, tu indiques celle que le cheval porte et depuis quand.</p>`, add);
  const c = couvDe(h), portes = new Set(c ? c.items.map(x => x.id) : []);
  const hist = (Array.isArray(h.couvHist) ? h.couvHist : []).filter(x => x && validISO(x.du)).slice(0, 5);
  return section('Matériel', `<div class="list">${lst.map(x =>
    `<${sync.readOnly ? 'div' : 'button type="button"'} class="row" ${sync.readOnly ? '' : `data-act="edit-mat" data-hid="${h.id}" data-id="${esc(x.id)}"`}>${lead(matType(x.type).icon)}<div class="row-main"><div class="row-t">${esc(matNom(x))}</div><div class="row-s">${esc([x.nom ? matType(x.type).l : '', matDetail(x)].filter(Boolean).join(' · ') || matType(x.type).l)}</div></div>${portes.has(x.id) ? '<span class="pill ok">Portée</span>' : ''}</${sync.readOnly ? 'div' : 'button'}>`).join('')}</div>
    ${hist.length ? `<details class="mat-hist"><summary>Couvertures portées avant</summary><ul>${hist.map(x => `<li><b>${esc(x.txt || 'Sans couverture')}</b> · du ${esc(dShort(x.du))} au ${esc(dShort(x.au))}</li>`).join('')}</ul></details>` : ''}`, add);
}

/* Une pièce de matériel */
function formMateriel(hid, id, pre = {}) {
  const h = cheval(hid);
  if (!h) return;
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const ex = id ? materielDe(h).find(x => x.id === id) : null;
  if (id && !ex) return;
  const x = ex ? clone(ex) : { id: 'mat' + uid(), type: pre.type || null, nom: '', grammage: null, taille: '', note: '' };
  const body = `
    ${grp('Matériel', chips('mtype', MATERIEL.map(t => ({ v: t.id, l: t.l })), x.type ? [x.type] : []))}
    ${fld('Nom', inp('f_mnom', x.nom, `maxlength="60" placeholder="${esc(matType(x.type || 'couverture').ph)}"`))}
    <div id="w_gram"${matType(x.type).porte ? '' : ' hidden'}>${fld('Grammage (g)', inp('f_mgram', Number.isFinite(x.grammage) ? x.grammage : '', 'inputmode="numeric" autocomplete="off" list="l_gram" placeholder="ex. 200"'), '0 g : sans garnissage (imperméable simple, chemise).')}
      <datalist id="l_gram">${GRAMMAGES.map(g => `<option value="${g}">`).join('')}</datalist></div>
    ${fld('Taille', inp('f_mtaille', x.taille, 'maxlength="30" autocomplete="off" placeholder="ex. 145 cm, cob, 17,5 pouces"'))}
    ${fld('Note', area('f_mnote', x.note, 'rows="2" maxlength="200" placeholder="Couleur, état, où elle est rangée, à qui elle est…"'))}`;
  openSheet(ex ? `${matNom(ex)} · ${h.nom}` : `Matériel · ${h.nom}`, body, {
    onMount: f => f.addEventListener('chipchange', e => {
      if (e.detail.name !== 'mtype') return;
      const t = matType(chipVal(f, 'mtype'));
      $('#f_mnom').placeholder = t.ph; $('#w_gram').hidden = !t.porte;
    }),
    onSubmit: f => {
      const type = chipVal(f, 'mtype');
      if (!type) return 'Choisis le type de matériel.';
      if (type === 'autre' && !val('f_mnom')) return 'Donne un nom à ce matériel.';
      let g = null;
      if (matType(type).porte && val('f_mgram') !== '') {
        g = Number(String(val('f_mgram')).replace(',', '.'));
        if (!Number.isFinite(g) || g < 0 || g > 1000) return 'Le grammage va de 0 à 1 000 g.';
        g = Math.round(g);
      }
      Object.assign(x, { type, nom: val('f_mnom'), grammage: g, taille: val('f_mtaille'), note: val('f_mnote') });
      const cur = cheval(hid);
      put('chevaux', Object.assign({}, cur, { materiel: materielDe(cur).filter(z => z.id !== x.id).concat(x) }));
      toast('Matériel enregistré');
      if (pre.puis) setTimeout(() => pre.puis(x.id), 380);
    },
    onDelete: ex ? () => {
      const cur = cheval(hid), prev = clone(cur), o = Object.assign({}, cur, { materiel: materielDe(cur).filter(z => z.id !== x.id) });
      // une couverture supprimée n'est plus portée
      if (o.couv && Array.isArray(o.couv.mids) && o.couv.mids.includes(x.id)) o.couv = Object.assign({}, o.couv, { mids: o.couv.mids.filter(m => m !== x.id) });
      put('chevaux', o);
      toast('Matériel supprimé', { undo: () => put('chevaux', prev) });
    } : null
  });
}
ACT['new-mat'] = d => formMateriel(d.hid, null, { type: d.type || null });
ACT['edit-mat'] = d => formMateriel(d.hid, d.id);

/* Ce que le cheval porte : une ou plusieurs couvertures (sous-couverture + couverture), ou rien */
function formCouv(hid, coche) {
  const h = cheval(hid);
  if (!h) return;
  if (sync.readOnly) { toast(roMsg(), { danger: true }); return; }
  const a = couvertesDe(h).slice().sort((x, y) => (x.grammage || 0) - (y.grammage || 0) || matNom(x).localeCompare(matNom(y), 'fr'));
  if (!a.length) { formMateriel(hid, null, { type: 'couverture', puis: id => formCouv(hid, [id]) }); return; }
  const c = couvDe(h), sel = coche || (c ? c.items.map(x => x.id) : []);
  const opts = a.map(x => ({ v: x.id, html: `<span class="two"><span>${esc(matNom(x))}</span><small>${esc([Number.isFinite(x.grammage) ? grammeTxt(x.grammage) : '', x.taille].filter(Boolean).join(' · ') || matType(x.type).l)}</small></span>` }));
  openSheet(`Couverture · ${h.nom}`, `
    ${grp('Il porte', chips('couv', opts, sel, { multi: true }))}
    <p class="note" id="w_couvtot">${couvNote(a, sel)}</p>
    <button type="button" class="link" data-act="couv-autre" data-hid="${h.id}" style="align-self:flex-start">${ic('plus', 'sm')}Une autre couverture</button>
    ${fld('Depuis le', inp('f_cdate', todayISO(), 'type="date" required'))}`, {
    submit: 'Enregistrer',
    onMount: f => f.addEventListener('chipchange', e => { if (e.detail.name === 'couv') $('#w_couvtot').textContent = couvNote(a, chipVals(f, 'couv')); }),
    onSubmit: f => {
      const d = val('f_cdate'), mids = chipVals(f, 'couv');
      if (!validISO(d) || d > todayISO()) return "La date n'est pas valable (aujourd'hui au plus tard).";
      const cur = cheval(hid), prev = clone(cur), av = couvDe(cur);
      if (av && av.depuis > d) return `Il porte déjà autre chose depuis le ${dShort(av.depuis)} : choisis une date à partir de ce jour-là.`;
      const meme = av && av.items.length === mids.length && av.items.every(x => mids.includes(x.id));
      if (meme) { closeSheet(); return false; }
      const hist = (Array.isArray(cur.couvHist) ? cur.couvHist : []).slice();
      if (av && av.depuis < d) hist.unshift({ txt: couvTxt(av), total: av.total, du: av.depuis, au: d });
      put('chevaux', Object.assign({}, cur, { couv: { mids, depuis: d }, couvHist: hist.slice(0, COUV_HIST) }));
      toast(mids.length ? `${h.nom} : ${couvTxt(couvDe(cheval(hid)))}` : `${h.nom} : sans couverture`, { undo: () => put('chevaux', prev) });
    }
  });
}
const couvNote = (a, sel) => {
  const it = a.filter(x => sel.includes(x.id));
  if (!it.length) return 'Rien de coché : sans couverture.';
  const g = it.filter(x => Number.isFinite(x.grammage));
  return it.length > 1 && g.length ? `${it.length} épaisseurs · ${grammeTxt(g.reduce((t, x) => t + x.grammage, 0))} en tout.` : it.length > 1 ? `${it.length} épaisseurs.` : 'Coche-en plusieurs pour une sous-couverture.';
};
ACT['couv-changer'] = d => formCouv(d.hid);
ACT['couv-autre'] = d => { closeSheet(); setTimeout(() => formMateriel(d.hid, null, { type: 'couverture', puis: id => { const c = couvDe(cheval(d.hid)); formCouv(d.hid, (c ? c.items.map(x => x.id) : []).concat(id)); } }), 380); };
WRITE_ACTS.add('couv-changer'); WRITE_ACTS.add('new-mat');

/* Onglet Chevaux › « Couvertures » : qui porte quoi */
const couvSuivies = () => chevaux().some(h => couvertesDe(h).length || couvDe(h));
function couverturesDuJour() {
  const hs = chevaux();
  const rows = hs.map(h => {
    const c = couvDe(h), a = couvertesDe(h);
    const t = c ? couvTxt(c) : a.length ? 'À noter' : 'Pas de couverture dans sa fiche';
    const s = c ? depuisTxt(c.depuis) : a.length ? `${a.length} ${pl(a.length, 'couverture')} dans sa fiche` : '';
    const g = c && c.items.length && c.total != null ? `<span class="row-end num">${grammeTxt(c.total)}</span>` : '';
    return `<button type="button" class="row" data-act="${sync.readOnly ? 'open-cheval' : 'couv-changer'}" data-id="${h.id}" data-hid="${h.id}">${av(h, 'm')}<div class="row-main"><div class="row-t">${esc(h.nom)}</div><div class="row-s">${esc(t)}${s ? ' · ' + esc(s) : ''}</div></div>${g}</button>`;
  });
  return `<p class="note">Ce que chaque cheval porte en ce moment. Touche un cheval pour changer sa couverture.</p><div class="list">${rows.join('')}</div>`;
}
