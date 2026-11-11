
/* ---------- Abonnement de l'écurie (version installable) ----------
   Essai gratuit de 2 mois, sans carte. Pendant l'essai : tout le carnet, 2 chevaux au plus ; la carte des prés
   et les points crottins sont réservés aux écuries abonnées. Après l'essai sans abonnement : lecture seule
   (tout reste consultable et exportable). Deux formules, payées par la gérante (paiement fictif en attendant
   Shine ou Tebex) : « À la maison » 5 €/mois ou 50 €/an ; « Pro » 20 €/mois ou 200 €/an, avec les propriétaires
   en pension et leurs relevés (décidé par Célia le 12 novembre 2026). L'essai comprend la pension.
   Écuries créées avant le 6 novembre 2026 à 12 h : Pro à vie. */
const ABO = { offres: { maison: { mois: 5, an: 50, nom: 'À la maison' }, pro: { mois: 20, an: 200, nom: 'Pro' } }, chevaux: 2, aVieAvant: 1793962800000, rappel: 14 };
const prixAbo = (offre, fo) => (ABO.offres[offre] || ABO.offres.maison)[fo === 'an' ? 'an' : 'mois'];
const offreDe = a => a && a.offre === 'pro' ? 'pro' : 'maison';   // abonnements payés avant les deux formules : « À la maison »
// « 6 janvier », avec l'année quand la date est loin (« 20 février 2028 »)
const dJour = ms => fmt(isoOf(new Date(ms)), Math.abs(ms - Date.now()) > 300 * 86400000 ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });

/* État d'une écurie : a_vie, abonnee, essai, expiree (inconnu tant que rien n'est chargé : on ne bloque rien) */
function aboEtat(e) {
  if (e === undefined) e = ecurieOuverte();
  if (!window.EQ_MODE) return { code: 'a_vie' };          // carnet partagé sur claude.ai : rien ne change
  if (!e || (!e.abonnement && !e.creeLe)) return { code: 'inconnu' };
  const a = e.abonnement || {}, now = Date.now();
  if (a.statut === 'fondatrice' || a.statut === 'a_vie' || (e.creeLe && e.creeLe < ABO.aVieAvant)) return { code: 'a_vie' };
  if (a.statut === 'abonnee' && a.fin > now) return { code: 'abonnee', formule: a.formule, offre: offreDe(a), fin: a.fin, paiement: a.paiement || null };
  if (a.finEssai > now) return { code: 'essai', fin: a.finEssai, jours: Math.max(1, Math.ceil((a.finEssai - now) / 86400000)) };
  return { code: 'expiree', fin: Math.max(a.finEssai || 0, a.fin || 0) };
}
/* L'administration EquiValdi n'est limitée par rien */
function premium() {
  const e = ecurieOuverte();
  if (e && e.fantome) return true;
  const c = aboEtat(e).code;
  return c !== 'essai' && c !== 'expiree';
}
/* Formule Pro (propriétaires en pension, relevés) : à vie, pendant l'essai, ou abonnée Pro */
function offrePro() {
  const e = ecurieOuverte();
  if (!window.EQ_MODE || (e && (e.fantome || e.demo))) return true;
  const st = aboEtat(e);
  return st.code === 'a_vie' || st.code === 'essai' || st.code === 'inconnu' || (st.code === 'abonnee' && st.offre === 'pro');
}
function ecurieFigee() {
  const e = ecurieOuverte();
  return !!e && !e.fantome && aboEtat(e).code === 'expiree';
}
function chevalPossible() { return premium() || chevaux().filter(h => !h.ex).length < ABO.chevaux; }
function figeeMsg() {
  const e = ecurieOuverte() || {};
  return e.role === 'gerante' ? "L'essai gratuit est terminé : abonne l'écurie pour continuer à noter. Tout reste consultable."
    : "L'essai gratuit de l'écurie est terminé : la gérante peut l'abonner pour continuer à noter. Tout reste consultable.";
}
function aboResume(st) {
  if (st.code === 'a_vie') return { titre: 'Pro à vie', detail: 'Toutes les fonctions, pour toujours.', ic: 'rosette', ton: 'ok' };
  if (st.code === 'abonnee') return {
    titre: `${ABO.offres[st.offre].nom} · ${st.formule === 'an' ? 'annuel' : 'mensuel'}`, ic: 'check', ton: 'ok',
    detail: `Payée jusqu'au ${dJour(st.fin)}${st.paiement && st.paiement.fournisseur === 'fictif' ? ' (paiement de démonstration)' : ''}.`
  };
  if (st.code === 'essai') return {
    titre: `Essai gratuit · encore ${st.jours} ${pl(st.jours, 'jour')}`, ic: 'clock', ton: st.jours <= ABO.rappel ? 'warn' : '',
    detail: `Jusqu'au ${dJour(st.fin)}, sans carte. ${ABO.chevaux} chevaux au plus ; la carte des prés et les points crottins viennent avec l'abonnement. La pension est comprise dans l'essai.`
  };
  if (st.code === 'expiree') return { titre: 'Essai terminé · lecture seule', detail: `Depuis le ${dJour(st.fin)}. Tout reste consultable et exportable.`, ic: 'lock', ton: 'danger' };
  return null;
}
const RAISONS = {
  chevaux: { t: 'Plus de 2 chevaux', p: "Pendant l'essai, l'écurie compte 2 chevaux au plus. Abonnée, elle en accueille autant que tu veux." },
  carte: { t: 'La carte des prés', p: "La carte en 3D, l'état des prés en couleur et les chevaux à faire glisser sont réservés aux écuries abonnées." },
  crottins: { t: 'Les points crottins', p: "Les crottins, la boutique et le classement de l'équipe sont réservés aux écuries abonnées." },
  fin: { t: 'Essai terminé', p: "Abonne l'écurie pour continuer à noter. Tout reste consultable en attendant." },
  pension: { t: 'Propriétaires en pension', p: "Le rôle « Propriétaire » (chaque propriétaire voit ses chevaux) et les relevés de pension viennent avec la formule Pro." }
};

