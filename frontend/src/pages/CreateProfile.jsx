import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProfile } from "../api/profiles";
import { UserPlus, ArrowLeft } from "lucide-react";

export default function CreateProfile() {
    const [name, setName] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Veuillez entrer un nom valide.");
            return;
        }

        try {
            const res = await createProfile(name);
            alert("Profil créé avec succès !");
            navigate("/");
        } catch (err) {
            alert("Erreur lors de la création du profil.");
            console.error(err);
        }
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            background: "radial-gradient(circle at 50% 20%, #1a233d 0%, #0b0f19 70%)"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "420px",
                backgroundColor: "#131b2e",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                padding: "40px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
            }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        cursor: "pointer",
                        marginBottom: "24px",
                        padding: 0
                    }}
                >
                    <ArrowLeft size={16} /> Retour à l'accueil
                </button>

                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "56px",
                    height: "56px",
                    backgroundColor: "rgba(0, 200, 83, 0.15)",
                    borderRadius: "14px",
                    color: "#00c853",
                    marginBottom: "20px"
                }}>
                    <UserPlus size={28} />
                </div>

                <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px", color: "#f8fafc" }}>
                    Nouveau Profil
                </h1>
                <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "28px" }}>
                    Créez un compte pour commencer à simuler vos investissements.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "20px", textAlign: "left" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#94a3b8", marginBottom: "8px" }}>
                            Nom du profil
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Trader Pro, Warren Buffet..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                fontSize: "15px",
                                borderRadius: "10px",
                                backgroundColor: "#1a233d",
                                color: "#f8fafc",
                                border: "1px solid #2a3a5e",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: "100%",
                            padding: "14px",
                            backgroundColor: "#00c853",
                            color: "#fff",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "15px",
                            fontWeight: "600",
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(0, 200, 83, 0.3)"
                        }}
                    >
                        Créer le profil
                    </button>
                </form>
            </div>
        </div>
    );
}
