const { Router } = require('../lib/router')
const music = require('../controllers/MusicController')

const router = Router()

router.handle('pomodoro:music:list', (e) => music.list(e))
router.handle('pomodoro:music:getActive', (e) => music.getActive(e))
router.handle('pomodoro:music:select', (e, id) => music.select(e, id))
router.handle('pomodoro:music:open', (e) => music.open(e))
router.handle('pomodoro:music:add', (e, input) => music.add(e, input))
router.handle('pomodoro:music:delete', (e, id) => music.delete(e, id))
router.handle('pomodoro:music:fetchTrackTitles', (e, ids) =>
  music.fetchTrackTitles(e, ids)
)
router.handle('pomodoro:music:fetchPlaylistTracks', (e, playlistId) =>
  music.fetchPlaylistTracks(e, playlistId)
)
router.handle('pomodoro:music:getAudioStream', (e, videoId) =>
  music.getAudioStream(e, videoId)
)

module.exports = router
