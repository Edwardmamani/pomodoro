/**
 * Entry para prebundlear highlight.js a ESM real (ui/vendor/hljs.js).
 * Usa specifiers del mapa `exports` (sin .js) para que Vite resuelva.
 */
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

function esm(mod) {
  return mod && typeof mod === "object" && "default" in mod && mod.default != null
    ? mod.default
    : mod;
}

const instance = esm(hljs);

instance.registerLanguage("bash", esm(bash));
instance.registerLanguage("c", esm(c));
instance.registerLanguage("cpp", esm(cpp));
instance.registerLanguage("csharp", esm(csharp));
instance.registerLanguage("css", esm(css));
instance.registerLanguage("go", esm(go));
instance.registerLanguage("java", esm(java));
instance.registerLanguage("javascript", esm(javascript));
instance.registerLanguage("json", esm(json));
instance.registerLanguage("markdown", esm(markdown));
instance.registerLanguage("php", esm(php));
instance.registerLanguage("python", esm(python));
instance.registerLanguage("ruby", esm(ruby));
instance.registerLanguage("rust", esm(rust));
instance.registerLanguage("shell", esm(shell));
instance.registerLanguage("sql", esm(sql));
instance.registerLanguage("typescript", esm(typescript));
instance.registerLanguage("xml", esm(xml));
instance.registerLanguage("yaml", esm(yaml));

export default instance;
