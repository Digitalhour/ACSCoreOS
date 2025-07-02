import React, {useMemo, useState} from 'react';
import {Head} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Award,
    BookOpen,
    ChevronRight,
    Clock,
    Download,
    Filter,
    Search,
    Target,
    TrendingUp,
    Trophy,
    User,
    Users
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Progress} from '@/components/ui/progress';
import {Separator} from '@/components/ui/separator';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

interface Student {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    enrollments_count: number;
    completed_enrollments_count: number;
    completion_rate: number;
    total_time_spent?: number; // in minutes
    avg_quiz_score?: number;
    avg_test_score?: number;
    last_activity?: string;
}

interface ModuleProgress {
    thumbnail: never;
    description: string;
    id: number;
    title: string;
    progress_percentage: number;
    lessons_completed: number;
    total_lessons: number;
    time_spent: number;
    enrolled_at: string;
    completed_at: string;
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
}

interface Props {
    students: Student[];
    all_students: number;
    student_details?: StudentDetails;
}

export default function StudentsReport({ students = [], all_students }: Props) {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
    const [expandedQuizModules, setExpandedQuizModules] = useState<Set<string>>(new Set());
    const [expandedTestModules, setExpandedTestModules] = useState<Set<string>>(new Set());

    // Search, Sort, and Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<'name' | 'enrollments_count' | 'completed_enrollments_count' | 'completion_rate'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [completionFilter, setCompletionFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | '1-3' | '4-6' | '7+'>('all');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Reports', href: '/admin/reports' },
        { title: 'Students Report', href: '/admin/reports/students' },
    ];

    const totalStudents = students.length;
    const allStudents = all_students;
    const averageCompletion = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.completion_rate, 0) / students.length)
        : 0;
    const totalEnrollments = students.reduce((sum, s) => sum + s.enrollments_count, 0);
    const totalCompletions = students.reduce((sum, s) => sum + s.completed_enrollments_count, 0);
    const activeStudents = students.filter(s => s.completion_rate > 0).length;
    const topPerformers = students.filter(s => s.completion_rate >= 80).length;

    // Filtered and sorted students
    const filteredAndSortedStudents = useMemo(() => {
        let filtered = students.filter(student => {
            // Search filter
            const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.email.toLowerCase().includes(searchTerm.toLowerCase());

            // Completion rate filter
            let matchesCompletion = true;
            if (completionFilter === 'high') {
                matchesCompletion = student.completion_rate >= 80;
            } else if (completionFilter === 'medium') {
                matchesCompletion = student.completion_rate >= 50 && student.completion_rate < 80;
            } else if (completionFilter === 'low') {
                matchesCompletion = student.completion_rate < 50;
            }

            // Enrollment filter
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

        // Sort
        filtered.sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

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

    const completedAtModule = (module: ModuleProgress) => {
        return module.completed_at !== null;
    }

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

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Training Report" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Employee Training Report</h1>
                        <p className="text-muted-foreground mt-2">Employee performance and training engagement metrics</p>
                    </div>
                    <Button className="gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV "coming soon"
                    </Button>
                </div>

                {/* Enhanced Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <Card >
                        <CardHeader>
                            <CardDescription>Enrolled Employees</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg">
                                        <Users className="w-5 h-5"  />
                                    </div>
                                    <div>
                                                         <p className="text-xl font-bold"> {totalStudents}</p>
                                    </div>
                                </div>

                            </CardTitle>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1.5 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                <p className="text-sm font-medium text-muted-foreground">     All Employees </p>
                                {allStudents}
                            </div>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 ">
                                    <Award className="w-5 h-5 " />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                                    <p className="text-xl font-bold">{averageCompletion}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 ">
                                    <TrendingUp className="w-5 h-5 " />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                                    <p className="text-xl font-bold">{totalEnrollments}</p>
                                    <p className={"text-xs text-muted-foreground"}>Total enrolled modules</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 ">
                                    <Target className="w-5 h-5 " />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                    <p className="text-xl font-bold">{totalCompletions}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 ">
                                    <Clock className="w-5 h-5 " />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                                    <p className="text-xl font-bold">{activeStudents}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 ">
                                    <Trophy className="w-5 h-5 " />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Top Performers</p>
                                    <p className="text-xl font-bold">{topPerformers}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Students Table */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Student Performance Overview</CardTitle>
                                <CardDescription>Click on any student to view detailed training analytics</CardDescription>
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
                                <Select value={completionFilter} onValueChange={(value: never) => setCompletionFilter(value)}>
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

                                <Select value={enrollmentFilter} onValueChange={(value: never) => setEnrollmentFilter(value)}>
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
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedStudents.map((student) => (
                                    <TableRow
                                        key={student.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleStudentClick(student)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {student.avatar ? (
                                                    <img
                                                        src={student.avatar}
                                                        alt={student.name}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{student.name}</p>
                                                    <p className="text-sm text-muted-foreground">{student.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{student.enrollments_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{student.completed_enrollments_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Progress value={student.completion_rate} className="w-16" />
                                                <span className="text-sm font-medium">{student.completion_rate}%</span>
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
            </div>

            {/* Student Details Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="min-w-10/12 p-0 overflow-hidden">
                    {selectedStudent && studentDetails && (
                        <>
                            <SheetHeader className="p-6">
                                <SheetTitle className="flex items-center gap-3">
                                    {selectedStudent.avatar ? (
                                        <img
                                            src={selectedStudent.avatar}
                                            alt={selectedStudent.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    {selectedStudent.name}
                                </SheetTitle>
                                <SheetDescription>
                                    Detailed training analytics and performance metrics
                                </SheetDescription>
                            </SheetHeader>

                            <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                                {/* Quick Stats */}
                                <div className="grid
                                 grid-cols-1">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Student Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Email:</span>
                                                <span>{selectedStudent.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">First Enrollment:</span>
                                                <span>{new Date(studentDetails.first_enrollment).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Last Activity:</span>
                                                <span>{new Date(studentDetails.last_activity).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total Enrollments:</span>
                                                <Badge variant="outline">{selectedStudent.enrollments_count}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Completed Modules:</span>
                                                <Badge variant="secondary">{selectedStudent.completed_enrollments_count}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="text-sm text-muted-foreground">Overall Completion</p>
                                                <Badge variant="secondary">{selectedStudent.completion_rate}%</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="text-sm text-muted-foreground">Total Time Spent</p>
                                                <Badge variant="secondary">{formatTime(studentDetails.total_time_spent)}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>

                                </div>

                                <Separator />

                                {/* Detailed Tabs */}
                                <Tabs defaultValue="modules" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">

                                        <TabsTrigger value="modules">Modules</TabsTrigger>
                                        <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                                        <TabsTrigger value="tests">Tests</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="modules" className="">
                                        <div className="grid grid-cols-3 gap-2">
                                        {studentDetails.module_progress.map((module) => (
                                            <div key={module.id} className=" bg-white col-span-1 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                                                <div>
                                                    {/* Module Thumbnail */}
                                                        {module.thumbnail ? (
                                                            <img
                                                                className="aspect-video object-fill"
                                                                width={600}
                                                                height={400}
                                                                src={module.thumbnail}
                                                                alt={module.title}

                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-full aspect-video bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                                                <BookOpen className="w-12 h-12 text-white aspect-video object-fill" />
                                                            </div>
                                                        )}

                                                    {/* Module Content */}
                                                    <div className="flex-1 p-6">
                                                        <div className="flex flex-col h-full">
                                                            {/* Status Badge */}
                                                            <div className=" items-center justify-between mb-2">
                                                                {module.completed_at ? (
                                                                    <div className={"flex gap-2 justify-between"}>

                                                                        <Badge variant={"outline"} className="text-xs text-muted-foreground">
                                                                    Enrolled {new Date(module.enrolled_at).toLocaleDateString()}
                                                                </Badge>
                                                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                                                            Completed
                                                                        </Badge>
                                                                        <Badge variant={"outline"} className="text-xs text-muted-foreground">
                                                                     Completed {new Date(module.completed_at).toLocaleDateString()}
                                                                </Badge>
                                                                    </div>
                                                                ) : (
                                                                    <div className={"flex gap-2 justify-between"}>
                                                                    <Badge variant="secondary">In Progress</Badge>
                                                                    <Badge variant={"outline"} className="text-xs text-muted-foreground justify-end">
                                                                    Enrolled {new Date(module.enrolled_at).toLocaleDateString()}
                                                            </Badge>
                                                                    </div>
                                                                )}



                                                            </div>

                                                            {/* Module Title */}
                                                            <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                                                                {module.title}
                                                            </h3>

                                                            {/* Module Description */}

                                                            <p className="text-sm text-muted-foreground mb-4 flex-1">
                                                                {module.description}
                                                            </p>

                                                            {/* Progress Section */}
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-sm">
                                                                            <span className="flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                                {formatTime(module.time_spent)}
                                                                        </span>

                                                                    <span className="text-muted-foreground">
                                                                        {module.lessons_completed} of {module.total_lessons} lessons completed
                                                                    </span>
                                                                    <span className="font-medium">{module.progress_percentage}%</span>

                                                                </div>
                                                                <Progress value={module.progress_percentage} className="h-2" />

                                                                {/*/!* Footer Info *!/*/}
                                                                {/*<div className="flex items-center justify-between pt-2">*/}
                                                                {/*    <div className="flex items-center gap-4 text-xs text-muted-foreground">*/}
                                                                {/*        <span className="flex items-center gap-1">*/}
                                                                {/*            <Clock className="w-3 h-3" />*/}
                                                                {/*            {formatTime(module.time_spent)}*/}
                                                                {/*        </span>*/}
                                                                {/*        <span>{module.lessons_completed} lessons</span>*/}
                                                                {/*    </div>*/}
                                                                {/*    /!*<Button variant="outline" size="sm" className="h-8">*!/*/}
                                                                {/*    /!*    View Details*!/*/}
                                                                {/*    /!*</Button>*!/*/}
                                                                {/*</div>*/}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="quizzes" className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Quiz Performance by Module</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {(() => {
                                                    // Group quizzes by lesson (module-like grouping)
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
                                                <CardTitle>Test Performance by Module</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {(() => {
                                                    // Group tests by module
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
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
