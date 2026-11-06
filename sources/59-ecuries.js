
/* ---------- Écuries, compte, équipe et invitations ----------
   Version installable : Réglages commence par « Mon écurie » (nom, commune, rôle, autres écuries) ;
   la feuille « L'équipe » invite par lien (avec un code à taper) ou par adresse e-mail. */
Object.assign(ICONS, {
  partage: '<path d="M12 14V3.5M8 7.5l4-4 4 4"/><path d="M7.5 10.5H6a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5"/>',
  sortie: '<path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>'
});
const sheetErr = m => {
  const el = document.getElementById('sfErr');
  if (!el || $('#sheet').hidden) { if (m) toast(m, { danger: true }); return; }
  el.textContent = m || '';
  el.hidden = !m;
  if (m) el.scrollIntoView({ block: 'nearest' });
};
// message d'erreur rédigé par firebase.js (code « invitation »), sinon le message prévu ici
const eqMsg = (e, def) => (e && e.code === 'invitation' && e.message) || def;
const idEcurie = e => e ? (e.id || e.sid || null) : null;
/* Un nom d'écurie dans une phrase : « aux Écuries du Valdi », « du Haras… », « d'Écurie… » */
const aNom = n => { const s = String(n || ''); return /^les\s/i.test(s) ? 'aux ' + s.slice(4) : /^le\s/i.test(s) ? 'au ' + s.slice(3) : 'à ' + s; };
const deNom = n => { const s = String(n || ''); return /^les\s/i.test(s) ? 'des ' + s.slice(4) : /^le\s/i.test(s) ? 'du ' + s.slice(3) : /^[aeiouyàâäéèêëîïôöûü]/i.test(s) ? "d'" + s : 'de ' + s; };
/* Nom court pour l'en-tête : sans le mot générique du début (« Écurie du… », « Haras des… »…) quand il reste un vrai nom */
function nomCourtEcurie(n) {
  const s = String(n || '').trim();
  const c = s.replace(/^(les\s+|le\s+|la\s+)?([eéÉ]curies?|haras|centre\s+[eéÉ]questre|poney[\s-]+club|club\s+hippique|ferme\s+[eéÉ]questre|[eéÉ]levage|pension)\s+(de\s+la\s+|de\s+l['’]\s*|du\s+|des\s+|de\s+|d['’]\s*)?/i, '');
  return c.length >= 2 && c !== s ? c.charAt(0).toUpperCase() + c.slice(1) : s;
}
const formeCode = i => {
  const c = i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), v = c.length > 4 ? c.slice(0, 4) + '-' + c.slice(4) : c;
  if (v !== i.value) i.value = v;
};
const codeAttrs = 'class="code-in" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="11" placeholder="ABCD-EF23"';

/* ---------- En-tête : l'écurie ouverte, dès qu'on en a au moins deux ---------- */
function majEcurieBtn() {
  const b = document.getElementById('ecurieBtn');
  if (!b) return false;
  const e = ecurieOuverte(), fantome = !!(e && e.fantome), voir = !!(window.EQ_MODE && e && e.nom && (fantome || mesEcuries().length >= 2));
  b.hidden = !voir;
  b.classList.toggle('admin', voir && fantome);
  if (!voir) return false;
  const t = (fantome ? 'Admin · ' : '') + nomCourtEcurie(e.nom);
  if (b.textContent !== t) b.textContent = t;
  b.setAttribute('aria-label', `${fantome ? 'Mode administrateur, écurie' : 'Écurie ouverte'} : ${e.nom}. Ouvrir « Mon écurie »`);
  return true;
}
ACT['mon-ecurie'] = () => {
  const t = topView();
  if (t && t.view === 'reglages') { window.scrollTo({ top: 0, behavior: mouvementOk() ? 'smooth' : 'auto' }); return; }
  push('reglages');
};

