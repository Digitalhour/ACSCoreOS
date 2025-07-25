import React, {useEffect, useState} from 'react';
import {Link, router, usePage} from '@inertiajs/react';
import {Bookmark, Clock, MessageCircle, MoreHorizontal, Share2} from 'lucide-react';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import ReactionPicker from './ReactionPicker';
import ReactionSummary from './ReactionSummary';

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
}

interface UserReaction {
    type: string;
    emoji: string;
}

interface ReactionSummaryItem {
    type: string;
    emoji: string;
    count: number;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published';
    user: User;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    reactions_count?: number;
    comments_count?: number;
    reactions_summary?: ReactionSummaryItem[];
    user_reaction?: UserReaction | null;
}

interface Props {
    articles?: Article[];
    limit?: number;
}

export default function Feed({ articles = [], limit = 10 }: Props) {
    const { props } = usePage();
    const [articleStates, setArticleStates] = useState(() => {
        const initialStates: Record<number, {
            reactions_summary: ReactionSummaryItem[];
            user_reaction: UserReaction | null;
            reactions_count: number;
            comments_count: number;
        }> = {};

        articles.forEach(article => {
            initialStates[article.id] = {
                reactions_summary: article.reactions_summary || [],
                user_reaction: article.user_reaction || null,
                reactions_count: article.reactions_count || 0,
                comments_count: article.comments_count || 0,
            };
        });

        return initialStates;
    });

    // Handle Inertia reaction responses
    useEffect(() => {
        const reactionData = (props as any).reactionData;
        if (reactionData && reactionData.reactable_id) {
            const articleId = reactionData.reactable_id;
            setArticleStates(prev => ({
                ...prev,
                [articleId]: {
                    ...prev[articleId],
                    reactions_summary: reactionData.reactions_summary,
                    user_reaction: reactionData.user_reaction,
                    reactions_count: reactionData.total_reactions,
                }
            }));
        }
    }, [(props as any).reactionData]);

    const handleReaction = (articleId: number, reactionType: string) => {
        router.post('/reactions/toggle', {
            reactable_type: 'App\\Models\\Article',
            reactable_id: articleId,
            type: reactionType,
        }, {
            preserveState: true,
            preserveScroll: true,
            onError: (errors) => {
                console.error('Error toggling reaction:', errors);
            }
        });
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const articleDate = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - articleDate.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

        return articleDate.toLocaleDateString();
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const getAvatar = (avatar: string | undefined) => {
        if (!avatar) return undefined;
        if (avatar.startsWith('/')) return avatar;
        if (avatar.startsWith('http')) return avatar;
        return `/storage/${avatar}`;
    };

    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const displayArticles = articles.slice(0, limit);

    return (
        <div className="space-y-6">
            {displayArticles.map((article) => {
                const articleState = articleStates[article.id] || {
                    reactions_summary: [],
                    user_reaction: null,
                    reactions_count: 0,
                    comments_count: 0,
                };

                return (
                    <Card key={article.id} className="overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage
                                            src={getAvatar(article.user.avatar || undefined)}
                                            alt={article.user.name}
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                            {getInitials(article.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-semibold hover:text-primary cursor-pointer transition-colors">
                                            {article.user.name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            <span>{getTimeAgo(article.published_at || article.created_at)}</span>
                                            {article.status === 'published' && (
                                                <>
                                                    <span>•</span>
                                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                        Published
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <Link href={`/articles/${article.id}`} className="block group">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors leading-tight">
                                    {article.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed line-clamp-3">
                                    {stripHtml(article.content)}
                                </p>
                            </Link>

                            {/* Media placeholder */}
                            <div className="bg-gradient-to-r from-muted/50 to-muted rounded-lg h-48 flex items-center justify-center">
                                <span className="text-muted-foreground font-medium">📄 Article Preview</span>
                            </div>

                            {/* Engagement Stats */}
                            <div className="space-y-3">
                                {(articleState.reactions_summary.length > 0 || articleState.comments_count > 0) && (
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <div className="flex items-center gap-4">
                                            {articleState.reactions_summary.length > 0 && (
                                                <ReactionSummary
                                                    reactions={articleState.reactions_summary}
                                                    total={articleState.reactions_count}
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {articleState.comments_count > 0 && (
                                                <span>{articleState.comments_count} comment{articleState.comments_count !== 1 ? 's' : ''}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                {/* Actions */}
                                <div className="grid grid-cols-4 gap-2">
                                    <ReactionPicker
                                        onReaction={(type) => handleReaction(article.id, type)}
                                        userReaction={articleState.user_reaction}
                                    />

                                    <Button
                                        variant="ghost"
                                        className="flex items-center gap-2 text-muted-foreground hover:text-blue-500"
                                        onClick={() => router.visit(`/articles/${article.id}#comments`)}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="hidden sm:inline">Comment</span>
                                    </Button>

                                    <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-green-500">
                                        <Share2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Share</span>
                                    </Button>

                                    <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-yellow-500">
                                        <Bookmark className="w-4 h-4" />
                                        <span className="hidden sm:inline">Save</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {displayArticles.length === 0 && (
                <Card className="p-12 text-center">
                    <CardContent className="space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                            <MessageCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">No posts yet</h3>
                            <p className="text-muted-foreground">Be the first to share something with your network!</p>
                        </div>
                        <Button asChild className="mt-6">
                            <Link href="/articles/create">
                                Share your thoughts
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <style>{`
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}
