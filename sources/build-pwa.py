"""Construit la version installable d'EquiValdi dans le dépôt GitHub (/home/claude/equivaldi)."""
import glob, json, os, re, shutil, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = HERE, os.path.dirname(HERE)
src = lambda p: open(os.path.join(SRC, p), encoding='utf-8').read()

head = src('01-head.html')
title = re.search(r'<title>.*?</title>', head).group(0)
head = head.replace(title, '').replace('<meta name="claude:viewport-fit-sides" content="cover">', '')
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
<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="EquiValdi">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
{head.replace('</style>', src('pwa/extra.css') + '</style>')}
</head>
<body>
{shell}
{auth}
<script>{src('pwa/bridge.js')}</script>
<script>{app_js}</script>
<script type="module">{src('pwa/firebase.js')}</script>
</body>
</html>
"""
os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(src('pwa/sw.js').replace('__VERSION__', time.strftime('%Y%m%d%H%M%S')))
shutil.copy(os.path.join(SRC, 'pwa/firestore.rules'), os.path.join(OUT, 'firestore.rules'))
open(os.path.join(OUT, '.nojekyll'), 'w').write('')
manifest = {
    'name': "EquiValdi · Carnet d'écurie", 'short_name': 'EquiValdi', 'lang': 'fr',
    'description': "Chevaux, rations, soins, entraînement, prés, foin, concours, tâches partagées, équipe et demi-pensions.",
    'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#EEF1EB', 'theme_color': '#2B6340',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
    ]
}
open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2))
print('index.html', len(html), 'octets')
