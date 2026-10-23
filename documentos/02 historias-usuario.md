# Historias de usuario — Aplicación Focus (Cronómetro de Tareas con Priorización Vectorial)

**Producto:** aplicación de escritorio (Electron + Vue 3).  
**Actor principal:** usuario individual (estudiante, profesional técnico, investigador o creador).  
**Estilo visual:** Apple Human Interface Guidelines (macOS / iOS dark mode, tipografía SF, translucidez glassmorphism).  
**Referencias:** [01 requerimientos.md](01%20requerimientos.md), [03 diseño-arquitectura.md](03%20diseño-arquitectura.md), [04 diseño-base-datos.md](04%20diseño-base-datos.md).

## Leyenda de prioridad

| Etiqueta | Significado                    |
| -------- | ------------------------------ |
| MVP      | Incluida en la versión inicial |
| POST     | Posterior al MVP               |

---

## Épica E1 — Cronómetro de Enfoque (Stopwatch Engine)

### HU-01 — Iniciar y controlar el cronómetro (MVP)

**Como** usuario,  
**quiero** iniciar, pausar, reanudar y reiniciar el cronómetro de enfoque,  
**para** medir con precisión mi tiempo de trabajo continuo sin interrupciones forzosas.

**Criterios de aceptación**
- **Given** estoy en la pantalla principal y el cronómetro está detenido en `00:00:00`,  
  **When** pulso el botón circular verde "Iniciar",  
  **Then** el cronómetro comienza a incrementar el tiempo en milisegundos, segundos, minutos y horas, cambiando su estado a `running`.
- **Given** el cronómetro está en marcha,  
  **When** pulso el botón circular naranja "Pausar",  
  **Then** el conteo se detiene en el tiempo exacto actual y el estado pasa a `paused`.
- **Given** el cronómetro está en pausa,  
  **When** pulso "Reanudar",  
  **Then** el conteo continúa sumando tiempo sin reiniciar el valor previo.
- **Given** el cronómetro está en pausa o en marcha,  
  **When** pulso el botón circular "Reiniciar" o "Detener",  
  **Then** el tiempo transcurrido pendiente se acredita definitivamente a la tarea activa y el cronómetro vuelve a `00:00:00` en estado `idle`.

### HU-02 — Indicador visual de progreso circular Apple (MVP)

**Como** usuario,  
**quiero** observar un anillo de progreso circular y dígitos tabulares tipo reloj Apple,  
**para** percibir visualmente el avance de mi sesión de enfoque.

**Criterios de aceptación**
- **Given** el cronómetro está en marcha,  
  **When** miro el componente central,  
  **Then** veo un trazado circular SVG con iluminación de neón sutil que progresa suavemente cada segundo completado.
- **Given** transcurre el tiempo,  
  **When** se incrementan las horas, minutos y segundos,  
  **Then** los números se muestran en tipografía monoespaciada tabular (`SF Pro / SF Mono`), evitando saltos o desalineaciones visuales.

### HU-03 — Acreditación continua de tiempo a la tarea activa (MVP)

**Como** usuario,  
**quiero** que el tiempo medido por el cronómetro se sume automáticamente a mi tarea en curso,  
**para** mantener al día el esfuerzo real invertido en cada actividad.

**Criterios de aceptación**
- **Given** tengo una tarea activa seleccionada y arranco el cronómetro,  
  **When** el cronómetro avanza,  
  **Then** la tarjeta de la tarea activa refleja en vivo el tiempo acumulado anterior más el tramo actual en curso.
- **Given** cambio la tarea activa mientras el cronómetro está en marcha,  
  **When** se efectúa el cambio,  
  **Then** el tramo acumulado hasta ese instante se guarda en la tarea previa y los siguientes segundos se acreditan a la nueva tarea activa.
- **Given** detengo el cronómetro o cierro la aplicación,  
  **When** se pausa o reinicia,  
  **Then** el campo `accumulated_ms` en la base de datos almacena el total exacto de tiempo dedicado.

