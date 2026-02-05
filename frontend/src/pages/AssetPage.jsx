import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {buyAsset, fetchAssetData, fetchChartData, sellAsset} from "../api/assets";
import PriceChart from "../components/PriceChart";
import {getProfileHistory} from "../api/profiles";

export default function AssetPage({profileId}) {
    const { symbol } = useParams();
    const [assetDetails, setAssetDetails] = useState(null);
    const [assetPriceHistory, setAssetPriceHistory] = useState(null);
    const [assetPercentages, setAssetPercentages] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
    const [isSellMenuOpen, setIsSellMenuOpen] = useState(false);
    const [yesterdayPct, setYesterdayPct] = useState(null);
    const [yesterdayDiff, setYesterdayDiff] = useState(null);
    const [orderSymbol, setOrderSymbol] = useState(symbol);
    const [amountFiat, setAmountFiat] = useState(0);
    const [isAmountFiatInvalid, setIsAmountFiatInvalid] = useState(false);
    const [isAmountAssetInvalid, setIsAmountAssetInvalid] = useState(false);
    const [amountAsset, setAmountAsset] = useState(0);
    const [period, setPeriod] = useState("1h");
    const [userHistory, setUserHistory] = useState([]);

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
                //setChartData(formattedChartData);

                //récup prix d'hier et pourcentage
                const yesterdayPrice = historyObject["1d"]
                const yesterdayDiff = (allPrices[symbol] - yesterdayPrice).toFixed(2);
                //console.log("yesterday diff: ",yesterdayDiff);
                setYesterdayDiff(yesterdayDiff);
                setYesterdayPct(assetData.percentages["1d"]);
            })
        }
    }, [symbol]);

    const yesterdayPrice = assetPriceHistory?.history?.["1d"] || 0;
    const baseYesterdayPct = assetPercentages?.["1d"] || 0;

    //refresh des pourcentages avec les prix en temps réel
    useEffect(() => {
        if (allPrices && symbol && yesterdayPrice !== 0){
            if (allPrices[symbol] !== undefined){
                const diff = (allPrices[symbol] - yesterdayPrice).toFixed(2);
                setYesterdayDiff(diff);
                const pct = ((diff / yesterdayPrice) * 100).toFixed(2);
                setYesterdayPct(pct);
            }
        }
    })

    //Récup des données pour graphique
    useEffect(() => {
        if (symbol) {
            fetchChartData(symbol, period)
                .then(data => {
                    const formatted = data.data.map(item => ({
                        timestamp: item.timestamp,
                        price: item.close,
                        dateLabel: new Date(item.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        fullDate: new Date(item.timestamp).toLocaleString('fr-FR')
                    }));

                    setChartData(formatted);
                })
                .catch(err => {
                    console.error("Erreur lors du chargement du graphique:", err);
                });
        }
    }, [symbol, period]);

    // récup historique user pour calcul PnL
    useEffect(() => {
        getProfileHistory(profileId)
            .then(history => {
                setUserHistory(history);
            })
            .catch(err => {
                console.error("Erreur lors du chargement du graphique:", err);
            });
    }, [profileId, symbol]);

    //récup données profil
    const { profileData, refreshProfile, allPrices } = useOutletContext();

    if (!profileData) {
        return <div>Chargement des détails du profil...</div>;
    }

    if (!assetDetails && symbol) {
        return <p>Chargement des données de {symbol}...</p>;
    }

    //récup usd de l'user
    const usdAsset = profileData.find(item => item.symbol === "USD")
    //console.log("UsdAsset : ",usdAsset)
    const usdQuantity = usdAsset.quantity
    //console.log("UsdQuantity : ",usdQuantity)

    //récup asset de l'user
    const asset = profileData.find(item => item.symbol === symbol)
    //console.log("Asset de l'user : ",asset, " pour le symbole : ",symbol)
    let assetQuantity = 0;
    let usdWorth = 0;
    if (asset && asset.quantity) {
        assetQuantity = asset.quantity;
        usdWorth = (assetQuantity * assetDetails.price).toFixed(2);
    }

    const handleBuySubmit = (e) => {
        e.preventDefault()
        console.log("Form d'achat submit")

        const amount = parseFloat(amountFiat);
        console.log("Amount fiat:", amountFiat, " parsed: ",amount)

        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant d'achat valide (supérieur à 0).");
            console.error("Tentative d'achat avec un montant invalide");
            return;
        }

        const preciseUsdQuantity = parseFloat(usdQuantity.toFixed(8));
        if (amount > preciseUsdQuantity) {
            alert("Transaction annulée : Fonds insuffisants. Vous avez seulement $" + usdQuantity.toFixed(2) + " disponibles.");
            console.error("Tentative d'achat excédentaire:", amount, " vs ", preciseUsdQuantity);
            return;
        }

        buyAsset(profileId,orderSymbol,amountFiat).then(response => {
            console.log("Achat réussi :", response);

            const boughtQuantity = response.amount;
            const symbol = response.symbol || orderSymbol;
            const formattedQuantity = boughtQuantity.toFixed(5);

            alert(`Achat réussi ! Vous avez acheté ${formattedQuantity} ${symbol} pour $${amount.toFixed(2)}.`);

            if (refreshProfile) {
                refreshProfile();
            }
        }).catch(error => {
            console.error("Erreur lors de l'achat :", error);
            alert(`Échec de la transaction: ${error.message}`);alert(`Échec de la transaction: ${error.message}`);
        });
    }

    const handleSellSubmit = (e) => {
        e.preventDefault()
        console.log("Form de vente submit")

        const amount = parseFloat(amountAsset)
        console.log("Amount asset:", amountAsset, " parsed: ",amount)

        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant de vente valide (supérieur à 0).");
            console.error("Tentative de vente avec un montant invalide");
            return;
        }

        const preciseAssetQuantity = parseFloat(assetQuantity.toFixed(8));
        if (amount > preciseAssetQuantity) {
            alert("Transaction annulée : Fonds insuffisants. Vous avez seulement "+symbol+" "+ assetQuantity.toFixed(5) + " disponible pour la vente.");
            console.error("Tentative de vente excédentaire:", amount, " vs ", preciseAssetQuantity);
            return;
        }

        sellAsset(profileId,orderSymbol,amountAsset).then(response => {
            console.log("Vente réussie :", response);

            const soldQuantity = response.amount;
            const symbol = response.symbol || orderSymbol;
            const formattedQuantity = soldQuantity.toFixed(5);
            const usdReceived_string = response.total_price;
            const usdReceived = parseFloat(usdReceived_string).toFixed(2);

            alert(`Vente réussie ! Vous avez vendu ${formattedQuantity} ${symbol} pour $${usdReceived}.`);

            if (refreshProfile) {
                refreshProfile();
            }
        }).catch(error => {
            console.error("Erreur lors de la vente :", error);
        });
    }

    const handleSetMax = () => {
        // arrondir usdquantity
        const factor = Math.pow(10, 8);
        const maxAmount = Math.floor(usdQuantity * factor) / factor;

        setAmountFiat(maxAmount);
        setIsAmountFiatInvalid(false);
    };

    const handleSetMaxAsset = () => {
        const factor = Math.pow(10, 8);
        const maxAssetAmount = Math.floor(assetQuantity * factor) / factor;

        setAmountAsset(maxAssetAmount);
        setIsAmountAssetInvalid(false);
    }

    const calculatePnL = (history, symbol, currentPrice) => {
        const assetHistory = history.filter(t => t.symbol === symbol);

        let openCost = 0;
        let openQty = 0;
        let realizedPnL = 0;

        assetHistory.forEach(t => {
            if (t.side === 'BUY') {
                openCost += (t.quantity * t.price);
                openQty += t.quantity;
            } else if (t.side === 'SELL') {
                const currentPRU = openCost / openQty;
                // Profit réalisé = (prix de vente - PRU) * quantité vendue
                realizedPnL += (t.price - currentPRU) * t.quantity;

                // ajuste le stock restant proportionnellement
                openCost -= (t.quantity * currentPRU);
                openQty -= t.quantity;
            }
        });

        const finalPRU = openQty > 0.00000001 ? openCost / openQty : 0;
        const unrealizedPnL = openQty > 0.00000001 ? (currentPrice - finalPRU) * openQty: 0;

        return { unrealizedPnL, realizedPnL, finalPRU };
    };

    const { unrealizedPnL, realizedPnL, finalPRU } = calculatePnL(
        userHistory,
        symbol,
        assetDetails.price || 0.1
    );

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
                <h2>{assetDetails.name} ({symbol}) - Graphique ({period})</h2>
                <div className="chart-container" style={{ marginTop: '20px', background: '#f9f9f9', padding: '20px', borderRadius: '15px' }}>
                    <PriceChart
                        data={chartData}
                        color={yesterdayPct >= 0 ? "#4caf50" : "#f44336"} // Vert si positif, rouge si négatif
                        period={period}
                    />
                </div>
                <div
                    className="chart-buttons"
                    style={{ marginTop: '15px', display: 'flex', gap: '10px' }}
                >
                    <button onClick={() => setPeriod("1h")}>1H</button>
                    <button onClick={() => setPeriod("12h")}>12H</button>
                    <button onClick={() => setPeriod("1d")}>1D</button>
                    <button onClick={() => setPeriod("1w")}>7D</button>
                    <button onClick={() => setPeriod("1m")}>1MO</button>
                    <button onClick={() => setPeriod("6m")}>6MO</button>
                    <button onClick={() => setPeriod("1y")}>1A</button>
                    <button onClick={() => setPeriod("5y")}>5A</button>
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
                        Prix Actuel : ${allPrices[symbol] || 'N/A'}
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
                        <button
                            style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setIsBuyMenuOpen(true)}
                        >
                            Acheter
                        </button>
                        <button
                            style={{ flex: 1, padding: '10px', backgroundColor: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setIsSellMenuOpen(true)}
                        >
                            Vendre
                        </button>
                    </div>

                    {isBuyMenuOpen && (
                        <div className="buy-menu-overlay"
                             style={{
                                 position: 'fixed',
                                 top: 0,
                                 left: 0,
                                 width: '100%',
                                 height: '100%',
                                 backgroundColor: 'rgba(0, 0, 0, 0.5)', // fond semi-transparent
                                 display: 'flex',
                                 justifyContent: 'center',
                                 alignItems: 'center',
                                 zIndex: 1000
                             }}
                        >
                            <div className="buy-info"
                                 style={{
                                     backgroundColor: 'white',
                                     padding: '25px',
                                     borderRadius: '8px',
                                     width: '350px',
                                     boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                                     textAlign: 'center',
                                 }}
                            >
                                <h2>Ordre d'achat</h2>

                                <form onSubmit={handleBuySubmit}>
                                    <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                                        <label htmlFor="buy-symbol" style={{ display: 'block', marginBottom: '5px' }}><h4>Actif: <strong>{orderSymbol}</strong></h4></label>
                                    </div>
                                    <div>
                                        <label htmlFor="amount-fiat" style={{ display: 'block', marginBottom: '5px', textAlign:'left' }}>Montant en monnaie ($USD):</label>
                                        <div style={{ marginBottom: '15px', textAlign: 'left', display:'flex', alignItems:'stretch' }}>
                                            <input
                                                type="number"
                                                id="amount-fiat"
                                                value={amountFiat}
                                                onChange={(e) => {
                                                    const newValue = e.target.value;
                                                    const newNumericValue = parseFloat(newValue);

                                                    setAmountFiat(newValue);

                                                    const preciseUsdQuantity = parseFloat(usdQuantity.toFixed(8));

                                                    if (Number.isFinite(newNumericValue) && newNumericValue > 0 && newNumericValue > preciseUsdQuantity) {
                                                        setIsAmountFiatInvalid(true);
                                                    } else {
                                                        setIsAmountFiatInvalid(false);
                                                    }
                                                }}
                                                max={usdQuantity}
                                                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: isAmountFiatInvalid ? '2px solid red' : '1px solid #ccc', flexGrow: 1 }}
                                            />

                                            <button
                                                type="button"
                                                onClick={handleSetMax}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    height: 'auto',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                Max
                                            </button>

                                            {/* message d'erreur */}
                                            {isAmountFiatInvalid && (
                                                <p style={{ color: 'red', fontSize: '0.9rem', marginTop: '5px' }}>
                                                    Montant maximal dépassé. Solde disponible : ${usdQuantity.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="buy-menu-buttons" style={{display: 'flex', justifyContent: 'center', marginTop: '25px', gap:'12px'}}>
                                        <button
                                            type="submit"
                                            style={{
                                                flex: '1',
                                                padding: '12px 20px',
                                            }}
                                        >
                                            Acheter
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsBuyMenuOpen(false)}
                                            style={{
                                                flex: '1',
                                                padding: '12px 20px',
                                            }}>
                                            Fermer
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                    {isSellMenuOpen && (
                        <div className="sell-menu-overlay"
                             style={{
                                 position: 'fixed',
                                 top: 0,
                                 left: 0,
                                 width: '100%',
                                 height: '100%',
                                 backgroundColor: 'rgba(0, 0, 0, 0.5)', // fond semi-transparent
                                 display: 'flex',
                                 justifyContent: 'center',
                                 alignItems: 'center',
                                 zIndex: 1000
                             }}
                        >
                            <div className="sell-info"
                                 style={{
                                     backgroundColor: 'white',
                                     padding: '25px',
                                     borderRadius: '8px',
                                     width: '350px',
                                     boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                                     textAlign: 'center',
                                 }}
                            >
                                <h2>Ordre de vente</h2>

                                <form onSubmit={handleSellSubmit}>
                                    <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                                        <label htmlFor="sell-symbol" style={{ display: 'block', marginBottom: '5px' }}><h4>Actif: <strong>{orderSymbol}</strong></h4></label>
                                    </div>
                                    <div>
                                        <label htmlFor="amount-asset" style={{ display: 'block', marginBottom: '5px', textAlign:'left' }}>Nombre de l'asset à vendre ({orderSymbol}):</label>
                                        <div style={{ marginBottom: '15px', textAlign: 'left', display:'flex', alignItems:'stretch' }}>
                                            <input
                                                type="number"
                                                id="amount-asset"
                                                value={amountAsset}
                                                onChange={(e) => {
                                                    const newValue = e.target.value;
                                                    const newNumericValue = parseFloat(newValue);

                                                    setAmountAsset(newValue);

                                                    const preciseAssetQuantity = parseFloat(usdQuantity.toFixed(8));

                                                    if (Number.isFinite(newNumericValue) && newNumericValue > 0 && newNumericValue > preciseAssetQuantity) {
                                                        setIsAmountFiatInvalid(true);
                                                    } else {
                                                        setIsAmountFiatInvalid(false);
                                                    }
                                                }}
                                                max={usdQuantity}
                                                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: isAmountFiatInvalid ? '2px solid red' : '1px solid #ccc', flexGrow: 1 }}
                                            />

                                            <button
                                                type="button"
                                                onClick={handleSetMaxAsset}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    height: 'auto',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                Max
                                            </button>

                                            {/* message d'erreur */}
                                            {isAmountAssetInvalid && (
                                                <p style={{ color: 'red', fontSize: '0.9rem', marginTop: '5px' }}>
                                                    Montant maximal dépassé. Assets disponible : ${assetQuantity.toFixed(5)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="sell-menu-buttons" style={{display: 'flex', justifyContent: 'center', marginTop: '25px', gap:'12px'}}>
                                        <button
                                            type="submit"
                                            style={{
                                                flex: '1',
                                                padding: '12px 20px',
                                            }}
                                        >
                                            Vendre
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsSellMenuOpen(false)}
                                            style={{
                                                flex: '1',
                                                padding: '12px 20px',
                                            }}>
                                            Fermer
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
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
                <div
                    className="asset-user-details"
                    style={{
                        backgroundColor: '#fff',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <h3>Vous possédez:</h3>
                    <p><strong>{Number(assetQuantity) < 0.00000001 ? "0" : Number(assetQuantity).toFixed(8)} {assetDetails.symbol}</strong></p>
                    <p><strong>Valeur : {Number(usdWorth).toFixed(2)} $</strong></p>
                    <p><strong>Profit/perte latent : {Number(unrealizedPnL).toFixed(2)} $</strong></p>
                    <p><strong>Profit/perte réalisé : {Number(realizedPnL).toFixed(2)} $</strong></p>
                    <p><strong>Prix de revient unitaire : {Number(finalPRU).toFixed(2)} $</strong></p>
                </div>

            </div>
        </div>
    );
}
