import React, {useState} from 'react';
import {Head, Link, router, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {ArrowLeft, Building, Plus, Trash2, TreeDeciduous, User, Users} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from "@/components/ui/badge";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

interface Department {
    id: number;
    name: string;
}

interface Assignment {
    id: number;
    assignment_type: 'everyone' | 'user' | 'department' | 'hierarchy';
    assignable_id: number | null;
    display_name: string;
    assignable?: User | Department;
}

interface Module {
    id: number;
    title: string;
    description: string;
}

interface Props {
    module: Module;
    assignments: Assignment[];
    users: User[];
    departments: Department[];
    managers: User[];
}

export default function ModuleAssignments({ module, assignments, users, departments, managers }: Props) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        assignment_type: '' as string,
        assignable_id: '' as string,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Training Modules', href: '/admin/modules' },
        { title: module.title, href: `/admin/modules/${module.id}` },
        { title: 'Assignments', href: `/admin/modules/${module.id}/assignments` },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.modules.assignments.store', module.id), {
            onSuccess: () => {
                reset();
                setIsAddDialogOpen(false);
            }
        });
    };

    const handleDelete = (assignmentId: number) => {
        router.delete(route('admin.modules.assignments.destroy', [module.id, assignmentId]));
    };

    const getAssignmentIcon = (type: string) => {
        switch (type) {
            case 'everyone':
                return <Users className="w-4 h-4" />;
            case 'user':
                return <User className="w-4 h-4" />;
            case 'department':
                return <Building className="w-4 h-4" />;
            case 'hierarchy':
                return <TreeDeciduous className="w-4 h-4" />;
            default:
                return <Users className="w-4 h-4" />;
        }
    };

    const getAssignmentColor = (type: string) => {
        switch (type) {
            case 'everyone':
                return 'bg-gray-500 text-white';
            case 'user':
                return 'bg-gray-200 text-black';
            case 'department':
                return 'bg-gray-500 text-white';
            case 'hierarchy':
                return 'bg-gray-500 text-white';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getAvailableOptions = () => {
        switch (data.assignment_type) {
            case 'user':
                return users;
            case 'department':
                return departments;
            case 'hierarchy':
                return managers;
            default:
                return [];
        }
    };

    const isUser = (assignable: User | Department): assignable is User => {
        return 'email' in assignable;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Module Assignments - ${module.title}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Button asChild variant="ghost" size="sm" className="mr-4">
                            <Link href={route('admin.modules.show', module.id)}>
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Module Assignments</h1>
                            <p className="text-muted-foreground">{module.title}</p>
                        </div>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Assignment
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Assignment</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Assignment Type</label>
                                    <Select value={data.assignment_type} onValueChange={(value) => setData('assignment_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select assignment type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="everyone">Everyone</SelectItem>
                                            <SelectItem value="user">Specific User</SelectItem>
                                            <SelectItem value="department">Department</SelectItem>
                                            <SelectItem value="hierarchy">Hierarchy (Manager + Subordinates)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.assignment_type && <p className="text-destructive text-sm mt-1">{errors.assignment_type}</p>}
                                </div>

                                {data.assignment_type && data.assignment_type !== 'everyone' && (
                                    <div>
                                        <label className="text-sm font-medium">
                                            {data.assignment_type === 'user' && 'Select User'}
                                            {data.assignment_type === 'department' && 'Select Department'}
                                            {data.assignment_type === 'hierarchy' && 'Select Manager'}
                                        </label>
                                        <Select value={data.assignable_id} onValueChange={(value) => setData('assignable_id', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Select ${data.assignment_type}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getAvailableOptions().map((option) => (
                                                    <SelectItem key={option.id} value={option.id.toString()}>
                                                        <div className="flex items-center justify-between w-full">
                                                            <span>{option.name}</span>
                                                            {'email' in option ? (
                                                                <span className="text-muted-foreground ml-2">({option.email as string})</span>
                                                            ) : null}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.assignable_id && <p className="text-destructive text-sm mt-1">{errors.assignable_id}</p>}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Adding...' : 'Add Assignment'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Current Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assignments.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No assignments configured.</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Add assignments to control who can access this module.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {assignments.map((assignment) => (
                                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {(assignment.assignment_type === 'user' || assignment.assignment_type === 'hierarchy') && assignment.assignable && isUser(assignment.assignable) ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        {assignment.assignable.avatar ? (
                                                            <img
                                                                src={assignment.assignable.avatar}
                                                                alt={assignment.assignable.name}
                                                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full  bg-gray-500 flex items-center justify-center text-white font-medium text-sm border-2 border-gray-200">
                                                                {assignment.assignable.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getAssignmentColor(assignment.assignment_type)} border-2 border-white flex items-center justify-center`}>
                                                            {getAssignmentIcon(assignment.assignment_type)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{assignment.assignable.name}</div>
                                                        <div className="text-sm text-muted-foreground">{assignment.assignable.email}</div>
                                                        <Badge variant="outline" className="text-xs mt-1">
                                                            {assignment.assignment_type === 'hierarchy' ? 'Manager + Team' : 'Individual User'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${getAssignmentColor(assignment.assignment_type)}`}>
                                                        {getAssignmentIcon(assignment.assignment_type)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{assignment.display_name}</div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {assignment.assignment_type.charAt(0).toUpperCase() + assignment.assignment_type.slice(1)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove this assignment? Users who access this module through this assignment will lose access.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(assignment.id)}>
                                                        Remove
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
