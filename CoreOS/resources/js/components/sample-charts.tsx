export function SimpleChart({ data, type, color, height }: { data: number[]; type: string; color: string; height: number }) {
    if (type === 'bar') {
        const max = Math.max(...data);
        const barWidth = 100 / data.length - 2;
        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100" preserveAspectRatio="none">
                {data.map((value, index) => (
                    <rect
                        key={index}
                        x={index * (100 / data.length) + 1}
                        y={100 - (value / max) * 90}
                        width={barWidth}
                        height={(value / max) * 90}
                        fill={color}
                        rx="1"
                    />
                ))}
            </svg>
        );
    }

    if (type === 'radial') {
        const percentage = (data[0] / Math.max(...data)) * 100;
        const circumference = 2 * Math.PI * 30;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="30" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                    cx="50"
                    cy="50"
                    r="30"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                />
                <text x="50" y="55" textAnchor="middle" fontSize="12" fill={color}>
                    {Math.round(percentage)}%
                </text>
            </svg>
        );
    }

    if (type === 'radar') {
        const centerX = 50;
        const centerY = 50;
        const radius = 35;
        const angleStep = (2 * Math.PI) / data.length;

        const points = data.map((value, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const normalizedValue = value / Math.max(...data);
            const x = centerX + radius * normalizedValue * Math.cos(angle);
            const y = centerY + radius * normalizedValue * Math.sin(angle);
            return `${x},${y}`;
        });

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100">
                {/* Grid lines */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
                    <polygon
                        key={scale}
                        points={data
                            .map((_, index) => {
                                const angle = index * angleStep - Math.PI / 2;
                                const x = centerX + radius * scale * Math.cos(angle);
                                const y = centerY + radius * scale * Math.sin(angle);
                                return `${x},${y}`;
                            })
                            .join(' ')}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                    />
                ))}
                {/* Axis lines */}
                {data.map((_, index) => {
                    const angle = index * angleStep - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    return <line key={index} x1={centerX} y1={centerY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
                })}
                {/* Data area */}
                <polygon points={points.join(' ')} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
                {/* Data points */}
                {points.map((point, index) => {
                    const [x, y] = point.split(',').map(Number);
                    return <circle key={index} cx={x} cy={y} r="2" fill={color} />;
                })}
            </svg>
        );
    }

    if (type === 'pie' || type === 'donut') {
        const total = data.reduce((sum, val) => sum + val, 0);
        let currentAngle = 0;
        const centerX = 50;
        const centerY = 50;
        const radius = type === 'donut' ? 35 : 40;
        const innerRadius = type === 'donut' ? 20 : 0;

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100">
                {data.map((value, index) => {
                    const angle = (value / total) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;
                    currentAngle += angle;

                    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

                    const largeArcFlag = angle > 180 ? 1 : 0;

                    const pathData = [`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, 'Z'].join(
                        ' ',
                    );

                    if (type === 'donut') {
                        const ix1 = centerX + innerRadius * Math.cos((startAngle * Math.PI) / 180);
                        const iy1 = centerY + innerRadius * Math.sin((startAngle * Math.PI) / 180);
                        const ix2 = centerX + innerRadius * Math.cos((endAngle * Math.PI) / 180);
                        const iy2 = centerY + innerRadius * Math.sin((endAngle * Math.PI) / 180);

                        const donutPath = [
                            `M ${centerX + innerRadius} ${centerY}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            `L ${ix2} ${iy2}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
                            'Z',
                        ].join(' ');

                        return <path key={index} d={donutPath} fill={index === 0 ? color : `hsl(${(index * 60) % 360}, 70%, 50%)`} />;
                    }

                    return <path key={index} d={pathData} fill={index === 0 ? color : `hsl(${(index * 60) % 360}, 70%, 50%)`} />;
                })}
            </svg>
        );
    }

    if (type === 'area') {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((value - min) / range) * 100;
            return `${x},${y}`;
        });

        const areaPath = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;

        return (
            <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path d={`M ${points.join(' L ')}`} fill="none" stroke={color} strokeWidth="2" />
            </svg>
        );
    }

    // Default line chart
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    });

    return (
        <svg className="w-full" style={{ height: `${height}px` }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`M ${points.join(' L ')}`} fill="none" stroke={color} strokeWidth="2" />
        </svg>
    );
}
