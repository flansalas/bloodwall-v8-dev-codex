const defaultHeaders = { 'Content-Type': 'application/json' }

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = await response.json()
      if (payload?.error) {
        message = payload.error
      }
    } catch (error) {
      // ignore JSON parsing issues
    }
    throw new Error(message || 'Request failed')
  }
  return response.json() as Promise<T>
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  return handleResponse<T>(response)
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}
