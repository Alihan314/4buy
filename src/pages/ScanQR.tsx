import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QrScanner from '../components/QrScanner'
import { sendIntake, type Receipt } from '../lib/api'

export default function ScanQR() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Инициализация камеры...')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleScanSuccess = async (qrText: string) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setStatus('Отправляем в n8n...')
    setError('')

    try {
      const result = await sendIntake({ type: 'qr', qrText })
      
      // Проверяем, что это receipt (может быть ProductRecognition)
      if ('receipt_id' in result) {
        const receiptData = result as Receipt
        setReceipt(receiptData)
        setStatus('Чек получен!')
        
        // Переходим на страницу просмотра чека
        setTimeout(() => {
          navigate('/receipt', { state: { receipt: receiptData } })
        }, 500)
      } else {
        setError('Получен неожиданный формат ответа')
        setIsProcessing(false)
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError(err instanceof Error ? err.message : 'Не удалось отправить запрос')
      setStatus('Попробуйте снова')
      setIsProcessing(false)
    }
  }

  const handleScanError = (errorMessage: string) => {
    setError(errorMessage)
    setStatus('Ошибка доступа к камере')
  }

  return (
    <div className="grid">
      <a className="nav-back" href="/">
        ← Назад
      </a>
      
      <div className="card">
        <QrScanner onScanSuccess={handleScanSuccess} onError={handleScanError} />
      </div>

      {status && !receipt && (
        <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          {status}
        </p>
      )}

      {error && (
        <p className="error" style={{ marginTop: 8, textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Отображение результата прямо на странице (если нужно) */}
      {receipt && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="action-info">
            <strong>Чек получен!</strong>
            <span className="muted">
              {receipt.store.name} • {receipt.store.address}
            </span>
            <span className="muted">
              {new Date(receipt.datetime).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
