import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const PriceChart = ({ data, color = "#2962ff", period }) => {
    return (
        <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />

                    <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#1e293b' }}
                        minTickGap={60}
                        tickFormatter={(time) => {
                            const date = new Date(time);
                            return period === "1h" || period === "1d"
                                ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                        }}
                    />

                    <YAxis
                        orientation="right"
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => {
                            if (value >= 1000) {
                                return `$${(value / 1000).toFixed(1)}k`;
                            }
                            return `$${value.toFixed(2)}`;
                        }}
                        width={65}
                    />

                    <Tooltip
                        contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid #2a3a5e',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            backgroundColor: '#131b2e',
                            color: '#f8fafc',
                            fontSize: '13px'
                        }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        itemStyle={{ color: '#f8fafc', fontWeight: '600' }}
                        labelFormatter={(label) => {
                            return new Date(label).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }}
                        formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, "Prix"]}
                    />

                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: color }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PriceChart;
