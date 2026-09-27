import { wrapHtml } from "./_helpers.js";

const U_WRAP = /^<u>([\s\S]*)<\/u>$/i;

export function underline(view) {
  wrapHtml(view, "<u>", "</u>", (selected) => {
    const m = selected.match(U_WRAP);
    return m ? m[1] : null;
  });
}
