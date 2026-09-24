# Historias de usuario — Aplicación Pomodoro

**Producto:** aplicación de escritorio.  
**Actor principal:** usuario individual (estudiante, profesional independiente o gestor de proyectos personales).  
**Referencias:** [01 requerimientos.md](01%20requerimientos.md).

## Leyenda de prioridad


| Etiqueta | Significado                    |
| -------- | ------------------------------ |
| MVP      | Incluida en la versión inicial |
| POST     | Posterior al MVP               |


---

## Épica E1 — Temporizador Pomodoro

### HU-01 — Iniciar y controlar el temporizador (MVP)

**Como** usuario,  
**quiero** iniciar, pausar, reanudar, detener y reiniciar el temporizador,  
**para** gestionar mi sesión de concentración sin perder el control del tiempo.

**Criterios de aceptación**

- **Given** estoy en la pantalla Inicio / Enfoque y el temporizador está detenido,  
**When** pulso iniciar,  
**Then** el tiempo comienza a descontar y se muestra el modo activo (Concentración, Descanso corto o Descanso largo).
- **Given** el temporizador está en marcha,  
**When** pulso pausar,  
**Then** el conteo se detiene y puedo reanudarlo desde el tiempo restante.
- **Given** el temporizador está en marcha o en pausa,  
**When** pulso reiniciar,  
**Then** el periodo vuelve a su duración configurada sin registrar la sesión como completada.
- **Given** el temporizador está en marcha o en pausa,  
**When** pulso detener (stop),  
**Then** la sesión actual se cancela y el temporizador vuelve al estado inicial del modo seleccionado.

### HU-02 — Cambiar entre modos de ciclo (MVP)

**Como** usuario,  
**quiero** seleccionar Concentración, Descanso corto o Descanso largo,  
**para** seguir la técnica Pomodoro con claridad visual.

**Criterios de aceptación**

- **Given** estoy en Inicio / Enfoque,  
**When** selecciono un modo,  
**Then** el anillo y el reloj reflejan la duración de ese modo.
- **Given** hay un temporizador en marcha,  
**When** intento cambiar de modo,  
**Then** la aplicación solicita confirmación o bloquea el cambio hasta detener/reiniciar (comportamiento definido en la especificación funcional).
- **Given** he completado periodos,  
**When** veo los contadores de cada modo,  
**Then** se muestra cuántos periodos de cada tipo he completado en la sesión/día según diseño de UI.

### HU-03 — Duraciones por defecto y personalización (MVP)

**Como** usuario,  
**quiero** usar duraciones por defecto (25 / 5 / 15) y personalizarlas,  
**para** adaptar el ritmo a mi forma de trabajar.

**Criterios de aceptación**

- **Given** es la primera ejecución,  
**When** abro la aplicación,  
**Then** Concentración = 25 min, Descanso corto = 5 min, Descanso largo = 15 min, y el descanso largo ocurre cada 4 pomodoros de trabajo.
- **Given** estoy en Configuración,  
**When** cambio las duraciones y guardo,  
**Then** las nuevas duraciones se aplican a los siguientes periodos y se persisten en el dispositivo.

### HU-04 — Notificación y sonido al finalizar un periodo (MVP)

**Como** usuario,  
**quiero** recibir una notificación de escritorio y una señal sonora al terminar un periodo,  
**para** enterarme aunque la ventana no esté en primer plano.

**Criterios de aceptación**

- **Given** un periodo llega a 00:00,  
**When** finaliza,  
**Then** se muestra una notificación del sistema y se reproduce el sonido configurado (si está habilitado).
- **Given** he desactivado sonido o notificaciones en Configuración,  
**When** finaliza un periodo,  
**Then** solo se aplican los canales que sigan activos.

### HU-05 — Asociación opcional a una tarea (MVP)

**Como** usuario,  
**quiero** vincular (o no) una sesión Pomodoro a una tarea,  
**para** contabilizar el enfoque por trabajo concreto.

**Criterios de aceptación**

- **Given** tengo una tarea activa seleccionada,  
**When** completo un pomodoro de Concentración,  
**Then** se registra la sesión asociada a esa tarea y se incrementan pomodoros completados y tiempo acumulado.
- **Given** no hay tarea seleccionada,  
**When** completo un pomodoro,  
**Then** la sesión se guarda en el historial sin `tarea_id`.
- **Given** la tarea vinculada está Cancelada,  
**When** intento iniciar o completar un pomodoro asociado,  
**Then** el sistema lo impide según reglas de negocio.

### HU-06 — Historial de sesiones (MVP)

