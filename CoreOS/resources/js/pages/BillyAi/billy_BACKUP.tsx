import { BillyPastConversation, type ConversationSummary } from '@/components/billyai/billy-past-conversation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import axios from 'axios';
import { Menu as MenuIcon, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Billy The AI',
        href: '/billy.chat',
    },
];

interface ChatMessage {
    id?: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    conversation_id?: number;
}

interface PageProps extends SharedData {}

interface PaginatedConversationsResponse {
    data: ConversationSummary[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    total: number;
}

export default function BillyChat() {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const [currentConversationTitle, setCurrentConversationTitle] = useState<string | null>(null);

    const [pastConversations, setPastConversations] = useState<ConversationSummary[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreConversations, setHasMoreConversations] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (isSheetOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSheetOpen]);

    const fetchPastConversations = async (page = 1, isInitialLoad = false) => {
        if (isLoadingMore && !isInitialLoad) return;
        if (page === 1 && !isInitialLoad) setPastConversations([]);

        setIsLoadingMore(true);
        try {
            const response = await axios.get<PaginatedConversationsResponse>(`/billy/conversations?page=${page}`);
            const { data, current_page, last_page } = response.data;
            setPastConversations((prev) => (page === 1 || (isInitialLoad && page === 1) ? data : [...prev, ...data]));
            setCurrentPage(current_page);
            setHasMoreConversations(current_page < last_page);
        } catch (error) {
            console.error('Failed to fetch past conversations:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPastConversations(1, true);
    }, []);

    const loadMoreConversations = () => {
        if (hasMoreConversations && !isLoadingMore) {
            fetchPastConversations(currentPage + 1);
        }
    };

    const saveMessageToBackend = async (message: ChatMessage, conversationIdToSaveTo: number | null): Promise<number | null> => {
        try {
            const response = await axios.post('/billy/messages', {
                message_content: message.content,
                role: message.role,
                conversation_id: conversationIdToSaveTo,
                conversation_title: conversationIdToSaveTo ? null : message.content.substring(0, 30) + '...',
            });
            const savedApiMessage = response.data.message;
            const conversationDetails = savedApiMessage.conversation;

            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.timestamp === message.timestamp && msg.role === message.role && msg.content === message.content
                        ? { ...msg, id: savedApiMessage.id, conversation_id: conversationDetails.id }
                        : msg,
                ),
            );

            if (!conversationIdToSaveTo && conversationDetails) {
                setCurrentConversationId(conversationDetails.id);
                setCurrentConversationTitle(conversationDetails.title);
                const newConversationSummary: ConversationSummary = {
                    id: conversationDetails.id,
                    title: conversationDetails.title,
                    created_at: conversationDetails.created_at,
                    updated_at: conversationDetails.updated_at,
                };
                setPastConversations((prev) => [newConversationSummary, ...prev.filter((c) => c.id !== newConversationSummary.id)]);
            } else if (conversationDetails) {
                setPastConversations((prev) =>
                    prev
                        .map((conv) =>
                            conv.id === conversationDetails.id
                                ? { ...conv, title: conversationDetails.title, updated_at: conversationDetails.updated_at }
                                : conv,
                        )
                        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
                );
            }
            return conversationDetails.id;
        } catch (error) {
            console.error('Failed to save message to backend:', error);
            return conversationIdToSaveTo;
        }
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        let activeConvId = currentConversationId;
        const userMessage: ChatMessage = {
            role: 'user',
            content: input,
            timestamp: new Date(),
            conversation_id: activeConvId ?? undefined,
        };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setLoading(true);
        const updatedConvId = await saveMessageToBackend(userMessage, activeConvId);
        if (updatedConvId) {
            activeConvId = updatedConvId;
            if (!currentConversationId) setCurrentConversationId(updatedConvId);
        }

        try {
            const response = await fetch('http://localhost:9621/query/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: currentInput, stream: true }),
            });

