import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProfile } from "../api/profiles"

export default function CreateProfile() {
    const [name, setName] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        console.log("Submitted")
        e.preventDefault();

        const res = await createProfile(name)

        console.log(res)

        if (res.ok) {
            alert("Profil créé !");
            navigate("/"); // retour à l'accueil
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
            <h1>Créer un profil</h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Nom du profil"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button
                        type="submit"
                        style={{marginLeft: "10px"}}
                    >Créer</button>
                </form>
        </div>
    );
}
