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
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev.slice(-4), `[${timestamp}] ${message}`])
    console.log(message)
  }

  const handleScanSuccess = async (qrText: string) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setStatus('Отправляем в n8n...')
    setError('')
    addLog(`QR отсканирован: ${qrText.substring(0, 50)}...`)

    try {
      addLog('Отправка запроса в /api/intake...')
      const result = await sendIntake({ type: 'qr', qrText })
      addLog('Ответ получен от API')
      
      // Проверяем, что это receipt (может быть ProductRecognition)
      if ('receipt_id' in result) {
        const receiptData = result as Receipt
        setReceipt(receiptData)
        setStatus('Чек получен!')
        const storeName = receiptData.store_name ?? 'Магазин будет определён после загрузки фото чека'
        addLog(`Чек получен: ${storeName}`)
        
        // Переходим на страницу просмотра чека
        setTimeout(() => {
          navigate('/receipt', { state: { receipt: receiptData } })
        }, 500)
      } else {
        setError('Получен неожиданный формат ответа')
        addLog('Ошибка: неожиданный формат ответа')
        setIsProcessing(false)
      }
    } catch (err) {
      console.error('Scan error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Не удалось отправить запрос'
      setError(errorMsg)
      setStatus('Попробуйте снова')
      addLog(`Ошибка: ${errorMsg}`)
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

      {/* Debug logs для отладки на телефоне */}
      {debugLogs.length > 0 && (
        <div className="card" style={{ marginTop: 12, padding: 8, fontSize: '11px', maxHeight: '150px', overflow: 'auto' }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Debug Logs:</strong>
          {debugLogs.map((log, i) => (
            <div key={i} style={{ color: '#94a3b8', marginBottom: 2 }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Отображение результата прямо на странице (если нужно) */}
      {receipt && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="action-info">
            <strong>Чек получен!</strong>
            <span className="muted">
              {receipt.store_name ?? 'Магазин будет определён после загрузки фото чека'}
              {receipt.store_address && ` • ${receipt.store_address}`}
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
