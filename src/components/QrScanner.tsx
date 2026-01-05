import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface QrScannerProps {
  onScanSuccess: (qrText: string) => void
  onError?: (error: string) => void
}

export default function QrScanner({ onScanSuccess, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScannedRef = useRef<string>('')
  const scanningRef = useRef(false)
  const isScanningActiveRef = useRef(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const codeReader = new BrowserMultiFormatReader()
    codeReaderRef.current = codeReader

    const startScanning = async () => {
      try {
        setError('')
        setIsScanning(true)

        // Запрашиваем камеру с задней камерой и автофокусом
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        streamRef.current = stream
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')

        await video.play()

        // Continuous scanning с использованием decodeFromVideoDevice
        const scanCallback = (result: any, error: any) => {
          if (result && isScanningActiveRef.current) {
            const qrText = result.getText()
            
            // Предотвращаем повторные отправки одного и того же QR
            if (qrText && qrText !== lastScannedRef.current) {
              lastScannedRef.current = qrText
              isScanningActiveRef.current = false
              
              // Останавливаем камеру
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
                streamRef.current = null
              }
              
              setIsScanning(false)
              scanningRef.current = false
              
              onScanSuccess(qrText)
            }
          }
          
          if (error && isScanningActiveRef.current) {
            // Игнорируем ошибки "NotFound" - это нормально, просто QR не найден в кадре
            const errorName = error?.name || ''
            if (errorName !== 'NotFoundException' && errorName !== 'NotFoundError') {
              console.warn('Scan error:', error)
            }
          }
        }

        // Запускаем continuous scanning
        codeReader.decodeFromVideoDevice(undefined, video, scanCallback)
        
        // Сохраняем флаг для очистки
        scanningRef.current = true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Не удалось получить доступ к камере'
        setError(errorMessage)
        setIsScanning(false)
        onError?.(errorMessage)
      }
    }

    startScanning()

    return () => {
      // Очистка при размонтировании
      isScanningActiveRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      scanningRef.current = false
    }
  }, [onScanSuccess, onError])

  return (
    <div className="qr-scanner-container">
      <div className="camera">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        
        {/* Overlay с рамкой сканирования */}
        <div className="qr-overlay">
          <div className="qr-overlay-frame">
            {/* Анимированная линия */}
            <div className="qr-overlay-line"></div>
          </div>
          <div className="qr-overlay-corners">
            <div className="qr-corner qr-corner-tl"></div>
            <div className="qr-corner qr-corner-tr"></div>
            <div className="qr-corner qr-corner-bl"></div>
            <div className="qr-corner qr-corner-br"></div>
          </div>
        </div>
      </div>
      
      {error && (
        <p className="error" style={{ marginTop: 12, textAlign: 'center' }}>
          {error}
        </p>
      )}
      
      {isScanning && !error && (
        <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          Наведите камеру на QR-код
        </p>
      )}
    </div>
  )
}

