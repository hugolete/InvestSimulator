import React, {useEffect, useState} from "react";
import {Navigate, Outlet, useNavigate} from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {getAllPrices} from "../api/assets";
import {editProfile, getProfile} from "../api/profiles";
import {Menu, PanelLeftClose, PanelLeftOpen, User, DollarSign, Wallet, Shield, X} from "lucide-react";

function Dashboard({ profileId }) {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isProfileInfoOpen, setIsProfileInfoOpen] = useState(false);
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
    const navigate = useNavigate();
    const [newProfileName, setNewProfileName] = useState("");
    const [allPrices, setAllPrices] = useState({});

    const handleNameChangeSubmit = async (e) => {
        e.preventDefault();
        if (!newProfileName.trim()) {
            alert("Le nom ne peut pas être vide.");
            return;
        }

        try {
            await editProfile(profileId, newProfileName);
            setIsProfileEditOpen(false);
            fetchProfileData(profileId);
        } catch (error) {
            alert(`Échec de la modification: ${error.message}`);
        }
    };

    // initial = true  : premier chargement -> écran de chargement plein écran
    // initial = false : rafraîchissement (après un achat, etc.) -> en arrière-plan,
    //                   sans démonter les pages enfants (AssetPage, DashboardContent)
    const fetchProfileData = async (id, { initial = false } = {}) => {
        if (!id) return;

        if (initial) setIsLoading(true);
        let timeoutId;
        try {
            const timeout = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), 10000);
            });
            const data = await Promise.race([getProfile(id), timeout]);
            setProfile(data);
        } catch (err) {
            console.error("Erreur lors du chargement du profil:", err);
            // En rafraîchissement, on garde les dernières données affichées
            if (initial) setProfile(null);
        } finally {
            clearTimeout(timeoutId);
            if (initial) setIsLoading(false);
        }
    };

    const refreshProfile = () => {
        fetchProfileData(profileId);
    };

    useEffect(() => {
        fetchProfileData(profileId, { initial: true });
    }, [profileId]);

    useEffect(() => {
        const fetchAllPrices = () => {
            getAllPrices().then(pricesData => {
                setAllPrices(pricesData);
            });
        };

        fetchAllPrices();
        const intervalId = setInterval(fetchAllPrices, 30000);
        return () => clearInterval(intervalId);
    }, []);

    // Aucun profil sélectionné (navigateur neuf, localStorage vidé) : retour à l'accueil
    if (!profileId) {
        return <Navigate to="/" replace />;
    }

    if (isLoading) {
        return <div style={{ textAlign: "center", padding: "100px", color: "#94a3b8", background: "#0b0f19", height: "100vh" }}>Chargement des données du terminal...</div>;
    }
    if (!profile) {
        return <div style={{ textAlign: "center", padding: "100px", color: "#ff3d00", background: "#0b0f19", height: "100vh" }}>Erreur : Profil non trouvé ou non accessible.</div>;
    }

    const usdQuantity = profile.assets?.find(a => a.symbol === "USD")?.quantity ?? 0;
    const totalWorth = profile.total_worth ?? 0;
    const profileName = profile.profileName ?? "";

    return (
        <div style={{ display: "flex", height: "100vh", backgroundColor: "#0b0f19", color: "#f8fafc", overflow: "hidden" }}>
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} profileId={profileId} allPrices={allPrices} />

            {/* Main content area */}
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
                {/* Header */}
                <header style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 24px",
                    backgroundColor: "#131b2e",
                    borderBottom: "1px solid #1e293b",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            style={{
                                padding: "8px",
                                backgroundColor: "#1a233d",
                                color: "#38bdf8",
                                border: "1px solid #2a3a5e",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                            title="Basculer la barre latérale"
                        >
                            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                        </button>
                        <div
                            onClick={() => navigate("/dashboard")}
                            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
                        >
                            <span style={{ fontWeight: "700", fontSize: "18px", letterSpacing: "0.02em", color: "#f8fafc" }}>
                                Invest<span style={{ color: "#2962ff" }}>Simulator</span>
                            </span>
                            <span style={{ fontSize: "11px", backgroundColor: "rgba(41, 98, 255, 0.2)", color: "#38bdf8", padding: "2px 8px", borderRadius: "20px", fontWeight: "600" }}>PRO</span>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                        <div style={{ textAlign: "right", display: "flex", gap: "20px", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Profil</div>
                                <span
                                    onClick={() => setIsProfileInfoOpen(true)}
                                    style={{ cursor: 'pointer', fontWeight: "600", color: "#38bdf8", fontSize: "14px" }}
                                    title="Voir les détails du profil"
                                >
                                    {profileName}
                                </span>
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Valeur Totale</div>
                                <span className="mono" style={{ fontWeight: "700", fontSize: "14px", color: "#00c853" }}>
                                    ${totalWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Liquidités</div>
                                <span className="mono" style={{ fontWeight: "600", fontSize: "14px", color: "#f8fafc" }}>
                                    ${usdQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate("/")}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: '#1a233d',
                                color: '#94a3b8',
                                border: '1px solid #2a3a5e',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#2a3a5e"; e.currentTarget.style.color = "#f8fafc"; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#1a233d"; e.currentTarget.style.color = "#94a3b8"; }}
                        >
                            Changer de compte
                        </button>
                    </div>
                </header>

                <main style={{ flexGrow: 1, padding: "24px", overflowY: "auto" }}>
                    <Outlet context={{ profileData: profile, refreshProfile: refreshProfile, allPrices: allPrices }} />
                </main>
            </div>

            {/* Profile Info Modal */}
            {isProfileInfoOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
                }} onClick={() => setIsProfileInfoOpen(false)}>
                    <div style={{
                        backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '30px', borderRadius: '16px', width: '380px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Informations du Profil</h3>
                            <button onClick={() => setIsProfileInfoOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px", color: "#cbd5e1" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#1a233d", padding: "10px 14px", borderRadius: "8px" }}>
                                <span style={{ color: "#94a3b8" }}>ID du compte :</span>
                                <span className="mono" style={{ fontWeight: "600" }}>{profileId}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#1a233d", padding: "10px 14px", borderRadius: "8px" }}>
                                <span style={{ color: "#94a3b8" }}>Nom :</span>
                                <span style={{ fontWeight: "600", color: "#38bdf8" }}>{profileName || "N/A"}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                style={{
                                    flex: '1', padding: '12px', backgroundColor: '#2962ff', color: 'white',
                                    border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                                }}
                                onClick={() => { setIsProfileInfoOpen(false); setNewProfileName(profileName); setIsProfileEditOpen(true); }}
                            >
                                Modifier le nom
                            </button>
                            <button
                                onClick={() => setIsProfileInfoOpen(false)}
                                style={{
                                    flex: '1', padding: '12px', backgroundColor: '#1a233d', color: '#94a3b8',
                                    border: '1px solid #2a3a5e', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                                }}>
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Edit Modal */}
            {isProfileEditOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
                }}>
                    <div style={{
                        backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '30px', borderRadius: '16px', width: '380px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Modifier le nom du profil</h3>
                            <button onClick={() => setIsProfileEditOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleNameChangeSubmit}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>Nouveau nom :</label>
                                <input
                                    type="text"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', backgroundColor: '#1a233d', border: '1px solid #2a3a5e', borderRadius: '8px', color: '#f8fafc', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#00c853', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Enregistrer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsProfileEditOpen(false)}
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#1a233d', color: '#94a3b8', border: '1px solid #2a3a5e', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
