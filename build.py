#!/usr/bin/env python3
"""Builds Program Zilnic from src/ into two targets:

docs/          the installable iPhone web app (served by GitHub Pages) (index.html + manifest + service worker + icons)
artifact.html  the same app as a claude.ai Artifact page (no <head>; the viewer adds the skeleton)
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "docs"

styles = (SRC / "styles.css").read_text()
shell = (SRC / "shell.html").read_text()
app = (SRC / "app.js").read_text()
version = re.search(r"APP_VERSION = '([^']+)'", app).group(1)

FONT_CSS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&display=swap"
FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    f'<link rel="stylesheet" href="{FONT_CSS}">'
)
# the installed app must open offline even when the font server never answers, so the font loads without blocking
FONTS_ASYNC = (
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    f'<link rel="preload" as="style" href="{FONT_CSS}" onload="this.onload=null;this.rel=\'stylesheet\'">'
    f'<noscript><link rel="stylesheet" href="{FONT_CSS}"></noscript>'
)
# Same reset the Artifact viewer injects, so both targets lay out identically.
RESET = (
    ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);"
    "padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}"
)

SW_REGISTER = """<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
</script>"""

index = f"""<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Program Zilnic</title>
<meta name="description" content="Programul tău zilnic: taskuri de bifat, sală, alergare, calorii și statistici.">
<meta name="theme-color" content="#F2F4F8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D1017" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Program">
<meta name="format-detection" content="telephone=no">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
{FONTS_ASYNC}
<style>{RESET}</style>
<style>
{styles}
</style>
</head>
<body>
{shell}
<script>
{app}
</script>
{SW_REGISTER}
</body>
</html>
"""

manifest = {
    "name": "Program Zilnic",
    "short_name": "Program",
    "description": "Taskuri zilnice de bifat, sală, alergare, nutriție și statistici.",
    "lang": "ro",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#F2F4F8",
    "theme_color": "#F2F4F8",
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}

sw = f"""// Program Zilnic service worker: works offline after the first visit.
const CACHE = 'program-zilnic-{version}';
const FONT_CACHE = 'program-zilnic-fonts';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('program-zilnic-') && k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
}});

self.addEventListener('fetch', (e) => {{
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages: try the network first so updates arrive, fall back to the cached app offline.
  if (req.mode === 'navigate') {{
    e.respondWith((async () => {{
      try {{
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(req, {{ signal: ctrl.signal }});
        clearTimeout(timer);
        const root = new URL('./', self.location).pathname;
        if (res.ok && res.type === 'basic' && !res.redirected && (url.pathname === root || url.pathname === root + 'index.html')) {{
          e.waitUntil(caches.open(CACHE).then((c) => c.put('./', res.clone())));
        }}
        return res;
      }} catch (err) {{
        return (await caches.match('./')) || Response.error();
      }}
    }})());
    return;
  }}

  // Fonts: serve from their own cache (kept across updates), refresh in the background, never wait long.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {{
    e.respondWith(caches.open(FONT_CACHE).then(async (c) => {{
      const hit = await c.match(req);
      const net = fetch(req).then((res) => {{ if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }}).catch(() => hit || Response.error());
      if (hit) {{ e.waitUntil(net.catch(() => {{}})); return hit; }}
      const timeout = new Promise((r) => setTimeout(() => r(Response.error()), 2500));
      return Promise.race([net, timeout]);
    }}));
    return;
  }}

  if (url.origin === self.location.origin) {{
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {{
      if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }})));
  }}
}});
"""

artifact = f"""<title>Program Zilnic</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>
{styles}
</style>
{shell}
<script>
{app}
</script>
"""

DIST.mkdir(exist_ok=True)
(DIST / "index.html").write_text(index)
(DIST / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
(DIST / "sw.js").write_text(sw)
(ROOT / "artifact.html").write_text(artifact)
print(f"built v{version}: docs/index.html ({len(index)//1024} KB), artifact.html ({len(artifact)//1024} KB)")