**Como** usuario,  
**quiero** que se guarden las sesiones completadas,  
**para** consultar después mi historial de enfoque.

**Criterios de aceptación**

- **Given** finalizo un periodo de forma completa,  
**When** se cierra el periodo,  
**Then** queda un registro persistente (tipo, duración, fechas, tarea opcional).
- **Given** reinicio o detengo antes de terminar,  
**When** la acción se confirma,  
**Then** no se cuenta como sesión completada.

---

## Épica E2 — Gestión de tareas

### HU-07 — Crear tarea (MVP)

**Como** usuario,  
**quiero** añadir una tarea con título obligatorio y atributos opcionales,  
**para** organizar el trabajo que haré en mis pomodoros.

**Criterios de aceptación**

- **Given** estoy en la lista de tareas,  
**When** pulso “Añadir tarea” e ingreso un título válido,  
**Then** la tarea se crea con estado Por hacer (o el inicial definido), prioridad Media por defecto si no indico otra, y fechas de creación/actualización.
- **Given** intento guardar sin título,  
**When** confirmo,  
**Then** la aplicación muestra un error de validación y no crea la tarea.

### HU-08 — Editar y eliminar tareas (MVP)

**Como** usuario,  
**quiero** editar o eliminar tareas,  
**para** mantener la lista al día.

**Criterios de aceptación**

- **Given** abro el detalle de una tarea,  
**When** modifico estado, prioridad, fecha límite, etiquetas o estimación,  
**Then** los cambios se guardan y se actualiza la fecha de última modificación.
- **Given** elimino una tarea,  
**When** confirmo,  
**Then** desaparece de la lista; las sesiones históricas pueden conservar referencia nula o el registro según diseño de BD (documentado en especificación).
- **Given** hay tareas cerradas,  
**When** uso “Eliminar todas” en el grupo de cerradas,  
**Then** se eliminan solo las tareas cerradas tras confirmación.

### HU-09 — Estados, prioridades y etiquetas (MVP)

**Como** usuario,  
**quiero** asignar estado, prioridad y una o más etiquetas,  
**para** priorizar y clasificar mi trabajo.

**Criterios de aceptación**

- **Given** edito una tarea,  
**When** elijo estado entre Bloqueado, Por hacer, En curso, Hecha, Cancelada,  
**Then** el valor se refleja en la lista y en filtros.
- **Given** marco una tarea como Hecha,  
**When** la veo en la UI,  
**Then** aparece en el grupo de cerradas / completadas y cuenta en el progreso X/Y.
- **Given** una tarea Hecha,  
**When** cambio el estado a Por hacer o En curso,  
**Then** se reabre correctamente.
- **Given** asigno etiquetas,  
**When** guardo,  
**Then** se muestran en la tarjeta de la tarea (p. ej. “english”).

### HU-10 — Tiempo acumulado y pomodoros por tarea (MVP)

**Como** usuario,  
**quiero** ver el tiempo dedicado y los pomodoros estimados/completados de cada tarea,  
**para** saber cuánto esfuerzo real me ha costado.

**Criterios de aceptación**

- **Given** completo pomodoros vinculados a una tarea,  
**When** miro la lista o el detalle,  
**Then** veo tiempo acumulado (p. ej. “6m”, “23m”) y contadores de pomodoros.
- **Given** indico pomodoros estimados,  
**When** guardo,  
**Then** puedo comparar estimación vs completados.

### HU-11 — Filtrar, ordenar y buscar (MVP)

**Como** usuario,  
**quiero** filtrar, ordenar y buscar tareas,  
**para** encontrar rápido lo que debo hacer.

**Criterios de aceptación**

- **Given** existen varias tareas,  
**When** filtro por estado, prioridad, etiqueta o fecha límite,  
**Then** la lista muestra solo las que cumplen el criterio.
- **Given** aplico un orden (prioridad, fecha límite o creación),  
**When** la lista se actualiza,  
**Then** el orden es estable y coherente.
- **Given** uso la búsqueda,  
**When** escribo parte del título,  
**Then** se filtran las coincidencias.

### HU-12 — Tareas vencidas y próximas a vencer (MVP)

**Como** usuario,  
**quiero** identificar tareas vencidas y próximas a vencer,  
**para** no pasarme de las fechas límite.

**Criterios de aceptación**

- **Given** una tarea con fecha límite anterior a hoy y estado distinto de Hecha/Cancelada,  
**When** consulto la lista o un filtro de vencidas,  
**Then** se marca o lista como vencida.
- **Given** defino un umbral de “próximas” (p. ej. 48 h),  
**When** consulto próximas a vencer,  
**Then** aparecen las que cumplen el criterio.

