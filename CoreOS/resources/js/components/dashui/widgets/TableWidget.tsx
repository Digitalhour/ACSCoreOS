interface WidgetConfig {
    columns?: string[];
    data?: any[][];
}

interface TableWidgetProps {
    config: WidgetConfig;
}

/**
 * Renders the content for a table widget.
 */
export function TableWidget({ config }: TableWidgetProps) {
    return (
        <div className="space-y-2">
            {config.columns && (
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600">
                    {config.columns.map((col: string, i: number) => (
                        <div key={i}>{col}</div>
                    ))}
                </div>
            )}
            {config.data?.slice(0, 3).map((row: any[], i: number) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-xs">
                    {row.map((cell, j) => (
                        <div key={j} className="truncate">
                            {cell}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