### HU-04 — Persistencia de sesiones en segundo plano (MVP)

**Como** usuario,  
**quiero** minimizar o enviar a segundo plano la aplicación sin que el cronómetro pierda sincronización,  
**para** trabajar en mis herramientas y editores habituales con confianza.

**Criterios de aceptación**
- **Given** el cronómetro está corriendo y minimizo la ventana de la aplicación,  
  **When** regreso y maximizo la ventana transcurrido cierto tiempo,  
  **Then** el tiempo mostrado coincide exactamente con el reloj de alta resolución del sistema (`performance.now()`), sin desfases por throttling del navegador.

---

## Épica E2 — Gestión de tareas con Priorización Vectorial

### HU-05 — Crear tarea con Vector de Priorización y Urgencia Dinámica (MVP)

**Como** usuario,  
**quiero** registrar una tarea evaluándola con un vector de 5 variables $\vec{t} = [I, U, E, D, R]$,  
**para** que la aplicación calcule automáticamente su urgencia según la fecha límite y su puntaje de prioridad $P$.

**Criterios de aceptación**
- **Given** pulso "Nueva tarea",  
  **When** se abre el modal estilo Apple Sheet,  
  **Then** puedo ingresar el título, fecha de finalización opcional, etiquetas y seleccionar con controles segmentados (1 al 5) los valores para $I$, $E$, $D$ y $R$.
- **Given** selecciono o modifico la fecha de finalización (`due_date`),  
  **When** cambia la fecha,  
  **Then** la urgencia $U$ se actualiza de forma automática e inmediata:
    - Vencida o vence hoy $\rightarrow U = 5$.
    - Vence mañana $\rightarrow U = 4$.
    - Vence en 2 a 3 días $\rightarrow U = 3$.
    - Vence en 4 a 7 días $\rightarrow U = 2$.
    - Vence en más de 7 días o sin fecha $\rightarrow U = 1$.
- **Given** veo el panel de variables,  
  **When** observo la fila de urgencia,  
  **Then** se visualiza un badge "Dinámica" junto con un texto explicativo del motivo del valor actual (ej. "Vence en 2d · U = 3").
- **Given** guardo la tarea con título válido,  
  **When** se confirma la creación,  
  **Then** se persiste en SQLite con su `urgency` calculada dinámicamente y su `priority_score` correspondiente, insertándose en la posición adecuada de la lista.

### HU-06 — Ordenación automática y Recálculo Diario de Urgencias (MVP)

**Como** usuario,  
**quiero** que mis tareas pendientes se ordenen automáticamente por puntaje $P$ y que sus urgencias se recalculen cada día,  
**para** que la lista refleje siempre el impacto del paso del tiempo hacia las fechas límite.

**Criterios de aceptación**
- **Given** cambia el día del calendario mientras la app está abierta o al iniciar el sistema,  
  **When** se detecta el nuevo día,  
  **Then** la aplicación recalcula la urgencia $U$ y el puntaje $P$ de todas las tareas abiertas según la nueva distancia temporal a su fecha de entrega.
- **Given** tengo múltiples tareas pendientes en estado "Por hacer",  
  **When** consulto la lista,  
  **Then** la primera tarea mostrada es la que posee el mayor valor de $P = \frac{(I \times U) + (D \times R)}{E}$.
- **Given** existe una tarea en estado "En curso",  
  **When** veo la lista,  
  **Then** la tarea activa se fija al inicio de las tareas abiertas para acceso rápido al cronómetro, seguida de las demás ordenadas por $P$ descendente.

### HU-07 — Ajuste dinámico del vector en la tarjeta (Apple Popover) (MVP)

**Como** usuario,  
**quiero** afinar las variables del vector directamente desde la tarjeta de la tarea,  
**para** reevaluar la prioridad de una tarea sin entrar en pantallas de edición completa.

