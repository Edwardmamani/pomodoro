# Desarrollo — Editor Markdown

Guía para seguir trabajando en este repo y publicar nuevas versiones a otros desarrolladores.

El [README.md](README.md) es para **consumidores**. Este archivo es para **mantener el paquete**.

**Package manager:** `pnpm` (no npm).

---

## Mapa mental

| Qué | Dónde | En el zip `pack:share` |
|-----|--------|-------------------------|
| Librería | `ui/` | Sí |
| API pública | `ui/index.js` + `exports` en `package.json` | Sí |
| Demo escritorio | `electron/` + `ui/App.vue` | No |
| Smoke Vite | `examples/vite-host/` | Sí (referencia) |
| Docs consumidor | `README.md` | Sí |

**Regla:** lo que use un host (Pomodoro, etc.) vive en `ui/`. Electron solo demuestra I/O (`window.api`).

---

## Arranque diario

```bash
pnpm install
pnpm run dev          # Vite :5174 + Electron (demo)
```

> El Vite de este repo usa el puerto **5174** (Pomodoro suele ocupar **5173**). Así puedes tener ambos en paralelo.

Otros:

```bash
pnpm run build              # build UI (dist/)
pnpm run test:integrate     # smoke Preview+Toolbar en examples/vite-host
pnpm run pack:share         # zip en release/ para enviar
```

Primera vez del smoke (si falla `test:integrate` pidiendo deps):

```bash
cd examples/vite-host && pnpm install && cd ../..
pnpm run test:integrate
```

---

## Dónde tocar código

| Quieres… | Edita |
|----------|--------|
| Fuente (.md crudo) | `ui/MarkdownEditor/` |
| Preview live | `ui/MarkdownPreview/` + lógica en `MarkdownEditor/createEditor.js`, `livePreview.js` |
| Comandos de formato | `ui/EditingToolbar/commands/` + barra en `EditingToolbar.vue` |
| Ciclo load/save | `ui/document/createDocument.js` |
| Preset toolbar+preview | `ui/presets/MarkdownPreviewKit.vue` |
| Estilos del **host** | `ui/editor.css` (scoped `.md-editor-root`) |
| Estilos de la **demo** | `ui/style.css` (= `demo.css`) — no ensuciar hosts |
| Abrir/guardar/imágenes demo | `electron/fileSystem/` |
| Exportar algo nuevo | `ui/index.js` **y** `package.json` → `exports` |

Al añadir un módulo público:

1. Implementar en `ui/…`
2. Re-exportar en `ui/index.js`
3. Añadir subpath en `package.json` → `exports` (ej. `"./mi-modulo": "./ui/..."`)
4. Documentar en `README.md`
5. Si afecta integración: ampliar `examples/vite-host` o al menos pasar `test:integrate`

---

## Contratos que no hay que romper

- **`vue`**: solo `peerDependencies` (+ `devDependencies` para la demo). Nunca en `dependencies`.
- **highlight.js**: el runtime usa `ui/vendor/hljs.js` (ESM prebundleado). No importar `highlight.js` directo en el browser. Si cambias lenguajes: `pnpm run bundle:hljs`.
- **CSS**: consumidores importan `editor-markdown/editor.css`. No empujar resets de `html`/`body`/`#app` a `editor.css`.
- **I/O**: la librería no asume `window.api`. `createDocument({ load, save })` lo inyecta el host.
- **Toolbar**: emite `command`; el host decide el panel y el picker de imágenes.

---

## Crear una nueva versión

Usamos semver en `package.json` → `version` (hoy `1.2.0`):

| Cambio | Versión | Ejemplos |
|--------|---------|----------|
| Rotura de API / exports / peer | **MAJOR** `2.0.0` | Quitar export, cambiar firma de `createDocument` |
| Feature compatible | **MINOR** `1.2.0` | Nuevo comando, nuevo preset, nuevo subpath |
| Bugfix sin API nueva | **PATCH** `1.1.1` | Fix hljs, CSS, typo |

### Checklist de release

1. **Desarrollar** en `ui/` (y demo Electron si hace falta probar I/O).
2. **Probar demo:** `pnpm run dev` — Fuente / Split / Preview, toolbar, abrir/guardar.
3. **Probar librería:** `pnpm run test:integrate` (debe pasar sin errores de exports/hljs).
4. **Subir versión** en `package.json` (`version`).
5. **Actualizar README** si cambió la API o el uso.
6. **Empaquetar:**
   ```bash
   pnpm run pack:share
   ```
   Sale `release/editor-markdown-<version>-<YYYYMMDD>.zip` (sin `electron/`, sin `node_modules`).
7. **Enviar el zip.** El receptor:
   - Descomprime en `vendor/editor-markdown`
   - `pnpm add file:./vendor/editor-markdown`
   - `import "editor-markdown/editor.css"` + componentes
8. (Opcional) Commit/tag git: `v1.2.0` con mensaje claro.

### Checklist rápido post-pack (antes de enviar)

- [ ] Abrir el zip: existe `ui/`, `package.json`, `README.md`; **no** hay `electron/`
- [ ] `version` del `package.json` dentro del zip es la esperada
- [ ] En una app Vite limpia (o el host del compañero): install `file:…`, `dedupe: ['vue']`, import Preview+Toolbar, build OK

---

## Flujo típico de un fix / feature

```text
1. Cambiar ui/…
2. pnpm run dev                    → validar en Electron
3. pnpm run test:integrate         → validar como librería
4. Bump version en package.json
5. Ajustar README si aplica
6. pnpm run pack:share             → enviar release/*.zip
```

---

## Notas útiles

- El smoke `examples/vite-host` resuelve el paquete con **aliases** a `ui/` (no `file:`), para no pelear con installs anidados. El consumidor real usa `file:./vendor/editor-markdown` como dice el README.
- `scripts/run-electron.cjs` lanza `electron/main.js` a propósito: el `"main"` del `package.json` apunta a la librería (`ui/index.js`).
- No hace falta publicar a npm; el canal actual es **zip + vendor**.
- Si ves `Port 5173 is already in use`, es otro proyecto (p. ej. Pomodoro). Este editor va en **5174**.
