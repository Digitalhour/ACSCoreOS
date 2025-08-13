// import React, {useState} from 'react';
// import AppLayout from '@/layouts/app-layout';
// import {Head, Link, router} from '@inertiajs/react';
// import {Input} from '@/components/ui/input';
// import {Button} from '@/components/ui/button';
// import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
// import {Badge} from '@/components/ui/badge';
// import {Book, Calendar, FileText, Plus, Search, User} from 'lucide-react';
// import {type BreadcrumbItem} from '@/types';
//
// interface User {
//     id: number;
//     name: string;
//     email: string;
//     avatar: string;
// }
//
// interface WikiBook {
//     id: number;
//     name: string;
//     slug: string;
//     description: string | null;
//     cover_image: string | null;
//     cover_image_url: string | null;
//     status: 'draft' | 'published';
//     user: User;
//     chapter_count: number;
//     page_count: number;
//     published_at: string | null;
//     created_at: string;
// }
//
// interface Props {
//     books: {
//         data: WikiBook[];
//         links: any[];
//         meta: any;
//     };
//     search: string | null;
// }
//
// const breadcrumbs: BreadcrumbItem[] = [
//     { title: 'Dashboard', href: '/dashboard' },
//     { title: 'Wiki', href: '/wiki' },
// ];
//
// export default function WikiIndex({ books, search }: Props) {
//     const [searchTerm, setSearchTerm] = useState(search || '');
//
//     const handleSearch = (e: React.FormEvent) => {
//         e.preventDefault();
//         router.get('/wiki', { search: searchTerm }, { preserveState: true });
//     };
//
//     const formatDate = (dateString: string) => {
//         return new Date(dateString).toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric'
//         });
//     };
//
//     return (
//         <AppLayout breadcrumbs={breadcrumbs}>
//             <Head title="Wiki" />
//             <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
//                 {/* Header */}
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
//                         <p className="text-muted-foreground mt-2">
//                             Explore and contribute to our comprehensive documentation
//                         </p>
//                     </div>
//                     <Link
//                         href="/wiki/books/create"
//                         className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
//                     >
//                         <Plus className="mr-2 h-4 w-4" />
//                         Create Book
//                     </Link>
//                 </div>
//
//                 {/* Search */}
//                 <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
//                     <div className="relative flex-1">
//                         <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                         <Input
//                             type="text"
//                             placeholder="Search books..."
//                             value={searchTerm}
//                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
//                             className="pl-10"
//                         />
//                     </div>
//                     <Button type="submit">Search</Button>
//                 </form>
//
//                 {/* Books Grid */}
//                 {books.data.length === 0 ? (
//                     <div className="flex flex-col items-center justify-center py-12 text-center">
//                         <Book className="h-12 w-12 text-muted-foreground mb-4" />
//                         <h3 className="text-lg font-semibold">
//                             {search ? 'No books found' : 'No books yet'}
//                         </h3>
//                         <p className="text-muted-foreground mt-2">
//                             {search ? 'Try adjusting your search terms.' : 'Create your first book to get started.'}
//                         </p>
//                         {!search && (
//                             <Link
//                                 href="/wiki/books/create"
//                                 className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 mt-4"
//                             >
//                                 <Plus className="mr-2 h-4 w-4" />
//                                 Create First Book
//                             </Link>
//                         )}
//                     </div>
//                 ) : (
//                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
//                         {books.data.map((book: WikiBook) => (
//                             <Card key={book.id} className="group hover:shadow-lg transition-shadow duration-200">
//                                 {book.cover_image_url && (
//                                     <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
//                                         <img
//                                             src={book.cover_image_url}
//                                             alt={book.name}
//                                             className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
//                                         />
//                                     </div>
//                                 )}
//                                 <CardHeader>
//                                     <div className="flex items-start justify-between">
//                                         <CardTitle className="line-clamp-2 text-lg">
//                                             <Link
//                                                 href={`/wiki/books/${book.slug}`}
//                                                 className="hover:text-primary"
//                                             >
//                                                 {book.name}
//                                             </Link>
//                                         </CardTitle>
//                                         <Badge variant={book.status === 'published' ? 'default' : 'secondary'}>
//                                             {book.status}
//                                         </Badge>
//                                     </div>
//                                 </CardHeader>
//                                 <CardContent>
//                                     {book.description && (
//                                         <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
//                                             {book.description}
//                                         </p>
//                                     )}
//                                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
//                                         <div className="flex items-center gap-1">
//                                             <Book className="h-4 w-4" />
//                                             {book.chapter_count} chapters
//                                         </div>
//                                         <div className="flex items-center gap-1">
//                                             <FileText className="h-4 w-4" />
//                                             {book.page_count} pages
//                                         </div>
//                                     </div>
//                                 </CardContent>
//                                 <CardFooter className="pt-4 border-t">
//                                     <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
//                                         <div className="flex items-center gap-1">
//                                             <User className="h-4 w-4" />
//                                             {book.user.name}
//                                         </div>
//                                         <div className="flex items-center gap-1">
//                                             <Calendar className="h-4 w-4" />
//                                             {formatDate(book.published_at || book.created_at)}
//                                         </div>
//                                     </div>
//                                 </CardFooter>
//                             </Card>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </AppLayout>
//     );
// }
import React, {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head, Link, router, usePage} from '@inertiajs/react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Book, CircleSmall, FileText, Plus, Search, User} from 'lucide-react';
import {type BreadcrumbItem} from '@/types';
import {usePermission} from '@/hooks/usePermission';
import {WikiPermissionsEnum} from "@/types/permissions";

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
}

