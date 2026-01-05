import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import workerSrc from 'qr-scanner/qr-scanner-worker.min.js?url'
import { useNavigate } from 'react-router-dom'
import { sendScan, type Receipt } from '../lib/api'

QrScanner.WORKER_PATH = workerSrc

export default function ScanQR() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanner, setScanner] = useState<QrScanner | null>(null)
  const [status, setStatus] = useState('Наведите камеру на QR')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  useEffect(() => {
    if (!videoRef.current) return
    const qr = new QrScanner(
      videoRef.current,
      async (result) => {
        if (busyRef.current) return
        busyRef.current = true
        setBusy(true)
        setStatus('Отправляем в n8n…')
        try {
          const receipt = (await sendScan({ mode: 'qr', qr_string: result.data })) as Receipt
          navigate('/receipt', { state: { receipt } })
        } catch (err) {
          console.error(err)
          setError(err instanceof Error ? err.message : 'Не удалось отправить')
          setStatus('Попробуйте снова')
          busyRef.current = false
          setBusy(false)
        }
      },
      { maxScansPerSecond: 1, preferredCamera: 'environment' },
    )

    qr
      .start()
      .then(() => setStatus('Сканируем...'))
      .catch((err) => setError(err?.message || 'Нет доступа к камере'))

    setScanner(qr)

    return () => {
      qr.stop()
      qr.destroy()
    }
  }, [navigate])

  return (
    <div className="grid">
      <a className="nav-back" href="/">
        ← Назад
      </a>
      <div className="card">
        <div className="camera">
          <video ref={videoRef} muted playsInline />
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          {status}
        </p>
        {error && <p className="error">{error}</p>}
        {scanner ? null : <p className="muted">Инициализация камеры...</p>}
      </div>
    </div>
  )
}

