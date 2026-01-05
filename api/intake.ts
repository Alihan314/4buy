// Vercel Serverless Function для проксирования запросов в n8n
import type { VercelRequest, VercelResponse } from '@vercel/node'

const N8N_WEBHOOK_URL = 'https://forbuy.app.n8n.cloud/webhook/4buy/intake'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Валидация наличия поля type
  if (!req.body || typeof req.body.type !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "type" field' })
  }

  try {
    // Проксируем запрос в n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    // Получаем ответ от n8n
    const contentType = n8nResponse.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (isJson) {
      const data = await n8nResponse.json()
      return res.status(n8nResponse.status).json(data)
    } else {
      const text = await n8nResponse.text()
      return res.status(n8nResponse.status).send(text)
    }
  } catch (error) {
    console.error('Error proxying to n8n:', error)
    return res.status(500).json({
      error: 'Failed to proxy request to n8n',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

