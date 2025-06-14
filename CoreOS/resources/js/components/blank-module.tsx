import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Settings, Trash2 } from 'lucide-react';

interface BlankModuleProps {
    title: string;
    onConfigure: () => void;
    onDelete: () => void;
    className?: string;
}

export function BlankModule({ title, onConfigure, onDelete, className }: BlankModuleProps) {
    return (
        <Card className={`group hover:border-primary/50 relative border-2 border-dashed transition-all ${className}`}>
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center space-y-4 p-6">
                {/* Module Icon */}
                <div className="bg-muted rounded-full p-3">
                    <BarChart3 className="text-muted-foreground h-8 w-8" />
                </div>

                {/* Module Title */}
                <div className="space-y-1 text-center">
                    <h3 className="text-lg font-medium">{title}</h3>
                    <p className="text-muted-foreground text-sm">Configure this module to start displaying data</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                    <Button onClick={onConfigure} size="sm" className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Configure</span>
                    </Button>
                </div>

                {/* Delete Button - Shows on hover */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="text-muted-foreground absolute top-2 right-2 h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>

                {/* Status Indicator */}
                <div className="absolute top-2 left-2">
                    <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"></div>
                        <span className="text-muted-foreground text-xs">Needs Configuration</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
