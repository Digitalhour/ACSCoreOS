import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {BookOpen, CheckCircle, PlayCircle} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';

interface Module {
    id: number;
    title: string;
    description: string;
    thumbnail: string | null;
    thumbnail_url: string | null;
    is_enrolled: boolean;
    progress_percentage: number;
    lessons: any[];
    test: any | null;
}

interface Props {
    modules: Module[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Training Modules',
        href: '/training',
    },
];

export default function TrainingIndex({ modules }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Training Modules" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Training Modules</h1>
                    <p className="text-muted-foreground">Enhance your skills with our comprehensive training programs</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}

function ModuleCard({ module }: { module: Module }) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
            {module.thumbnail_url && (
                <div className="h-48 bg-muted overflow-hidden">
                    <img
                        src={module.thumbnail_url}
                        alt={module.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <CardHeader>
                <CardTitle className="text-xl">{module.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                    {module.description}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {module.lessons.length} lessons
                    </div>

                    {module.test && (
                        <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Final Test
                        </Badge>
                    )}
                </div>

                {module.is_enrolled ? (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Progress</span>
                                <span>{module.progress_percentage}%</span>
                            </div>
                            <Progress value={module.progress_percentage} className="h-2" />
                        </div>

                        <Button asChild className="w-full">
                            <Link href={route('training.module', module.id)}>
                                {module.progress_percentage === 100 ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Review Module
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="w-4 h-4 mr-2" />
                                        Continue Learning
                                    </>
                                )}
                            </Link>
                        </Button>
                    </>
                ) : (
                    <Button asChild className="w-full" variant="default">
                        <Link href={route('training.enroll', module.id)}>
                            <BookOpen className="w-4 h-4 mr-2" />
                            Enroll Now
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
