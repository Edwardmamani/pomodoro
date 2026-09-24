# Documento de requisitos — Aplicación Pomodoro

## 1. Objetivo

Crear una aplicación de productividad de **escritorio (Electron)** basada en la técnica Pomodoro que permita a las personas concentrarse en tareas, organizar su trabajo y acompañar cada sesión con listas de música de YouTube Music o Spotify. Los datos se almacenan **localmente en el dispositivo** (sin cuentas ni sincronización en la nube en la versión inicial). La aplicación expone un **servidor MCP (Model Context Protocol)** para que asistentes de IA (Claude, ChatGPT, Cursor, etc.) puedan operar sobre las tareas de forma programática.

## 2. Usuarios

Personas que estudian, trabajan de forma independiente o gestionan proyectos personales y quieren combinar enfoque, tareas y música en una sola aplicación.

Asistentes de IA conectados vía MCP, actuando en nombre del usuario local sobre el mismo almacén de tareas.

## 3. Funcionalidades principales

### Temporizador Pomodoro

- Iniciar, pausar, reanudar y reiniciar un temporizador.
- Configuración inicial:
  - Trabajo: 25 minutos.
  - Descanso corto: 5 minutos.
  - Descanso largo: 15 minutos.
  - Descanso largo cada 4 pomodoros.
- Permitir personalizar las duraciones.
- Mostrar una notificación y señal sonora al finalizar cada periodo.
- Asociar una sesión Pomodoro opcionalmente a una tarea.
- Guardar el historial de sesiones completadas.

### Gestión de tareas

Cada tarea debe incluir:

- Título obligatorio.
- Tiempo que tomo esta tarea.
- Estado:
  - Bloqueado
  - Por hacer
  - En curso
  - Hecha
  - Cancelada
- Prioridad:
  - Alta
  - Media
  - Baja
- Fecha límite opcional.
- Una o más etiquetas.
- Fecha de creación y última actualización.
- Número de pomodoros estimados y completados.

Acciones disponibles:

- Crear, editar y eliminar tareas.
- Cambiar el estado de una tarea.
- Filtrar por estado, prioridad, etiqueta y fecha límite.
- Ordenar por prioridad, fecha límite o fecha de creación.
- Ver tareas vencidas y próximas a vencer.
- Marcar una tarea como hecha o cancelada.
- Iniciar un Pomodoro directamente desde una tarea.
- Exportar los datos de la lista de tareas (por ejemplo, CSV o JSON), respetando los filtros activos cuando existan.

### Acceso MCP para asistentes de IA

- Exponer un punto de acceso MCP sobre los datos locales de la aplicación.
- Permitir a clientes MCP compatibles:
  - Listar tareas (con filtros básicos).
  - Agregar tareas.
  - Modificar la fecha límite de una tarea.
- Arquitectura **por capas** (transporte → protocolo MCP → registro de tools → servicios de dominio → persistencia) para añadir nuevas tools sin reescribir el núcleo.
- El servidor MCP y la UI de Electron deben compartir la misma lógica de dominio y la misma base SQLite.
- El usuario puede activar o desactivar el acceso MCP desde Configuración.

### Listas de música

- Conectar una cuenta de Spotify.
- Añadir listas de reproducción favoritas a la aplicación.
- Seleccionar una lista antes o durante una sesión Pomodoro.
- Reproducir, pausar, cambiar de pista y ajustar volumen desde la aplicación, sujeto a las capacidades de cada servicio.
- Guardar la última lista utilizada.

## 6. Reglas de negocio

- Una tarea cancelada no puede registrar nuevos Pomodoros, salvo se cambien su estado.
- Una tarea hecha puede reabrirse cambiando su estado a “Por hacer” o “En curso”.
- Una tarea con fecha límite anterior al día actual y que no esté hecha o cancelada se considera vencida.
- Al completar un Pomodoro, se incrementa el contador de pomodoros completados de la tarea vinculada.
- Solo una tarea puede estar en curso.

## 7. Versión inicial recomendada (MVP)

- Aplicación de escritorio con Electron y persistencia local (SQLite en el dispositivo).
- Temporizador configurable.
- Creación y administración de tareas.
- Exportación de la lista de tareas.
- Estados, prioridades, fechas límite y etiquetas.
- Asociación entre Pomodoros y tareas.
- Estadísticas básicas y racha diaria.
- Integración inicial con Spotify mediante selección de listas o enlace externo.
- Servidor MCP por capas con tools: listar tareas, agregar tarea y actualizar fecha límite.

