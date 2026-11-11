
/* ---------- Compte et EquiValdi (version installable) ----------
   « Une idée, un souci ? » (message à EquiValdi, réponse lue dans les réglages), les pages légales,
   l'acceptation des conditions par les comptes créés avant elles, mes données et la suppression du compte. */
const RETOUR_TYPES = [{ v: 'idee', l: 'Une idée', ic: 'leaf' }, { v: 'souci', l: 'Un souci', ic: 'alert' }, { v: 'question', l: 'Une question', ic: 'info' }];
const RETOUR_BROUILLON = 'equivaldi:retour-brouillon';
const compteOk = () => !!(window.EQ_MODE && window.EQ && !estExemple() && ecurieOuverte());
let RET = null, retEnCours = null;   // mes messages, chargés à l'ouverture des réglages
function chargerRetours(forcer = false) {
  if (!compteOk() || (!forcer && (RET || retEnCours))) return retEnCours;
  retEnCours = EQ.mesRetours().then(l => { RET = { t: Date.now(), liste: l }; }, () => { RET = RET || { t: Date.now(), liste: [], erreur: true }; })
    .then(() => { retEnCours = null; rerenderSoon(); });
  return retEnCours;
}
const jourHeure = ms => `${dShort(isoOf(new Date(ms)))} à ${hTxt(ms)}`;

