// Vercel Serverless Function для проксирования запросов в n8n
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import FormData from 'form-data'
import { tmpdir } from 'os'

const N8N_WEBHOOK_URL = 'https://forbuy.app.n8n.cloud/webhook/4buy/intake'

// Парсинг multipart/form-data
async function parseMultipart(req: VercelRequest): Promise<{ type: string; receipt_id?: string; image?: any }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: tmpdir(),
      keepExtensions: true,
    })
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type
      const receipt_id = Array.isArray(fields.receipt_id) ? fields.receipt_id[0] : fields.receipt_id
      const image = Array.isArray(files.image) ? files.image[0] : files.image
      
      resolve({
        type: type as string,
        receipt_id: receipt_id as string | undefined,
        image: image as any,
      })
    })
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers для всех запросов
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const contentType = req.headers['content-type'] || ''
    const isMultipart = contentType.includes('multipart/form-data')

    let type: string
    let body: any

    if (isMultipart) {
      // Парсим multipart для валидации
      const parsed = await parseMultipart(req)
      
      if (!parsed.type || parsed.type !== 'receipt_photo') {
        return res.status(400).json({ error: 'Invalid type for multipart request. Expected "receipt_photo"' })
      }

      if (!parsed.receipt_id) {
        return res.status(400).json({ error: 'Missing "receipt_id" field' })
      }

      if (!parsed.image) {
        return res.status(400).json({ error: 'Missing "image" file' })
      }

      // Читаем файл
      const fs = await import('fs/promises')
      const fileBuffer = await fs.readFile(parsed.image.filepath)
      
      console.log('Proxying multipart to n8n:', { 
        type: parsed.type, 
        receipt_id: parsed.receipt_id, 
        imageSize: fileBuffer.length 
      })

      // Создаём FormData для проксирования в n8n
      // ВАЖНО: используем form-data пакет для Node.js
      // Поля должны быть: type, receipt_id, image
      const formData = new FormData()
      formData.append('type', 'receipt_photo')  // Это должно попасть в $json.body.type в n8n
      formData.append('receipt_id', parsed.receipt_id)  // Это должно попасть в $json.body.receipt_id в n8n
      formData.append('image', fileBuffer, {
        filename: parsed.image.originalFilename || 'receipt.jpg',
        contentType: parsed.image.mimetype || 'image/jpeg',
      })
      
      // Удаляем временный файл
      await fs.unlink(parsed.image.filepath).catch(() => {})

      // Проксируем multipart запрос в n8n
      // Используем getHeaders() для правильной установки Content-Type с boundary
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),  // Это установит Content-Type: multipart/form-data; boundary=...
      })

      console.log('n8n response status:', n8nResponse.status)

      const responseContentType = n8nResponse.headers.get('content-type')
      const isJson = responseContentType?.includes('application/json')

      if (isJson) {
        const data = await n8nResponse.json()
        return res.status(n8nResponse.status).json(data)
      } else {
        const text = await n8nResponse.text()
        return res.status(n8nResponse.status).send(text)
      }
    } else {
      // Обработка JSON запросов (существующий флоу)
      if (!req.body || typeof req.body.type !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "type" field' })
      }

      type = req.body.type
      body = req.body

      console.log('Proxying JSON to n8n:', { type, hasQrText: !!body.qrText })

      // Проксируем JSON запрос в n8n
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      console.log('n8n response status:', n8nResponse.status)

      const responseContentType = n8nResponse.headers.get('content-type')
      const isJson = responseContentType?.includes('application/json')

      if (isJson) {
        const data = await n8nResponse.json()
        return res.status(n8nResponse.status).json(data)
      } else {
        const text = await n8nResponse.text()
        return res.status(n8nResponse.status).send(text)
      }
    }
  } catch (error) {
    console.error('Error proxying to n8n:', error)
    return res.status(500).json({
      error: 'Failed to proxy request to n8n',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

