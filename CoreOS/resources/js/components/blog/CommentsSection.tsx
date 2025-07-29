import {useState} from 'react';
import {router, useForm, usePage} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {ArrowUp, Heart, MessageSquarePlus, MoreHorizontal, Reply, Send, Trash2} from 'lucide-react';
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
    slug: string;
    title: string;
}

interface CommentsSectionProps {
    article: BlogArticle;
    comments: Comment[];
}

export default function CommentsSection({ article, comments }: CommentsSectionProps) {
    const { auth } = usePage().props as any;
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'comment' | 'reply'>('comment');
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

    const commentForm = useForm({
        content: '',
        parent_id: null as number | null,
    });

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentForm.data.content.trim()) return;

        commentForm.post(`/blog/${article.slug}/comments`, {
            onSuccess: () => {
                commentForm.reset();
                setModalOpen(false);
                setReplyingTo(null);
            },
        });
    };

    const openCommentModal = () => {
        setModalMode('comment');
        setReplyingTo(null);
        commentForm.setData('parent_id', null);
        commentForm.setData('content', '');
        setModalOpen(true);
    };

    const openReplyModal = (comment: Comment) => {
        setModalMode('reply');
        setReplyingTo(comment);
        commentForm.setData('parent_id', comment.id);
        commentForm.setData('content', '');
        setModalOpen(true);
    };

    const toggleCommentExpansion = (commentId: number) => {
        const newExpanded = new Set(expandedComments);
        if (newExpanded.has(commentId)) {
            newExpanded.delete(commentId);
        } else {
            newExpanded.add(commentId);
        }
        setExpandedComments(newExpanded);
    };

    const handleCommentDelete = (commentId: number) => {
        if (confirm('Are you sure you want to delete this comment?')) {
            router.delete(`/blog-comments/${commentId}`);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
        const canEditComment = auth.user && (
            auth.user.id === comment.user_id ||
            auth.user.roles?.some((role: any) => role.name === 'admin')
        );

        const isExpanded = expandedComments.has(comment.id);
        const hasReplies = comment.replies && comment.replies.length > 0;

        return (
            <div className={`group ${isReply ? 'ml-12' : ''}`}>
                <div className="flex gap-3 p-4 rounded-xl hover:bg-muted/30 transition-colors">
                    <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                        <AvatarImage src={comment.user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            {comment.user.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(comment.created_at)}
                            </span>
                            {comment.updated_at !== comment.created_at && (
                                <Badge variant="outline" className="text-xs py-0">edited</Badge>
                            )}
                        </div>

                        <div className="prose prose-sm max-w-none">
                            <p className="text-sm leading-relaxed text-foreground/90 mb-0">
                                {comment.content}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Heart className="h-3 w-3 mr-1" />
                                Like
                            </Button>

                            {!isReply && auth.user && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => openReplyModal(comment)}
                                >
                                    <Reply className="h-3 w-3 mr-1" />
                                    Reply
                                </Button>
                            )}

                            {canEditComment && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal className="h-3 w-3" />
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
                    </div>
                </div>

                {/* Reply toggle and replies */}
                {hasReplies && (
                    <div className="ml-16 space-y-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCommentExpansion(comment.id)}
                            className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            <ArrowUp className={`h-3 w-3 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                        </Button>

                        {isExpanded && (
                            <div className="space-y-1 border-l-2 border-muted pl-4">
                                {comment.replies!.map((reply) => (
                                    <CommentCard key={`reply-${reply.id}`} comment={reply} isReply={true} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const totalComments = comments.reduce((acc, comment) => {
        return acc + 1 + (comment.replies?.length || 0);
    }, 0);

    return (
        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-gradient-to-b from-background to-muted/20">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-semibold">Discussion</h3>
                        <Badge variant="secondary" className="font-medium">
                            {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                        </Badge>
                    </div>

                    {auth.user && (
                        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={openCommentModal} className="gap-2">
                                    <MessageSquarePlus className="h-4 w-4" />
                                    Add Comment
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>
                                        {modalMode === 'reply' && replyingTo
                                            ? `Reply to ${replyingTo.user.name}`
                                            : 'Add a Comment'
                                        }
                                    </DialogTitle>
                                </DialogHeader>

                                {modalMode === 'reply' && replyingTo && (
                                    <div className="p-4 bg-muted/50 rounded-lg border mb-4">
                                        <div className="flex gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={replyingTo.user.avatar} />
                                                <AvatarFallback>
                                                    {replyingTo.user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{replyingTo.user.name}</p>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {replyingTo.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleCommentSubmit} className="space-y-4">
                                    <Textarea
                                        placeholder={modalMode === 'reply' ? 'Write your reply...' : 'Share your thoughts...'}
                                        value={commentForm.data.content}
                                        onChange={(e) => commentForm.setData('content', e.target.value)}
                                        rows={5}
                                        className="resize-none"
                                        autoFocus
                                    />

                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={commentForm.processing || !commentForm.data.content.trim()}
                                            className="gap-2"
                                        >
                                            <Send className="h-4 w-4" />
                                            {modalMode === 'reply' ? 'Post Reply' : 'Post Comment'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {!auth.user && (
                    <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-center text-muted-foreground">
                            Please log in to join the discussion.
                        </p>
                    </div>
                )}

                {/* Comments list */}
                <div className="space-y-1">
                    {comments.length > 0 ? (
                        comments.map((comment) => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">No comments yet</p>
                            <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