**Criterios de aceptación**
- **Given** veo una tarea en la lista,  
  **When** hago clic en su badge de prioridad (que muestra el puntaje $P$),  
  **Then** se despliega un popover estilo Apple con los selectores segmentados para $I$, $U$, $E$, $D$ y $R$.
- **Given** abro el popover,  
  **When** miro el control de Urgencia $U$,  
  **Then** se indica que es dinámica y refleja la fecha de finalización actual de la tarea.
- **Given** cambio una variable (p. ej. Impacto o Riesgo),  
  **When** pulso la nueva opción,  
  **Then** el puntaje $P$ se recalcula al instante, se persiste en la base de datos y la posición de la tarea se reordena en la lista si corresponde.

### HU-08 — Editar y eliminar tareas con recálculo de urgencia (MVP)

**Como** usuario,  
**quiero** modificar detalles de una tarea o eliminarla,  
**para** mantener mi lista de trabajo actualizada y con prioridades vigentes.

**Criterios de aceptación**
- **Given** edito una tarea y cambio su fecha de finalización (`due_date`),  
  **When** se guarda la modificación,  
  **Then** la urgencia $U$ y el puntaje $P$ se recalculan automáticamente de acuerdo a la nueva fecha y se actualiza `updated_at`.
- **Given** pulso eliminar sobre una tarea,  
  **When** confirmo la acción,  
  **Then** la tarea se borra del sistema junto con sus etiquetas asociadas; las notas asociadas se limpian del disco.

### HU-09 — Estados de tarea (MVP)

**Como** usuario,  
**quiero** mover tareas entre Por hacer, En curso, Bloqueada, Hecha y Cancelada,  
**para** controlar el flujo del ciclo de vida de mi trabajo.

**Criterios de aceptación**
- **Given** una tarea en estado "Por hacer",  
  **When** selecciono "Poner en curso" o inicio el cronómetro sobre ella,  
  **Then** pasa a estado "En curso" (`in_progress`) y cualquier otra tarea previa en curso vuelve a "Por hacer".
- **Given** una tarea en curso o por hacer,  
  **When** la marco como "Hecha",  
  **Then** pasa al grupo de tareas completadas, conservando su tiempo acumulado total y su puntaje de prioridad.
- **Given** una tarea "Hecha",  
  **When** elijo reabrirla,  
  **Then** regresa a "Por hacer" con sus atributos intactos.

### HU-10 — Iniciar Cronómetro desde una tarea (MVP)

**Como** usuario,  
**quiero** iniciar el cronómetro directamente pulsando sobre una tarea,  
**para** comenzar mi sesión de concentración sin fricción.

**Criterios de aceptación**
- **Given** una tarea en la lista,  
  **When** pulso el botón de reproducción / inicio en su tarjeta,  
  **Then** dicha tarea se establece como activa y el cronómetro de la pantalla principal arranca a contar inmediatamente.

### HU-11 — Exportar tareas con métricas vectoriales (MVP)

**Como** usuario,  
**quiero** exportar la lista de tareas en formato CSV o JSON incluyendo los valores de su vector y puntuación,  
**para** respaldar mi información o procesarla en herramientas de análisis externas.

**Criterios de aceptación**
- **Given** estoy en el panel de tareas,  
  **When** pulso "Exportar" y selecciono CSV o JSON,  
  **Then** se abre el diálogo nativo del sistema para elegir la ubicación y nombre de archivo.
- **Given** se genera el archivo exportado,  
  **When** lo abro,  
  **Then** contiene las columnas `impact`, `urgency`, `effort`, `dependencies`, `risk`, `priority_score`, además de título, estado, tiempo acumulado en minutos/horas y etiquetas.

---

## Épica E3 — Cuaderno de Notas Markdown por Tarea

### HU-12 — Editor de notas Markdown con soporte de imágenes (MVP)

**Como** usuario,  
**quiero** disponer de un cuaderno de notas en formato Markdown vinculado a cada tarea,  
**para** documentar especificaciones, enlaces, comandos e insertar imágenes de referencia.

