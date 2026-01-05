import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendReceiptPhoto } from '../lib/api'
import type { Receipt } from '../lib/api'

export default function PhotoReceipt() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const navigate = useNavigate()

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
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Не удалось сделать снимок')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      // Получаем blob напрямую из canvas (без сжатия, так как отправляем multipart)
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
      )
      if (!blob) throw new Error('Камера не вернула снимок')

      // Пробуем получить receipt_id из localStorage (если был QR сканирован ранее)
      const receiptId = localStorage.getItem('4buy_current_receipt_id')

      // Используем ту же функцию sendReceiptPhoto, что и в CameraModal
      // Отправляем type: "receipt_photo" с multipart/form-data
      const receipt: Receipt = await sendReceiptPhoto(blob, receiptId)
      
      setPreview(URL.createObjectURL(blob))
      navigate('/receipt', { state: { receipt } })
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
              <img src={preview} alt="Снимок чека" />
            </div>
          ) : null}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  )
}

