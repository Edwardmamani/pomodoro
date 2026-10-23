# Documento de requisitos — Aplicación Focus (Cronómetro de Tareas con Priorización Vectorial)

## 1. Objetivo

Crear una aplicación de productividad de **escritorio (Electron)** con interfaz gráfica adaptada a los estándares de diseño de **Apple Human Interface Guidelines (macOS / iOS)**, centrada exclusivamente en un **cronómetro de enfoque progresivo** (eliminando completamente los ciclos e intervalos fijos de la técnica Pomodoro) y en un sistema matemático de **priorización vectorial de tareas**.

La aplicación permite a los usuarios concentrarse en tareas individuales acumulando su tiempo de trabajo real, organizar y ordenar automáticamente sus tareas mediante un vector de 5 variables ponderadas, y acompañar sus sesiones con listas de música de Spotify. Los datos se almacenan **localmente en el dispositivo** mediante SQLite. Además, expone un **servidor MCP (Model Context Protocol)** para que asistentes de IA (Claude, ChatGPT, Cursor, etc.) puedan operar sobre las tareas de forma programática.

## 2. Usuarios

- Personas que estudian, trabajan de forma independiente o gestionan proyectos técnicos/personales y prefieren medir su tiempo con un cronómetro flexible sin interrupciones arbitrarias de descansos obligatorios.
- Usuarios que requieren un criterio cuantitativo y riguroso para decidir qué tarea abordar primero basándose en impacto, urgencia, esfuerzo, dependencias y riesgo.
- Asistentes de IA conectados vía MCP, actuando en nombre del usuario local sobre el mismo almacén de tareas.

## 3. Principios de diseño (Apple Human Interface Guidelines)

La interfaz de usuario sigue de forma estricta los principios de diseño de **Apple macOS / iOS**:
- **Estética oscura y vibrancia traslúcida (*Glassmorphism*):** Fondos en `#000000` / `#0a0a0c`, capas con efecto vidrio reflectante (`backdrop-filter: blur(24px)`), bordes sutiles de 1px con brillo especular y sombras multicapa suaves.
- **Tipografía del sistema de Apple:** Uso de `SF Pro Display`, `SF Pro Text` y `SF Mono` con alineación tabular (`font-variant-numeric: tabular-nums`) para visualización fluida de tiempos y puntajes.
- **Acentos de color nativos de Apple:**
  - Verde Apple (`#30D158`) para acciones primarias de inicio/arranque y tareas completadas.
  - Naranja Apple (`#FF9F0A`) para pausas y advertencias de urgencia.
  - Azul Apple (`#0A84FF`) para enfoques, botones de acción y estado activo.
  - Rojo Apple (`#FF453A`) para riesgos críticos y tareas bloqueadas/canceladas.
- **Controles táctiles y minimalistas:** Botones de cronómetro redondos flotantes con doble anillo interior/exterior inspirados en la aplicación Reloj de Apple Watch / iOS, selectores segmentados (*Segmented Controls*) para variables y modales estilo *Apple Sheet*.

## 4. Funcionalidades principales

### Cronómetro de Enfoque (Stopwatch Engine)

- **Medición progresiva del tiempo:** Conteo ascendente en tiempo real de milisegundos, segundos, minutos y horas.
- **Controles estándar:** Iniciar, pausar, reanudar y reiniciar / detener el cronómetro.
- **Acreditación continua a la tarea activa:** Mientras el cronómetro corre, el tiempo acumulado de la tarea en curso se actualiza en vivo tramo a tramo. Si se detiene o pausa, el tiempo transcurrido queda registrado permanentemente en la tarea.
- **Anillo de progreso visual:** Indicador circular con trazado SVG brillante que pulsa armónicamente durante la sesión activa.
- **Sin intervalos forzados:** Se suprimen los descansos cortos/largos y alertas de fin de ciclo forzosas de Pomodoro; el usuario decide autónomamente el ritmo y duración de su bloque de trabajo.

### Priorización Vectorial de Tareas

Para priorizar tareas de manera objetiva, cada tarea es evaluada mediante un **vector de 5 variables**:

$$\vec{t} = [I, U, E, D, R]$$

Donde cada variable toma un valor numérico entero en la escala del **1 al 5**:
1. **$I$ (Impacto):** ¿Cuánto valor aporta completar esta tarea? (1 = Mínimo valor, 5 = Transformacional / Crítico).
2. **$U$ (Urgencia):** ¿Qué tan cerca está la fecha límite? (1 = Plazo lejano / Sin prisa, 5 = Inmediata / Vence hoy).
3. **$E$ (Esfuerzo):** ¿Cuántos recursos, tiempo o energía requiere? (1 = Mínimo esfuerzo, 5 = Gran complejidad / Alto esfuerzo). Se restringe a $E \ge 1$ para evitar indeterminaciones.
4. **$D$ (Dependencias):** ¿Otras tareas están bloqueadas por esta? (1 = Ninguna tarea dependiente, 5 = Bloquea múltiples entregables).
5. **$R$ (Riesgo):** ¿Qué pasa si NO lo hago ahora? (1 = Sin consecuencias graves, 5 = Consecuencias catastróficas).

