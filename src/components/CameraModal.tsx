import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/image'
import { sendIntake, type Receipt } from '../lib/api'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (receipt: Receipt) => void
}

export default function CameraModal({ isOpen, onClose, onSuccess }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isOpen) {
      // Останавливаем камеру при закрытии
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      return
    }

    const start = async () => {
      try {
        setError('')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Нет доступа к камере')
      }
    }

    start()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [isOpen])

  const capture = async () => {
    if (!videoRef.current) return
    if (!videoRef.current.videoWidth) {
      setError('Камера ещё не готова')
      return
    }
    setBusy(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Не удалось сделать снимок')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
      )
      if (!blob) throw new Error('Камера не вернула снимок')

      const compressed = await compressImage(blob)
      const receipt = (await sendIntake({
        type: 'receipt',
        imageBase64: compressed,
      })) as Receipt

      // Останавливаем камеру
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      onSuccess(receipt)
      onClose()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Ошибка отправки')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#f1f5f9' }}>📸 Сфотографировать чек</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {error && (
          <p className="error" style={{ margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn ghost"
            onClick={onClose}
            disabled={busy}
            style={{ flex: 1 }}
          >
            Отмена
          </button>
          <button
            className="btn"
            onClick={capture}
            disabled={busy}
            style={{ flex: 2 }}
          >
            {busy ? 'Отправляем…' : 'Сделать фото'}
          </button>
        </div>
      </div>
    </div>
  )
}

