import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface GridSlotProps {
    slotId: string;
    isOccupied: boolean;
    colSpan?: number;
    rowSpan?: number;
    children?: React.ReactNode;
    onAddModule: (slotId: string) => void;
}

export function GridSlot({ slotId, isOccupied, colSpan = 1, rowSpan = 1, children, onAddModule }: GridSlotProps) {
    const gridStyle = {
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
        gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
    };

    if (isOccupied && children) {
        return <div style={gridStyle}>{children}</div>;
    }

    return (
        <div style={gridStyle}>
            <Card
                className="cursor-pointer border-2 border-dashed border-gray-300 bg-gray-50/50 transition-colors hover:border-gray-400 hover:bg-gray-100/50"
                style={{ minHeight: rowSpan > 1 ? `${rowSpan * 160}px` : '120px' }}
                onClick={() => onAddModule(slotId)}
            >
                <CardContent className="flex h-full flex-col items-center justify-center p-6">
                    <div className="mb-2 rounded-full bg-gray-200 p-3">
                        <Plus className="h-6 w-6 text-gray-500" />
                    </div>
                    <p className="text-center text-sm text-gray-500">Click to add module</p>
                    <p className="mt-1 text-xs text-gray-400">Slot {slotId}</p>
                </CardContent>
            </Card>
        </div>
    );
}
