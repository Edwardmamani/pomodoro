/**
 * Utilidades para parsear y formatear URLs y datos de reproducción de YouTube y Spotify.
 */

export function parseMediaUrl(url = '', explicitService = null) {
  const cleanUrl = String(url || '').trim()
  if (!cleanUrl) return null

  // Detección de servicio
  const isSpotify =
    explicitService === 'spotify' ||
    cleanUrl.includes('spotify.com') ||
    cleanUrl.startsWith('spotify:')

  const isYouTube =
    explicitService === 'youtube' ||
    cleanUrl.includes('youtube.com') ||
    cleanUrl.includes('youtu.be')

  if (isSpotify) {
    return parseSpotifyUrl(cleanUrl)
  }

  if (isYouTube || explicitService === 'youtube' || !explicitService) {
    const yt = parseYouTubeUrl(cleanUrl)
    if (yt) return yt
  }

  // Si no coincidió y se indicó spotify
  return parseSpotifyUrl(cleanUrl)
}

export function parseYouTubeUrl(url = '') {
  const clean = String(url || '').trim()
  if (!clean) return null

  let videoId = null
  let playlistId = null

  // 1. Extraer playlist list=
  const listMatch = clean.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (listMatch) {
    playlistId = listMatch[1]
  }

  // 2. Extraer videoId
  // Format: youtu.be/ID
  const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) {
    videoId = shortMatch[1]
  }

  // Format: youtube.com/watch?v=ID
  if (!videoId) {
    const watchMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
    if (watchMatch) videoId = watchMatch[1]
  }

  // Format: youtube.com/embed/ID o /live/ID o /shorts/ID
  if (!videoId) {
    const pathMatch = clean.match(/youtube\.com\/(?:embed|live|shorts|v)\/([a-zA-Z0-9_-]{11})/)
    if (pathMatch) videoId = pathMatch[1]
  }

  // Format: Si es solo un ID de 11 caracteres
  if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    videoId = clean
  }

  if (!videoId && !playlistId) {
    return null
  }

  const isPlaylistOnly = !videoId && !!playlistId
  const isMusicDomain = clean.includes('music.youtube.com')

  let canonicalUrl = clean
  if (playlistId) {
    canonicalUrl = isMusicDomain
      ? `https://music.youtube.com/playlist?list=${playlistId}`
      : `https://www.youtube.com/playlist?list=${playlistId}`
  } else if (videoId) {
    canonicalUrl = isMusicDomain
      ? `https://music.youtube.com/watch?v=${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`
  }

  return {
    service: 'youtube',
    type: playlistId ? 'playlist' : 'video',
    id: playlistId || videoId,
    videoId,
    playlistId,
    isMusicDomain,
    canonicalUrl,
    thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
    embedUrl: playlistId
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1&enablejsapi=1`
      : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`
  }
}

export function parseSpotifyUrl(url = '') {
  const clean = String(url || '').trim()
  if (!clean) return null

  let type = 'playlist'
  let id = null

  // Formato: https://open.spotify.com/(playlist|track|album|artist)/ID
  const match = clean.match(/spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/)
  if (match) {
    type = match[1]
    id = match[2]
  } else {
    // Formato URI: spotify:(playlist|track|album):ID
    const uriMatch = clean.match(/spotify:(playlist|track|album):([a-zA-Z0-9]+)/)
    if (uriMatch) {
      type = uriMatch[1]
      id = uriMatch[2]
    } else if (/^[a-zA-Z0-9]{22}$/.test(clean)) {
      id = clean
    }
  }

  if (!id) return null

  return {
    service: 'spotify',
    type,
    id,
    embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    appUrl: `spotify:${type}:${id}`
  }
}

export function formatTime(seconds = 0) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '00:00'
  }
  const total = Math.floor(seconds)
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60

  const paddedMins = String(mins).padStart(2, '0')
  const paddedSecs = String(secs).padStart(2, '0')

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`
  }
  return `${paddedMins}:${paddedSecs}`
}
