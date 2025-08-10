import {BillyPastConversation, type ConversationSummary} from '@/components/billyai/billy-past-conversation';
import ImportedMarkdownComponents from '@/components/custom/markdown';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from '@/components/ui/sheet';
import {useInitials} from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import {cn} from '@/lib/utils'; // Assuming you have cn utility
import {type BreadcrumbItem, type SharedData} from '@/types';
import {Head, usePage} from '@inertiajs/react';
import {ScrollArea} from '@radix-ui/react-scroll-area';
import axios from 'axios';
import {CheckCircle, Menu as MenuIcon, Send, ThumbsDown, ThumbsUp} from 'lucide-react'; // Added CheckCircle
import {FormEvent, useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    feedback_rating?: 'up' | 'down' | null;
    feedback_comment?: string | null;
    feedback_submitted?: boolean; // Flag to indicate if feedback was given for this message in the current session or loaded
}

interface PageProps extends SharedData {}

interface PaginatedConversationsResponse {
    data: ConversationSummary[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    total: number;
}

// Structure for message.user_feedback if loaded from backend
interface UserFeedbackData {
    rating: 'up' | 'down';
    comment: string | null;
}
interface MessageFromApi extends Omit<ChatMessage, 'timestamp' | 'feedback_submitted'> {
    timestamp: string; // Timestamps from API are strings
    user_feedback?: UserFeedbackData | null; // Feedback from the current user for this message
}

export default function BillyChat() {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const [showFeedbackInputFor, setShowFeedbackInputFor] = useState<number | null>(null);
    const [feedbackComment, setFeedbackComment] = useState('');

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

    const handleFeedbackSubmit = async (messageId: number, rating: 'up' | 'down', comment?: string) => {
        if (!messageId) return;

        try {
            await axios.post(`/billy/messages/${messageId}/feedback`, {
                rating,
                comment: rating === 'down' ? comment : undefined,
            });

            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, feedback_rating: rating, feedback_comment: comment, feedback_submitted: true } // Set feedback_submitted to true
                        : msg,
                ),
            );

