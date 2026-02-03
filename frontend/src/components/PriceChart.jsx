import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PriceChart = ({ data, color = "#8884d8", period }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />

                    <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12, fill: '#999' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={60}

                        // tickFormatter pour transformer le timestamp en texte lisible sur l'axe
                        tickFormatter={(time) => {
                            const date = new Date(time);
                            return period === "1h" || period === "1d"
                                ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                        }}
                    />

                    <YAxis
                        //TODO axe y
                        hide={true}
                        domain={['auto', 'auto']}
                    />

                    <Tooltip
                        contentStyle={{
                            borderRadius: '10px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            backgroundColor: '#fff'
                        }}
                        /*labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                return payload[0].payload.fullDate;
                            }
                            return label;
                        }}*/
                        labelFormatter={(label) => {
                            return new Date(label).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        }}
                        formatter={(value) => [`$${parseFloat(value).toLocaleString()}`, "Prix"]}
                    />

                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PriceChart;
