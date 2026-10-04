import { createRouter, createWebHashHistory } from 'vue-router'
import AppShell from '@/views/AppShell.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      meta: { panel: 'tasks' }
    },
    {
      path: '/tarea/:taskId',
      component: AppShell,
      meta: { panel: 'task-edit' }
    },
    {
      path: '/configuracion',
      component: AppShell,
      meta: { panel: 'settings' }
    }
  ]
})

export default router
