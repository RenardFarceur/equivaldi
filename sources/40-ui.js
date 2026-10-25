
/* ---------- Navigation ---------- */
const TABS = [
  { id: 'accueil', label: 'Accueil', icon: 'home' },
  { id: 'chevaux', label: 'Chevaux', icon: 'horse' },
  { id: 'pres', label: 'Prés', icon: 'fence' },
  { id: 'foin', label: 'Foin', icon: 'bale' },
  { id: 'concours', label: 'Concours', icon: 'rosette' },
  { id: 'equipe', label: 'Équipe', icon: 'users' }
];
const nav = { tab: TABS.some(t => t.id === ui.tab) ? ui.tab : 'accueil', stack: [], savedY: 0 };
const VIEWS = {};
const ACT = {};
let currentFab = null;

function renderTabs() {
  setHTML($('#tabs'), TABS.map(t =>
    `<button type="button" data-act="tab" data-tab="${t.id}"${nav.tab === t.id ? ' aria-current="page"' : ''}><span class="tab-ic">${ic(t.icon)}</span><span>${t.label}</span></button>`
  ).join(''));
}

/* ---------- Mise à jour de l'écran ----------
   À chaque navigation, l'écran est redessiné et entre en douceur. Quand seules les données changent,
   on ne retouche que ce qui a changé : les animations en cours et la saisie ne sont pas interrompues. */
