/**
 * highlight.js prebundleado (ui/vendor/hljs.js) — ESM con `default` real.
 * Evita el entry oficial que reimporta CJS y rompe Vite 8 + pnpm en hosts.
 */
import hljs from "../vendor/hljs.js";

const LANG_ALIASES = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  html: "xml",
  htm: "xml",
  svg: "xml",
  yml: "yaml",
  cs: "csharp",
  "c++": "cpp",
  "c#": "csharp",
  md: "markdown",
  rs: "rust",
};

/**
 * @param {string} lang
 * @param {string} code
 * @returns {{ html: string, language: string }}
 */
export function highlightCode(lang, code) {
  const raw = (lang || "").trim().toLowerCase();
  const resolved = LANG_ALIASES[raw] || raw;

  if (resolved && hljs.getLanguage(resolved)) {
    try {
      return {
        html: hljs.highlight(code, { language: resolved, ignoreIllegals: true })
          .value,
        language: resolved,
      };
    } catch {
      /* fall through */
    }
  }

  return {
    html: hljs.highlightAuto(code).value,
    language: resolved || "",
  };
}

/**
 * Tokens hljs con offsets en el string `code` (para Decoration.mark al editar).
 * @returns {{ from: number, to: number, className: string }[]}
 */
export function highlightTokens(lang, code) {
  if (!code) return [];
  const { html } = highlightCode(lang, code);
  const tokens = [];
  let pos = 0;
  const stack = [];
  const re = /<span class="([^"]+)">|<\/span>|([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] != null) {
      stack.push(m[1]);
    } else if (m[0] === "</span>") {
      stack.pop();
    } else {
      const text = m[2]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const className = stack.length ? stack[stack.length - 1] : "";
      if (className && text.length) {
        tokens.push({ from: pos, to: pos + text.length, className });
      }
      pos += text.length;
    }
  }
  return tokens;
}

/** Etiqueta visible: python → Python */
export function languageLabel(lang) {
  const raw = (lang || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const pretty = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    csharp: "C#",
    cpp: "C++",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    sql: "SQL",
    yaml: "YAML",
    xml: "XML",
    php: "PHP",
    bash: "Bash",
    shell: "Shell",
    rust: "Rust",
    go: "Go",
    java: "Java",
    ruby: "Ruby",
    markdown: "Markdown",
  };
  if (pretty[lower] || pretty[LANG_ALIASES[lower]]) {
    return pretty[lower] || pretty[LANG_ALIASES[lower]];
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
