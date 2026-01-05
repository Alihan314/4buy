import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { reportIssue, type Receipt } from '../lib/api'

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

function shareText(receipt: Receipt) {
  const header = `${receipt.store.name} — ${new Date(receipt.datetime).toLocaleString()}`
  const items = receipt.items
    .map((i) => `${i.name} x${i.qty} = ${i.sum} ${receipt.currency}`)
    .join('\n')
  return `${header}\n${items}\nИтого: ${receipt.total} ${receipt.currency}`
}

export default function ReceiptView() {
  const location = useLocation()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState<Receipt | null>(
    (location.state as { receipt?: Receipt } | undefined)?.receipt ?? null,
  )
  const [saved, setSaved] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (receipt) return
    const raw = localStorage.getItem('4buy_last_receipt')
    if (!raw) return
    try {
      setReceipt(JSON.parse(raw))
    } catch {
      setReceipt(null)
    }
  }, [receipt])

  const handleSave = () => {
    if (!receipt) return
    localStorage.setItem('4buy_last_receipt', JSON.stringify(receipt))
    setSaved(true)
  }

  const handleShare = async () => {
    if (!receipt) return
    if (!navigator.share) {
      setFeedbackStatus('Web Share недоступен')
      return
    }
    try {
      await navigator.share({
        title: 'Electronic Receipt',
        text: shareText(receipt),
      })
      setFeedbackStatus('Поделились ✔')
    } catch (err) {
      setFeedbackStatus(err instanceof Error ? err.message : 'Не удалось поделиться')
    }
  }

  const handleReport = async () => {
    if (!receipt) return
    setFeedbackStatus('')
    setError('')
    try {
      await reportIssue(receipt.receipt_id, 'User reported issue from app')
      setFeedbackStatus('Отправили фидбек в n8n')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    }
  }

  if (!receipt) {
    return (
      <div className="grid">
        <p className="muted">Чек не найден. Сначала отсканируйте.</p>
        <button className="btn" onClick={() => navigate('/')}>
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="grid">
      <div className="card gradient-card">
        <div className="action-info">
          <strong>Electronic Receipt</strong>
          <span className="muted">
            {receipt.store.name} • {receipt.store.address}
          </span>
          <span className="muted">{new Date(receipt.datetime).toLocaleString()}</span>
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          <ul className="list">
            {receipt.items.map((item) => (
              <li className="item-row" key={`${item.name}-${item.sum}`}>
                <div>
                  <div>{item.name}</div>
                  <div className="small">
                    Qty {item.qty} · {formatMoney(item.price, receipt.currency)}
                  </div>
                </div>
                <strong>{formatMoney(item.sum, receipt.currency)}</strong>
              </li>
            ))}
          </ul>
          <div className="subtotal">
            <span>Итого</span>
            <span>{formatMoney(receipt.total, receipt.currency)}</span>
          </div>
          {receipt.raw?.confidence ? (
            <span className="badge">Confidence {(receipt.raw.confidence * 100).toFixed(0)}%</span>
          ) : null}
        </div>
        <div className="footer-actions">
          <button className="btn" onClick={handleSave}>
            {saved ? 'Сохранено' : 'Save'}
          </button>
          <button className="btn ghost" onClick={handleShare}>
            Share
          </button>
          <button className="btn ghost" onClick={handleReport}>
            Report issue
          </button>
          {feedbackStatus && <p className="muted">{feedbackStatus}</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  )
}


