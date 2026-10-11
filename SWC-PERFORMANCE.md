# SWC performance pipeline

SIC now uses SWC for the default Vite React pipeline and for the optional Webpack pipeline. Babel configuration/dependencies are retained for compatibility with tooling that explicitly invokes Babel, but Babel is no longer on either configured frontend build path.

## Default development and production

```bash
npm install
npm run dev
npm run build
```

The Vite React SWC plugin handles JSX transformation and React Fast Refresh. Vite continues to use esbuild for dependency pre-bundling/minification and keeps document-heavy dependencies in separate chunks.

## Optional Webpack build

```bash
npm install
npm run build:webpack -w apps/web
```

Webpack uses `swc-loader` and SWC for JSX/JavaScript transformation, with filesystem caching, content-hashed assets, code splitting, and production minification. Output is written to `apps/web/dist-webpack/`, separate from Vite's `apps/web/dist/`.

## Performance notes

SWC can reduce transform/build time compared with Babel in many projects, but it does not guarantee a faster runtime by itself. Runtime speed depends on downloaded JavaScript, document parsing, rendering work, network/cache configuration, and target devices. Compare clean production builds and use Lighthouse or browser performance profiles before claiming a measured improvement.

## Compatibility

The source remains JavaScript/JSX (no TypeScript migration). Babel dependencies and `.babelrc.json` are kept to avoid breaking any external scripts that may explicitly invoke Babel; configured Vite and Webpack builds use SWC.
