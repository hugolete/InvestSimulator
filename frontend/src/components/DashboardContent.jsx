import React, {useCallback, useEffect, useState} from 'react';
import PortfolioHeader from './PortfolioHeader';
import {getProfile} from "../api/profiles";
import {getFavorites} from "../api/favorites";
import {getAllPrices, getAssetDailyPercentages, getAssets} from "../api/assets";

function DashboardContent({ profileId }) {
    const [profile, setProfile] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [allAssets, setAllAssets] = useState([]);
    const [allPrices,setAllPrices] = useState({});
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

    // récup de tous les prix pour refresh
    useEffect(() => {
        const fetchAllPrices = () => {
            getAllPrices().then(pricesData => {
                setAllPrices(pricesData);
            })
        }

        fetchAllPrices();

        const intervalId = setInterval(fetchAllPrices, 15000);

        return () => clearInterval(intervalId);
    },[]);

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

    const extractActivePositions = (data) => {
        if (!Array.isArray(data)) return [];

        return data.filter(item =>
            item.symbol &&                   // Doit avoir un symbole
            item.symbol !== 'USD' &&         // On exclut le cash (souvent géré à part)
            item.quantity > 0.00000001 &&    // On ignore la "poussière"
            item.type !== 'currency'         // Optionnel: exclure les monnaies fiat
        );
    };

    if (!profile) {
        return <div>Chargement du profil...</div>;
    }

    const activePositions = extractActivePositions(profile);
    const totalWorth = profile.find(item => item.total_worth)?.total_worth || 0;
    const performance = profile.find(item => item.performance)?.performance || 0;
    const cash = profile.find(item => item.symbol === 'USD')?.quantity || 0;
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