/* ---------- Réglages › Mon écurie ---------- */
function monEcurieHtml() {
  const e = ecurieOuverte();
  if (!window.EQ_MODE || !e) return '';
  const id = idEcurie(e), g = e.role === 'gerante';
  if (e.fantome) return section('Mon écurie', `<div class="card ecu-carte">
      <div class="row-main"><div class="ecu-nom">${esc(e.nom || 'Écurie')}</div><div class="row-s">${esc(e.commune || 'Commune non indiquée')}</div></div>
      <div class="wrap"><span class="pill">Administration</span><span class="small muted">tu n'apparais pas dans son équipe</span></div>
      ${aboHtml()}
      <div class="btnrow"><button type="button" class="btn small" data-act="adm-quitter">${ic('sortie', 'sm')}Quitter le mode administrateur</button></div>
    </div>`);
  const autres = mesEcuries().filter(x => x.id !== id).map(x => `<div class="row">
      <span class="qa-ic menthe">${ic('barn')}</span>
      <div class="row-main"><div class="row-t">${esc(x.nom)}</div><div class="row-s">${esc(ROLE_LABEL[x.role] || '')}</div></div>
      <button type="button" class="btn small" data-act="ecu-ouvrir" data-sid="${esc(x.id)}">Ouvrir</button></div>`).join('');
  return section('Mon écurie', `<div class="card ecu-carte">
      <div class="row-main"><div class="ecu-nom">${esc(e.nom || 'Mon écurie')}</div><div class="row-s">${esc(e.commune || 'Commune non indiquée')}</div></div>
      <div class="wrap"><span class="pill${g ? ' ok' : ''}">${esc(ROLE_LABEL[e.role] || '')}</span><span class="small muted">ton rôle dans cette écurie</span></div>
      ${aboHtml()}
      <div class="btnrow">${g
        ? `<button type="button" class="btn small" data-act="ecu-renommer">${ic('edit', 'sm')}Modifier le nom</button><button type="button" class="btn small" data-act="ecu-gerance">${ic('users', 'sm')}Passer la gérance</button>`
        : `<button type="button" class="btn small danger" data-act="ecu-quitter">${ic('sortie', 'sm')}Quitter cette écurie</button>`}</div>
    </div>
    ${autres ? `<div class="list">${autres}</div>` : ''}
    <div class="btnrow"><button type="button" class="btn small" data-act="ecu-creer">${ic('plus', 'sm')}Créer une autre écurie</button><button type="button" class="btn small" data-act="ecu-code">Rejoindre avec un code</button></div>`);
}
const champsNom = (nom, commune) => `${fld("Nom de l'écurie", inp('f_enom', nom, 'maxlength="40" autocapitalize="words" autocomplete="off" required'))}
  ${fld('Commune (facultatif)', inp('f_ecom', commune, 'maxlength="60" autocapitalize="words" autocomplete="off"'))}`;
