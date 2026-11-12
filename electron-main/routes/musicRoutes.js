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
router.handle('pomodoro:music:vlcPlay', (e, videoId) => music.vlcPlay(e, videoId))
router.handle('pomodoro:music:vlcPause', (e) => music.vlcPause(e))
router.handle('pomodoro:music:vlcResume', (e) => music.vlcResume(e))
router.handle('pomodoro:music:vlcStop', (e) => music.vlcStop(e))
router.handle('pomodoro:music:vlcSeek', (e, seconds) => music.vlcSeek(e, seconds))
router.handle('pomodoro:music:vlcSetVolume', (e, level) => music.vlcSetVolume(e, level))
router.handle('pomodoro:music:vlcGetStatus', (e) => music.vlcGetStatus(e))

module.exports = router