/* Réglages › Mon écurie : l'état de l'abonnement */
function aboHtml() {
  const e = ecurieOuverte();
  if (!window.EQ_MODE || !e) return '';
  const st = aboEtat(e), r = aboResume(st);
  if (!r) return '';
  const g = e.role === 'gerante' && !e.fantome, ouvert = st.code === 'essai' || st.code === 'expiree';
  const btn = e.fantome ? `<button type="button" class="btn small" data-act="adm-ecurie" data-sid="${esc(idEcurie(e))}">Gérer</button>`
    : g && ouvert ? `<button type="button" class="btn small primary" data-act="abonner">S'abonner</button>`
    : g && st.code === 'abonnee' ? `<button type="button" class="btn small" data-act="abonner">${st.offre === 'pro' ? 'Prolonger' : 'Prolonger ou passer Pro'}</button>` : '';
  return `<div class="abo-etat ${r.ton}">${ic(r.ic)}<div class="row-main"><b>${esc(r.titre)}</b><span class="small">${esc(r.detail)}</span>${!g && !e.fantome && ouvert ? `<span class="small">Seule la gérante peut abonner l'écurie.</span>` : ''}</div>${btn}</div>`;
}
/* Accueil : mode administrateur, fin d'essai proche (gérante), essai terminé (tout le monde) */
function bandeauAbo() {
  const e = ecurieOuverte();
  if (!window.EQ_MODE || !e) return '';
  if (e.demo) return bandeauExemple();
  if (e.fantome) return `<div class="banner admin pile">${ic('lock')}<div class="row-main"><b>Mode administrateur · ${esc(e.nom || '')}</b><span class="small">Tu n'apparais pas dans l'équipe ; ce que tu notes est signé « EquiValdi ».</span></div><button type="button" class="btn small" data-act="adm-quitter">Quitter</button></div>`;
  const st = aboEtat(e), g = e.role === 'gerante';
  if (st.code === 'expiree') return `<div class="banner ro pile">${ic('lock')}<div class="row-main"><b>Essai terminé · lecture seule</b><span class="small">${esc(figeeMsg())}</span></div>${g ? `<button type="button" class="btn small primary" data-act="abonner" data-raison="fin">S'abonner</button>` : ''}</div>`;
  if (st.code === 'essai' && g && st.jours <= ABO.rappel) return `<div class="banner pile">${ic('clock')}<div class="row-main"><b>Plus que ${st.jours} ${pl(st.jours, 'jour')} d'essai</b><span class="small">Jusqu'au ${dJour(st.fin)}. Sans abonnement, l'écurie passera ensuite en lecture seule.</span></div><button type="button" class="btn small" data-act="abonner">S'abonner</button></div>`;
  return '';
}
/* Une fonction réservée aux écuries abonnées : ce qu'elle apporte, et le bouton pour s'abonner */
function verrouHtml(raison) {
  const r = RAISONS[raison], e = ecurieOuverte() || {};
  return `<div class="verrou-voile"><span class="qa-ic paille">${ic('lock')}</span><b>${esc(r.t)}</b><p class="small">${esc(r.p)}</p>
    ${e.role === 'gerante' ? `<button type="button" class="btn small primary" data-act="abonner" data-raison="${raison}">${raison === 'pension' && aboEtat(e).code === 'abonnee' ? 'Passer Pro' : "S'abonner"}</button>` : `<p class="small muted">Demande à la gérante d'abonner l'écurie.</p>`}</div>`;
}
/* La carte des prés, floutée sous le voile */
function carteVerrouHtml() { return `<div class="verrou-carte"><div class="carte" data-key="carte" data-garde></div>${verrouHtml('carte')}</div>`; }

