import { useEffect, useState } from "react";
import { getProfiles } from "../api/profiles";
import { useNavigate } from "react-router-dom";
import { TrendingUp, UserPlus, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function Home({ onSelectProfile }) {
    const [profiles, setProfiles] = useState([]);
    const [selected, setSelected] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        getProfiles().then((data) => {
            setProfiles(data);
            if (data.length > 0) {
                setSelected(data[0].id);
            }
        });
    }, []);

    const disabled = profiles.length === 0;

    const handleContinue = () => {
        if (!selected) return;
        onSelectProfile(parseInt(selected));
        navigate("/dashboard");
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
                maxWidth: "480px",
                backgroundColor: "#131b2e",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                padding: "40px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                textAlign: "center"
            }}>
                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "64px",
                    height: "64px",
                    backgroundColor: "rgba(41, 98, 255, 0.15)",
                    borderRadius: "16px",
                    color: "#2962ff",
                    marginBottom: "24px"
                }}>
                    <TrendingUp size={32} />
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px", color: "#f8fafc" }}>
                    InvestSimulator
                </h1>
                <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "32px" }}>
                    Plateforme de simulation de trading et d'investissement pour les actions, ETFs et cryptomonnaies.
                </p>

                <div style={{ marginBottom: "20px", textAlign: "left" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#94a3b8", marginBottom: "8px" }}>
                        Sélectionner un profil
                    </label>
                    <select
                        disabled={disabled}
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "14px 16px",
                            fontSize: "15px",
                            borderRadius: "10px",
                            backgroundColor: "#1a233d",
                            color: "#f8fafc",
                            border: "1px solid #2a3a5e",
                            cursor: disabled ? "not-allowed" : "pointer"
                        }}
                    >
                        {disabled && <option>Aucun profil disponible</option>}
                        {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                                👤 {p.name} (ID: {p.id})
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleContinue}
                    disabled={disabled}
                    style={{
                        width: "100%",
                        padding: "14px",
                        backgroundColor: disabled ? "#334155" : "#2962ff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "15px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        cursor: disabled ? "not-allowed" : "pointer",
                        boxShadow: disabled ? "none" : "0 4px 14px rgba(41, 98, 255, 0.4)"
                    }}
                >
                    <span>Accéder au Dashboard</span>
                    <ArrowRight size={18} />
                </button>

                <div style={{ marginTop: "20px", borderTop: "1px solid #1e293b", paddingTop: "20px" }}>
                    <button
                        onClick={() => navigate("/create-profile")}
                        style={{
                            width: "100%",
                            padding: "12px",
                            backgroundColor: "transparent",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            cursor: "pointer"
                        }}
                    >
                        <UserPlus size={16} />
                        <span>Créer un nouveau profil</span>
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", gap: "24px", marginTop: "40px", color: "#64748b", fontSize: "13px" }}>
                {/*<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><ShieldCheck size={15} /> Sécurisé</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Zap size={15} /> Temps réel</span>*/}
            </div>
        </div>
    );
}
