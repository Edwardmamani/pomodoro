/**
 * Genera ui/vendor/hljs.js — ESM con default export, listo para Vite/pnpm hosts.
 * Alias a los CJS reales para evitar el wrapper roto es/core.js → lib/core.js.
 */
import { build } from "vite";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const hljsRoot = path.dirname(require.resolve("highlight.js/package.json"));

await build({
  configFile: false,
  root,
  logLevel: "warn",
  resolve: {
    alias: {
      "highlight.js/lib/core": path.join(hljsRoot, "lib/core.js"),
      "highlight.js/lib/languages/bash": path.join(hljsRoot, "lib/languages/bash.js"),
      "highlight.js/lib/languages/c": path.join(hljsRoot, "lib/languages/c.js"),
      "highlight.js/lib/languages/cpp": path.join(hljsRoot, "lib/languages/cpp.js"),
      "highlight.js/lib/languages/csharp": path.join(hljsRoot, "lib/languages/csharp.js"),
      "highlight.js/lib/languages/css": path.join(hljsRoot, "lib/languages/css.js"),
      "highlight.js/lib/languages/go": path.join(hljsRoot, "lib/languages/go.js"),
      "highlight.js/lib/languages/java": path.join(hljsRoot, "lib/languages/java.js"),
      "highlight.js/lib/languages/javascript": path.join(
        hljsRoot,
        "lib/languages/javascript.js"
      ),
      "highlight.js/lib/languages/json": path.join(hljsRoot, "lib/languages/json.js"),
      "highlight.js/lib/languages/markdown": path.join(
        hljsRoot,
        "lib/languages/markdown.js"
      ),
      "highlight.js/lib/languages/php": path.join(hljsRoot, "lib/languages/php.js"),
      "highlight.js/lib/languages/python": path.join(hljsRoot, "lib/languages/python.js"),
      "highlight.js/lib/languages/ruby": path.join(hljsRoot, "lib/languages/ruby.js"),
      "highlight.js/lib/languages/rust": path.join(hljsRoot, "lib/languages/rust.js"),
      "highlight.js/lib/languages/shell": path.join(hljsRoot, "lib/languages/shell.js"),
      "highlight.js/lib/languages/sql": path.join(hljsRoot, "lib/languages/sql.js"),
      "highlight.js/lib/languages/typescript": path.join(
        hljsRoot,
        "lib/languages/typescript.js"
      ),
      "highlight.js/lib/languages/xml": path.join(hljsRoot, "lib/languages/xml.js"),
      "highlight.js/lib/languages/yaml": path.join(hljsRoot, "lib/languages/yaml.js"),
    },
  },
  build: {
    emptyOutDir: false,
    outDir: path.join(root, "ui/vendor"),
    lib: {
      entry: path.join(root, "scripts/hljs-entry.js"),
      formats: ["es"],
      fileName: () => "hljs.js",
    },
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      include: [/highlight\.js/, /node_modules/],
      transformMixedEsModules: true,
    },
    minify: false,
    target: "esnext",
  },
  optimizeDeps: {
    disabled: true,
  },
});

console.log("OK: ui/vendor/hljs.js");