/* S'abonner : la formule, puis le paiement (fictif pour l'instant) */
ACT.abonner = d => {
  const e = ecurieOuverte();
  if (!window.EQ || !e) return;
  if (e.fantome) { ACT['adm-ecurie']({ sid: idEcurie(e) }); return; }
  const r = RAISONS[d && d.raison] || null, st = aboEtat(e);
  const intro = r ? `<p class="note" style="color:var(--ink)">${esc(r.p)}</p>` : '';
  const M = ABO.offres.maison, P = ABO.offres.pro;
  if (e.role !== 'gerante') {
    openSheet(r ? r.t : 'Abonnement', `${intro}<p class="note">Seule la gérante de ${esc(e.nom || "l'écurie")} peut l'abonner : « ${M.nom} » ${M.mois} € par mois, ou « ${P.nom} » ${P.mois} € par mois avec la pension.</p>`);
    return;
  }
  // la formule proposée : Pro si l'écurie a déjà des pensions ou des propriétaires, ou si on vient pour ça
  const veutPro = (d && d.raison === 'pension') || (st.code === 'abonnee' ? st.offre === 'pro' : (typeof proprietairesPension === 'function' && proprietairesPension().length > 0) || membres().some(m => m.role === 'proprio'));
  const offre = (v, o, plus) => ({ v, html: `<span class="abo-nom">${o.nom}</span><b>${o.mois} €</b><span>par mois</span><small>${plus}</small>`, aria: `${o.nom}, ${o.mois} euros par mois` });
  openSheet(st.code === 'abonnee' ? "Prolonger l'abonnement" : "Abonner l'écurie", `${intro}
    <div class="abo-plans">${chips('offre', [offre('maison', M, 'Tes chevaux, ton équipe'), offre('pro', P, 'Avec les propriétaires en pension')], veutPro ? 'pro' : 'maison')}</div>
    <ul class="abo-plus">${['Chevaux sans limite', 'Carte des prés en 3D', 'Points crottins et boutique', "Toute l'équipe, en direct"].map(x => `<li>${ic('check', 'sm')}${x}</li>`).join('')}
      <li class="abo-pro">${ic('check', 'sm')}<span><b>Pro</b> : propriétaires en pension, chacun voit ses chevaux ; relevés mensuels</span></li></ul>
    ${grp('Paiement', chips('formule', [{ v: 'mois', l: 'Chaque mois' }, { v: 'an', l: "À l'année · 2 mois offerts" }], 'an'))}
    ${st.code === 'abonnee' ? `<p class="note">Payée jusqu'au ${dJour(st.fin)} (${ABO.offres[st.offre].nom}). En gardant la formule, la nouvelle période s'ajoute à la suite. En changeant de formule, elle commence tout de suite, et les jours qui restent sont convertis à leur valeur.</p>` : ''}`, {
    submit: 'Continuer vers le paiement', local: true,
    onSubmit: f => { const of = chipVal(f, 'offre'), fo = chipVal(f, 'formule'); if (!of || !fo) return 'Choisis une formule.'; feuillePaiement(fo, of); return false; }
  });
};
// même calcul que l'enregistrement (firebase.js › periodeAbo) : à la suite de l'essai ou de la période en cours ;
// en changeant de formule, tout de suite, avec les jours restants convertis au prix de la nouvelle formule
function finPrevue(e, fo, of = 'maison') {
  const a = (e && e.abonnement) || {}, now = Date.now(), en = a.statut === 'abonnee' && (a.fin || 0) > now, change = en && offreDe(a) !== of;
  const d = new Date(Math.max(now, a.finEssai || 0, en && !change ? a.fin : 0)), j = d.getDate();
  d.setMonth(d.getMonth() + (fo === 'an' ? 12 : 1)); if (d.getDate() < j) d.setDate(0);
  let fin = d.getTime();
  if (change) fin += Math.round((a.fin - Math.max(now, a.finEssai || 0)) * prixAbo(offreDe(a), 'mois') / prixAbo(of, 'mois'));
  return Math.min(fin, now + 790 * 86400000);
}
function feuillePaiement(fo, of = 'maison') {
  const e = ecurieOuverte() || {}, m = prixAbo(of, fo), st = aboEtat(e);
  const suite = st.code === 'essai' ? `<p class="note">Tout se débloque tout de suite, et ton essai n'est pas perdu : ${fo === 'an' ? "l'année payée commence" : 'le mois payé commence'} le ${dJour(st.fin)}, à la fin de l'essai.</p>`
    : st.code === 'abonnee' && st.offre === of ? `<p class="note">${fo === 'an' ? "L'année s'ajoute" : "Le mois s'ajoute"} à la suite de l'abonnement en cours (jusqu'au ${dJour(st.fin)}).</p>`
    : st.code === 'abonnee' ? `<p class="note">Changement de formule : « ${ABO.offres[of].nom} » commence tout de suite, et les jours qui restaient sont ajoutés à leur valeur.</p>` : '';
  openSheet('Paiement', `<div class="abo-demo"><span class="pill warn">Démo</span><p class="note" style="color:var(--ink)">Paiement fictif : aucun argent n'est débité. Le vrai paiement passera par Shine ou Tebex.</p></div>
    <div class="abo-recap"><div class="row-main"><b>${esc(e.nom || 'Écurie')}</b><span class="small muted">${ABO.offres[of].nom} · ${fo === 'an' ? 'annuel' : 'mensuel'}</span><span class="small muted">jusqu'au ${dJour(finPrevue(e, fo, of))}</span></div><b class="abo-prix">${m} €</b></div>${suite}
    <p class="note">${m} € TTC, TVA non applicable (article 293 B du CGI). Pas de renouvellement automatique : à la fin de la période, l'écurie repasse en lecture seule jusqu'au paiement suivant.</p>
    <label class="check"><input type="checkbox" id="f_cgv"><span>J'ai lu et j'accepte les <a href="${esc(EQ.legal ? EQ.legal.conditions : './legal/conditions.html')}" target="_blank" rel="noopener">conditions de vente</a>.</span></label>`, {
    submit: `Payer ${m} € (démo)`, local: true,
    onSubmit: () => !$('#f_cgv').checked ? 'Coche la case pour accepter les conditions de vente.' : envoi(EQ.payerFictif(fo, of), a => {
      closeSheet();
      toast(`Merci ! ${e.nom || "L'écurie"} est abonnée jusqu'au ${dJour(a.fin)}.`, { fete: true });
      render();
    }, "Le paiement n'a pas pu être enregistré : vérifie ta connexion.")
  });
}

