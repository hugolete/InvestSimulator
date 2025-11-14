import { useEffect, useState } from "react";
import { getProfiles } from "../api/profiles";
import {useNavigate} from "react-router-dom";

export default function Home({ onSelectProfile }) {
    const [profiles, setProfiles] = useState([]);
    const [selected, setSelected] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        getProfiles().then(setProfiles);
    }, []);

    const disabled = profiles.length === 0;

    return (
        <div style={{ maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
            <h1>Choisissez un profil</h1>

            <select
                disabled={disabled}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                style={{ width: "100%", padding: 10, marginTop: 20 }}
            >
                {disabled && <option>Aucun profil</option>}
                {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                        ID : {p.id} | Nom : {p.name}
                    </option>
                ))}
            </select>

            <button
                onClick={() => onSelectProfile(selected)}
                disabled={!selected}
                style={{ marginTop: 20, padding: "10px 40px" }}
            >
                Continuer
            </button>

            <button
                style={{ marginTop: 20, display: "block", width: "100%" }}
                onClick={() => navigate("/create-profile")}
            >
                Créer un profil
            </button>
        </div>
    );
}