### HU-13 — Iniciar Pomodoro desde una tarea (MVP)

**Como** usuario,  
**quiero** iniciar un Pomodoro desde una tarea,  
**para** concentrarme de inmediato en ese ítem.

**Criterios de aceptación**

- **Given** una tarea no cancelada,  
**When** elijo “Iniciar Pomodoro”,  
**Then** esa tarea queda como activa, el modo pasa a Concentración y el temporizador puede iniciarse.
- **Given** la tarea estaba Por hacer,  
**When** inicio el Pomodoro,  
**Then** su estado pasa a En curso.

### HU-14 — Exportar lista de tareas (MVP)

**Como** usuario,  
**quiero** exportar los datos de la lista de tareas a CSV o JSON,  
**para** respaldarlos o usarlos fuera de la aplicación.

**Criterios de aceptación**

- **Given** estoy en Tareas,  
**When** elijo exportar y selecciono formato CSV o JSON,  
**Then** se abre el diálogo nativo de guardado y se genera el archivo en la ruta elegida.
- **Given** tengo filtros activos,  
**When** exporto,  
**Then** el archivo incluye solo las tareas visibles tras esos filtros.
- **Given** no hay filtros,  
**When** exporto,  
**Then** se exportan todas las tareas (o el conjunto por defecto documentado en RF).

---

## Épica E3 — Música / Spotify

### HU-15 — Guardar y seleccionar listas (MVP)

**Como** usuario,  
**quiero** añadir listas de Spotify por enlace o identificador y seleccionar una lista activa,  
**para** acompañar mis sesiones de enfoque.

**Criterios de aceptación**

- **Given** estoy en Música,  
**When** añado una URL o ID de lista válida de Spotify,  
**Then** la lista queda guardada localmente con nombre y servicio.
- **Given** tengo listas guardadas,  
**When** selecciono una como activa,  
**Then** se muestra en Inicio / Enfoque y se recuerda como última utilizada.
- **Given** selecciono una lista,  
**When** elijo abrirla externamente,  
**Then** el sistema abre Spotify (aplicación o web) con esa lista.

### HU-16 — Controles de reproducción avanzados (POST)

**Como** usuario,  
**quiero** reproducir, pausar, cambiar de pista y ajustar volumen desde la app,  
**para** no salir del flujo de concentración.

**Criterios de aceptación**

- **Given** hay integración OAuth/API disponible en una versión posterior,  
**When** uso los controles,  
**Then** las acciones se delegan a Spotify según capacidades de la API y permisos del usuario.
- Fuera de alcance del MVP (solo enlace / selección local).

### HU-17 — YouTube Music (POST)

**Como** usuario,  
**quiero** conectar YouTube Music de forma análoga a Spotify,  
**para** usar mis listas preferidas de ese servicio.

**Criterios de aceptación**

- Posterior al MVP; el objetivo de producto lo contempla, la versión inicial no lo exige.

---

## Épica E4 — Estadísticas y racha

### HU-18 — Estadísticas básicas (MVP)

**Como** usuario,  
**quiero** ver pomodoros y tiempo de enfoque por día, semana y mes, además de tareas completadas,  
**para** evaluar mi constancia.

**Criterios de aceptación**

- **Given** he completado sesiones y tareas,  
**When** abro Estadísticas,  
**Then** veo totales de pomodoros, tiempo de enfoque y tareas completadas en los rangos día/semana/mes.
- **Given** hay etiquetas y prioridades,  
**When** consulto distribución,  
**Then** veo un desglose básico por etiqueta y prioridad.

### HU-19 — Racha diaria (MVP)

**Como** usuario,  
**quiero** ver mi racha de días consecutivos con al menos un pomodoro completado,  
**para** mantenerme motivado.

**Criterios de aceptación**

- **Given** completé al menos un pomodoro hoy y también ayer (y días previos consecutivos),  
**When** miro el indicador de racha en la cabecera,  
**Then** muestra el número correcto de días.
- **Given** un día sin pomodoros completados rompe la secuencia,  
**When** consulto la racha al día siguiente de un hueco,  
**Then** la racha se reinicia según la regla documentada.

---

## Épica E5 — Configuración, idioma y experiencia de escritorio

### HU-20 — Configuración de sonidos y notificaciones (MVP)

**Como** usuario,  
**quiero** activar o desactivar sonidos y notificaciones,  
**para** adaptar la app a mi entorno.

**Criterios de aceptación**

- **Given** estoy en Configuración,  
**When** cambio preferencias de sonido/notificación,  
**Then** se persisten localmente y afectan a los siguientes eventos.