**Criterios de aceptación**
- **Given** selecciono una tarea y abro el panel de notas,  
  **When** escribo en formato Markdown,  
  **Then** el contenido se guarda automáticamente en `tasks/{id}/note.md`.
- **Given** arrastro o pego una imagen en el editor,  
  **When** se importa el archivo,  
  **Then** la imagen se copia en la subcarpeta `tasks/{id}/assets/` y se renderiza con el protocolo local seguro `mdmedia://`.

---

## Épica E4 — Música / Spotify

### HU-13 — Gestión de listas de reproducción Spotify (MVP)

**Como** usuario,  
**quiero** guardar listas de Spotify y seleccionar una para acompañar mi enfoque,  
**para** ambientar acústicamente mi espacio de trabajo.

**Criterios de aceptación**
- **Given** ingreso una URL válida de playlist o álbum de Spotify en el panel de música,  
  **When** la guardo,  
  **Then** queda registrada localmente y puede marcarse como playlist activa.
- **Given** una playlist seleccionada,  
  **When** pulso "Abrir en Spotify",  
  **Then** el sistema delega la apertura a la aplicación nativa de Spotify o al navegador web mediante el protocolo seguro del sistema.

---

## Épica E5 — Estadísticas y Racha

### HU-14 — Métricas de tiempo de enfoque (MVP)

**Como** usuario,  
**quiero** consultar el tiempo total medido por el cronómetro por día, semana y mes,  
**para** analizar objetivamente mi rendimiento y constancia.

**Criterios de aceptación**
- **Given** he acumulado tiempo con el cronómetro en diferentes tareas o sesiones,  
  **When** abro el panel de Estadísticas,  
  **Then** visualizo el total de horas/minutos dedicados y el número de tareas completadas según el intervalo temporal seleccionado.
- **Given** he completado al menos una sesión de enfoque cada día consecutivo,  
  **When** consulto el indicador de racha,  
  **Then** veo el contador de días consecutivos activo.

---

## Épica E6 — Servidor MCP para Asistentes de IA

### HU-15 — Operaciones sobre tareas con priorización vía MCP (MVP)

**Como** usuario que conecta un asistente de IA (Claude Desktop, Cursor, etc.),  
**quiero** que el asistente pueda listar, crear y actualizar tareas reconociendo su vector de priorización y tiempo medido,  
**para** delegar la organización y categorización inteligente de mi trabajo.

**Criterios de aceptación**
- **Given** el servidor MCP está habilitado y un cliente se conecta por stdio,  
  **When** el asistente invoca `tasks_list`,  
  **Then** recibe la lista ordenada con campos de impacto, urgencia, esfuerzo, dependencias, riesgo, `priority_score` y `accumulated_ms`.
- **Given** el asistente invoca `tasks_create`,  
  **When** provee los campos del vector o los deja por defecto,  
  **Then** la tarea se guarda calculando el `priority_score` automáticamente y se emite el evento para que la interfaz Electron se actualice en vivo.
- **Given** el asistente invoca `tasks_update_due_date`,  
  **When** envía la fecha límite,  
  **Then** se actualiza `due_date` y se reajusta el cálculo si procede.

---

## Resumen de Épicas y Alcance MVP

| ID            | Historia                                              | Épica | Estado |
| ------------- | ----------------------------------------------------- | ----- | ------ |
| HU-01 … HU-04 | Cronómetro de Enfoque, reloj Apple y acreditación     | E1    | MVP    |
| HU-05 … HU-11 | Tareas, vector $[I,U,E,D,R]$, fórmula $P$ y popover   | E2    | MVP    |
| HU-12         | Notas Markdown y assets de imagen                     | E3    | MVP    |
| HU-13         | Playlists de Spotify (enlace local)                   | E4    | MVP    |
| HU-14         | Métricas de tiempo y racha                            | E5    | MVP    |
| HU-15         | Servidor MCP por capas (tools con datos vectoriales)  | E6    | MVP    |