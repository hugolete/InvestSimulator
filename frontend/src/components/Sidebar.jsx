import React, {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {getAssets} from "../api/assets";
import {addFavorite, getFavorites, deleteFavorite} from "../api/favorites";
import {Search, Star, TrendingUp, Plus, Minus, LayoutDashboard, ChevronRight, X} from "lucide-react";

export default function Sidebar({isOpen, profileId, allPrices}) {
    const navigate = useNavigate();
    const [allAssets, setAllAssets] = useState([]);
    const [search, setSearch] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showRemove, setShowRemove] = useState(false);

    useEffect(() => {
        getAssets().then(assetsData => {
            const filter = assetsData.filter(a => a.type === "stock" || a.type === "etf" || a.type === "crypto");
            setAllAssets(filter);
        });
    }, []);

    const fetchFavorites = useCallback(() => {
        getFavorites(profileId).then(setFavorites)
            .catch(err => {
                console.error(err);
                setFavorites([]);
            });
    }, [profileId]);

    useEffect(() => {
        fetchFavorites();
    }, [profileId, fetchFavorites]);

    const addableAssets = allAssets.filter(a => !favorites.includes(a.symbol));
    const removableAssets = allAssets.filter(a => favorites.includes(a.symbol));

    const filteredAssets = search.length > 0 ? allAssets.filter(
        asset =>
            asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
            asset.name.toLowerCase().includes(search.toLowerCase())
    ) : [];

    function handleAssetClick(symbol) {
        navigate(`/dashboard/asset/${symbol}`);
        setSearch("");
    }

    const handleAddFavorite = async (symbol) => {
        try {
            await addFavorite(profileId, symbol);
            fetchFavorites();
            setShowAdd(false);
        } catch (error) {
            console.error("Erreur lors de l'ajout du favori:", error);
        }
    };

    const handleDeleteFavorite = async (symbol) => {
        try {
            await deleteFavorite(profileId, symbol);
            fetchFavorites();
            setShowRemove(false);
        } catch (error) {
            console.error("Erreur lors de la suppression du favori:", error);
        }
    };

    const topAssetsSymbols = ["BTC", "NVDA", "AAPL", "QQQ", "SPY"];
    const topAssets = allAssets.filter(a => topAssetsSymbols.includes(a.symbol));
    const otherAssets = allAssets.filter(a => !topAssetsSymbols.includes(a.symbol) && !favorites.includes(a.symbol));

    if (!isOpen) return null;

    return (
        <aside
            style={{
                width: "280px",
                backgroundColor: "#131b2e",
                borderRight: "1px solid #1e293b",
                padding: "20px 16px",
                height: "100vh",
                overflowY: "auto",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "20px"
            }}
        >
            {/* Search bar */}
            <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                    type="search"
                    placeholder="Rechercher un actif..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
                        fontSize: "13px",
                        boxSizing: "border-box",
                        backgroundColor: "#1a233d",
                        border: "1px solid #2a3a5e",
                        borderRadius: "8px",
                        color: "#f8fafc"
                    }}
                />
            </div>

            {/* Search results view */}
            {search.length > 0 ? (
                <div>
                    <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", marginBottom: "12px" }}>
                        Résultats de recherche
                    </h4>
                    {filteredAssets.length === 0 && (
                        <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Aucun résultat trouvé</p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {filteredAssets.map(asset => (
                            <div
                                key={asset.symbol}
                                onClick={() => handleAssetClick(asset.symbol)}
                                style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    borderRadius: "8px",
                                    backgroundColor: "#1a233d",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div>
                                    <strong style={{ fontSize: "13px", color: "#f8fafc" }}>{asset.symbol}</strong>
                                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{asset.name}</div>
                                </div>
                                <span className="mono" style={{ fontSize: "13px", color: "#38bdf8" }}>
                                    {allPrices[asset.symbol] ? `$${allPrices[asset.symbol].toFixed(2)}` : "—"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Dashboard button */}
                    <button
                        onClick={() => navigate("/dashboard")}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            backgroundColor: "#1a233d",
                            color: "#f8fafc",
                            border: "1px solid #2a3a5e",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                            textAlign: "left"
                        }}
                    >
                        <LayoutDashboard size={18} color="#38bdf8" />
                        <span>Dashboard Principal</span>
                    </button>

                    {/* Top Assets */}
                    <div>
                        <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <TrendingUp size={14} /> Top Marchés
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {topAssets.map(asset => {
                                const price = allPrices[asset.symbol];
                                return (
                                    <div
                                        key={asset.symbol}
                                        onClick={() => handleAssetClick(asset.symbol)}
                                        style={{
                                            padding: "10px 12px",
                                            cursor: "pointer",
                                            borderRadius: "8px",
                                            backgroundColor: "transparent",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1a233d"}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        <div>
                                            <strong style={{ fontSize: "13px", color: "#f8fafc" }}>{asset.symbol}</strong>
                                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{asset.name}</div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div className="mono" style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                                                {price ? `$${price.toFixed(2)}` : "—"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ height: "1px", backgroundColor: "#1e293b" }} />

                    {/* Favorites */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                                <Star size={14} /> Watchlist / Favoris
                            </h4>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                    onClick={() => { setShowAdd(!showAdd); setShowRemove(false); }}
                                    style={{
                                        width: "26px",
                                        height: "26px",
                                        backgroundColor: "#1a233d",
                                        color: "#00c853",
                                        border: "1px solid #2a3a5e",
                                        borderRadius: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer"
                                    }}
                                    title="Ajouter aux favoris"
                                >
                                    <Plus size={14} />
                                </button>
                                <button
                                    onClick={() => { setShowRemove(!showRemove); setShowAdd(false); }}
                                    style={{
                                        width: "26px",
                                        height: "26px",
                                        backgroundColor: "#1a233d",
                                        color: "#ff3d00",
                                        border: "1px solid #2a3a5e",
                                        borderRadius: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer"
                                    }}
                                    title="Retirer des favoris"
                                >
                                    <Minus size={14} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {favorites.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>Aucun favori pour l'instant.</p>
                            ) : (
                                favorites.map(symbol => {
                                    const asset = allAssets.find(a => a.symbol === symbol);
                                    if (!asset) return null;
                                    const price = allPrices[asset.symbol];
                                    return (
                                        <div
                                            key={asset.symbol}
                                            onClick={() => handleAssetClick(asset.symbol)}
                                            style={{
                                                padding: "10px 12px",
                                                cursor: "pointer",
                                                borderRadius: "8px",
                                                backgroundColor: "transparent",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center"
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1a233d"}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                        >
                                            <div>
                                                <strong style={{ fontSize: "13px", color: "#f8fafc" }}>{asset.symbol}</strong>
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{asset.name}</div>
                                            </div>
                                            <span className="mono" style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                                                {price ? `$${price.toFixed(2)}` : "—"}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div style={{ height: "1px", backgroundColor: "#1e293b" }} />

                    {/* All other assets */}
                    <div>
                        <h4 style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", marginBottom: "12px" }}>
                            Tous les actifs
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {otherAssets.map(asset => {
                                const price = allPrices[asset.symbol];
                                return (
                                    <div
                                        key={asset.symbol}
                                        onClick={() => handleAssetClick(asset.symbol)}
                                        style={{
                                            padding: "10px 12px",
                                            cursor: "pointer",
                                            borderRadius: "8px",
                                            backgroundColor: "transparent",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1a233d"}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        <div>
                                            <strong style={{ fontSize: "13px", color: "#f8fafc" }}>{asset.symbol}</strong>
                                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{asset.name}</div>
                                        </div>
                                        <span className="mono" style={{ fontSize: "13px", color: "#94a3b8" }}>
                                            {price ? `$${price.toFixed(2)}` : "—"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add Favorite */}
            {showAdd && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
                }}>
                    <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Ajouter aux favoris</h3>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {addableAssets.map(asset => (
                                <div
                                    key={asset.symbol}
                                    onClick={() => handleAddFavorite(asset.symbol)}
                                    style={{
                                        padding: '10px 12px', cursor: 'pointer', backgroundColor: '#1a233d', borderRadius: '8px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <strong style={{ color: '#f8fafc' }}>{asset.symbol}</strong>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{asset.name}</div>
                                    </div>
                                    <Plus size={16} color="#00c853" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Remove Favorite */}
            {showRemove && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
                }}>
                    <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px', width: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Retirer des favoris</h3>
                            <button onClick={() => setShowRemove(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {removableAssets.map(asset => (
                                <div
                                    key={asset.symbol}
                                    onClick={() => handleDeleteFavorite(asset.symbol)}
                                    style={{
                                        padding: '10px 12px', cursor: 'pointer', backgroundColor: '#1a233d', borderRadius: '8px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <strong style={{ color: '#f8fafc' }}>{asset.symbol}</strong>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{asset.name}</div>
                                    </div>
                                    <Minus size={16} color="#ff3d00" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
