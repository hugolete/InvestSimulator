import React, {useEffect, useState} from 'react';
import PortfolioHeader from './PortfolioHeader';
import {getAssetDailyPercentages, getAssets} from "../api/assets";
import {useOutletContext, useNavigate} from "react-router-dom";
import {TrendingUp, Briefcase, ArrowUpRight, ArrowDownRight} from "lucide-react";

function DashboardContent() {
    // Le profil est chargé (et rafraîchi après chaque trade) par Dashboard, partagé via le contexte
    const { profileData: profile, allPrices } = useOutletContext();
    const [allAssets, setAllAssets] = useState([]);
    const [allPercentages, setAllPercentages] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        getAssets().then(assetsData => {
            const filter = assetsData.filter(a => a.type === "stock" || a.type === "etf" || a.type === "crypto");
            setAllAssets(filter);
        }).catch(err => console.error("Erreur lors du chargement des actifs:", err));
    }, []);

    useEffect(() => {
        const fetchAllPercentages = () => {
            getAssetDailyPercentages().then(data => {
                const formatted = data.reduce((acc, curr) => {
                    acc[curr.symbol] = curr.percentage;
                    return acc;
                }, {});
                setAllPercentages(formatted);
            }).catch(err => console.error("Erreur lors du chargement des performances:", err));
        };

        fetchAllPercentages();
        const intervalId = setInterval(fetchAllPercentages, 15000);
        return () => clearInterval(intervalId);
    }, []);

    if (!profile) {
        return <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Chargement du profil...</div>;
    }

    const activePositions = profile.assets?.filter(item =>
        item.symbol &&
        item.symbol !== 'USD' &&
        item.quantity > 0.00000001 &&
        item.type !== 'currency'
    ) ?? [];

    const topAssetsSymbols = ["BTC", "NVDA", "AAPL", "QQQ", "SPY"];
    const topAssets = allAssets.filter(a => topAssetsSymbols.includes(a.symbol));

    return (
        <div style={{ padding: "10px 20px" }}>
            <PortfolioHeader profile={profile} />

            {/* Section 1: Positions Ouvertes */}
            <div style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Briefcase size={20} color="#2962ff" />
                    <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>Mes Positions Ouvertes</h2>
                </div>

                <div style={{
                    backgroundColor: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    overflow: "hidden"
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr',
                        padding: '14px 20px',
                        borderBottom: '1px solid #1e293b',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#94a3b8',
                        fontWeight: '600'
                    }}>
                        <span>Actif</span>
                        <span>Quantité</span>
                        <span>Prix Unitaire</span>
                        <span>Valeur</span>
                        <span>Performance 24h</span>
                    </div>

                    {activePositions.length === 0 ? (
                        <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                            Aucune position ouverte. Explorez les marchés et effectuez votre premier achat !
                        </div>
                    ) : (
                        activePositions.map(pos => {
                            const pct = allPercentages[pos.symbol] ?? 0;
                            const isPositive = pct >= 0;
                            const unitPrice = pos.quantity > 0 ? pos.worth / pos.quantity : (allPrices[pos.symbol] ?? 0);
                            return (
                                <div
                                    key={pos.symbol}
                                    onClick={() => navigate(`/dashboard/asset/${pos.symbol}`)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr',
                                        padding: '16px 20px',
                                        borderBottom: '1px solid #1e293b',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1a233d"}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "36px", height: "36px", backgroundColor: "#1a233d", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#38bdf8", fontSize: "12px" }}>
                                            {pos.symbol.slice(0, 3)}
                                        </div>
                                        <div>
                                            <strong style={{ fontSize: "14px", color: "#f8fafc" }}>{pos.symbol}</strong>
                                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>{pos.name}</div>
                                        </div>
                                    </div>
                                    <div className="mono" style={{ fontSize: "14px", color: "#cbd5e1" }}>
                                        {pos.quantity.toFixed(4)}
                                    </div>
                                    <div className="mono" style={{ fontSize: "14px", color: "#cbd5e1" }}>
                                        ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="mono" style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}>
                                        ${pos.worth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: isPositive ? "#00c853" : "#ff3d00", fontWeight: "600" }}>
                                        {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                        <span className="mono">{isPositive ? "+" : ""}{pct.toFixed(2)}%</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Section 2: Top Markets */}
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <TrendingUp size={20} color="#00c853" />
                    <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>Top Marchés & Tendances</h2>
                </div>

                <div style={{
                    backgroundColor: "#131b2e",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    overflow: "hidden"
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr 1.5fr',
                        padding: '14px 20px',
                        borderBottom: '1px solid #1e293b',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#94a3b8',
                        fontWeight: '600'
                    }}>
                        <span>Actif</span>
                        <span>Prix Actuel</span>
                        <span>Performance 24h</span>
                    </div>

                    {topAssets.map(asset => {
                        const price = allPrices[asset.symbol];
                        const pct = allPercentages[asset.symbol] ?? 0;
                        const isPositive = pct >= 0;
                        return (
                            <div
                                key={asset.symbol}
                                onClick={() => navigate(`/dashboard/asset/${asset.symbol}`)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1.5fr',
                                    padding: '16px 20px',
                                    borderBottom: '1px solid #1e293b',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1a233d"}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{ width: "36px", height: "36px", backgroundColor: "#1a233d", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#00c853", fontSize: "12px" }}>
                                        {asset.symbol.slice(0, 3)}
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: "14px", color: "#f8fafc" }}>{asset.symbol}</strong>
                                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>{asset.name}</div>
                                    </div>
                                </div>
                                <div className="mono" style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}>
                                    {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: isPositive ? "#00c853" : "#ff3d00", fontWeight: "600" }}>
                                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    <span className="mono">{isPositive ? "+" : ""}{pct.toFixed(2)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default DashboardContent;
