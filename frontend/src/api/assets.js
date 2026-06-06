import { apiGet, apiPost, apiForm } from "./api"

export async function getAssets(){
    return apiGet("/api/assets")
}

export async function getAsset(symbol){
    return apiGet(`/api/assets/${symbol}`)
}

export async function getAssetPriceHistory(symbol){
    return apiGet(`/api/prices/history/${symbol}`)
}

export async function getAssetPercentages(symbol){
    return apiGet(`/api/prices/percentage/${symbol}`)
}

export async function getAssetDailyPercentages() {
    return apiGet("/api/performances")
}

export async function getAllPrices(){
    return apiGet("/api/allprices")
}

export async function fetchAssetData(symbol) {
    try {
        const [asset, history, percentages] = await Promise.all([
            getAsset(symbol),
            getAssetPriceHistory(symbol),
            getAssetPercentages(symbol),
        ])

        return { asset, history, percentages }

    } catch (error) {
        console.error("Erreur lors du chargement des données de la page d'actif:", error)
        throw new Error("Échec du chargement des données de l'actif:" + error.message)
    }
}

export async function fetchChartData(symbol, period) {
    return apiGet(`/api/prices/chart/${symbol}/${period}`)
}

/*export async function buyAsset(user_id, symbol, amount_fiat, comment) {
    return apiPost(
        `/api/buy?user_id=${encodeURIComponent(user_id)}&symbol=${encodeURIComponent(symbol)}&amount_fiat=${encodeURIComponent(amount_fiat)}&comment=${encodeURIComponent(comment)}`,
        {}
    )
}*/

export async function buyAsset(user_id, symbol, amount_fiat, comment) {
    return apiForm("/api/buy", { user_id, symbol, amount_fiat, comment })
}

/*export async function sellAsset(user_id, symbol, asset_amount, comment) {
    if (!asset_amount || asset_amount <= 0) {
        throw new Error("La quantité de l'actif à vendre doit être supérieure à zéro.")
    }

    return apiPost(
        `/api/sell?user_id=${encodeURIComponent(user_id)}&symbol=${encodeURIComponent(symbol)}&asset_amount=${encodeURIComponent(asset_amount)}&comment=${encodeURIComponent(comment)}`,
        {}
    )
}*/

export async function sellAsset(user_id, symbol, asset_amount, comment) {
    if (!asset_amount || asset_amount <= 0) {
        throw new Error("La quantité de l'actif à vendre doit être supérieure à zéro.")
    }
    return apiForm("/api/sell", { user_id, symbol, asset_amount, comment })
}
