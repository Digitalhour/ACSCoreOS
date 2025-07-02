// resources/js/pages/Admin/Reports/Progress.tsx
import React, {useMemo, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowDown, ArrowUp, ArrowUpDown, Award, BookOpen, Clock, Download, TrendingUp, Users} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Progress} from '@/components/ui/progress';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Module {
    id: number;
    title: string;
}

interface StudentProgress {
    user: User;
    module: Module;
    enrolled_at: string;
    completed_at: string | null;
    progress_percentage: number;
    lessons_completed: number;
    total_lessons: number;
    quiz_attempts: number;
    test_score: number | null;
    time_spent: number; // in minutes
}

interface Props {
    students: StudentProgress[];
    modules: Module[];
    users: User[];
    filters: {
        module_id?: number;
        status?: string;
        user_id?: number;
        date_range?: string;
    };
}

export default function ProgressReport({ students = [], modules = [], users = [], filters = {} }: Props) {
    const [selectedModule, setSelectedModule] = useState(filters.module_id?.toString() || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedUser, setSelectedUser] = useState(filters.user_id?.toString() || 'all');

    // Sorting state
    const [sortField, setSortField] = useState<'name' | 'module' | 'progress_percentage' | 'lessons_completed' | 'test_score' | 'time_spent' | 'enrolled_at'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Reports', href: '/admin/reports' },
        { title: 'Progress Report', href: '/admin/reports/progress' },
    ];

    const handleFilterChange = () => {
        const params = new URLSearchParams();
        if (selectedModule && selectedModule !== 'all') params.set('module_id', selectedModule);
        if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
        if (selectedUser && selectedUser !== 'all') params.set('user_id', selectedUser);

        router.get(route('admin.reports.progress'), Object.fromEntries(params));
    };

    // Sorting functions
    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: typeof sortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-4 h-4" />;
        }
        return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
    };

    // Sorted students data
    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'name':
                    aValue = a.user.name.toLowerCase();
                    bValue = b.user.name.toLowerCase();
                    break;
                case 'module':
                    aValue = a.module.title.toLowerCase();
                    bValue = b.module.title.toLowerCase();
                    break;
                case 'progress_percentage':
                    aValue = a.progress_percentage;
                    bValue = b.progress_percentage;
                    break;
                case 'lessons_completed':
                    aValue = a.lessons_completed;
                    bValue = b.lessons_completed;
                    break;
                case 'test_score':
                    aValue = a.test_score || 0;
                    bValue = b.test_score || 0;
                    break;
                case 'time_spent':
                    aValue = a.time_spent;
                    bValue = b.time_spent;
                    break;
                case 'enrolled_at':
                    aValue = new Date(a.enrolled_at).getTime();
                    bValue = new Date(b.enrolled_at).getTime();
                    break;
                default:
                    aValue = a.user.name.toLowerCase();
                    bValue = b.user.name.toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }, [students, sortField, sortDirection]);

    const getStatusBadge = (student: StudentProgress) => {
        if (student.completed_at) {
            return <Badge variant="default">Completed</Badge>;
        } else if (student.progress_percentage > 0) {
            return <Badge variant="secondary">In Progress</Badge>;
        } else {
            return <Badge variant="outline">Not Started</Badge>;
        }
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const completedStudents = sortedStudents.filter(s => s.completed_at).length;
    const averageProgress = sortedStudents.length > 0 ? Math.round(sortedStudents.reduce((sum, s) => sum + s.progress_percentage, 0) / sortedStudents.length) : 0;
    const totalTimeSpent = sortedStudents.reduce((sum, s) => sum + s.time_spent, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Progress Reports" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Progress Reports</h1>
                        <p className="text-muted-foreground mt-2">Track student progress across training modules</p>
                    </div>
                    <Button className="gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Filters</CardTitle>
                        <CardDescription>Filter progress data by employee, module, and status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1">
                                <Select value={selectedModule} onValueChange={setSelectedModule}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Modules</SelectItem>
                                        {modules.map(module => (
                                            <SelectItem key={module.id} value={module.id.toString()}>{module.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1">
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="not_started">Not Started</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleFilterChange}>
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                    <p className="text-2xl font-bold">{sortedStudents.length}</p>
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
                                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold">{completedStudents}</p>
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
                                    <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                                    <p className="text-2xl font-bold">{averageProgress}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Clock className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Time</p>
                                    <p className="text-2xl font-bold">{formatTime(totalTimeSpent)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Student Progress Overview</CardTitle>
                        <CardDescription>Detailed progress tracking for all enrolled students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sortedStudents.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Student
                                                {getSortIcon('name')}
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('module')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Module
                                                {getSortIcon('module')}
                                            </div>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('progress_percentage')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Progress
                                                {getSortIcon('progress_percentage')}
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('lessons_completed')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Lessons
                                                {getSortIcon('lessons_completed')}
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('test_score')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Test Score
                                                {getSortIcon('test_score')}
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('time_spent')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Time Spent
                                                {getSortIcon('time_spent')}
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('enrolled_at')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Enrolled
                                                {getSortIcon('enrolled_at')}
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedStudents.map((student, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{student.user.name}</div>
                                                    <div className="text-sm text-muted-foreground">{student.user.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{student.module.title}</div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(student)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Progress value={student.progress_percentage} className="w-16" />
                                                    <span className="text-sm font-medium">{student.progress_percentage}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{student.lessons_completed}/{student.total_lessons}</span>
                                            </TableCell>
                                            <TableCell>
                                                {student.test_score ? (
                                                    <Badge variant={student.test_score >= 70 ? "default" : "secondary"}>
                                                        {student.test_score}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{formatTime(student.time_spent)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(student.enrolled_at).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12">
                                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No progress data</h3>
                                <p className="text-muted-foreground">No student progress found for the selected filters.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
