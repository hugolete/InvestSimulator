import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {getAssets} from "../api/assets";

export default function Sidebar({isOpen}){
    const navigate = useNavigate();

    const [allAssets, setAllAssets] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        getAssets().then(setAllAssets);
    }, []);

    const filteredAssets = search.length > 0 ? allAssets.filter
        (asset =>
            asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
            asset.name.toLowerCase().includes(search.toLowerCase())
        )
        : [];

    return(
        <aside
            style={{
                width: "250px",
                borderRight: "1px solid #ccc",
                padding: "1rem",
                display: isOpen ? 'block' : 'none',
                height: "100%"
            }}
        >
            <input
                type="search"
                placeholder="Recherche..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{width: "100%", padding: "0.5rem", marginTop: "1rem"}}
            />
        </aside>
    )
}