interface WikiChapter {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    status: 'draft' | 'published';
    user_id: number;
    published_at: string | null;
    created_at: string;
    pages?: any[];
}


interface WikiBook {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    cover_image: string | null;
    cover_image_url: string | null;
    status: 'draft' | 'published';
    user: User;
    chapters: WikiChapter[];
    chapter_count: number;
    page_count: number;
    published_at: string | null;
    created_at: string;
}

interface Props {

    books: {
        data: WikiBook[];
        links: any[];
        meta: any;
    };
    search: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Wiki', href: '/wiki' },
];

export default function WikiIndex({ books, search }: Props) {
    const { auth } = usePage().props;
    const [searchTerm, setSearchTerm] = useState(search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/wiki', { search: searchTerm }, { preserveState: true });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get published chapters for display
    const getPublishedChapters = (chapters: WikiChapter[]) => {
        return chapters.filter(chapter => chapter.status === 'published');
    };
    const { hasPermission, hasRole, hasAnyRole } = usePermission();
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ACS Wiki" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">ACS Wiki Knowledge Base</h1>
                        <p className="text-muted-foreground mt-2">
                            Find answers to common technical questions.
                        </p>
                    </div>

                    {hasPermission(WikiPermissionsEnum.Create) && (
                        <Link
                            href="/wiki/books/create"
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Book
                        </Link>
                    )}
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search books..."
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button type="submit">Search</Button>
                </form>

                {/* Books Grid */}
                {books.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Book className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">
                            {search ? 'No books found' : 'No books yet'}
                        </h3>
                        <p className="text-muted-foreground mt-2">
                            {search ? 'Try adjusting your search terms.' : 'Create your first book to get started.'}
                        </p>
                        {!search && (
                            <Link
                                href="/wiki/books/create"
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 mt-4"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Book
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {books.data.map((book: WikiBook) => {
                            const publishedChapters = getPublishedChapters(book.chapters);

                            return (
                                <div key={book.id} className="group hover:shadow-lg transition-shadow duration-200 border rounded-md p-4">
                                    <div className="pb-3">

                                        <div className="flex items-center gap-2 mb-2">
                                            <Book className="h-5 w-5 text-muted-foreground" />
                                            <div className="text-lg font-semibold">
                                                <Link
                                                    href={`/wiki/books/${book.slug}`}
                                                    className="hover:text-primary transition-colors"
                                                >
                                                    {book.name}
                                                </Link>
                                            </div>
                                            <Badge variant={book.status === 'published' ? 'default' : 'secondary'} className="ml-auto">
                                                {book.status}
                                            </Badge>
                                        </div>

                                        {book.cover_image_url && (
                                                <img
                                                    src={book.cover_image_url}
                                                    alt={book.name}
                                                    className="max-h-40 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                />
                                        )}

                                        {book.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {book.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-0">
                                        {/* Chapter List */}
                                        {publishedChapters.length > 0 ? (
                                            <div className="space-y-1 flex">
                                                {publishedChapters.slice(0, 6).map((chapter: WikiChapter) => (

                                                    <Link
                                                        key={chapter.id}
                                                        href={`/wiki/${book.slug}/${chapter.slug}`}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded-md transition-colors group"
                                                    >
                                                        <CircleSmall className={"h-3 w-3"} />
                                                        <span className="flex-1 truncate">{chapter.name}</span>
                                                    </Link>
                                                ))}
                                                {publishedChapters.length > 6 && (
                                                    <Link
                                                        href={`/wiki/books/${book.slug}`}
                                                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-md transition-colors border-t"
                                                    >
                                                        see all chapters
                                                    </Link>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No chapters available</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1">
                                                    <Book className="h-4 w-4" />
                                                    {book.chapter_count} chapters
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4" />
                                                    {book.page_count} pages
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User className="h-4 w-4" />
                                                {book.user.name}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {books.data.length > 0 && books.meta && books.meta.last_page > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-6">
                        {books.links && books.links.map((link: any, index: number) => (
                            <Link
                                key={index}
                                href={link.url || '#'}
                                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                                    link.active
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'hover:bg-muted'
                                } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>


        </AppLayout>
    );
}
