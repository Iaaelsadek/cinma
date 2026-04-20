// Polyfill Buffer for browser environment
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

const loadRuntimeConfig = async () => {
  try {
    const res = await fetch('/api/runtime-config', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    ;(window as any).__RUNTIME_CONFIG__ = data || {}
  } catch {}
}

void (async () => {
  await loadRuntimeConfig()
  await import('./bootstrap')
})()
