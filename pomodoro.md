# Entidad Pomodoro (Sesión)

Representa un periodo del temporizador (enfoque o descanso) que puede asociarse opcionalmente a una Task.

## Atributos

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| `id` | Integer | Identificador único |
| `period_type` | Enum | `focus` \| `short_break` \| `long_break` |
| `started_at` | String | Inicio ISO-8601 UTC |
| `ended_at` | String? | Fin ISO-8601 UTC |
| `duration_ms` | Integer | Duración efectiva (ms) |
| `completed` | Boolean | `true` si llegó a 00:00 |
| `task_id` | Integer? | FK opcional a Task (relevante en `focus`) |

## Relaciones

- **0..\* Pomodoro → 0..1 Task:** asociación opcional; en MVP se persiste al completar (`completed = true`).

## Diagrama UML de objetos

Mismo escenario que en [task.md](task.md): dos focos ligados a una tarea y un descanso sin tarea.

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
