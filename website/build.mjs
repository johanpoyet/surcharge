import { marked } from 'marked';
// Génère les pages publiques (johanpoyet.fr/surcharge/…) depuis docs/legal/*.md.
// Usage : npm i --no-save marked@15 && node website/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  { src: 'docs/legal/politique-de-confidentialite.md', out: 'confidentialite', title: 'Politique de confidentialité' },
  { src: 'docs/legal/conditions-d-utilisation.md', out: 'cgu', title: "Conditions d'utilisation" },
  { src: 'docs/legal/support.md', out: 'support', title: 'Assistance' },
];

const logo = `<svg width="32" height="32" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#D7FF3A"/><g transform="skewX(-12) translate(8 0)" fill="#0A0A0A"><rect x="8" y="25" width="7" height="13" rx="2"/><rect x="18" y="18" width="7" height="20" rx="2"/><rect x="28" y="10" width="7" height="28" rx="2"/></g></svg>`;

const css = `
:root{--volt:#D7FF3A;--bg:#0A0A0A;--surface:#151515;--line:#2A2A2A;--text:#F5F5F0;--muted:#9A9A92}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 'Barlow',system-ui,-apple-system,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:28px 20px 64px}
header{display:flex;align-items:center;gap:10px;margin-bottom:28px}
header a{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none}
.brand{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;font-size:24px;letter-spacing:.01em}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 32px}
nav a{padding:8px 14px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);text-decoration:none;font-weight:600;font-size:14px}
nav a[aria-current=page]{background:var(--volt);border-color:var(--volt);color:var(--bg)}
h1{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:800;text-transform:uppercase;font-size:clamp(34px,8vw,48px);line-height:1;margin:0 0 12px}
h2{font-size:20px;margin:36px 0 10px}
p,li{color:#DADAD3}
strong{color:var(--text)}
em{color:var(--muted)}
a{color:var(--volt)}
ul{padding-left:20px}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:15px;display:block;overflow-x:auto}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.08em}
footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
`;

for (const page of pages) {
  // Le logo affiche déjà le nom : on retire « — Surcharge » du titre.
  const body = marked.parse(readFileSync(`${ROOT}/${page.src}`, 'utf8')).replace(' — Surcharge</h1>', '</h1>');
  const nav = pages
    .map((p) => `<a href="/surcharge/${p.out}"${p.out === page.out ? ' aria-current="page"' : ''}>${p.title}</a>`)
    .join('');
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title} — Surcharge</title>
<meta name="description" content="${page.title} de l'application Surcharge, carnet de musculation.">
<meta name="theme-color" content="#0A0A0A">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:ital,wght@1,800&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="wrap">
<header><a href="/surcharge/support">${logo}<span class="brand">SURCHARGE</span></a></header>
<nav>${nav}</nav>
<main>
${body}
</main>
<footer>Surcharge · <a href="mailto:surcharge@johanpoyet.fr">surcharge@johanpoyet.fr</a></footer>
</div>
</body>
</html>
`;
  mkdirSync(`${ROOT}/website/surcharge/${page.out}`, { recursive: true });
  writeFileSync(`${ROOT}/website/surcharge/${page.out}/index.html`, html);
  console.log('✓', page.out);
}
// /surcharge → assistance
writeFileSync(
  `${ROOT}/website/surcharge/index.html`,
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/surcharge/support"><title>Surcharge</title></head><body><a href="/surcharge/support">Surcharge — assistance</a></body></html>\n`,
);
