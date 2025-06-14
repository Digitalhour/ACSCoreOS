import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Database, Plus } from 'lucide-react';

interface ModulePlaceholderProps {
    onAddModule: () => void;
    suggestedType?: 'kpi' | 'table' | 'any';
}

export function Moduleplaceholder({ onAddModule, suggestedType = 'any' }: ModulePlaceholderProps) {
    const getIcon = () => {
        switch (suggestedType) {
            case 'kpi':
                return <BarChart3 className="h-8 w-8 text-gray-400" />;
            case 'table':
                return <Database className="h-8 w-8 text-gray-400" />;
            default:
                return <Plus className="h-8 w-8 text-gray-400" />;
        }
    };

    const getText = () => {
        switch (suggestedType) {
            case 'kpi':
                return 'Add KPI Card';
            case 'table':
                return 'Add Data Table';
            default:
                return 'Add Module';
        }
    };

    return (
        <Card className="hover:border-primary/50 hover:bg-primary/5 group cursor-pointer border-2 border-dashed border-gray-300 bg-gray-50/30 transition-all duration-200">
            <CardContent className="flex min-h-[160px] flex-col items-center justify-center p-8">
                <div className="mb-4 transition-transform duration-200 group-hover:scale-110">{getIcon()}</div>
                <Button variant="ghost" className="hover:text-primary text-gray-600" onClick={onAddModule}>
                    {getText()}
                </Button>
                <p className="mt-2 text-center text-xs text-gray-400">Click to configure and add to your dashboard</p>
            </CardContent>
        </Card>
    );
}
