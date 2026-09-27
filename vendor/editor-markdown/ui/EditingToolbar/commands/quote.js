import { toggleLinePrefix } from "./_helpers.js";

export function quote(view) {
  toggleLinePrefix(view, "> ");
}
