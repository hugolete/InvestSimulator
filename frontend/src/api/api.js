const API_URL = "http://localhost:8000"
const API_KEY = process.env.REACT_APP_API_KEY

// Transforme le "detail" renvoyé par FastAPI en message lisible :
// - HTTPException  -> detail est une string ("Fonds insuffisants pour acheter")
// - erreur 422     -> detail est une liste [{loc: [..., "amount_fiat"], msg: "..."}]
function formatErrorDetail(detail) {
    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
        return detail
            .map(d => {
                const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null
                return field ? `${field} : ${d.msg}` : d?.msg
            })
            .filter(Boolean)
            .join(" ; ")
    }
    return null
}

async function handleResponse(response) {
    if (!response.ok) {
        let message = null
        try {
            const body = await response.json()
            message = formatErrorDetail(body?.detail)
        } catch {
            // corps vide ou non-JSON : on garde le message générique
        }

        const error = new Error(message || `API error: ${response.status}`)
        error.status = response.status
        throw error
    }
    return response.json()
}

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
            ...options.headers,
        }
    })

    return handleResponse(response)
}

export const apiForm = async (path, data) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => formData.append(key, value))

    const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: formData
    })

    return handleResponse(response)
}

// Helpers
export const apiGet = (path) => apiFetch(path)
export const apiPost = (path, data) => apiFetch(path, { method: "POST", body: JSON.stringify(data) })
export const apiDelete = (path) => apiFetch(path, { method: "DELETE" })
export const apiPut = (path) => apiFetch(path, { method: "PUT" })