const lireNom = () => ({ nom: val('f_enom').replace(/\s+/g, ' '), commune: val('f_ecom').replace(/\s+/g, ' ') });
// envoie l'action et garde la feuille ouverte jusqu'à la réponse (bouton grisé, erreur sous le formulaire)
function envoi(p, ok, def) {
  const b = $('#sfOk');
  if (b) b.disabled = true;
  p.then(ok, err => { if (b && b.isConnected) b.disabled = false; sheetErr(eqMsg(err, def)); });
  return false;
}
ACT['ecu-renommer'] = () => {
  const e = ecurieOuverte();
  if (!e || !window.EQ || e.role !== 'gerante') return;
  openSheet("Nom de l'écurie", `${champsNom(e.nom || '', e.commune || '')}<p class="note">Le nom change pour toute l'équipe.</p>`, {
    submit: 'Enregistrer', local: true, focus: '#f_enom',
    onSubmit: () => {
      const v = lireNom();
      if (v.nom.length < 2 || v.nom.length > 40) return 'Le nom doit faire de 2 à 40 caractères.';
      return envoi(EQ.renommer(v), () => { closeSheet(); toast('Nom enregistré'); render(); }, "Le nom n'a pas pu être enregistré : vérifie ta connexion.");
    }
  });
};
ACT['ecu-gerance'] = () => {
  if (!window.EQ || !estGerante()) return;
  const ok = membres().filter(m => m.id !== me.uid && m.role === 'equipe');
  if (!ok.length) {
    openSheet('Passer la gérance', `<p class="note" style="color:var(--ink)">La gérance se passe à une personne de l'équipe qui a le droit « Peut modifier ». Personne ne l'a encore : invite quelqu'un, ou change ses droits dans l'équipe.</p>
      <button type="button" class="btn" data-act="equipe">${ic('users', 'sm')}Ouvrir l'équipe</button>`);
    return;
  }
  let arme = false;
  openSheet('Passer la gérance', `${grp('À qui ?', chips('ger', ok.map(m => ({ v: m.id, html: `${pav({ uid: m.id }, 's')}<span>${esc(nomCourt({ uid: m.id }))}</span>` })), []))}
    <p class="note">Cette personne gère ensuite l'écurie : l'équipe, les invitations, les bons de la boutique. Toi, tu passes en « Peut modifier ». Une écurie n'a qu'une gérante.</p>`, {
    submit: 'Passer la gérance', local: true,
    onMount: f => f.addEventListener('chipchange', () => {
      arme = false;
      const b = $('#sfOk');
      if (b) { b.textContent = 'Passer la gérance'; b.classList.remove('armed'); }
    }),
    onSubmit: f => {
      const uid = chipVal(f, 'ger'), b = $('#sfOk');
      if (!uid) return 'Choisis la personne.';
      // confirmation : un second appui
      if (!arme) { arme = true; b.textContent = `Confirmer : ${nomCourt({ uid })} prend la gérance`; b.classList.add('armed'); return false; }
      return envoi(EQ.passerGerance(uid), () => {}, "La gérance n'a pas pu être passée : vérifie ta connexion.");
    }
  });
};
ACT['ecu-quitter'] = () => {
  const e = ecurieOuverte();
  if (!e || !window.EQ) return;
  if (e.role === 'gerante') { toast("Passe d'abord la gérance : une écurie garde toujours sa gérante.", { danger: true }); return; }
  const n = outbox.length;
  openSheet('Quitter cette écurie', `<p class="note" style="color:var(--ink)">Tu ne verras plus <b>${esc(e.nom)}</b>, ni sur ce téléphone ni ailleurs. Pour revenir, il te faudra une nouvelle invitation de la gérante.</p>
    ${n ? `<div class="box danger"><div class="issue danger">${ic('alert', 'sm')}<span>${n} ${pl(n, 'modification')} pas encore ${n > 1 ? 'envoyées seront perdues' : 'envoyée sera perdue'}.</span></div></div>` : ''}`, {
    submit: "Quitter l'écurie", local: true,
    onSubmit: () => envoi(EQ.quitter(), () => {}, "Ça n'a pas marché : vérifie ta connexion.")
  });
};
ACT['ecu-ouvrir'] = d => {
  const x = mesEcuries().find(e => e.id === d.sid), cur = ecurieOuverte();
  if (!x || !window.EQ) return;
  const go = () => { toast(`Ouverture ${deNom(x.nom)}…`); EQ.ouvrir(x.id); };
  const n = outbox.length;
  if (!n) { go(); return; }
  // les envois en attente restent rangés avec leur écurie : ils partiront quand on la rouvrira
  const nom = esc(cur && cur.nom ? cur.nom : 'Cette écurie');
  openSheet(`Ouvrir ${x.nom}`, `<p class="note" style="color:var(--ink)"><b>${nom}</b> : ${n} ${pl(n, 'modification')} ${n > 1 ? 'attendent' : 'attend'} encore le réseau. ${n > 1 ? 'Elles partiront' : 'Elle partira'} vers cette écurie quand tu la rouvriras, jamais ailleurs.</p>`, {
    submit: `Ouvrir ${x.nom}`, local: true, onSubmit: () => { go(); return false; }
  });
};
ACT['ecu-creer'] = () => {
  if (!window.EQ) return;
  openSheet('Créer une écurie', `${champsNom('', '')}<p class="note">Une écurie séparée de celle-ci : ses chevaux, son équipe, ses réglages. Tu en es la gérante.</p>`, {
    submit: "Créer l'écurie", local: true, focus: '#f_enom',
    onSubmit: () => {
      const v = lireNom();
      if (v.nom.length < 2 || v.nom.length > 40) return 'Le nom doit faire de 2 à 40 caractères.';
      return envoi(EQ.creer(v), () => {}, "L'écurie n'a pas pu être créée : vérifie ta connexion.");
    }
  });
};
ACT['ecu-code'] = () => {
  if (!window.EQ) return;
  openSheet('Rejoindre une écurie', fld("Code d'invitation", inp('f_code', '', codeAttrs), 'Le code reçu de la gérante : 8 lettres et chiffres.'), {
    submit: 'Continuer', local: true, focus: '#f_code',
    onMount: () => { const i = $('#f_code'); i.addEventListener('input', () => formeCode(i)); },
    onSubmit: () => envoi(EQ.infoInvitation(val('f_code')).then(inv => {
      if (mesEcuries().some(x => x.id === inv.structure)) throw Object.assign(new Error(inv.structureNom ? `Tu fais déjà partie ${deNom(inv.structureNom)}.` : 'Tu fais déjà partie de cette écurie.'), { code: 'invitation' });
      return inv;
    }), confirmerRejoindre, "Ce code n'a pas pu être vérifié : vérifie ta connexion.")
  });
};
function confirmerRejoindre(inv) {
  const cur = ecurieOuverte();
  openSheet(`Rejoindre ${inv.structureNom || "l'écurie"}`, `<p class="note" style="color:var(--ink)">${esc((inv.par && inv.par.nom) || 'La gérante')} t'invite à rejoindre <b>${esc(inv.structureNom || '')}</b>.</p>
    <div class="wrap"><span class="pill ok">${esc(ROLE_LABEL[inv.role] || '')}</span></div>
    <p class="note">${inv.role === 'lecture' ? 'Tu pourras tout consulter, sans rien modifier.' : 'Tu pourras tout noter dans cette écurie.'}${cur && cur.nom ? ` Tu restes dans ${esc(cur.nom)}.` : ''}</p>`, {
    submit: 'Rejoindre', local: true,
    onSubmit: () => envoi(EQ.rejoindre(inv.code), x => { toast(`Bienvenue dans ${x.nom || "l'écurie"} !`, { fete: true }); EQ.ouvrir(x.sid); }, "Ça n'a pas marché : vérifie ta connexion.")
  });
}

