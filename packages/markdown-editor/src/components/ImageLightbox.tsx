import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut } from '@mypartner/common/dependencies'

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(5, +(z * 1.25).toFixed(2)))
      if (e.key === '-') setZoom(z => Math.max(0.25, +(z / 1.25).toFixed(2)))
      if (e.key === '0') setZoom(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.max(0.25, Math.min(5, +(z * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 8,
          padding: '4px 6px'
        }}
      >
        <button
          style={{ color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 4 }}
          title="Zoom out (-)"
          onClick={() => setZoom(z => Math.max(0.25, +(z / 1.25).toFixed(2)))}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums', padding: '4px 2px' }}
          title="Reset zoom (0)"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          style={{ color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 4 }}
          title="Zoom in (+)"
          onClick={() => setZoom(z => Math.min(5, +(z * 1.25).toFixed(2)))}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
        <button
          style={{ color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 4 }}
          title="Close (Esc)"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: 'block',
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease',
          borderRadius: 8,
          boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          cursor: zoom > 1 ? 'zoom-out' : 'zoom-in'
        }}
        onClick={(e) => {
          e.stopPropagation()
          setZoom(z => z > 1 ? 1 : 2)
        }}
      />

      {alt && (
        <p style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 13,
          textAlign: 'center',
          maxWidth: '60ch',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {alt}
        </p>
      )}
    </div>,
    document.body
  )
}
