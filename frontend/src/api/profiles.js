export async function getProfiles() {
    const response = await fetch("http://localhost:8000/api/profiles/");
    if (!response.ok) throw new Error("Erreur lors du fetch des profils");

    return response.json();
}