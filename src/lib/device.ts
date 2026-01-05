const STORAGE_KEY = '4buy_device_id'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `dev_${Math.random().toString(16).slice(2)}${Date.now()}`
}

export function getDeviceId() {
  if (typeof localStorage === 'undefined') return randomId()
  const cached = localStorage.getItem(STORAGE_KEY)
  if (cached) return cached
  const next = randomId()
  localStorage.setItem(STORAGE_KEY, next)
  return next
}


