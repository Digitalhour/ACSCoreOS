import {Button} from '@/components/ui/button';
import {ScrollArea} from '@/components/ui/scroll-area';
import {cn} from '@/lib/utils';
import {Edit3, Loader2, MessageSquarePlus, MessageSquareText, Trash2} from 'lucide-react';
import {useRef, useState} from 'react';

export interface ConversationSummary {
    id: number;
    title: string | null;
    updated_at: string;
    created_at: string;
}

interface BillyPastConversationProps {
    className?: string;
    conversations: ConversationSummary[];
    currentConversationId: number | null;
    onSelectConversation: (conversationId: number) => void;
    onNewConversation: () => void;
    onDeleteConversation: (conversationId: number) => Promise<void>;
    onUpdateConversationTitle: (conversationId: number, newTitle: string) => Promise<void>;
    hasMoreConversations: boolean;
    isLoadingMore: boolean;
    onLoadMoreConversations: () => void;
}

export function BillyPastConversation({
                                          className,
                                          conversations,
                                          currentConversationId,
                                          onSelectConversation,
                                          onNewConversation,
                                          onDeleteConversation,
                                          onUpdateConversationTitle,
                                          hasMoreConversations,
                                          isLoadingMore,
                                          onLoadMoreConversations,
                                      }: BillyPastConversationProps) {
    const [editingConversationId, setEditingConversationId] = useState<number | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const listRef = useRef<HTMLUListElement>(null);

    const handleSelect = (conversationId: number) => {
        if (editingConversationId !== null && editingConversationId !== conversationId) {
            const currentEditingConv = conversations.find((c) => c.id === editingConversationId);
            if (currentEditingConv) {
                handleSaveTitle(editingConversationId, currentEditingConv.title || '');
            }
        }
        setEditingConversationId(null);
        onSelectConversation(conversationId);
    };

    const handleDelete = async (conversationId: number) => {
        if (window.confirm('Are you sure you want to delete this conversation?')) {
            await onDeleteConversation(conversationId);
        }
    };

    const handleEditTitle = (event: React.MouseEvent, conversation: ConversationSummary) => {
        event.stopPropagation();
        setEditingConversationId(conversation.id);
        setNewTitle(conversation.title || '');
    };

    const handleSaveTitle = async (conversationId: number, currentInputValue: string) => {
        const trimmedTitle = currentInputValue.trim();
        if (!trimmedTitle) {
            const originalConversation = conversations.find((c) => c.id === conversationId);
            alert('Title cannot be empty. Reverting to original title.');
            setNewTitle(originalConversation?.title || '');
            setEditingConversationId(null);
            return;
        }
        if (trimmedTitle === conversations.find((c) => c.id === conversationId)?.title) {
            setEditingConversationId(null);
            return;
        }
        await onUpdateConversationTitle(conversationId, trimmedTitle);
        setEditingConversationId(null);
        setNewTitle('');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }
            return date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch (e) {
            return 'Invalid date';
        }
    };

    return (
        <div className={cn('flex h-full flex-col', className)}>
            {/* Header with New Conversation Button */}
            <div className="flex items-center justify-between p-4">
                <h2 className="text-lg font-semibold text-foreground">Chat History</h2>
                <Button
                    onClick={onNewConversation}
                    size="sm"
                    className="h-8 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                >
                    <MessageSquarePlus size={14} className="mr-1.5" />
                    New
                </Button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-hidden px-2">
                <ScrollArea className="h-full">
                    <div className="space-y-1 pb-4">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={cn(
                                    'group relative cursor-pointer rounded-lg p-3 transition-all duration-200',
                                    currentConversationId === conv.id
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                                        : 'hover:bg-muted/50 active:bg-muted/70'
                                )}
                                onClick={() => handleSelect(conv.id)}
                            >
                                <div className="flex items-start justify-between">
                                    {editingConversationId === conv.id ? (
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onBlur={() => handleSaveTitle(conv.id, newTitle)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleSaveTitle(conv.id, newTitle);
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingConversationId(null);
                                                    const originalConversation = conversations.find((c) => c.id === conv.id);
                                                    setNewTitle(originalConversation?.title || '');
                                                }
                                            }}
                                            className={cn(
                                                'w-full rounded border-none bg-white/90 p-1 text-sm text-gray-900 outline-none ring-2 ring-blue-500',
                                                currentConversationId === conv.id
                                                    ? 'bg-white/20 text-white placeholder-white/70 ring-white/50'
                                                    : 'ring-blue-500'
                                            )}
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <MessageSquareText
                                                    size={16}
                                                    className={cn(
                                                        'shrink-0',
                                                        currentConversationId === conv.id
                                                            ? 'text-white/80'
                                                            : 'text-muted-foreground'
                                                    )}
                                                />
                                                <span
                                                    className={cn(
                                                        'truncate text-sm font-medium',
                                                        currentConversationId === conv.id
                                                            ? 'text-white'
                                                            : 'text-foreground'
                                                    )}
                                                >
                                                    {conv.title || `Chat from ${formatDate(conv.created_at)}`}
                                                </span>
                                            </div>
                                            <p
                                                className={cn(
                                                    'ml-6 mt-1 text-xs',
                                                    currentConversationId === conv.id
                                                        ? 'text-white/70'
                                                        : 'text-muted-foreground'
                                                )}
                                            >
                                                {formatDate(conv.updated_at)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center  opacity-0 transition-opacity group-hover:opacity-100">
                                        {editingConversationId !== conv.id && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-6 w-6',
                                                    currentConversationId === conv.id
                                                        ? 'text-white/80 hover:bg-white/20 hover:text-white'
                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                )}
                                                onClick={(e) => handleEditTitle(e, conv)}
                                                title="Edit title"
                                            >
                                                <Edit3 size={12} />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                'h-6 w-6',
                                                currentConversationId === conv.id
                                                    ? 'text-white/80 hover:bg-red-400/20 hover:text-white'
                                                    : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                                            )}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleDelete(conv.id);
                                            }}
                                            title="Delete conversation"
                                        >
                                            <Trash2 size={12} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Load More Section */}
            <div className="shrink-0 p-4 pt-2">
                {hasMoreConversations && (
                    <Button
                        onClick={onLoadMoreConversations}
                        disabled={isLoadingMore}
                        variant="outline"
                        size="sm"
                        className="w-full"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 size={14} className="mr-2 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Load More'
                        )}
                    </Button>
                )}

                {!hasMoreConversations && conversations.length > 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                        No more conversations
                    </p>
                )}

                {conversations.length === 0 && !isLoadingMore && (
                    <div className="py-8 text-center">
                        <MessageSquareText size={48} className="mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No conversations yet</p>
                        <p className="text-xs text-muted-foreground/70">Start chatting to see your history</p>
                    </div>
                )}
            </div>
        </div>
    );
}
