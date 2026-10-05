const { Router } = require('../lib/router')
const streak = require('../controllers/StreakController')

const router = Router()

router.handle('pomodoro:streak:get', (e) => streak.get(e))

module.exports = router
