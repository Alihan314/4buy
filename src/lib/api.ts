export type ReceiptItem = {
  name: string
  qty: number
  price: number
  sum: number
}

export type Receipt = {
  receipt_id: string
  source: 'qr' | 'receipt'
  store_name: string | null
  store_address: string | null
  datetime: string
  items: ReceiptItem[]
  total: number
  currency: string
  status?: 'partial' | 'complete'
  raw?: { confidence?: number }
}

export type ProductRecognition = {
  brand?: string
  product?: string
  category?: string
  confidence?: number
}

type IntakePayload =
  | { type: 'qr'; qrText: string }
  | { type: 'receipt'; imageBase64: string; receipt_id?: string }
  | { type: 'product'; imageBase64: string }

// Используем Vercel API endpoint для проксирования (избегаем CORS)
// ВАЖНО: НЕ используем прямой URL в n8n, только через /api/intake
const API_BASE = typeof window !== 'undefined' ? '/api' : ''

async function request<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`
  
  // Защита от случайного использования старого API
  if (url.includes('n8n.cloud') || url.includes('sessiaai') || url.includes('forbuy')) {
    throw new Error('Прямой доступ к n8n запрещен! Используйте /api/intake')
  }
  
  console.log('Sending request to:', url, body)
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  console.log('Response status:', res.status, res.statusText)

  if (!res.ok) {
    const text = await res.text()
    console.error('Request failed:', text)
    let errorMessage = text || `Request failed with ${res.status}`
    
    try {
      const errorJson = JSON.parse(text)
      errorMessage = errorJson.error || errorJson.message || errorMessage
    } catch {
      // Оставляем text как есть
    }
    
    throw new Error(errorMessage)
  }

  const data = await res.json()
  console.log('Response data:', data)
  return data as T
}

export async function sendIntake(payload: IntakePayload): Promise<Receipt | ProductRecognition> {
  return request('/intake', payload)
}

/**
 * Отправляет фото чека с receipt_id в формате multipart/form-data
 * @param receiptId - ID чека, полученный после QR сканирования
 * @param imageFile - Blob файл изображения
 */
export async function sendReceiptPhoto(
  receiptId: string,
  imageFile: Blob,
): Promise<Receipt> {
  const url = `${API_BASE}/intake`

  // Защита от случайного использования старого API
  if (url.includes('n8n.cloud') || url.includes('sessiaai') || url.includes('forbuy')) {
    throw new Error('Прямой доступ к n8n запрещен! Используйте /api/intake')
  }

  // Создаём FormData для multipart/form-data
  const formData = new FormData()
  formData.append('type', 'receipt_photo')
  formData.append('receipt_id', receiptId)
  formData.append('image', imageFile, 'receipt.jpg')

  console.log('Sending receipt photo to:', url, { receiptId, imageSize: imageFile.size })

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    // НЕ устанавливаем Content-Type вручную - браузер сам установит с boundary
  })

  console.log('Response status:', res.status, res.statusText)

  if (!res.ok) {
    const text = await res.text()
    console.error('Request failed:', text)
    let errorMessage = text || `Request failed with ${res.status}`

    try {
      const errorJson = JSON.parse(text)
      errorMessage = errorJson.error || errorJson.message || errorMessage
    } catch {
      // Оставляем text как есть
    }

    throw new Error(errorMessage)
  }

  const data = await res.json()
  console.log('Response data:', data)
  return data as Receipt
}

// Обратная совместимость со старым API
export async function sendScan(payload: { mode: 'qr'; qr_string: string }): Promise<Receipt> {
  return sendIntake({ type: 'qr', qrText: payload.qr_string }) as Promise<Receipt>
}

export async function reportIssue(_receiptId: string, _message: string) {
  // TODO: реализовать через новый API если нужно
  console.warn('reportIssue not implemented yet')
  return Promise.resolve()
}


