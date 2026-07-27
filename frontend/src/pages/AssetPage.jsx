import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { buyAsset, fetchAssetData, fetchChartData, sellAsset } from "../api/assets";
import PriceChart from "../components/PriceChart";
import { getProfileHistory } from "../api/profiles";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Info, Wallet, ShieldCheck, X } from "lucide-react";

export default function AssetPage({ profileId }) {
    const { symbol } = useParams();
    const { profileData, refreshProfile, allPrices } = useOutletContext();

    const [assetDetails, setAssetDetails] = useState(null);
    const [assetPriceHistory, setAssetPriceHistory] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
    const [isSellMenuOpen, setIsSellMenuOpen] = useState(false);
    const [orderSymbol, setOrderSymbol] = useState(symbol);
    const [amountFiat, setAmountFiat] = useState(0);
    const [isAmountFiatInvalid, setIsAmountFiatInvalid] = useState(false);
    const [isAmountAssetInvalid, setIsAmountAssetInvalid] = useState(false);
    const [amountAsset, setAmountAsset] = useState(0);
    const [period, setPeriod] = useState("1d");
    const [userHistory, setUserHistory] = useState([]);
    const [comment] = useState("MANUAL");

    useEffect(() => {
        setOrderSymbol(symbol);
    }, [symbol]);

    useEffect(() => {
        if (!symbol) return;
        setAssetDetails(null);
        setAssetPriceHistory(null);

        fetchAssetData(symbol).then(assetData => {
            console.log("AssetData : ",assetData)
            setAssetDetails(assetData.asset);
            setAssetPriceHistory(assetData.history);
        });
    }, [symbol]);

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
                console.error("Erreur lors du chargement de l'historique:", err);
            });
    }, [profileId, symbol]);

    useEffect(() => {
        if (!symbol) return;
        const interval = setInterval(() => {
            fetchAssetData(symbol).then(data => {
                setAssetDetails(data.asset)
            })
        }, 30000) // refresh toutes les 30s
        return () => clearInterval(interval)
    }, [symbol])

    const usdQuantity = profileData.assets?.find(a => a.symbol === "USD")?.quantity ?? 0;
    const asset = profileData.assets?.find(a => a.symbol === symbol);

    let assetQuantity = 0;
    let usdWorth = 0;
    if (asset && asset.quantity) {
        assetQuantity = asset.quantity;
        usdWorth = (assetQuantity * (assetDetails?.price || allPrices[symbol] || 0)).toFixed(2);
    }

    const handleBuySubmit = (e) => {
        e.preventDefault();
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

        buyAsset(profileId,orderSymbol,amountFiat,comment).then(response => {
            console.log("Achat réussi :", response);

            const boughtQuantity = response.amount;
            const symbol = response.symbol || orderSymbol;
            alert(`Achat réussi ! Vous avez acheté ${boughtQuantity.toFixed(5)} ${symbol} pour $${amount.toFixed(2)}.`);
            setIsBuyMenuOpen(false);

            if (refreshProfile) refreshProfile();
        }).catch(error => {
            alert(`Échec de la transaction: ${error.message}`);
        });
    };

    const handleSellSubmit = (e) => {
        e.preventDefault()
        const amount = parseFloat(amountAsset)
        console.log("Amount asset:", amountAsset, " parsed: ",amount)

        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant de vente valide (supérieur à 0).");
            console.error("Tentative de vente avec un montant invalide");
            return;
        }

        const preciseAssetQuantity = parseFloat(assetQuantity.toFixed(8));
        if (amount > preciseAssetQuantity) {
            alert(`Transaction annulée : Fonds insuffisants. Vous avez seulement ${symbol} ${assetQuantity.toFixed(5)} disponible.`);
            return;
        }

        sellAsset(profileId, orderSymbol, amountAsset, comment).then(response => {
            const soldQuantity = response.amount;
            const sym = response.symbol || orderSymbol;
            const usdReceived = parseFloat(response.total_price).toFixed(2);
            alert(`Vente réussie ! Vous avez vendu ${soldQuantity.toFixed(5)} ${sym} pour $${usdReceived}.`);
            setIsSellMenuOpen(false);
            if (refreshProfile) refreshProfile();
        }).catch(error => {
            alert(`Échec de la vente: ${error.message}`);
        });
    };

    const handleSetMax = () => {
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
    };

    const calculatePnL = (history, sym, currentPrice) => {
        const assetHistory = history.filter(t => t.symbol === sym);
        let openCost = 0;
        let openQty = 0;
        let realizedPnL = 0;

        assetHistory.forEach(t => {
            if (t.side === 'BUY') {
                openCost += (t.quantity * t.price);
                openQty += t.quantity;
            } else if (t.side === 'SELL') {
                if (openQty > 0) {
                    const currentPRU = openCost / openQty;
                    realizedPnL += (t.price - currentPRU) * t.quantity;
                    openCost -= (t.quantity * currentPRU);
                    openQty -= t.quantity;
                }
            }
        });

        const finalPRU = openQty > 0.00000001 ? openCost / openQty : 0;
        const unrealizedPnL = openQty > 0.00000001 ? (currentPrice - finalPRU) * openQty : 0;
        return { unrealizedPnL, realizedPnL, finalPRU };
    };

    const currentPrice = assetDetails?.price ?? allPrices[symbol] ?? 0;
    const { unrealizedPnL, realizedPnL, finalPRU } = calculatePnL(userHistory, symbol, currentPrice);

    const historyObject = assetPriceHistory?.history || {};
    const yesterdayPrice = historyObject["1d"] || currentPrice;
    const yesterdayDiff = currentPrice - yesterdayPrice;
    const yesterdayPct = yesterdayPrice > 0 ? ((yesterdayDiff / yesterdayPrice) * 100).toFixed(2) : "0.00";
    const isPositive = parseFloat(yesterdayPct) >= 0;

    const periods = [
        { label: "1H", value: "1h" },
        { label: "12H", value: "12h" },
        { label: "1J", value: "1d" },
        { label: "7J", value: "1w" },
        { label: "1M", value: "1m" },
        { label: "6M", value: "6m" },
        { label: "1A", value: "1y" },
        { label: "5A", value: "5y" }
    ];

    if (!assetDetails) {
        return <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>Chargement des données du marché...</div>;
    }

    return (
        <div style={{ display: 'flex', gap: '24px', padding: '10px 20px', width: '100%', boxSizing: 'border-box' }}>
            {/* Left: Chart & Details */}
            <div style={{ flex: '3', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Asset Header Card */}
                <div style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
                                {assetDetails?.name}
                            </h1>
                            <span style={{ backgroundColor: '#1a233d', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
                                {symbol}
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                            Type : <span style={{ color: '#cbd5e1', textTransform: 'uppercase' }}>{assetDetails?.type}</span> | Secteur : <span style={{ color: '#cbd5e1' }}>{assetDetails?.sector || 'Général'}</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc' }}>
                            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            color: isPositive ? '#00c853' : '#ff3d00',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginTop: '4px'
                        }}>
                            {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                            <span className="mono">{isPositive ? "+" : ""}${yesterdayDiff.toFixed(2)} ({isPositive ? "+" : ""}{yesterdayPct}%)</span>
                        </div>
                    </div>
                </div>

                {/* Chart Box */}
                <div style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Évolution du Cours</h3>
                        {/* Period buttons */}
                        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#1a233d', padding: '4px', borderRadius: '10px', border: '1px solid #2a3a5e' }}>
                            {periods.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: period === p.value ? '#2962ff' : 'transparent',
                                        color: period === p.value ? '#fff' : '#94a3b8',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <PriceChart
                        data={chartData}
                        color={isPositive ? "#00c853" : "#ff3d00"}
                        period={period}
                    />
                </div>
            </div>

            {/* Right: Trading & User Position Panel */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Action Card */}
                <div style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Passer un Ordre</h3>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            style={{
                                flex: 1, padding: '12px', backgroundColor: '#00c853', color: 'white',
                                border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0, 200, 83, 0.3)'
                            }}
                            onClick={() => setIsBuyMenuOpen(true)}
                        >
                            Acheter
                        </button>
                        <button
                            style={{
                                flex: 1, padding: '12px', backgroundColor: '#ff3d00', color: 'white',
                                border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(255, 61, 0, 0.3)'
                            }}
                            onClick={() => setIsSellMenuOpen(true)}
                        >
                            Vendre
                        </button>
                    </div>
                </div>

                {/* User Position Card */}
                <div style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '24px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Votre Position</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                            <span style={{ color: '#94a3b8' }}>Quantité détenue:</span>
                            <span className="mono" style={{ fontWeight: '600', color: '#f8fafc' }}>
                                {Number(assetQuantity) < 0.00000001 ? "0.00" : Number(assetQuantity).toFixed(6)} {symbol}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                            <span style={{ color: '#94a3b8' }}>Valeur de marché:</span>
                            <span className="mono" style={{ fontWeight: '600', color: '#38bdf8' }}>
                                ${Number(usdWorth).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                            <span style={{ color: '#94a3b8' }}>PRU moyen:</span>
                            <span className="mono" style={{ fontWeight: '600', color: '#f8fafc' }}>
                                ${Number(finalPRU).toFixed(2)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                            <span style={{ color: '#94a3b8' }}>Plus-value latente:</span>
                            <span className="mono" style={{ fontWeight: '600', color: unrealizedPnL >= 0 ? '#00c853' : '#ff3d00' }}>
                                {unrealizedPnL >= 0 ? "+" : ""}${Number(unrealizedPnL).toFixed(2)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Plus-value réalisée:</span>
                            <span className="mono" style={{ fontWeight: '600', color: realizedPnL >= 0 ? '#00c853' : '#ff3d00' }}>
                                {realizedPnL >= 0 ? "+" : ""}${Number(realizedPnL).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Buy Modal */}
            {isBuyMenuOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
                }}>
                    <div style={{
                        backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '30px', borderRadius: '16px', width: '400px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Acheter {orderSymbol}</h3>
                            <button onClick={() => setIsBuyMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1a233d', borderRadius: '8px', fontSize: '13px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Solde USD disponible :</span>
                            <span className="mono" style={{ color: '#00c853', fontWeight: '600' }}>${usdQuantity.toFixed(2)}</span>
                        </div>

                        <form onSubmit={handleBuySubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Montant en USD ($) :</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        step="any"
                                        value={amountFiat}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setAmountFiat(val);
                                            setIsAmountFiatInvalid(parseFloat(val) > usdQuantity);
                                        }}
                                        style={{
                                            flexGrow: 1, padding: '12px 14px', backgroundColor: '#1a233d',
                                            border: isAmountFiatInvalid ? '1px solid #ff3d00' : '1px solid #2a3a5e',
                                            borderRadius: '8px', color: '#f8fafc', fontSize: '15px'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSetMax}
                                        style={{ padding: '0 16px', backgroundColor: '#2a3a5e', color: '#f8fafc', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Max
                                    </button>
                                </div>
                                {isAmountFiatInvalid && (
                                    <p style={{ color: '#ff3d00', fontSize: '12px', marginTop: '6px', margin: 0 }}>Montant supérieur au solde disponible.</p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#00c853', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Confirmer l'achat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsBuyMenuOpen(false)}
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#1a233d', color: '#94a3b8', border: '1px solid #2a3a5e', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sell Modal */}
            {isSellMenuOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
                }}>
                    <div style={{
                        backgroundColor: '#131b2e', border: '1px solid #1e293b', padding: '30px', borderRadius: '16px', width: '400px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Vendre {orderSymbol}</h3>
                            <button onClick={() => setIsSellMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#1a233d', borderRadius: '8px', fontSize: '13px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Quantité disponible :</span>
                            <span className="mono" style={{ color: '#38bdf8', fontWeight: '600' }}>{assetQuantity.toFixed(5)} {symbol}</span>
                        </div>

                        <form onSubmit={handleSellSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Quantité à vendre :</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        step="any"
                                        value={amountAsset}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setAmountAsset(val);
                                            setIsAmountAssetInvalid(parseFloat(val) > assetQuantity);
                                        }}
                                        style={{
                                            flexGrow: 1, padding: '12px 14px', backgroundColor: '#1a233d',
                                            border: isAmountAssetInvalid ? '1px solid #ff3d00' : '1px solid #2a3a5e',
                                            borderRadius: '8px', color: '#f8fafc', fontSize: '15px'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSetMaxAsset}
                                        style={{ padding: '0 16px', backgroundColor: '#2a3a5e', color: '#f8fafc', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Max
                                    </button>
                                </div>
                                {isAmountAssetInvalid && (
                                    <p style={{ color: '#ff3d00', fontSize: '12px', marginTop: '6px', margin: 0 }}>Quantité supérieure à vos avoirs.</p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#ff3d00', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Confirmer la vente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsSellMenuOpen(false)}
                                    style={{ flex: 1, padding: '12px', backgroundColor: '#1a233d', color: '#94a3b8', border: '1px solid #2a3a5e', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
