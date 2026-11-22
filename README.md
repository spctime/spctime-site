# SPCTIME

A minimal, interactive, one-screen Astro experience.

## Local development

```sh
npm install
npm run dev
```

Build for production with `npm run build`. The static site is generated in `dist/`.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the Astro site and deploys to GitHub Pages.

In **Repository Settings → Pages → Build and deployment**, choose **GitHub Actions**.

The `public/CNAME` file sets the intended custom domain to `spctime.ai`. Configure DNS at your registrar only after GitHub Pages is enabled:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | spctime.github.io |

Preserve email-related MX, TXT, SPF, DKIM, and DMARC records. Enable **Enforce HTTPS** in GitHub Pages once available.

## Interaction

Drag or tap individual letters. Double-click or press Space to scatter them; Escape resets the word. The animated gray fabric responds to pointer motion. Reduced-motion settings are respected.

## Creative constraint

Keep the public page stealth: only **SPCTIME**. No tagline, explanatory copy, navigation, or product disclosures.
