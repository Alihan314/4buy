import { useEffect, useRef, useState } from 'react'
import { sendReceiptPhoto, type Receipt } from '../lib/api'
import { compressImage } from '../lib/image'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (receipt: Receipt) => void
  receiptId: string | null
}

/**
 * Полноэкранная модалка для фотографирования чека
 * Использует multipart/form-data с type="receipt_photo" и receipt_id
 */
export default function CameraModal({ isOpen, onClose, onSuccess, receiptId }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Проверяем receipt_id при открытии модалки
  useEffect(() => {
    if (isOpen && !receiptId) {
      setError('Отсутствует receipt_id. Сначала отсканируйте QR-код чека.')
    } else {
      setError('')
    }
  }, [isOpen, receiptId])

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
    // Валидация receipt_id - обязательна для отправки фото
    if (!receiptId) {
      setError('Отсутствует receipt_id. Сначала отсканируйте QR-код чека.')
      return
    }

    if (!videoRef.current) return
    if (!videoRef.current.videoWidth) {
      setError('Камера ещё не готова. Подождите несколько секунд.')
      return
    }

    setBusy(true)
    setError('')

    try {
      // Создаём canvas и захватываем кадр с камеры
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Не удалось сделать снимок')

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      // Получаем blob из canvas (как в PhotoReceipt)
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
      )
      if (!blob) throw new Error('Камера не вернула снимок')

      // Останавливаем камеру сразу после захвата
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Используем compressImage как в PhotoReceipt для сжатия изображения
      // Это уменьшает размер файла перед отправкой
      const compressedBase64 = await compressImage(blob)
      
      // Конвертируем base64 обратно в Blob для multipart отправки
      // (sendReceiptPhoto ожидает Blob, а не base64 строку)
      const response = await fetch(compressedBase64)
      const compressedBlob = await response.blob()

      // Отправляем фото с receipt_id в формате multipart/form-data
      // sendReceiptPhoto создаёт FormData с полями:
      // - type = "receipt_photo"
      // - receipt_id = receiptId
      // - image = compressedBlob
      const receipt = await sendReceiptPhoto(receiptId, compressedBlob)

      // Успешно отправлено - закрываем модалку и обновляем чек
      onSuccess(receipt)
      onClose()
    } catch (err) {
      console.error('Error capturing receipt photo:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ошибка отправки фото'
      setError(errorMessage)
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
        backgroundColor: '#000000',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Полноэкранное видео с камерой */}
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          minHeight: '85vh',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Видео занимает весь экран */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {/* Визуальная рамка для чека */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%',
            maxWidth: '400px',
            aspectRatio: '3/4',
            border: '3px solid rgba(34, 211, 238, 0.8)',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* Уголки рамки для лучшей видимости */}
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              width: '30px',
              height: '30px',
              borderTop: '4px solid #22d3ee',
              borderLeft: '4px solid #22d3ee',
              borderTopLeftRadius: '8px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '30px',
              height: '30px',
              borderTop: '4px solid #22d3ee',
              borderRight: '4px solid #22d3ee',
              borderTopRightRadius: '8px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              left: '-3px',
              width: '30px',
              height: '30px',
              borderBottom: '4px solid #22d3ee',
              borderLeft: '4px solid #22d3ee',
              borderBottomLeftRadius: '8px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              width: '30px',
              height: '30px',
              borderBottom: '4px solid #22d3ee',
              borderRight: '4px solid #22d3ee',
              borderBottomRightRadius: '8px',
            }}
          />
        </div>

        {/* Подсказка для пользователя */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#f1f5f9',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            textAlign: 'center',
            zIndex: 20,
            maxWidth: '90%',
          }}
        >
          Поместите чек целиком в рамку
        </div>

        {/* Кнопка закрытия вверху */}
        <button
          onClick={onClose}
          disabled={busy}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: 'none',
            color: '#f1f5f9',
            fontSize: '32px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Сообщение об ошибке */}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: '#ffffff',
              padding: '16px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              zIndex: 30,
              maxWidth: '90%',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Фиксированная кнопка внизу экрана */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Кнопка "Сфотографировать" - крупная и заметная */}
        <button
          className="btn"
          onClick={capture}
          disabled={busy || !receiptId}
          style={{
            fontSize: '20px',
            padding: '18px',
            width: '100%',
            backgroundColor: receiptId ? '#22d3ee' : '#64748b',
            color: '#0f172a',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: receiptId && !busy ? 'pointer' : 'not-allowed',
            opacity: receiptId && !busy ? 1 : 0.6,
            transition: 'all 0.2s',
          }}
        >
          {busy ? 'Отправляем…' : '📸 Сфотографировать чек'}
        </button>

        {/* Кнопка отмены */}
        <button
          className="btn ghost"
          onClick={onClose}
          disabled={busy}
          style={{
            fontSize: '16px',
            padding: '14px',
            width: '100%',
            color: '#f1f5f9',
          }}
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

