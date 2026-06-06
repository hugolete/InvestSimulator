const API_URL = "http://localhost:8000"
const API_KEY = process.env.REACT_APP_API_KEY

console.log("API_KEY:", process.env.REACT_APP_API_KEY)
console.log("API_URL:", API_URL)

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

export const apiForm = (path, data) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => formData.append(key, value))

    return fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: formData
    }).then(r => r.json())
}

// Helpers
export const apiGet = (path) => apiFetch(path)
export const apiPost = (path, data) => apiFetch(path, { method: "POST", body: JSON.stringify(data) })
export const apiDelete = (path) => apiFetch(path, { method: "DELETE" })
export const apiPut = (path) => apiFetch(path, { method: "PUT" })
