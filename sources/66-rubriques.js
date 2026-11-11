
/* ---------- Rubriques de l'écurie : la gérante garde seulement ce qui sert ----------
   Prés, Foin, Concours et Entraînement se masquent pour toute l'écurie : onglets, actions rapides, alertes,
   agenda, fiches des chevaux, barème des crottins. Rien n'est effacé : une rubrique rallumée revient telle quelle.
   Le choix est rangé dans les réglages communs (config/reglages › rubriques). */
const RUBRIQUES = [
  { id: 'pres', label: 'Prés et rotation', court: 'Les prés', icon: 'fence', s: 'Onglet Prés, carte, déplacements, pâture et repos' },
  { id: 'foin', label: 'Foin', court: 'Le foin', icon: 'bale', s: 'Stock de balles, balles entamées, autonomie' },
  { id: 'concours', label: 'Concours', court: 'Les concours', icon: 'rosette', s: 'Sorties, engagements, résultats, vaccins exigés' },
  { id: 'seances', label: 'Entraînement', court: "L'entraînement", icon: 'timer', s: 'Séances de travail, cours et coachs' }
];
const rub = id => cfg().rubriques[id] !== false;
// un propriétaire en pension ne voit que ses chevaux et ses relevés (70-pension.js)
const ongletVisible = id => estProprio() ? ['accueil', 'chevaux', 'releves'].includes(id) : id !== 'releves' && (!['pres', 'foin', 'concours'].includes(id) || rub(id));
WRITE_ACTS.add('rub-onoff');

/* La gérante choisit (version installable) ; dans le carnet partagé sur claude.ai, la personne qui l'a créé */
const choisitRubriques = () => !sync.readOnly && (window.EQ_MODE ? estGerante() : me.owner !== false);
const rubLigne = (r, act) => `<button type="button" class="row sw-row" role="switch" aria-checked="${rub(r.id)}" data-act="${act}" data-id="${r.id}">
    ${lead(r.icon)}<div class="row-main"><div class="row-t">${r.label}</div><div class="row-s">${r.s}</div></div><span class="sw-t" aria-hidden="true"><i></i></span></button>`;

/* Réglages › Rubriques : chaque interrupteur s'enregistre tout de suite */
function rubriquesHtml() {
  if (!choisitRubriques()) return '';
  return section('Rubriques', `<div class="list">${RUBRIQUES.map(r => rubLigne(r, 'rub-onoff')).join('')}</div>
    <p class="note">Pour toute l'écurie. Une rubrique masquée quitte les onglets, l'accueil et les fiches ; rien n'est effacé, et elle revient telle quelle si tu la rallumes.</p>`);
}
function enregistrerRubriques(v) {
  putCfg(Object.assign({}, S.cfg || {}, { rubriques: Object.assign({}, cfg().rubriques, v) }));
}
ACT['rub-onoff'] = d => {
  const r = RUBRIQUES.find(x => x.id === d.id);
  if (!r || !choisitRubriques()) return;
  const on = !rub(r.id);
  enregistrerRubriques({ [r.id]: on });
  render();
  toast(on ? `${r.court} ${r.id === 'pres' || r.id === 'concours' ? 'reviennent' : 'revient'} dans l'appli` : `${r.court} ${r.id === 'pres' || r.id === 'concours' ? 'sont masqués' : 'est masqué'} pour toute l'écurie`);
};

/* Feuille « Rubriques de l'écurie » (démarrage guidé) : on règle, puis on enregistre */
ACT.rubriques = () => {
  if (!choisitRubriques()) return;
  openSheet("Rubriques de l'écurie", `<p class="note" style="color:var(--ink)">Garde ce qui sert à ton écurie. Le reste disparaît des onglets et de l'accueil, pour toute l'équipe.</p>
    <div class="list">${RUBRIQUES.map(r => rubLigne(r, 'rub-tog')).join('')}</div>
    <p class="note">Les chevaux, les soins, les tâches et l'équipe restent toujours là. Tu pourras changer d'avis dans Réglages › Rubriques.</p>`, {
    submit: 'Enregistrer',
    onSubmit: () => {
      const v = {};
      $$('#sheet [data-act="rub-tog"]').forEach(b => { v[b.dataset.id] = b.getAttribute('aria-checked') === 'true'; });
      enregistrerRubriques(v);
      const n = RUBRIQUES.filter(r => v[r.id] === false).length;
      toast(n ? `${n} ${pl(n, 'rubrique masquée', 'rubriques masquées')} pour toute l'écurie` : 'Toutes les rubriques sont gardées');
      render();
    }
  });
};
ACT['rub-tog'] = (d, el) => { el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true')); };
