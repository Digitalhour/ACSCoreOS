import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { WidgetPropertiesContent } from './WidgetPropertiesContent';

interface Widget {
    id: string;
    type: 'table' | 'chart' | 'metric';
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    config: any;
    data?: any[];
    gridPosition: { x: number; y: number; w: number; h: number };
}

interface WidgetPropertiesProps {
    widget: Widget;
    onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
    trigger?: React.ReactNode;
}

export function WidgetProperties({ widget, onUpdateWidget, trigger }: WidgetPropertiesProps) {
    const defaultTrigger = (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700">
            <Pencil className="h-4 w-4" />
        </Button>
    );

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Widget: {widget.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* --- Common Properties --- */}
                    <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={widget.title}
                            onChange={(e) => onUpdateWidget(widget.id, { title: e.target.value })}
                            className="mt-1"
                        />
                    </div>

                    {/* --- Type-Specific Properties --- */}
                    {/* All conditional logic is now handled by the dispatcher component */}
                    <WidgetPropertiesContent widget={widget} onUpdateWidget={onUpdateWidget} />
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
