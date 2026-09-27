import { wrapSelection } from "./_helpers.js";

export function bold(view) {
  wrapSelection(view, "**");
}
