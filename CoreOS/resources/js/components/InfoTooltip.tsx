import React from 'react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Info} from 'lucide-react';
import {Button} from '@/components/ui/button';

interface InfoTooltipProps {
    title: string;
    description?: string;
    className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
                                                            title,
                                                            description,
                                                            className = ""
                                                        }) => {
    if (!description || description.trim() === '') {
        return null;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-4 w-4 p-0 hover:bg-gray-100 ${className}`}
                >
                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" side="top">
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">{title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {description}
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
};
