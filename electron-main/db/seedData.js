const SEED_TAGS = ['Idiomas', 'Dev', 'Organización', 'Diseño', 'Lectura']

const SEED_TASKS = [
  {
    title: 'Estudiar inglés',
    status: 'in_progress',
    priority: 'high',
    estimated: 4,
    completed: 2,
    accumulatedMs: 23 * 60 * 1000,
    impact: 4,
    urgency: 4,
    effort: 2,
    dependencies: 2,
    risk: 3,
    score: 11.0,
    tag: 'Idiomas',
    isActive: true
  },
  {
    title: 'Revisar documentación de API',
    status: 'todo',
    priority: 'medium',
    estimated: 2,
    completed: 1,
    accumulatedMs: 15 * 60 * 1000,
    impact: 3,
    urgency: 3,
    effort: 3,
    dependencies: 2,
    risk: 2,
    score: 4.33,
    tag: 'Dev'
  },
  {
    title: 'Escribir resumen semanal',
    status: 'todo',
    priority: 'low',
    estimated: 2,
    completed: 2,
    accumulatedMs: 45 * 60 * 1000,
    impact: 2,
    urgency: 2,
    effort: 3,
    dependencies: 1,
    risk: 1,
    score: 1.67,
    tag: 'Organización'
  },
  {
    title: 'Preparar presentación cliente',
    status: 'todo',
    priority: 'high',
    estimated: 3,
    completed: 0,
    accumulatedMs: 0,
    impact: 5,
    urgency: 4,
    effort: 2,
    dependencies: 3,
    risk: 4,
    score: 16.0,
    tag: 'Diseño'
  },
  {
    title: 'Lectura técnica capítulo 4',
    status: 'done',
    priority: 'medium',
    estimated: 2,
    completed: 2,
    accumulatedMs: 30 * 60 * 1000,
    impact: 3,
    urgency: 2,
    effort: 2,
    dependencies: 1,
    risk: 1,
    score: 3.5,
    tag: 'Lectura'
  }
]

const SEED_PLAYLISTS = [
  {
    service: 'youtube',
    name: 'Lofi Girl — Beats to relax/study to',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    externalId: 'jfKfPfyJRdk',
    isDefault: true
  },
  {
    service: 'youtube',
    name: 'Deep Focus — Ambient Study Music',
    url: 'https://www.youtube.com/watch?v=WPni755-Krg',
    externalId: 'WPni755-Krg'
  },
  {
    service: 'youtube',
    name: 'Synthwave Radio — Chill Beats',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    externalId: '4xDzrJKXOOY'
  },
  {
    service: 'spotify',
    name: 'Deep Focus Ambient — Midnight Rain',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY',
    externalId: '37i9dQZF1DX3Ogo9pFvBkY'
  },
  {
    service: 'spotify',
    name: 'Peaceful Piano',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
    externalId: '37i9dQZF1DX4sWSpwq3LiO'
  }
]

module.exports = { SEED_TAGS, SEED_TASKS, SEED_PLAYLISTS }
