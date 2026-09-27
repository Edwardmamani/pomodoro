import { toggleLinePrefix } from "./_helpers.js";

export function heading(view, level = 1) {
  const n = Math.min(6, Math.max(1, level));
  toggleLinePrefix(view, `${"#".repeat(n)} `);
}
