import ImportedMarkdownComponents from '@/components/custom/markdown'; // Your markdown components
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link} from '@inertiajs/react';
import {ArrowLeft, Calendar, MessageCircle, ThumbsDown, ThumbsUp, UserCircle} from 'lucide-react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define interfaces for the conversation data passed from Laravel
interface FeedbackUser {
    id: number;
    name: string;
    email: string;
}

interface MessageFeedback {
    id: number;
    rating: 'up' | 'down';
    comment: string | null;
    created_at: string;
    user: FeedbackUser; // User who gave the feedback
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string; // Will be a string from JSON, convert to Date if needed for formatting
    feedback: MessageFeedback[] | null; // Feedback can be an array (though usually one per user) or null
}

interface ConversationUser {
    // User who started the conversation
    id: number;
    name: string;
    email: string;
}

interface Conversation {
    id: number;
    title: string;
    user: ConversationUser;
    messages: ChatMessage[];
    created_at: string;
    updated_at: string;
}

interface BillyConversationViewProps {
    conversation: Conversation;
}

const BillyConversationView: React.FC<BillyConversationViewProps> = ({ conversation }) => {
    const getInitials = (name: string) => {
        if (!name) return '';
        const names = name.split(' ');
        let initials = names[0].substring(0, 1).toUpperCase();
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase();
        }
        return initials;
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Billy The AI', href: '/billy' },
        { title: 'Conversations', href: '/billy/feedback' },
        { title: `Conversation: ${conversation.title.substring(0, 30)}...`, href: `/billy/conversation/${conversation.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Conversation: ${conversation.title}`} />

            <div className="p-4">
                <Button asChild variant="outline" className="mb-4">
                    <Link href="/billy/feedback">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center text-2xl font-bold">
                            <MessageCircle className="mr-3 h-7 w-7 text-red-600" />
                            {conversation.title}
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-col text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between dark:text-gray-400">
                            <span>
                                Started by: <UserCircle className="mr-1 inline h-4 w-4" />
                                <strong>{conversation.user.name}</strong> ({conversation.user.email})
                            </span>
                            <span>
                                <Calendar className="mr-1 inline h-4 w-4" />
                                Created: {formatTimestamp(conversation.created_at)}
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {conversation.messages.map((message) => (
                                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {/* Avatar */}
                                    {message.role === 'user' ? (
                                        <div className="order-2 ml-2">
                                            <Avatar className="h-10 w-10">
                                                {/* Assuming admin is viewing, so user avatar might not be available or needed in same way as chat */}
                                                <AvatarFallback className="bg-blue-500 text-white">
                                                    {getInitials(conversation.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    ) : (
                                        <div className="order-1 mr-2">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-red-600 text-white">AI</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    )}

                                    {/* Message Bubble */}
                                    <div
                                        className={`max-w-[85%] rounded-lg p-3 shadow-sm md:max-w-[70%] ${
                                            message.role === 'user'
                                                ? 'order-1 bg-blue-500 text-white'
                                                : 'order-2 bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                                        }`}
                                    >
                                        {/* Message Content */}
                                        {message.role === 'assistant' ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={ImportedMarkdownComponents}>
                                                {message.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                        )}
                                        <div className="text-opacity-80 mt-1 text-xs">{formatTimestamp(message.timestamp)}</div>

                                        {/* Display Feedback for Assistant Messages */}
                                        {message.role === 'assistant' && message.feedback && message.feedback.length > 0 && (
                                            <div className="mt-2 space-y-1 border-t border-gray-300 pt-2 dark:border-gray-600">
                                                {message.feedback.map((fb) => (
                                                    <div key={fb.id} className="text-xs">
                                                        {fb.rating === 'up' ? (
                                                            <Badge
                                                                variant="default"
                                                                className="bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100"
                                                            >
                                                                <ThumbsUp className="mr-1 h-3 w-3" /> Rated Up
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="destructive"
                                                                className="bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100"
                                                            >
                                                                <ThumbsDown className="mr-1 h-3 w-3" /> Rated Down
                                                            </Badge>
                                                        )}
                                                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                            by <strong>{conversation.user.name}</strong> on {formatTimestamp(fb.created_at)}
                                                        </span>
                                                        {fb.comment && (
                                                            <p className="mt-1 pl-1 text-gray-700 italic dark:text-gray-300">
                                                                &ldquo;{fb.comment}&rdquo;
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {conversation.messages.length === 0 && <p className="py-8 text-center text-gray-500">This conversation has no messages.</p>}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
};

export default BillyConversationView;
