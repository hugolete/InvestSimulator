const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
const API_KEY = import.meta.env.VITE_API_KEY

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
            ...options.headers,
        }
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return response.json()
}

// Helpers
export const apiGet = (path) => apiFetch(path)
export const apiPost = (path, data) => apiFetch(path, { method: "POST", body: JSON.stringify(data) })
export const apiDelete = (path) => apiFetch(path, { method: "DELETE" })
