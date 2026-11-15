
/* ---------- Cours et concours proposés par l'écurie, inscriptions, rôle « Cavalier » (formule Pro) ----------
   L'équipe propose des cours et des sorties en concours (activites) ; les membres de l'écurie s'y inscrivent
   (inscriptions : une par personne et par activité, rangée sous {activité}_{personne}). L'équipe voit qui vient,
   attribue les chevaux, pointe les présents, note ce que chacun a fait et rédige un compte rendu.
   Un « Cavalier » (élève sans cheval à lui) ne lit rien du carnet : seulement les activités et ses propres inscriptions.
   Les notifications sont dans l'appli (accueil, pastille de l'onglet) et, si la personne le veut, sur le téléphone
   tant que l'appli est ouverte : sans serveur, pas de notification quand elle est fermée (à faire avec Blaze).
   (Demandé par Célia le 15 novembre 2026.) */
const estCavalier = () => !!(window.EQ_MODE && window.EQ && EQ.role === 'cavalier' && !(ecurieOuverte() || {}).fantome);
const estInvite = () => estProprio() || estCavalier();
ROLE_LABEL.cavalier = 'Cavalier';
ROLE_ORD.cavalier = 4;
const KINDS = { cours: { l: 'Cours', un: 'le cours', icon: 'timer' }, concours: { l: 'Concours', un: 'le concours', icon: 'rosette' } };
const COURS_IDEES = ['Plat', 'Obstacle', 'Dressage', 'Cross', 'Longe', 'Balade', 'Pony-games', 'Voltige', 'Baby poney', 'Stage', 'Théorie'];
const PRESENCES = [{ v: 'present', l: 'Présent' }, { v: 'absent', l: 'Absent' }, { v: 'excuse', l: 'Excusé' }];
const peutGererActivites = () => !!window.EQ_MODE && !sync.readOnly && !estInvite() && offrePro();
const activitesOuvertes = () => !!window.EQ_MODE && (offrePro() || estInvite());
const kindVisible = k => estInvite() || rub(k === 'cours' ? 'seances' : 'concours');
const activites = kind => list('activites').filter(a => a && validISO(a.date) && KINDS[a.kind] && (!kind || a.kind === kind) && kindVisible(a.kind));
const actFin = a => (validISO(a.dateFin) && a.dateFin > a.date ? a.dateFin : a.date);
const actPassee = a => actFin(a) < todayISO();
const actTitre = a => a.titre || (a.kind === 'concours' ? a.lieu || 'Concours' : 'Cours');
const inscriptionsDe = aid => list('inscriptions').filter(i => i && i.aid === aid);
const inscrits = aid => inscriptionsDe(aid).filter(i => i.statut === 'inscrit');
const idInscription = (aid, uid) => `${aid}_${uid}`;
const monInscription = aid => get('inscriptions', idInscription(aid, moiUid())) || null;
const jeViens = aid => { const i = monInscription(aid); return !!i && i.statut !== 'annule'; };
/* Peut-on encore s'inscrire ? (ouvert, pas passé, clôture pas dépassée) */
function inscriptionOuverte(a) {
  const t = todayISO();
  if (a.statut === 'annule') return { ok: false, pourquoi: a.kind === 'cours' ? 'Ce cours est annulé.' : 'Cette sortie est annulée.' };
  if (a.date < t) return { ok: false, pourquoi: "C'est passé." };
  if (validISO(a.cloture) && a.cloture < t) return { ok: false, pourquoi: `Les inscriptions sont closes depuis le ${dShort(a.cloture)}.` };
  return { ok: true };
}
// places prises : le vrai compte pour l'équipe ; pour les autres, le compte tenu à jour par l'appli de l'équipe
const placesPrises = a => (estInvite() ? (Number.isFinite(a.pris) ? a.pris : null) : inscrits(a.id).length);
const complet = a => Number.isFinite(a.places) && a.places > 0 && placesPrises(a) != null && placesPrises(a) >= a.places;
const actQuand = a => [a.date === todayISO() ? "Aujourd'hui" : dDayHead(a.date), validISO(a.dateFin) && a.dateFin > a.date ? `au ${dShort(a.dateFin)}` : '', heureTxt(a.heure), a.duree ? durTxt(a.duree) : ''].filter(Boolean).join(' · ');

/* ----- Notifications dans l'appli ----- */
const maFiche = () => (me.uid && S.membres && S.membres[me.uid]) || null;
const notifPref = k => { const f = maFiche(); return !(f && f.notifs && f.notifs[k] === false); };
// l'équipe : inscriptions et désinscriptions pas encore vues (réglable)
function inscNonVues() {
  if (!peutGererActivites() || !notifPref('inscriptions')) return [];
  const t = todayISO();
  return list('inscriptions').filter(i => i && i.vuEcurie !== true && i.de && i.de.uid !== moiUid() && ['inscrit', 'attente', 'annule'].includes(i.statut))
    .map(i => ({ i, a: get('activites', i.aid) })).filter(x => x.a && KINDS[x.a.kind] && actFin(x.a) >= t && kindVisible(x.a.kind))
    .sort((x, y) => (y.i.le || 0) - (x.i.le || 0));
}
// tout le monde : cours et concours proposés depuis ma dernière visite de l'onglet (gardé sur ce téléphone)
const actVuKey = () => `equivaldi:act-vu:${idEcurie(ecurieOuverte()) || 'local'}:${moiUid()}`;
let actVuSession = null;
const actVu = () => { const v = Number(lsGet(actVuKey())); return Number.isFinite(v) ? v : 0; };
function actNouvelles(depuis = actVu()) {
  if (!activitesOuvertes() || !notifPref('activites') || estExemple()) return [];
  const t = todayISO();
  return activites().filter(a => a.statut !== 'annule' && a.date >= t && (a.le || 0) > depuis && !(a.par && a.par.uid === moiUid()) && !jeViens(a.id))
    .sort((a, b) => a.date.localeCompare(b.date));
}
function marquerActVues() {
  if (actVuSession == null) actVuSession = actVu();
  if (actNouvelles().length) { lsSet(actVuKey(), Date.now()); renderTabs(); }
}
const badgeActivites = () => inscNonVues().length + actNouvelles().length;
/* Sur le téléphone, tant que l'appli tourne : une vraie notification à l'arrivée d'une nouveauté */
const NOTIF_KEY = 'equivaldi:notif-tel:v1';
const notifTelOn = () => lsGet(NOTIF_KEY) === true && typeof Notification !== 'undefined' && Notification.permission === 'granted';
let notifConnues = null;
function notifierNouveautes() {
  if (sync.mode === 'loading') return;
  const cur = new Map();
  inscNonVues().forEach(({ i, a }) => cur.set('i:' + i.id + ':' + i.statut, { t: i.statut === 'annule' ? `${i.nom} s'est désinscrit·e` : `${i.nom} s'est inscrit·e`, s: `${actTitre(a)} · ${dShort(a.date)}` }));
  actNouvelles().forEach(a => cur.set('a:' + a.id, { t: `${a.kind === 'cours' ? 'Nouveau cours' : 'Nouveau concours'} : ${actTitre(a)}`, s: actQuand(a) }));
  if (notifConnues && notifTelOn()) {
    const neufs = [...cur.entries()].filter(([k]) => !notifConnues.has(k)).map(([, v]) => v);
    if (neufs.length && navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.showNotification(neufs.length > 1 ? `EquiValdi · ${neufs.length} nouveautés` : neufs[0].t,
      { body: neufs.length > 1 ? neufs.map(n => n.t).slice(0, 4).join('\n') : neufs[0].s, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'equivaldi-activites' })).catch(() => {});
  }
  notifConnues = new Set(cur.keys());
}

