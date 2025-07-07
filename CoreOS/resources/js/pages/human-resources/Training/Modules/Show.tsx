// resources/js/pages/admin/modules/show.tsx
import React from 'react';
import {Head, Link, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {
    Award,
    BookOpen,
    Building,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    FileText,
    Headphones,
    Image,
    PlayCircle,
    Plus,
    Settings,
    Shapes,
    Trash2,
    TreeDeciduous,
    TrendingUp,
    User,
    UserCog,
    Users,
    Video
} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Progress} from '@/components/ui/progress';
import {Separator} from '@/components/ui/separator';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Enrollment {
    id: number;
    user: User;
    enrolled_at: string;
    completed_at: string | null;
    is_active: boolean;
}

interface LessonContent {
    id: number;
    title: string;
    type: string;
    order: number;
}

interface Quiz {
    id: number;
    title: string;
    questions: any[];
    passing_score: number;
    time_limit: number | null;
}

interface Lesson {
    id: number;
    title: string;
    description: string;
    order: number;
    is_active: boolean;
    contents: LessonContent[];
    quiz: Quiz | null;
}

interface Test {
    id: number;
    title: string;
    description: string;
    questions: any[];
    passing_score: number;
    time_limit: number | null;
    randomize_questions: boolean;
    show_results_immediately: boolean;
}

interface Assignment {
    id: number;
    assignment_type: 'everyone' | 'user' | 'department' | 'hierarchy';
    assignable_id: number | null;
    display_name: string;
    assignable?: {
        id: number;
        name: string;
        email?: string;
        avatar?: string;
    };
}

interface Module {
    id: number;
    title: string;
    description: string;
    thumbnail: string | null;
    sequential_lessons: boolean;
    quiz_required: boolean;
    test_required: boolean;
    passing_score: number;
    allow_retakes: boolean;
    is_active: boolean;
    order: number;
    created_at: string;
    updated_at: string;
    lessons: Lesson[];
    test: Test | null;
    enrollments: Enrollment[];
    assignments: Assignment[];
}

interface Props {
    module: Module;
    assignmentSummary: {
        type: string;
        count: number;
        description: string;
    };
}

