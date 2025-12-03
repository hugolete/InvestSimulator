import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {fetchAssetData, getAsset} from "../api/assets";

export default function AssetPage() {
    const { symbol } = useParams();
    const [assetDetails, setAssetDetails] = useState(null);
    const [assetPriceHistory, setAssetPriceHistory] = useState(null);
    const [assetPercentages, setAssetPercentages] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
    const [isSellMenuOpen, setIsSellMenuOpen] = useState(false);
    const [yesterdayPct, setYesterdayPct] = useState(null);
    const [yesterdayDiff, setYesterdayDiff] = useState(null);

    //récup des données de l'asset
    useEffect(() => {
        if (symbol) {
            fetchAssetData(symbol).then(assetData => {
                console.log("AssetData : ",assetData)
                setAssetDetails(assetData.asset);
                setAssetPriceHistory(assetData.history);
                setAssetPercentages(assetData.percentages);

                // Préparer les données pour le graphique
                const historyObject = assetData.history.history;
                const formattedChartData = Object.entries(historyObject).map(([period, price]) => ({
                    date: period,
                    price: price,
                }));
                setChartData(formattedChartData);

                //récup prix d'hier et pourcentage
                const yesterdayPrice = historyObject["1d"]
                const yesterdayDiff = (assetData.asset.price - yesterdayPrice).toFixed(2);
                console.log("yesterday diff: ",yesterdayDiff);
                setYesterdayDiff(yesterdayDiff);

                setYesterdayPct(assetData.percentages["1d"]);
            })
        }
    }, [symbol]);

    console.log("Yesterday pct : ",yesterdayPct);

    if (!assetDetails && symbol) {
        return <p>Chargement des données de {symbol}...</p>;
    }

    //TODO refresh des prix
    {/*useEffect(() => {
        if (!symbol) return;

        const fetchCurrentPrice = () => {
            getAsset(symbol)
                .then(data => {
                    setAssetDetails(prevDetails => ({
                        ...prevDetails, // garde les autres détails (nom, type, description)
                        price: data.price
                    }));
                })
                .catch(error => {
                    console.error("Erreur de rafraîchissement du prix:", error);
                });
        };

        // Démarre l'interrogation (polling), intervalle 10s
        const intervalId = setInterval(fetchCurrentPrice, 10000);

        // nettoyage : s'exécute lorsque le composant est démonté ou lorsque les dépendances ([symbol]) changent.
        return () => {
            clearInterval(intervalId); // Arrête le polling
            console.log("Polling arrêté.");
        };
    }, [symbol]);*/}

    return (
        <div
            className="asset-page-container"
            style={{
                display: 'flex',
                gap: '20px',
                padding: '20px',
                width: '100%',
                minHeight: '80vh'
            }}
        >
            {/* Graphique */}
            <div
                className="chart-section"
                style={{
                    flex: '3', //75% de la largeur
                    backgroundColor: '#fff',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                <h2>{assetDetails.name} ({symbol}) - Graphique</h2>
                {/* TODO graphique */}
                <div style={{ height: '500px', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    [Espace réservé pour le graphique]
                </div>
            </div>

            {/* Partie droite */}
            <div
                className="trading-info-section"
                style={{
                    flex: '1', // Prend environ 25% de la largeur restante
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}
            >
                {/* Bloc trading */}
                <div
                    className="trading-actions"
                    style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <h3>Trading</h3>
                    <p style={{ fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '15px' }}>
                        Prix Actuel : ${assetDetails.price || 'N/A'}
                    </p>

                    {/* pourcentage par rapport au jour précédent */}
                    <p
                        style={{
                            marginBottom: '15px',
                            color: yesterdayPct>=0 ? "green" : "red",
                            fontWeight: "bold",
                        }}
                    >
                        {yesterdayPct>=0 ? "+" : ""}
                        {yesterdayDiff.toLocaleString()} $ ({yesterdayPct}%)
                    </p>

                    {/* Boutons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Acheter
                        </button>
                        <button style={{ flex: 1, padding: '10px', backgroundColor: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Vendre
                        </button>
                    </div>
                    {/* TODO rendu conditionnel pour chaque ordre */}
                </div>

                {/* Infos sur l'actif */}
                <div
                    className="asset-details"
                    style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <h3>Informations sur l'actif</h3>
                    <p><strong>Symbole:</strong> {assetDetails.symbol}</p>
                    <p><strong>Nom:</strong> {assetDetails.name}</p>
                    <p><strong>Type:</strong> {assetDetails.type}</p>
                </div>
            </div>
        </div>
    );
}
