import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {buyAsset, fetchAssetData, sellAsset} from "../api/assets";

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

    //récup données profil
    const { profileData, refreshProfile } = useOutletContext();

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
    console.log("Asset de l'user : ",asset, " pour le symbole : ",symbol)
    let assetQuantity = 0;
    let usdWorth = 0;
    if (asset && asset.quantity) {
        assetQuantity = asset.quantity;
        usdWorth = (assetQuantity * assetDetails.price).toFixed(2);
    }
    console.log("Asset quantity : ",assetQuantity)

    //TODO refresh des prix régulier
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
                    <p><strong>{assetQuantity} {assetDetails.symbol}</strong></p>
                    <p><strong>Valeur : {usdWorth} $</strong></p>
                </div>
            </div>
        </div>
    );
}