/* ----- L'équipe tient le compte des places prises (lu par les cavaliers, qui ne voient que leur inscription) ----- */
let prisT = null;
function majPrisBientot() { if (!peutGererActivites() || sync.mode !== 'cloud') return; clearTimeout(prisT); prisT = setTimeout(majPris, 1500); }
function majPris() {
  if (!peutGererActivites()) return;
  const t = todayISO();
  activites().filter(a => actFin(a) >= t).forEach(a => { const n = inscrits(a.id).length; if (a.pris !== n) put('activites', Object.assign({}, a, { pris: n })); });
}

/* ----- Cartes et listes ----- */
function actCard(a) {
  const mien = monInscription(a.id), n = placesPrises(a), neuf = actVuSession != null && (a.le || 0) > actVuSession && !(a.par && a.par.uid === moiUid());
  const meta = [heureTxt(a.heure), a.kind === 'cours' ? a.coach : a.discipline, a.lieu && a.titre ? a.lieu : '', validISO(a.dateFin) && a.dateFin > a.date ? `jusqu'au ${dShort(a.dateFin)}` : ''].filter(Boolean).join(' · ');
  const places = Number.isFinite(a.places) && a.places > 0 ? (n != null ? `${n} / ${a.places}` : `${a.places} ${pl(a.places, 'place')}`) : (n ? `${n} ${pl(n, 'inscrit')}` : '');
  const pills = [
    a.statut === 'annule' ? '<span class="pill danger">Annulé</span>' : '',
    mien && mien.statut === 'inscrit' ? `<span class="pill ok">${ic('check')}Inscrit·e</span>` : mien && mien.statut === 'attente' ? "<span class=\"pill warn\">Liste d'attente</span>" : '',
    a.statut !== 'annule' && complet(a) && !(mien && mien.statut === 'inscrit') ? '<span class="pill warn">Complet</span>' : '',
    neuf && a.statut !== 'annule' && !actPassee(a) ? '<span class="pill info">Nouveau</span>' : '',
    actPassee(a) && a.cr ? '<span class="pill">Compte rendu</span>' : '',
    validISO(a.cloture) && a.statut !== 'annule' && a.cloture >= todayISO() && diffDays(todayISO(), a.cloture) <= 7 && !(mien && mien.statut !== 'annule') ? `<span class="pill warn">Inscriptions jusqu'au ${dShort(a.cloture)}</span>` : ''
  ].join('');
  return `<button type="button" class="ccard" data-act="open-activite" data-id="${esc(a.id)}">
    <span class="dblock" aria-hidden="true"><span>${dWeek(a.date)}</span><b>${dDay(a.date)}</b><span>${dMon(a.date)}</span></span>
    <span class="row-main"><span class="row-t">${esc(actTitre(a))}</span>${meta ? `<span class="row-s">${esc(meta)}</span>` : ''}${pills ? `<span class="wrap" style="margin-top:4px">${pills}</span>` : ''}</span>
    ${places ? `<span class="row-end num">${esc(places)}</span>` : ''}</button>`;
}
/* La liste d'un genre (cours ou concours proposés) : à venir, puis les derniers passés */
function activitesListe(kind) {
  if (!activitesOuvertes()) return '';
  const t = todayISO(), all = activites(kind);
  const up = all.filter(a => actFin(a) >= t).sort((a, b) => a.date.localeCompare(b.date) || String(a.heure || '').localeCompare(String(b.heure || '')));
  const past = all.filter(a => actFin(a) < t).sort((a, b) => b.date.localeCompare(a.date)).slice(0, estInvite() ? 12 : 20)
    .filter(a => !estInvite() || monInscription(a.id));   // un cavalier ne garde que les siens
  const K = KINDS[kind], gere = peutGererActivites();
  const add = gere ? `<button type="button" class="link" data-act="new-activite" data-kind="${kind}">${ic('plus', 'sm')}${kind === 'cours' ? 'Proposer un cours' : 'Proposer'}</button>` : '';
  const vide = gere ? (kind === 'cours' ? "Propose un cours : date, heure, enseignant, nombre de places. Les cavaliers de l'écurie s'inscrivent depuis leur téléphone, et tu vois qui vient."
      : "Propose une sortie en concours : les propriétaires et les cavaliers s'inscrivent avec leur cheval et leur épreuve, avant la clôture.")
    : (kind === 'cours' ? "Les cours proposés par l'écurie s'afficheront ici : tu pourras t'y inscrire." : "Les sorties en concours proposées par l'écurie s'afficheront ici.");
  let html = section(kind === 'cours' ? 'Cours proposés' : 'Sorties proposées', up.length ? `<div class="list">${up.map(actCard).join('')}</div>` : `<p class="note">${vide}</p>`, add);
  if (past.length) html += section(estInvite() ? (kind === 'cours' ? 'Tes derniers cours' : 'Tes dernières sorties') : (kind === 'cours' ? 'Cours passés' : 'Sorties passées'), `<div class="list">${past.map(actCard).join('')}</div>`);
  return html;
}
/* Sans la formule Pro : ce que ça apporte (gérante), rien pour les autres */
const activitesVerrou = () => (window.EQ_MODE && !offrePro() && !estInvite() && estGerante() ? `<div class="verrou-ligne">${verrouHtml('cours')}</div>` : '');

