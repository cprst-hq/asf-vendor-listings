# ASF Vendor Listings

Static vendor listing page for the Alabama Strawberry Festival.  
Pulls data from Airtable nightly, generates `index.html`, and deploys via Netlify.

---

## How it works

1. A GitHub Action runs every night at 3 AM Central
2. It calls `build.js`, which fetches all vendors from Airtable
3. `build.js` writes a fresh `index.html` with vendors sorted by category
4. GitHub commits and pushes the updated file
5. Netlify detects the new commit and redeploys automatically (usually under 1 minute)

## Manual rebuild

Go to **GitHub → Actions → Nightly Vendor Rebuild → Run workflow** anytime you want to force a refresh without waiting for the nightly run.

## Local development

```bash
# Set your token temporarily in terminal
export AIRTABLE_TOKEN=your_token_here

# Run the build
node build.js

# Open index.html in your browser to preview
```

## Files

| File | Purpose |
|------|---------|
| `build.js` | Fetches from Airtable, generates `index.html` |
| `index.html` | The generated output — served by Netlify |
| `package.json` | Project metadata |
| `.github/workflows/nightly.yml` | Scheduled GitHub Action |
