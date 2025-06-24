import {Link} from '@inertiajs/react';
import {Bookmark, Clock, Heart, MessageCircle, MoreHorizontal, Share2} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
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
}

interface Props {
    articles?: Article[];
    limit?: number;
}

export default function Feed({ articles = [], limit = 10 }: Props) {
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

    const getAvatar = (avatar: string | null) => {
        if (!avatar) return null;
        if (avatar.startsWith('/')) return avatar;
        if (avatar.startsWith('http')) return avatar;
        return `/storage/${avatar}`;
    };

    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const displayArticles = articles.slice(0, limit);

    // Debug: Log first user's data
    if (displayArticles.length > 0) {
        console.log('First user data:', displayArticles[0].user);
    }

    return (
        <div className="">
            {displayArticles.map((article) => (
                <div key={article.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Header */}
                    <div className="p-6 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {article.user.avatar ? (
                                    <img
                                        src={getAvatar(article.user.avatar)}
                                        alt={article.user.name}
                                        className="w-12 h-12 rounded-full object-cover shadow-md"
                                        onError={(e) => {
                                            console.log('Avatar failed to load for:', article.user.name);
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : null}
                                <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${article.user.avatar ? 'hidden' : ''}`}>
                                    {getInitials(article.user.name)}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                                        {article.user.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Clock className="w-4 h-4" />
                                        {getTimeAgo(article.published_at || article.created_at)}
                                        {article.status === 'published' && (
                                            <>
                                                <span>•</span>
                                                <span className="text-green-600 dark:text-green-400">Published</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-4">
                        <Link href={`/articles/${article.id}`} className="block group">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                                {article.title}
                            </h3>
                            {article.excerpt && (
                                <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                                    {article.excerpt}
                                </p>
                            )}
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                                {stripHtml(article.content)}
                            </p>
                        </Link>
                    </div>

                    {/* Media placeholder - like LinkedIn/Facebook posts */}
                    <div className="mx-6 mb-4">
                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg h-48 flex items-center justify-center">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">📄 Article Preview</span>
                        </div>
                    </div>

                    {/* Engagement Stats */}
                    <div className="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <div className="flex -space-x-1">
                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                            <Heart className="w-3 h-3 text-white fill-current" />
                                        </div>
                                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">👍</span>
                                        </div>
                                    </div>
                                    <span className="ml-2">{Math.floor(Math.random() * 50) + 5}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span>{Math.floor(Math.random() * 20) + 1} comments</span>
                                <span>{Math.floor(Math.random() * 10) + 1} shares</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200">
                                <Heart className="w-5 h-5" />
                                <span className="font-medium">Like</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200">
                                <MessageCircle className="w-5 h-5" />
                                <span className="font-medium">Comment</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200">
                                <Share2 className="w-5 h-5" />
                                <span className="font-medium">Share</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200">
                                <Bookmark className="w-5 h-5" />
                                <span className="font-medium">Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {displayArticles.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No posts yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Be the first to share something with your network!</p>
                    <Link
                        href="/articles/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Share your thoughts
                    </Link>
                </div>
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
