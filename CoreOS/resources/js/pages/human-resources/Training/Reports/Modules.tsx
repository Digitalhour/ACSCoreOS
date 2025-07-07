// resources/js/pages/Admin/Reports/Modules.tsx
import React from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Award, BadgeCheck, BookOpen, CircleAlert, Download, Edit, Eye, Trash2, TrendingUp, Users} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

import {Badge} from "@/components/ui/badge";

interface Module {
    id: number;
    title: string;
    description: string;
    is_active: boolean;
    enrollments_count: number;
    lessons_count: number;
    completed_enrollments_count: number;
    completion_rate: number;
    thumbnail_url: string | null;
    has_test: boolean;
}
interface StatusBadgeProps {
    isActive: boolean;
    className?: string;
}
interface Props {
    modules: Module[];
}
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
function ModuleCard({ module, onDelete }: { module: Module; onDelete: () => void }) {
    return (
        <div
            className="overflow-hidden transition-all duration-300 hover:shadow-lg rounded-xl drop-shadow-lg bg-background drop-shadow-gray-300">
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
                        <StatusBadge isActive={module.is_active}/>
                    </div>

                    <p className="text-muted-foreground">{module.description}</p>

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <BookOpen className="w-4 h-4 mr-1"/>
                            {module.lessons_count} lessons
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 mr-1"/>
                            {module.enrollments_count} enrolled
                        </div>

                        {module.has_test && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Award className="w-4 h-4 mr-1"/>
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
                            <Eye className="w-4 h-4 mr-1"/>
                            Settings
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={route('admin.modules.edit', module.id)}
                            title="Edit Module"
                        >
                            <Edit className="w-4 h-4 mr-1"/>
                            Edit
                        </Link>
                    </Button>

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onDelete}
                        title="Delete Module"
                    >
                        <Trash2 className="w-4 h-4 mr-1"/>
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
export default function ModulesReport({ modules = [] }: Props) {
    const handleDelete = (module: Module) => {
        if (confirm(`Are you sure you want to delete "${module.title}"? This action cannot be undone.`)) {
            router.delete(route('admin.modules.destroy', module.id));
        }
    };
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        {
            title: 'Training Dashboard',
            href: route('admin.reports.index'),
        },
        { title: 'Modules Report', href: route('admin.reports.index') },
    ];

    const totalModules = modules.length;
    const totalEnrollments = modules.reduce((sum, m) => sum + m.enrollments_count, 0);
    const averageCompletion = modules.length > 0
        ? Math.round(modules.reduce((sum, m) => sum + m.completion_rate, 0) / modules.length)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modules Report" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Modules Report</h1>
                        <p className="text-muted-foreground mt-2">Training module performance and enrollment statistics</p>
                    </div>
                    <Button asChild className="gap-2">
                        <Link href={route('admin.modules.create')}>
                        <Download className="w-4 h-4" />
                        Create Module
                        </Link>
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Modules</p>
                                    <p className="text-2xl font-bold">{totalModules}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                                    <p className="text-2xl font-bold">{totalEnrollments}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Award className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                                    <p className="text-2xl font-bold">{averageCompletion}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Modules</p>
                                    <p className="text-2xl font-bold">
                                        {modules.filter(m => m.is_active).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Modules Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Module Performance Overview</CardTitle>
                        <CardDescription>Detailed statistics for all training modules</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/*{modules.length > 0 ? (*/}
                        {/*    <Table>*/}
                        {/*        <TableHeader>*/}
                        {/*            <TableRow>*/}
                        {/*                <TableHead>Module</TableHead>*/}
                        {/*                <TableHead>Status</TableHead>*/}
                        {/*                <TableHead>Lessons</TableHead>*/}
                        {/*                <TableHead>Enrollments</TableHead>*/}
                        {/*                <TableHead>Completed</TableHead>*/}
                        {/*                <TableHead>Completion Rate</TableHead>*/}
                        {/*                <TableHead>Actions</TableHead>*/}
                        {/*            </TableRow>*/}
                        {/*        </TableHeader>*/}
                        {/*        <TableBody>*/}
                        {/*            {modules.map((module) => (*/}
                        {/*                <TableRow key={module.id}>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <div>*/}
                        {/*                            <div className="font-medium">{module.title}</div>*/}
                        {/*                            {module.description && (*/}
                        {/*                                <div className="text-sm text-muted-foreground truncate max-w-xs">*/}
                        {/*                                    {module.description}*/}
                        {/*                                </div>*/}
                        {/*                            )}*/}
                        {/*                        </div>*/}
                        {/*                    </TableCell>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <Badge variant={module.is_active ? "default" : "secondary"}>*/}
                        {/*                            {module.is_active ? 'Active' : 'Inactive'}*/}
                        {/*                        </Badge>*/}
                        {/*                    </TableCell>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <span className="text-sm">{module.lessons_count}</span>*/}
                        {/*                    </TableCell>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <Badge variant="outline">{module.enrollments_count}</Badge>*/}
                        {/*                    </TableCell>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <Badge variant="secondary">{module.completed_enrollments_count}</Badge>*/}
                        {/*                    </TableCell>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <div className="flex items-center gap-3">*/}
                        {/*                            <Progress value={module.completion_rate} className="w-16" />*/}
                        {/*                            <span className="text-sm font-medium">{module.completion_rate}%</span>*/}
                        {/*                        </div>*/}
                        {/*                    </TableCell>*/}
                        {/*                    <TableCell>*/}
                        {/*                        <DropdownMenu>*/}
                        {/*                            <DropdownMenuTrigger>*/}
                        {/*                                <EllipsisVertical />*/}
                        {/*                            </DropdownMenuTrigger>*/}
                        {/*                            <DropdownMenuContent>*/}
                        {/*                                <DropdownMenuLabel>My Account</DropdownMenuLabel>*/}
                        {/*                                <DropdownMenuSeparator />*/}
                        {/*                                <DropdownMenuItem>*/}
                        {/*                                    <Button variant="ghost" size="sm" asChild>*/}
                        {/*                                        <Link href={route('admin.modules.show', module.id)}>*/}
                        {/*                                            <Eye className="w-4 h-4" />*/}
                        {/*                                            View Module*/}

                        {/*                                        </Link>*/}
                        {/*                                    </Button>*/}
                        {/*                                </DropdownMenuItem>*/}
                        {/*                                <DropdownMenuItem>*/}
                        {/*                                    <Button variant="ghost" size="sm" asChild>*/}
                        {/*                                        <Link href={route('admin.modules.edit', module.id)}>*/}
                        {/*                                            <SquarePen className="w-4 h-4" />*/}
                        {/*                                            Edit Module*/}
                        {/*                                        </Link>*/}
                        {/*                                    </Button>*/}
                        {/*                                </DropdownMenuItem>*/}

                        {/*                            </DropdownMenuContent>*/}
                        {/*                        </DropdownMenu>*/}


                        {/*                    </TableCell>*/}
                        {/*                </TableRow>*/}
                        {/*            ))}*/}
                        {/*        </TableBody>*/}
                        {/*    </Table>*/}
                        {/*) : (*/}
                        {/*    <div className="text-center py-12">*/}
                        {/*        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />*/}
                        {/*        <h3 className="text-lg font-medium mb-2">No modules found</h3>*/}
                        {/*        <p className="text-muted-foreground">No training modules to display.</p>*/}
                        {/*    </div>*/}
                        {/*)}*/}
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
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}
