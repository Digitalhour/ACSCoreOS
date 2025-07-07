import React, {useMemo, useState} from 'react';
import {Head, useForm, usePage} from '@inertiajs/react';
import {toast} from 'sonner';
import AppLayout from "@/layouts/app-layout";
import type {BreadcrumbItem} from "@/types";
import {Button} from "@/components/ui/button";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {Badge} from "@/components/ui/badge";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Progress} from "@/components/ui/progress";
import {ChevronDown, ChevronRight, Edit, Eye, Plus, Search, Trash2} from "lucide-react";

interface Employee {
    employee_id: number;
    employee_first_name: string;
    employee_last_name: string;
    employee_hire_date: string | null;
    employee_status: string;
    full_name: string;
    email: string;
    name: string;
}

interface Module {
    module_id: number;
    module_name: string;
    module_description: string | null;
    module_status: string;
    created_at: string;
}

interface Lesson {
    lesson_id: number;
    lesson_name: string;
    lesson_description: string | null;
    lesson_status: string;
    module_id: number;
    created_at: string;
    module?: Module;
}

interface Quiz {
    quiz_id: number;
    quiz_name: string;
    quiz_description: string | null;
    quiz_status: string;
    lesson_id: number;
    created_at: string;
    lesson?: Lesson;
}

interface Test {
    test_id: number;
    test_name: string;
    test_description: string | null;
    test_status: string;
    module_id: number;
    created_at: string;
    module?: Module;
}

interface Grade {
    grade_id: number;
    grade_employee_id: number;
    grade_assessment_id: number;
    grade_assessment_type: 'Quiz' | 'Test';
    grade_score: number;
    created_at: string;
    employee?: Employee;
}

interface ActivityLog {
    log_id: number;
    log_action: string;
    log_type: string;
    log_details: string;
    created_at: string;
}

interface TranningProps {
    modules: Module[];
    lessons: Lesson[];
    quizzes: Quiz[];
    tests: Test[];
    employees: Employee[];
    grades: Grade[];
    logs: ActivityLog[];
    activeModules: Module[];
    activeLessons: Lesson[];
    activeQuizzes: Quiz[];
    activeTests: Test[];
    flash?: {
        message?: string;
    };
    [key: string]: any;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Training Tracker',
        href: route('old-style-training-tracking.index'),
    },
];

