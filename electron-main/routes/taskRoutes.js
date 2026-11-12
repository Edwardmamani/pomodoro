const { Router } = require('../lib/router')
const tasks = require('../controllers/TaskController')

const router = Router()

router.handle('pomodoro:tasks:list', (e, filters) => tasks.list(e, filters))
router.handle('pomodoro:tasks:listTags', (e) => tasks.listTags(e))
router.handle('pomodoro:tasks:create', (e, input) => tasks.create(e, input))
router.handle('pomodoro:tasks:update', (e, id, input, options) =>
  tasks.update(e, id, input, options)
)
router.handle('pomodoro:tasks:setActive', (e, id) => tasks.setActive(e, id))
router.handle('pomodoro:tasks:delete', (e, id, options) =>
  tasks.remove(e, id, options)
)
router.handle('pomodoro:tasks:getRoutine', (e, routineId) =>
  tasks.getRoutine(e, routineId)
)
router.handle('pomodoro:tasks:updateRoutine', (e, routineId, input) =>
  tasks.updateRoutine(e, routineId, input)
)
router.handle('pomodoro:tasks:export', (e, format, filters) =>
  tasks.export(e, format, filters)
)

module.exports = router