            if (!response.body) throw new Error('ReadableStream not supported');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantResponseContent = '';
            let buffer = '';
            const assistantMessageTimestamp = new Date();

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: '',
                    timestamp: assistantMessageTimestamp,
                    conversation_id: activeConvId ?? undefined,
                },
            ]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                let startPos = 0;
                let curlyPos = buffer.indexOf('{', startPos);
                while (curlyPos !== -1) {
                    const closingPos = buffer.indexOf('}', curlyPos);
                    if (closingPos === -1) break;
                    const jsonStr = buffer.substring(curlyPos, closingPos + 1);
                    try {
                        const parsedObj = JSON.parse(jsonStr);
                        if (parsedObj.response) {
                            assistantResponseContent += parsedObj.response;
                        }
                    } catch (parseError) {
                        // console.warn('Failed to parse JSON stream object:', jsonStr, parseError);
                    }
                    startPos = closingPos + 1;
                    curlyPos = buffer.indexOf('{', startPos);
                }
                if (startPos > 0) buffer = buffer.substring(startPos);

                setMessages((prev) => {
                    const updatedMessages = [...prev];
                    if (updatedMessages.length > 0) {
                        const lastMsgIndex = updatedMessages.length - 1;
                        updatedMessages[lastMsgIndex] = {
                            ...updatedMessages[lastMsgIndex],
                            content: assistantResponseContent,
                        };
                    }
                    return updatedMessages;
                });
            }

            if (assistantResponseContent.trim()) {
                const assistantFinalMessage: ChatMessage = {
                    role: 'assistant',
                    content: assistantResponseContent,
                    timestamp: assistantMessageTimestamp,
                    conversation_id: activeConvId ?? undefined,
                };
                await saveMessageToBackend(assistantFinalMessage, activeConvId);
            } else {
                setMessages((prev) => prev.filter((msg) => msg.timestamp !== assistantMessageTimestamp || msg.content.trim() !== ''));
            }
        } catch (error) {
            console.error('Error with AI stream or saving AI message:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'Sorry, an error occurred.',
                timestamp: new Date(),
                conversation_id: activeConvId ?? undefined,
            };
            setMessages((prev) => [...prev, errorMessage]);
            await saveMessageToBackend(errorMessage, activeConvId);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectConversation = async (conversationId: number) => {
        setLoading(true);
        try {
            const response = await axios.get<{ id: number; title: string; messages: any[]; updated_at: string }>(
                `/billy/conversations/${conversationId}`,
            );
            setCurrentConversationId(response.data.id);
            setCurrentConversationTitle(response.data.title);
            const formattedMessages: ChatMessage[] = response.data.messages.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
            setMessages(formattedMessages);
            setPastConversations((prev) =>
                prev
                    .map((conv) =>
                        conv.id === conversationId ? { ...conv, updated_at: response.data.updated_at, title: response.data.title } : conv,
                    )
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
            );
        } catch (error) {
            console.error('Failed to load conversation:', error);
        } finally {
            setLoading(false);
        }
        setIsSheetOpen(false);
    };

    const handleNewConversation = () => {
        setCurrentConversationId(null);
        setCurrentConversationTitle(null);
        setMessages([]);
        setInput('');
        setIsSheetOpen(false);
    };

    const handleDeleteConversation = async (conversationIdToDelete: number) => {
        try {
            await axios.delete(`/billy/conversations/${conversationIdToDelete}`);
            setPastConversations((prev) => prev.filter((conv) => conv.id !== conversationIdToDelete));
            if (currentConversationId === conversationIdToDelete) {
                handleNewConversation();
            }
        } catch (error) {
            console.error('Failed to delete conversation from BillyChat:', error);
            alert('Failed to delete conversation. Please try again.');
        }
    };

    const handleUpdateConversationTitle = async (id: number, title: string) => {
        try {
            const response = await axios.put<ConversationSummary>(`/billy/conversations/${id}/title`, { title });
            setPastConversations((prev) =>
                prev
                    .map((conv) => (conv.id === id ? { ...conv, title: response.data.title, updated_at: response.data.updated_at } : conv))
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
            );
            if (currentConversationId === id) setCurrentConversationTitle(response.data.title);
        } catch (error) {
            console.error('Failed to update title from BillyChat:', error);
            alert('Failed to update title. Please try again.');
        }
    };

    const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const pastConversationsComponent = (
        <BillyPastConversation
            conversations={pastConversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onUpdateConversationTitle={handleUpdateConversationTitle}
            hasMoreConversations={hasMoreConversations}
            isLoadingMore={isLoadingMore}
            onLoadMoreConversations={loadMoreConversations}
            className="h-full"
        />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={currentConversationTitle || 'Billy The AI'} />

            <div className="flex h-[calc(100vh-var(--header-height,64px))] flex-col md:flex-row">
                {' '}
                {/* Adjusted for full viewport height minus header */}
                <div className="hidden flex-col border-r border-gray-200 bg-gray-50 p-4 md:flex md:w-80 lg:w-96 dark:border-gray-700 dark:bg-gray-800/50">
                    {pastConversationsComponent}
                </div>
                <div className="flex items-center justify-between border-b p-3 md:hidden dark:border-gray-700">
                    <h1 className="text-lg font-semibold">{currentConversationTitle || 'Billy The AI'}</h1>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Open chat history">
                                <MenuIcon size={24} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-4/5 max-w-xs p-0">
                            <SheetHeader className="border-b p-4 dark:border-gray-700">
                                <SheetTitle>Chat History</SheetTitle>
                            </SheetHeader>
                            <div className="h-[calc(100%-var(--sheet-header-height,65px))] overflow-y-auto p-4">{pastConversationsComponent}</div>
                        </SheetContent>
                    </Sheet>
                </div>
                <ScrollArea className="flex flex-1 flex-col overflow-hidden">
                    <div className="relative flex h-full flex-col">
                        <div className="relative z-10 flex-1 overflow-y-auto p-4">
                            {messages.length === 0 && !loading ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="max-w-md rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800/50">
                                        <h3 className="mb-2 text-lg font-medium">{currentConversationTitle || 'Welcome to Billy The AI'}</h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {currentConversationId ? 'Continue your conversation or s' : 'S'}tart a new chat or select one from the
                                            history.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message, index) => (
                                    <div
                                        key={message.id || `msg-${index}-${message.timestamp.getTime()}`}
                                        className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {message.role === 'user' ? (
                                            <div className="order-2 ml-2">
                                                <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                                    {auth.user?.avatar && <AvatarImage src={auth.user.avatar} alt={auth.user.name} />}
                                                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                        {auth.user ? getInitials(auth.user.name) : 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        ) : (
                                            <div className="order-1 mr-2">
                                                <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                                    <AvatarFallback className="rounded-full bg-red-600 text-white">B</AvatarFallback>
                                                </Avatar>
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-4/4 ${message.role === 'user' ? 'order-1 mr-2' : 'order-2 ml-2'} rounded-lg p-3 ${
                                                message.role === 'user'
                                                    ? 'bg-red-900 text-white'
                                                    : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                            <div
                                                className={`mt-1 text-right text-[9px] ${message.role === 'user' ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}
                                            >
                                                {formatTime(message.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                                <div className="mt-2 flex justify-start pl-10">
                                    <div className="flex space-x-2">
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="bg-opacity-90 dark:bg-opacity-90 relative z-10 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={loading}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:focus:border-gray-400"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className={`rounded-lg p-2 ${
                                        loading || !input.trim()
                                            ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                                            : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                                    } text-white transition-colors`}
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </AppLayout>
    );
}
