import React, { useEffect, useState } from "react";
import {useNavigate} from "react-router-dom";

function Dashboard({ profileId, onChangeProfile }) {
    const [profile, setProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();

    // Récupérer les infos du profil (total_worth, USD quantity, etc)
    useEffect(() => {
        setIsLoading(true);
        setProfile(null);

        fetch(`http://127.0.0.1:8000/api/profiles/${profileId}`)
            .then(res => res.json())
            .then(data => {
                setProfile(data);
            })
            .catch(error => {
                console.error("Erreur lors du chargement du profil:", error);
                setProfile(null);
            })
            .finally(() => {
                setIsLoading(false); // mettre fin au chargement
            });
    }, [profileId]);

    if (isLoading) {
        return <div style={{textAlign: "center", padding: "50px"}}>Chargement des données du profil...</div>;
    }
    if (!profile) {
        return <div style={{textAlign: "center", padding: "50px", color: "red"}}>Erreur : Profil non trouvé ou non accessible.</div>;
    }

    // trouver quantité USD disponible
    const usdAsset = profile.find(item => item.symbol === "USD")
    console.log("UsdAsset : ",usdAsset)
    const usdQuantity = usdAsset.quantity
    console.log("UsdQuantity : ",usdQuantity)
    console.log("Profile : ",profile)

    // valeur totale du compte
    const totalWorthObject = profile.find(item => 'total_worth' in item);
    const totalWorth = totalWorthObject.total_worth
    console.log("Total Worth : ", totalWorth);

    //nom du compte
    const profileNameObject = profile.find(item => 'profileName' in item);
    const profileName = profileNameObject.profileName
    console.log("profileName : ",profileName)

    return (
        <div className="dashboard-container" style={{display: "flex", height: "100vh"}}>
            {/* sidebar gauche (liste à compléter plus tard) */}
            <aside
                style={{
                    width: "250px",
                    borderRight: "1px solid #ccc",
                    padding: "1rem",
                    display: isSidebarOpen ? 'block' : 'none',
                    height: "100%"
                }}
            >
                <input
                    type="search"
                    placeholder="Recherche..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{width: "100%", padding: "0.5rem", marginTop: "1rem"}}
                />
            </aside>

            {/* main content */}
            <main style={{flexGrow: 1, padding: "1rem"}}>
                {/* header */}
                <header style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    {/* bloc de gauche */}
                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                        {/* bouton pour dérouler le menu */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            style={{ padding: "8px 12px", cursor: "pointer" }}
                        >
                            {isSidebarOpen ? '< Masquer ' : '☰'}
                        </button>
                        <h2>InvestSimulator</h2>
                    </div>

                    {/* TODO bloc central avec "Dashboard" ici, et le nom de la ressource consultée pour les autres pages */}
                    <div style={{textAlign: "center"}}>
                        <div><h1>Test</h1></div>
                    </div>

                    {/* bloc de droite */}
                    <div style={{textAlign: "right"}}>
                        <div><strong>Nom: </strong> {profileName}</div>
                        <div><strong>Valeur totale:</strong> ${totalWorth.toFixed(2)}</div>
                        <div><strong>USD disponible pour trade:</strong> ${usdQuantity.toFixed(2)}</div>
                        <button onClick={() => navigate("/")} style={{marginTop: "0.5rem"}}>
                            Changer de compte
                        </button>
                    </div>
                </header>

                <section>
                    {/* contenu du dashboard */}
                </section>
            </main>
        </div>
    );
}

export default Dashboard;
