import React, {useEffect, useState} from 'react';
import {Head, Link, router, usePage} from '@inertiajs/react';
import {ArrowLeft, Clock, Edit, Share2, User} from 'lucide-react';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import ReactionPicker from '@/components/ReactionPicker';
import ReactionSummary from '@/components/ReactionSummary';
import CommentSection from '@/components/CommentSection';
import AppLayout from "@/layouts/app-layout";
import {BreadcrumbItem} from "@/types";

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
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

interface Comment {
    id: number;
    content: string;
    user: User;
    parent_id?: number;
    created_at: string;
    updated_at: string;
    edited_at?: string;
    replies?: Comment[];
    reactions_count?: number;
    replies_count?: number;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    status: 'draft' | 'published';
    user: User;
    published_at?: string;
    created_at: string;
    updated_at: string;
    reactions_count?: number;
    comments_count?: number;
    reactions_summary?: ReactionSummaryItem[];
    user_reaction?: UserReaction | null;
    comments?: Comment[];
}

interface Props {
    article: Article;
}

interface PageProps {
    auth: {
        user?: User;
    };
    reactionUpdate?: {
        action: string;
        reactable_id: number;
        reactable_type: string;
        reactions_summary: ReactionSummaryItem[];
        user_reaction: UserReaction | null;
        total_reactions: number;
    };
    commentData?: {
        action: string;
        comment?: Comment;
        commentId?: number;
    };
}

export default function Show({ article: initialArticle }: Props) {
    const { props } = usePage<PageProps>();
    const { auth, reactionData, commentData } = props;
    const [article, setArticle] = useState(initialArticle);
    const [comments, setComments] = useState<Comment[]>(initialArticle.comments || []);

    // Handle comment responses from Inertia flash data
    useEffect(() => {
        if (commentData) {
            if (commentData.action === 'added' && commentData.comment) {
                handleCommentAdded(commentData.comment);
            } else if (commentData.action === 'updated' && commentData.comment) {
                handleCommentUpdated(commentData.comment);
            } else if (commentData.action === 'deleted' && commentData.commentId) {
                handleCommentDeleted(commentData.commentId);
            }
        }
    }, [commentData]);

    const handleReaction = (reactionType: string) => {
        router.post('/reactions/toggle', {
            reactable_type: 'App\\Models\\Article',
            reactable_id: article.id,
            type: reactionType,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                // Handle the response directly in the success callback
                const reactionData = (page.props as PageProps).reactionData;
                if (reactionData) {
                    console.log('Success callback - updating article:', reactionData);
                    setArticle(prev => ({
                        ...prev,
                        reactions_summary: reactionData.reactions_summary,
                        user_reaction: reactionData.user_reaction,
                        reactions_count: reactionData.total_reactions,
                    }));
                }
            },
            onError: (errors) => {
                console.error('Reaction toggle failed:', errors);
            }
        });
    };

    const handleCommentAdded = (comment: Comment) => {
        if (comment.parent_id) {
            // It's a reply - find the parent and add to its replies
            setComments(prev => prev.map(c => {
                if (c.id === comment.parent_id) {
                    return {
                        ...c,
                        replies: [...(c.replies || []), comment],
                        replies_count: (c.replies_count || 0) + 1,
                    };
                }
                return c;
            }));
        } else {
            // It's a top-level comment
            setComments(prev => [comment, ...prev]);
        }

        setArticle(prev => ({
            ...prev,
            comments_count: (prev.comments_count || 0) + 1,
        }));
    };

    const handleCommentUpdated = (updatedComment: Comment) => {
        const updateCommentInList = (commentList: Comment[]): Comment[] => {
            return commentList.map(comment => {
                if (comment.id === updatedComment.id) {
                    return updatedComment;
                }
                if (comment.replies) {
                    return {
                        ...comment,
                        replies: updateCommentInList(comment.replies),
                    };
                }
                return comment;
            });
        };

        setComments(prev => updateCommentInList(prev));
    };

    const handleCommentDeleted = (commentId: number) => {
        const removeCommentFromList = (commentList: Comment[]): Comment[] => {
            return commentList.filter(comment => {
                if (comment.id === commentId) {
                    return false;
                }
                if (comment.replies) {
                    comment.replies = removeCommentFromList(comment.replies);
                }
                return true;
            });
        };

        setComments(prev => removeCommentFromList(prev));
        setArticle(prev => ({
            ...prev,
            comments_count: Math.max((prev.comments_count || 1) - 1, 0),
        }));
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

    const getAvatar = (avatar?: string) => {
        if (!avatar) return undefined;
        if (avatar.startsWith('/')) return avatar;
        if (avatar.startsWith('http')) return avatar;
        return `/storage/${avatar}`;
    };

    const formatContent = (content: string) => {
        // Simple content formatting - replace line breaks with paragraphs
        return content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-4 leading-relaxed">
                {paragraph}
            </p>
        ));
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={article.title} />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Back button */}
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/articles" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Articles
                    </Link>
                </Button>

                {/* Article content */}
                <Card>
                    <CardHeader className="space-y-4">
                        {/* Author info */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={getAvatar(article.user.avatar)} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                        {getInitials(article.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-semibold">{article.user.name}</h4>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>{getTimeAgo(article.published_at || article.created_at)}</span>
                                        {article.status === 'published' && (
                                            <>
                                                <span>•</span>
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                    Published
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {auth.user?.id === article.user.id && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/articles/${article.id}/edit`}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <h1 className="text-3xl font-bold leading-tight mb-2">
                                {article.title}
                            </h1>
                            {article.excerpt && (
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {article.excerpt}
                                </p>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Article content */}
                        <div className="prose prose-lg max-w-none">
                            {formatContent(article.content)}
                        </div>

                        <Separator />

                        {/* Engagement section */}
                        <div className="space-y-4">
                            {/* Reaction and comment stats */}
                            {((article.reactions_summary && article.reactions_summary.length > 0) || (article.comments_count && article.comments_count > 0)) && (
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                        {article.reactions_summary && article.reactions_summary.length > 0 && (
                                            <ReactionSummary
                                                reactions={article.reactions_summary}
                                                total={article.reactions_count || 0}
                                                reactableType="App\\Models\\Article"
                                                reactableId={article.id}
                                            />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {article.comments_count && article.comments_count > 0 && (
                                            <span>{article.comments_count} comment{article.comments_count !== 1 ? 's' : ''}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="grid grid-cols-3 gap-4">
                                <ReactionPicker
                                    onReaction={handleReaction}
                                    userReaction={article.user_reaction}
                                />

                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2 text-muted-foreground hover:text-blue-500"
                                    onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
                                >
                                    <User className="w-4 h-4" />
                                    <span>Comment</span>
                                </Button>

                                <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-green-500">
                                    <Share2 className="w-4 h-4" />
                                    <span>Share</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments section */}
                <CommentSection
                    articleId={article.id}
                    comments={comments}
                    currentUserId={auth.user?.id}
                    onCommentAdded={handleCommentAdded}
                    onCommentUpdated={handleCommentUpdated}
                    onCommentDeleted={handleCommentDeleted}
                />
            </div>
        </AppLayout>
    );
}
