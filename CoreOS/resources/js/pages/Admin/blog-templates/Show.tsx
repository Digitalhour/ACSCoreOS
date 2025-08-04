import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {ArrowLeft, Edit, Trash2} from 'lucide-react';

interface BlogTemplate {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    content: string;
    featured_image: string | null;
    preview_url: string | null;
    category: string;
    metadata: any;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    template: BlogTemplate;
}

export default function BlogTemplateShow({ template }: Props) {
    if (!template) {
        return (
            <AppLayout breadcrumbs={[]}>
                <Head title="Template Not Found" />
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-destructive mb-4">Template Not Found</h1>
                        <p className="text-muted-foreground mb-4">The template you're looking for doesn't exist.</p>
                        <Link href="/admin/blog-templates">
                            <Button>Back to Templates</Button>
                        </Link>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Admin',
            href: '/admin',
        },
        {
            title: 'Blog Templates',
            href: '/admin/blog-templates',
        },
        {
            title: template.name,
            href: `/admin/blog-templates/${template.slug}`,
        },
    ];

    const getWordCount = (content: string): number => {
        return content.split(/\s+/).filter(word => word.length > 0).length;
    };

    const wordCount = getWordCount(template.content);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Template: ${template.name}`} />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/blog-templates">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Templates
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{template.name}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                    {template.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline">{template.category}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    Created: {new Date(template.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/admin/blog-templates/${template.slug}/edit`}>
                            <Button>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Template
                            </Button>
                        </Link>
                        <Link
                            href={`/admin/blog-templates/${template.slug}`}
                            method="delete"
                            as="button"
                            onBefore={() => confirm('Are you sure you want to delete this template?')}
                        >
                            <Button variant="destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Template Details */}
                        {template.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{template.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Featured Image */}
                        {template.featured_image && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Template Image</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <img
                                        src={template.preview_url || `/storage/${template.featured_image}`}
                                        alt={template.name}
                                        className="w-full h-64 object-cover rounded-lg"
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Template Content */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Content</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted p-4 rounded-lg">
                                    <h4 className="text-sm font-medium mb-2">HTML Preview:</h4>
                                    <div
                                        className="prose prose-sm max-w-none bg-white p-4 rounded border"
                                        dangerouslySetInnerHTML={{ __html: template.content }}
                                    />
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium mb-2">Raw HTML:</h4>
                                    <pre className="bg-slate-100 p-4 rounded text-xs overflow-auto max-h-96">
                                        <code>{template.content}</code>
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Template Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>Status:</span>
                                    <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                                        {template.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Category:</span>
                                    <span>{template.category}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Slug:</span>
                                    <span className="font-mono text-xs">{template.slug}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Sort Order:</span>
                                    <span>{template.sort_order}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Created:</span>
                                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Last updated:</span>
                                    <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Template Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Content Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Words:</span>
                                    <span>{wordCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Characters:</span>
                                    <span>{template.content.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>HTML Size:</span>
                                    <span>{(template.content.length / 1024).toFixed(1)} KB</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Metadata */}
                        {template.metadata && Object.keys(template.metadata).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Metadata</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto">
                                        {JSON.stringify(template.metadata, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