export default function AdminModuleShow({ module, assignmentSummary }: Props) {
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
        {
            title: module.title,
            href: `/admin/modules/${module.id}`,
        },
    ];

    const handleDeleteLesson = (lesson: Lesson) => {
        if (confirm(`Are you sure you want to delete "${lesson.title}"? This action cannot be undone.`)) {
            router.delete(route('admin.modules.lessons.destroy', [module.id, lesson.id]));
        }
    };

    const handleDeleteTest = () => {
        if (module.test && confirm(`Are you sure you want to delete the final test? This action cannot be undone.`)) {
            router.delete(route('admin.modules.tests.destroy', [module.id, module.test.id]));
        }
    };

    const handleDeleteModule = () => {
        if (confirm(`Are you sure you want to delete "${module.title}"? This will delete all lessons, content, and enrollments. This action cannot be undone.`)) {
            router.delete(route('admin.modules.destroy', module.id));
        }
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'video': return Video;
            case 'document': return FileText;
            case 'slideshow': return Image;
            case 'audio': return Headphones;
            default: return FileText;
        }
    };

    const getAssignmentIcon = (type: string) => {
        switch (type) {
            case 'everyone': return Users;
            case 'user': return User;
            case 'department': return Building;
            case 'hierarchy': return TreeDeciduous;
            default: return Users;
        }
    };

    const getAssignmentColor = (type: string) => {
        switch (type) {
            case 'everyone': return 'bg-green-100 text-green-800';
            case 'user': return 'bg-blue-100 text-blue-800';
            case 'department': return 'bg-purple-100 text-purple-800';
            case 'hierarchy': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const completedEnrollments = module.enrollments.filter(e => e.completed_at).length;
    const completionRate = module.enrollments.length > 0
        ? Math.round((completedEnrollments / module.enrollments.length) * 100)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${module.title} - Admin`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{module.title}</h1>
                            <div className="flex items-center mt-2">
                                <Badge variant={module.is_active ? "outline" : "destructive"}>
                                    {module.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <span className="ml-3 text-sm text-muted-foreground">
                                    Created {new Date(module.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button asChild variant="default">
                            <Link href={route('admin.reports.progress', { module_id: module.id })}>
                                <TrendingUp className="w-4 h-4 mr-2" />
                                View Reports
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={route('training.module', module.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={route('admin.modules.edit', module.id)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Module
                            </Link>
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteModule}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-4">
                    {/* Main Content */}
                    <div className="flex flex-col col-span-3 gap-6">
                        {/* Module Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Module Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground">Title</label>
                                        <p className="mt-1">{module.title}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground">Passing Score</label>
                                        <p className="mt-1">{module.passing_score}%</p>
                                    </div>
                                    {module.description && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-muted-foreground">Description</label>
                                            <p className="mt-1">{module.description}</p>
                                        </div>
                                    )}
                                </div>
                                <span className={"block text-sm font-semibold text-muted-foreground"}>Module Features</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                    <div className="flex items-center">
                                        <Settings className="w-4 h-4 text-muted-foreground mr-2" />
                                        <span className="text-sm text-muted-foreground">
                                            {module.sequential_lessons ? 'Sequential' : 'Free Navigation'}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <Shapes className="w-4 h-4 text-muted-foreground mr-2" />
                                        <span className="text-sm text-muted-foreground">
                                            Quizzes {module.quiz_required ? 'Required' : 'Optional'}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <Award className="w-4 h-4 text-muted-foreground mr-2" />
                                        <span className="text-sm text-muted-foreground">
                                            Test {module.test_required ? 'Required' : 'Optional'}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <CheckCircle className="w-4 h-4 text-muted-foreground mr-2" />
                                        <span className="text-sm text-muted-foreground">
                                            {module.allow_retakes ? 'Retakes Allowed' : 'No Retakes'}
                                        </span>
                                    </div>

                                </div>
                            </CardContent>
                        </Card>

                        {/* Lessons Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Lessons ({module.lessons.length})</CardTitle>
                                    <Button asChild variant="default">
                                        <Link href={route('admin.modules.lessons.create', module.id)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Lesson
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {module.lessons && module.lessons.length > 0 ? (
                                    <div className="space-y-4">
                                        {module.lessons.map((lesson, index) => (
                                            <Card key={lesson.id} className="border">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
                                                                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium">{lesson.title}</h4>
                                                                <div className="flex items-center space-x-4 mt-1">
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {lesson.contents.length} content items
                                                                    </span>
                                                                    {lesson.quiz && lesson.quiz.questions && (
                                                                        <span className="text-xs flex items-center">
                                                                            <Shapes className="w-3 h-3 mr-1 text-primary" />
                                                                            Quiz ({lesson.quiz.questions.length} questions)
                                                                        </span>
                                                                    )}
                                                                    <Badge variant={lesson.is_active ? "outline" : "secondary"} className="text-xs">
                                                                        {lesson.is_active ? 'Active' : 'Inactive'}
                                                                    </Badge>
                                                                </div>

                                                                {lesson.contents.length > 0 && (
                                                                    <div className="flex items-center space-x-2 mt-2">
                                                                        {lesson.contents.slice(0, 4).map((content) => {
                                                                            const IconComponent = getContentIcon(content.type);
                                                                            return (
                                                                                <div key={content.id} className="flex items-center">
                                                                                    <IconComponent className="w-3 h-3 text-muted-foreground" />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {lesson.contents.length > 4 && (
                                                                            <span className="text-xs text-muted-foreground">+{lesson.contents.length - 4} more</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">

                                                            <Button asChild variant="ghost" size="sm">
                                                                <Link
                                                                    href={route('admin.modules.lessons.show', [module.id, lesson.id])}
                                                                    title="View Lesson"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Link>
                                                            </Button>

                                                            <Button asChild variant="ghost" size="sm">
                                                                <Link
                                                                    href={route('admin.modules.lessons.edit', [module.id, lesson.id])}
                                                                    title="Edit Lesson"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Link>
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteLesson(lesson)}
                                                                title="Delete Lesson"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h4 className="text-lg font-medium mb-2">No lessons yet</h4>
                                        <p className="text-muted-foreground mb-4">Add your first lesson to this module.</p>
                                        <Button asChild variant="default">
                                            <Link href={route('admin.modules.lessons.create', module.id)}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Lesson
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Final Test Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Final Test</CardTitle>
                                    {!module.test && (
                                        <Button asChild variant="default">
                                            <Link href={route('admin.modules.tests.create', module.id)}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Test
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {module.test ? (
                                    <Card className="border">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Award className="w-8 h-8 text-primary mr-3" />
                                                    <div>
                                                        <h4 className="font-medium">{module.test.title}</h4>
                                                        <div className="flex items-center space-x-4 mt-1">
                                                            <span className="text-sm text-muted-foreground">
                                                                {module.test.questions.length} questions
                                                            </span>
                                                            {module.test.time_limit && (
                                                                <span className="text-sm text-muted-foreground flex items-center">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {module.test.time_limit} minutes
                                                                </span>
                                                            )}
                                                            <span className="text-sm text-muted-foreground">
                                                                {module.test.passing_score}% passing
                                                            </span>
                                                        </div>
                                                        {module.test.description && (
                                                            <p className="text-sm text-muted-foreground mt-1">{module.test.description}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link
                                                            href={route('admin.modules.tests.show', [module.id, module.test.id])}
                                                            title="View Test"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                    </Button>

                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link
                                                            href={route('admin.modules.tests.edit', [module.id, module.test.id])}
                                                            title="Edit Test"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleDeleteTest}
                                                        title="Delete Test"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="text-center py-8">
                                        <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h4 className="text-lg font-medium mb-2">No final test</h4>
                                        <p className="text-muted-foreground mb-4">Add a final test to assess module completion.</p>
                                        <Button asChild variant="default">
                                            <Link href={route('admin.modules.tests.create', module.id)}>
                                                Create Test
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Statistics */}
                    <div className="lg:col-span-1 space-y-6">


                        <Card>
                            <CardHeader>
                                <CardTitle>Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Users className="w-5 h-5 mr-2 text-primary" />
                                            <span className="text-sm text-muted-foreground">Total Enrollments</span>
                                        </div>
                                        <span className="font-semibold">{module.enrollments.length}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                                            <span className="text-sm text-muted-foreground">Completed</span>
                                        </div>
                                        <span className="font-semibold">{completedEnrollments}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                                            <span className="text-sm text-muted-foreground">Completion Rate</span>
                                        </div>
                                        <span className="font-semibold">{completionRate}%</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <BookOpen className="w-5 h-5 mr-2 text-primary" />
                                            <span className="text-sm text-muted-foreground">Lessons</span>
                                        </div>
                                        <span className="font-semibold">{module.lessons.length}</span>
                                    </div>
                                </div>

                                {module.enrollments.length > 0 && (
                                    <div className="mt-6">
                                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                            <span>Progress</span>
                                            <span>{completionRate}%</span>
                                        </div>
                                        <Progress value={completionRate} className="w-full" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Access Control</CardTitle>
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={route('admin.modules.assignments', module.id)}>
                                            <UserCog className="w-4 h-4 mr-1" />
                                            Manage
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {module.assignments && module.assignments.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="text-sm text-muted-foreground mb-3">
                                            {assignmentSummary.description}
                                        </div>
                                        {module.assignments.slice(0, 4).map((assignment) => {
                                            const IconComponent = getAssignmentIcon(assignment.assignment_type);
                                            return (
                                                <div key={assignment.id} className="flex items-center gap-2">
                                                    {assignment.assignment_type === 'user' || assignment.assignment_type === 'hierarchy' ? (
                                                        assignment.assignable ? (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <div className="relative">
                                                                    {assignment.assignable.avatar ? (
                                                                        <img
                                                                            src={assignment.assignable.avatar}
                                                                            alt={assignment.assignable.name}
                                                                            className="w-6 h-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium text-xs">
                                                                            {assignment.assignable.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${getAssignmentColor(assignment.assignment_type)} border border-white flex items-center justify-center`}>
                                                                        <IconComponent className="w-1.5 h-1.5" />
                                                                    </div>
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-sm font-medium truncate">{assignment.assignable.name}</div>
                                                                    {assignment.assignable.email && (
                                                                        <div className="text-xs text-muted-foreground truncate">{assignment.assignable.email}</div>
                                                                    )}
                                                                </div>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {assignment.assignment_type === 'hierarchy' ? 'Team' : 'User'}
                                                                </Badge>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <IconComponent className="w-4 h-4" />
                                                                <span>Unknown {assignment.assignment_type}</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <div className={`p-1.5 rounded-full ${getAssignmentColor(assignment.assignment_type)}`}>
                                                                <IconComponent className="w-3 h-3" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-medium">{assignment.display_name}</div>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs">
                                                                {assignment.assignment_type.charAt(0).toUpperCase() + assignment.assignment_type.slice(1)}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {module.assignments.length > 4 && (
                                            <div className="text-xs text-muted-foreground text-center pt-2">
                                                +{module.assignments.length - 4} more assignments
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground mb-2">No assignments</p>
                                        <p className="text-xs text-muted-foreground mb-3">Module accessible to everyone by default</p>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={route('admin.modules.assignments', module.id)}>
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add Assignment
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {/* Recent Enrollments */}
                        {module.enrollments.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Enrollments</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {module.enrollments.slice(0, 5).map((enrollment, index) => (
                                            <div key={enrollment.id}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium">{enrollment.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        {enrollment.completed_at ? (
                                                            <CheckCircle className="w-4 h-4 text-primary" />
                                                        ) : (
                                                            <PlayCircle className="w-4 h-4 text-primary" />
                                                        )}
                                                    </div>
                                                </div>
                                                {index < module.enrollments.slice(0, 5).length - 1 && (
                                                    <Separator className="mt-3" />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {module.enrollments.length > 5 && (
                                        <div className="mt-4 text-center">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={route('admin.reports.students', { module_id: module.id })}>
                                                    View all enrollments
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
