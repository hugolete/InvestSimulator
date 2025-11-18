import React, { useEffect, useState } from "react";
import {useNavigate} from "react-router-dom";

function Dashboard({ profileId, onChangeProfile }) {
    const [profile, setProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isProfileInfoOpen, setIsProfileInfoOpen] = useState(false);
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
    const navigate = useNavigate();

    const [newProfileName, setNewProfileName] = useState("");

    const handleNameChangeSubmit = () => {
        const newName = newProfileName
        console.log("NameChange Submit")
        //console.log("Nouveau nom : ",newName)

        if (!newName.trim()) {
            alert("Le nom ne peut pas être vide.");
            return;
        }

        const requestBody = new URLSearchParams();
        requestBody.append('new_name', newName);

        fetch(`http://127.0.0.1:8000/api/profiles/${profileId}/edit?new_name=` + encodeURIComponent(newName), {
            method: 'PUT'
        })
            .then(data => {
                console.log("Succès de l'API:", data);
                setIsProfileEditOpen(false);
            })
            .catch(error => {
                console.error("Échec de l'édition:", error);
                alert(`Échec de la modification: ${error.message}`);
            });
    };

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
    //console.log("UsdAsset : ",usdAsset)
    const usdQuantity = usdAsset.quantity
    //console.log("UsdQuantity : ",usdQuantity)
    //console.log("Profile : ",profile)

    // valeur totale du compte
    const totalWorthObject = profile.find(item => 'total_worth' in item);
    const totalWorth = totalWorthObject.total_worth
    //console.log("Total Worth : ", totalWorth);

    //nom du compte
    const profileNameObject = profile.find(item => 'profileName' in item);
    const profileName = profileNameObject.profileName
    //console.log("profileName : ",profileName)

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

                    {/* TODO bloc central du header avec "Dashboard" ici, et le nom de la ressource consultée pour les autres pages */}
                    <div style={{textAlign: "center"}}>
                        <div><h1>Test</h1></div>
                    </div>

                    {/* bloc de droite */}
                    <div style={{textAlign: "right"}}>
                        <div><strong>Nom: </strong>
                            <span onClick={() => setIsProfileInfoOpen(true)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                                {profileName}
                            </span>
                        </div>
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

            {/* rendu fenêtre info profil */}
            {isProfileInfoOpen && (
                <div className="profile-info-overlay"
                    // fond sombre prend tout l'écran
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', // fond semi-transparent
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setIsProfileInfoOpen(false)}
                >
                    <div className="profile-info"
                        style={{
                            backgroundColor: 'white',
                            padding: '25px',
                            borderRadius: '8px',
                            width: '350px',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                            textAlign: 'center',
                            // empêche la fermeture quand on clique sur le contenu de la modale
                            onClickCapture: (e) => e.stopPropagation()
                        }}
                    >
                        <h3>Infos du Profil</h3>
                        <p>ID : {profileId}</p>
                        <p>Nom : {profileName || "N/A"}</p>

                        <div className="profile-info-buttons" style={{display: 'flex', justifyContent: 'center', marginTop: '25px', gap:'12px'}}>
                            <button
                                style={{
                                    flex: '1',
                                    padding: '12px 20px',
                                }}
                                onClick={() => setIsProfileEditOpen(true)}
                            >
                                Modifier le nom
                            </button>
                            <button
                                onClick={() => setIsProfileInfoOpen(false)}
                                style={{
                                    flex: '1',
                                    padding: '12px 20px',
                                }}>
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* rendu fenêtre modif nom profil */}
            {isProfileEditOpen && (
                <div className="profile-edit-overlay"
                     style={{
                         position: 'fixed',
                         top: 0,
                         left: 0,
                         width: '100%',
                         height: '100%',
                         backgroundColor: 'rgba(0, 0, 0, 0.5)',
                         display: 'flex',
                         justifyContent: 'center',
                         alignItems: 'center',
                         zIndex: 1001 // zIndex légèrement supérieur si les deux fenetres sont ouvertes
                     }}
                >
                    <div className="profile-edit"
                         style={{
                             backgroundColor: 'white',
                             padding: '25px',
                             borderRadius: '8px',
                             width: '350px',
                             boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                             onClickCapture: (e) => e.stopPropagation()
                         }}
                    >
                        <div className="top-profile-edit" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
                        }}>
                            <h3 style={{textAlign: 'left', marginTop: '15px'}}>Modifier le nom du profil</h3>
                            <div style={{textAlign: 'right'}}>
                                <button onClick={() => setIsProfileEditOpen(false)}>X</button>
                            </div>
                        </div>
                        <p>Nom actuel : {profileName || "N/A"}</p>
                        <form onSubmit={handleNameChangeSubmit} style={{display: 'flex', alignItems: 'center', marginTop: '15px'}}>
                            <input
                                type="text"
                                placeholder="Nouveau nom du profil"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                style={{
                                    padding: '8px',
                                    flexGrow: 1,
                                    onClickCapture: (e) => e.stopPropagation()
                                }}
                            />
                            <button
                                type="submit"
                                style={{marginLeft: "10px", padding: '8px 15px'}}
                            >Enregistrer</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