            if (rating === 'down' && showFeedbackInputFor === messageId) {
                setShowFeedbackInputFor(null);
                setFeedbackComment('');
            } else if (rating === 'up') {
                setShowFeedbackInputFor(null);
                setFeedbackComment('');
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            // Consider using a toast notification for errors
            alert('Failed to submit feedback. Please try again.');
        }
    };

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
            const response = await fetch('http://174.49.110.214:9621/query/stream', {
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
                { role: 'assistant', content: '', timestamp: assistantMessageTimestamp, conversation_id: activeConvId ?? undefined },
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
                        if (parsedObj.response) assistantResponseContent += parsedObj.response;
                    } catch (parseError) {
                        /* console.warn('Failed to parse JSON stream object:', jsonStr, parseError); */
                    }
                    startPos = closingPos + 1;
                    curlyPos = buffer.indexOf('{', startPos);
                }
                if (startPos > 0) buffer = buffer.substring(startPos);
                setMessages((prev) => {
                    const updatedMessages = [...prev];
                    if (updatedMessages.length > 0) {
                        const lastMsgIndex = updatedMessages.length - 1;
                        if (
                            updatedMessages[lastMsgIndex].role === 'assistant' &&
                            updatedMessages[lastMsgIndex].timestamp === assistantMessageTimestamp
                        ) {
                            updatedMessages[lastMsgIndex] = { ...updatedMessages[lastMsgIndex], content: assistantResponseContent };
                        }
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
                content: 'Sorry, an error occurred with the AI response.',
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
            // Assume API response structure includes messages with a 'user_feedback' field if feedback exists
            const response = await axios.get<{ id: number; title: string; messages: MessageFromApi[]; updated_at: string }>(
                `/billy/conversations/${conversationId}`,
            );
            setCurrentConversationId(response.data.id);
            setCurrentConversationTitle(response.data.title);

            const formattedMessages: ChatMessage[] = response.data.messages.map((msg) => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                conversation_id: msg.conversation_id,
                feedback_rating: msg.user_feedback?.rating || null,
                feedback_comment: msg.user_feedback?.comment || null,
                feedback_submitted: !!msg.user_feedback, // Set true if user_feedback exists from backend
            }));
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
            <div className="flex h-[calc(100vh-var(--header-height,84px))] flex-col md:flex-row">
                <div className="hidden flex-col border-r md:flex md:w-80 lg:w-96 dark:border-gray-700">{pastConversationsComponent}</div>
                <div className="flex items-center justify-between border-b p-2 md:hidden dark:border-gray-700">
                    <h1 className="truncate px-2 text-lg font-semibold">{currentConversationTitle || 'Billy The AI'}</h1>
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
                            <div className="h-[calc(100%-var(--sheet-header-height,65px))]">{pastConversationsComponent}</div>
                        </SheetContent>
                    </Sheet>
                </div>
                <ScrollArea className="flex flex-1 flex-col overflow-hidden">
                    <div className="relative flex h-full flex-col">
                        <div className="relative z-10 flex-1 overflow-y-auto p-4">
                            {messages.length === 0 && !loading ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="max-w-md rounded-lg p-6 text-center">
                                        <h3 className="mb-2 text-lg font-medium">{currentConversationTitle || 'Welcome to Billy The AI'}</h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {currentConversationId ? 'Continue your conversation or s' : 'S'}tart a new chat or select one from the
                                            history.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id || message.timestamp.getTime()}
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
                                            className={`max-w-[85%] md:max-w-[70%] ${message.role === 'user' ? 'order-1 mr-2' : 'order-2 ml-2'} rounded-lg p-3 ${
                                                message.role === 'user'
                                                    ? 'bg-red-900 text-white'
                                                    : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                                            }`}
                                        >
                                            {message.role === 'assistant' ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={ImportedMarkdownComponents}>
                                                    {message.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <div className="whitespace-pre-wrap">{message.content}</div>
                                            )}
                                            <div
                                                className={`mt-1 flex items-center ${message.role === 'user' ? 'justify-end' : 'justify-between'} text-[9px] ${
                                                    message.role === 'user' ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                            >
                                                <span>{formatTime(message.timestamp)}</span>
                                                {/* Feedback UI Section */}
                                                {message.role === 'assistant' &&
                                                    message.id &&
                                                    (message.feedback_submitted ? (
                                                        <div className="ml-2 flex items-center space-x-1 text-[10px] text-green-600 dark:text-green-400">
                                                            <CheckCircle size={14} />
                                                            <span>Thanks for your feedback!</span>
                                                        </div>
                                                    ) : (
                                                        <div className="ml-2 flex items-center space-x-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    'h-5 w-5 p-0 transition-colors duration-150 ease-in-out',
                                                                    message.feedback_rating === 'up'
                                                                        ? 'text-green-500 hover:text-green-600'
                                                                        : 'text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-500',
                                                                )}
                                                                onClick={() => message.id && handleFeedbackSubmit(message.id, 'up')}
                                                                aria-label="Thumbs Up"
                                                            >
                                                                <ThumbsUp size={14} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    'h-5 w-5 p-0 transition-colors duration-150 ease-in-out',
                                                                    message.feedback_rating === 'down'
                                                                        ? 'text-red-500 hover:text-red-600'
                                                                        : 'text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-500',
                                                                )}
                                                                onClick={() => {
                                                                    if (message.id) {
                                                                        if (showFeedbackInputFor === message.id) {
                                                                            setShowFeedbackInputFor(null);
                                                                            setFeedbackComment('');
                                                                        } else {
                                                                            setShowFeedbackInputFor(message.id);
                                                                            setFeedbackComment(message.feedback_comment || '');
                                                                        }
                                                                    }
                                                                }}
                                                                aria-label="Thumbs Down"
                                                            >
                                                                <ThumbsDown size={14} />
                                                            </Button>
                                                        </div>
                                                    ))}
                                            </div>
                                            {/* Comment input for Thumbs Down (only if feedback not yet submitted) */}
                                            {message.role === 'assistant' &&
                                                message.id &&
                                                !message.feedback_submitted &&
                                                showFeedbackInputFor === message.id && (
                                                    <div className="mt-2">
                                                        <textarea
                                                            value={feedbackComment}
                                                            onChange={(e) => setFeedbackComment(e.target.value)}
                                                            placeholder="Why did you rate this thumbs down? (Optional)"
                                                            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400"
                                                            rows={2}
                                                        />
                                                        <div className="mt-1 flex items-center justify-end space-x-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                                                onClick={() => {
                                                                    setShowFeedbackInputFor(null);
                                                                    setFeedbackComment('');
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 active:bg-red-800"
                                                                onClick={() =>
                                                                    message.id &&
                                                                    handleFeedbackSubmit(message.id, 'down', feedbackComment.trim() || undefined)
                                                                }
                                                            >
                                                                Submit Feedback
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                                <div className="mt-2 flex justify-start pl-10">
                                    <div className="flex space-x-1.5">
                                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]"></div>
                                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]"></div>
                                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="bg-opacity-90 dark:bg-opacity-90 sticky bottom-0 z-20 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={loading}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className={`rounded-lg p-2.5 ${loading || !input.trim() ? 'cursor-not-allowed bg-gray-400 dark:bg-gray-600' : 'bg-red-500 hover:bg-red-600 active:bg-red-700'} text-white transition-colors`}
                                    aria-label="Send message"
                                >
                                    <Send size={20} />
                                </Button>
                            </form>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </AppLayout>
    );
}
