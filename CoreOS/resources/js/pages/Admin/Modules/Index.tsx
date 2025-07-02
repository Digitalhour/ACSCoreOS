import React from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Award, BadgeCheck, BookOpen, CircleAlert, Edit, Eye, Plus, Trash2, Users} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";

interface Module {
    id: number;
    title: string;
    description: string;
    is_active: boolean;
    lessons_count: number;
    enrollments_count: number;
    has_test: boolean;
    thumbnail_url: string | null;
}

interface Props {
    modules: Module[];
}

interface StatusBadgeProps {
    isActive: boolean;
    className?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Training Modules',
        href: '/admin/modules',
    },
];

export function StatusBadge({ isActive, className }: StatusBadgeProps) {
    const status = isActive ? "Active" : "Inactive";

    return (
        <Badge
            variant={isActive ? "outline" : "destructive"}
            className={`ml-3 inline-flex items-center px-2.5 ${className || ""}`}
            aria-label={`Status: ${status}`}
        >
            {isActive ? (
                <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
                <CircleAlert className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            {status}
        </Badge>
    );
}

export default function AdminModulesIndex({ modules }: Props) {
    const handleDelete = (module: Module) => {
        if (confirm(`Are you sure you want to delete "${module.title}"? This action cannot be undone.`)) {
            router.delete(route('admin.modules.destroy', module.id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Training Modules" />

            <div className="flex flex-col p-3">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Training Management</h1>
                        <p className="text-muted-foreground mt-2">Create and manage ACS training modules</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={route('admin.modules.create')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Module
                        </Link>
                    </Button>

                </div>
                <Separator className="my-4" />
                <div>

                        {modules.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No modules yet</h3>
                                <p className="text-muted-foreground mb-4">Get started by creating your first training module.</p>
                                <Button asChild variant="outline">
                                    <Link href={route('admin.modules.create')}>
                                        Create Module
                                    </Link>
                                </Button>

                            </div>

                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {modules.map((module) => (
                                    <ModuleCard
                                        key={module.id}
                                        module={module}
                                        onDelete={() => handleDelete(module)}
                                    />
                                ))}
                            </div>
                        )}

                </div>
            </div>
        </AppLayout>
    );
}

function ModuleCard({ module, onDelete }: { module: Module; onDelete: () => void }) {
    return (
        <div className="overflow-hidden transition-all duration-300 hover:shadow-lg rounded-xl drop-shadow-lg bg-background drop-shadow-gray-300">
            {module.thumbnail_url && (
                <div className="h-48 bg-muted overflow-hidden">
                    <img
                        src={module.thumbnail_url}
                        alt={module.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <div className="p-4 space-y-4">
                <div className="flex-1">
                    <div className="flex items-center mb-2">
                        <h3 className="text-xl font-semibold">{module.title}</h3>
                        <StatusBadge isActive={module.is_active} />
                    </div>

                    <p className="text-muted-foreground">{module.description}</p>

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <BookOpen className="w-4 h-4 mr-1" />
                            {module.lessons_count} lessons
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 mr-1" />
                            {module.enrollments_count} enrolled
                        </div>

                        {module.has_test && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Award className="w-4 h-4 mr-1" />
                                Final test
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-between">
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={route('admin.modules.show', module.id)}
                            title="View Module"
                        >
                            <Eye className="w-4 h-4 mr-1" />
                            Settings
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={route('admin.modules.edit', module.id)}
                            title="Edit Module"
                        >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                        </Link>
                    </Button>

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onDelete}
                        title="Delete Module"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
