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
