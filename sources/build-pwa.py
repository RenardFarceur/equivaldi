"""Construit la version installable d'EquiValdi dans le dépôt GitHub (/home/claude/equivaldi)."""
import glob, json, os, re, shutil, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = HERE, os.path.dirname(HERE)
src = lambda p: open(os.path.join(SRC, p), encoding='utf-8').read()

head = src('01-head.html')
title = re.search(r'<title>.*?</title>', head).group(0)
head = head.replace(title, '').replace('<meta name="claude:viewport-fit-sides" content="cover">', '')
# polices hébergées avec l'appli (rien n'est chargé chez Google Fonts : voir la politique de confidentialité)
head = re.sub(r'<link rel="preconnect" href="https://fonts\.g[^>]*>\s*', '', head)
head = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', '', head)
FONTES = [('Outfit', 400, 'outfit-latin-400-normal'), ('Outfit', 500, 'outfit-latin-500-normal'), ('Outfit', 600, 'outfit-latin-600-normal'),
          ('Barlow Condensed', 500, 'barlow-condensed-latin-500-normal'), ('Barlow Condensed', 600, 'barlow-condensed-latin-600-normal')]
fontes_css = ''.join(f'@font-face{{font-family:"{f}";font-style:normal;font-weight:{w};font-display:swap;src:url(./fonts/{n}.woff2) format("woff2")}}\n' for f, w, n in FONTES)
VERSION = time.strftime('%Y%m%d%H%M%S')
mark, logo = src('brand-mark.svg'), src('brand-logo.svg')
shell = src('02-shell.html').replace('{{MARK}}', mark).replace('{{LOGO}}', logo)
auth = f'<div id="auth" class="auth" hidden><div class="auth-in">{logo}<div id="authBody"></div></div></div>'
app_js = ''.join(open(p, encoding='utf-8').read() for p in sorted(glob.glob(os.path.join(SRC, '[0-9]*.js'))))

html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}
<meta name="description" content="Carnet d'écurie EquiValdi : chevaux, rations, soins, entraînement, prés, foin, concours, tâches partagées et équipe.">
<meta name="theme-color" content="#EEF1EB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D1611" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png?v=c">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png?v=c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="EquiValdi">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
{head.replace('<style>', '<style>' + fontes_css, 1).replace('</style>', src('pwa/extra.css') + '</style>')}
</head>
<body>
{shell}
{auth}
<script>{src('pwa/bridge.js').replace('__VERSION__', VERSION)}</script>
<script>{app_js}</script>
<script type="module">{src('pwa/firebase.js')}</script>
</body>
</html>
"""
os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(src('pwa/sw.js').replace('__VERSION__', VERSION))
shutil.copy(os.path.join(SRC, 'pwa/firestore.rules'), os.path.join(OUT, 'firestore.rules'))
open(os.path.join(OUT, '.nojekyll'), 'w').write('')
# domaine personnalisé pour GitHub Pages (le fichier reste à la racine du dépôt)
open(os.path.join(OUT, 'CNAME'), 'w').write('equivaldi.fr\n')
# polices (licence SIL OFL jointe)
os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
for f in glob.glob(os.path.join(SRC, 'fonts', '*')):
    shutil.copy(f, os.path.join(OUT, 'fonts', os.path.basename(f)))
# pages légales : gabarit + contenu, coordonnées tirées de legal/identite.json (champ vide : « à compléter » en jaune)
ident = json.loads(src('legal/identite.json'))
MANQUE = {'immatriculation': 'numéro SIREN et registre d\'immatriculation', 'adresse': 'adresse postale', 'telephone': 'téléphone',
          'email': 'adresse e-mail de contact', 'mediateur': 'nom, adresse et site du médiateur de la consommation choisi'}
def remplir(t):
    def val(m):
        k = m.group(1)
        v = str(ident.get(k, '')).strip()
        if v:
            v = v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            return f'<a href="mailto:{v}">{v}</a>' if k == 'email' else v
        return f'<mark class="manque">[à compléter : {MANQUE.get(k, k)}]</mark>'
    return re.sub(r'\{\{(\w+)\}\}', val, t)
PAGES = [('mentions-legales', 'Mentions légales'), ('conditions', 'Conditions'), ('confidentialite', 'Confidentialité')]
gabarit = src('legal/gabarit.html')
os.makedirs(os.path.join(OUT, 'legal'), exist_ok=True)
for nom, court in PAGES:
    frag = src(f'legal/{nom}.html')
    titre = re.match(r'<!-- titre: (.*?) -->', frag).group(1)
    nav = ''.join(f'<a href="{n}.html"{" aria-current=\"page\"" if n == nom else ""}>{c}</a>' for n, c in PAGES)
    page = gabarit.replace('{{titre}}', titre).replace('{{nav}}', nav).replace('{{contenu}}', frag.split('-->', 1)[1].strip())
    open(os.path.join(OUT, 'legal', nom + '.html'), 'w', encoding='utf-8').write(remplir(page))
# questionnaire public : page autonome, réponses dans la collection « sondage »
shutil.copy(os.path.join(SRC, 'questionnaire.html'), os.path.join(OUT, 'questionnaire.html'))
manifest = {
    'name': "EquiValdi · Carnet d'écurie", 'short_name': 'EquiValdi', 'lang': 'fr',
    'description': "Chevaux, rations, soins, entraînement, prés, foin, concours, tâches partagées, équipe et demi-pensions.",
    'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#EEF1EB', 'theme_color': '#2B6340',
    'icons': [
        {'src': 'icons/icon-192.png?v=c', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png?v=c', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/icon-maskable-512.png?v=c', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
    ]
}
open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2))
print('index.html', len(html), 'octets')
