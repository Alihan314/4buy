import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/image'
import { sendScan, type ProductRecognition } from '../lib/api'

export default function PhotoProduct() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ProductRecognition | null>(null)

  useEffect(() => {
    let activeStream: MediaStream | null = null
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        activeStream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Нет доступа к камере')
      }
    }
    start()
    return () => {
      activeStream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = async () => {
    if (!videoRef.current) return
    if (!videoRef.current.videoWidth) {
      setError('Камера ещё не готова')
      return
    }
    setBusy(true)
    setError('')
    setResult(null)
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
      setPreview(compressed)

      const recognition = (await sendScan({
        mode: 'product',
        image_base64: compressed,
      })) as ProductRecognition
      setResult(recognition)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Ошибка отправки')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid">
      <a className="nav-back" href="/">
        ← Назад
      </a>
      <div className="card">
        <div className="camera">
          <video ref={videoRef} playsInline muted />
        </div>
        <div className="footer-actions">
          <button className="btn" onClick={capture} disabled={busy}>
            {busy ? 'Отправляем…' : 'Сделать фото'}
          </button>
          {preview ? (
            <div className="preview">
              <img src={preview} alt="Снимок товара" />
            </div>
          ) : null}
          {error && <p className="error">{error}</p>}
          {result ? (
            <div className="status">
              <div className="grid">
                <strong>Распознано</strong>
                <span>Brand: {result.brand || '—'}</span>
                <span>Product: {result.product || '—'}</span>
                <span>Category: {result.category || '—'}</span>
                {result.confidence ? (
                  <span className="badge">Confidence {(result.confidence * 100).toFixed(0)}%</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

