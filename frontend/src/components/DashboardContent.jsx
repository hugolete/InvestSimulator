import React, {useCallback, useEffect, useState} from 'react';
import PortfolioHeader from './PortfolioHeader';
import {getProfile} from "../api/profiles";
import {getFavorites} from "../api/favorites";
import {getAssetDailyPercentages, getAssets} from "../api/assets";
import {useOutletContext} from "react-router-dom";

function DashboardContent({ profileId }) {
    const [profile, setProfile] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [allAssets, setAllAssets] = useState([]);
    const { allPrices } = useOutletContext();
    const [allPercentages,setAllPercentages] = useState({})

    useEffect(() => {
        getProfile(profileId).then(data => {
            setProfile(data)
        }).catch(err => {
            console.error("Erreur lors du chargement du profil:", err);
        });
    },[profileId])

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
    },[profileId]);

    useEffect(() => {
        fetchFavorites();
    }, [profileId,fetchFavorites]);

    // récup pourcentages + refresh
    useEffect(() => {
        const fetchAllPercentages = () => {
            getAssetDailyPercentages().then(data => {
                const formatted = data.reduce((acc, curr) => {
                    acc[curr.symbol] = curr.percentage;
                    return acc;
                }, {});

                setAllPercentages(formatted);
            })
        }

        fetchAllPercentages()
        console.log(allPercentages)
        console.log(allPercentages["BTC"])

        const intervalId = setInterval(fetchAllPercentages, 15000);

        return () => clearInterval(intervalId);
    }, []);

    if (!profile) {
        return <div>Chargement du profil...</div>;
    }

    const activePositions = profile.assets?.filter(item =>
        item.symbol &&
        item.symbol !== 'USD' &&
        item.quantity > 0.00000001 &&
        item.type !== 'currency'
    ) ?? [];
    /*const totalWorth = profile.find(item => item.total_worth)?.total_worth || 0;
    const performance = profile.find(item => item.performance)?.performance || 0;
    const cash = profile.find(item => item.symbol === 'USD')?.quantity || 0;*/
    const totalWorth = profile.total_worth ?? 0;
    const performance = profile.performance ?? 0;
    const cash = profile.assets?.find(a => a.symbol === "USD")?.quantity ?? 0;
    const topAssetsSymbols = ["BTC", "NVDA", "AAPL", "QQQ", "SPY"];
    const topAssets = allAssets.filter(a => topAssetsSymbols.includes(a.symbol));

    return (
        <section>
            <PortfolioHeader profileId={profileId} />

            <div className="dashboard">
                {/* Section 1: Positions Ouvertes */}
                <section>
                    <h2>Mes Positions Ouvertes</h2>
                    <div className="position-table">
                        {/* En-tête */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', fontWeight: 'bold', padding: '10px' }}>
                            <span>Actif</span>
                            <span>Quantité</span>
                            <span>Valeur</span>
                            <span>Performance quotidienne</span>
                        </div>

                        {/* Lignes */}
                        {activePositions.map(pos => (
                            <div key={pos.symbol} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                                padding: '10px',
                                borderTop: '1px solid #eee'
                            }}>
                                <div>
                                    <strong>{pos.symbol}</strong> <small style={{color: '#666'}}>{pos.name}</small>
                                </div>
                                <div>{pos.quantity.toFixed(4)}</div>
                                <div style={{ fontWeight: '600' }}>{pos.worth.toLocaleString()} $</div>
                                <div style={{ color: allPercentages[pos.symbol] >= 0 ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                                    {allPercentages[pos.symbol] !== undefined ? `${allPercentages[pos.symbol].toFixed(2)}%` : "chargement..."}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section style={{ marginTop: '30px' }}>
                    <h2>Top 5 Assets</h2>
                    <div className="position-table">
                        {/* En-tête */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontWeight: 'bold', padding: '10px' }}>
                            <span>Actif</span>
                            <span>Valeur</span>
                            <span>Performance quotidienne</span>
                        </div>

                        {/* Lignes */}
                        {topAssets.map(asset => (
                            <div key={asset.symbol} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                padding: '10px',
                                borderTop: '1px solid #eee'
                            }}>
                                <div>
                                    <strong>{asset.symbol}</strong> <small style={{color: '#666'}}>{asset.name}</small>
                                </div>
                                <div>{allPrices[asset.symbol]
                                    ? `${allPrices[asset.symbol].toLocaleString()} $`
                                    : "—"
                                }</div>
                                <div style={{ color: allPercentages[asset.symbol] >= 0 ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                                    {allPercentages[asset.symbol] !== undefined ? `${allPercentages[asset.symbol].toFixed(2)}%` : "chargement..."}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

        </section>
    );
}

export default DashboardContent;