/* ---------- Administration EquiValdi : toutes les écuries ---------- */
function adminSection() {
  if (!window.EQ_MODE || !window.EQ || !EQ.admin) return '';
  return section('Administration', `<p class="note">Compte d'administration EquiValdi : tu vois et gères toutes les écuries, sans apparaître dans leurs équipes.</p>
    <button type="button" class="btn" data-act="admin" style="align-self:flex-start">${ic('barn', 'sm')}Toutes les écuries</button>`);
}
let ADM = null, admEnCours = null;
function chargerAdmin() {
  if (admEnCours) return admEnCours;
  admEnCours = Promise.all([EQ.toutesEcuries(), EQ.tousRetours().catch(() => [])]).then(([l, r]) => { ADM = { t: Date.now(), liste: l, retours: r }; },
    () => { ADM = ADM || { t: Date.now(), liste: [], retours: [], erreur: true }; toast('Impossible de charger les écuries : vérifie ta connexion.', { danger: true }); })
    .then(() => { admEnCours = null; rerenderSoon(); });
  return admEnCours;
}
const admBadge = st => ({ a_vie: ['ok', 'À vie'], abonnee: ['ok', `${st.offre === 'pro' ? 'Pro' : 'Maison'} · ${st.formule === 'an' ? 'an' : 'mois'}`], essai: [st.jours <= ABO.rappel ? 'warn' : '', `Essai · ${st.jours} j`], expiree: ['danger', 'Expirée'] }[st.code] || ['', '?']);
VIEWS.admin = () => {
  const T = { title: 'Toutes les écuries', eyebrow: 'Administration', fab: null };
  if (!window.EQ || !EQ.admin) return Object.assign(T, { html: emptyH('Réservé', "Cette page est réservée à l'administration EquiValdi.") });
  if (!ADM) { chargerAdmin(); return Object.assign(T, { html: '<p class="note">Chargement des écuries…</p>' }); }
  const tous = ADM.liste.map(s => ({ s, st: aboEtat(s) }));
  const n = (...c) => tous.filter(x => c.includes(x.st.code)).length;
  const f = ['essai', 'abo', 'expiree', 'calmes'].includes(ui.admFiltre) ? ui.admFiltre : 'toutes';
  // dernière ouverture notée par l'appli (structures.vu, depuis le 11 novembre 2026)
  const ilYa = s => Number.isFinite(s.vu) ? Math.max(0, Math.floor((Date.now() - s.vu) / 86400000)) : null;
  const calme = s => ilYa(s) == null || ilYa(s) > 14;
  const vis = tous.filter(x => f === 'toutes' || (f === 'abo' ? ['abonnee', 'a_vie'].includes(x.st.code) : f === 'calmes' ? calme(x.s) : x.st.code === f));
  const actives7 = tous.filter(x => ilYa(x.s) != null && ilYa(x.s) <= 7).length;
  // messages « Une idée, un souci ? » : les nouveaux d'abord
  const msgs = (ADM.retours || []).slice().sort((a, b) => ((a.statut === 'nouveau') ? 0 : 1) - ((b.statut === 'nouveau') ? 0 : 1) || (b.le || 0) - (a.le || 0));
  const nNouv = msgs.filter(r => r.statut === 'nouveau').length;
  const blocMsgs = msgs.length ? section(`Messages${nNouv ? ` <span class="count">${nNouv}</span>` : ''}`, `<div class="list">${msgs.slice(0, 12).map(r => {
    const T = RETOUR_TYPES.find(x => x.v === r.type) || RETOUR_TYPES[0];
    return `<button type="button" class="row" data-act="adm-msg" data-id="${esc(r.id)}">${lead(T.ic)}<div class="row-main"><div class="row-t trunc">${esc(r.texte)}</div><div class="row-s">${esc([r.nom, r.ecurie, dShort(isoOf(new Date(r.le || 0)))].filter(Boolean).join(' · '))}</div></div>
      <span class="pill ${r.statut === 'nouveau' ? 'warn' : r.statut === 'repondu' ? 'ok' : ''}">${r.statut === 'nouveau' ? 'Nouveau' : r.statut === 'repondu' ? 'Répondu' : 'Traité'}</span></button>`;
  }).join('')}</div>`) : '';
  const parMois = tous.filter(x => x.st.code === 'abonnee').reduce((t, x) => t + (x.st.formule === 'an' ? prixAbo(x.st.offre, 'an') / 12 : prixAbo(x.st.offre, 'mois')), 0);
  const ouv = idEcurie(ecurieOuverte());
  // les cartes des prés demandées à EquiValdi, les plus anciennes d'abord
  const cartes = tous.filter(x => x.s.carteDemande && x.s.carteDemande.statut === 'demandee').sort((a, b) => a.s.carteDemande.le - b.s.carteDemande.le);
  const aDessiner = cartes.length ? section(`Cartes à dessiner <span class="count">${cartes.length}</span>`, `<div class="list">${cartes.map(({ s }) => `<button type="button" class="row" data-act="adm-ecurie" data-sid="${esc(s.id)}"><span class="qa-ic paille">${ic('image')}</span>
      <div class="row-main"><div class="row-t">${esc(s.nom || 'Sans nom')}</div><div class="row-s">${esc(['demandée le ' + dJour(s.carteDemande.le), s.carteDemande.par && s.carteDemande.par.nom].filter(Boolean).join(' · '))}</div></div>
      <span class="pill warn">À dessiner</span></button>`).join('')}</div>`) : '';
  const rows = vis.map(({ s, st }) => {
    const b = admBadge(st), quand = s.creeLe ? 'créée le ' + dShort(isoOf(new Date(s.creeLe))) : '';
    return `<button type="button" class="row" data-act="adm-ecurie" data-sid="${esc(s.id)}"><span class="qa-ic menthe">${ic('barn')}</span>
      <div class="row-main"><div class="row-t">${esc(s.nom || 'Sans nom')}${s.id === ouv ? ' <span class="pill ok">Ouverte</span>' : ''}</div><div class="row-s">${esc([s.commune, quand, s.creePar && s.creePar.nom ? 'par ' + s.creePar.nom : '', ilYa(s) == null ? '' : ilYa(s) === 0 ? "ouverte aujourd'hui" : `ouverte il y a ${nJ(ilYa(s))}`].filter(Boolean).join(' · '))}</div></div>
      <span class="pill ${b[0]}">${esc(b[1])}</span></button>`;
  }).join('');
  return Object.assign(T, {
    html: `<div class="stats">
        <div class="stat"><b>${tous.length}</b><span>${pl(tous.length, 'écurie')}</span></div>
        <div class="stat"><b>${n('essai')}</b><span>en essai</span></div>
        <div class="stat"><b>${n('abonnee', 'a_vie')}</b><span>${pl(n('abonnee', 'a_vie'), 'abonnée')}</span></div></div>
      <p class="note">${n('a_vie')} à vie · ${n('expiree')} ${pl(n('expiree'), 'expirée')} · ${actives7} ${pl(actives7, 'ouverte')} ces 7 derniers jours · environ ${num(parMois, 0)} € par mois d'abonnements en cours (paiements de démonstration compris).</p>
      ${blocMsgs}
      ${aDessiner}
      ${segCtl('admFiltre', [['toutes', 'Toutes'], ['essai', 'Essai'], ['abo', 'Abonnées'], ['expiree', 'Expirées'], ['calmes', 'Calmes']], f, 'scroll')}
      <div class="list">${rows || '<div class="row"><div class="row-s">Aucune écurie ici.</div></div>'}</div>
      <button type="button" class="link" data-act="adm-actualiser" style="align-self:flex-start">Actualiser</button>`
  });
};
ACT.admin = () => { ADM = null; const t = topView(); if (t && t.view === 'admin') { render(); return; } push('admin'); };
ACT['adm-actualiser'] = () => { ADM = null; render(); };
ACT['adm-ecurie'] = async d => {
  if (!window.EQ || !EQ.admin) return;
  if (!ADM || !ADM.liste.some(x => x.id === d.sid)) { ADM = null; await chargerAdmin(); }
  const s = ADM && ADM.liste.find(x => x.id === d.sid);
  if (!s) { toast('Écurie introuvable.', { danger: true }); return; }
  let eq = null;
  try { eq = await EQ.equipeDe(d.sid); } catch (e) { eq = null; }
  const st = aboEtat(s), r = aboResume(st) || { titre: '?', detail: '', ic: 'info', ton: '' }, a = s.abonnement || {};
  const g = eq && eq.find(m => m.role === 'gerante'), p = a.paiement;
  const ligne = (t, v) => `<div class="row"><div class="row-main"><div class="row-s">${t}</div><div class="row-t">${v}</div></div></div>`;
  const bt = (act, txt, x = '') => `<button type="button" class="btn small" data-act="adm-action" data-sid="${esc(s.id)}" data-a="${act}"${x}>${txt}</button>`;
  openSheet(s.nom || 'Écurie', `
    <div class="abo-etat ${r.ton}">${ic(r.ic)}<div class="row-main"><b>${esc(r.titre)}</b><span class="small">${esc(r.detail)}</span></div></div>
    <div class="list">
      ${ligne('Gérante', g ? `${esc(g.nom || '')} · ${esc(g.email || '')}` : '—')}
      ${ligne('Équipe', eq ? `${eq.length} ${pl(eq.length, 'personne')}` : 'inconnue')}
      ${ligne('Créée', `${s.creeLe ? esc(dJour(s.creeLe)) : '—'}${s.creePar && s.creePar.nom ? ' par ' + esc(s.creePar.nom) : ''}${s.commune ? ' · ' + esc(s.commune) : ''}`)}
      ${ligne('Dernier paiement', p ? `${num(p.montant || 0, 0)} € · ${p.fournisseur === 'fictif' ? 'démonstration' : p.fournisseur === 'manuel' ? 'enregistré à la main' : esc(p.fournisseur || '')} · ${p.le ? esc(dJour(p.le)) : ''}` : 'Aucun')}
    </div>
    ${carteAdm(s)}
    <button type="button" class="btn${s.carteDemande && s.carteDemande.statut === 'demandee' ? '' : ' primary'}" data-act="adm-ouvrir" data-sid="${esc(s.id)}">${ic('next', 'sm')}Ouvrir l'écurie</button>
    ${grp('Abonnement', `<div class="btnrow">
      ${bt('essai', "Prolonger l'essai d'un mois")}
      ${['maison', 'pro'].map(o => bt('payer', `Reçu · ${ABO.offres[o].nom} 1 mois (${prixAbo(o, 'mois')} €)`, ` data-f="mois" data-o="${o}"`) + bt('payer', `Reçu · ${ABO.offres[o].nom} 1 an (${prixAbo(o, 'an')} €)`, ` data-f="an" data-o="${o}"`)).join('')}
      ${st.code !== 'a_vie' ? bt('a_vie', 'Passer à vie', ' data-confirm="Confirmer : à vie"') : ''}
      ${st.code === 'abonnee' ? `<button type="button" class="btn small danger" data-act="adm-action" data-sid="${esc(s.id)}" data-a="arreter" data-confirm="Confirmer l'arrêt">Arrêter l'abonnement</button>` : ''}
    </div>`)}
    <p class="note">Tu n'apparais pas dans l'équipe de cette écurie, même en l'ouvrant.</p>`);
};
ACT['adm-action'] = async (d, el) => {
  if (el) el.disabled = true;
  try {
    await EQ.gererAbonnement(d.sid, d.a, d.f, d.o);
    ADM = null;
    await chargerAdmin();
    toast('Abonnement mis à jour');
    ACT['adm-ecurie']({ sid: d.sid });
  } catch (e) {
    if (el && el.isConnected) el.disabled = false;
    toast(eqMsg(e, "La modification n'a pas pu être enregistrée : vérifie ta connexion."), { danger: true });
  }
};
ACT['adm-ouvrir'] = d => { toast('Ouverture…'); EQ.ouvrirAdmin(d.sid); };
/* La carte des prés demandée : la demande, la note de la gérante, et de quoi la dessiner */
function carteAdm(s) {
  const d = s.carteDemande;
  if (!d) return '';
  if (d.statut !== 'demandee') return `<p class="small muted">Carte des prés demandée le ${esc(dJour(d.le))}, faite le ${esc(dJour(d.faiteLe || d.le))}${d.faitePar === 'equivaldi' ? ' par EquiValdi' : ' par la gérante'}.</p>`;
  return `<div class="abo-etat warn">${ic('image')}<div class="row-main"><b>Carte des prés à dessiner</b><span class="small">Demandée le ${esc(dJour(d.le))}${d.par && d.par.nom ? ' par ' + esc(d.par.nom) : ''}.</span>${d.note ? `<span class="small">« ${esc(d.note)} »</span>` : ''}</div>
    <button type="button" class="btn small primary" data-act="adm-carte" data-sid="${esc(s.id)}">${ic('edit', 'sm')}Dessiner la carte</button></div>`;
}
ACT['adm-carte'] = d => { toast('Ouverture du plan…'); EQ.ouvrirAdmin(d.sid, 'carte'); };
ACT['adm-quitter'] = () => { if (window.EQ) EQ.quitterAdmin(); };
/* Un message « Une idée, un souci ? » : le texte, d'où il vient, et la réponse (lue par la personne dans ses réglages) */
ACT['adm-msg'] = d => {
  const r = ADM && (ADM.retours || []).find(x => x.id === d.id);
  if (!r) return;
  const T = RETOUR_TYPES.find(x => x.v === r.type) || RETOUR_TYPES[0];
  const ligne = (t, v) => v ? `<div class="row"><div class="row-main"><div class="row-s">${t}</div><div class="row-t">${esc(v)}</div></div></div>` : '';
  const majListe = msg => { ADM = null; chargerAdmin().then(() => toast(msg)); };
  openSheet(T.l, `<div class="box"><p class="msg-texte">${esc(r.texte)}</p></div>
    <div class="list">${ligne('De', [r.nom, r.email].filter(Boolean).join(' · '))}${ligne('Écurie', [r.ecurie, ROLE_LABEL[r.role]].filter(Boolean).join(' · '))}${ligne('Envoyé le', jourHeure(r.le || 0))}${ligne('Téléphone', r.appareil)}${ligne('Version', r.version)}</div>
    ${r.reponse ? `<div class="box ok"><p class="small muted">Ta réponse · ${esc(jourHeure(r.reponse.le))} · ${r.vuLe ? 'lue' : 'pas encore lue'}</p><p class="msg-texte">${esc(r.reponse.texte)}</p></div>` : ''}
    ${fld(r.reponse ? 'Nouvelle réponse' : 'Réponse', area('f_arep', '', 'rows="5" maxlength="2000"'), 'Elle apparaît dans les réglages de la personne, avec une notification à sa prochaine ouverture.')}
    <button type="button" class="btn small" data-act="adm-msg-classer" data-id="${esc(r.id)}" data-s="${r.statut === 'traite' ? (r.reponse ? 'repondu' : 'nouveau') : 'traite'}" style="align-self:flex-start">${r.statut === 'traite' ? 'Rouvrir' : 'Marquer traité'}</button>`, {
    submit: 'Envoyer la réponse', local: true,
    onSubmit: () => {
      if (!val('f_arep')) return 'Écris la réponse.';
      return envoi(EQ.repondreRetour(r.id, val('f_arep')), () => { closeSheet(); majListe('Réponse envoyée'); }, "La réponse n'a pas pu partir : vérifie ta connexion.");
    }
  });
};
ACT['adm-msg-classer'] = (d, el) => {
  if (el) el.disabled = true;
  EQ.classerRetour(d.id, d.s).then(() => { closeSheet(); ADM = null; chargerAdmin(); toast(d.s === 'traite' ? 'Message classé' : 'Message rouvert'); },
    () => { if (el && el.isConnected) el.disabled = false; toast("Ça n'a pas marché : vérifie ta connexion.", { danger: true }); });
};
