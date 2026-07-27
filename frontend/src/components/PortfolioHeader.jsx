import { useEffect, useState } from "react";
import { getProfile, getPerformance } from "../api/profiles";
import { Wallet, TrendingUp, DollarSign, PieChart } from "lucide-react";

export default function PortfolioHeader({ profileId }) {
    const [total, setTotal] = useState(0);
    const [perfPercent, setPerfPercent] = useState(0);
    const [positions, setPositions] = useState(0);
    const [liquid, setLiquid] = useState(0);

    const initialAmount = 2000;

    useEffect(() => {
        if (!profileId) return;

        const fetchData = async () => {
            const profile = await getProfile(profileId);
            const perf = await getPerformance(profileId);
            const roundedPerf = perf.toFixed(2);

            const totalWorth = profile.total_worth ?? 0;
            const roundedTotal = totalWorth.toFixed(2);

            setTotal(roundedTotal);
            setPerfPercent(roundedPerf);

            const usdQuantity = profile.assets?.find(a => a.symbol === "USD")?.quantity ?? 0;
            const roundedUsdQuantity = usdQuantity.toFixed(2);

            const posValue = totalWorth - usdQuantity;
            const roundedPositions = posValue.toFixed(2);

            setPositions(roundedPositions);
            setLiquid(roundedUsdQuantity);
        };

        fetchData();
    }, [profileId]);

    const diff = total - initialAmount;
    const isPositive = diff >= 0;

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
        }}>
            {/* Total Worth Card */}
            <div style={{
                backgroundColor: "#131b2e",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>Valeur Totale</span>
                    <div style={{ padding: "8px", backgroundColor: "rgba(41, 98, 255, 0.15)", borderRadius: "8px", color: "#2962ff" }}>
                        <Wallet size={18} />
                    </div>
                </div>
                <div className="mono" style={{ fontSize: "24px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
                    ${Number(total).toLocaleString()}
                </div>
                <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", color: isPositive ? "#00c853" : "#ff3d00", fontWeight: "600" }}>
                    <span>{isPositive ? "+" : ""}${Number(diff).toLocaleString()}</span>
                    <span>({isPositive ? "+" : ""}{perfPercent}%)</span>
                    <span style={{ color: "#94a3b8", fontWeight: "normal" }}>vs départ ($2k)</span>
                </div>
            </div>

            {/* Positions Card */}
            <div style={{
                backgroundColor: "#131b2e",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>Actifs / Positions</span>
                    <div style={{ padding: "8px", backgroundColor: "rgba(0, 200, 83, 0.15)", borderRadius: "8px", color: "#00c853" }}>
                        <TrendingUp size={18} />
                    </div>
                </div>
                <div className="mono" style={{ fontSize: "24px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
                    ${Number(positions).toLocaleString()}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Investissements en cours
                </div>
            </div>

            {/* Liquidities Card */}
            <div style={{
                backgroundColor: "#131b2e",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>Liquidités disponibles</span>
                    <div style={{ padding: "8px", backgroundColor: "rgba(255, 152, 0, 0.15)", borderRadius: "8px", color: "#ff9800" }}>
                        <DollarSign size={18} />
                    </div>
                </div>
                <div className="mono" style={{ fontSize: "24px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
                    ${Number(liquid).toLocaleString()}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    USD prêt à trader
                </div>
            </div>
        </div>
    );
}
