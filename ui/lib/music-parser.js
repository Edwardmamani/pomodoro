import { SpotifyUrlParser } from './spotify-parser.js'

export class MediaUrlParser {
  static parse(url = '', explicitService = null) {
    const cleanUrl = String(url || '').trim()
    if (!cleanUrl) return null
    const isSpotify = explicitService === 'spotify' || cleanUrl.includes('spotify.com') || cleanUrl.startsWith('spotify:')
    if (isSpotify) return SpotifyUrlParser.parse(cleanUrl)

    const isYouTube = explicitService === 'youtube' || cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')
    if (isYouTube || !explicitService) {
      const yt = MediaUrlParser.parseYouTube(cleanUrl)
      if (yt) return yt
    }
    return SpotifyUrlParser.parse(cleanUrl)
  }

  static parseYouTube(url = '') {
    const clean = String(url || '').trim()
    if (!clean) return null
    const playlistId = clean.match(/[?&]list=([a-zA-Z0-9_-]+)/)?.[1] || null
    const videoId =
      clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1] ||
      clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1] ||
      clean.match(/youtube\.com\/(?:embed|live|shorts|v)\/([a-zA-Z0-9_-]{11})/)?.[1] ||
      (/^[a-zA-Z0-9_-]{11}$/.test(clean) ? clean : null)

    if (!videoId && !playlistId) return null
    const isMusicDomain = clean.includes('music.youtube.com')
    const host = isMusicDomain ? 'music.youtube.com' : 'www.youtube.com'
    const canonicalUrl = playlistId
      ? `https://${host}/playlist?list=${playlistId}`
      : `https://${host}/watch?v=${videoId}`

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

  static formatTime(seconds = 0) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '00:00'
    const total = Math.floor(seconds)
    const hrs = Math.floor(total / 3600)
    const mins = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const secs = String(total % 60).padStart(2, '0')
    return hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`
  }
}

export const parseMediaUrl = MediaUrlParser.parse
export const parseYouTubeUrl = MediaUrlParser.parseYouTube
export const parseSpotifyUrl = SpotifyUrlParser.parse
export const formatTime = MediaUrlParser.formatTime
