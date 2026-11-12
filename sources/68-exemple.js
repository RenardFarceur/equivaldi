
/* ---------- Écurie d'exemple (version installable) ----------
   Visitable sans compte depuis l'écran de connexion, depuis « Bien démarrer » ou par un lien « ?exemple ».
   Le carnet est fabriqué ici, daté d'aujourd'hui, à chaque nouvelle visite : cinq chevaux, la carte des prés
   d'origine, une rotation en cours, des soins à prévoir, un concours à engager, des tâches cochées par l'équipe
   et ses crottins. Tout se modifie, mais rien ne part en ligne : la copie locale « exemple » est jetée en sortant. */
const estExemple = () => { const e = ecurieOuverte(); return !!(e && e.demo); };

function donneesExemple() {
  const T = todayISO(), d = n => addDays(T, n);
  const ts = (iso, h = 9, m = 0) => new Date(`${iso}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();
  const jourSem = iso => new Date(iso + 'T12:00:00').getDay();
  const M = { camille: { uid: 'ex-camille', nom: 'Camille' }, lea: { uid: 'ex-lea', nom: 'Léa' }, hugo: { uid: 'ex-hugo', nom: 'Hugo' }, ines: { uid: 'ex-ines', nom: 'Inès' } };
  const par = (q, iso, h = 9) => Object.assign({}, M[q], { t: ts(iso, h) });
  const out = { cfg: null, carte: null, chevaux: {}, soins: {}, pres: {}, places: {}, entretiens: {}, foin: {}, concours: {}, seances: {}, taches: {}, stocks: {}, membres: {} };
  let n = 0;
  const add = (coll, o) => { const id = o.id || `ex-${coll}-${++n}`; out[coll][id] = Object.assign({ id, maj: Date.now() }, o); return id; };

  /* L'équipe : Camille (la gérante, c'est toi pendant la visite), Léa et Hugo, Inès en lecture seule */
  out.membres = {
    'ex-camille': { id: 'ex-camille', nom: 'Camille', role: 'gerante', couleur: 0, dispo: [0, 1, 2, 3, 4, 5, 6], depuis: ts(d(-400)), materiel: 'Selle mixte, couvertures de Tornade et de Bergamote', notes: '' },
    'ex-lea': { id: 'ex-lea', nom: 'Léa', role: 'equipe', couleur: 3, dispo: [3, 6], tel: '06 39 98 12 34', depuis: ts(d(-200)), materiel: 'Selle de Pistache, bombe, guêtres',
      bons: { bl1: { item: 'biere', nom: 'Une bière offerte', prix: 150, t: ts(d(-9), 18), statut: 'offert', offertLe: ts(d(-8), 19), offertPar: { uid: 'ex-camille', nom: 'Camille' } } } },
    'ex-hugo': { id: 'ex-hugo', nom: 'Hugo', role: 'equipe', couleur: 5, dispo: [1, 4, 0], tel: '06 39 98 56 78', depuis: ts(d(-300)), materiel: 'Selle de dressage, filet d’Ulysse',
      bons: { bh1: { item: 'biere', nom: 'Une bière offerte', prix: 150, t: ts(d(-2), 20), statut: 'attente' } } },
    'ex-ines': { id: 'ex-ines', nom: 'Inès', role: 'proprio', couleur: 6, dispo: [6], depuis: ts(d(-150)), notes: 'Propriétaire de Pistache' }
  };
  out.cfg = {
    rubriques: { pres: true, foin: true, concours: true, seances: true },
    contacts: [
      { id: 'c1', nom: 'Dr Martin', metier: 'Vétérinaire', tel: '01 99 00 41 12', notes: 'Clinique des Peupliers, gardes le week-end' },
      { id: 'c2', nom: 'Lucas', metier: 'Maréchal', tel: '01 99 00 52 47', notes: 'Passe toutes les 7 semaines' },
      { id: 'c3', nom: 'Julie', metier: 'Coach', tel: '01 99 00 63 85', notes: "Cours d'obstacle le mardi et le samedi" },
      { id: 'c4', nom: 'M. Petit', metier: 'Fourrage', tel: '01 99 00 74 20', notes: 'Rounds de foin de pré, livrés le jeudi' }
    ]
  };

  /* Les chevaux */
  const r = (aliment, qte, unite, repas) => ({ id: 'r' + (++n), aliment, qte, unite, repas });
  add('chevaux', { id: 'ex-tornade', nom: 'Tornade', naissance: '2015-04-12', sexe: 'Jument', race: 'Selle Français', robe: 'Bai', taille: 165, poids: 560, couleur: 0, proprietaire: 'Camille', propUid: 'ex-camille',
    notes: 'Ferrée des antérieurs. Couverture imperméable dès les premiers froids.', ration: [r('Foin', 5, 'kg', ['matin', 'soir']), r('Granulés', 1.5, 'L', ['matin', 'soir']), r('CMV (minéraux)', 50, 'g', ['matin'])], creePar: par('camille', d(-400)),
    // santé (71-sante.js) : quelques pesées et ses papiers, l'assurance à renouveler bientôt
    pesees: [[-240, 548, 3], [-180, 541, 3], [-120, 552, null], [-75, 566, 4], [-30, 572, 4], [-6, 560, 3]].map(([j, kg, nec], i) => ({ id: `ex-pz${i}`, d: d(j), poids: kg, nec, tour: null, estime: false, note: j === -75 ? 'Retour du pré d\'été' : j === -6 ? 'Granulés réduits' : '' })),
    documents: [{ id: 'ex-doc1', type: 'assurance', nom: 'Mortalité et frais vétérinaires', numero: 'EQ-48213', echeance: d(18), note: '' },
      { id: 'ex-doc2', type: 'livret', nom: '', numero: '25012345X', echeance: null, note: 'Rangé dans le casier de Camille' }] });
  add('chevaux', { id: 'ex-pistache', nom: 'Pistache', naissance: '2012-05-20', sexe: 'Hongre', race: 'Connemara', robe: 'Gris', taille: 146, poids: 400, couleur: 2, proprietaire: 'Inès', propUid: 'ex-ines', pension: { montant: 320, depuis: '2024-09-01' },
    notes: 'Poney de Léa en demi-pension. Craint les tondeuses.', ration: [r('Foin', 4, 'kg', ['matin', 'soir']), r('Luzerne', 0.5, 'kg', ['soir']), r('CMV (minéraux)', 40, 'g', ['matin'])],
    dp: [{ id: 'dp1', qui: { uid: 'ex-lea', nom: 'Léa' }, jours: [3, 6], part: 120, debut: d(-200), fin: null, notes: 'Cours avec Julie le samedi' }], creePar: par('camille', d(-150)),
    pesees: [{ id: 'ex-pz9', d: d(-20), poids: 405, nec: 3, tour: 165, estime: true, note: '' }],
    documents: [{ id: 'ex-doc3', type: 'contrat', nom: 'Pension au box', numero: '', echeance: d(160), note: 'Avec Inès, renouvelable chaque année' }] });
  add('chevaux', { id: 'ex-ulysse', nom: 'Ulysse', naissance: '2016-03-08', sexe: 'Hongre', race: 'Anglo-Arabe', robe: 'Alezan', taille: 163, poids: 515, couleur: 1, proprietaire: 'Hugo', propUid: 'ex-hugo',
    notes: 'Sort en dressage avec Hugo.', ration: [r('Foin', 6, 'kg', ['matin', 'soir']), r('Floconnés', 1, 'L', ['soir']), r('Huile', 0.1, 'L', ['soir'])], creePar: par('hugo', d(-300)) });
  add('chevaux', { id: 'ex-bergamote', nom: 'Bergamote', naissance: '2018-06-01', sexe: 'Jument', race: 'Haflinger', robe: 'Alezan', taille: 147, poids: 470, couleur: 4, proprietaire: 'Camille', propUid: 'ex-camille',
    notes: 'Gourmande : pas de granulés, foin au filet.', ration: [r('Foin', 4, 'kg', ['matin', 'soir'])], creePar: par('camille', d(-400)) });
  add('chevaux', { id: 'ex-joker', nom: 'Joker', naissance: '2008-07-14', sexe: 'Hongre', race: 'Trotteur Français', robe: 'Bai brun', taille: 160, poids: 490, couleur: 3, proprietaire: 'M. Bernard', propUid: null, pension: { montant: 260, depuis: '2023-04-01' },
    notes: 'À la retraite au pré. Arthrose légère : complément pour les articulations.', ration: [r('Foin', 5, 'kg', ['matin', 'soir']), r('Complément', 30, 'g', ['matin'])], creePar: par('camille', d(-380)) });

  /* Les prés : ceux de la carte d'origine, reliés par leur numéro, plus la carrière et la piste */
  const P = {};
  PLAN_VALDI.zones.forEach(z => {
    if (z.type === 'verger') return;
    const nom = z.type === 'pre' ? `Pré ${z.n}` : z.type === 'carriere' ? 'Carrière' : 'Piste';
    P[z.id] = add('pres', { id: 'ex-' + z.id, nom, type: z.type, surface: Math.round(z.aire / 100) / 100, notes: z.type === 'pre' && z.n === 4 ? 'Abreuvoir automatique, abri au fond' : '', creePar: par('camille', d(-400)) });
  });
  // la rotation : trois groupes en ce moment, et leurs prés précédents au repos
  const sejour = (h, z, a, b, q = 'camille') => add('places', { horseId: h, preId: P[z], debut: d(a), fin: b == null ? null : d(b), creePar: par(q, d(a), 8) });
  ['ex-tornade', 'ex-bergamote'].forEach(h => { sejour(h, 'p7', -55, -30); sejour(h, 'p1', -30, -12); sejour(h, 'p4', -12, null); });
  ['ex-ulysse', 'ex-pistache'].forEach(h => { sejour(h, 'p5', -40, -20, 'hugo'); sejour(h, 'p3', -20, -4, 'hugo'); sejour(h, 'p6', -4, null, 'hugo'); });
  sejour('ex-joker', 'p12', -80, -45); sejour('ex-joker', 'p15', -45, -22); sejour('ex-joker', 'p14', -22, -8, 'hugo'); sejour('ex-joker', 'p13', -8, null, 'hugo');
  add('entretiens', { preId: P.p1, type: 'Hersage', date: d(-10), notes: 'Crottins étalés', creePar: par('hugo', d(-10), 17) });
  add('entretiens', { preId: P.p3, type: 'Fauche des refus', date: d(-3), notes: '', creePar: par('camille', d(-3), 16) });
  add('entretiens', { preId: P.p7, type: 'Clôtures', date: d(-15), notes: 'Isolateurs changés côté route', creePar: par('lea', d(-15), 15) });
  add('entretiens', { preId: P.p12, type: 'Ramassage crottins', date: d(-35), notes: '', creePar: par('camille', d(-35), 11) });

  /* Soins faits et rendez-vous prévus (dont un vaccin en retard avant un concours, pour l'exemple) */
  const soin = (h, types, a, o = {}) => {
    const fait = a <= 0, q = o.gere || 'camille';
    return add('soins', Object.assign({ horseId: h, types, label: '', date: d(a), statut: fait ? 'fait' : 'prevu', praticien: '', produit: '', cout: null, payePar: null,
      gerePar: fait ? { uid: M[q].uid, nom: M[q].nom } : null, faitLe: fait ? ts(d(a), 18) : null, planifie: !fait, prochain: null, notes: '', creePar: par(q, d(Math.min(a, 0)), 18) }, o.x || {}));
  };
  const paye = q => ({ uid: M[q].uid, nom: M[q].nom });
  soin('ex-tornade', ['grippe', 'tetanos'], -300, { x: { praticien: 'Dr Martin', cout: 65, payePar: paye('camille') } });
  soin('ex-tornade', ['rhino'], -150, { x: { praticien: 'Dr Martin', cout: 38, payePar: paye('camille') } });
  soin('ex-tornade', ['vermifuge'], -112, { x: { produit: 'Equest Pramox' } });
  soin('ex-tornade', ['marechal'], -44, { x: { praticien: 'Lucas', cout: 95, payePar: paye('camille'), notes: 'Ferrure des antérieurs' } });
  soin('ex-tornade', ['dentiste'], -200, { x: { praticien: 'Dr Martin', cout: 80, payePar: paye('camille') } });
  soin('ex-ulysse', ['grippe', 'tetanos'], -368, { gere: 'hugo', x: { praticien: 'Dr Martin', cout: 65, payePar: paye('hugo') } });
  soin('ex-ulysse', ['rhino'], -120, { gere: 'hugo', x: { praticien: 'Dr Martin', cout: 38, payePar: paye('hugo') } });
  soin('ex-ulysse', ['vermifuge'], -50, { gere: 'hugo' });
  soin('ex-ulysse', ['marechal'], 3, { gere: 'hugo', x: { praticien: 'Lucas', notes: 'Ferrure complète' } });
  soin('ex-pistache', ['grippe', 'tetanos'], -210, { x: { praticien: 'Dr Martin', cout: 65, payePar: paye('ines') } });
  soin('ex-pistache', ['rhino'], -30, { x: { praticien: 'Dr Martin', cout: 38, payePar: paye('ines') } });
  soin('ex-pistache', ['vermifuge'], -30, { gere: 'lea' });
  soin('ex-pistache', ['marechal'], -21, { x: { praticien: 'Lucas', cout: 40, payePar: paye('ines'), notes: 'Parage' } });
  soin('ex-pistache', ['osteo'], 6, { x: { praticien: 'Sophie, ostéopathe', notes: 'Raideur à main droite' } });
  soin('ex-bergamote', ['vermifuge'], -125);
  soin('ex-bergamote', ['marechal'], -35, { x: { praticien: 'Lucas', cout: 40, payePar: paye('camille'), notes: 'Parage' } });
  soin('ex-bergamote', ['dentiste'], 14, { x: { praticien: 'Dr Martin' } });
  soin('ex-joker', ['veto'], -15, { gere: 'hugo', x: { praticien: 'Dr Martin', cout: 85, payePar: { uid: null, nom: 'M. Bernard' }, notes: 'Boiterie légère : repos au pré, anti-inflammatoire 5 jours' } });
  soin('ex-joker', ['marechal'], -28, { gere: 'hugo', x: { praticien: 'Lucas', cout: 40, payePar: { uid: null, nom: 'M. Bernard' }, notes: 'Parage' } });
  soin('ex-joker', ['grippe'], -100, { x: { praticien: 'Dr Martin', cout: 45, payePar: { uid: null, nom: 'M. Bernard' } } });

  /* Séances de travail, faites et prévues */
  const seance = (h, q, a, type, o = {}) => add('seances', Object.assign({ horseId: h, date: d(a), heure: null, statut: a <= 0 && !o.prevu ? 'fait' : 'prevu', type, duree: 45, intensite: 'moyenne', coach: '',
    cavalier: M[q].nom, cavalierUid: M[q].uid, lieu: '', notes: '', ressenti: a <= 0 && !o.prevu ? 'bien' : null, cout: null, payePar: null, creePar: par(q, d(Math.min(a, 0)), 19) }, o.x || {}));
  seance('ex-tornade', 'camille', -1, 'Plat', { x: { duree: 45, notes: 'Transitions dans le pas, très attentive' } });
  seance('ex-tornade', 'camille', -3, 'Obstacle', { x: { duree: 60, intensite: 'soutenue', coach: 'Julie', lieu: 'Carrière', ressenti: 'super', cout: 35, payePar: paye('camille'), notes: 'Oxers à 1 m, rien touché' } });
  seance('ex-tornade', 'camille', -6, 'Extérieur', { x: { duree: 75, intensite: 'legere' } });
  seance('ex-tornade', 'camille', -10, 'Plat', { x: { duree: 40, ressenti: 'moyen', notes: 'Un peu chaude, le vent' } });
  seance('ex-tornade', 'camille', -13, 'Obstacle', { x: { duree: 60, intensite: 'soutenue', coach: 'Julie', cout: 35, payePar: paye('camille') } });
  seance('ex-tornade', 'camille', -17, 'Longe', { x: { duree: 25, intensite: 'legere' } });
  seance('ex-tornade', 'camille', 2, 'Obstacle', { x: { heure: '18:00', coach: 'Julie', lieu: 'Carrière', duree: 60 } });
  seance('ex-ulysse', 'hugo', -2, 'Plat', { x: { duree: 50, notes: 'Reprise Amateur 3 en entier' } });
  seance('ex-ulysse', 'hugo', -5, 'Travail à pied', { x: { duree: 30, intensite: 'legere' } });
  seance('ex-ulysse', 'hugo', -9, 'Plat', { x: { duree: 45, coach: 'Marc', cout: 40, payePar: paye('hugo'), ressenti: 'super' } });
  seance('ex-ulysse', 'hugo', -16, 'Extérieur', { x: { duree: 60, intensite: 'legere' } });
  seance('ex-ulysse', 'hugo', 1, 'Plat', { x: { heure: '17:30' } });
  seance('ex-pistache', 'lea', -1, 'Plat', { prevu: true, x: { heure: '14:00' } });
  seance('ex-pistache', 'lea', -4, 'Plat', { x: { duree: 40 } });
  seance('ex-pistache', 'lea', -11, 'Obstacle', { x: { duree: 50, coach: 'Julie', cout: 25, payePar: paye('lea'), ressenti: 'super' } });
  seance('ex-pistache', 'lea', -18, 'Longe', { x: { duree: 20, intensite: 'legere' } });
  seance('ex-pistache', 'lea', 4, 'Obstacle', { x: { heure: '10:00', coach: 'Julie', cout: 25 } });
  seance('ex-bergamote', 'camille', -7, 'Travail à pied', { x: { duree: 30, intensite: 'legere' } });
  seance('ex-bergamote', 'camille', -20, 'Extérieur', { x: { duree: 60, intensite: 'legere' } });

  /* Concours : un engagement à faire, un engagé avec un vaccin en retard, et des résultats */
  const conc = (h, q, a, o) => add('concours', Object.assign({ horseId: h, date: d(a), dateFin: null, lieu: '', discipline: 'CSO', niveau: 'club', epreuve: '', cavalier: M[q].nom, cavalierUid: M[q].uid,
    statut: 'engage', cloture: null, frais: null, payePar: null, rang: null, partants: null, score: '', notes: '', creePar: par(q, d(Math.min(a, 0) - 10), 20) }, o));
  conc('ex-tornade', 'camille', 9, { lieu: 'Les Trois Chênes', epreuve: 'Club 1', statut: 'a_engager', cloture: d(2), frais: 22 });
  conc('ex-ulysse', 'hugo', 9, { lieu: 'Haras de la Forêt', discipline: 'Dressage', niveau: 'amateur', epreuve: 'Amateur 3 Préliminaire', frais: 30, payePar: paye('hugo') });
  conc('ex-tornade', 'camille', -25, { lieu: 'Les Trois Chênes', epreuve: 'Club 2', frais: 20, payePar: paye('camille'), rang: 2, partants: 18 });
  conc('ex-pistache', 'lea', -12, { lieu: 'Poney-club du Moulin', niveau: 'poney', epreuve: 'Poney 3', frais: 15, payePar: paye('lea'), rang: 1, partants: 14 });
  conc('ex-ulysse', 'hugo', -39, { lieu: 'Haras de la Forêt', discipline: 'Dressage', niveau: 'amateur', epreuve: 'Amateur 3 Grand Prix', frais: 30, payePar: paye('hugo'), rang: 5, partants: 12, score: '64,2 %' });
  conc('ex-tornade', 'camille', -60, { lieu: 'Les Trois Chênes', epreuve: 'Club 2', frais: 20, payePar: paye('camille'), rang: 4, partants: 20 });

  /* Foin : une récolte, une livraison, et une balle entamée tous les deux ou trois jours */
  add('foin', { date: d(-95), sens: 'in', balle: 'round', nb: 30, poids: 250, prix: null, origine: 'Récolte du pré du haut', notes: '', creePar: par('camille', d(-95), 18) });
  add('foin', { date: d(-45), sens: 'in', balle: 'round', nb: 18, poids: 260, prix: 42, payePar: paye('camille'), origine: 'M. Petit', notes: '', creePar: par('hugo', d(-45), 17) });
  add('foin', { date: d(-20), sens: 'in', balle: 'botte', nb: 40, poids: 18, prix: 4, payePar: paye('camille'), origine: 'M. Petit', notes: 'Pour les box', creePar: par('camille', d(-20), 17) });
  const qui = iso => ({ 1: 'hugo', 4: 'hugo', 0: 'hugo', 3: 'lea', 6: 'lea' })[jourSem(iso)] || 'camille';
  for (let a = -90; a <= -31; a += 3) add('foin', { date: d(a), sens: 'out', balle: 'round', nb: 1, creePar: par(qui(d(a)), d(a), 8) });
  for (let a = -30; a <= -2; a += 2) add('foin', { date: d(a), sens: 'out', balle: 'round', nb: 1, creePar: par(qui(d(a)), d(a), 8) });
  for (let a = -15; a <= -1; a++) add('foin', { date: d(a), sens: 'out', balle: 'botte', nb: 1, creePar: par(qui(d(a)), d(a), 12) });

  /* Tâches partagées, cochées par l'équipe ces dernières semaines */
  const tache = (o, coches) => {
    const tk = Object.assign({ titre: '', freq: 'jour', n: null, date: null, preId: null, horseId: null, resp: null, effort: 'normal', notes: '', fait: [] }, o);
    const pts = ptsTache(tk);
    tk.fait = coches.sort((a, b) => b[0] - a[0]).map(([a, q, h, avec]) => {
      const f = { d: d(a), t: ts(d(a), h || 8, 10), par: M[q].nom, uid: M[q].uid, pts };
      if (avec) f.avec = avec.map(x => ({ uid: M[x].uid, nom: M[x].nom }));
      return f;
    });
    tk.creePar = par('camille', d(-40), 8);
    return add('taches', tk);
  };
  const jours = (de, a, pas = 1) => { const l = []; for (let x = de; x <= a; x += pas) l.push(x); return l; };
  tache({ titre: 'Foin du matin', notes: '2 rounds dans les râteliers, foin au filet pour Bergamote' }, jours(-38, -1).map(a => [a, qui(d(a)), 7]));
  tache({ titre: 'Eau des abreuvoirs', effort: 'leger' }, jours(-38, 0).map(a => [a, a === 0 ? 'hugo' : qui(d(a)), a === 0 ? 7 : 18]));
  tache({ titre: 'Curer les box', freq: 'jours', n: 3, effort: 'costaud' }, jours(-38, -2, 3).map(a => [a, qui(d(a)) === 'camille' ? 'lea' : qui(d(a)), 10]));
  tache({ titre: 'Tour des clôtures', freq: 'jours', n: 7, notes: 'Vérifier la tension du fil et les isolateurs' }, jours(-34, -6, 7).map(a => [a, 'camille', 17]));
  tache({ titre: 'Ramasser les crottins au pré', freq: 'jours', n: 7, effort: 'leger', preId: P.p6 }, [[-5, 'lea', 11, ['hugo']], [-12, 'hugo', 11], [-19, 'lea', 11], [-26, 'camille', 11]]);
  tache({ titre: 'Graisser les sabots de Joker', freq: 'jours', n: 2, effort: 'leger', horseId: 'ex-joker' }, jours(-21, -1, 2).map(a => [a, 'hugo', 18]));
  tache({ titre: 'Commander le foin', freq: 'une', date: d(5), effort: 'leger', resp: { uid: 'ex-camille', nom: 'Camille' }, notes: '18 rounds chez M. Petit' }, []);

  /* Autres stocks (72-stocks.js) : les granulés s'ouvrent tous les 4 jours et vont manquer, le reste suit les rations */
  const art = o => add('stocks', Object.assign({ kind: 'article', seuil: null, aliment: '' }, o));
  const mvt = (a, j, sens, qte, x = {}) => add('stocks', Object.assign({ kind: 'mvt', article: a, date: d(j), sens, qte }, x));
  const gr = art({ id: 'ex-st-gran', nom: 'Granulés', cat: 'aliment', unite: 'sac', contenance: 25, cu: 'kg', seuil: 2 });
  mvt(gr, -44, 'in', 10, { prix: 16.9, origine: 'Coopérative de Chauvigny', payePar: paye('camille') });
  jours(-32, -4, 4).forEach(a => mvt(gr, a, 'out', 1));
  const cmv = art({ id: 'ex-st-cmv', nom: 'CMV (minéraux)', cat: 'aliment', unite: 'seau', contenance: 10, cu: 'kg', aliment: 'CMV (minéraux)', seuil: 1 });
  mvt(cmv, -60, 'in', 3, { prix: 42, origine: 'Sellerie du Haut-Poitou', payePar: paye('camille') });
  const luz = art({ id: 'ex-st-luz', nom: 'Luzerne', cat: 'aliment', unite: 'sac', contenance: 20, cu: 'kg', aliment: 'Luzerne' });
  mvt(luz, -30, 'in', 2, { prix: 14.5, origine: 'Coopérative de Chauvigny', payePar: paye('ines') });
  const cop = art({ id: 'ex-st-cop', nom: 'Copeaux', cat: 'litiere', unite: 'ballot', contenance: 20, cu: 'kg', seuil: 3 });
  mvt(cop, -50, 'in', 14, { prix: 9.8, origine: 'Coopérative de Chauvigny', payePar: paye('camille') });
  jours(-48, -3, 5).forEach(a => mvt(cop, a, 'out', 1));
  return out;
}

/* Boutique des crottins : dans l'exemple, les bons s'écrivent seulement sur ce téléphone */
function bonLocal(uidM, id, data) {
  const m = get('membres', uidM);
  if (!m) return;
  S.membres[uidM] = Object.assign({}, m, { bons: Object.assign({}, m.bons, { [id]: Object.assign({}, (m.bons || {})[id], data) }) });
  dataV++;
  saveCache();
  rerenderSoon();
}

/* Réglages › Mon écurie et l'accueil, pendant la visite */
function exempleCarteHtml() {
  const e = ecurieOuverte() || {};
  return section('Mon écurie', `<div class="card ecu-carte">
      <div class="row-main"><div class="ecu-nom">${esc(e.nom || "Écurie d'exemple")}</div><div class="row-s">Une écurie inventée, pour tout essayer</div></div>
      <div class="wrap"><span class="pill ok">Exemple</span><span class="small muted">tu la visites en tant que Camille, la gérante</span></div>
      <p class="note">Tu peux tout toucher : cocher, déplacer les chevaux sur la carte, noter un soin. Rien n'est enregistré, et tout repart à zéro quand tu quittes l'exemple.</p>
      <div class="btnrow">${exempleBoutons()}</div>
    </div>`);
}
const exempleBoutons = () => {
  const e = ecurieOuverte() || {};
  return e.retour
    ? `<button type="button" class="btn small primary" data-act="exemple-quitter">${ic('sortie', 'sm')}Revenir à mon écurie</button>`
    : `<button type="button" class="btn small primary" data-act="exemple-compte">Créer mon compte</button><button type="button" class="btn small" data-act="exemple-quitter">${ic('sortie', 'sm')}Quitter l'exemple</button>`;
};
function bandeauExemple() {
  return `<div class="banner exemple pile">${ic('info')}<div class="row-main"><b>Écurie d'exemple</b><span class="small">Tu la visites en tant que Camille, la gérante. Tout se touche, rien n'est enregistré.</span></div><div class="btnrow">${exempleBoutons()}</div></div>`;
}
ACT['exemple-quitter'] = () => { if (window.eqExemple) window.eqExemple.quitter(); };
ACT['exemple-compte'] = () => { if (window.eqExemple) window.eqExemple.quitter('compte'); };
