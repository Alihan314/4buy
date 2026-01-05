import { getDeviceId } from './device'

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

type ScanPayload =
  | { mode: 'qr'; qr_string: string; image_base64?: undefined }
  | { mode: 'receipt'; image_base64: string; qr_string?: undefined }
  | { mode: 'product'; image_base64: string; qr_string?: undefined }

const baseUrl = (import.meta.env.VITE_N8N_BASE_URL || '').replace(/\/$/, '')

function assertBaseUrl() {
  if (!baseUrl) {
    throw new Error('VITE_N8N_BASE_URL is not configured')
  }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  assertBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed with ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function sendScan(payload: ScanPayload): Promise<Receipt | ProductRecognition> {
  const device_id = getDeviceId()
  return request('/scan', { ...payload, device_id })
}

export async function reportIssue(receiptId: string, message: string) {
  const device_id = getDeviceId()
  return request('/feedback', {
    device_id,
    receipt_id: receiptId,
    message,
  })
}


