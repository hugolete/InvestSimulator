import { Wallet, TrendingUp, DollarSign } from "lucide-react";

const initialAmount = 2000;

const formatUsd = (value) =>
    Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Affichage pur : les données viennent du profil chargé par Dashboard (plus de requêtes ici)
export default function PortfolioHeader({ profile }) {
    const total = profile?.total_worth ?? 0;
    const liquid = profile?.assets?.find(a => a.symbol === "USD")?.quantity ?? 0;
    const positions = total - liquid;
    const perfPercent = Number(profile?.performance ?? 0).toFixed(2);

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
                    ${formatUsd(total)}
                </div>
                <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", color: isPositive ? "#00c853" : "#ff3d00", fontWeight: "600" }}>
                    <span>{isPositive ? "+" : ""}${formatUsd(diff)}</span>
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
                    ${formatUsd(positions)}
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
                    ${formatUsd(liquid)}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    USD prêt à trader
                </div>
            </div>
        </div>
    );
}