### HU-21 — Idioma de la interfaz (MVP)

**Como** usuario,  
**quiero** seleccionar el idioma (p. ej. ES),  
**para** usar la aplicación en mi idioma preferido.

**Criterios de aceptación**

- **Given** cambio el idioma en la cabecera o Configuración,  
**When** confirmo,  
**Then** los textos principales de la UI se muestran en ese idioma (al menos español en MVP; otros idiomas POST si aplica).

### HU-22 — Persistencia local al cerrar la app (MVP)

**Como** usuario,  
**quiero** que mis tareas, ajustes e historial se conserven en el dispositivo,  
**para** continuar donde lo dejé al reabrir Electron.

**Criterios de aceptación**

- **Given** creo datos y cierro la aplicación,  
**When** la vuelvo a abrir,  
**Then** tareas, configuración, listas guardadas e historial siguen disponibles sin cuenta de usuario.

---

## Épica E6 — Servidor MCP para asistentes de IA

### HU-23 — Listar tareas vía MCP (MVP)

**Como** usuario que conecta un asistente de IA (Claude, ChatGPT, Cursor, etc.),  
**quiero** que el asistente liste mis tareas a través de MCP,  
**para** consultar el estado del trabajo sin abrir manualmente cada detalle en la UI.

**Criterios de aceptación**

- **Given** el servidor MCP está activo y el cliente está conectado,  
**When** el asistente invoca la tool de listado,  
**Then** recibe las tareas del almacén local (id, título, estado, prioridad, fecha límite, etiquetas).
- **Given** el asistente envía filtros opcionales (estado, prioridad),  
**When** lista,  
**Then** el resultado respeta esos filtros.
- **Given** el MCP está desactivado en Configuración,  
**When** un cliente intenta conectar o invocar tools,  
**Then** no obtiene acceso a los datos.

### HU-24 — Agregar tarea vía MCP (MVP)

**Como** usuario con un asistente conectado,  
**quiero** que pueda crear tareas por MCP,  
**para** capturar pendientes desde el chat sin cambiar de contexto.

**Criterios de aceptación**

- **Given** el MCP está activo,  
**When** el asistente crea una tarea con título válido (y campos opcionales),  
**Then** la tarea se persiste en SQLite y aparece en la UI de Electron al refrescar/escuchar cambios.
- **Given** el título está vacío,  
**When** se invoca la tool,  
**Then** la operación falla con un error claro y no se crea registro.

### HU-25 — Modificar fecha límite vía MCP (MVP)

**Como** usuario con un asistente conectado,  
**quiero** que pueda cambiar la fecha límite de una tarea por MCP,  
**para** replanificar plazos desde la conversación.

**Criterios de aceptación**

- **Given** existe una tarea con id conocido,  
**When** el asistente actualiza `due_date` (fecha `YYYY-MM-DD` o null para quitarla),  
**Then** el cambio se guarda, se actualiza `updated_at` y es visible en la UI.
- **Given** el id no existe,  
**When** se invoca la tool,  
**Then** se devuelve error de no encontrado.

### HU-26 — Extender el MCP con nuevas tools sin reescribir el núcleo (MVP)

**Como** desarrollador del producto,  
**quiero** un MCP organizado por capas con registro de tools,  
**para** añadir nuevas capacidades (p. ej. cambiar estado, iniciar pomodoro) registrando una tool y reutilizando servicios existentes.

**Criterios de aceptación**

- **Given** la arquitectura en capas (transporte, protocolo, registro de tools, dominio, persistencia),  
**When** se añade una nueva tool,  
**Then** solo se requiere definir el esquema/handler en el registro y delegar al servicio de dominio correspondiente, sin modificar el transporte ni el acceso a SQLite.
- **Given** UI e IPC ya usan `TaskService`,  
**When** el MCP opera tareas,  
**Then** usa el mismo `TaskService` (una sola fuente de reglas de negocio).

---

## Resumen MVP


| ID            | Historia                                               | Épica |
| ------------- | ------------------------------------------------------ | ----- |
| HU-01 … HU-06 | Temporizador e historial                               | E1    |
| HU-07 … HU-14 | Tareas y exportación                                   | E2    |
| HU-15         | Listas Spotify por enlace                              | E3    |
| HU-18, HU-19  | Estadísticas y racha                                   | E4    |
| HU-20 … HU-22 | Configuración y datos locales                          | E5    |
| HU-23 … HU-26 | Servidor MCP (listar, crear, due date, extensibilidad) | E6    |


**Fuera de MVP:** HU-16 (controles API), HU-17 (YouTube Music).