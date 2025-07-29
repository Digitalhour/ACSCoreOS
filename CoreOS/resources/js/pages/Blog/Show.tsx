import {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router, useForm, usePage} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Calendar, Edit, MessageCircle, MoreHorizontal, Reply, Trash2} from 'lucide-react';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
}

interface Comment {
    id: number;
    content: string;
    user: User;
    user_id: number;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    replies?: Comment[];
}

interface BlogArticle {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featured_image: string | null;
    status: 'draft' | 'published' | 'archived';
    user: User;
    published_at: string;
    created_at: string;
    updated_at: string;
    reading_time: number;
}

interface Props {
    article: BlogArticle;
    comments: Comment[];
    relatedArticles: BlogArticle[];
}

export default function BlogShow({ article, comments, relatedArticles }: Props) {
    const { auth } = usePage().props as any;
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyContent, setReplyContent] = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Blog', href: '/blog' },
        { title: article.title, href: `/blog/${article.slug}` },
    ];

    const commentForm = useForm({
        content: '',
        parent_id: null as number | null,
    });

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        commentForm.post(`/blog/${article.slug}/comments`, {
            onSuccess: () => commentForm.reset(),
        });
    };

    const handleReplySubmit = (parentId: number) => {
        router.post(`/blog/${article.slug}/comments`, {
            content: replyContent,
            parent_id: parentId,
        }, {
            onSuccess: () => {
                setReplyContent('');
                setReplyingTo(null);
            },
        });
    };

    const handleCommentDelete = (commentId: number) => {
        if (confirm('Are you sure you want to delete this comment?')) {
            router.delete(`/comments/${commentId}`);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const canEditArticle = auth.user && (
        auth.user.id === article.user.id ||
        auth.user.roles?.some((role: any) => role.name === 'admin')
    );

    const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
        const canEditComment = auth.user && (
            auth.user.id === comment.user_id ||
            auth.user.roles?.some((role: any) => role.name === 'admin')
        );

        return (
            <div key={`comment-${comment.id}`} className={`${isReply ? 'ml-8' : ''} mb-4`}>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                    <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.user.avatar} />
                                    <AvatarFallback>
                                        {comment.user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{comment.user.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDateTime(comment.created_at)}
                                        {comment.updated_at !== comment.created_at && ' (edited)'}
                                    </p>
                                </div>
                            </div>

                            {canEditComment && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => handleCommentDelete(comment.id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        <p className="text-sm leading-relaxed mb-3">{comment.content}</p>

                        {!isReply && auth.user && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(
                                    replyingTo === comment.id ? null : comment.id
                                )}
                            >
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                            </Button>
                        )}

                        {replyingTo === comment.id && (
                            <div className="mt-4 space-y-3">
                                <Textarea
                                    placeholder="Write a reply..."
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={!replyContent.trim()}
                                        onClick={() => handleReplySubmit(comment.id)}
                                    >
                                        Reply
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setReplyingTo(null);
                                            setReplyContent('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Render replies */}
                {comment.replies && comment.replies.map((reply) => (
                    <CommentCard key={`reply-${reply.id}`} comment={reply} isReply={true} />
                ))}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={article.title} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">

                    {/* Article Header Card */}
                    <div className="col-span-3">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        {article.status === 'draft' && (
                                            <Badge variant="secondary" className="mb-4">
                                                Draft
                                            </Badge>
                                        )}
                                        <h1 className="text-4xl font-bold tracking-tight mb-4">
                                            {article.title}
                                        </h1>
                                    </div>
                                    {canEditArticle && (
                                        <Link href={`/blog/${article.slug}/edit`}>
                                            <Button variant="outline" size="sm">
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
                                    )}
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={article.user.avatar} />
                                            <AvatarFallback>
                                                {article.user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{article.user.name}</p>
                                            <p className="text-sm text-muted-foreground">Author</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(article.published_at)}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MessageCircle className="h-4 w-4" />
                                        {comments.length} comments
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Articles Sidebar */}
                    <div className="col-span-1">
                        {relatedArticles.length > 0 && (
                            <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                                <div className="p-4">
                                    <h3 className="font-semibold mb-4">Related Articles</h3>
                                    <div className="space-y-4">
                                        {relatedArticles.map((related, index) => (
                                            <div key={related.id}>
                                                <Link
                                                    href={`/blog/${related.slug}`}
                                                    className="block hover:text-primary transition-colors"
                                                >
                                                    <h4 className="font-medium line-clamp-2 mb-2 text-sm">
                                                        {related.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        by {related.user.name}
                                                    </p>
                                                </Link>
                                                {index < relatedArticles.length - 1 && (
                                                    <div className="border-t border-border/40 mt-4" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Featured Image */}
                    {article.featured_image && (
                        <div className="col-span-4">
                            <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                                <img
                                    src={`/storage/${article.featured_image}`}
                                    alt={article.title}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* Article Content */}
                    <div className="col-span-4">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                            <div className="p-6 prose prose-slate dark:prose-invert max-w-none"
                                 dangerouslySetInnerHTML={{ __html: article.content }} />
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="col-span-4">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                            <div className="p-6">
                                <h3 className="text-2xl font-semibold mb-6">
                                    Comments ({comments.length})
                                </h3>

                                {/* Comment form */}
                                {auth.user ? (
                                    <form onSubmit={handleCommentSubmit} className="mb-8">
                                        <div className="space-y-4">
                                            <Textarea
                                                placeholder="Share your thoughts..."
                                                value={commentForm.data.content}
                                                onChange={(e) => commentForm.setData('content', e.target.value)}
                                                rows={4}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={commentForm.processing || !commentForm.data.content.trim()}
                                            >
                                                Post Comment
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="mb-8 p-4 bg-muted rounded-lg">
                                        <p className="text-center text-muted-foreground">
                                            Please log in to leave a comment.
                                        </p>
                                    </div>
                                )}

                                {/* Comments list */}
                                <div className="space-y-4">
                                    {comments.length > 0 ? (
                                        comments.map((comment) => (
                                            <CommentCard key={comment.id} comment={comment} />
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">
                                            No comments yet. Be the first to share your thoughts!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