export default function OldStyleTrainingTracking() {
    const { props } = usePage<TranningProps>();
    const { modules, lessons, quizzes, tests, employees, grades,  activeModules, activeLessons, activeQuizzes, activeTests, flash } = props;

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Reports section state - moved to top level
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState<string>('all');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        type: '',
        name: '',
        description: '',
        status: 'Active',
        moduleId: '',
        lessonId: '',
        employeeId: '',
        assessmentType: '',
        assessmentId: '',
        score: ''
    });

    // Memoized values for reports - moved to top level
    const sortedEmployees = useMemo(() =>
            [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name)),
        [employees]
    );

    const filteredEmployees = useMemo(() => {
        return sortedEmployees.filter(employee =>
            employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedEmployees, searchTerm]);

    const openModal = (type: string, id: number | null = null) => {
        setModalType(type);
        setEditingId(id);
        setShowModal(true);
        reset();
        setData('type', type);
        setData('status', 'Active');

        if (id) {
            loadItemForEdit(type, id);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        reset();
        setEditingId(null);
        setModalType('');
    };

    const loadItemForEdit = (type: string, id: number) => {
        let item: any = null;

        switch(type) {
            case 'module':
                item = modules.find(m => m.module_id === id);
                if (item) {
                    setData({
                        ...data,
                        name: item.module_name,
                        description: item.module_description || '',
                        status: item.module_status
                    });
                }
                break;
            case 'lesson':
                item = lessons.find(l => l.lesson_id === id);
                if (item) {
                    setData({
                        ...data,
                        name: item.lesson_name,
                        description: item.lesson_description || '',
                        status: item.lesson_status,
                        moduleId: item.module_id.toString()
                    });
                }
                break;
            case 'quiz':
                item = quizzes.find(q => q.quiz_id === id);
                if (item) {
                    setData({
                        ...data,
                        name: item.quiz_name,
                        description: item.quiz_description || '',
                        status: item.quiz_status,
                        lessonId: item.lesson_id.toString()
                    });
                }
                break;
            case 'test':
                item = tests.find(t => t.test_id === id);
                if (item) {
                    setData({
                        ...data,
                        name: item.test_name,
                        description: item.test_description || '',
                        status: item.test_status,
                        moduleId: item.module_id.toString()
                    });
                }
                break;
            case 'grade':
                item = grades.find(g => g.grade_id === id);
                if (item) {
                    setData({
                        ...data,
                        employeeId: item.grade_employee_id.toString(),
                        assessmentType: item.grade_assessment_type,
                        assessmentId: item.grade_assessment_id.toString(),
                        score: item.grade_score.toString()
                    });
                }
                break;
        }
    };

    const handleSubmit = () => {
        if (editingId) {
            put(route('old-style-training-tracking.update', { type: modalType, id: editingId }), {
                onSuccess: () => {
                    closeModal();
                    toast.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} updated successfully`);
                }
            });
        } else {
            post(route('old-style-training-tracking.store'), {
                onSuccess: () => {
                    closeModal();
                    toast.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} created successfully`);
                }
            });
        }
    };

    const handleDelete = (type: string, id: number) => {
        if (confirm('Are you sure you want to delete this item?')) {
            destroy(route('old-style-training-tracking.destroy', { type, id }), {
                onSuccess: () => {
                    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
                }
            });
        }
    };

    const exportData = () => {
        window.location.href = route('old-style-training-tracking.export-data');
    };

    // const exportLogs = () => {
    //     window.location.href = route('old-style-training-tracking.export-logs');
    // };

    const getStatusVariant = (status: string) => {
        return status.toLowerCase() === 'active' ? 'default' : 'secondary';
    };

    // Helper functions for reports section
    const getEmployeeProgress = (employeeId: number) => {
        const employeeGrades = grades.filter(g =>
            g.grade_employee_id === employeeId && g.grade_assessment_type === 'Test'
        );

        const moduleProgress = activeModules.map(module => {
            const moduleTests = activeTests.filter(t => t.module_id === module.module_id);
            const moduleGrades = employeeGrades.filter(g =>
                moduleTests.some(t => t.test_id === g.grade_assessment_id)
            );

            const completed = moduleGrades.length;
            const total = moduleTests.length;
            const averageScore = moduleGrades.length > 0
                ? moduleGrades.reduce((sum, grade) => sum + grade.grade_score, 0) / moduleGrades.length
                : 0;

            return {
                module,
                completed,
                total,
                percentage: total > 0 ? (completed / total) * 100 : 0,
                averageScore: Math.round(averageScore),
                grades: moduleGrades
            };
        });

        const totalCompleted = moduleProgress.reduce((sum, mp) => sum + mp.completed, 0);
        const totalTests = moduleProgress.reduce((sum, mp) => sum + mp.total, 0);
        const overallPercentage = totalTests > 0 ? (totalCompleted / totalTests) * 100 : 0;
        const overallAverageScore = employeeGrades.length > 0
            ? employeeGrades.reduce((sum, grade) => sum + grade.grade_score, 0) / employeeGrades.length
            : 0;

        return {
            moduleProgress,
            overallPercentage,
            overallAverageScore: Math.round(overallAverageScore),
            totalCompleted,
            totalTests
        };
    };

    const toggleModuleExpansion = (moduleId: number) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    const openEmployeeModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setShowEmployeeModal(true);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 80) return 'text-blue-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-green-500';
        if (percentage >= 70) return 'bg-blue-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const renderModulesSection = () => (
        <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
            <div className={"flex justify-end"}>
                <Button onClick={() => openModal('module')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Module
                </Button>
            </div>
            <div className="flex gap-4">

                {modules.map((module) => (
                                            <Card key={module.module_id} className="w-full max-w-sm">

                                                <CardHeader className="font-medium">
                                                <CardTitle>   {module.module_name}</CardTitle>
                                                    <CardAction>
                                                        <Badge variant={getStatusVariant(module.module_status)}>
                                                            {module.module_status}
                                                        </Badge>
                                                    </CardAction>
                                                </CardHeader>
                                                <CardContent>
                                                    <CardDescription>{module.module_description || '-'}
                                                    </CardDescription>
                                                    </CardContent>
                                                <CardFooter>
                                                    <div className="flex gap-2">
                                                        {new Date(module.created_at).toLocaleDateString()}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openModal('module', module.module_id)}
                                                            className="gap-1"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                            Edit
                                                        </Button>

                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDelete('module', module.module_id)}
                                                            className="gap-1"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            Delete
                                                        </Button>
                                                    </div>

                                                </CardFooter>

                                            </Card>
                                        ))}

            </div>
        </div>
        // <Card>
        //     <CardHeader>
        //         <div className="flex items-center justify-between">
        //             <CardTitle>Module Management</CardTitle>
        //             <Button onClick={() => openModal('module')} className="gap-2">
        //                 <Plus className="h-4 w-4" />
        //                 Add Module
        //             </Button>
        //         </div>
        //     </CardHeader>
        //     <CardContent>
        //         <div className="rounded-md border">
        //             <Table>
        //                 <TableHeader>
        //                     <TableRow>
        //                         <TableHead>ID</TableHead>
        //                         <TableHead>Name</TableHead>
        //                         <TableHead>Description</TableHead>
        //                         <TableHead>Status</TableHead>
        //                         <TableHead>Created</TableHead>
        //                         <TableHead>Actions</TableHead>
        //                     </TableRow>
        //                 </TableHeader>
        //                 <TableBody>
        //                     {modules.map((module) => (
        //                         <TableRow key={module.module_id}>
        //                             <TableCell>{module.module_id}</TableCell>
        //                             <TableCell className="font-medium">{module.module_name}</TableCell>
        //                             <TableCell>{module.module_description || '-'}</TableCell>
        //                             <TableCell>
        //                                 <Badge variant={getStatusVariant(module.module_status)}>
        //                                     {module.module_status}
        //                                 </Badge>
        //                             </TableCell>
        //                             <TableCell>{new Date(module.created_at).toLocaleDateString()}</TableCell>
        //                             <TableCell>
        //                                 <div className="flex gap-2">
        //                                     <Button
        //                                         variant="outline"
        //                                         size="sm"
        //                                         onClick={() => openModal('module', module.module_id)}
        //                                         className="gap-1"
        //                                     >
        //                                         <Edit className="h-3 w-3" />
        //                                         Edit
        //                                     </Button>
        //                                     <Button
        //                                         variant="destructive"
        //                                         size="sm"
        //                                         onClick={() => handleDelete('module', module.module_id)}
        //                                         className="gap-1"
        //                                     >
        //                                         <Trash2 className="h-3 w-3" />
        //                                         Delete
        //                                     </Button>
        //                                 </div>
        //                             </TableCell>
        //                         </TableRow>
        //                     ))}
        //                 </TableBody>
        //             </Table>
        //         </div>
        //     </CardContent>
        // </Card>
    );

    const renderLessonsSection = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Lesson Management</CardTitle>
                    <Button onClick={() => openModal('lesson')} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Lesson
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>

                                <TableHead>Name</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lessons.map((lesson) => (
                                <TableRow key={lesson.lesson_id}>

                                    <TableCell style={{ whiteSpace: 'pre-line' }} className="font-medium">{lesson.lesson_name}</TableCell>
                                    <TableCell style={{ whiteSpace: 'pre-line' }}>{lesson.module?.module_name || 'N/A'}</TableCell>
                                    <TableCell style={{ whiteSpace: 'pre-line' }}>{lesson.lesson_description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(lesson.lesson_status)}>
                                            {lesson.lesson_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(lesson.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openModal('lesson', lesson.lesson_id)}
                                                className="gap-1"
                                            >
                                                <Edit className="h-3 w-3" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete('lesson', lesson.lesson_id)}
                                                className="gap-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

    const renderQuizzesSection = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Quiz Management</CardTitle>
                    <Button onClick={() => openModal('quiz')} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Quiz
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Lesson</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quizzes.map((quiz) => (
                                <TableRow key={quiz.quiz_id}>
                                    <TableCell>{quiz.quiz_id}</TableCell>
                                    <TableCell className="font-medium">{quiz.quiz_name}</TableCell>
                                    <TableCell>{quiz.lesson?.lesson_name || 'N/A'}</TableCell>
                                    <TableCell>{quiz.quiz_description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(quiz.quiz_status)}>
                                            {quiz.quiz_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(quiz.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openModal('quiz', quiz.quiz_id)}
                                                className="gap-1"
                                            >
                                                <Edit className="h-3 w-3" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete('quiz', quiz.quiz_id)}
                                                className="gap-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

    const renderTestsSection = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Test Management</CardTitle>
                    <Button onClick={() => openModal('test')} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Test
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tests.map((test) => (
                                <TableRow key={test.test_id}>
                                    <TableCell>{test.test_id}</TableCell>
                                    <TableCell className="font-medium">{test.test_name}</TableCell>
                                    <TableCell>{test.module?.module_name || 'N/A'}</TableCell>
                                    <TableCell>{test.test_description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(test.test_status)}>
                                            {test.test_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(test.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openModal('test', test.test_id)}
                                                className="gap-1"
                                            >
                                                <Edit className="h-3 w-3" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete('test', test.test_id)}
                                                className="gap-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

    const renderGradingSection = () => (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Grading Events</CardTitle>
                    <Button onClick={() => openModal('grade')} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Grade Assessment
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Assessment</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Grade Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grades.map((grade) => {

                                const getEmployeeName = () => {
                                    if (grade.employee?.full_name) {
                                        return grade.employee.full_name;
                                    }
                                    if (grade.employee?.name) {
                                        return grade.employee.name;
                                    }
                                    const employee = employees.find(emp => emp.employee_id === grade.grade_employee_id);
                                    if (employee) {
                                        return employee.full_name;
                                    }
                                    return `Employee ID: ${grade.grade_employee_id}`;
                                };

                                return (
                                    <TableRow key={grade.grade_id}>
                                        <TableCell className="font-medium">
                                            {getEmployeeName()}
                                        </TableCell>
                                        <TableCell>
                                            {grade.grade_assessment_type === 'Quiz'
                                                ? quizzes.find(q => q.quiz_id === grade.grade_assessment_id)?.quiz_name || 'N/A'
                                                : tests.find(t => t.test_id === grade.grade_assessment_id)?.test_name || 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{grade.grade_assessment_type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                        <span className={grade.grade_score >= 70 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                            {grade.grade_score}%
                                        </span>
                                        </TableCell>
                                        <TableCell>{new Date(grade.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openModal('grade', grade.grade_id)}
                                                    className="gap-1"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete('grade', grade.grade_id)}
                                                    className="gap-1"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

    const renderSummaryView = () => (
        <div className="space-y-4">
            {filteredEmployees.map((employee) => {
                const progress = getEmployeeProgress(employee.employee_id);
                return (
                    <Card key={employee.employee_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{employee.full_name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {progress.totalCompleted} of {progress.totalTests} tests completed
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">
                                            {Math.round(progress.overallPercentage)}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Progress</div>
                                    </div>

                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${getScoreColor(progress.overallAverageScore)}`}>
                                            {progress.overallAverageScore}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Avg Score</div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEmployeeModal(employee)}
                                        className="gap-1"
                                    >
                                        <Eye className="h-4 w-4" />
                                        Details
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Overall Progress</span>
                                    <span className="text-sm text-muted-foreground">
                                        {progress.totalCompleted}/{progress.totalTests}
                                    </span>
                                </div>
                                <Progress
                                    value={progress.overallPercentage}
                                    className="h-2"
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {progress.moduleProgress.map((mp) => (
                                    <div key={mp.module.module_id} className="text-center p-2 bg-muted rounded">
                                        <div className="text-xs font-medium truncate" title={mp.module.module_name}>
                                            {mp.module.module_name}
                                        </div>
                                        <div className="text-lg font-semibold">
                                            {Math.round(mp.percentage)}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {mp.completed}/{mp.total}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    const renderDetailedView = () => (
        <div className="space-y-6">
            {activeModules
                .filter(module => selectedModule === 'all' || module.module_id.toString() === selectedModule)
                .map((module) => {
                    const moduleTests = activeTests.filter(t => t.module_id === module.module_id);
                    const isExpanded = expandedModules.has(module.module_id);

                    return (
                        <Card key={module.module_id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleModuleExpansion(module.module_id)}
                                        >
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                        {module.module_name}
                                        <Badge variant="outline">{moduleTests.length} tests</Badge>
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2 font-medium">Employee</th>
                                                <th className="text-center p-2 font-medium">Progress</th>
                                                <th className="text-center p-2 font-medium">Avg Score</th>
                                                {moduleTests.map((test) => (
                                                    <th key={test.test_id} className="text-center p-2 font-medium min-w-20">
                                                        {test.test_name}
                                                    </th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {filteredEmployees.map((employee) => {
                                                const progress = getEmployeeProgress(employee.employee_id);
                                                const moduleProgress = progress.moduleProgress.find(mp => mp.module.module_id === module.module_id);

                                                return (
                                                    <tr key={employee.employee_id} className="border-b hover:bg-muted/50">
                                                        <td className="p-2 font-medium">{employee.full_name}</td>
                                                        <td className="text-center p-2">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${getProgressColor(moduleProgress?.percentage || 0)}`}
                                                                        style={{ width: `${moduleProgress?.percentage || 0}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs">
                                                                    {Math.round(moduleProgress?.percentage || 0)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center p-2">
                                                            <span className={`font-semibold ${getScoreColor(moduleProgress?.averageScore || 0)}`}>
                                                                {moduleProgress?.averageScore || 0}%
                                                            </span>
                                                        </td>
                                                        {moduleTests.map((test) => {
                                                            const grade = grades.find(g =>
                                                                g.grade_employee_id === employee.employee_id &&
                                                                g.grade_assessment_id === test.test_id &&
                                                                g.grade_assessment_type === 'Test'
                                                            );
                                                            return (
                                                                <td key={test.test_id} className="text-center p-2">
                                                                    {grade ? (
                                                                        <div>
                                                                            <div className={`font-semibold ${getScoreColor(grade.grade_score)}`}>
                                                                                {grade.grade_score}%
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {new Date(grade.created_at).toLocaleDateString()}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
        </div>
    );

    const renderEmployeeModal = () => {
        if (!selectedEmployee) return null;

        const progress = getEmployeeProgress(selectedEmployee.employee_id);

        return (
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{selectedEmployee.full_name} - Detailed Progress</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{Math.round(progress.overallPercentage)}%</div>
                                    <div className="text-sm text-muted-foreground">Overall Progress</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className={`text-3xl font-bold ${getScoreColor(progress.overallAverageScore)}`}>
                                        {progress.overallAverageScore}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">Average Score</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{progress.totalCompleted}/{progress.totalTests}</div>
                                    <div className="text-sm text-muted-foreground">Tests Completed</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        {progress.moduleProgress.map((mp) => (
                            <Card key={mp.module.module_id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>{mp.module.module_name}</span>
                                        <Badge variant="outline">{mp.completed}/{mp.total} completed</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Progress</span>
                                            <span>{Math.round(mp.percentage)}%</span>
                                        </div>
                                        <Progress value={mp.percentage} className="h-2" />

                                        {mp.grades.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="font-medium mb-2">Test Scores</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {mp.grades.map((grade) => {
                                                        const test = activeTests.find(t => t.test_id === grade.grade_assessment_id);
                                                        return (
                                                            <div key={grade.grade_id} className="flex justify-between items-center p-2 bg-muted rounded">
                                                                <span className="text-sm">{test?.test_name}</span>
                                                                <div className="text-right">
                                                                    <div className={`font-semibold ${getScoreColor(grade.grade_score)}`}>
                                                                        {grade.grade_score}%
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {new Date(grade.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </DialogContent>
        );
    };

    const renderReportsSection = () => {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Employee Progress Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    {activeModules.length > 0 && employees.length > 0 ? (
                        <>
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search employees..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <Select value={selectedModule} onValueChange={setSelectedModule}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Filter by module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Modules</SelectItem>
                                        {activeModules.map((module) => (
                                            <SelectItem key={module.module_id} value={module.module_id.toString()}>
                                                {module.module_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'summary' | 'detailed')}>
                                    <TabsList>
                                        <TabsTrigger value="summary">Summary</TabsTrigger>
                                        <TabsTrigger value="detailed">Detailed</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {viewMode === 'summary' ? renderSummaryView() : renderDetailedView()}

                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle className="text-lg">Report Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                        <div><strong>Total Employees:</strong> {employees.length}</div>
                                        <div><strong>Active Modules:</strong> {activeModules.length}</div>
                                        <div><strong>Active Tests:</strong> {activeTests.length}</div>
                                        <div><strong>Grades Recorded:</strong> {grades.length}</div>
                                        <div><strong>Test Completion Rate:</strong> {
                                            activeTests.length > 0 && employees.length > 0
                                                ? Math.round((grades.filter(g => g.grade_assessment_type === 'Test').length / (employees.length * activeTests.length)) * 100 * 10) / 10
                                                : 0
                                        }%</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <p className="text-muted-foreground">No active modules or employees available for report generation.</p>
                    )}
                </CardContent>

                <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
                    {renderEmployeeModal()}
                </Dialog>
            </Card>
        );
    };

    // const renderLogsSection = () => (
    //     <Card>
    //         <CardHeader>
    //             <div className="flex items-center justify-between">
    //                 <CardTitle>Activity Log</CardTitle>
    //                 <Button onClick={exportLogs} variant="outline" className="gap-2">
    //                     <Download className="h-4 w-4" />
    //                     Export Log (CSV)
    //                 </Button>
    //             </div>
    //         </CardHeader>
    //         <CardContent>
    //             {logs.length > 0 ? (
    //                 <div className="space-y-2">
    //                     {logs.map((log) => (
    //                         <div key={log.log_id} className="border-l-4 border-primary bg-muted p-3 text-sm">
    //                             <strong>{new Date(log.created_at).toLocaleString()}</strong> - {log.log_action} {log.log_type}: {log.log_details}
    //                         </div>
    //                     ))}
    //                 </div>
    //             ) : (
    //                 <p className="text-muted-foreground">No activity logs available.</p>
    //             )}
    //         </CardContent>
    //     </Card>
    // );

    const renderModalContent = () => {
        if (modalType === 'grade') {
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="employee">Employee *</Label>
                        <Select value={data.employeeId} onValueChange={(value) => setData('employeeId', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((employee) => (
                                    <SelectItem key={employee.employee_id} value={employee.employee_id.toString()}>
                                        {employee.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assessmentType">Assessment Type *</Label>
                        <Select
                            value={data.assessmentType}
                            onValueChange={(value) => {
                                setData('assessmentType', value);
                                setData('assessmentId', '');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Quiz">Quiz</SelectItem>
                                <SelectItem value="Test">Test</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.assessmentType && <p className="text-sm text-destructive">{errors.assessmentType}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assessment">Assessment *</Label>
                        <Select value={data.assessmentId} onValueChange={(value) => setData('assessmentId', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Assessment" />
                            </SelectTrigger>
                            <SelectContent>
                                {data.assessmentType === 'Quiz' && activeQuizzes.map((quiz) => (
                                    <SelectItem key={quiz.quiz_id} value={quiz.quiz_id.toString()}>
                                        {quiz.quiz_name}
                                    </SelectItem>
                                ))}
                                {data.assessmentType === 'Test' && activeTests.map((test) => (
                                    <SelectItem key={test.test_id} value={test.test_id.toString()}>
                                        {test.test_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.assessmentId && <p className="text-sm text-destructive">{errors.assessmentId}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="score">Score (0-100) *</Label>
                        <Input
                            id="score"
                            type="number"
                            value={data.score}
                            onChange={(e) => setData('score', e.target.value)}
                            min="0"
                            max="100"
                            placeholder="Enter score"
                        />
                        {errors.score && <p className="text-sm text-destructive">{errors.score}</p>}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {modalType === 'lesson' && (
                    <div className="space-y-2">
                        <Label htmlFor="module">Module *</Label>
                        <Select value={data.moduleId} onValueChange={(value) => setData('moduleId', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Module" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeModules.map((module) => (
                                    <SelectItem key={module.module_id} value={module.module_id.toString()}>
                                        {module.module_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.moduleId && <p className="text-sm text-destructive">{errors.moduleId}</p>}
                    </div>
                )}

                {modalType === 'quiz' && (
                    <div className="space-y-2">
                        <Label htmlFor="lesson">Lesson *</Label>
                        <Select value={data.lessonId} onValueChange={(value) => setData('lessonId', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Lesson" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeLessons.map((lesson) => (
                                    <SelectItem key={lesson.lesson_id} value={lesson.lesson_id.toString()}>
                                        {lesson.lesson_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.lessonId && <p className="text-sm text-destructive">{errors.lessonId}</p>}
                    </div>
                )}

                {modalType === 'test' && (
                    <div className="space-y-2">
                        <Label htmlFor="module">Module *</Label>
                        <Select value={data.moduleId} onValueChange={(value) => setData('moduleId', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Module" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeModules.map((module) => (
                                    <SelectItem key={module.module_id} value={module.module_id.toString()}>
                                        {module.module_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.moduleId && <p className="text-sm text-destructive">{errors.moduleId}</p>}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name">{modalType.charAt(0).toUpperCase() + modalType.slice(1)} Name *</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder={`Enter ${modalType} name`}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="Enter description"
                        rows={3}
                    />
                    {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                </div>
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Old Style Training Tracking" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Training Dashboard</h1>
                        <p className="text-muted-foreground mt-2">training progress and grading</p>
                    </div>
                    {/*<Button onClick={exportData} variant="secondary" className="gap-2">*/}
                    {/*    <Download className="h-4 w-4" />*/}
                    {/*    Export All Data (CSV)*/}
                    {/*</Button>*/}
                </div>

                {flash?.message && (
                    <Alert>
                        <AlertDescription>{flash.message}</AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="modules" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                        <TabsTrigger value="modules">Modules</TabsTrigger>
                        <TabsTrigger value="lessons">Lessons</TabsTrigger>
                        <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                        <TabsTrigger value="tests">Tests</TabsTrigger>
                        <TabsTrigger value="grading">Grading</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        {/*<TabsTrigger value="logs">Activity Log</TabsTrigger>*/}
                    </TabsList>

                    <TabsContent value="modules" className="space-y-4">
                        {renderModulesSection()}
                    </TabsContent>

                    <TabsContent value="lessons" className="space-y-4">
                        {renderLessonsSection()}
                    </TabsContent>

                    <TabsContent value="quizzes" className="space-y-4">
                        {renderQuizzesSection()}
                    </TabsContent>

                    <TabsContent value="tests" className="space-y-4">
                        {renderTestsSection()}
                    </TabsContent>

                    <TabsContent value="grading" className="space-y-4">
                        {renderGradingSection()}
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-4">
                        {renderReportsSection()}
                    </TabsContent>

                    {/*<TabsContent value="logs" className="space-y-4">*/}
                    {/*    {renderLogsSection()}*/}
                    {/*</TabsContent>*/}
                </Tabs>

                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingId ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                            </DialogTitle>
                        </DialogHeader>
                        {renderModalContent()}
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={processing}>
                                {processing ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
