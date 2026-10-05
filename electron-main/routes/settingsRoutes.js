const { Router } = require('../lib/router')
const settings = require('../controllers/SettingsController')

const router = Router()

router.handle('pomodoro:settings:get', (e) => settings.get(e))
router.handle('pomodoro:settings:set', (e, partial) => settings.set(e, partial))
router.handle('pomodoro:settings:reset', (e) => settings.reset(e))

module.exports = router
