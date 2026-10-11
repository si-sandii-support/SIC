# SIC Webpack production build (optional)

SIC continues to use Vite as its default development/build tool. Vite already uses esbuild/Rollup and is generally the faster default for this project. Webpack is included as an optional alternative build pipeline for teams that specifically need Webpack configuration; do not run both bundlers on the same output directory.

## Build with Vite (recommended default)

```bash
npm install
npm run build
```

## Build with Webpack

```bash
npm install
npm run build:webpack -w apps/web
```

Webpack writes to `apps/web/dist-webpack/`, leaving the Vite output (`apps/web/dist/`) separate. The Webpack configuration uses Babel JSX transforms, filesystem and loader caches, content-hashed assets, production CSS extraction/minification, Terser minification, deterministic chunk IDs, and vendor splitting. Dynamic imports can still create lazy chunks.

## Environment variables

Webpack reads `VITE_API_URL` and `VITE_DONATION_URL` from the build process environment and substitutes their values at build time. Values baked into a client bundle are public; never put secrets in these variables.

## Deployment note

The existing Dockerfile and deployment setup target Vite's `dist/` output. Keep that for the default build, or deliberately update the deployment copy path to `dist-webpack/` if choosing Webpack. Measure real bundle sizes and browser performance before selecting a pipeline. Webpack does not inherently make the app faster than Vite; performance comes from splitting, caching, lazy loading, and reducing work at runtime.