/* ---------- Réglages › Ton compte ---------- */
function equipeHtml() {
  if (window.EQ_MODE && window.EQ && ecurieOuverte() && ecurieOuverte().fantome) return section('Ton compte', `<div class="card">
    <div class="row-main"><div class="row-t trunc">${esc(EQ.email || '')}</div><div class="row-s">Ici, tu notes sous le nom « EquiValdi »</div></div>
    <div class="btnrow"><button type="button" class="btn small" data-act="equipe">${ic('users', 'sm')}L'équipe et les invitations</button><button type="button" class="btn small" data-act="deconnexion">Se déconnecter</button></div>
  </div>`);
  if (window.EQ_MODE && window.EQ) return section('Ton compte', `<div class="card">
    <div class="row-main"><div class="row-t trunc">${esc(EQ.email || '')}</div><div class="row-s">Le même compte dans toutes tes écuries</div></div>
    ${fld('Ton prénom', inp('f_moi', moiNom(), 'autocomplete="given-name" autocapitalize="words"'), "Affiché dans l'équipe et à côté des tâches que tu coches.")}
    <div class="btnrow">
      <button type="button" class="btn small" data-act="save-moi">${ic('check', 'sm')}Enregistrer le prénom</button>
      <button type="button" class="btn small" data-act="ma-fiche">${ic('user', 'sm')}Ma fiche</button>
      ${estGerante() ? `<button type="button" class="btn small" data-act="equipe">${ic('users', 'sm')}L'équipe et les invitations</button>` : ''}
      <button type="button" class="btn small" data-act="deconnexion">Se déconnecter</button>
    </div>
  </div>`);
  return section('Gérer à plusieurs', `<div class="card">
    <p class="note" style="color:var(--ink)">Pour partager le carnet : depuis un ordinateur, ouvre cette page sur claude.ai, clique sur <b>Partager</b>, invite chaque personne par e-mail et choisis <b>Peut modifier</b>. Chacun se connecte avec son compte Claude et voit les mêmes données, en direct.</p>
    <p class="note">N'active pas « Toute personne ayant le lien » : les invités ne pourraient plus que consulter.</p>
    ${fld('Ton prénom', inp('f_moi', getMoi() || me.platformName || '', 'autocomplete="given-name" autocapitalize="words"'), 'Affiché à côté des tâches que tu coches. Il reste sur ce téléphone.')}
    <button type="button" class="btn small" data-act="save-moi" style="align-self:flex-start">${ic('check', 'sm')}Enregistrer le prénom</button>
  </div>`);
}
ACT.deconnexion = () => { if (window.EQ) EQ.deconnexion(); };
ACT['save-moi'] = () => {
  const v = val('f_moi').replace(/\s+/g, ' ').slice(0, 40);
  if (!v) { toast('Indique ton prénom.'); return; }
  setMoi(v);
  // version installable : le prénom de la fiche d'équipe suit, sur tous les téléphones
  const m = me.uid ? get('membres', me.uid) : null;
  if (m && m.role && m.nom !== v) put('membres', Object.assign({}, m, { nom: v }));
  toast('Prénom enregistré');
};

/* ---------- Feuille « L'équipe » (gérante) : membres, invitations en attente, inviter ---------- */
ACT.equipe = () => equipeSheet();
async function equipeSheet(msg = '', copier = '') {
  if (!window.EQ || !estGerante()) return;
  let mb = [], inv = [];
  try { [mb, inv] = await Promise.all([EQ.membres(), EQ.invitations()]); }
  catch (e) { toast("Impossible de charger l'équipe : vérifie ta connexion.", { danger: true }); return; }
  const now = Date.now(), ordre = m => ({ gerante: 0, equipe: 1, lecture: 2 }[m.role] ?? 3);
  const lignes = mb.sort((a, b) => ordre(a) - ordre(b) || String(a.nom || a.email).localeCompare(String(b.nom || b.email), 'fr')).map(m => `<div class="row"><div class="row-main">
      <div class="row-t">${esc(m.nom || m.email)}${m.moi ? ' <span class="pill ok">Toi</span>' : ''}</div><div class="row-s">${esc(m.email)} · ${esc(ROLE_LABEL[m.role] || m.role)}</div>
      ${m.role === 'gerante' ? '' : `<div class="wrap" style="margin-top:6px"><button type="button" class="btn small" data-act="eq-role" data-uid="${esc(m.uid)}" data-role="${m.role === 'lecture' ? 'equipe' : 'lecture'}">${m.role === 'lecture' ? 'Passer en « Peut modifier »' : 'Passer en lecture seule'}</button><button type="button" class="btn small danger" data-act="eq-del" data-uid="${esc(m.uid)}" data-confirm="Confirmer le retrait">Retirer</button></div>`}
    </div></div>`).join('');
  const attente = inv.map(i => {
    const lien = !i.email, fini = !!(i.expire && i.expire <= now);
    const t = lien ? `Lien · ${fini ? 'expiré le' : 'expire le'} ${dShort(isoOf(new Date(i.expire)))}` : i.email;
    return `<div class="row${fini ? ' muted' : ''}"><div class="row-main"><div class="row-t">${esc(t)}</div><div class="row-s">${esc(ROLE_LABEL[i.role] || i.role)} · code ${esc(EQ.code(i.code))}</div></div><button type="button" class="btn small" data-act="eq-inv-del" data-code="${esc(i.code)}">Annuler</button></div>`;
  }).join('');
  openSheet("L'équipe", `
    ${msg ? `<div class="box ok"><div class="issue ok">${ic('check', 'sm')}<span>${esc(msg)}</span></div>${copier ? `<button type="button" class="btn small" data-act="eq-copier" data-txt="${esc(copier)}" style="align-self:flex-start">${ic('copy', 'sm')}Copier un message pour cette personne</button>` : ''}</div>` : ''}
    ${grp('Membres', `<div class="list">${lignes || '<div class="row"><div class="row-s">Aucun membre</div></div>'}</div>`)}
    ${inv.length ? grp('Invitations en attente', `<div class="list">${attente}</div>`) : ''}
    <div class="box inv-box">
      <span class="flabel">Inviter quelqu'un</span>
      ${chips('invrole', [{ v: 'equipe', l: 'Peut modifier' }, { v: 'lecture', l: 'Lecture seule' }], 'equipe')}
      <button type="button" class="btn primary" data-act="eq-lien">${ic('partage', 'sm')}Partager un lien d'invitation</button>
      <p class="note">Valable 7 jours, pour une seule personne. Son code peut aussi se taper dans l'appli.</p>
      ${fld('Ou par adresse e-mail', inp('f_inv', '', 'type="email" autocomplete="off" placeholder="prenom@exemple.fr" enterkeyhint="send"'))}
      <button type="button" class="btn" data-act="eq-mail">Inviter cette adresse</button>
    </div>`, {
    onMount: () => {
      const i = $('#f_inv');
      if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACT['eq-mail']({}, $('[data-act="eq-mail"]')); } });
    }
  });
}
const eqDo = (p, ok) => p.then(() => equipeSheet(ok)).catch(e => toast(eqMsg(e, "La modification n'a pas pu être enregistrée."), { danger: true }));
ACT['eq-role'] = d => eqDo(EQ.changerRole(d.uid, d.role), 'Droits modifiés.');
ACT['eq-del'] = d => eqDo(EQ.retirerMembre(d.uid), "Personne retirée de l'écurie.");
ACT['eq-inv-del'] = d => eqDo(EQ.annulerInvitation(d.code), 'Invitation annulée.');
ACT['eq-mail'] = async (d, el) => {
  const mail = val('f_inv').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { sheetErr('Indique une adresse e-mail valide.'); return; }
  const role = chipVal(document, 'invrole') || 'equipe', e = ecurieOuverte() || {};
  if (el) el.disabled = true;
  try {
    await EQ.inviter(mail, role);
    equipeSheet(`${mail} est invité. En se connectant avec cette adresse, la personne trouvera l'invitation.`, `Rejoins l'écurie ${e.nom || ''} sur EquiValdi : ${EQ.lien()} (crée ton compte avec ${mail}).`);
  } catch (err) {
    if (el && el.isConnected) el.disabled = false;
    sheetErr(eqMsg(err, "L'invitation n'a pas pu être enregistrée : vérifie ta connexion."));
  }
};
// Partage du téléphone, sinon copie
async function partager(txt) {
  if (navigator.share) {
    try { await navigator.share({ text: txt }); return 'partage'; }
    catch (e) { if (e && e.name === 'AbortError') return 'annule'; }
  }
  try { await navigator.clipboard.writeText(txt); return 'copie'; } catch (e) { return null; }
}
ACT['eq-lien'] = async (d, el) => {
  const role = chipVal(document, 'invrole') || 'equipe';
  if (el) el.disabled = true;
  let r;
  try { r = await EQ.inviterLien(role); }
  catch (e) { if (el && el.isConnected) el.disabled = false; sheetErr(eqMsg(e, "Le lien n'a pas pu être créé : vérifie ta connexion.")); return; }
  const ec = ecurieOuverte() || {}, txt = `Rejoins l'écurie ${ec.nom || ''} sur EquiValdi : ${r.url}`;
  openSheet('Invitation prête', `<div class="inv-code"><span class="flabel">Code d'invitation</span><b id="invCode">${esc(EQ.code(r.code))}</b><span class="small muted">${esc(ROLE_LABEL[role] || '')} · valable 7 jours, une seule fois</span></div>
    <div class="btnrow"><button type="button" class="btn primary" data-act="eq-partager" data-txt="${esc(txt)}">${ic('partage', 'sm')}Partager le lien</button><button type="button" class="btn" data-act="eq-copier" data-txt="${esc(txt)}">${ic('copy', 'sm')}Copier</button></div>
    <p class="note">La personne ouvre le lien, crée son compte et rejoint ${esc(ec.nom || "l'écurie")}. Si elle a déjà installé l'appli sur iPhone, elle tape ce code dans « J'ai un code d'invitation ».</p>
    <button type="button" class="link" data-act="equipe" style="align-self:flex-start">${ic('users', 'sm')}Retour à l'équipe</button>`);
  partager(txt).then(res => { if (res === 'copie') toast('Lien copié : colle-le dans un message.'); });
};
ACT['eq-partager'] = d => partager(d.txt).then(res => { if (res === 'copie') toast('Lien copié : colle-le dans un message.'); else if (!res) toast(d.txt); });
ACT['eq-copier'] = d => {
  try { navigator.clipboard.writeText(d.txt).then(() => toast('Copié : colle-le dans un message.'), () => toast(d.txt)); } catch (e) { toast(d.txt); }
};

/* ---------- Réglages › Crottins : interrupteur et boutique de l'écurie (gérante) ---------- */
function crotSection() {
  if (window.EQ_MODE && !premium()) return section('Crottins', `<div class="verrou-ligne">${verrouHtml('crottins')}</div>`);
  const actifs = crottinsActifs(), g = estGerante();
  let h = '';
  if (g) h += `<div class="list"><button type="button" class="row sw-row" role="switch" aria-checked="${actifs}" data-act="crot-onoff">
      <div class="row-main"><div class="row-t">Points crottins dans cette écurie</div><div class="row-s">${actifs ? 'Compteur, boutique, animations et classement' : 'Coupés : ni compteur, ni boutique, ni classement'}</div></div>
      <span class="sw-t" aria-hidden="true"><i></i></span></button></div>`;
  if (actifs) h += `${segCtl('crotAnim', [['grand', 'Grande animation'], ['discret', 'Discrète']], ui.crotAnim === 'discret' ? 'discret' : 'grand')}
    <p class="note">Ce que montre l'appli quand tu gagnes des crottins, sur ce téléphone.</p>
    <div class="btnrow"><button type="button" class="link" data-act="boutique">${crottinSvg('s')}Ouvrir la boutique</button>${g ? `<button type="button" class="link" data-act="bq-edit">${ic('edit', 'sm')}Modifier les récompenses</button>` : ''}</div>`;
  else if (!g) h += '<p class="note">La gérante a coupé les points crottins dans cette écurie.</p>';
  return section('Crottins', h);
}
ACT['crot-onoff'] = () => {
  if (!estGerante()) return;
  const on = !crottinsActifs();
  const regle = v => { putCfg(Object.assign({}, S.cfg || {}, { crottins: v })); render(); };
  regle(on);
  toast(on ? 'Points crottins activés' : 'Points crottins coupés dans cette écurie', { undo: () => regle(!on) });
};
const BQ_NOMS = { biere: 'Bière', apero: 'Apéro', repas: 'Repas', collectif: 'Cours collectif', tapis: 'Tapis', particulier: 'Étoile' };
const BQ_COULEURS = { paille: 'Paille', ciel: 'Ciel', menthe: 'Menthe', prairie: 'Prairie' };
function bqLigne(it) {
  return `<div class="bq-ed" data-bq="${esc(it.id)}">
    <div class="bq-ed-l">
      <button type="button" class="qa-ic ${esc(it.tint)} bq-look" data-act="bq-look" aria-expanded="false" aria-label="Icône et couleur">${ic(it.ic)}</button>
      <input class="rinput bq-nom" value="${esc(it.nom)}" maxlength="40" autocomplete="off" autocapitalize="sentences" placeholder="ex. Un café offert" aria-label="Nom de la récompense">
      <input class="rinput bq-prix" value="${esc(it.prix)}" inputmode="numeric" autocomplete="off" placeholder="200" aria-label="Prix en crottins">
      <button type="button" class="iconbtn" data-act="bq-del" aria-label="Retirer cette récompense">${ic('trash', 'sm')}</button>
    </div>
    <div class="bq-choix" hidden>
      ${chips('bqi-' + it.id, BQ_ICONES.map(x => ({ v: x, html: ic(x), aria: BQ_NOMS[x] })), it.ic)}
      ${chips('bqt-' + it.id, BQ_TEINTES.map(x => ({ v: x, html: `<span class="qa-ic ${x} mini"></span>`, aria: BQ_COULEURS[x] })), it.tint)}
    </div>
  </div>`;
}
ACT['bq-edit'] = () => {
  if (!estGerante()) return;
  const e = ecurieOuverte() || {};
  openSheet('Récompenses', `<p class="note">${e.nom ? `<b>${esc(e.nom)}</b> : ` : ''}ce que l'équipe s'offre avec ses crottins. Les bons déjà pris gardent leur nom et leur prix.</p>
    <div class="bq-tete small muted"><span>Récompense</span><span>Prix</span></div>
    <div class="bq-eds" id="bqEds">${boutique().map(bqLigne).join('')}</div>
    <div class="btnrow"><button type="button" class="link" data-act="bq-add">${ic('plus', 'sm')}Ajouter une récompense</button>
      <button type="button" class="link" data-act="bq-reset" data-confirm="Confirmer : liste de départ">Remettre la liste de départ</button></div>`, {
    submit: 'Enregistrer la boutique', local: true,
    onMount: f => f.addEventListener('chipchange', ev => {
      const row = ev.target.closest('[data-bq]');
      if (!row || !/^bq[it]-/.test(ev.detail.name)) return;
      const look = $('.bq-look', row), icv = chipVal(row, 'bqi-' + row.dataset.bq) || 'particulier', tv = chipVal(row, 'bqt-' + row.dataset.bq) || 'paille';
      look.className = `qa-ic ${tv} bq-look`;
      look.innerHTML = ic(icv);
    }),
    onSubmit: () => {
      const items = $$('#bqEds [data-bq]').map(r => ({
        id: r.dataset.bq, nom: $('.bq-nom', r).value.replace(/\s+/g, ' ').trim().slice(0, 40), prix: parseNum($('.bq-prix', r).value),
        ic: chipVal(r, 'bqi-' + r.dataset.bq) || 'particulier', tint: chipVal(r, 'bqt-' + r.dataset.bq) || 'paille'
      }));
      if (!items.length) return 'Garde au moins une récompense, ou coupe les points crottins.';
      if (items.some(i => !i.nom)) return "Chaque récompense a besoin d'un nom.";
      if (items.some(i => !(Number.isInteger(i.prix) && i.prix >= 1 && i.prix <= 100000))) return 'Les prix sont des nombres entiers de crottins, de 1 à 100 000.';
      putCfg(Object.assign({}, S.cfg || {}, { boutique: items }));
      toast('Boutique enregistrée');
      render();
    }
  });
};
ACT['bq-look'] = (d, el) => {
  const row = el.closest('[data-bq]'), p = row && $('.bq-choix', row);
  if (!p) return;
  p.hidden = !p.hidden;
  el.setAttribute('aria-expanded', String(!p.hidden));
};
ACT['bq-add'] = () => {
  const box = $('#bqEds');
  if (!box) return;
  box.insertAdjacentHTML('beforeend', bqLigne({ id: uid(), nom: '', prix: '', ic: 'particulier', tint: 'menthe' }));
  const row = box.lastElementChild;
  $('.bq-choix', row).hidden = false;
  $('.bq-look', row).setAttribute('aria-expanded', 'true');
  $('.bq-nom', row).focus();
};
ACT['bq-del'] = (d, el) => { const row = el.closest('[data-bq]'); if (row) row.remove(); };
ACT['bq-reset'] = () => {
  if (!estGerante()) return;
  const c = Object.assign({}, S.cfg || {});
  delete c.boutique;
  putCfg(c);
  closeSheet();
  toast('Liste de départ remise');
  render();
};
