import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';
import { WidgetContent } from './WidgetContent';
import { WidgetProperties } from './widget-properties';

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

interface DraggableWidgetProps {
    widget: Widget;
    isSelected: boolean;
    isPreviewMode: boolean;
    onMouseDown: (e: React.MouseEvent, widget: Widget) => void;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onResize?: (widget: Widget, newSize: { w: number; h: number }) => void;
    onUpdateWidget?: (id: string, updates: Partial<Widget>) => void;
}

export function DraggableWidget({
    widget,
    isSelected,
    isPreviewMode,
    onMouseDown,
    onClick,
    onEdit,
    onDelete,
    onResize,
    onUpdateWidget,
}: DraggableWidgetProps) {
    const [isResizing, setIsResizing] = useState(false);

    const handleWidgetMouseDown = (e: React.MouseEvent) => {
        if (isResizing) return;
        e.preventDefault(); // Prevent text selection during drag
        e.stopPropagation(); // Prevent click event on parent from firing when starting a drag.
        onMouseDown(e, widget);
    };

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();

        if (!onResize) return;

        setIsResizing(true);
        const startData = {
            x: e.clientX,
            y: e.clientY,
            w: widget.gridPosition.w,
            h: widget.gridPosition.h,
        };

        const handleResizeMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startData.x;
            const deltaY = e.clientY - startData.y;

            // Assuming a grid cell size around 100px for responsive resizing
            const gridDeltaW = Math.round(deltaX / 100);
            const gridDeltaH = Math.round(deltaY / 100);

            let newW = startData.w;
            let newH = startData.h;

            if (direction.includes('right')) {
                newW = Math.max(1, Math.min(24, startData.w + gridDeltaW));
            }
            if (direction.includes('bottom')) {
                newH = Math.max(1, startData.h + gridDeltaH);
            }

            if (onResize) {
                onResize(widget, { w: newW, h: newH });
            }
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        };

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    return (
        <div
            className={`absolute rounded-lg border bg-white shadow-sm transition-all ${
                isSelected ? 'shadow-lg ring-2 ring-red-300' : 'hover:shadow-md'
            } ${isPreviewMode ? 'cursor-default' : ''}`}
            style={{
                left: widget.position.x,
                top: widget.position.y,
                width: widget.size.width,
                height: widget.size.height,
            }}
            onClick={onClick}
        >
            <div className="flex h-full flex-col p-4">
                <div
                    className={`mb-2 flex items-center justify-between ${!isPreviewMode ? 'cursor-move' : ''}`}
                    onMouseDown={!isPreviewMode ? handleWidgetMouseDown : undefined}
                >
                    <div className="flex items-center gap-2">
                        {!isPreviewMode && <GripVertical className="h-5 w-5 text-gray-400" />}
                        <h3 className="text-sm font-medium">{widget.title}</h3>
                    </div>
                    {!isPreviewMode && isSelected && (
                        <div className="flex items-center gap-1">
                            {onUpdateWidget && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <WidgetProperties widget={widget} onUpdateWidget={onUpdateWidget} />
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                                ×
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden">
                    {/* All conditional rendering is now handled by WidgetContent */}
                    <WidgetContent widget={widget} />
                </div>
            </div>

            {/* Resize Handles */}
            {!isPreviewMode && isSelected && (
                <>
                    <div
                        className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize bg-gray-500 opacity-25 hover:opacity-100"
                        style={{ borderRadius: '0 0 10px 0' }}
                        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                    />
                </>
            )}
        </div>
    );
}
