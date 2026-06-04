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
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const panStartRef = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0, moved: false })

  const clampPan = (nextPan: { x: number; y: number }, nextZoom = zoom) => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image || nextZoom <= 1) return { x: 0, y: 0 }

    const maxX = Math.max(0, (image.offsetWidth * nextZoom - container.clientWidth) / 2)
    const maxY = Math.max(0, (image.offsetHeight * nextZoom - container.clientHeight) / 2)

    return {
      x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPan.y))
    }
  }

  const updateZoom = (getNextZoom: (current: number) => number) => {
    setZoom(current => {
      const nextZoom = getNextZoom(current)
      setPan(currentPan => clampPan(currentPan, nextZoom))
      return nextZoom
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') updateZoom(z => Math.min(5, +(z * 1.25).toFixed(2)))
      if (e.key === '-') updateZoom(z => Math.max(0.25, +(z / 1.25).toFixed(2)))
      if (e.key === '0') updateZoom(() => 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, zoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      updateZoom(z => Math.max(0.25, Math.min(5, +(z * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoom])

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [src])

  useEffect(() => {
    const onResize = () => setPan(currentPan => clampPan(currentPan))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [zoom])

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    e.stopPropagation()
    if (zoom <= 1) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    panStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false
    }
    setIsPanning(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isPanning) return
    e.preventDefault()
    const nextPan = {
      x: panStartRef.current.panX + e.clientX - panStartRef.current.pointerX,
      y: panStartRef.current.panY + e.clientY - panStartRef.current.pointerY
    }

    if (Math.hypot(e.clientX - panStartRef.current.pointerX, e.clientY - panStartRef.current.pointerY) > 3) {
      panStartRef.current.moved = true
    }

    setPan(clampPan(nextPan))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isPanning) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsPanning(false)
  }

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
          onClick={() => updateZoom(z => Math.max(0.25, +(z / 1.25).toFixed(2)))}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, minWidth: 42, textAlign: 'center', fontVariantNumeric: 'tabular-nums', padding: '4px 2px' }}
          title="Reset zoom (0)"
          onClick={() => updateZoom(() => 1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          style={{ color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: 4 }}
          title="Zoom in (+)"
          onClick={() => updateZoom(z => Math.min(5, +(z * 1.25).toFixed(2)))}
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
        ref={imageRef}
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: 'block',
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease',
          borderRadius: 8,
          boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsPanning(false)}
        onClick={(e) => {
          e.stopPropagation()
          if (panStartRef.current.moved) return
          updateZoom(z => z > 1 ? 1 : 2)
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
