# Vendored assets

- `hljs.js` — highlight.js (core + lenguajes) prebundleado a ESM con `export default`.

Regenerar tras cambiar lenguajes en `scripts/hljs-entry.js`:

```bash
pnpm run bundle:hljs
```
