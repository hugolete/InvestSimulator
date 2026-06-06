// favorites.js
import { apiGet, apiPost, apiDelete } from "./api"

export async function getFavorites(profileId) {
    const data = await apiGet(`/api/favorites/${profileId}`)
    return data.favorites
}

export async function addFavorite(profileId, symbol) {
    return apiPost(`/api/favorites/${profileId}?symbol=${symbol}`, {})
}

export async function deleteFavorite(profileId, symbol) {
    return apiDelete(`/api/favorites/${profileId}/${symbol}`)
}
