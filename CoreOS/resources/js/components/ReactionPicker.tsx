import React, {useState} from 'react';
import {Heart} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger,} from '@/components/ui/popover';
import {cn} from '@/lib/utils';

interface UserReaction {
    type: string;
    emoji: string;
}

interface Props {
    onReaction: (type: string) => void;
    userReaction?: UserReaction | null;
    className?: string;
}

const REACTION_TYPES = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
};

export default function ReactionPicker({ onReaction, userReaction, className }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

    const handleReactionClick = (type: string) => {
        onReaction(type);
        setIsOpen(false);
    };

    const getButtonColor = () => {
        if (!userReaction) return 'text-muted-foreground hover:text-red-500';

        switch (userReaction.type) {
            case 'like': return 'text-blue-500 hover:text-blue-600';
            case 'love': return 'text-red-500 hover:text-red-600';
            case 'laugh': return 'text-yellow-500 hover:text-yellow-600';
            case 'wow': return 'text-orange-500 hover:text-orange-600';
            case 'sad': return 'text-blue-400 hover:text-blue-500';
            case 'angry': return 'text-red-600 hover:text-red-700';
            default: return 'text-muted-foreground hover:text-red-500';
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        'flex items-center gap-2 transition-colors',
                        getButtonColor(),
                        className
                    )}
                    onMouseEnter={() => setIsOpen(true)}
                >
                    {userReaction ? (
                        <span className="text-base">{userReaction.emoji}</span>
                    ) : (
                        <Heart className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                        {userReaction ? userReaction.type.charAt(0).toUpperCase() + userReaction.type.slice(1) : 'Like'}
                    </span>
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-auto p-2"
                side="top"
                align="start"
                onMouseLeave={() => setIsOpen(false)}
            >
                <div className="flex gap-1">
                    {Object.entries(REACTION_TYPES).map(([type, emoji]) => (
                        <Button
                            key={type}
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'h-12 w-12 p-0 hover:bg-muted/50 transition-transform hover:scale-125',
                                userReaction?.type === type && 'bg-muted'
                            )}
                            onClick={() => handleReactionClick(type)}
                            onMouseEnter={() => setHoveredReaction(type)}
                            onMouseLeave={() => setHoveredReaction(null)}
                        >
                            <span className="text-2xl">{emoji}</span>
                        </Button>
                    ))}
                </div>

                {/*{hoveredReaction && (*/}
                {/*    <div className="text-xs text-center mt-2 text-muted-foreground capitalize">*/}
                {/*        {hoveredReaction}*/}
                {/*    </div>*/}
                {/*)}*/}
            </PopoverContent>
        </Popover>
    );
}
