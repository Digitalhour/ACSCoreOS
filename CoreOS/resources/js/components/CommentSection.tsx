import React, {useEffect, useRef, useState} from 'react';
import {Edit, MessageCircle, MoreHorizontal, Reply, Trash2} from 'lucide-react';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';
import {router, usePage} from '@inertiajs/react';
import ReactionPicker from './ReactionPicker';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
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

interface Props {
    articleId: number;
    comments: Comment[];
    currentUserId?: number;
    onCommentAdded?: (comment: Comment) => void;
    onCommentUpdated?: (comment: Comment) => void;
    onCommentDeleted?: (commentId: number) => void;
}

export default function CommentSection({
                                           articleId,
                                           comments: initialComments,
                                           currentUserId,
                                           onCommentAdded,
                                           onCommentUpdated,
                                           onCommentDeleted
                                       }: Props) {
    const { props } = usePage();
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [replyContent, setReplyContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Handle Inertia responses
    useEffect(() => {
        const commentData = (props as any).commentData;
        if (commentData) {
            if (commentData.action === 'added') {
                handleCommentAdded(commentData.comment);
                onCommentAdded?.(commentData.comment);
            } else if (commentData.action === 'updated') {
                handleCommentUpdated(commentData.comment);
                onCommentUpdated?.(commentData.comment);
            } else if (commentData.action === 'deleted') {
                handleCommentDeleted(commentData.commentId);
                onCommentDeleted?.(commentData.commentId);
            }
        }
    }, [(props as any).commentData]);

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
    };

    const handleSubmitComment = () => {
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        router.post('/comments', {
            commentable_type: 'App\\Models\\Article',
            commentable_id: articleId,
            content: newComment,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setNewComment('');
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            }
        });
    };

    const handleSubmitReply = (parentId: number) => {
        if (!replyContent.trim() || isSubmitting) return;

        setIsSubmitting(true);
        router.post('/comments', {
            commentable_type: 'App\\Models\\Article',
            commentable_id: articleId,
            parent_id: parentId,
            content: replyContent,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setReplyContent('');
                setReplyingTo(null);
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            }
        });
    };

    const handleEditComment = (commentId: number) => {
        if (!editContent.trim() || isSubmitting) return;

        setIsSubmitting(true);
        router.put(`/comments/${commentId}`, {
            content: editContent,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditingComment(null);
                setEditContent('');
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            }
        });
    };

    const handleDeleteComment = (commentId: number) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        router.delete(`/comments/${commentId}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleReaction = (commentId: number, reactionType: string) => {
        router.post('/reactions/toggle', {
            reactable_type: 'App\\Models\\Comment',
            reactable_id: commentId,
            type: reactionType,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const commentDate = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

        return commentDate.toLocaleDateString();
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

    const renderComment = (comment: Comment, depth = 0) => {
        const isEditing = editingComment === comment.id;
        const isReplying = replyingTo === comment.id;
        const isOwner = currentUserId === comment.user.id;
        const maxDepth = 3; // Limit nesting depth

        return (
            <div key={comment.id} className={cn("space-y-3", depth > 0 && "ml-8 border-l border-muted pl-4")}>
                <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatar(comment.user.avatar)} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {getInitials(comment.user.name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                        <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{comment.user.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {getTimeAgo(comment.created_at)}
                                </span>
                                {comment.edited_at && (
                                    <Badge variant="secondary" className="text-xs">
                                        Edited
                                    </Badge>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-2">
                                    <Textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="min-h-[60px] resize-none"
                                        placeholder="Edit your comment..."
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            disabled={isSubmitting}
                                            onClick={() => handleEditComment(comment.id)}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setEditingComment(null);
                                                setEditContent('');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm leading-relaxed">{comment.content}</p>
                            )}
                        </div>

                        {!isEditing && (
                            <div className="flex items-center gap-2 text-xs">
                                <ReactionPicker
                                    onReaction={(type) => handleReaction(comment.id, type)}
                                    className="text-xs h-6 px-2"
                                />

                                {depth < maxDepth && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                            setReplyingTo(isReplying ? null : comment.id);
                                            setReplyContent('');
                                        }}
                                    >
                                        <Reply className="w-3 h-3 mr-1" />
                                        Reply
                                    </Button>
                                )}

                                {isOwner && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <MoreHorizontal className="w-3 h-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setEditingComment(comment.id);
                                                    setEditContent(comment.content);
                                                }}
                                            >
                                                <Edit className="w-3 h-3 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="w-3 h-3 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )}

                        {isReplying && (
                            <div className="mt-3 space-y-2">
                                <Textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    className="min-h-[60px] resize-none"
                                    placeholder="Write a reply..."
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        disabled={isSubmitting || !replyContent.trim()}
                                        onClick={() => handleSubmitReply(comment.id)}
                                    >
                                        Reply
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
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
                {comment.replies && comment.replies.length > 0 && (
                    <div className="space-y-3">
                        {comment.replies.map((reply) => renderComment(reply, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div id="comments" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">
                            Comments ({comments.length})
                        </h3>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Add new comment */}
                    {currentUserId && (
                        <div className="space-y-3">
                            <Textarea
                                ref={textareaRef}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="min-h-[80px] resize-none"
                                placeholder="Write a comment..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        handleSubmitComment();
                                    }
                                }}
                            />
                            <div className="flex justify-end">
                                <Button
                                    disabled={isSubmitting || !newComment.trim()}
                                    onClick={handleSubmitComment}
                                >
                                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Comments list */}
                    <div className="space-y-6">
                        {comments.length > 0 ? (
                            comments.map((comment) => renderComment(comment))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No comments yet. Be the first to comment!</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
