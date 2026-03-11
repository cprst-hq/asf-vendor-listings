// build.js — fetches vendors from Airtable and writes index.html
// Run manually: node build.js
// Runs automatically every night via GitHub Actions

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const TOKEN   = process.env.AIRTABLE_TOKEN;
const BASE_ID = 'appDhcJIwBzEx8XvR';
const TABLE   = 'tbl7NA1zVS3B3MC8R';

// ── Airtable fetch (handles pagination) ──────────────────────────────────────
function airtableGet(offset) {
  return new Promise((resolve, reject) => {
    let qs = `fields[]=Vendor+Name&fields[]=Category&fields[]=Description`;
    if (offset) qs += `&offset=${offset}`;

    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${BASE_ID}/${TABLE}?${qs}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}` }
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON parse error: ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAll() {
  let records = [];
  let offset  = null;
  do {
    const data = await airtableGet(offset);
    if (data.error) throw new Error(`Airtable: ${data.error.message || JSON.stringify(data.error)}`);
    records = records.concat(data.records || []);
    offset  = data.offset || null;
  } while (offset);
  return records;
}

// ── Group & sort ──────────────────────────────────────────────────────────────
function groupAndSort(records) {
  const map = {};
  records.forEach(r => {
    const name     = (r.fields['Vendor Name'] || '').trim();
    const category = (r.fields['Category']    || 'Uncategorized').trim();
    const desc     = (r.fields['Description'] || '').trim();
    if (!name) return;
    if (!map[category]) map[category] = [];
    map[category].push({ name, desc });
  });

  const cats = Object.keys(map).sort((a, b) => a.localeCompare(b));
  cats.forEach(cat => map[cat].sort((a, b) => a.name.localeCompare(b.name)));
  return { map, cats };
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildHTML(map, cats) {
  const now = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  const jumpBtns = cats.map(cat =>
    `<a class="jump-btn" href="#${slugify(cat)}">${esc(cat)}</a>`
  ).join('\n        ');

  const sections = cats.map(cat => {
    const cards = map[cat].map(v => `
          <div class="vendor-card">
            <div class="vendor-name">${esc(v.name)}</div>
            ${v.desc ? `<div class="vendor-desc">${esc(v.desc)}</div>` : ''}
          </div>`).join('');

    return `
      <div class="vendor-section">
        <h2 class="category-header" id="${slugify(cat)}">${esc(cat)}</h2>
        <div class="vendor-grid">${cards}
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vendors — Alabama Strawberry Festival 2026</title>
<meta name="description" content="Browse all vendors at the Alabama Strawberry Festival — artisans, crafters, food, and more at Depot Park, Cullman, AL on April 24 & 25, 2026.">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:        #c8bfaf;
    --divider:   #a89880;
    --red:       #c93b1a;
    --red-dark:  #9e2d12;
    --text:      #2a1f18;
    --text-muted:#5a4a3e;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    font-family: 'Source Sans 3', sans-serif;
    color: var(--text);
  }

  /* jump nav */
  .jump-nav {
    padding: 28px 24px 12px;
    text-align: center;
  }
  .jump-nav p {
    font-size: 11px;
    letter-spacing: .15em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 14px;
    font-weight: 600;
  }
  .jump-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .jump-btn {
    display: inline-block;
    padding: 7px 16px;
    border: 2px solid var(--red);
    border-radius: 3px;
    background: transparent;
    color: var(--red-dark);
    font-family: 'Source Sans 3', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    text-decoration: none;
    transition: background .18s, color .18s;
  }
  .jump-btn:hover { background: var(--red); color: #fff; border-color: var(--red); }
  .nav-divider { height: 1px; background: var(--divider); margin: 20px 24px 0; }

  /* sections */
  .vendor-section { padding: 36px 24px 12px; }
  .category-header {
    font-family: 'Playfair Display', serif;
    font-size: 34px;
    color: var(--red);
    text-transform: uppercase;
    letter-spacing: .06em;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--divider);
    margin-bottom: 20px;
    scroll-margin-top: 20px;
  }

  /* vendor grid */
  .vendor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0;
  }
  .vendor-card {
    padding: 16px 16px 16px 0;
    border-bottom: 1px solid var(--divider);
  }
  .vendor-name {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--text);
    margin-bottom: 5px;
  }
  .vendor-desc {
    font-size: 16px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* footer note */
  .updated-note {
    text-align: center;
    padding: 24px;
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: .05em;
  }

  @media (max-width: 600px) {
    .vendor-grid { grid-template-columns: 1fr; }
    .category-header { font-size: 26px; }
  }
</style>
</head>
<body>

<div class="jump-nav">
  <p>Jump to a category</p>
  <div class="jump-buttons">
    ${jumpBtns}
  </div>
</div>
<div class="nav-divider"></div>

${sections}

<p class="updated-note">Last updated: ${now}</p>

</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  if (!TOKEN) {
    console.error('ERROR: AIRTABLE_TOKEN environment variable is not set.');
    process.exit(1);
  }

  console.log('Fetching vendors from Airtable…');
  const records = await fetchAll();
  console.log(`  → ${records.length} records retrieved`);

  const { map, cats } = groupAndSort(records);
  console.log(`  → ${cats.length} categories: ${cats.join(', ')}`);

  const html = buildHTML(map, cats);
  fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
  console.log('  → index.html written successfully');
})();
