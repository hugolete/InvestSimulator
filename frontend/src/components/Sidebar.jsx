import React, {useCallback, useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {getAssets} from "../api/assets";
import {addFavorite, getFavorites, deleteFavorite} from "../api/favorites";

export default function Sidebar({isOpen, profileId}) {
    const navigate = useNavigate();
    const [allAssets, setAllAssets] = useState([]);
    const [search, setSearch] = useState("");
    const [favorites, setFavorites] = useState([])
    const [showAdd, setShowAdd] = useState(false)
    const [showRemove, setShowRemove] = useState(false)

    // récup liste des assets
    useEffect(() => {
        getAssets().then(assetsData => {
            const filter = assetsData.filter(a => a.type === "stock" || a.type === "etf" || a.type === "crypto");
            setAllAssets(filter);
        });
    }, []);

    //récup des favoris de l'user
    const fetchFavorites = useCallback(() => {
        getFavorites(profileId).then(setFavorites)
            .catch(err => {
                console.error(err);
                setFavorites([]);
            });
    },[profileId]);

    useEffect(() => {
        fetchFavorites();
    }, [profileId,fetchFavorites]);

    const addableAssets = allAssets.filter(a => !favorites.includes(a.symbol))
    const removableAssets = allAssets.filter(a => favorites.includes(a.symbol))

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

    const handleAddFavorite = async (symbol) => {
        try {
            await addFavorite(profileId, symbol);
            fetchFavorites(); // refresh de la liste
            setShowAdd(false); //fermeture fenetre
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

    return(
        <aside
            style={{
                width: "250px",
                borderRight: "1px solid #ccc",
                padding: "1rem",
                display: isOpen ? 'block' : 'none',
                height: "100vh",
                overflowY: "auto"
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
                        flexDirection: "column",
                    }}>
                        <div className="favoris-header" style={{
                            display: "flex",
                            justifyContent: 'space-between',
                            alignItems: "center",
                        }}>
                            <h3>Favoris</h3>
                            <div className="boutons" style={{
                                display: "flex",
                                gap: "0.7rem",
                                alignItems: "center",
                            }}>
                                <button onClick={() => {
                                    setShowAdd(!showAdd);
                                    setShowRemove(false);
                                }}
                                >+</button>
                                <button onClick={() => {
                                    setShowRemove(!showRemove);
                                    setShowAdd(false);
                                }}
                                >-</button>
                            </div>
                        </div>
                        <div className="favoris-content">
                            {favorites.map(symbol => {
                                const asset = allAssets.find(asset => asset.symbol === symbol);

                                if (!asset) {
                                    return null;
                                }

                                return(
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
                                )
                            })}
                        </div>

                        {/* rendu conditionnel : pour le menu d'ajout aux favoris */}
                        {showAdd && (
                            <div className="favorite-add-overlay"
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
                                <div className="favorite-add"
                                     style={{
                                         backgroundColor: 'white',
                                         padding: '25px',
                                         borderRadius: '8px',
                                         width: '350px',
                                         boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                                         onClickCapture: (e) => e.stopPropagation()
                                     }}
                                >
                                    <div
                                        className="favorite-add-header"
                                        style={{
                                            display: 'flex',
                                            gap:'12px',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <h4>Ajouter un asset aux favoris</h4>
                                        <button
                                            onClick={() => {setShowAdd(false)}}
                                            style={{
                                                padding: '12px 20px'
                                            }}>Fermer</button>
                                    </div>
                                    <div className="favorite-add-assets" style={{
                                        marginBottom: '15px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        paddingRight: '10px'
                                    }}>
                                        {addableAssets.map(asset => (
                                            <div
                                                key={asset.symbol}
                                                onClick={() => handleAddFavorite(asset.symbol)}
                                                style={{
                                                    padding: "0.5rem 0",
                                                    cursor: "pointer",
                                                    display: 'block',
                                                    borderBottom: '1px solid #eee'
                                                }}
                                            >
                                                <strong>{asset.symbol}</strong>
                                                <div style={{ fontSize: "0.8rem", color: "gray" }}>
                                                    {asset.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* rendu conditionnel : pour le menu de suppression d'un favori */}
                        {showRemove && (
                            <div className="favorite-remove-overlay"
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
                                <div className="favorite-remove"
                                     style={{
                                         backgroundColor: 'white',
                                         padding: '25px',
                                         borderRadius: '8px',
                                         width: '350px',
                                         boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                                         onClickCapture: (e) => e.stopPropagation()
                                     }}
                                >
                                    <div
                                        className="favorite-remove-header"
                                        style={{
                                            display: 'flex',
                                            gap:'12px',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <h4>Supprimer un asset des favoris</h4>
                                        <button
                                            onClick={() => {setShowRemove(false)}}
                                            style={{
                                                padding: '12px 20px'
                                            }}>Fermer</button>
                                    </div>
                                    <div className="favorite-remove-assets" style={{
                                        marginBottom: '15px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        paddingRight: '10px'
                                    }}>
                                        {removableAssets.map(asset => (
                                            <div
                                                key={asset.symbol}
                                                onClick={() => handleDeleteFavorite(asset.symbol)}
                                                style={{
                                                    padding: "0.5rem 0",
                                                    cursor: "pointer",
                                                    display: 'block',
                                                    borderBottom: '1px solid #eee'
                                                }}
                                            >
                                                <strong>{asset.symbol}</strong>
                                                <div style={{ fontSize: "0.8rem", color: "gray" }}>
                                                    {asset.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <hr/>

                    <h3>Tous les assets</h3>
                    <div>
                        {/*TODO Liste de tous les assets non présents dans le top 5 et/ou les favoris*/}
                        {otherAssets.map(asset => (
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
                    </div>
                </div>
            )}
        </aside>
    )
}
