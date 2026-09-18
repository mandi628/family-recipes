# family-recipes

A static JavaScript blog for the Aumann family recipe archive.

## Local preview

Run `npm start`, then open <http://localhost:3000>.

## Updating entries

The published content is stored in `public/data/entries.json`. To recover the
current TiddlyWiki entries after editing `index.html`, run:

```bash
npm run import
```

The site's **Write an entry** form downloads a JSON draft. Replace
`public/data/entries.json` with that file, review it, and commit the change.
GitHub Pages cannot write directly to the repository from a browser.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `public` directory
whenever changes reach `main`. In the repository settings, set **Pages > Build
and deployment > Source** to **GitHub Actions**.
