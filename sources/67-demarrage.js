
/* ---------- Bien démarrer : les premiers pas d'une nouvelle écurie ----------
   Sur l'accueil d'une écurie de moins de 2 mois (pas la fondatrice) : rubriques, chevaux, prés, tâches,
   soins et équipe, cochés d'eux-mêmes à mesure que le carnet se remplit. Masquable ; l'état est gardé
   sur le téléphone, écurie par écurie. Dans le carnet partagé sur claude.ai : seulement quand il est vide. */
const DEM_JOURS = 60;
const demCle = () => { const e = ecurieOuverte(); return (e && (e.id || e.sid)) || 'carnet'; };
const demEtat = () => (ui.demarrage && ui.demarrage[demCle()]) || '';
function demMarque(v) { ui.demarrage = Object.assign({}, ui.demarrage, { [demCle()]: v }); saveUi(); }
/* L'invitation part par un lien ou une adresse : on s'en souvient ici (la liste des invitations est en ligne) */
function demInvite() { ui.demInvite = Object.assign({}, ui.demInvite, { [demCle()]: true }); saveUi(); }

function etapesDemarrage() {
  const L = [];
  if (choisitRubriques()) L.push({ id: 'rubriques', t: 'Choisis tes rubriques', s: 'Garde seulement ce qui sert à ton écurie', fait: !!(S.cfg && S.cfg.rubriques), act: 'data-act="rubriques"' });
  L.push({ id: 'cheval', t: 'Ajoute tes chevaux', s: 'Nom, âge, puis ration et soins', fait: chevaux(true).length > 0, act: 'data-act="new" data-what="cheval"' });
  if (rub('pres')) L.push({ id: 'pre', t: 'Ajoute tes prés', s: 'Le carnet compte les jours de pâture et de repos', fait: pres(true).length > 0, act: 'data-act="new" data-what="pre"' });
  L.push({ id: 'tache', t: 'Crée les tâches du quotidien', s: "Foin, eau, box : chacun coche, toute l'équipe voit", fait: list('taches').length > 0, act: 'data-act="new" data-what="tache"' });
  L.push({ id: 'soin', t: 'Note un soin ou un rendez-vous', s: 'Les rappels de vaccins et de vermifuge suivent', fait: list('soins').length > 0, act: 'data-act="new" data-what="soin"' });
  if (window.EQ_MODE && estGerante()) L.push({ id: 'equipe', t: 'Invite ton équipe', s: 'Un lien ou un code, valable 7 jours', fait: membres().length > 1 || !!(ui.demInvite && ui.demInvite[demCle()]), act: 'data-act="equipe"' });
  return L;
}
function demarrageVisible(vide) {
  if (sync.readOnly || sync.mode === 'loading') return false;
  const e = ecurieOuverte();
  if (window.EQ_MODE) {
    if (!e || e.fantome || e.demo) return false;
    if (e.abonnement && e.abonnement.statut === 'fondatrice') return false;
    if (e.creeLe && Date.now() - e.creeLe > DEM_JOURS * 86400000) return false;
  } else if (!vide) return false;
  return !demEtat();
}
function demarrageHtml(vide = false) {
  if (!demarrageVisible(vide)) return vide ? emptyH('Le carnet est encore vide', sync.readOnly ? 'Les chevaux, les prés et les tâches de l\'écurie apparaîtront ici.' : 'Ajoute ton premier cheval avec le bouton +.') : '';
  const L = etapesDemarrage(), n = L.filter(x => x.fait).length;
  if (n === L.length) return section('Bien démarrer', `<div class="dem-fin">${brandMark()}<div class="row-main"><b>Ton écurie est prête !</b><span class="small">Tout est en place. Le reste se remplit au fil des jours.</span></div>
    <button type="button" class="btn small primary" data-act="dem-fini">Fermer</button></div>`);
  const rows = L.map((x, i) => `<button type="button" class="row dem-et${x.fait ? ' fait' : ''}" ${x.act} data-key="dem-${x.id}">
      <span class="dem-n" aria-hidden="true">${x.fait ? ic('check', 'sm') : i + 1}</span>
      <div class="row-main"><div class="row-t">${x.t}</div><div class="row-s">${x.fait ? 'Fait' : x.s}</div></div>
      <span class="row-end">${ic('next', 'sm')}</span></button>`).join('');
  const exemple = window.EQ_MODE && window.eqExemple ? `<button type="button" class="link" data-act="exemple" style="align-self:flex-start">${ic('barn', 'sm')}Visiter une écurie d'exemple</button>` : '';
  return section(`Bien démarrer <span class="count">${n}/${L.length}</span>`,
    `<div class="gauge" role="progressbar" aria-label="Premiers pas" aria-valuemin="0" aria-valuemax="${L.length}" aria-valuenow="${n}"><i style="width:${Math.round(n / L.length * 100)}%"></i></div>
    <div class="list">${rows}</div>${exemple}`,
    `<button type="button" class="link" data-act="dem-masquer">Masquer</button>`);
}
ACT['dem-masquer'] = () => { demMarque('masque'); render(); toast('Masqué. Les mêmes gestes restent dans le bouton +.'); };
ACT['dem-fini'] = (d, el) => { confettis(el); demMarque('fini'); setTimeout(() => { render(); galop(); }, 350); };
ACT.exemple = () => {
  if (!window.eqExemple) return;
  if (outbox.length) toast('Tes modifications en attente restent rangées avec ton écurie.');
  window.eqExemple.entrer();
};
