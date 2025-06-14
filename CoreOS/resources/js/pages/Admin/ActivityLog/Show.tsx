import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Activity, AlertCircle, ArrowLeft, Calendar, CheckCircle, Clock, Code, Copy, Database, Eye, FileText, Shield, User } from 'lucide-react';
import { useCallback, useState } from 'react';

interface ActivityDetail {
    id: number;
    log_name: string;
    description: string;
    event: string | null;
    subject_type: string | null;
    subject_id: number | null;
    causer_type: string | null;
    causer_id: number | null;
    properties: any;
    created_at: string;
    updated_at: string;
    causer?: {
        id: number;
        name: string;
        email: string;
        created_at: string;
    };
    subject?: any;
}

interface Props {
    activity: ActivityDetail;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Activity Log',
        href: '/activity-log',
    },
    {
        title: 'Activity Details',
        href: '#',
    },
];

export default function Show({ activity }: Props) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const formatDate = useCallback((date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
        });
    }, []);

    const getEventBadgeColor = useCallback((event: string | null) => {
        const colors: Record<string, string> = {
            created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            updated: 'bg-blue-50 text-blue-700 border-blue-200',
            deleted: 'bg-red-50 text-red-700 border-red-200',
            login: 'bg-purple-50 text-purple-700 border-purple-200',
            logout: 'bg-gray-50 text-gray-700 border-gray-200',
        };
        return colors[event || ''] || 'bg-gray-50 text-gray-700 border-gray-200';
    }, []);

    const formatJson = useCallback((data: any) => {
        if (!data) return null;
        return JSON.stringify(data, null, 2);
    }, []);

    const copyToClipboard = useCallback(async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, []);

    const getLogTypeIcon = useCallback((logName: string) => {
        const icons: Record<string, any> = {
            default: Database,
            user: User,
            auth: Shield,
            system: Activity,
            content: FileText,
        };
        const IconComponent = icons[logName] || Database;
        return <IconComponent className="h-5 w-5" />;
    }, []);

    const hasProperties = activity.properties && Object.keys(activity.properties).length > 0;
    const hasOldValues = hasProperties && activity.properties.old;
    const hasNewValues = hasProperties && activity.properties.attributes;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Activity #${activity.id}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link
                                href={route('activity-log.index')}
                                className="mb-3 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Activity Log
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                                    <Eye className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Activity Details</h1>
                                    <p className="text-gray-600">Detailed view of activity #{activity.id}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge className={`${getEventBadgeColor(activity.event)} border px-3 py-1 font-medium`}>
                                {activity.event || activity.description}
                            </Badge>
                            <Button
                                variant="outline"
                                onClick={() => copyToClipboard(`Activity #${activity.id}: ${activity.description}`, 'summary')}
                                className="flex items-center gap-2"
                            >
                                {copiedField === 'summary' ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy Summary
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <Separator />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Basic Information */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {getLogTypeIcon(activity.log_name)}
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Activity ID</label>
                                    <p className="font-mono text-lg font-semibold text-gray-900">#{activity.id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Log Type</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        {getLogTypeIcon(activity.log_name)}
                                        <span className="font-semibold text-gray-900">{activity.log_name}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-500">Description</label>
                                <div className="mt-1 rounded-lg border bg-gray-50 p-3">
                                    <p className="font-medium text-gray-900">{activity.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Event Type</label>
                                    <p className="font-medium text-gray-900">{activity.event || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Created At</label>
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium">{formatDate(activity.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* User Information */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5 text-blue-600" />
                                User Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {activity.causer ? (
                                <>
                                    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{activity.causer.name || 'N/A'}</p>
                                            <p className="text-sm text-gray-600">{activity.causer.email || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">User ID</label>
                                            <p className="font-mono text-gray-900">{activity.causer_id}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">User Type</label>
                                            <p className="text-gray-900">{activity.causer_type?.split('\\').pop() || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {activity.causer.created_at && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">User Created</label>
                                            <div className="flex items-center gap-2 text-gray-900">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                                <span>{formatDate(activity.causer.created_at)}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-4">
                                    <AlertCircle className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">System Activity</p>
                                        <p className="text-sm text-gray-500">This activity was performed by the system</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Subject Information */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Database className="h-5 w-5 text-purple-600" />
                                Subject Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {activity.subject_type ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Subject Type</label>
                                            <p className="font-semibold text-purple-700">{activity.subject_type.split('\\').pop()}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Subject ID</label>
                                            <p className="font-mono text-gray-900">{activity.subject_id || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {activity.subject && (
                                        <div>
                                            <div className="mb-2 flex items-center justify-between">
                                                <label className="text-sm font-medium text-gray-500">Subject Data</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(formatJson(activity.subject) || '', 'subject')}
                                                    className="flex items-center gap-1"
                                                >
                                                    {copiedField === 'subject' ? (
                                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                            <div className="overflow-x-auto rounded-lg border bg-gray-50">
                                                <pre className="p-4 text-xs whitespace-pre-wrap text-gray-700">{formatJson(activity.subject)}</pre>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-4">
                                    <AlertCircle className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">No Subject</p>
                                        <p className="text-sm text-gray-500">This activity has no associated subject</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Properties */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Code className="h-5 w-5 text-green-600" />
                                Properties & Changes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {hasProperties ? (
                                <Tabs defaultValue={hasOldValues ? 'changes' : 'all'} className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        {hasOldValues && <TabsTrigger value="changes">Changes</TabsTrigger>}
                                        {hasOldValues && <TabsTrigger value="old">Old Values</TabsTrigger>}
                                        {hasNewValues && <TabsTrigger value="new">New Values</TabsTrigger>}
                                        {!hasOldValues && !hasNewValues && <TabsTrigger value="all">All Properties</TabsTrigger>}
                                    </TabsList>

                                    {hasOldValues && (
                                        <TabsContent value="changes" className="space-y-4">
                                            <div className="rounded-lg border">
                                                <div className="border-b bg-red-50 p-4">
                                                    <h4 className="font-medium text-red-800">Removed/Changed Values</h4>
                                                </div>
                                                <div className="p-4">
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="text-sm text-gray-500">Old Values</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyToClipboard(formatJson(activity.properties.old) || '', 'old')}
                                                        >
                                                            {copiedField === 'old' ? (
                                                                <CheckCircle className="h-3 w-3" />
                                                            ) : (
                                                                <Copy className="h-3 w-3" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <pre className="overflow-x-auto rounded border bg-red-50 p-3 text-xs text-red-800">
                                                        {formatJson(activity.properties.old)}
                                                    </pre>
                                                </div>
                                            </div>

                                            {hasNewValues && (
                                                <div className="rounded-lg border">
                                                    <div className="border-b bg-green-50 p-4">
                                                        <h4 className="font-medium text-green-800">New/Updated Values</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className="text-sm text-gray-500">New Values</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    copyToClipboard(formatJson(activity.properties.attributes) || '', 'new')
                                                                }
                                                            >
                                                                {copiedField === 'new' ? (
                                                                    <CheckCircle className="h-3 w-3" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <pre className="overflow-x-auto rounded border bg-green-50 p-3 text-xs text-green-800">
                                                            {formatJson(activity.properties.attributes)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>
                                    )}

                                    {hasOldValues && (
                                        <TabsContent value="old">
                                            <div className="mb-2 flex items-center justify-between">
                                                <label className="text-sm font-medium text-gray-500">Old Values</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(formatJson(activity.properties.old) || '', 'old')}
                                                >
                                                    {copiedField === 'old' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                            <pre className="overflow-x-auto rounded border bg-red-50 p-4 text-xs text-red-800">
                                                {formatJson(activity.properties.old)}
                                            </pre>
                                        </TabsContent>
                                    )}

                                    {hasNewValues && (
                                        <TabsContent value="new">
                                            <div className="mb-2 flex items-center justify-between">
                                                <label className="text-sm font-medium text-gray-500">New Values</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(formatJson(activity.properties.attributes) || '', 'new')}
                                                >
                                                    {copiedField === 'new' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                            <pre className="overflow-x-auto rounded border bg-green-50 p-4 text-xs text-green-800">
                                                {formatJson(activity.properties.attributes)}
                                            </pre>
                                        </TabsContent>
                                    )}

                                    {!hasOldValues && !hasNewValues && (
                                        <TabsContent value="all">
                                            <div className="mb-2 flex items-center justify-between">
                                                <label className="text-sm font-medium text-gray-500">All Properties</label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(formatJson(activity.properties) || '', 'all')}
                                                >
                                                    {copiedField === 'all' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                            <pre className="overflow-x-auto rounded border bg-gray-50 p-4 text-xs text-gray-700">
                                                {formatJson(activity.properties)}
                                            </pre>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            ) : (
                                <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-4">
                                    <AlertCircle className="h-8 w-8 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">No Properties</p>
                                        <p className="text-sm text-gray-500">This activity has no additional properties</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
