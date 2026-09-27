/**
 * Ciclo de vida de un documento Markdown.
 * El consumidor inyecta load/save (Electron, fetch, FS, etc.).
 *
 * @param {object} options
 * @param {(path?: string|null) => Promise<{ content: string, filePath: string }|null|undefined>} options.load
 * @param {(payload: { path: string|null, content: string }) => Promise<{ filePath: string }|null|undefined>} options.save
 */
export function createDocument({ load, save } = {}) {
  if (typeof load !== "function") {
    throw new Error("createDocument: se requiere options.load");
  }
  if (typeof save !== "function") {
    throw new Error("createDocument: se requiere options.save");
  }

  let content = "";
  let path = null;
  let dirty = false;

  return {
    async load(filePath) {
      const result = await load(filePath ?? null);
      if (!result) return null;

      content = result.content ?? "";
      path = result.filePath ?? filePath ?? null;
      dirty = false;
      return { content, filePath: path };
    },

    getContent() {
      return content;
    },

    setContent(md) {
      content = md ?? "";
      dirty = true;
    },

    getPath() {
      return path;
    },

    isDirty() {
      return dirty;
    },

    markDirty() {
      dirty = true;
    },

    markClean() {
      dirty = false;
    },

    async save() {
      const result = await save({ path, content });
      if (!result) return null;

      path = result.filePath ?? path;
      dirty = false;
      return { filePath: path };
    },

    async saveAs() {
      const result = await save({ path: null, content });
      if (!result) return null;

      path = result.filePath ?? null;
      dirty = false;
      return { filePath: path };
    },
  };
}
