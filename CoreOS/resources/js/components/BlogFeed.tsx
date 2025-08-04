import {Link} from '@inertiajs/react';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Calendar, ChevronRight} from 'lucide-react';
import {Button} from "@/components/ui/button";

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
    featured_image: string | null;
    status: 'draft' | 'published' | 'archived';
    user: User;
    published_at: string;
    created_at: string;
    reading_time: number;
    approved_comments_count: number;
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
                <h3 className="font-semibold text-lg">Company News</h3>
                <Link
                    href="/blog"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    View all
                </Link>
            </div>

            <div className="space-y-4">

                {displayArticles.map((article) => (
                    <div key={article.id} className="pb-4 border-2 border-[gray-100] rounded-t-lg ">
                        <div className="max-w-full overflow-hidden">
                            <div className="p-0">
                                {/* Banner Image */}
                                {article.featured_image && (
                                    <div className="max-h-56 w-full overflow-hidden">
                                        <img
                                            src={`/storage/${article.featured_image}`}
                                            alt={article.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 rounded-t-lg"
                                        />
                                    </div>
                                )}

                                {/* Content Section */}
                                <div className="p-6">
                                    {/* Author Info */}
                                    <div className="flex items-center gap-3 mb-3 ">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={article.user.avatar} />
                                            <AvatarFallback className="text-xs">
                                                {article.user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground jus">
                                            {article.user.name}
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(article.published_at)}
                                            {/*<Clock className="h-4 w-4 ml-2" />*/}
                                            {/*{article.reading_time} min read*/}
                                        </div>

                                    </div>

                                    {/* Title */}
                                    <h3 className="flex text-xl font-semibold mb-3 justify-center">
                                        {article.title}
                                    </h3>

                                    {/* Excerpt */}
                                    <p className="text-muted-foreground mb-4 leading-relaxed">
                                        {article.excerpt}
                                    </p>

                                    <div className={"flex flex-col"}>
                                    {/* Read More Link */}
                                    <Link
                                        href={`/blog/${article.slug}`}
                                        className="group inline-flex items-center gap-1 text-sm font-medium hover:underlin justify-end"
                                    >
                                        <Button variant={"ghost"}>
                                        Read more

                                        <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                            </div>
                                </div>
                            </div>
                        </div>

                    </div>

                ))}
            </div>
        </div>
    );
}
