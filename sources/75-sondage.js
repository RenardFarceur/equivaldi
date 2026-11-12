/* ---------- Administration : réponses au questionnaire public (questionnaire.html) ----------
   Les réponses arrivent dans la collection « sondage », lisible seulement par l'administration. */

let SDG = null, sdgEnCours = null;
const SDG_LIB = {
  profil: { maison: 'Chevaux à la maison', pension: 'Propriétaire en pension', gerant: 'Tient une pension', club: 'Centre équestre', aucun: 'Pas de cheval' },
  nb: { '1': '1', '2-3': '2 ou 3', '4-10': '4 à 10', '11-30': '11 à 30', '30+': 'Plus de 30' },
  soucis: { rappels: 'Vaccins, vermifuges, maréchal', pres: 'Rotation des prés', foin: 'Stock de foin', aliments: 'Aliments et litière', rations: 'Rations', equipe: 'Qui fait quoi', nouvelles: 'Nouvelles aux propriétaires', factures: 'Facturer pension et frais', depenses: 'Coût des chevaux', concours: 'Concours', rien: 'Rien de tout ça' },
  outils: { papier: 'Papier', tableau: 'Tableau blanc', agenda: 'Agenda du téléphone', tableur: 'Excel, Sheets', messagerie: 'WhatsApp, Messenger', appli: 'Une appli', tete: 'Dans la tête' },
  temps: { '-30': 'Moins de 30 min', '30-60': '30 min à 1 h', '1-3': '1 à 3 h', '3+': 'Plus de 3 h' },
  interet: { non: 'Pas vraiment', peutetre: 'Peut-être', oui: 'Oui', essayer: "Oui, veut l'essayer" },
  prio: { rappels: 'Ne rien oublier (soins)', 'pres-foin': 'Prés et foin', equipe: "Coordonner l'équipe", proprietaires: 'Propriétaires au courant', argent: "Suivre l'argent", simple: 'Simple, sans formation' }
};
function chargerSondage() {
  if (sdgEnCours) return sdgEnCours;
  sdgEnCours = EQ.reponsesSondage().then(r => { SDG = { t: Date.now(), r }; }, e => { SDG = SDG || { t: Date.now(), r: [], erreur: true }; toast(eqMsg(e, 'Impossible de charger les réponses : vérifie ta connexion.'), { danger: true }); })
    .then(() => { sdgEnCours = null; rerenderSoon(); });
  return sdgEnCours;
}
ACT['open-sondage'] = () => push('sondage');
ACT['sdg-actualiser'] = () => { SDG = null; render(); };
const mediane = xs => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
/* Barres horizontales : une ligne par réponse, part des répondants */
function barresSdg(rs, champ, multi) {
  const lib = SDG_LIB[champ], n = rs.length, c = {};
  rs.forEach(r => (multi ? (Array.isArray(r[champ]) ? r[champ] : []) : [r[champ]]).forEach(v => { if (v) c[v] = (c[v] || 0) + 1; }));
  const lignes = Object.keys(lib).map(k => ({ k, l: lib[k], n: c[k] || 0 })).filter(x => x.n).sort((a, b) => b.n - a.n);
  if (!lignes.length) return '<p class="note">Pas encore de réponse.</p>';
  return `<div class="sdg-barres">${lignes.map(x => `<div class="sdg-l"><span class="sdg-t">${esc(x.l)}</span><span class="sdg-b"><i style="width:${Math.round(x.n / n * 100)}%"></i></span><span class="sdg-n num">${x.n} · ${Math.round(x.n / n * 100)} %</span></div>`).join('')}</div>`;
}
VIEWS.sondage = () => {
  const T = { title: 'Questionnaire', eyebrow: 'Administration', back: true, fab: null };
  if (!window.EQ || !EQ.admin) return Object.assign(T, { html: emptyH('Réservé', "Cette page est réservée à l'administration EquiValdi.") });
  if (!SDG) { chargerSondage(); return Object.assign(T, { html: '<p class="note">Chargement des réponses…</p>' }); }
  const lien = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}questionnaire.html`;
  const partage = `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px"><b>Lien à partager</b><code class="sdg-lien">${esc(lien)}</code>
    <p class="note" style="margin:0">Ajoute <code>?s=</code> et un mot pour savoir d'où viennent les réponses : <code>?s=facebook</code>, <code>?s=club</code>…</p>
    <div class="btnrow"><button type="button" class="btn small" data-act="sdg-copier" data-v="${esc(lien)}">${ic('copy', 'sm')}Copier le lien</button></div></div>`;
  const rs = SDG.r, cav = rs.filter(r => r.profil !== 'aucun');
  if (!rs.length) return Object.assign(T, { html: partage + emptyH('Aucune réponse pour le moment', 'Partage le lien dans les groupes de cavaliers, à ton club, à tes clients de pension.') });
  const sem = rs.filter(r => (r.le || 0) > Date.now() - 7 * 86400000).length;
  const interesses = cav.filter(r => r.interet === 'oui' || r.interet === 'essayer').length;
  const pb = mediane(cav.map(r => r.prixBon)), pc = mediane(cav.map(r => r.prixCher));
  const parProfil = p => cav.filter(r => r.profil === p);
  const prixDe = rsx => { const b = mediane(rsx.map(r => r.prixBon)), c = mediane(rsx.map(r => r.prixCher)); return `${b != null ? num(b, 1) + ' €' : '—'} / ${c != null ? num(c, 1) + ' €' : '—'}`; };
  const remarques = cav.filter(r => r.remarque).slice(0, 30);
  const betas = cav.filter(r => r.email && r.beta);
  const html = partage + `<div class="stats">
      <div class="stat"><b>${rs.length}</b><span>${pl(rs.length, 'réponse')}</span></div>
      <div class="stat"><b>${cav.length ? Math.round(interesses / cav.length * 100) : 0} %</b><span>intéressés</span></div>
      <div class="stat"><b>${betas.length}</b><span>pour l'essai</span></div></div>
    <p class="note">${sem} ${pl(sem, 'réponse')} ces 7 derniers jours. Les pourcentages comptent les personnes qui s'occupent de chevaux (${cav.length}).</p>`
    + section('Qui a répondu', barresSdg(rs, 'profil'))
    + section('Combien de chevaux', barresSdg(cav, 'nb'))
    + section('Ce qui leur prend la tête', barresSdg(cav, 'soucis', true))
    + section("Ce qu'ils utilisent", barresSdg(cav, 'outils', true) + (cav.some(r => r.appli) ? `<p class="note">Applis citées : ${esc([...new Set(cav.map(r => r.appli).filter(Boolean))].slice(0, 20).join(', '))}</p>` : ''))
    + section("Temps passé à s'organiser", barresSdg(cav, 'temps'))
    + section('Intérêt pour une appli', barresSdg(cav, 'interet'))
    + section('Ce qui compterait le plus', barresSdg(cav, 'prio'))
    + section('Prix par mois (médianes)', `<div class="list">
        <div class="row"><div class="row-main"><div class="row-t">Tout le monde</div><div class="row-s">bonne affaire / trop cher</div></div><span class="row-end num">${pb != null ? num(pb, 1) + ' €' : '—'} / ${pc != null ? num(pc, 1) + ' €' : '—'}</span></div>
        <div class="row"><div class="row-main"><div class="row-t">Chevaux à la maison</div><div class="row-s">formule « À la maison » à 5 €</div></div><span class="row-end num">${prixDe(parProfil('maison'))}</span></div>
        <div class="row"><div class="row-main"><div class="row-t">Tiennent une pension</div><div class="row-s">formule « Pro » à 20 €</div></div><span class="row-end num">${prixDe(parProfil('gerant'))}</span></div></div>`)
    + (remarques.length ? section('Ce qu\'ils ont écrit', `<div class="list">${remarques.map(r => `<div class="row"><div class="row-main"><div class="row-t" style="white-space:normal">${esc(r.remarque)}</div><div class="row-s">${esc([SDG_LIB.profil[r.profil], r.dep, dShort(isoOf(new Date(r.le || 0)))].filter(Boolean).join(' · '))}</div></div></div>`).join('')}</div>`) : '')
    + section('Exporter', `<p class="note">Toutes les réponses dans un tableau (CSV) à ouvrir dans un tableur. Les e-mails pour l'essai n'y sont que s'ils ont été laissés avec l'accord coché.</p>
      <div class="btnrow"><button type="button" class="btn" data-act="sdg-csv">${ic('download', 'sm')}Télécharger le CSV</button>${betas.length ? `<button type="button" class="btn" data-act="sdg-copier" data-v="${esc(betas.map(r => r.email).join(', '))}">${ic('copy', 'sm')}Copier les e-mails (${betas.length})</button>` : ''}</div>`)
    + '<button type="button" class="link" data-act="sdg-actualiser" style="align-self:flex-start">Actualiser</button>';
  return Object.assign(T, { html });
};
ACT['sdg-copier'] = async d => {
  try { await navigator.clipboard.writeText(d.v); toast('Copié'); }
  catch (e) { toast("La copie n'a pas marché : sélectionne le texte et copie-le à la main.", { danger: true }); }
};
ACT['sdg-csv'] = async () => {
  if (!SDG || !SDG.r.length) return;
  const cols = ['le', 'profil', 'nb', 'dep', 'soucis', 'outils', 'appli', 'temps', 'interet', 'prio', 'prixBon', 'prixCher', 'remarque', 'email', 'source'];
  const cel = v => { const s = Array.isArray(v) ? v.join(' | ') : v == null ? '' : String(v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lignes = [cols.join(';'), ...SDG.r.map(r => cols.map(c => c === 'le' ? new Date(r.le || 0).toISOString().slice(0, 16).replace('T', ' ') : c === 'email' ? (r.beta ? r.email : '') : cel(r[c])).map(cel).join(';'))];
  try { const dl = await window.claude.use('downloads'); await dl.save({ filename: `equivaldi-questionnaire-${todayISO()}.csv`, data: new Blob(['﻿' + lignes.join('\r\n')], { type: 'text/csv;charset=utf-8' }) }); toast('Tableau téléchargé'); }
  catch (e) { toast("Le téléchargement n'a pas pu se faire.", { danger: true }); }
};
