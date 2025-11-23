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

    function handleAssetClick(symbol) {
        navigate(`/asset/${symbol}`);
        setSearch("");
    }

    const topAssetsSymbols = ["BTC", "NVDA", "AAPL", "QQQ", "SPY"];
    const topAssets = allAssets.filter(a => topAssetsSymbols.includes(a.symbol));

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

            {/* si recherche -> affiche les résultats */}
            {search.length > 0 && (
                <div>
                    {filteredAssets.length === 0 && (
                        <p style={{ fontSize: "0.9rem", color: "gray" }}>
                            Aucun résultat
                        </p>
                    )}

                    {filteredAssets.map(asset => (
                        <div
                            key={asset.symbol}
                            onClick={() => handleAssetClick(asset.symbol)}
                            style={{
                                padding: "0.5rem",
                                cursor: "pointer",
                                borderRadius: "6px"
                            }}
                            onMouseEnter={e => e.target.style.background = "#eee"}
                            onMouseLeave={e => e.target.style.background = "transparent"}
                        >
                            <strong>{asset.symbol}</strong>
                            <div style={{ fontSize: "0.8rem", color: "gray" }}>
                                {asset.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* menu normal si searchbar vide */}
            {search.length === 0 && (
                <div className="normalMenu">
                    {/* TOP ASSETS */}
                    <h3>Top assets</h3>
                    {topAssets.map(asset => (
                        <div
                            key={asset.symbol}
                            onClick={() => handleAssetClick(asset.symbol)}
                            style={{
                                padding: "0.5rem 0",
                                cursor: "pointer"
                            }}
                        >
                            <strong>{asset.symbol}</strong>
                            <div style={{ fontSize: "0.8rem", color: "gray" }}>
                                {asset.name}
                            </div>
                        </div>
                    ))}
                    <hr/>

                    <div className="favoris" style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <h3>Favoris</h3>
                        <div className="buttons" style={{
                            display: "flex",
                            gap: "0.7rem",
                            alignItems: "center"
                        }}>
                            <button>+</button>
                            <button>-</button>
                        </div>
                    </div>
                    <div>
                        {/*TODO*/}
                    </div>
                    <hr/>

                    <h3>Tous les assets</h3>
                    <div>
                        {/*TODO*/}
                    </div>
                </div>
            )}
        </aside>
    )
}
