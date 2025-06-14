import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Download, Filter, Mail, MapPin, Phone, Search, UserCheck, Users, X } from 'lucide-react';
import { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface EmergencyContact {
    id: number;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
    user: User;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedContacts {
    data: EmergencyContact[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
}

interface Props {
    emergencyContacts: PaginatedContacts;
    filters: {
        search?: string;
        primary_only?: boolean;
    };
    totalCount: number;
    primaryCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Admin', href: '/admin' },
    { title: 'Emergency Contacts', href: '/admin/emergency-contacts' },
];

export default function AdminEmergencyContacts({ emergencyContacts, filters, totalCount, primaryCount }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [primaryOnly, setPrimaryOnly] = useState(filters.primary_only || false);

    const handleSearch = () => {
        router.get(
            '/admin/emergency-contacts',
            {
                search: search || undefined,
                primary_only: primaryOnly || undefined,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (primaryOnly) params.append('primary_only', '1');

        window.location.href = `/admin/emergency-contacts/export?${params.toString()}`;
    };

    const clearFilters = () => {
        setSearch('');
        setPrimaryOnly(false);
        router.get(
            '/admin/emergency-contacts',
            {},
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const hasFilters = search || primaryOnly;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin - Emergency Contacts" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Emergency Contacts</h1>
                        <p className="text-muted-foreground">View and export all user emergency contacts</p>
                    </div>

                    <Button onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                            <Users className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalCount}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Primary Contacts</CardTitle>
                            <UserCheck className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{primaryCount}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                                    <X className="mr-1 h-4 w-4" />
                                    Clear
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <Label htmlFor="search">Search</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="search"
                                        placeholder="Search by name, phone, email, or user..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button onClick={handleSearch}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox id="primary_only" checked={primaryOnly} onCheckedChange={(checked) => setPrimaryOnly(!!checked)} />
                                <Label htmlFor="primary_only">Primary only</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <Card>
                    <CardHeader>
                        <CardTitle>Emergency Contacts ({emergencyContacts.total} total)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {emergencyContacts.data.length === 0 ? (
                            <div className="py-8 text-center">
                                <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                <p className="text-muted-foreground">No emergency contacts found</p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Relationship</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {emergencyContacts.data.map((contact) => (
                                            <TableRow key={contact.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{contact.user.name}</div>
                                                        <div className="text-muted-foreground text-sm">{contact.user.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{contact.name}</div>
                                                </TableCell>
                                                <TableCell>{contact.relationship}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="text-muted-foreground h-3 w-3" />
                                                        {contact.phone}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {contact.email && (
                                                        <div className="flex items-center gap-1">
                                                            <Mail className="text-muted-foreground h-3 w-3" />
                                                            {contact.email}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {contact.address && (
                                                        <div className="flex max-w-xs items-start gap-1">
                                                            <MapPin className="text-muted-foreground mt-0.5 h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate text-sm">{contact.address}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>{contact.is_primary && <Badge variant="secondary">Primary</Badge>}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{new Date(contact.created_at).toLocaleDateString()}</div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {emergencyContacts.last_page > 1 && (
                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="text-muted-foreground text-sm">
                                            Showing {(emergencyContacts.current_page - 1) * emergencyContacts.per_page + 1} to{' '}
                                            {Math.min(emergencyContacts.current_page * emergencyContacts.per_page, emergencyContacts.total)} of{' '}
                                            {emergencyContacts.total} results
                                        </div>

                                        <div className="flex gap-2">
                                            {emergencyContacts.links.map((link, index) => {
                                                if (!link.url) return null;

                                                return (
                                                    <Button
                                                        key={index}
                                                        variant={link.active ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => router.visit(link.url!)}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
