import { ScrollArea } from '@radix-ui/react-scroll-area';
import { Edit3, Loader2, MessageSquarePlus, MessageSquareText, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

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
        <div className={`flex flex-col ${className || ''}`}>
            <div className="mb-3 flex shrink-0 items-center justify-between">
                <h2 className="hidden text-lg font-semibold md:block">Chat History</h2>
                <button
                    onClick={onNewConversation}
                    className="focus:ring-opacity-50 flex items-center rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    title="Start New Conversation"
                >
                    <MessageSquarePlus size={16} className="mr-1.5" /> New
                </button>
            </div>

            <ScrollArea className="flex-grow space-y-1 overflow-y-auto rounded-md border pr-1">
                <ul ref={listRef}>
                    {conversations.map((conv) => (
                        <li
                            key={conv.id}
                            className={`group rounded-md p-2.5 transition-colors duration-150 ease-in-out ${
                                currentConversationId === conv.id
                                    ? 'bg-red-600 text-white dark:bg-red-700'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            onClick={() => handleSelect(conv.id)}
                        >
                            <div className="flex items-center justify-between">
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
                                        className={`mr-2 flex-grow rounded border px-1.5 py-0.5 text-sm shadow-sm ${
                                            currentConversationId === conv.id
                                                ? 'border-red-300 bg-red-500 text-white placeholder-red-300 dark:border-red-400 dark:bg-red-600'
                                                : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                                        }`}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex-grow cursor-pointer truncate py-0.5">
                                        <span
                                            className={`flex items-center text-sm font-medium ${
                                                currentConversationId === conv.id ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                                            }`}
                                        >
                                            <MessageSquareText
                                                size={16}
                                                className={`mr-2 shrink-0 ${
                                                    currentConversationId === conv.id ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                            />
                                            {conv.title || `Chat from ${formatDate(conv.created_at)}`}
                                        </span>
                                        <p
                                            className={`ml-8 text-xs ${
                                                currentConversationId === conv.id ? 'text-red-100 opacity-90' : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                        >
                                            {formatDate(conv.updated_at)}
                                        </p>
                                    </div>
                                )}
                                <div className="flex shrink-0 items-center pl-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                    {editingConversationId !== conv.id && (
                                        <button
                                            onClick={(e) => handleEditTitle(e, conv)}
                                            className={`mr-1 rounded p-1 hover:text-blue-600 dark:hover:text-blue-400 ${
                                                currentConversationId === conv.id
                                                    ? 'text-red-200 hover:text-white'
                                                    : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                            title="Edit title"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleDelete(conv.id);
                                        }}
                                        className={`rounded p-1 hover:text-red-600 dark:hover:text-red-400 ${
                                            currentConversationId === conv.id ? 'text-red-200 hover:text-white' : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                        title="Delete conversation"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </ScrollArea>

            <div className="mt-auto shrink-0 pt-3">
                {hasMoreConversations && (
                    <div className="flex justify-center">
                        <button
                            onClick={onLoadMoreConversations}
                            disabled={isLoadingMore}
                            className="flex w-full items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            {isLoadingMore ? (
                                <>
                                    <Loader2 size={18} className="mr-2 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                'Load More Conversations'
                            )}
                        </button>
                    </div>
                )}
                {!hasMoreConversations && conversations.length > 0 && (
                    <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">No more conversations to load.</p>
                )}
                {conversations.length === 0 && !isLoadingMore && !hasMoreConversations && (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No past conversations found.</p>
                )}
            </div>
        </div>
    );
}
