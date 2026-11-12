const VOLUME_STORAGE_KEY = 'pomodoro.music.volume'
const DEFAULT_VOLUME = 75

export class MusicTrackSync {
  static loadStoredVolume() {
    try {
      const val = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
      if (!isNaN(val) && val >= 0 && val <= 100) return val
    } catch { /* ignore */ }
    return DEFAULT_VOLUME
  }

  static saveStoredVolume(val) {
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.round(val))) } catch { /* ignore */ }
  }

  static syncFromEngine(ytEngine, state) {
    if (!ytEngine || state.currentService.value !== 'youtube') return
    const data = ytEngine.getVideoData() || {}
    const ids = ytEngine.getPlaylist() || []
    const idx = ytEngine.getPlaylistIndex() || 0
    const engineTracks = typeof ytEngine.getTracks === 'function' ? ytEngine.getTracks() : []
    const dur = ytEngine.getDuration()

    if (dur > 0) state.duration.value = dur
    if (data.title) {
      state.currentTrack.value = { title: data.title, author: data.author || '', videoId: data.video_id || '', index: idx }
    }

    if (engineTracks.length > 0) {
      state.playlistTracks.value = engineTracks.map((t, i) => ({
        index: i, videoId: t.videoId, title: t.title || `Pista ${i + 1}`, author: t.author || '',
        duration: t.duration || 0, durationText: t.durationText || '',
        thumbnailUrl: t.thumbnailUrl || `https://img.youtube.com/vi/${t.videoId}/mqdefault.jpg`
      }))
    } else if (ids.length > 0) {
      const changed = state.playlistTracks.value.length !== ids.length || state.playlistTracks.value[0]?.videoId !== ids[0]
      if (changed) {
        state.playlistTracks.value = ids.map((id, i) => ({
          index: i, videoId: id, title: i === idx && data.title ? data.title : `Pista ${i + 1}`,
          author: i === idx && data.author ? data.author : '', thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
        }))
        MusicTrackSync.fetchTitlesForIds(ids, state.playlistTracks)
      } else if (state.playlistTracks.value[idx]) {
        if (data.title) state.playlistTracks.value[idx].title = data.title
        if (data.author) state.playlistTracks.value[idx].author = data.author
      }
    } else if (data.title) {
      state.playlistTracks.value = [{
        index: 0, videoId: data.video_id || '', title: data.title, author: data.author || '',
        thumbnailUrl: data.video_id ? `https://img.youtube.com/vi/${data.video_id}/mqdefault.jpg` : null
      }]
    }
  }

  static async fetchTitlesForIds(ids, playlistTracksRef) {
    if (!ids?.length || !window.pomodoroAPI?.music?.fetchTrackTitles) return
    try {
      const res = await window.pomodoroAPI.music.fetchTrackTitles(ids)
      if (res.ok && res.data) {
        playlistTracksRef.value.forEach((track) => {
          const info = res.data[track.videoId]
          if (info?.title) { track.title = info.title; if (info.author) track.author = info.author }
        })
      }
    } catch (err) {
      console.warn('Error al obtener títulos de pistas:', err)
    }
  }
}
