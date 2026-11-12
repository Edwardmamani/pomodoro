export class NativePlaylistLoader {
  static async load(engine, parsed, autoplay) {
    const token = ++engine._loadToken
    try {
      await engine.driver.stopForLoad()
      engine.loadedVideoId = null
    } catch { /* ignore */ }

    try {
      if (parsed.playlistId) {
        const res = await window.pomodoroAPI.music.fetchPlaylistTracks(parsed.playlistId)
        if (token !== engine._loadToken) return
        if (res?.ok && Array.isArray(res.data?.tracks) && res.data.tracks.length > 0) {
          engine.tracks = res.data.tracks.map((t, idx) => ({ ...t, index: idx }))
          engine.playlistIds = engine.tracks.map((t) => t.videoId)
          const found = parsed.videoId ? engine.playlistIds.indexOf(parsed.videoId) : -1
          const startIdx = found >= 0 ? found : 0
          engine.currentIndex = startIdx
          engine._updateCurrentTrackMetadata(engine.tracks[startIdx])
          engine.options.onTrackChange?.()
          engine.options.onStateChange?.({ data: 5 })
          if (autoplay) await engine.playVideoAt(startIdx)
          return
        }
      }

      if (parsed.videoId) {
        engine.tracks = [{ index: 0, videoId: parsed.videoId, title: '', author: '', duration: 0, thumbnailUrl: `https://i.ytimg.com/vi/${parsed.videoId}/mqdefault.jpg` }]
        engine.playlistIds = [parsed.videoId]
        engine.currentIndex = 0
        engine._updateCurrentTrackMetadata(engine.tracks[0])

        if (autoplay) {
          await engine.playVideoAt(0)
        } else {
          const streamRes = await window.pomodoroAPI.music.getAudioStream(parsed.videoId)
          if (token !== engine._loadToken || !streamRes?.ok || !streamRes.data) return
          const d = streamRes.data
          engine.tracks[0] = { index: 0, videoId: parsed.videoId, title: d.title, author: d.author, duration: d.duration, thumbnailUrl: d.thumbnailUrl }
          engine._updateCurrentTrackMetadata(engine.tracks[0])
          engine.options.onTrackChange?.()
          engine.options.onStateChange?.({ data: 5 })
        }
      }
    } catch (err) {
      console.warn('[YouTubeEngine] Error al cargar en modo nativo:', err)
    }
  }
}
