import { useEffect, useState } from "react";
import { getProfile } from "../api/profiles";
import { getPerformance } from "../api/profiles";

export default function PortfolioHeader({ profileId }) {
    const [total, setTotal] = useState(0);
    const [perfPercent, setPerfPercent] = useState(0);
    const [positions, setPositions] = useState(0);
    const [liquid,setLiquid] = useState(0);

    const initialAmount = 50000;

    useEffect(() => {
        if (!profileId) return;

        const fetchData = async () => {
            const profile = await getProfile(profileId);
            const perf = await getPerformance(profileId); //pourcentage
            const roundedPerf = perf.toFixed(2);

            const totalWorthObject = profile.find(item => 'total_worth' in item);
            const totalWorth = totalWorthObject.total_worth
            const roundedTotal = totalWorth.toFixed(2)

            setTotal(roundedTotal);
            setPerfPercent(roundedPerf);

            const usdAsset = profile.find(item => item.symbol === "USD")
            const usdQuantity = usdAsset.quantity
            const roundedUsdQuantity = usdQuantity.toFixed(2)

            const positions = roundedTotal - usdQuantity
            const roundedPositions = positions.toFixed(2)

            setPositions(roundedPositions)
            setLiquid(roundedUsdQuantity)
        };

        fetchData();
    }, [profileId]);

    const diff = total - initialAmount;

    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 30px",
            borderBottom: "1px solid #ddd"
        }}>
            <div>
                <h2 style={{ margin: 0 }}>Portefeuille</h2>
                <p style={{ margin: "5px 0", color: "#666" }}>
                    Départ : 50 000$
                </p>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-around", // ou space-between
                    textAlign: "center",
                    gap: "80px",
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>Positions</h2>
                    <p style={{ margin: "5px 0", color: "#666" }}>
                        ${positions}
                    </p>
                </div>
                <div>
                    <h2 style={{ margin: 0 }}>Liquidités</h2>
                    <p style={{ margin: "5px 0", color: "#666" }}>
                        ${liquid}
                    </p>
                </div>
            </div>

            <div style={{ textAlign: "right" }}>
                <h1 style={{ margin: 0 }}>
                    {total.toLocaleString()} $
                </h1>

                <p
                    style={{
                        margin: 0,
                        color: diff>=0 ? "green" : "red",
                        fontWeight: "bold",
                    }}
                >
                    {diff>=0 ? "+" : ""}
                    {diff.toLocaleString()} $ ({perfPercent}%)
                </p>
            </div>
        </div>
    );
}