/* ----- L'onglet « Entraînements » : Cours | Concours ----- */
function seancesPrevuesHtml() {
  if (estInvite() || !rub('seances')) return '';
  const t = todayISO(), lim = addDays(t, 14);
  const up = list('seances').filter(s => s.statut === 'prevu' && validISO(s.date) && s.date >= t && s.date <= lim && cheval(s.horseId))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.heure || '').localeCompare(String(b.heure || '')));
  const add = sync.readOnly ? '' : `<button type="button" class="link" data-act="new" data-what="seance">${ic('plus', 'sm')}Séance</button>`;
  return section('Séances des chevaux · 14 jours', up.length ? `<div class="list">${up.map(s => seanceRow(s, true)).join('')}</div>`
    : `<p class="note">Les séances de travail prévues pour chaque cheval (plat, obstacle, longe, cours avec un coach) s'affichent ici. L'historique est dans la fiche du cheval, onglet Entraînement.</p>`, add);
}
function vueEntrainements() {
  const C = kindVisible('cours'), K = kindVisible('concours');
  const seg = (ui.entSeg === 'concours' && K) || !C ? 'concours' : 'cours';
  const n = k => { const x = inscNonVues().filter(v => v.a.kind === k).length + actNouvelles().filter(a => a.kind === k).length; return x ? ` <span class="count">${x}</span>` : ''; };
  const tete = C && K ? segCtl('entSeg', [['cours', `Cours${n('cours')}`], ['concours', `Concours${n('concours')}`]], seg) : '';
  marquerActVues();
  if (seg === 'cours') {
    const html = tete + activitesListe('cours') + activitesVerrou() + seancesPrevuesHtml();
    return { title: 'Entraînements', eyebrow: estInvite() ? "Les cours de l'écurie" : 'Cours et séances', html,
      fab: peutGererActivites() ? () => formActivite(null, { kind: 'cours' }) : estInvite() || sync.readOnly ? null : () => formSeance(null, {}), fabLabel: peutGererActivites() ? 'Proposer un cours' : 'Nouvelle séance' };
  }
  if (estInvite()) return { title: 'Entraînements', eyebrow: 'Sorties en concours', html: tete + activitesListe('concours'), fab: null };
  // l'équipe : les sorties proposées, puis le carnet des concours comme avant
  const v = vueConcoursCarnet();
  const prop = activitesListe('concours') + (seg === 'concours' && !C ? activitesVerrou() : '');
  return Object.assign(v, { title: 'Entraînements', eyebrow: 'Concours', html: tete + prop + (prop ? section('Dans le carnet', v.html) : v.html) });
}

/* ----- Une activité : le détail ----- */
ACT['open-activite'] = d => push('activite', { id: d.id });
VIEWS.activite = p => {
  const a = get('activites', p.id);
  if (!a) return { title: 'Activité', html: empty('Introuvable', "Ce cours ou cette sortie a été supprimé par l'écurie.") };
  const K = KINDS[a.kind] || KINDS.cours, gere = peutGererActivites(), mien = monInscription(a.id), ouv = inscriptionOuverte(a), passe = actPassee(a);
  if (gere) marquerInscVues(a.id);
  const n = placesPrises(a);
  const items = [
    ['Quand', actQuand(a)], ['Où', a.lieu], [a.kind === 'cours' ? 'Enseignant' : 'Discipline', a.kind === 'cours' ? a.coach : a.discipline],
    [a.kind === 'concours' ? 'Épreuves prévues' : 'Niveau', a.kind === 'concours' ? a.epreuves : a.niveau],
    ['Places', Number.isFinite(a.places) && a.places > 0 ? (n != null ? `${n} prise${n > 1 ? 's' : ''} sur ${a.places}` : `${a.places}`) : ''],
    ['Prix', a.prix], [a.kind === 'concours' ? 'Clôture des engagements' : "Inscriptions jusqu'au", validISO(a.cloture) ? dFull(a.cloture) : '']
  ].filter(x => x[1]);
  let html = `${a.statut === 'annule' ? `<div class="banner ro">${ic('alert')}<div class="row-main"><b>${a.kind === 'cours' ? 'Cours annulé' : 'Sortie annulée'}</b>${a.annuleNote ? `<span class="small">${esc(a.annuleNote)}</span>` : ''}</div></div>` : ''}
    <div class="card"><dl class="dl">${items.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${a.note ? `<div class="act-note">${esc(a.note)}</div>` : ''}</div>`;
  // mon inscription
  if (!gere || mien) {
    const etat = mien && mien.statut === 'inscrit' ? `<div class="abo-etat ok">${ic('check')}<div class="row-main"><b>Tu es inscrit·e</b><span class="small">${esc([mien.monteNom ? `Tu montes ${mien.monteNom}` : mien.horseNom || '', mien.epreuve, mien.note].filter(Boolean).join(' · ') || "L'écurie est prévenue.")}</span></div></div>`
      : mien && mien.statut === 'attente' ? `<div class="abo-etat warn">${ic('clock')}<div class="row-main"><b>Tu es sur la liste d'attente</b><span class="small">L'écurie te confirme s'il y a une place.</span></div></div>` : '';
    const btn = passe ? '' : mien && mien.statut !== 'annule'
      ? `<div class="btnrow"><button type="button" class="btn small" data-act="insc-modifier" data-id="${esc(a.id)}">${ic('edit', 'sm')}Modifier</button><button type="button" class="btn small danger" data-act="insc-annuler" data-id="${esc(a.id)}" data-confirm="Confirmer">Me désinscrire</button></div>`
      : ouv.ok ? `<button type="button" class="btn primary" data-act="insc-moi" data-id="${esc(a.id)}">${ic('plus', 'sm')}${complet(a) ? "M'inscrire sur la liste d'attente" : "M'inscrire"}</button>`
      : `<p class="note">${esc(ouv.pourquoi)}</p>`;
    html += section(gere ? 'Ton inscription' : 'Inscription', etat + btn);
    // après : sa présence, ce qu'il a fait
    if (mien && (mien.presence || mien.bilan)) html += section('Pour toi', `<div class="card">${mien.presence ? `<div class="wrap"><span class="pill ${mien.presence === 'present' ? 'ok' : ''}">${esc((PRESENCES.find(x => x.v === mien.presence) || {}).l || '')}</span>${mien.monteNom ? `<span class="pill">${esc(mien.monteNom)}</span>` : ''}</div>` : ''}${mien.bilan ? `<div class="act-note">${esc(mien.bilan)}</div>` : ''}</div>`);
  }
  // l'équipe : qui vient
  if (gere || (!estInvite() && offrePro())) {
    const L = inscriptionsDe(a.id).sort((x, y) => ({ inscrit: 0, attente: 1, annule: 2 }[x.statut] ?? 3) - ({ inscrit: 0, attente: 1, annule: 2 }[y.statut] ?? 3) || String(x.nom || '').localeCompare(String(y.nom || ''), 'fr'));
    const act = L.filter(i => i.statut !== 'annule');
    const rows = L.map(i => {
      const h = i.monte ? cheval(i.monte) : i.horseId ? cheval(i.horseId) : null;
      const s = [h ? h.nom : i.monteNom || i.horseNom || (a.kind === 'cours' ? 'Cheval à attribuer' : ''), i.epreuve, i.note].filter(Boolean).join(' · ');
      const pill = i.statut === 'annule' ? '<span class="pill">Désinscrit·e</span>' : i.statut === 'attente' ? "<span class=\"pill warn\">Attente</span>"
        : i.presence ? `<span class="pill ${i.presence === 'present' ? 'ok' : i.presence === 'absent' ? 'danger' : ''}">${esc((PRESENCES.find(x => x.v === i.presence) || {}).l || '')}</span>` : '';
      return `<${gere ? 'button type="button"' : 'div'} class="row${i.statut === 'annule' ? ' muted' : ''}" ${gere ? `data-act="insc-fiche" data-id="${esc(i.id)}"` : ''}>${h ? av(h, 'm') : lead('user')}<div class="row-main"><div class="row-t">${esc(i.nom || 'Sans nom')}</div>${s ? `<div class="row-s">${esc(s)}</div>` : ''}</div>${pill}</${gere ? 'button' : 'div'}>`;
    }).join('');
    const titre = `${a.kind === 'cours' ? 'Qui vient' : 'Inscrits'}${act.length ? ` <span class="count">${act.filter(i => i.statut === 'inscrit').length}${Number.isFinite(a.places) && a.places > 0 ? ' / ' + a.places : ''}</span>` : ''}`;
    const add = gere ? `<button type="button" class="link" data-act="insc-ajouter" data-id="${esc(a.id)}">${ic('plus', 'sm')}Inscrire quelqu'un</button>` : '';
    html += section(titre, L.length ? `<div class="list">${rows}</div>` : `<p class="note">Personne pour l'instant. Les membres de l'écurie voient ${K.un} dans leur appli et s'inscrivent ; tu peux aussi inscrire quelqu'un toi-même.</p>`, add);
    if (gere && act.length && a.date <= todayISO() && a.statut !== 'annule' && act.some(i => i.statut === 'inscrit' && !i.presence))
      html += `<button type="button" class="btn small" data-act="act-tous-presents" data-id="${esc(a.id)}" style="align-self:flex-start">${ic('check', 'sm')}Tous présents</button>`;
    if (gere && a.kind === 'concours' && rub('concours') && act.some(i => i.statut === 'inscrit' && (i.horseId || i.monte) && !get('concours', idSortie(a.id, i.monte || i.horseId))))
      html += `<button type="button" class="btn small" data-act="act-sorties" data-id="${esc(a.id)}" style="align-self:flex-start">${ic('rosette', 'sm')}Ajouter ces sorties au carnet</button>`;
  }
  // le compte rendu, lu par les inscrits
  if (a.cr || (gere && a.date <= todayISO())) html += section('Compte rendu', a.cr ? `<div class="card"><div class="act-note">${esc(a.cr)}</div>${a.crPar && a.crPar.nom ? `<p class="small muted">${esc(a.crPar.nom)}${a.crLe ? ' · ' + esc(dShort(isoOf(new Date(a.crLe)))) : ''}</p>` : ''}</div>`
    : `<p class="note">Ce qui a été travaillé, ce qui est à revoir : les inscrits le lisent dans leur appli.</p>`, gere ? `<button type="button" class="link" data-act="act-cr" data-id="${esc(a.id)}">${ic('edit', 'sm')}${a.cr ? 'Modifier' : 'Écrire'}</button>` : '');
  if (gere) html += `<div class="btnrow"><button type="button" class="btn small" data-act="edit-activite" data-id="${esc(a.id)}">${ic('edit', 'sm')}Modifier</button><button type="button" class="btn small" data-act="act-copier" data-id="${esc(a.id)}">${ic('copy', 'sm')}Reproposer</button>${a.statut === 'annule' ? `<button type="button" class="btn small" data-act="act-rouvrir" data-id="${esc(a.id)}">Rouvrir</button>` : passe ? '' : `<button type="button" class="btn small danger" data-act="act-annuler" data-id="${esc(a.id)}">Annuler ${K.un}</button>`}</div>`;
  return { title: actTitre(a), eyebrow: `${K.l} · ${dShort(a.date)}`, html, fab: null };
};
function marquerInscVues(aid) {
  const l = inscriptionsDe(aid).filter(i => i.vuEcurie !== true && i.de && i.de.uid !== moiUid());
  if (!l.length) return;
  setTimeout(() => { l.forEach(i => { const c = get('inscriptions', i.id); if (c && c.vuEcurie !== true) put('inscriptions', Object.assign({}, c, { vuEcurie: true })); }); renderTabs(); }, 600);
}

