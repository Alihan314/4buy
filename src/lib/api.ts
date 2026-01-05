export type ReceiptItem = {
  name: string
  qty: number
  price: number
  sum: number
}

export type Receipt = {
  receipt_id: string
  source: 'qr' | 'receipt'
  store: { name: string; address: string }
  datetime: string
  items: ReceiptItem[]
  total: number
  currency: string
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
  | { type: 'receipt'; imageBase64: string }
  | { type: 'product'; imageBase64: string }

// Используем Vercel API endpoint для проксирования (избегаем CORS)
const API_BASE = typeof window !== 'undefined' ? '/api' : ''

async function request<T>(path: string, body: unknown): Promise<T> {
  console.log('Sending request to:', `${API_BASE}${path}`, body)
  
  const res = await fetch(`${API_BASE}${path}`, {
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

// Обратная совместимость со старым API
export async function sendScan(payload: { mode: 'qr'; qr_string: string }): Promise<Receipt> {
  return sendIntake({ type: 'qr', qrText: payload.qr_string }) as Promise<Receipt>
}

export async function reportIssue(_receiptId: string, _message: string) {
  // TODO: реализовать через новый API если нужно
  console.warn('reportIssue not implemented yet')
  return Promise.resolve()
}