#### Fórmula de Prioridad ($P$)

$$P = \frac{(I \times U) + (D \times R)}{E}$$

- **Criterio de ordenación:** La tarea con el puntaje $P$ mayor es la más importante. La lista de tareas pendientes se ordena de forma descendente por $P$.
- **Rango de puntuación:** Desde un mínimo de $0.40$ (cuando $I=1, U=1, D=1, R=1, E=5$) hasta un máximo de $50.00$ (cuando $I=5, U=5, D=5, R=5, E=1$).
- **Ajuste dinámico:** La UI permite ajustar los 5 componentes mediante controles segmentados y visualizar en tiempo real la variación del puntaje $P$ y su clasificación correspondiente (Alta: $P \ge 15$, Media: $6 \le P < 15$, Baja: $P < 6$).

### Gestión de tareas

Cada tarea incluye:
- Título obligatorio.
- Vector de priorización: `impact` ($I$), `urgency` ($U$), `effort` ($E$), `dependencies` ($D$), `risk` ($R$).
- Puntaje de prioridad calculado: `priority_score` ($P$).
- Tiempo acumulado dedicado (`accumulated_ms`).
- Estado:
  - Por hacer (`todo`)
  - En curso (`in_progress`)
  - Bloqueada (`blocked`)
  - Hecha (`done`)
  - Cancelada (`cancelled`)
- Fecha límite opcional (`due_date`).
- Etiquetas descriptivas (`tags`).
- Cuaderno de notas adjunto en formato Markdown (`note.md`).
- Fecha de creación y última actualización.

Acciones disponibles:
- Crear tareas configurando interactivamente el vector $\vec{t}$.
- Ajustar rápidamente los valores del vector mediante un popover interactivo en la tarjeta de la tarea.
- Iniciar el cronómetro de enfoque directamente sobre la tarea seleccionada.
- Filtrar por estado, rango de prioridad y etiquetas.
- Ordenar automáticamente por puntaje $P$ descendente.
- Exportar la lista de tareas en formato CSV o JSON, incluyendo los 5 parámetros del vector y la puntuación de prioridad.

### Acceso MCP para asistentes de IA

- Servidor MCP integrado por capas (transporte stdio → adaptador de protocolo → registro de tools → servicios de dominio → persistencia SQLite).
- Capacidad para listar tareas con su puntaje de prioridad vectorial y tiempo acumulado.
- Creación y actualización de tareas y plazos desde clientes MCP (Claude Desktop, Cursor, etc.).
- Compartición atómica de la base de datos local SQLite con la aplicación de escritorio.

### Listas de música (Spotify)

- Registrar URLs o URIs de listas de reproducción favoritas de Spotify.
- Seleccionar una lista activa para la sesión de enfoque.
- Apertura directa en el reproductor nativo o web de Spotify.

## 5. Reglas de negocio

1. **Prioridad matemática única:** El orden de las tareas activas se rige por su puntaje $P = \frac{(I \times U) + (D \times R)}{E}$. A mayor valor de $P$, mayor prioridad en la lista.
2. **Esfuerzo no nulo:** El parámetro Esfuerzo ($E$) nunca puede ser cero ($E \ge 1$), garantizando consistencia numérica.
3. **Exclusividad de tarea en curso:** Solo una tarea puede tener el estado "En curso" simultáneamente. Si se activa otra tarea, la anterior pasa a "Por hacer".
4. **Acumulación de tiempo de cronómetro:** Todo segundo medido por el cronómetro activo sobre una tarea se suma inmediatamente a su `accumulated_ms`. Si el cronómetro corre sin tarea asignada, el tiempo se cuenta en la sesión global pero no se atribuye a ninguna tarea.
5. **Tareas canceladas:** No pueden recibir tiempo del cronómetro a menos que sean reactivadas a "Por hacer" o "En curso".
6. **Tareas completadas:** Pueden reabrirse libremente; su tiempo acumulado histórico y su puntaje original de prioridad se conservan.

## 6. Alcance del MVP

- Aplicación de escritorio con Electron y persistencia SQLite local.
- Cronómetro de enfoque continuo con diseño Apple HIG.
- Vector de priorización $\vec{t} = [I, U, E, D, R]$ con cálculo de $P$ y ordenación automática.
- Editor de notas Markdown integrado por tarea con soporte de imágenes locales.
- Exportación de tareas a CSV y JSON con variables vectoriales.
- Servidor MCP por capas habilitable desde Configuración.
- Integración de listas de Spotify vía enlaces locales.