/* Réglages › Une idée, un souci ? */
function retoursHtml() {
  if (!compteOk() || ecurieOuverte().fantome) return '';
  if (!RET) chargerRetours();
  const l = RET ? RET.liste : [];
  const rows = l.slice(0, 6).map(r => {
    const T = RETOUR_TYPES.find(x => x.v === r.type) || RETOUR_TYPES[0], nouv = !!(r.reponse && !r.vuLe);
    return `<button type="button" class="row" data-act="retour-voir" data-id="${esc(r.id)}">${lead(T.ic)}<div class="row-main"><div class="row-t trunc">${esc(r.texte)}</div><div class="row-s">${esc(r.reponse ? `Réponse d'EquiValdi · ${dShort(isoOf(new Date(r.reponse.le)))}` : `Envoyé le ${dShort(isoOf(new Date(r.le)))}`)}</div></div>${nouv ? '<span class="pill ok">Nouveau</span>' : `<span class="row-end">${ic('next', 'sm')}</span>`}</button>`;
  }).join('');
  return section('Une idée, un souci ?', `<p class="note" style="color:var(--ink)">Une fonction qui manque, quelque chose qui coince, une question : écris directement à EquiValdi. La réponse arrive ici.</p>
    <button type="button" class="btn" data-act="retour-ecrire" style="align-self:flex-start">${ic('edit', 'sm')}Écrire à EquiValdi</button>
    ${rows ? `<div class="list">${rows}</div>` : ''}`);
}
ACT['retour-ecrire'] = d => {
  if (!compteOk()) return;
  let b = null;
  try { b = JSON.parse(localStorage.getItem(RETOUR_BROUILLON) || 'null'); } catch (e) { b = null; }
  const type = (d && d.type) || (b && b.type) || 'idee';
  openSheet('Écrire à EquiValdi', `
    ${grp('C\'est…', chips('rtype', RETOUR_TYPES.map(x => ({ v: x.v, html: `${ic(x.ic, 'sm')}<span>${x.l}</span>` })), type))}
    ${fld('Ton message', area('f_rtexte', (b && b.texte) || '', 'rows="6" maxlength="2000" placeholder="Ce que tu aimerais, ce qui ne marche pas, sur quel écran…"'))}
    <p class="note">Partent avec ton message : ton prénom, ton adresse e-mail, le nom de l'écurie, ton rôle et le modèle de ton téléphone, pour qu'on puisse t'aider. Voir la ${`<a href="${esc(EQ.legal.confidentialite)}" target="_blank" rel="noopener">politique de confidentialité</a>`}.</p>`, {
    submit: 'Envoyer', local: true, focus: '#f_rtexte',
    onSubmit: f => {
      const texte = val('f_rtexte'), rtype = chipVal(f, 'rtype') || 'idee';
      if (texte.length < 3) return 'Écris quelques mots.';
      const garde = () => { try { localStorage.setItem(RETOUR_BROUILLON, JSON.stringify({ type: rtype, texte })); } catch (e) { /* rien */ } };
      garde();
      return envoi(EQ.envoyerRetour({ type: rtype, texte }), () => {
        try { localStorage.removeItem(RETOUR_BROUILLON); } catch (e) { /* rien */ }
        closeSheet();
        toast('Merci ! Ton message est parti chez EquiValdi.', { fete: true });
        chargerRetours(true);
      }, "Pas de réseau : ton message est gardé sur ce téléphone. Réessaie dès que tu as du réseau.");
    }
  });
};
ACT['retour-voir'] = d => {
  const r = RET && RET.liste.find(x => x.id === d.id);
  if (!r) return;
  const T = RETOUR_TYPES.find(x => x.v === r.type) || RETOUR_TYPES[0];
  openSheet(T.l, `<div class="box"><p class="small muted">Envoyé le ${esc(jourHeure(r.le))}</p><p class="msg-texte">${esc(r.texte)}</p></div>
    ${r.reponse ? `<div class="box ok"><p class="small muted">Réponse d'EquiValdi · ${esc(jourHeure(r.reponse.le))}</p><p class="msg-texte">${esc(r.reponse.texte)}</p></div>` : '<p class="note">Pas encore de réponse : elle arrivera ici.</p>'}
    <button type="button" class="link" data-act="retour-ecrire" style="align-self:flex-start">${ic('edit', 'sm')}Écrire un autre message</button>`);
  if (r.reponse && !r.vuLe) {
    r.vuLe = Date.now();
    EQ.retourVu(r.id).catch(() => { delete r.vuLe; });
    rerenderSoon();
  }
};

/* Réglages › À propos : version et pages légales */
function aProposHtml() {
  const L = window.EQ && EQ.legal;
  const liens = L ? `<p class="apropos-liens"><a href="${esc(L.mentions)}" target="_blank" rel="noopener">Mentions légales</a> · <a href="${esc(L.conditions)}" target="_blank" rel="noopener">Conditions d'utilisation et de vente</a> · <a href="${esc(L.confidentialite)}" target="_blank" rel="noopener">Confidentialité</a></p>` : '';
  const v = window.EQ_VERSION && !/^__/.test(window.EQ_VERSION) ? `<p class="small muted">Version ${esc(window.EQ_VERSION)}</p>` : '';
  return `<div class="about">${brandLogo()}${liens}${v}</div>`;
}

/* Accueil : les comptes créés avant les conditions d'utilisation les acceptent une fois */
function bandeauConditions() {
  if (!compteOk() || !EQ.conditionsAFaire) return '';
  const L = EQ.legal;
  return `<div class="banner pile">${ic('info')}<div class="row-main"><b>Conditions d'utilisation</b><span class="small">EquiValdi a maintenant des <a href="${esc(L.conditions)}" target="_blank" rel="noopener">conditions d'utilisation et de vente</a> et une <a href="${esc(L.confidentialite)}" target="_blank" rel="noopener">politique de confidentialité</a>. Prends un moment pour les lire.</span></div>
    <button type="button" class="btn small primary" data-act="cgu-ok">J'ai lu et j'accepte</button></div>`;
}
ACT['cgu-ok'] = (d, el) => {
  if (el) el.disabled = true;
  EQ.accepterConditions().then(() => { toast('Merci !'); render(); }, () => { if (el && el.isConnected) el.disabled = false; toast("Ça n'a pas marché : vérifie ta connexion.", { danger: true }); });
};

/* Réglages › Ton compte : mes données, supprimer mon compte */
ACT['mes-donnees'] = async (d, el) => {
  if (!compteOk()) return;
  if (el) el.disabled = true;
  try {
    const data = await EQ.mesDonnees(), dl = await window.claude.use('downloads');
    await dl.save({ filename: `equivaldi-mes-donnees-${todayISO()}.json`, data: JSON.stringify(data, null, 1) });
    toast('Tes données sont téléchargées. Le carnet de l\'écurie s\'exporte dans « Sauvegarde ».');
  } catch (e) { toast(eqMsg(e, 'Le téléchargement n\'a pas pu se faire : vérifie ta connexion.'), { danger: true }); }
  finally { if (el && el.isConnected) el.disabled = false; }
};
ACT['supprimer-compte'] = async () => {
  if (!compteOk()) return;
  let a;
  toast('Vérification de tes écuries…');
  try { a = await EQ.analyseSuppression(); }
  catch (e) { toast(eqMsg(e, 'Impossible de vérifier tes écuries : vérifie ta connexion.'), { danger: true }); return; }
  const noms = l => l.map(x => `<b>${esc(x.nom)}</b>`).join(', ');
  if (a.bloquees.length) {
    openSheet('Supprimer mon compte', `<p class="note" style="color:var(--ink)">Tu gères ${noms(a.bloquees)} avec une équipe. Passe d'abord la gérance à une personne qui a le droit « Peut modifier » (Réglages › Mon écurie › Passer la gérance), puis reviens ici.</p>`);
    return;
  }
  let arme = false;
  openSheet('Supprimer mon compte', `<div class="box danger"><div class="issue danger">${ic('alert', 'sm')}<span>C'est définitif : ton compte et ton adresse e-mail sont effacés d'EquiValdi.</span></div></div>
    ${a.supprimees.length ? `<p class="note" style="color:var(--ink)">Tu es seule ou seul dans ${noms(a.supprimees)} : ${a.supprimees.length > 1 ? 'ces écuries sont supprimées' : 'cette écurie est supprimée'} avec tout ${a.supprimees.length > 1 ? 'leur' : 'son'} carnet. Pense à l'exporter avant (Réglages › Sauvegarde).</p>` : ''}
    ${a.quittees.length ? `<p class="note" style="color:var(--ink)">Tu quittes ${noms(a.quittees)}. Ce que tu y as noté reste dans leur carnet, à ton prénom.</p>` : ''}
    <p class="note">Tes messages à EquiValdi sont effacés aussi. Pour récupérer une copie avant, touche « Télécharger mes données ».</p>
    ${fld('Ton mot de passe', inp('f_mdp', '', 'type="password" autocomplete="current-password"'), 'Pour confirmer que c\'est bien toi.')}`, {
    submit: 'Supprimer mon compte', local: true, focus: '#f_mdp',
    onSubmit: () => {
      const b = $('#sfOk');
      if (!val('f_mdp')) return 'Indique ton mot de passe.';
      if (!arme) { arme = true; b.textContent = 'Confirmer : tout supprimer'; b.classList.add('armed'); return false; }
      return envoi(EQ.supprimerCompte(val('f_mdp')), () => {}, "La suppression n'a pas pu se faire : vérifie ta connexion, puis réessaie.");
    }
  });
};
