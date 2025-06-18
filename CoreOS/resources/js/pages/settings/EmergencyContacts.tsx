import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import {type BreadcrumbItem, EmergencyContact} from '@/types';
import {Head, useForm} from '@inertiajs/react';
import {BadgeCheckIcon, Edit, Mail, MapPin, Phone, Plus, Trash2, User} from 'lucide-react';
import React, {useState} from 'react';
import InputError from "@/components/input-error";

interface Props {
    emergencyContacts: EmergencyContact[];
}

const breadcrumbs: BreadcrumbItem[] = [

    { title: 'Emergency Contacts', href: '/emergency-contacts' },
];

export default function EmergencyContacts({ emergencyContacts }: Props) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

    const { data, setData, post, patch, reset, processing, errors, delete: destroy} = useForm({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
        is_primary: false as boolean,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingContact) {
            patch(route('emergency-contacts.update', editingContact.id), {
                onSuccess: () => {
                    reset();
                    setEditingContact(null);
                },
            })

        } else {
            post(route('emergency-contacts.store'), {
                onSuccess: () => {
                    reset();
                    setIsAddDialogOpen(false);
                },
            })

        }
    };

    const handleEdit = (contact: EmergencyContact) => {
        setData({
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            email: contact.email || '',
            address: contact.address || '',
            is_primary: contact.is_primary,

        });
        setEditingContact(contact);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to remove this emergency contact?')) {

            destroy(route('emergency-contacts.destroy', id), {
                onSuccess: () => {
                    reset();
                    setEditingContact(null);
                },
            })
        }
    };

    const closeDialog = () => {
        reset();
        setIsAddDialogOpen(false);
        setEditingContact(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Emergency Contacts" />
            <SettingsLayout>
            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Emergency Contacts</h1>
                        <p className="text-muted-foreground">Manage your emergency contact information</p>
                    </div>

                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Contact
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add Emergency Contact</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                                    <InputError className="mt-2" message={errors.name} />
                                </div>

                                <div>
                                    <Label htmlFor="relationship">Relationship</Label>
                                    <Input
                                        id="relationship"
                                        value={data.relationship}
                                        onChange={(e) => setData('relationship', e.target.value)}
                                        placeholder="e.g., Spouse, Parent, Sibling"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                                    <InputError className="mt-2" message={errors.phone} />
                                </div>

                                <div>
                                    <Label htmlFor="email">Email (Optional)</Label>
                                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                                </div>

                                <div>
                                    <Label htmlFor="address">Address (Optional)</Label>
                                    <Textarea id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_primary"
                                        checked={data.is_primary}
                                        onCheckedChange={(checked) => setData('is_primary', !!checked)}
                                    />
                                    <Label htmlFor="is_primary">Primary contact</Label>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline" onClick={closeDialog}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Add Contact
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {emergencyContacts.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <User className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="mb-2 text-lg font-medium">No emergency contacts</h3>
                            <p className="text-muted-foreground mb-4 text-center">Add emergency contacts so we can reach someone if needed.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
                        {emergencyContacts.map((contact) => (
                            <Card key={contact.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{contact.name}</CardTitle>
                                            <p className="text-muted-foreground text-sm">{contact.relationship}</p>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {contact.is_primary && (
                                                <Badge variant={"secondary"} className="bg-blue-500 text-white dark:bg-blue-600">
                                                    <BadgeCheckIcon />
                                                    Primary
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Phone className="text-muted-foreground h-4 w-4" />
                                        <span>{contact.phone}</span>
                                    </div>
                                    {contact.email && (
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Mail className="text-muted-foreground h-4 w-4" />
                                            <span>{contact.email}</span>
                                        </div>
                                    )}
                                    {contact.address && (
                                        <div className="flex items-start space-x-2 text-sm">
                                            <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                                            <span className="line-clamp-2">{contact.address}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}


                {/* Edit Dialog */}
                <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Emergency Contact</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="edit-name">Name</Label>
                                <Input id="edit-name" value={data.name} onChange={(e) => setData('name', e.target.value)}  />
                                <InputError className="mt-2" message={errors.name} />
                            </div>

                            <div>
                                <Label htmlFor="edit-relationship">Relationship</Label>
                                <Input
                                    id="edit-relationship"
                                    value={data.relationship}
                                    onChange={(e) => setData('relationship', e.target.value)}


                                />
                                <InputError className="mt-2" message={errors.relationship} />
                            </div>

                            <div>
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input id="edit-phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)}  />
                                <InputError className="mt-2" message={errors.phone} />
                            </div>

                            <div>
                                <Label htmlFor="edit-email">Email (Optional)</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}

                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-address">Address (Optional)</Label>
                                <Textarea
                                    id="edit-address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}

                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="edit-is_primary"
                                    checked={data.is_primary}
                                    onCheckedChange={(checked) => setData('is_primary', !!checked)}
                                />
                                <Label htmlFor="edit-is_primary">Primary contact</Label>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Update Contact
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
                </SettingsLayout>
        </AppLayout>
    );
}