/* ----- Proposer, modifier, annuler ----- */
function formActivite(id, pre = {}) {
  if (!peutGererActivites()) { if (!offrePro()) ACT.abonner({ raison: 'cours' }); else toast(roMsg(), { danger: true }); return; }
  const ex = id ? get('activites', id) : null;
  if (id && !ex) return;
  const kind = ex ? ex.kind : pre.kind === 'concours' ? 'concours' : 'cours', co = kind === 'cours';
  const a = ex ? clone(ex) : pre.copy ? Object.assign(clone(pre.copy), { id: undefined, date: '', cloture: null, statut: 'ouvert', cr: '', pris: 0 })
    : { kind, titre: '', date: '', heure: '', duree: co ? 60 : null, lieu: co ? lastUsed('activites', 'lieu') : '', coach: co ? lastUsed('activites', 'coach') : '', places: null, statut: 'ouvert' };
  const lieux = Array.from(new Set([...historyValues('activites', 'lieu'), ...(co ? LIEUX : [])]));
  const body = co ? `
    ${fld('Intitulé', inp('f_atitre', a.titre, 'maxlength="60" list="l_acours" autocomplete="off" required placeholder="ex. Obstacle · Galop 4-5"'))}
    <datalist id="l_acours">${Array.from(new Set([...historyValues('activites', 'titre'), ...COURS_IDEES])).map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="grid2">${fld('Date', inp('f_adate', a.date, 'type="date" required'))}${fld('Heure', inp('f_aheure', a.heure, 'type="time"'))}</div>
    <div class="grid2">${fld('Durée (min)', inp('f_aduree', a.duree, 'inputmode="numeric" autocomplete="off"'))}${fld('Places', inp('f_aplaces', a.places, 'inputmode="numeric" autocomplete="off" placeholder="sans limite"'))}</div>
    ${fld('Lieu', inp('f_alieu', a.lieu, 'maxlength="60" list="l_alieu" autocomplete="off"'))}<datalist id="l_alieu">${lieux.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="grid2">${fld('Enseignant', inp('f_acoach', a.coach, 'maxlength="60" autocomplete="off"'))}${fld('Niveau', inp('f_aniv', a.niveau, 'maxlength="40" autocomplete="off" placeholder="ex. Galop 4-5"'))}</div>
    <div class="grid2">${fld('Prix', inp('f_aprix', a.prix, 'maxlength="40" autocomplete="off" placeholder="ex. 25 € ou carte"'), 'Pour information.')}${fld("Inscriptions jusqu'au", inp('f_aclot', a.cloture, 'type="date"'), 'Vide : jusqu\'au jour même.')}</div>
    ${fld('À savoir', area('f_anote', a.note, 'rows="2" maxlength="500" placeholder="Matériel à prévoir, thème de la séance…"'))}
    ${ex ? '' : grp('Répéter', chips('rep', [{ v: '1', l: 'Une fois' }, { v: '4', l: '4 semaines' }, { v: '8', l: '8 semaines' }, { v: '12', l: '12 semaines' }], '1'), 'Le même cours chaque semaine, le même jour à la même heure.')}`
    : `
    ${fld('Concours (lieu ou nom)', inp('f_atitre', a.titre, 'maxlength="60" autocomplete="off" required placeholder="ex. Poitiers · CSO Club et Amateur"'))}
    <div class="grid2">${fld('Date', inp('f_adate', a.date, 'type="date" required'))}${fld('Dernier jour', inp('f_afin', a.dateFin, 'type="date"'), 'Si plusieurs jours.')}</div>
    ${grp('Discipline', chips('adisc', DISCIPLINES.map(x => ({ v: x, l: x })), a.discipline ? [a.discipline] : []))}
    ${fld('Épreuves prévues', inp('f_aepr', a.epreuves, 'maxlength="120" autocomplete="off" placeholder="ex. Club 2, Club 1, Amateur 3"'))}
    <div class="grid2">${fld('Clôture des engagements', inp('f_aclot', a.cloture, 'type="date"'), 'Après, plus d\'inscription.')}${fld('Places', inp('f_aplaces', a.places, 'inputmode="numeric" autocomplete="off" placeholder="sans limite"'), 'Dans le camion, par exemple.')}</div>
    ${fld('Frais', inp('f_aprix', a.prix, 'maxlength="40" autocomplete="off" placeholder="ex. transport 30 € + engagement"'), 'Pour information.')}
    ${fld('À savoir', area('f_anote', a.note, 'rows="2" maxlength="500" placeholder="Heure de départ, qui emmène, coaching sur place…"'))}`;
  openSheet(ex ? actTitre(ex) : co ? 'Proposer un cours' : 'Proposer une sortie en concours', body, {
    submit: ex ? 'Enregistrer' : 'Proposer',
    onSubmit: f => {
      const d = val('f_adate'), titre = val('f_atitre');
      if (!titre) return co ? 'Donne un intitulé au cours.' : 'Indique le concours.';
      if (!validISO(d)) return "La date n'est pas valable.";
      if (!ex && d < todayISO()) return "La date est déjà passée.";
      const places = val('f_aplaces') === '' ? null : Math.round(Number(val('f_aplaces')));
      if (places != null && (!Number.isFinite(places) || places < 1 || places > 500)) return 'Le nombre de places va de 1 à 500 (ou vide : sans limite).';
      const clot = val('f_aclot') || null;
      if (clot && (!validISO(clot) || clot > d)) return co ? "La fin des inscriptions doit être avant le cours." : 'La clôture doit être avant le concours.';
      Object.assign(a, { kind, titre, date: d, places, cloture: clot, prix: val('f_aprix'), note: val('f_anote') });
      if (co) {
        const du = val('f_aduree') === '' ? null : Math.round(Number(val('f_aduree')));
        if (du != null && (!Number.isFinite(du) || du < 5 || du > 600)) return 'La durée va de 5 à 600 minutes.';
        Object.assign(a, { heure: /^\d{2}:\d{2}$/.test(val('f_aheure')) ? val('f_aheure') : '', duree: du, lieu: val('f_alieu'), coach: val('f_acoach'), niveau: val('f_aniv') });
      } else {
        const fin = val('f_afin') || null;
        if (fin && (!validISO(fin) || fin < d)) return 'Le dernier jour doit être après le premier.';
        Object.assign(a, { dateFin: fin && fin > d ? fin : null, discipline: chipVal(f, 'adisc') || '', epreuves: val('f_aepr') });
      }
      if (ex) { put('activites', a); toast(co ? 'Cours modifié' : 'Sortie modifiée'); return; }
      const n = co ? Number(chipVal(f, 'rep') || 1) : 1, serie = n > 1 ? 's' + uid() : null, now = Date.now();
      let premier = null;
      for (let k = 0; k < n; k++) {
        const o = put('activites', Object.assign({}, a, { id: undefined, date: addDays(d, 7 * k), cloture: clot ? addDays(clot, 7 * k) : null, serie, statut: 'ouvert', pris: 0, le: now, par: moiRef() }));
        if (!premier) premier = o;
      }
      toast(n > 1 ? `${n} cours proposés, chaque ${fmt(d, { weekday: 'long' })}` : co ? "Cours proposé : l'écurie le voit dans l'appli" : "Sortie proposée : l'écurie la voit dans l'appli");
      if (n === 1 && premier) setTimeout(() => push('activite', { id: premier.id }), 320);
    },
    onDelete: ex ? () => {
      const prevI = inscriptionsDe(ex.id).map(clone), prev = clone(ex);
      prevI.forEach(i => del('inscriptions', i.id));
      del('activites', ex.id);
      const t = topView(); if (t && t.view === 'activite' && t.id === ex.id) back();
      toast(co ? 'Cours supprimé' : 'Sortie supprimée', { undo: () => { put('activites', prev); prevI.forEach(i => put('inscriptions', i)); } });
    } : null, delLabel: 'Supprimer', delConfirm: 'Supprimer avec les inscriptions'
  });
}
ACT['new-activite'] = d => formActivite(null, { kind: d.kind });
ACT['edit-activite'] = d => formActivite(d.id);
ACT['act-copier'] = d => { const a = get('activites', d.id); if (a) formActivite(null, { kind: a.kind, copy: a }); };
ACT['act-annuler'] = d => {
  const a = get('activites', d.id);
  if (!a || !peutGererActivites()) return;
  const n = inscrits(a.id).length;
  openSheet(a.kind === 'cours' ? 'Annuler le cours' : 'Annuler la sortie', `<p class="note" style="color:var(--ink)">${n ? `${n} ${pl(n, 'inscrit')} ${n > 1 ? 'le verront' : 'le verra'} en ouvrant l'appli.` : "Personne n'est inscrit."} Rien n'est effacé : tu peux rouvrir ensuite.</p>
    ${fld('Pourquoi (facultatif)', inp('f_apq', '', 'maxlength="120" autocomplete="off" placeholder="ex. Carrière impraticable, enseignant absent"'))}`, {
    submit: 'Annuler ' + KINDS[a.kind].un, onSubmit: () => { put('activites', Object.assign({}, get('activites', a.id), { statut: 'annule', annuleNote: val('f_apq'), annuleLe: Date.now() })); toast('Annulé : les inscrits le voient dans leur appli'); }
  });
};
ACT['act-rouvrir'] = d => { const a = get('activites', d.id); if (a && peutGererActivites()) { put('activites', Object.assign({}, a, { statut: 'ouvert', annuleNote: '' })); toast('Rouvert'); } };
ACT['act-cr'] = d => {
  const a = get('activites', d.id);
  if (!a || !peutGererActivites()) return;
  openSheet(`Compte rendu · ${actTitre(a)}`, `${fld('Pour tous les inscrits', area('f_acr', a.cr, 'rows="7" maxlength="2000" placeholder="Ce qui a été travaillé, ce qui a bien marché, ce qui est à revoir, à prévoir pour la prochaine fois…"'), 'Ce que chacun a fait de son côté se note dans sa ligne (touche son nom).')}`, {
    onSubmit: () => { const cur = get('activites', a.id); put('activites', Object.assign({}, cur, { cr: val('f_acr'), crLe: Date.now(), crPar: moiRef() })); toast(val('f_acr') ? 'Compte rendu enregistré' : 'Compte rendu effacé'); }
  });
};
ACT['act-tous-presents'] = d => {
  if (!peutGererActivites()) return;
  const l = inscrits(d.id).filter(i => !i.presence);
  l.forEach(i => enregistrerInscription(Object.assign({}, i, { presence: 'present' })));
  toast(`${l.length} ${pl(l.length, 'présent')} ${l.length > 1 ? 'notés' : 'noté'}`);
};
/* Concours : une sortie dans le carnet par cheval inscrit (à engager), sans doublon */
const idSortie = (aid, hid) => `act_${aid}_${hid}`;
ACT['act-sorties'] = d => {
  const a = get('activites', d.id);
  if (!a || !peutGererActivites()) return;
  let n = 0;
  inscrits(a.id).forEach(i => {
    const hid = i.monte || i.horseId;
    if (!hid || !cheval(hid) || get('concours', idSortie(a.id, hid))) return;
    put('concours', { id: idSortie(a.id, hid), horseId: hid, date: a.date, dateFin: a.dateFin || null, lieu: a.lieu || a.titre, discipline: a.discipline || null, epreuve: i.epreuve || '', cavalier: i.nom || '', cavalierUid: i.uid || null, statut: 'a_engager', cloture: a.cloture || null, activite: a.id });
    n++;
  });
  toast(n ? `${n} ${pl(n, 'sortie')} ${n > 1 ? 'ajoutées' : 'ajoutée'} au carnet, à engager` : 'Rien à ajouter');
};

/* ----- S'inscrire (chaque membre pour lui-même) ----- */
function formMonInscription(aid) {
  const a = get('activites', aid);
  if (!a) return;
  const ex = monInscription(aid), ouv = inscriptionOuverte(a);
  if (!ouv.ok && !(ex && ex.statut !== 'annule')) { toast(ouv.pourquoi, { danger: true }); return; }
  const hs = estCavalier() ? [] : chevaux().filter(h => estProprio() || !h.propUid || h.propUid === moiUid() || true);
  const attente = complet(a) && !(ex && ex.statut === 'inscrit');
  const body = `
    <p class="note" style="color:var(--ink)">${esc(actTitre(a))} · ${esc(actQuand(a))}</p>
    ${attente ? `<div class="box warn"><div class="issue warn">${ic('alert', 'sm')}<span>C'est complet : tu seras sur la liste d'attente, et l'écurie te confirme s'il y a une place.</span></div></div>` : ''}
    ${hs.length ? grp(a.kind === 'cours' ? 'Avec quel cheval ?' : 'Quel cheval ?', chips('ih', horseOpts(hs), ex && ex.horseId ? [ex.horseId] : hs.length === 1 && estProprio() ? [hs[0].id] : []), a.kind === 'cours' ? "Facultatif : sinon l'écurie attribue un cheval." : '')
      : a.kind === 'cours' ? `<p class="note">L'écurie t'attribue un cheval : tu le verras ici.</p>` : ''}
    ${a.kind === 'concours' ? fld('Épreuve souhaitée', inp('f_iepr', ex ? ex.epreuve : '', `maxlength="80" autocomplete="off" placeholder="${esc(a.epreuves || 'ex. Club 2')}"`)) : ''}
    ${fld("Un mot pour l'écurie", inp('f_inote', ex ? ex.note : '', 'maxlength="200" autocomplete="off" placeholder="ex. J\'arrive 10 minutes avant"'), 'Facultatif.')}`;
  openSheet(ex && ex.statut !== 'annule' ? 'Mon inscription' : "M'inscrire", body, {
    submit: ex && ex.statut !== 'annule' ? 'Enregistrer' : attente ? "M'inscrire sur la liste d'attente" : "M'inscrire", local: true,
    onSubmit: f => {
      if (a.kind === 'concours' && hs.length && !chipVal(f, 'ih') && !estCavalier()) return 'Choisis le cheval que tu engages.';
      const hid = hs.length ? chipVal(f, 'ih') : null, h = hid ? cheval(hid) : null;
      const base = ex ? clone(ex) : { id: idInscription(aid, moiUid()), aid, uid: moiUid(), nom: moiNom() || '', de: { uid: moiUid(), nom: moiNom() || '', role: (window.EQ && EQ.role) || '' } };
      const nouv = !ex || ex.statut === 'annule';
      const o = Object.assign(base, { horseId: h ? h.id : null, horseNom: h ? h.nom : '', epreuve: a.kind === 'concours' ? val('f_iepr') : '', note: val('f_inote'),
        statut: nouv ? (attente ? 'attente' : 'inscrit') : ex.statut, le: nouv ? Date.now() : ex.le, vuEcurie: false });
      put('inscriptions', o);
      toast(nouv ? (attente ? "Tu es sur la liste d'attente" : `Tu es inscrit·e : ${actTitre(a)}`) : 'Inscription modifiée', nouv && !attente ? { fete: true } : undefined);
    }
  });
}
ACT['insc-moi'] = d => formMonInscription(d.id);
ACT['insc-modifier'] = d => formMonInscription(d.id);
ACT['insc-annuler'] = d => {
  const i = monInscription(d.id);
  if (!i) return;
  const prev = clone(i);
  put('inscriptions', Object.assign({}, i, { statut: 'annule', vuEcurie: false, le: Date.now() }));
  toast("Tu es désinscrit·e : l'écurie est prévenue", { undo: () => put('inscriptions', prev) });
};

/* ----- L'équipe : inscrire quelqu'un, attribuer un cheval, pointer, noter ----- */
function enregistrerInscription(o) {
  const a = get('activites', o.aid), hid = o.monte || o.horseId || null, h = hid ? cheval(hid) : null;
  o.monteNom = o.monte && h ? h.nom : '';
  put('inscriptions', o);
  // « qui a fait quoi » : un cours suivi avec un cheval devient une séance dans la fiche du cheval
  if (a && a.kind === 'cours' && rub('seances')) {
    const sid = h ? idSortie(a.id, h.id) : null;
    list('seances').filter(s => s.activite === a.id && s.inscription === o.id && (!sid || s.id !== sid || o.presence !== 'present' || o.statut !== 'inscrit')).forEach(s => del('seances', s.id));
    if (h && o.presence === 'present' && o.statut === 'inscrit' && !get('seances', sid))
      put('seances', { id: sid, horseId: h.id, date: a.date, heure: a.heure || '', duree: a.duree || null, type: a.titre || 'Cours', coach: a.coach || '', lieu: a.lieu || '', cavalier: o.nom || '', cavalierUid: o.uid || null, statut: 'fait', notes: o.bilan || '', activite: a.id, inscription: o.id });
    else if (h && o.presence === 'present' && o.statut === 'inscrit') { const s = get('seances', sid); if (s && (s.notes || '') !== (o.bilan || '') && s.inscription === o.id) put('seances', Object.assign({}, s, { notes: o.bilan || '' })); }
  }
  majPrisBientot();
}
ACT['insc-fiche'] = d => {
  const i = get('inscriptions', d.id), a = i && get('activites', i.aid);
  if (!i || !a || !peutGererActivites()) return;
  const jour = a.date <= todayISO(), hs = chevaux();
  const suivi = list('inscriptions').filter(x => x.id !== i.id && ((i.uid && x.uid === i.uid) || (!i.uid && x.nom === i.nom)) && x.statut === 'inscrit').map(x => ({ x, a: get('activites', x.aid) }))
    .filter(v => v.a && actPassee(v.a)).sort((u, v) => v.a.date.localeCompare(u.a.date)).slice(0, 8);
  openSheet(`${i.nom || 'Inscription'} · ${actTitre(a)}`, `
    ${i.note ? `<div class="box"><p class="small muted">Son mot</p><p class="msg-texte">${esc(i.note)}</p></div>` : ''}
    ${grp('Inscription', chips('istat', [{ v: 'inscrit', l: 'Inscrit·e' }, { v: 'attente', l: "Liste d'attente" }, { v: 'annule', l: 'Désinscrit·e' }], i.statut))}
    ${hs.length ? grp(a.kind === 'cours' ? 'Cheval monté' : 'Cheval', chips('imonte', horseOpts(hs), i.monte ? [i.monte] : i.horseId ? [i.horseId] : []), i.horseNom && !i.monte ? `Demandé : ${esc(i.horseNom)}.` : '') : ''}
    ${a.kind === 'concours' ? fld('Épreuve', inp('f_iepr', i.epreuve, 'maxlength="80" autocomplete="off"')) : ''}
    ${jour ? grp('Présence', chips('ipres', PRESENCES, i.presence || [])) : ''}
    ${jour ? fld(a.kind === 'cours' ? "Ce qu'il ou elle a fait" : 'Résultat, remarques', area('f_ibilan', i.bilan, 'rows="3" maxlength="600" placeholder="ex. Galop à droite à revoir, bon parcours à 70 cm"'), `Lu par ${esc(i.nom || 'la personne')} dans son appli.`) : ''}
    ${suivi.length ? `<details class="mat-hist"><summary>Ses ${suivi.length} dernières participations</summary><ul>${suivi.map(v => `<li><b>${esc(actTitre(v.a))}</b> · ${esc(dShort(v.a.date))}${v.x.monteNom || v.x.horseNom ? ' · ' + esc(v.x.monteNom || v.x.horseNom) : ''}${v.x.presence ? ' · ' + esc((PRESENCES.find(p => p.v === v.x.presence) || {}).l || '') : ''}${v.x.bilan ? ' · ' + esc(v.x.bilan) : ''}</li>`).join('')}</ul></details>` : ''}`, {
    onSubmit: f => {
      const cur = get('inscriptions', i.id);
      if (!cur) return;
      const m = hs.length ? chipVal(f, 'imonte') : cur.monte || null;
      enregistrerInscription(Object.assign({}, cur, { statut: chipVal(f, 'istat') || cur.statut, monte: m || null, epreuve: a.kind === 'concours' ? val('f_iepr') : cur.epreuve || '',
        presence: jour ? (chipVal(f, 'ipres') || null) : cur.presence || null, bilan: jour ? val('f_ibilan') : cur.bilan || '', vuEcurie: true }));
      toast('Enregistré');
    },
    onDelete: () => { const prev = clone(i); list('seances').filter(s => s.inscription === i.id).forEach(s => del('seances', s.id)); del('inscriptions', i.id); majPrisBientot(); toast('Inscription supprimée', { undo: () => put('inscriptions', prev) }); }
  });
};
ACT['insc-ajouter'] = d => {
  const a = get('activites', d.id);
  if (!a || !peutGererActivites()) return;
  const deja = new Set(inscriptionsDe(a.id).filter(i => i.statut !== 'annule').map(i => i.uid).filter(Boolean));
  const qui = membres().filter(m => !deja.has(m.id)).map(m => ({ v: m.id, l: `${mNom(m)}${m.role === 'cavalier' || m.role === 'proprio' ? '' : ' · équipe'}` }));
  const hs = chevaux();
  openSheet(`Inscrire · ${actTitre(a)}`, `
    ${qui.length ? grp("Quelqu'un de l'écurie", chips('iqui', qui, [])) : ''}
    ${fld(qui.length ? "Ou quelqu'un sans compte" : 'Nom', inp('f_inom', '', 'maxlength="60" autocomplete="off" placeholder="ex. Emma (fille de Claire)"'))}
    ${hs.length ? grp(a.kind === 'cours' ? 'Cheval monté' : 'Cheval', chips('imonte', horseOpts(hs), []), a.kind === 'cours' ? 'Facultatif : tu peux l\'attribuer plus tard.' : '') : ''}
    ${a.kind === 'concours' ? fld('Épreuve', inp('f_iepr', '', 'maxlength="80" autocomplete="off"')) : ''}`, {
    submit: 'Inscrire',
    onSubmit: f => {
      const u = chipVal(f, 'iqui'), m = u ? membres().find(x => x.id === u) : null, nom = m ? mNom(m) : val('f_inom');
      if (!nom) return 'Choisis une personne, ou écris son nom.';
      const id = m ? idInscription(a.id, m.id) : idInscription(a.id, 'n' + uid());
      const ex = get('inscriptions', id);
      enregistrerInscription(Object.assign(ex ? clone(ex) : { id, aid: a.id, uid: m ? m.id : null, nom, de: Object.assign(moiRef(), { role: (window.EQ && EQ.role) || '' }) },
        { nom, statut: 'inscrit', monte: (hs.length && chipVal(f, 'imonte')) || null, epreuve: a.kind === 'concours' ? val('f_iepr') : '', le: Date.now(), vuEcurie: true }));
      toast(`${nom} : inscrit·e`);
    }
  });
};

/* ----- Accueil : nouveautés et mes inscriptions ----- */
function activitesAccueil() {
  if (!activitesOuvertes()) return '';
  const t = todayISO(), out = [];
  const nv = inscNonVues();
  if (nv.length) out.push(section(`Inscriptions <span class="count">${nv.length}</span>`, `<div class="list">${nv.slice(0, 6).map(({ i, a }) =>
    `<button type="button" class="row" data-act="open-activite" data-id="${esc(a.id)}">${lead(i.statut === 'annule' ? 'undo' : 'user')}<div class="row-main"><div class="row-t">${esc(i.nom || "Quelqu'un")} ${i.statut === 'annule' ? "s'est désinscrit·e" : i.statut === 'attente' ? "est en liste d'attente" : "s'est inscrit·e"}</div><div class="row-s">${esc(actTitre(a))} · ${esc(dShort(a.date))}${i.horseNom ? ' · ' + esc(i.horseNom) : ''}</div></div><span class="row-end">${ic('next', 'sm')}</span></button>`).join('')}</div>`,
    `<button type="button" class="link" data-act="go" data-tab="concours">Tout voir ${ic('next', 'sm')}</button>`));
  const neufs = actNouvelles();
  if (neufs.length) out.push(section(`Nouveau à l'écurie <span class="count">${neufs.length}</span>`, `<div class="list">${neufs.slice(0, 4).map(actCard).join('')}</div>`));
  const miens = activites().filter(a => actFin(a) >= t && jeViens(a.id) && !neufs.includes(a)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  if (miens.length || estCavalier()) out.push(section('Tes inscriptions', miens.length ? `<div class="list">${miens.map(actCard).join('')}</div>`
    : `<p class="note">Tu n'es inscrit·e à rien pour l'instant. Les cours et les sorties proposés par l'écurie sont dans l'onglet Entraînements.</p>`,
    `<button type="button" class="link" data-act="go" data-tab="concours">Tout voir ${ic('next', 'sm')}</button>`));
  return out.join('');
}
/* Les 30 prochains jours : ce que l'écurie propose (équipe), ce à quoi je suis inscrit (les autres) */
function agendaActivites(items, t, lim) {
  if (!activitesOuvertes()) return;
  activites().filter(a => a.statut !== 'annule' && a.date >= t && a.date <= lim && (estInvite() ? jeViens(a.id) : true)).forEach(a => {
    const n = inscrits(a.id).length;
    items.push({ d: a.date, h: a.heure || '', icon: KINDS[a.kind].icon, t: actTitre(a), s: [heureTxt(a.heure), a.kind === 'cours' ? a.coach : a.discipline, a.lieu && a.titre ? a.lieu : '', estInvite() ? 'Tu es inscrit·e' : `${n} ${pl(n, 'inscrit')}`].filter(Boolean).join(' · '), act: `data-act="open-activite" data-id="${esc(a.id)}"` });
  });
}
/* L'accueil d'un cavalier : ses inscriptions, les nouveautés, rien du carnet */
function accueilCavalier() {
  const html = [], e = ecurieOuverte() || {};
  const cg = bandeauConditions();
  if (cg) html.push(cg);
  html.push(`<div class="card proprio-bonjour"><div class="row-main"><b>Bonjour ${esc(moiNom() || '')}</b><span class="small muted">Les cours et les sorties de ${esc(e.nom || "l'écurie")} : inscris-toi d'ici, l'écurie est prévenue.</span></div></div>`);
  if (sync.mode === 'loading') { html.push(`<div class="loading">${brandLogo()}<p class="note">Ouverture…</p></div>`); return { title: "Aujourd'hui", html: html.join('') }; }
  html.push(activitesAccueil());
  const t = todayISO(), dispo = activites().filter(a => a.statut !== 'annule' && a.date >= t && !jeViens(a.id) && !actNouvelles().includes(a) && inscriptionOuverte(a).ok).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  if (dispo.length) html.push(section('À venir', `<div class="list">${dispo.map(actCard).join('')}</div>`));
  return { title: "Aujourd'hui", html: html.join('') };
}

/* ----- Réglages › Notifications (chacun pour soi, gardé dans sa fiche de membre) ----- */
function notifsHtml() {
  if (!window.EQ_MODE || !activitesOuvertes() || !maFiche()) return '';
  const ligne = (k, t, s) => `<button type="button" class="row sw-row" role="switch" aria-checked="${notifPref(k)}" data-act="notif-onoff" data-k="${k}">${lead('cloche')}<div class="row-main"><div class="row-t">${t}</div><div class="row-s">${s}</div></div><span class="sw-t" aria-hidden="true"><i></i></span></button>`;
  const tel = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
  return section('Notifications', `<div class="list">
    ${peutGererActivites() ? ligne('inscriptions', 'Inscriptions', "Quand quelqu'un s'inscrit ou se désinscrit d'un cours ou d'un concours") : ''}
    ${ligne('activites', 'Nouveaux cours et concours', "Quand l'écurie en propose un")}
    ${tel ? `<button type="button" class="row sw-row" role="switch" aria-checked="${notifTelOn()}" data-act="notif-tel">${lead('phone')}<div class="row-main"><div class="row-t">Aussi sur ce téléphone</div><div class="row-s">Une notification tant que l'appli est ouverte, même en arrière-plan</div></div><span class="sw-t" aria-hidden="true"><i></i></span></button>` : ''}
  </div><p class="note">Les nouveautés s'affichent sur l'accueil et sur l'onglet Entraînements. Appli fermée, le téléphone ne prévient pas encore : ça viendra avec les notifications par serveur.</p>`);
}
ACT['notif-onoff'] = d => {
  const f = maFiche();
  if (!f || !['inscriptions', 'activites'].includes(d.k)) return;
  const on = !notifPref(d.k);
  put('membres', Object.assign({}, f, { notifs: Object.assign({}, f.notifs || {}, { [d.k]: on }) }));
  render(); renderTabs();
  toast(on ? 'Notifications activées' : 'Notifications coupées');
};
ACT['notif-tel'] = async () => {
  if (notifTelOn()) { lsSet(NOTIF_KEY, false); render(); toast('Notifications du téléphone coupées'); return; }
  let p = 'denied';
  try { p = await Notification.requestPermission(); } catch (e) { p = 'denied'; }
  if (p !== 'granted') { toast("Le téléphone a refusé les notifications : autorise-les pour EquiValdi dans ses réglages.", { danger: true }); return; }
  lsSet(NOTIF_KEY, true); render(); toast('Notifications du téléphone activées');
};
/* Après chaque rendu (regroupé) : notification du téléphone s'il y a du nouveau, compte des places prises */
let actHookT = null;
function activitesApresRendu() { if (!window.EQ_MODE) return; clearTimeout(actHookT); actHookT = setTimeout(() => { try { notifierNouveautes(); majPrisBientot(); } catch (e) { console.error(e); } }, 900); }
NEW.activite = d => formActivite(null, { kind: d.kind });
