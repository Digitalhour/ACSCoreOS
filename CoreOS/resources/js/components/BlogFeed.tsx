import {Link} from '@inertiajs/react';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Calendar, MessageCircle} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
}

interface BlogArticle {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    featured_image?: string | null;
    status: 'draft' | 'published' | 'archived';
    user: User;
    published_at: string | null;
    created_at: string;
    reading_time?: number;
    approved_comments_count?: number;
}

interface Props {
    articles: BlogArticle[];
    limit?: number;
}

export default function BlogFeed({ articles, limit = 5 }: Props) {
    const displayArticles = articles.slice(0, limit);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    if (displayArticles.length === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                <p>No published articles yet.</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Latest Articles</h3>
                <Link
                    href="/blog"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    View all
                </Link>
            </div>

            <div className="space-y-4">
                {displayArticles.map((article) => (
                    <div key={article.id} className="border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
                        <Link
                            href={`/blog/${article.slug}`}
                            className="block group"
                        >
                            <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                {article.title}
                            </h4>

                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                {article.excerpt}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={article.user.avatar} />
                                        <AvatarFallback className="text-xs">
                                            {article.user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {article.user.name}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(article.published_at)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageCircle className="h-3 w-3" />
                                        {article.approved_comments_count || 0}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
