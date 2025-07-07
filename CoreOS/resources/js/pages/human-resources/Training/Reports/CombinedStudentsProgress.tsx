import React, {useMemo, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {
    Activity,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Award,
    BarChart3,
    BookOpen,
    Building,
    Calendar,
    CheckCircle,
    ChevronRight,
    Clock,
    Download,
    FileText,
    Filter,
    GraduationCap,
    Mail,
    MapPin,
    Pause,
    Percent,
    Phone,
    PlayCircle,
    Search,
    Target,
    TrendingUp,
    User,
    Users,
    XCircle
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Progress} from '@/components/ui/progress';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {ScrollArea} from '@/components/ui/scroll-area';
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from '@/components/ui/chart';
import {Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis} from 'recharts';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    department?: string;
    position?: string;
    phone?: string;
    location?: string;
    hire_date?: string;
    manager?: string;
}

interface Module {
    id: number;
    title: string;
    description?: string;
    thumbnail?: string;
}

interface Student {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    department?: string;
    position?: string;
    phone?: string;
    location?: string;
    hire_date?: string;
    manager?: string;
    enrollments_count: number;
    completed_enrollments_count: number;
    completion_rate: number;
    total_time_spent?: number;
    avg_quiz_score?: number;
    avg_test_score?: number;
    last_activity?: string;
    first_enrollment?: string;
    active_enrollments?: number;
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
    time_spent: number;
}

interface ModuleProgress {
    id: number;
    title: string;
    description: string;
    thumbnail?: string;
    progress_percentage: number;
    lessons_completed: number;
    total_lessons: number;
    time_spent: number;
    enrolled_at: string;
    completed_at: string | null;
}

interface QuizAttempt {
    id: number;
    quiz_title: string;
    lesson_title: string;
    score: number;
    attempt_number: number;
    completed_at: string;
    passed: boolean;
}

interface TestAttempt {
    id: number;
    test_title: string;
    module_title: string;
    score: number;
    attempt_number: number;
    completed_at: string;
    passed: boolean;
}

interface StudentDetails {
    student: Student;
    module_progress: ModuleProgress[];
    quiz_attempts: QuizAttempt[];
    test_attempts: TestAttempt[];
    total_time_spent: number;
    first_enrollment: string;
    last_activity: string;
    learning_streak: number;
    performance_trend: Array<{month: string, completion_rate: number}>;
    quiz_performance: Array<{module: string, average_score: number}>;
}

interface Props {
    students: Student[];
    all_students: number;
    student_progress: StudentProgress[];
    modules: Module[];
    users: User[];
    filters: {
        module_id?: number;
        status?: string;
        user_id?: number;
        date_range?: string;
    };
    chart_data?: {
        completion_trends: Array<{month: string, completed: number, enrolled: number}>;
        module_performance: Array<{module: string, completion_rate: number, students: number}>;
        student_activity: Array<{name: string, time_spent: number, modules_completed: number}>;
    };
}

const chartConfig = {
    completed: {
        label: "Completed",
        color: "hsl(var(--chart-1))",
    },
    enrolled: {
        label: "Enrolled",
        color: "hsl(var(--chart-2))",
    },
    completion_rate: {
        label: "Completion Rate",
        color: "hsl(var(--chart-3))",
    },
    time_spent: {
        label: "Time Spent (Hours)",
        color: "hsl(var(--chart-4))",
    },
} satisfies ChartConfig;

