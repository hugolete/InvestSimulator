import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateProfile() {
    const [name, setName] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        console.log("Submitted")
        e.preventDefault();

        const res = await fetch("http://127.0.0.1:8000/api/profiles?name=" + encodeURIComponent(name), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        console.log(res)

        if (res.ok) {
            alert("Profil créé !");
            navigate("/"); // retour à l'accueil
        }
    };

    return (
        <div>
            <h1>Créer un profil</h1>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nom du profil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button type="submit">Créer</button>
            </form>
        </div>
    );
}
