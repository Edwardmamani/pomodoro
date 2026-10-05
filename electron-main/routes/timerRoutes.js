const { Router } = require('../lib/router')
const timer = require('../controllers/TimerController')

const router = Router()

router.handle('pomodoro:timer:get', (e) => timer.get(e))
router.handle('pomodoro:timer:start', (e, opts) => timer.start(e, opts))
router.handle('pomodoro:timer:pause', (e) => timer.pause(e))
router.handle('pomodoro:timer:resume', (e) => timer.resume(e))
router.handle('pomodoro:timer:reset', (e) => timer.reset(e))
router.handle('pomodoro:timer:stop', (e) => timer.stop(e))
router.handle('pomodoro:timer:setMode', (e, periodType, opts) =>
  timer.setMode(e, periodType, opts)
)
router.handle('pomodoro:timer:setControlMode', (e, controlMode) =>
  timer.setControlMode(e, controlMode)
)

module.exports = router
