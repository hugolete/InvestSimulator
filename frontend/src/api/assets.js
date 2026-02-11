export async function getAssets(){
    const response = await fetch("http://localhost:8000/api/assets/");
    if (!response.ok) throw new Error("Erreur lors du fetch des assets");

    return response.json();
}

export async function getAsset(symbol){
    const response = await fetch(`http://localhost:8000/api/assets/${symbol}`);
    if (!response.ok) throw new Error("Erreur lors du fetch du prix de l'asset");

    return response.json();
}

export async function getAssetPriceHistory(symbol){
    const response = await fetch(`http://127.0.0.1:8000/api/prices/history/${symbol}`);
    if (!response.ok) throw new Error("Erreur lors du fetch de l'historique des prix de l'asset");

    return response.json();
}

export async function getAssetPercentages(symbol){
    const response = await fetch(`http://127.0.0.1:8000/api/prices/percentage/${symbol}`);
    if (!response.ok) throw new Error("Erreur lors du fetch des pourcentages de l'asset");

    return response.json();
}

export async function getAssetDailyPercentages() {
    const response = await fetch(`http://127.0.0.1:8000/api/performances`);
    if (!response.ok) throw new Error("Erreur lors du fetch des pourcentages journaliers de tous les assets");

    return response.json();
}

export async function getAllPrices(){
    const response = await fetch(`http://127.0.0.1:8000/api/allprices/`);
    if (!response.ok) throw new Error("Erreur lors du fetch des pourcentages de l'asset");

    return response.json();
}

export async function fetchAssetData(symbol) {
    try {
        const [asset, history, percentages] = await Promise.all([
            getAsset(symbol),
            getAssetPriceHistory(symbol),
            getAssetPercentages(symbol),
        ]);

        return {
            asset: asset,
            history: history,
            percentages: percentages,
        };

    } catch (error) {
        console.error("Erreur lors du chargement des données de la page d'actif:", error);
        throw new Error("Échec du chargement des données de l'actif:" + error.message);
    }
}

export async function fetchChartData(symbol,period) {
    const response = await fetch(`http://127.0.0.1:8000/api/prices/chart/${symbol}/${period}`);
    if (!response.ok) throw new Error("Erreur lors du fetch de l'historique des prix de l'asset");

    return response.json();
}

export async function buyAsset(user_id,symbol,amount_fiat) {
    const response = await fetch("http://127.0.0.1:8000/api/buy?user_id=" + encodeURIComponent(user_id) + "&symbol=" + encodeURIComponent(symbol) + "&amount_fiat=" + encodeURIComponent(amount_fiat), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Erreur lors de l'achat de l'asset "+symbol);

    return response.json();
}

export async function sellAsset(user_id,symbol,asset_amount) {
    if (!asset_amount || asset_amount <= 0) {
        throw new Error("La quantité de l'actif à vendre doit être supérieure à zéro.");
    }

    const response = await fetch("http://127.0.0.1:8000/api/sell?user_id=" + encodeURIComponent(user_id) + "&symbol=" + encodeURIComponent(symbol) + "&asset_amount=" + encodeURIComponent(asset_amount), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error("Erreur lors de la vente de l'asset "+symbol);

    return response.json();
}
