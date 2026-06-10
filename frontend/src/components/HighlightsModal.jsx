import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const HIGHLIGHTS = {
  'T. Young':       'qVxfS0Y2yzE', // Trae Young Mixtape
  'S. Curry':       'eY2D-FjoA7w', // World's Greatest Stephen Curry Reel
  'J. Johnson':     'A5AS8JNyInc', // Joe Johnson Career Highlights
  'J. Holiday':     'lfDpPjncK8U', // Jrue Holiday 23-24 Season
  'J. Green':       'aurDi-kgmK0', // Jeff Green Highlight Reel
  'J. Smith':       '0PbMWkXJI0A', // Josh Smith Career Highlights
  'M. Williams':    'K_9gGorAfqI', // Mo Williams 52 pts Career High
  'G. Hill':        'u3mDx_6_UOk', // George Hill Highlight Mix
  'D. Wright':      'vrx-qcZT92c', // Delon Wright 22-23 Season
  'J. Richardson':  'a3jqf9RsmLA', // Josh Richardson Top Plays
}

export default function HighlightsModal({ playerName, onClose }) {
  const videoId = HIGHLIGHTS[playerName]
  const src = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : null

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(3,6,16,0.97)',
          border: '1px solid rgba(0,150,255,0.20)',
          borderRadius: 4,
          padding: '14px 14px 10px',
          width: 'min(720px, 92vw)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{
              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900,
              fontSize: 13, color: '#ffd54f', letterSpacing: '2px',
            }}>
              {playerName.toUpperCase()}
            </span>
            <span style={{
              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900,
              fontSize: 9, color: '#1a3a50', letterSpacing: '2px',
            }}>
              HIGHLIGHTS — NBA
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: "'ui-sans-serif', monospace", fontWeight: 900,
              fontSize: 10, letterSpacing: '1px',
              padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid rgba(0,180,255,0.2)', color: '#1a3a50',
              background: 'transparent',
            }}
          >
            ESC
          </button>
        </div>

        {/* player */}
        {src ? (
          <iframe
            src={src}
            title={`${playerName} highlights`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              aspectRatio: '16/9',
              border: '1px solid rgba(0,150,255,0.10)',
              borderRadius: 3,
              background: '#000',
            }}
          />
        ) : (
          <div style={{
            aspectRatio: '16/9', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            border: '1px solid rgba(0,150,255,0.10)', borderRadius: 3,
            background: 'rgba(0,0,0,0.4)',
          }}>
            <span style={{ fontFamily: "'ui-sans-serif', monospace", fontWeight: 900, fontSize: 10, color: '#1a3a50', letterSpacing: '1px' }}>
              VÍDEO NÃO DISPONÍVEL
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
