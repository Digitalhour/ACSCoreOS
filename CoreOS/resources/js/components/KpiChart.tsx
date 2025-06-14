import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface KpiChartProps {
    data: number[] | any[];
    comparisonData?: number[];
    type?: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radial' | 'radar';
    style?: 'default' | 'gradient' | 'smooth' | 'stepped';
    animation?: 'enabled' | 'disabled' | 'slow' | 'fast';
    color?: string;
    height?: number;
    className?: string;
}

export function KpiChart({
    data,
    comparisonData,
    type = 'line',
    style = 'default',
    animation = 'enabled',
    color = '#3b82f6',
    height = 64,
    className = '',
}: KpiChartProps) {
    // Transform data for stacked charts
    const transformData = (rawData: number[] | any[], compData?: number[]) => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [{ name: 'No Data', current: 0, previous: 0 }];
        }

        // If it's already an object array, return as is
        if (typeof rawData[0] === 'object' && rawData[0] !== null) {
            return rawData;
        }

        // Transform number array with comparison data for stacked charts
        return rawData.map((value, index) => ({
            name: `Day ${index + 1}`,
            current: Number(value) || 0,
            previous: compData && compData[index] ? Number(compData[index]) || 0 : 0,
            value: Number(value) || 0, // Keep for non-stacked charts
            index,
        }));
    };

    const chartData = transformData(data, comparisonData);
    const isStacked = type === 'area' && comparisonData && comparisonData.length > 0;

    // Animation configuration
    const getAnimationDuration = () => {
        switch (animation) {
            case 'disabled':
                return 0;
            case 'slow':
                return 2000;
            case 'fast':
                return 500;
            default:
                return 1000;
        }
    };

    // Color palette
    const colorPalette = [
        color,
        '#ef4444', // red
        '#10b981', // green
        '#f59e0b', // yellow
        '#8b5cf6', // purple
        '#06b6d4', // cyan
        '#f97316', // orange
    ];

    const renderLineChart = () => (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                {height >= 100 && (
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '12px',
                        }}
                    />
                )}
                <Line
                    type={style === 'smooth' ? 'monotone' : style === 'stepped' ? 'stepAfter' : 'linear'}
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={getAnimationDuration()}
                />
            </LineChart>
        </ResponsiveContainer>
    );

    const renderAreaChart = () => {
        if (isStacked) {
            return (
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                        {height >= 100 && (
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                }}
                            />
                        )}
                        <defs>
                            <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <Area
                            dataKey="previous"
                            type="monotone"
                            stroke="#94a3b8"
                            strokeWidth={1}
                            fill="url(#previousGradient)"
                            stackId="a"
                            animationDuration={getAnimationDuration()}
                        />
                        <Area
                            dataKey="current"
                            type="monotone"
                            stroke={color}
                            strokeWidth={2}
                            fill="url(#currentGradient)"
                            stackId="a"
                            animationDuration={getAnimationDuration()}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            );
        }

        // Regular area chart
        return (
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                    {height >= 100 && (
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                            }}
                        />
                    )}
                    <defs>
                        <linearGradient id={`areaGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <Area
                        type={style === 'smooth' ? 'monotone' : style === 'stepped' ? 'stepAfter' : 'linear'}
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#areaGradient-${color.replace('#', '')})`}
                        animationDuration={getAnimationDuration()}
                    />
                </AreaChart>
            </ResponsiveContainer>
        );
    };

    const renderBarChart = () => (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} hide={height < 100} />
                {height >= 100 && (
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '12px',
                        }}
                    />
                )}
                <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} animationDuration={getAnimationDuration()} />
            </BarChart>
        </ResponsiveContainer>
    );

    const renderPieChart = () => {
        const pieData = chartData.map((item, index) => ({
            ...item,
            fill: colorPalette[index % colorPalette.length],
        }));

        return (
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={Math.min(height * 0.35, 40)}
                        dataKey="value"
                        animationDuration={getAnimationDuration()}
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    {height >= 100 && (
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                            }}
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
        );
    };

    const renderChart = () => {
        switch (type) {
            case 'area':
                return renderAreaChart();
            case 'bar':
                return renderBarChart();
            case 'pie':
                return renderPieChart();
            case 'line':
            default:
                return renderLineChart();
        }
    };

    return (
        <div className={`w-full ${className}`} style={{ height }}>
            {renderChart()}
        </div>
    );
}