export default function CombinedStudentProgressReport({
                                                          students = [],
                                                          all_students,
                                                          student_progress = [],
                                                          modules = [],
                                                          users = [],
                                                          filters = {},
                                                          chart_data
                                                      }: Props) {
    // State for student details
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
    const [expandedQuizModules, setExpandedQuizModules] = useState<Set<string>>(new Set());
    const [expandedTestModules, setExpandedTestModules] = useState<Set<string>>(new Set());

    // State for filtering and sorting
    const [activeView, setActiveView] = useState<'overview' | 'progress' | 'analytics'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState(filters.module_id?.toString() || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedUser, setSelectedUser] = useState(filters.user_id?.toString() || 'all');
    const [completionFilter, setCompletionFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | '1-3' | '4-6' | '7+'>('all');

    // State for sorting
    const [sortField, setSortField] = useState<'name' | 'enrollments_count' | 'completed_enrollments_count' | 'completion_rate' | 'module' | 'progress_percentage' | 'lessons_completed' | 'test_score' | 'time_spent' | 'enrolled_at'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reports', href: route('admin.reports.index') },
        { title: 'Student Progress Report', href: route('admin.reports.combined-students-progress') },
    ];

    // Calculate overview stats
    const totalStudents = students.length;
    const averageCompletion = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.completion_rate, 0) / students.length)
        : 0;
    const totalEnrollments = students.reduce((sum, s) => sum + s.enrollments_count, 0);
    const totalCompletions = students.reduce((sum, s) => sum + s.completed_enrollments_count, 0);
    const activeStudents = students.filter(s => s.completion_rate > 0).length;
    const topPerformers = students.filter(s => s.completion_rate >= 80).length;
    const totalTimeSpentAllStudents = students.reduce((sum, s) => sum + (s.total_time_spent || 0), 0);

    // Calculate progress stats
    const completedStudents = student_progress.filter(s => s.completed_at).length;
    const averageProgress = student_progress.length > 0
        ? Math.round(student_progress.reduce((sum, s) => sum + s.progress_percentage, 0) / student_progress.length)
        : 0;
    const totalTimeSpent = student_progress.reduce((sum, s) => sum + s.time_spent, 0);

    // Filter progress data based on selected filters
    const filteredProgress = useMemo(() => {
        let filtered = student_progress;

        if (selectedModule !== 'all') {
            filtered = filtered.filter(p => p.module.id.toString() === selectedModule);
        }

        if (selectedUser !== 'all') {
            filtered = filtered.filter(p => p.user.id.toString() === selectedUser);
        }

        if (selectedStatus !== 'all') {
            filtered = filtered.filter(p => {
                switch (selectedStatus) {
                    case 'completed':
                        return p.completed_at !== null;
                    case 'in_progress':
                        return p.completed_at === null && p.progress_percentage > 0;
                    case 'not_started':
                        return p.progress_percentage === 0;
                    default:
                        return true;
                }
            });
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.module.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [student_progress, selectedModule, selectedUser, selectedStatus, searchTerm]);

    // Filter and sort students for overview
    const filteredAndSortedStudents = useMemo(() => {
        let filtered = students.filter(student => {
            const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.email.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesCompletion = true;
            if (completionFilter === 'high') {
                matchesCompletion = student.completion_rate >= 80;
            } else if (completionFilter === 'medium') {
                matchesCompletion = student.completion_rate >= 50 && student.completion_rate < 80;
            } else if (completionFilter === 'low') {
                matchesCompletion = student.completion_rate < 50;
            }

            let matchesEnrollment = true;
            if (enrollmentFilter === '1-3') {
                matchesEnrollment = student.enrollments_count >= 1 && student.enrollments_count <= 3;
            } else if (enrollmentFilter === '4-6') {
                matchesEnrollment = student.enrollments_count >= 4 && student.enrollments_count <= 6;
            } else if (enrollmentFilter === '7+') {
                matchesEnrollment = student.enrollments_count >= 7;
            }

            return matchesSearch && matchesCompletion && matchesEnrollment;
        });

        filtered.sort((a, b) => {
            let aValue = a[sortField as keyof Student];
            let bValue = b[sortField as keyof Student];

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue as string).toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return filtered;
    }, [students, searchTerm, sortField, sortDirection, completionFilter, enrollmentFilter]);

    // Sort progress data
    const sortedProgress = useMemo(() => {
        return [...filteredProgress].sort((a, b) => {
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
    }, [filteredProgress, sortField, sortDirection]);

    // Chart data preparations
    const completionDistributionData = [
        { name: 'High (80%+)', value: students.filter(s => s.completion_rate >= 80).length },
        { name: 'Medium (50-79%)', value: students.filter(s => s.completion_rate >= 50 && s.completion_rate < 80).length },
        { name: 'Low (<50%)', value: students.filter(s => s.completion_rate < 50).length },
        { name: 'Not Started', value: students.filter(s => s.completion_rate === 0).length },
    ];

    const topPerformersData = students
        .sort((a, b) => b.completion_rate - a.completion_rate)
        .slice(0, 10)
        .map(student => ({
            name: student.name.split(' ')[0],
            completion_rate: student.completion_rate,
            total_time: student.total_time_spent || 0
        }));

    // Handler functions
    const handleFilterChange = () => {
        const params = new URLSearchParams();
        if (selectedModule && selectedModule !== 'all') params.set('module_id', selectedModule);
        if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
        if (selectedUser && selectedUser !== 'all') params.set('user_id', selectedUser);

        router.get(route('admin.reports.combined-students-progress'), Object.fromEntries(params));
    };

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

    const handleStudentClick = async (student: Student) => {
        setSelectedStudent(student);
        try {
            const response = await fetch(route('admin.reports.student.details', student.id));
            const details = await response.json();
            setStudentDetails(details);
            setIsSheetOpen(true);
        } catch (error) {
            console.error('Failed to fetch student details:', error);
        }
    };

    const toggleQuizModule = (moduleKey: string) => {
        const newExpanded = new Set(expandedQuizModules);
        if (newExpanded.has(moduleKey)) {
            newExpanded.delete(moduleKey);
        } else {
            newExpanded.add(moduleKey);
        }
        setExpandedQuizModules(newExpanded);
    };

    const toggleTestModule = (moduleKey: string) => {
        const newExpanded = new Set(expandedTestModules);
        if (newExpanded.has(moduleKey)) {
            newExpanded.delete(moduleKey);
        } else {
            newExpanded.add(moduleKey);
        }
        setExpandedTestModules(newExpanded);
    };

    const getStatusBadge = (progress: StudentProgress) => {
        if (progress.completed_at) {
            return <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
            </Badge>;
        } else if (progress.progress_percentage > 0) {
            return <Badge variant="secondary">
                <PlayCircle className="w-3 h-3 mr-1" />
                In Progress
            </Badge>;
        } else {
            return <Badge variant="outline">
                <Pause className="w-3 h-3 mr-1" />
                Not Started
            </Badge>;
        }
    };

    const formatTime = (minutes: number) => {
        if (minutes === 0) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Student Progress Report" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Student Progress Report</h1>
                        <p className="text-muted-foreground mt-2">
                            Comprehensive view of employee training performance and progress tracking
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('type', activeView);
                                if (selectedModule && selectedModule !== 'all') params.set('module_id', selectedModule);
                                if (selectedStatus && selectedStatus !== 'all') params.set('status', selectedStatus);
                                if (selectedUser && selectedUser !== 'all') params.set('user_id', selectedUser);
                                window.open(route('admin.reports.export.combined') + '?' + params.toString(), '_blank');
                            }}
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </Button>
                        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'overview' | 'progress' | 'analytics')}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview" className="gap-2">
                                    <Users className="w-4 h-4" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="progress" className="gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Progress
                                </TabsTrigger>
                                <TabsTrigger value="analytics" className="gap-2">
                                    <PieChart className="w-4 h-4" />
                                    Analytics
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* Enhanced Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-muted">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                    <p className="text-xl font-bold">{totalStudents}</p>
                                    <p className="text-xs text-muted-foreground">of {all_students} employees</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-muted">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                                    <p className="text-xl font-bold">{averageCompletion}%</p>
                                    <p className="text-xs text-muted-foreground">overall rate</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-muted">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                                    <p className="text-xl font-bold">{totalEnrollments}</p>
                                    <p className="text-xs text-muted-foreground">enrolled modules</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-muted">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                    <p className="text-xl font-bold">{totalCompletions}</p>
                                    <p className="text-xs text-muted-foreground">modules finished</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-muted">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                                    <p className="text-xl font-bold">{activeStudents}</p>
                                    <p className="text-xs text-muted-foreground">with progress</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-muted">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Time</p>
                                    <p className="text-xl font-bold">{formatTime(totalTimeSpentAllStudents)}</p>
                                    <p className="text-xs text-muted-foreground">learning time</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Dynamic Content Based on Active View */}
                {activeView === 'overview' && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Student Performance Overview
                                    </CardTitle>
                                    <CardDescription>
                                        Click on any student to view detailed training analytics and progress
                                    </CardDescription>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Showing {filteredAndSortedStudents.length} of {students.length} students
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search students by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Select value={completionFilter} onValueChange={(value: any) => setCompletionFilter(value)}>
                                        <SelectTrigger className="w-40">
                                            <Filter className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="Completion Rate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Completion</SelectItem>
                                            <SelectItem value="high">High (80%+)</SelectItem>
                                            <SelectItem value="medium">Medium (50-79%)</SelectItem>
                                            <SelectItem value="low">Low (&lt;50%)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={enrollmentFilter} onValueChange={(value: any) => setEnrollmentFilter(value)}>
                                        <SelectTrigger className="w-40">
                                            <Filter className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="Enrollments" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Enrollments</SelectItem>
                                            <SelectItem value="1-3">1-3 Modules</SelectItem>
                                            <SelectItem value="4-6">4-6 Modules</SelectItem>
                                            <SelectItem value="7+">7+ Modules</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
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
                                            <TableHead>Department</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('enrollments_count')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Enrollments
                                                    {getSortIcon('enrollments_count')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('completed_enrollments_count')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Completed
                                                    {getSortIcon('completed_enrollments_count')}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('completion_rate')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Completion Rate
                                                    {getSortIcon('completion_rate')}
                                                </div>
                                            </TableHead>
                                            <TableHead>Total Time</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedStudents.map((student) => (
                                            <TableRow
                                                key={student.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => handleStudentClick(student)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={student.avatar} />
                                                            <AvatarFallback>
                                                                {getInitials(student.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{student.name}</p>
                                                            <p className="text-sm text-muted-foreground">{student.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{student.department || 'N/A'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{student.position || 'N/A'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {student.enrollments_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {student.completed_enrollments_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Progress value={student.completion_rate} className="w-16" />
                                                        <span className="text-sm font-medium">{student.completion_rate}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-sm">{formatTime(student.total_time_spent || 0)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            {filteredAndSortedStudents.length === 0 && (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No students found</h3>
                                    <p className="text-muted-foreground">
                                        {searchTerm || completionFilter !== 'all' || enrollmentFilter !== 'all'
                                            ? 'Try adjusting your search or filter criteria.'
                                            : 'No enrolled students to display.'
                                        }
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeView === 'progress' && (
                    <>
                        {/* Progress Filters */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Filter className="w-5 h-5" />
                                    Progress Filters
                                </CardTitle>
                                <CardDescription>
                                    Filter detailed progress data by employee, module, and completion status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Employees</SelectItem>
                                            {users.map(user => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Module" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Modules</SelectItem>
                                            {modules.map(module => (
                                                <SelectItem key={module.id} value={module.id.toString()}>
                                                    {module.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

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

                                    <Button onClick={handleFilterChange} className="w-full">
                                        Apply Filters
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Progress Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-lg bg-muted">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                            <p className="text-2xl font-bold">{completedStudents}</p>
                                            <p className="text-xs text-muted-foreground">modules finished</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-lg bg-muted">
                                            <BarChart3 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                                            <p className="text-2xl font-bold">{averageProgress}%</p>
                                            <p className="text-xs text-muted-foreground">across all modules</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-lg bg-muted">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Time</p>
                                            <p className="text-2xl font-bold">{formatTime(totalTimeSpent)}</p>
                                            <p className="text-xs text-muted-foreground">learning time</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Progress Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Detailed Progress Tracking
                                </CardTitle>
                                <CardDescription>
                                    Individual student progress across all training modules
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
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
                                            {sortedProgress.map((progress, index) => (
                                                <TableRow
                                                    key={`${progress.user.id}-${progress.module.id}-${index}`}
                                                    className="hover:bg-muted/50 transition-colors"
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarFallback className="text-xs">
                                                                    {getInitials(progress.user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium">{progress.user.name}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {progress.user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{progress.module.title}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(progress)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Progress value={progress.progress_percentage} className="w-16" />
                                                            <span className="text-sm font-medium">
                                                                {progress.progress_percentage}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-sm">
                                                                {progress.lessons_completed}/{progress.total_lessons}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {progress.test_score ? (
                                                            <Badge variant={progress.test_score >= 70 ? "default" : "secondary"}>
                                                                {progress.test_score}%
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-sm">{formatTime(progress.time_spent)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-sm text-muted-foreground">
                                                                {new Date(progress.enrolled_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>

                                {sortedProgress.length === 0 && (
                                    <div className="text-center py-12">
                                        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No progress data</h3>
                                        <p className="text-muted-foreground">
                                            No student progress found for the selected filters.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeView === 'analytics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Completion Distribution Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="w-5 h-5" />
                                    Completion Distribution
                                </CardTitle>
                                <CardDescription>
                                    Distribution of students by completion rate
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={chartConfig}
                                    className="mx-auto aspect-square max-h-[250px]"
                                >
                                    <PieChart>
                                        <Pie
                                            data={completionDistributionData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {completionDistributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent />}
                                        />
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Top Performers Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Top Performers
                                </CardTitle>
                                <CardDescription>
                                    Top 10 students by completion rate
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig}>
                                    <BarChart
                                        accessibilityLayer
                                        data={topPerformersData}
                                        margin={{
                                            top: 20,
                                        }}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}%`}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent />}
                                        />
                                        <Bar dataKey="completion_rate" fill="hsl(var(--chart-1))" radius={8} />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Time Investment Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Time Investment
                                </CardTitle>
                                <CardDescription>
                                    Learning time vs completion rate
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig}>
                                    <BarChart
                                        accessibilityLayer
                                        data={topPerformersData}
                                        margin={{
                                            top: 20,
                                        }}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${Math.round(value/60)}h`}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent />}
                                        />
                                        <Bar dataKey="total_time" fill="hsl(var(--chart-2))" radius={8} />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Module Completion Trends */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Training Progress
                                </CardTitle>
                                <CardDescription>
                                    Overall training completion trends
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Active Learners</span>
                                            <span className="text-sm text-muted-foreground">{activeStudents}</span>
                                        </div>
                                        <Progress value={(activeStudents / totalStudents) * 100} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">High Performers</span>
                                            <span className="text-sm text-muted-foreground">{topPerformers}</span>
                                        </div>
                                        <Progress value={(topPerformers / totalStudents) * 100} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Module Completions</span>
                                            <span className="text-sm text-muted-foreground">{totalCompletions}</span>
                                        </div>
                                        <Progress value={(totalCompletions / totalEnrollments) * 100} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Overall Progress</span>
                                            <span className="text-sm text-muted-foreground">{averageCompletion}%</span>
                                        </div>
                                        <Progress value={averageCompletion} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Enhanced Student Details Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="min-w-[90vw] p-0 overflow-hidden">
                    {selectedStudent && studentDetails && (
                        <>
                            <SheetHeader className="p-6 border-b">
                                <SheetTitle className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={selectedStudent.avatar} />
                                        <AvatarFallback>
                                            {getInitials(selectedStudent.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-xl font-semibold">{selectedStudent.name}</h2>
                                        <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                                    </div>
                                </SheetTitle>
                                <SheetDescription>
                                    Comprehensive training analytics and detailed performance metrics
                                </SheetDescription>
                            </SheetHeader>

                            <ScrollArea className="h-[calc(100vh-120px)]">
                                <div className="p-6 space-y-6">
                                    {/* Enhanced Quick Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                                                        <p className="text-2xl font-bold">{selectedStudent.enrollments_count}</p>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-muted">
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                                        <p className="text-2xl font-bold">{selectedStudent.completed_enrollments_count}</p>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-muted">
                                                        <CheckCircle className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                                                        <p className="text-2xl font-bold">{selectedStudent.completion_rate}%</p>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-muted">
                                                        <Percent className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground">Total Time</p>
                                                        <p className="text-2xl font-bold">{formatTime(studentDetails.total_time_spent)}</p>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-muted">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Enhanced Student Information Card */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="w-5 h-5" />
                                                Student Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Email</p>
                                                            <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Building className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Department</p>
                                                            <p className="text-sm text-muted-foreground">{selectedStudent.department || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Position</p>
                                                            <p className="text-sm text-muted-foreground">{selectedStudent.position || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Phone</p>
                                                            <p className="text-sm text-muted-foreground">{selectedStudent.phone || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Location</p>
                                                            <p className="text-sm text-muted-foreground">{selectedStudent.location || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">First Enrollment</p>
                                                            <p className="text-sm text-muted-foreground">{new Date(studentDetails.first_enrollment).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Activity className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Last Activity</p>
                                                            <p className="text-sm text-muted-foreground">{new Date(studentDetails.last_activity).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Manager</p>
                                                            <p className="text-sm text-muted-foreground">{selectedStudent.manager || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Detailed Tabs */}
                                    <Tabs defaultValue="modules" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="modules" className="gap-2">
                                                <BookOpen className="w-4 h-4" />
                                                Modules
                                            </TabsTrigger>
                                            <TabsTrigger value="quizzes" className="gap-2">
                                                <FileText className="w-4 h-4" />
                                                Quizzes
                                            </TabsTrigger>
                                            <TabsTrigger value="tests" className="gap-2">
                                                <GraduationCap className="w-4 h-4" />
                                                Tests
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="modules" className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                                {studentDetails.module_progress.map((module) => (
                                                    <Card key={module.id} className="hover:shadow-md transition-shadow">
                                                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                                            {module.thumbnail ? (
                                                                <img
                                                                    src={module.thumbnail}
                                                                    alt={module.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                                                                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <div className="absolute top-2 right-2">
                                                                {module.completed_at ? (
                                                                    <Badge>
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                        Completed
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary">
                                                                        <PlayCircle className="w-3 h-3 mr-1" />
                                                                        In Progress
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <CardContent className="p-4">
                                                            <h3 className="font-semibold text-sm mb-2 line-clamp-2">{module.title}</h3>
                                                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{module.description}</p>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatTime(module.time_spent)}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        {module.lessons_completed}/{module.total_lessons}
                                                                    </span>
                                                                    <span className="font-medium">{module.progress_percentage}%</span>
                                                                </div>
                                                                <Progress value={module.progress_percentage} className="h-1" />

                                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                                    <span>Enrolled: {new Date(module.enrolled_at).toLocaleDateString()}</span>
                                                                    {module.completed_at && (
                                                                        <span>Completed: {new Date(module.completed_at).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="quizzes" className="space-y-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="w-5 h-5" />
                                                        Quiz Performance by Module
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {(() => {
                                                        const quizzesByModule = studentDetails.quiz_attempts.reduce((acc, quiz) => {
                                                            const moduleKey = quiz.lesson_title;
                                                            if (!acc[moduleKey]) {
                                                                acc[moduleKey] = [];
                                                            }
                                                            acc[moduleKey].push(quiz);
                                                            return acc;
                                                        }, {} as Record<string, QuizAttempt[]>);

                                                        return (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="w-12"></TableHead>
                                                                        <TableHead>Lesson/Module</TableHead>
                                                                        <TableHead>Attempts</TableHead>
                                                                        <TableHead>Best Score</TableHead>
                                                                        <TableHead>Latest Score</TableHead>
                                                                        <TableHead>Status</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {Object.entries(quizzesByModule).map(([moduleKey, quizzes]) => {
                                                                        const isExpanded = expandedQuizModules.has(moduleKey);
                                                                        const bestScore = Math.max(...quizzes.map(q => q.score));
                                                                        const latestScore = quizzes.sort((a, b) =>
                                                                            new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
                                                                        )[0]?.score;
                                                                        const hasPassed = quizzes.some(q => q.passed);

                                                                        return (
                                                                            <React.Fragment key={moduleKey}>
                                                                                <TableRow
                                                                                    className="cursor-pointer hover:bg-muted/50"
                                                                                    onClick={() => toggleQuizModule(moduleKey)}
                                                                                >
                                                                                    <TableCell>
                                                                                        <Button variant="ghost" size="sm">
                                                                                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                                        </Button>
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium">{moduleKey}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{quizzes.length}</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant={bestScore >= 70 ? "default" : "secondary"}>
                                                                                            {bestScore}%
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{latestScore}%</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant={hasPassed ? "default" : "destructive"}>
                                                                                            {hasPassed ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                                                                            {hasPassed ? "Passed" : "Failed"}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                                {isExpanded && quizzes.map((quiz) => (
                                                                                    <TableRow key={`${moduleKey}-${quiz.id}`} className="bg-muted/30">
                                                                                        <TableCell></TableCell>
                                                                                        <TableCell className="pl-8">
                                                                                            <div>
                                                                                                <p className="font-medium text-sm">{quiz.quiz_title}</p>
                                                                                                <p className="text-xs text-muted-foreground">
                                                                                                    Attempt #{quiz.attempt_number} • {new Date(quiz.completed_at).toLocaleDateString()}
                                                                                                </p>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant="outline" className="text-xs">#{quiz.attempt_number}</Badge>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant={quiz.passed ? "default" : "destructive"} className="text-xs">
                                                                                                {quiz.score}%
                                                                                            </Badge>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {new Date(quiz.completed_at).toLocaleTimeString()}
                                                                                            </span>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant={quiz.passed ? "default" : "destructive"} className="text-xs">
                                                                                                {quiz.passed ? "Pass" : "Fail"}
                                                                                            </Badge>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        );
                                                    })()}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        <TabsContent value="tests" className="space-y-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <GraduationCap className="w-5 h-5" />
                                                        Test Performance by Module
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {(() => {
                                                        const testsByModule = studentDetails.test_attempts.reduce((acc, test) => {
                                                            const moduleKey = test.module_title;
                                                            if (!acc[moduleKey]) {
                                                                acc[moduleKey] = [];
                                                            }
                                                            acc[moduleKey].push(test);
                                                            return acc;
                                                        }, {} as Record<string, TestAttempt[]>);

                                                        return (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="w-12"></TableHead>
                                                                        <TableHead>Module</TableHead>
                                                                        <TableHead>Attempts</TableHead>
                                                                        <TableHead>Best Score</TableHead>
                                                                        <TableHead>Latest Score</TableHead>
                                                                        <TableHead>Status</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {Object.entries(testsByModule).map(([moduleKey, tests]) => {
                                                                        const isExpanded = expandedTestModules.has(moduleKey);
                                                                        const bestScore = Math.max(...tests.map(t => t.score));
                                                                        const latestScore = tests.sort((a, b) =>
                                                                            new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
                                                                        )[0]?.score;
                                                                        const hasPassed = tests.some(t => t.passed);

                                                                        return (
                                                                            <React.Fragment key={moduleKey}>
                                                                                <TableRow
                                                                                    className="cursor-pointer hover:bg-muted/50"
                                                                                    onClick={() => toggleTestModule(moduleKey)}
                                                                                >
                                                                                    <TableCell>
                                                                                        <Button variant="ghost" size="sm">
                                                                                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                                        </Button>
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium">{moduleKey}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{tests.length}</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant={bestScore >= 70 ? "default" : "secondary"}>
                                                                                            {bestScore}%
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{latestScore}%</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant={hasPassed ? "default" : "destructive"}>
                                                                                            {hasPassed ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                                                                            {hasPassed ? "Passed" : "Failed"}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                                {isExpanded && tests.map((test) => (
                                                                                    <TableRow key={`${moduleKey}-${test.id}`} className="bg-muted/30">
                                                                                        <TableCell></TableCell>
                                                                                        <TableCell className="pl-8">
                                                                                            <div>
                                                                                                <p className="font-medium text-sm">{test.test_title}</p>
                                                                                                <p className="text-xs text-muted-foreground">
                                                                                                    Attempt #{test.attempt_number} • {new Date(test.completed_at).toLocaleDateString()}
                                                                                                </p>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant="outline" className="text-xs">#{test.attempt_number}</Badge>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant={test.passed ? "default" : "destructive"} className="text-xs">
                                                                                                {test.score}%
                                                                                            </Badge>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {new Date(test.completed_at).toLocaleTimeString()}
                                                                                            </span>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant={test.passed ? "default" : "destructive"} className="text-xs">
                                                                                                {test.passed ? "Pass" : "Fail"}
                                                                                            </Badge>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        );
                                                    })()}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
