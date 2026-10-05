const { Router } = require('../lib/router')
const notes = require('../controllers/NotesController')

const router = Router()

router.handle('pomodoro:notes:load', (e, taskId) => notes.load(e, taskId))
router.handle('pomodoro:notes:save', (e, taskId, content) =>
  notes.save(e, taskId, content)
)
router.handle('pomodoro:notes:pickAsset', (e, taskId) =>
  notes.pickAsset(e, taskId)
)
router.on('pomodoro:notes:mediaUrl', (e, payload) => notes.mediaUrl(e, payload))

module.exports = router
