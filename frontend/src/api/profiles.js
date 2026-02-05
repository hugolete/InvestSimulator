export async function getProfiles() {
    const response = await fetch("http://localhost:8000/api/profiles/");
    if (!response.ok) throw new Error("Erreur lors du fetch des profils");

    return response.json();
}

export async function getPerformance(profileId){
    const response = await fetch(`http://localhost:8000/api/profiles/${profileId}/performance`);
    if (!response.ok) throw new Error("Erreur lors du fetch de la performance du profil");

    return response.json();
}

export async function getProfile(profileId) {
    const response = await fetch(`http://localhost:8000/api/profiles/${profileId}`);
    if (!response.ok) throw new Error("Erreur lors du fetch du profil");

    return response.json();
}

export async function getProfileHistory(profileId) {
    const response = await fetch(`http://localhost:8000/api/profiles/${profileId}/history`);
    if (!response.ok) throw new Error("Erreur lors du fetch de l'historique du profil");

    return response.json();
}
