import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Receipt } from '../lib/api'

export default function Home() {
  const [saved, setSaved] = useState<Receipt | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const raw = localStorage.getItem('4buy_last_receipt')
    if (!raw) return
    try {
      setSaved(JSON.parse(raw))
    } catch {
      setSaved(null)
    }
  }, [])

  return (
    <div className="grid">
      <div className="card gradient-card">
        <p className="muted">n8n webhook</p>
        <h1 className="title">4buy Scanner</h1>
        <p className="muted">Сканируй чек или товар, отправляем в n8n за секунды.</p>
        <div className="chips" style={{ marginTop: 10 }}>
          <span className="tag">Camera</span>
          <span className="tag">PWA</span>
          <span className="tag">QR</span>
        </div>
      </div>

      <div className="card actions">
        <div className="action-tile">
          <div className="action-info">
            <strong>Scan QR</strong>
            <span className="muted">Моментально читаем QR чека</span>
          </div>
          <Link className="btn" to="/scan-qr">
            Открыть
          </Link>
        </div>
        <div className="action-tile">
          <div className="action-info">
            <strong>Photo Receipt</strong>
            <span className="muted">Фото бумажного чека → n8n</span>
          </div>
          <Link className="btn" to="/photo-receipt">
            Снять
          </Link>
        </div>
        <div className="action-tile">
          <div className="action-info">
            <strong>Photo Product</strong>
            <span className="muted">Распознаём brand/product/category</span>
          </div>
          <Link className="btn" to="/photo-product">
            Снять
          </Link>
        </div>
      </div>

      {saved ? (
        <div className="card">
          <div className="action-info">
            <strong>Последний сохранённый чек</strong>
            <span className="muted">
              {saved.store?.name} • {new Date(saved.datetime).toLocaleString()}
            </span>
          </div>
          <div className="footer-actions">
            <button
              className="btn ghost"
              onClick={() => navigate('/receipt', { state: { receipt: saved } })}
            >
              Открыть чек
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}


