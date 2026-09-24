# Entidad Task (Tarea)

Representa una unidad de trabajo que el usuario organiza y puede vincular a sesiones Pomodoro.

## Atributos

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| `id` | Integer | Identificador único |
| `title` | String | Título (obligatorio) |
| `status` | Enum | `blocked` \| `todo` \| `in_progress` \| `done` \| `cancelled` |
| `priority` | Enum | `high` \| `medium` \| `low` |
| `due_date` | String? | Fecha límite `YYYY-MM-DD` |
| `estimated_pomodoros` | Integer | Pomodoros estimados |
| `completed_pomodoros` | Integer | Pomodoros de enfoque completados |
| `accumulated_ms` | Integer | Tiempo de concentración acumulado (ms) |
| `created_at` | String | ISO-8601 UTC |
| `updated_at` | String | ISO-8601 UTC |

## Relaciones

- **1 Task → 0..\* Pomodoro:** una tarea puede tener muchas sesiones asociadas; al borrarse, las sesiones conservan historial con `task_id = null`.

## Diagrama UML de objetos

Escenario de ejemplo: tarea en curso con dos pomodoros de enfoque completados.

```mermaid
classDiagram
  direction LR

  class "t1: Task" as t1 {
    <<object>>
    id = 12
    title = "Estudiar vocabulario inglés"
    status = "in_progress"
    priority = "high"
    due_date = "2026-09-15"
    estimated_pomodoros = 4
    completed_pomodoros = 2
    accumulated_ms = 3000000
    created_at = "2026-09-10T14:00:00Z"
    updated_at = "2026-09-12T16:30:00Z"
  }

  class "p1: Pomodoro" as p1 {
    <<object>>
    id = 101
    period_type = "focus"
    started_at = "2026-09-12T15:00:00Z"
    ended_at = "2026-09-12T15:25:00Z"
    duration_ms = 1500000
    completed = true
  }

  class "p2: Pomodoro" as p2 {
    <<object>>
    id = 102
    period_type = "focus"
    started_at = "2026-09-12T16:00:00Z"
    ended_at = "2026-09-12T16:25:00Z"
    duration_ms = 1500000
    completed = true
  }

  class "p3: Pomodoro" as p3 {
    <<object>>
    id = 103
    period_type = "short_break"
    started_at = "2026-09-12T16:25:00Z"
    ended_at = "2026-09-12T16:30:00Z"
    duration_ms = 300000
    completed = true
  }

  t1 "1" <--o "0..*" p1 : asocia
  t1 <--o p2 : asocia
  note for p3 "Sin tarea (task_id = null)\ndescanso no exige vínculo"
```

**Notas del escenario**

- `t1` es la única tarea en curso (`in_progress`).
- `p1` y `p2` son instancias de Pomodoro de tipo `focus` vinculadas a `t1`; suman `completed_pomodoros = 2` y `accumulated_ms = 3_000_000` (50 min).
- `p3` es un descanso corto sin asociación a tarea.
