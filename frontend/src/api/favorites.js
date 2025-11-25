export async function getFavorites(profileId) {
    console.log("Fetching favorites for profileId:", profileId);
    const response = await fetch(`http://127.0.0.1:8000/api/favorites/${profileId}`)

    if (!response.ok) throw new Error("Erreur lors du fetch des favoris");

    const data = await response.json();

    return data.favorites;
}

export async function addFavorite(profileId, symbol) {
    console.log("Adding favorite:", profileId, symbol);
    const response = await fetch(`http://127.0.0.1:8000/api/favorites/${profileId}?symbol=${symbol}`, {
        method: "POST"
    })

    if (!response.ok) throw new Error("Erreur lors de l'ajout d'un favori");

    return response.json();
}

export async function deleteFavorite(profileId, symbol) {
    console.log("Deleting favorite:", profileId, symbol);
    const response = await fetch(`http://127.0.0.1:8000/api/favorites/${profileId}/${symbol}`, {
        method: "DELETE"
    })

    if (!response.ok) throw new Error("Erreur lors de la suppression d'un favori");

    return response.json();
}
