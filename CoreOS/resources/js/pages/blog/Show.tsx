import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, usePage} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {Calendar, Edit, MessageCircle} from 'lucide-react';
import CommentsSection from '@/components/blog/CommentsSection';

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

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'blog', href: '/blog' },
        { title: article.title, href: `/blog/${article.slug}` },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const canEditArticle = auth.user && (
        auth.user.id === article.user.id ||
        auth.user.roles?.some((role: any) => role.name === 'admin')
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={article.title} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">

                    {/* Article Header Card */}
                    <div className="col-span-4">
                        <div className=" relative overflow-hidden ">
                            <div className="p-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {article.status === 'draft' && (
                                            <Badge variant="secondary" className="mb-4">
                                                Draft
                                            </Badge>
                                        )}
                                        <h1 className="text-2xl font-bold tracking-tight mb-4">
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
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={article.user.avatar} />
                                            <AvatarFallback>
                                                {article.user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{article.user.name}</p>
                                            <p className="text-xs text-muted-foreground">Author</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-2 w-2" />
                                        {formatDate(article.published_at)}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <MessageCircle className="h-2 w-2" />
                                        {comments.length} comments
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Articles Sidebar */}
                    {/*<div className="col-span-1">*/}
                    {/*    {relatedArticles.length > 0 && (*/}
                    {/*        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">*/}
                    {/*            <div className="p-4">*/}
                    {/*                <h3 className="font-semibold mb-4">Related Articles</h3>*/}
                    {/*                <div className="space-y-4">*/}
                    {/*                    {relatedArticles.map((related, index) => (*/}
                    {/*                        <div key={related.id}>*/}
                    {/*                            <Link*/}
                    {/*                                href={`/blog/${related.slug}`}*/}
                    {/*                                className="block hover:text-primary transition-colors"*/}
                    {/*                            >*/}
                    {/*                                <h4 className="font-medium line-clamp-2 mb-2 text-sm">*/}
                    {/*                                    {related.title}*/}
                    {/*                                </h4>*/}
                    {/*                                <p className="text-xs text-muted-foreground">*/}
                    {/*                                    by {related.user.name}*/}
                    {/*                                </p>*/}
                    {/*                            </Link>*/}
                    {/*                            {index < relatedArticles.length - 1 && (*/}
                    {/*                                <div className="border-t border-border/40 mt-4" />*/}
                    {/*                            )}*/}
                    {/*                        </div>*/}
                    {/*                    ))}*/}
                    {/*                </div>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*    )}*/}
                    {/*</div>*/}


                    {/*/!* Featured Image *!/*/}
                    {/*{article.featured_image && (*/}
                    {/*    <div className="col-span-4">*/}
                    {/*        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">*/}
                    {/*            <img*/}
                    {/*                src={`/storage/${article.featured_image}`}*/}
                    {/*                alt={article.title}*/}
                    {/*                className="w-full h-auto object-cover"*/}
                    {/*            />*/}
                    {/*        </div>*/}
                    {/*    </div>*/}
                    {/*)}*/}
                    {/* Article Content */}
                    <div className="col-span-4">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border">
                            <div className="p-6 prose prose-slate dark:prose-invert max-w-none"
                                 dangerouslySetInnerHTML={{ __html: article.content }} />
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="col-span-4">
                        <CommentsSection article={article} comments={comments} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