const mouvementOk = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let entree = 'tab';        // animation du prochain rendu : tab, push, back, seg (null : simple mise à jour)
let entreeTimer = null;
const keyOf = n => (n.nodeType === 1 && n.getAttribute('data-key')) || null;
function morphAttrs(a, b) {
  for (const { name } of Array.from(a.attributes)) if (!b.hasAttribute(name) && name !== 'class') a.removeAttribute(name);
  // les classes fx-… sont posées par les effets : on les garde jusqu'à la fin de leur animation
  const fx = Array.from(a.classList).filter(c => c.startsWith('fx-'));
  const cls = [b.getAttribute('class') || '', ...fx].join(' ').trim();
  if ((a.getAttribute('class') || '') !== cls) { if (cls) a.setAttribute('class', cls); else a.removeAttribute('class'); }
  for (const { name, value } of Array.from(b.attributes)) if (name !== 'class' && a.getAttribute(name) !== value) a.setAttribute(name, value);
}
function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  morphAttrs(a, b);
  morphKids(a, b);
}
function morphKids(a, b) {
  const keyed = new Map();
  for (let c = a.firstChild; c; c = c.nextSibling) { const k = keyOf(c); if (k) keyed.set(k, c); }
  let cur = a.firstChild, t = b.firstChild;
  while (t) {
    const next = t.nextSibling, k = keyOf(t);
    let m = null;
    if (k) { m = keyed.get(k) || null; if (m && m.tagName !== t.tagName) m = null; }
    else if (cur && !keyOf(cur) && cur.nodeType === t.nodeType && (cur.nodeType !== 1 || cur.tagName === t.tagName)) m = cur;
    if (m) {
      if (k) keyed.delete(k);
      if (m === cur) cur = cur.nextSibling; else a.insertBefore(m, cur);
      morphNode(m, t);
    } else a.insertBefore(t, cur);
    t = next;
  }
  while (cur) { const n = cur.nextSibling; a.removeChild(cur); cur = n; }
}
function setHTML(el, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphKids(el, tpl.content);
}
/* Les lignes repérées (data-key) qui changent de place glissent jusqu'à leur nouvelle position */
function glisse(root, fn) {
  if (!mouvementOk() || !Element.prototype.animate) { fn(); return; }
  const avant = new Map();
  root.querySelectorAll('[data-key]').forEach(el => avant.set(el.getAttribute('data-key'), el.getBoundingClientRect().top));
  fn();
  root.querySelectorAll('[data-key]').forEach(el => {
    const y0 = avant.get(el.getAttribute('data-key'));
    if (y0 == null) return;
    const dy = y0 - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 2) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1)' });
  });
}
function render() {
  const top = nav.stack[nav.stack.length - 1];
  let v;
  try { syncPhotos(); } catch (e) { console.error(e); }
  try { v = top ? VIEWS[top.view](top) : VIEWS[nav.tab](); }
  catch (e) {
    console.error(e);
    v = { title: 'Carnet', html: empty("Cet écran n'a pas pu s'afficher", esc(e.message)) };
  }
  $('#topTitle').textContent = v.title;
  $('#topEyebrow').textContent = v.eyebrow || dTete(todayISO());
  $('#backBtn').hidden = !top;
  $('#brandBtn').hidden = !!top;
  const view = $('#view');
  // fin du chargement : le vrai contenu entre en douceur
  let anim = entree;
  if (!anim && view.firstElementChild && view.firstElementChild.classList.contains('loading') && !/^<div class="loading"/.test(v.html)) anim = 'tab';
  entree = null;
  if (anim && anim !== 'seg') {
    view.innerHTML = v.html;
    const segA = $('#view .seg.scroll [aria-pressed="true"]');
    if (segA) { const p = segA.parentElement; p.scrollLeft = Math.max(0, segA.offsetLeft - (p.clientWidth - segA.offsetWidth) / 2); }
  } else glisse(view, () => setHTML(view, v.html));
  if (anim && mouvementOk()) {
    view.classList.remove('in-tab', 'in-push', 'in-back', 'in-seg');
    void view.offsetWidth;
    view.classList.add('in-' + anim);
    clearTimeout(entreeTimer);
    entreeTimer = setTimeout(() => view.classList.remove('in-tab', 'in-push', 'in-back', 'in-seg'), 900);
  }
  currentFab = v.fab || null;
  const fab = $('#fab');
  fab.hidden = !currentFab || sync.readOnly;
  fab.setAttribute('aria-label', v.fabLabel || 'Ajouter');
  renderTabs();
  updateSync();
  majCrottins();
}
let rrTimer = null;
function rerenderSoon() { clearTimeout(rrTimer); rrTimer = setTimeout(render, 40); }
function go(tab) {
  if (nav.tab === tab && !nav.stack.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  nav.tab = tab; nav.stack = []; ui.tab = tab; saveUi();
  entree = 'tab'; render(); window.scrollTo(0, 0);
}
function push(view, params = {}) {
  (nav.stack[nav.stack.length - 1] || nav).savedY = window.scrollY;
  nav.stack.push(Object.assign({ view }, params));
  entree = 'push'; render(); window.scrollTo(0, 0);
}
function back() {
  nav.stack.pop();
  entree = 'back'; render();
  window.scrollTo(0, (nav.stack[nav.stack.length - 1] || nav).savedY || 0);
}
const topView = () => nav.stack[nav.stack.length - 1] || null;

/* ---------- Feuille de saisie ---------- */
let lastFocus = null;
function openSheet(title, body, o = {}) {
  lastFocus = document.activeElement;
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = `<form id="sf" class="form" novalidate autocomplete="off">${body}<p class="err" id="sfErr" role="alert" hidden></p></form>`;
  const foot = [];
  if (o.onDelete) foot.push(`<button type="button" class="btn ghost" id="sfDel">${ic('trash', 'sm')}<span>${esc(o.delLabel || 'Supprimer')}</span></button>`);
  if (o.onSubmit) foot.push(`<button type="submit" form="sf" class="btn primary" id="sfOk">${esc(o.submit || 'Enregistrer')}</button>`);
  const f = $('#sheetFoot');
  f.innerHTML = foot.join('');
  f.hidden = !foot.length;
  const root = $('#sheet');
  root.hidden = false;
  document.body.classList.add('lock');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
  const form = $('#sf');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!o.onSubmit) return;
    if (sync.readOnly && !o.local) { const el = $('#sfErr'); el.textContent = RO_MSG; el.hidden = false; return; }
    let r;
    try { r = o.onSubmit(form); } catch (err) { console.error(err); r = 'Erreur : ' + err.message; }
    if (typeof r === 'string') { const el = $('#sfErr'); el.textContent = r; el.hidden = false; el.scrollIntoView({ block: 'nearest' }); }
    else if (r !== false) closeSheet();
  });
  if (o.onDelete) {
    const b = $('#sfDel');
    b.addEventListener('click', () => {
      if (sync.readOnly) { toast(RO_MSG, { danger: true }); return; }
      if (b.classList.contains('armed')) { o.onDelete(); closeSheet(); return; }
      b.classList.add('armed');
      b.querySelector('span').textContent = o.delConfirm || 'Confirmer la suppression';
      setTimeout(() => { if (b.isConnected) { b.classList.remove('armed'); b.querySelector('span').textContent = o.delLabel || 'Supprimer'; } }, 4000);
    });
  }
  if (o.onMount) o.onMount(form);
  $('#sheetBody').scrollTop = 0;
  setTimeout(() => {
    const el = o.focus ? $(o.focus) : $('#sheet .sheet-h .iconbtn');
    if (el) el.focus({ preventScroll: true });
  }, 300);
}
function closeSheet() {
  const root = $('#sheet');
  if (root.hidden) return;
  root.classList.remove('open');
  document.body.classList.remove('lock');
  setTimeout(() => {
    if (!root.classList.contains('open')) { root.hidden = true; $('#sheetBody').innerHTML = ''; $('#sheetFoot').innerHTML = ''; }
  }, 270);
  if (lastFocus && lastFocus.isConnected && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
}

/* ---------- Message bref (avec annulation) ---------- */
let toastTimer = null;
function toast(msg, o = {}) {
  const el = $('#toast');
  if (!el) return;
  el.className = 'toast' + (o.danger ? ' danger' : '') + (o.fete ? ' fete' : '');
  el.innerHTML = `${o.fete ? brandMark('toast-cheval') : ''}<span>${esc(msg)}</span>${o.undo ? '<button type="button" id="toastUndo">Annuler</button>' : ''}`;
  el.hidden = false;
  void el.offsetWidth;            // rejoue l'apparition, même si un message était déjà affiché
  el.classList.add('pop');
  if (o.undo) $('#toastUndo').onclick = () => { el.hidden = true; o.undo(); toast('Annulé'); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, o.undo ? 6000 : 3400);
}

/* ---------- Petits effets : rebond, confettis en crinière, galop de fête ---------- */
const fx = { ordre: null, jusqua: 0 };
/* Classe d'animation posée le temps de l'animation (gardée par les mises à jour d'écran) */
function fxOnce(el, cls, ms) {
  if (!el || !mouvementOk()) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
function fxLayer() {
  let l = document.getElementById('fx');
  if (!l) { l = document.createElement('div'); l.id = 'fx'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); }
  return l;
}
/* Gerbe de petits zigzags, points et traits aux couleurs du logo, autour d'un élément */
function confettis(el) {
  if (!el || !mouvementOk() || !Element.prototype.animate) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, L = fxLayer();
  ['zz', 'pt', 'tr', 'zz', 'pt', 'zz', 'tr', 'pt', 'zz'].forEach((f, i, all) => {
    const c = document.createElement('i');
    c.className = `cf cf-${f} cc${i % 4}`;
    c.style.left = cx + 'px'; c.style.top = cy + 'px';
    L.appendChild(c);
    const a = (i / all.length) * Math.PI * 2 + Math.random() * .6, d = 30 + Math.random() * 26, rot = Math.round(Math.random() * 220 - 110);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    c.animate([
      { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
      { transform: `translate(${x}px,${y}px) scale(1) rotate(${rot}deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${x * 1.18}px,${y * 1.18 + 14}px) scale(.7) rotate(${rot * 1.4}deg)`, opacity: 0 }
    ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.75,.3,1)' }).onfinish = () => c.remove();
  });
}
/* Le cheval du logo traverse l'écran au galop (fête : toutes les tâches du jour sont faites) */
function galop() {
  if (!mouvementOk() || !Element.prototype.animate) return;
  const L = fxLayer(), h = document.createElement('div');
  h.className = 'galop';
  h.innerHTML = `<div class="galop-saut">${brandMark()}</div>`;
  L.appendChild(h);
  h.animate([{ transform: 'translateX(-90px)' }, { transform: `translateX(${window.innerWidth + 90}px)` }], { duration: 2600, easing: 'linear' }).onfinish = () => h.remove();
  h.firstChild.animate([{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(-16px) rotate(-7deg)', offset: .45 }, { transform: 'translateY(0) rotate(2deg)' }], { duration: 340, iterations: 8, easing: 'ease-in-out' });
}
const vibre = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* sans vibreur */ } };

/* ---------- Briques de formulaire ---------- */
const fld = (label, inner, hint = '') => `<label class="field"><span>${label}</span>${inner}${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
const grp = (label, inner, hint = '') => `<div class="field"><span class="flabel">${label}</span>${inner}${hint ? `<small class="hint">${hint}</small>` : ''}</div>`;
const inp = (id, v, attrs = '') => `<input id="${id}" name="${id}" value="${esc(v ?? '')}" ${attrs}>`;
const area = (id, v, attrs = '') => `<textarea id="${id}" name="${id}" ${attrs}>${esc(v ?? '')}</textarea>`;
const dlist = (id, vals) => `<datalist id="${id}">${vals.map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
const numAttr = 'inputmode="decimal" autocomplete="off"';
function chips(name, opts, sel, o = {}) {
  const s = new Set([].concat(sel == null ? [] : sel).map(String));
  return `<div class="chips" role="group" data-chips="${name}"${o.multi ? ' data-multi="1"' : ''}${o.optional ? ' data-opt="1"' : ''}>${opts.map(x =>
    `<button type="button" class="chip${x.cls ? ' ' + x.cls : ''}" data-v="${esc(x.v)}" aria-pressed="${s.has(String(x.v))}"${x.aria ? ` aria-label="${esc(x.aria)}"` : ''}>${x.html != null ? x.html : esc(x.l)}</button>`
  ).join('')}</div>`;
}
const chipVals = (root, name) => $$(`[data-chips="${name}"] .chip[aria-pressed="true"]`, root).map(b => b.dataset.v);
const chipVal = (root, name) => chipVals(root, name)[0] || null;
function setChips(root, name, vals) {
  const s = new Set(vals.map(String));
  $$(`[data-chips="${name}"] .chip`, root).forEach(b => b.setAttribute('aria-pressed', String(s.has(b.dataset.v))));
}
function onChip(btn) {
  const g = btn.closest('.chips');
  const pressed = btn.getAttribute('aria-pressed') === 'true';
  if (g.dataset.multi) btn.setAttribute('aria-pressed', String(!pressed));
  else if (pressed && g.dataset.opt) btn.setAttribute('aria-pressed', 'false');
  else $$('.chip', g).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  if (btn.getAttribute('aria-pressed') === 'true') fxOnce(btn, 'fx-pop', 450);
  g.dispatchEvent(new CustomEvent('chipchange', { bubbles: true, detail: { name: g.dataset.chips, v: btn.dataset.v } }));
}
const horseOpts = (hs, sub) => hs.map(h => ({
  v: h.id,
  html: `${av(h, 's')}${sub ? `<span class="two"><span>${esc(h.nom)}</span><small>${esc(sub(h))}</small></span>` : `<span>${esc(h.nom)}</span>`}`
}));

/* Choisir une personne : les membres de l'équipe en pastilles, « Autre » pour quelqu'un d'extérieur.
   Sans fiches de membres (carnet partagé sur claude.ai), simple saisie avec suggestions. */
function nomsConnus() {
  const s = new Map();
  const add = n => { const v = String(n || '').trim(); if (v && !s.has(normNom(v))) s.set(normNom(v), v); };
  add(moiNom());
  list('seances').forEach(x => add(x.cavalier));
  list('concours').forEach(x => add(x.cavalier));
  toutesTaches().forEach(tk => faitsDe(tk).forEach(f => add(f.par)));
  chevaux(true).forEach(h => { add(h.proprietaire); dpsDe(h).forEach(x => add(x.qui.nom)); });
  return [...s.values()];
}
function pickPerson(name, label, ref, o = {}) {
  const ms = membres();
  if (!ms.length) {
    const v = ref ? nomDe(ref) : (o.def || (o.moi ? moiNom() : ''));
    return fld(label, inp('f_' + name, v, `list="dl-p${name}" autocomplete="off" autocapitalize="words"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}`), o.hint || '') + dlist('dl-p' + name, nomsConnus());
  }
  const autre = o.autre !== false, m = refMembre(ref);
  let sel = m ? m.id : (autre && ref && String(ref.nom || '').trim() ? '_autre' : null);
  if (!ref && o.moi && me.uid && get('membres', me.uid)) sel = me.uid;
  const opts = ms.map(x => ({ v: x.id, html: `${pav({ uid: x.id }, 's')}<span>${esc(nomCourt({ uid: x.id }))}</span>` }));
  if (autre) opts.push({ v: '_autre', l: o.autreLabel || 'Autre personne' });
  const other = autre ? `<div id="w_pp_${name}"${sel === '_autre' ? '' : ' hidden'}>${inp('ppn_' + name, sel === '_autre' ? ref.nom : '', `autocomplete="off" autocapitalize="words" placeholder="${esc(o.phAutre || 'Prénom et nom')}" aria-label="${esc(label)} : nom"`)}</div>` : '';
  return grp(label, chips('pp_' + name, opts, sel ? [sel] : [], { optional: o.optional !== false }) + other, o.hint || '');
}
const hasPerson = name => !!(document.getElementById('f_' + name) || document.querySelector(`[data-chips="pp_${name}"]`));
function readPerson(name) {
  if (document.getElementById('f_' + name)) {
    const v = val('f_' + name).replace(/\s+/g, ' ');
    if (!v) return null;
    return estMoi({ nom: v }) && me.uid ? { uid: me.uid, nom: v } : { uid: null, nom: v };
  }
  const v = chipVal(document, 'pp_' + name);
  if (!v) return null;
  if (v === '_autre') { const n = val('ppn_' + name).replace(/\s+/g, ' '); return n ? { uid: null, nom: n } : null; }
  const m = get('membres', v);
  return m ? { uid: m.id, nom: mNom(m) } : null;
}
document.addEventListener('chipchange', e => {
  const n = e.detail && e.detail.name;
  if (!n || !n.startsWith('pp_')) return;
  const w = document.getElementById('w_' + n);
  if (!w) return;
  const on = chipVal(document, n) === '_autre';
  w.hidden = !on;
  if (on) { const i = w.querySelector('input'); if (i) i.focus(); }
});
/* « Payé par » : apparaît dès qu'un montant est saisi ; inutile quand on est seul dans le carnet */
function payeField(ref, montantId, montant) {
  if (membres().length === 1) return '';
  return `<div id="w_paye" data-for="${montantId}"${montant > 0 ? '' : ' hidden'}>${pickPerson('paye', 'Payé par', ref, { moi: true, hint: "Sert au bilan des dépenses de l'onglet Équipe." })}</div>`;
}
const lirePaye = montant => !(montant > 0) ? null : (hasPerson('paye') ? readPerson('paye') : moiRef());
document.addEventListener('input', e => {
  const w = document.getElementById('w_paye');
  if (w && e.target && e.target.id === w.dataset.for) w.hidden = !(parseNum(e.target.value) > 0);
});

/* ---------- Briques d'affichage ---------- */
const section = (title, inner, action = '') => `<section class="sec"><div class="sec-h"><h2>${title}</h2>${action}</div>${inner}</section>`;
const empty = (t, s) => `<div class="empty"><b>${t}</b>${s}</div>`;
/* État vide illustré : le cheval du logo, qui balance la queue */
const emptyH = (t, s, extra = '') => `<div class="empty illu">${brandMark()}<b>${t}</b>${s}${extra}</div>`;
const segCtl = (key, opts, cur, cls = '') => `<div class="seg${cls ? ' ' + cls : ''}" role="group">${opts.map(([v, l]) =>
  `<button type="button" data-act="seg" data-k="${key}" data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join('')}</div>`;
const lead = (icon, sev = '') => `<span class="lead">${ic(icon)}</span>`;
/* Ligne avec bouton d'appel à droite (un lien ne peut pas être dans un bouton) */
const callBtn = (tel, who) => tel ? `<a class="callbtn" href="${esc(telHref(tel))}" aria-label="Appeler ${esc(who)}">${ic('phone')}</a>` : '';
const crow = (act, inner, tel, who) => `<div class="crow"><button type="button" class="crow-main" ${act}>${inner}</button>${callBtn(tel, who)}</div>`;

/* ---------- Évènements ---------- */
/* Actions qui écrivent directement : bloquées en lecture seule */
const WRITE_ACTS = new Set(['tick', 'add-sugg', 'new', 'fab', 'photo', 'move-from', 'move-to', 'foin-out', 'foin-out-pick', 'copy-ration', 'clear-ex', 'wipe', 'save-cfg', 'add-balle', 'del-balle']);
function arm(t) {
  const orig = t.innerHTML;
  t.classList.add('armed');
  t.textContent = t.dataset.confirm;
  setTimeout(() => { if (t.isConnected && t.classList.contains('armed')) { t.classList.remove('armed'); t.innerHTML = orig; } }, 4000);
}
document.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip && chip.closest('.chips')) { e.preventDefault(); onChip(chip); return; }
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACT[t.dataset.act];
  if (!fn) return;
  e.preventDefault();
  if (sync.readOnly && WRITE_ACTS.has(t.dataset.act)) { toast(RO_MSG, { danger: true }); return; }
  if (t.dataset.confirm && !t.classList.contains('armed')) { arm(t); return; }
  fn(t.dataset, t);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
window.addEventListener('scroll', () => { $('#top').classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

ACT.tab = d => go(d.tab);
ACT.back = () => back();
ACT['close-sheet'] = () => closeSheet();
ACT.fab = () => { if (currentFab) currentFab(); };
ACT['sync-info'] = () => toast(syncText());
ACT.reglages = () => { const t = topView(); if (t && t.view === 'reglages') return; push('reglages'); };
ACT.seg = d => {
  const t = topView();
  if (d.k === 'sub' && t) t.sub = d.v; else { ui[d.k] = d.v; saveUi(); }
  entree = 'seg'; render();
};
ACT['open-cheval'] = d => push('cheval', { id: d.id, sub: d.sub || 'fiche' });
ACT['open-pre'] = d => push('pre', { id: d.id });
ACT.go = d => go(d.tab);
