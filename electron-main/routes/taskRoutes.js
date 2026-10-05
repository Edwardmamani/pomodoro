const { Router } = require('../lib/router')
const tasks = require('../controllers/TaskController')

const router = Router()

router.handle('pomodoro:tasks:list', (e, filters) => tasks.list(e, filters))
router.handle('pomodoro:tasks:listTags', (e) => tasks.listTags(e))
router.handle('pomodoro:tasks:create', (e, input) => tasks.create(e, input))
router.handle('pomodoro:tasks:update', (e, id, input) =>
  tasks.update(e, id, input)
)
router.handle('pomodoro:tasks:setActive', (e, id) => tasks.setActive(e, id))
router.handle('pomodoro:tasks:delete', (e, id) => tasks.remove(e, id))
router.handle('pomodoro:tasks:export', (e, format, filters) =>
  tasks.export(e, format, filters)
)

module.exports = router
