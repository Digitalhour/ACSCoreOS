import React, {useState} from 'react';
import {Popover, PopoverContent, PopoverTrigger,} from '@/components/ui/popover';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';

interface ReactionSummaryItem {
    type: string;
    emoji: string;
    count: number;
}

interface User {
    id: number;
    name: string;
    avatar?: string;
}

interface ReactionDetail {
    id: number;
    type: string;
    emoji: string;
    user: User;
    created_at: string;
}

interface Props {
    reactions: ReactionSummaryItem[];
    total: number;
    reactableType?: string;
    reactableId?: number;
}

export default function ReactionSummary({ reactions, total, reactableType, reactableId }: Props) {
    const [reactionDetails, setReactionDetails] = useState<ReactionDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const loadReactionDetails = async (type?: string) => {
        if (!reactableType || !reactableId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                reactable_type: reactableType,
                reactable_id: reactableId.toString(),
            });

            if (type) {
                params.append('type', type);
            }

            const response = await fetch(`/reactions?${params}`);
            if (!response.ok) throw new Error('Failed to fetch reactions');

            const data = await response.json();
            setReactionDetails(data.reactions);
        } catch (error) {
            console.error('Error loading reaction details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && reactableType && reactableId) {
            loadReactionDetails();
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const getAvatar = (avatar?: string) => {
        if (!avatar) return undefined;
        if (avatar.startsWith('/')) return avatar;
        if (avatar.startsWith('http')) return avatar;
        return `/storage/${avatar}`;
    };

    // Show top 3 reactions with their emojis
    const topReactions = reactions.slice(0, 3);
    const remainingCount = total - topReactions.reduce((sum, r) => sum + r.count, 0);

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="flex -space-x-1">
                        {topReactions.map((reaction, index) => (
                            <div
                                key={reaction.type}
                                className="w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xs z-10"
                                style={{ zIndex: 10 - index }}
                            >
                                <span>{reaction.emoji}</span>
                            </div>
                        ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {total} {total === 1 ? 'reaction' : 'reactions'}
                    </span>
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0" side="top" align="start">
                <div className="p-4">
                    <h4 className="font-semibold mb-3">Reactions</h4>

                    {reactions.length > 1 ? (
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger
                                    value="all"
                                    className="text-xs"
                                    onClick={() => loadReactionDetails()}
                                >
                                    All {total}
                                </TabsTrigger>
                                {reactions.slice(0, 3).map((reaction) => (
                                    <TabsTrigger
                                        key={reaction.type}
                                        value={reaction.type}
                                        className="text-xs flex items-center gap-1"
                                        onClick={() => loadReactionDetails(reaction.type)}
                                    >
                                        <span>{reaction.emoji}</span>
                                        <span>{reaction.count}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <TabsContent value="all" className="mt-3">
                                <ScrollArea className="h-48">
                                    {loading ? (
                                        <div className="text-center py-4 text-muted-foreground">
                                            Loading...
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {reactionDetails.map((reaction) => (
                                                <div key={reaction.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={getAvatar(reaction.user.avatar)} />
                                                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                            {getInitials(reaction.user.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{reaction.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{reaction.created_at}</p>
                                                    </div>
                                                    <span className="text-lg">{reaction.emoji}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            {reactions.slice(0, 3).map((reaction) => (
                                <TabsContent key={reaction.type} value={reaction.type} className="mt-3">
                                    <ScrollArea className="h-48">
                                        {loading ? (
                                            <div className="text-center py-4 text-muted-foreground">
                                                Loading...
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {reactionDetails
                                                    .filter(r => r.type === reaction.type)
                                                    .map((r) => (
                                                        <div key={r.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={getAvatar(r.user.avatar)} />
                                                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                                    {getInitials(r.user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">{r.user.name}</p>
                                                                <p className="text-xs text-muted-foreground">{r.created_at}</p>
                                                            </div>
                                                            <span className="text-lg">{r.emoji}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    ) : (
                        <ScrollArea className="h-48">
                            {loading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    Loading...
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {reactionDetails.map((reaction) => (
                                        <div key={reaction.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={getAvatar(reaction.user.avatar)} />
                                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                                    {getInitials(reaction.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{reaction.user.name}</p>
                                                <p className="text-xs text-muted-foreground">{reaction.created_at}</p>
                                            </div>
                                            <span className="text-lg">{reaction.emoji}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
