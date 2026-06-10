import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function InsightModal({ title, insight, icon = '💡', accent = '#fbbf24' }) {
  const [open, setOpen] = useState(false)
  const overlayRef = useRef(null)

  
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) setOpen(false)
  }

  return (
    <>
      {}
      <button
        onClick={() => setOpen(true)}
        title="Ver insight deste gráfico"
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all hover:brightness-110 active:scale-95"
        style={{
          borderColor: `${accent}60`,
          color: accent,
          background: `${accent}14`,
        }}
      >
        {icon} Insight
      </button>

      {}
      {open && createPortal(
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border shadow-2xl p-6 flex flex-col gap-4"
            style={{
              background: '#1e293b',
              borderColor: `${accent}40`,
              boxShadow: `0 0 40px ${accent}20`,
            }}
          >
            {}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
                  style={{ background: `${accent}20` }}
                >
                  {icon}
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>
                    Insight do Gráfico
                  </p>
                  <p className="text-sm font-bold text-slate-100 leading-tight">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none mt-0.5 shrink-0"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {}
            <div className="h-px w-full" style={{ background: `${accent}30` }} />

            {}
            <div className="space-y-3">
              {insight.split('\n').map((line, i) =>
                line.trim() ? (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed">
                    {line}
                  </p>
                ) : null
              )}
            </div>

            {}
            <p className="text-[10px] text-slate-600 text-right">Pressione Esc ou clique fora para fechar</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
