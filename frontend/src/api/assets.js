export async function getAssets(){
    const response = await fetch("http://localhost:8000/api/assets/");
    if (!response.ok) throw new Error("Erreur lors du fetch des assets");

    return response.json();
}
