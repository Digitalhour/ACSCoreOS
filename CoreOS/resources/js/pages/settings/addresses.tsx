import {type BreadcrumbItem} from '@/types';
import {Transition} from '@headlessui/react';
import {Head, router, useForm} from '@inertiajs/react';
import {FormEventHandler, useState} from 'react';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {Badge} from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import {AlertTriangle, Building, Edit, Home, MapPin, Plus, Shield, Trash2} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings',
    },
    {
        title: 'Addresses',
        href: '/settings/addresses',
    },
];

interface Address {
    id: number;
    type: string;
    label: string | null;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_primary: boolean;
    is_active: boolean;
    notes: string | null;
    full_address: string;
    single_line_address: string;
    created_at: string;
    updated_at: string;
}

type AddressForm = {
    type: string;
    label: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_primary: boolean;
    is_active: boolean;
    notes: string;
};

const commonAddressTypes = [
    'Home',
    'Mailing',
    'Work',
    'Emergency',
    'Temporary',
    'Billing',
    'Shipping',
    'Other'
];

const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function Addresses({ addresses }: { addresses: Address[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    const { data, setData, post, put, errors, processing, recentlySuccessful, reset } = useForm<AddressForm>({
        type: '',
        label: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'United States',
        is_primary: false,
        is_active: true,
        notes: '',
    });

    const openAddDialog = () => {
        reset();
        setEditingAddress(null);
        setData({
            type: '',
            label: '',
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'United States',
            is_primary: addresses.length === 0, // First address should be primary
            is_active: true,
            notes: '',
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (address: Address) => {
        setEditingAddress(address);
        setData({
            type: address.type,
            label: address.label || '',
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || '',
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: address.country,
            is_primary: address.is_primary,
            is_active: address.is_active,
            notes: address.notes || '',
        });
        setIsDialogOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (editingAddress) {
            put(route('settings.addresses.update', editingAddress.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDialogOpen(false);
                    reset();
                    setEditingAddress(null);
                }
            });
        } else {
            post(route('settings.addresses.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDialogOpen(false);
                    reset();
                }
            });
        }
    };

    const deleteAddress = (addressId: number) => {
        if (confirm('Are you sure you want to delete this address?')) {
            router.delete(route('settings.addresses.destroy', addressId), {
                preserveScroll: true,
            });
        }
    };

    const setPrimary = (addressId: number) => {
        router.patch(route('settings.addresses.set-primary', addressId), {}, {
            preserveScroll: true,
        });
    };

    const toggleActive = (addressId: number) => {
        router.patch(route('settings.addresses.toggle-active', addressId), {}, {
            preserveScroll: true,
        });
    };

    const getAddressIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'home':
                return <Home className="h-4 w-4" />;
            case 'work':
                return <Building className="h-4 w-4" />;
            case 'emergency':
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <MapPin className="h-4 w-4" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Address Settings" />

            <SettingsLayout>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <HeadingSmall
                            title="Address Management"
                            description="Manage your home, work, and mailing addresses"
                        />
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={openAddDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Address
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingAddress ? 'Edit Address' : 'Add New Address'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingAddress ? 'Update the address details below.' : 'Fill in the address details below.'}
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={submit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="type">Address Type *</Label>
                                            <Select value={data.type} onValueChange={(value) => setData('type', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select address type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {commonAddressTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.type} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="label">Custom Label</Label>
                                            <Input
                                                id="label"
                                                value={data.label}
                                                onChange={(e) => setData('label', e.target.value)}
                                                placeholder="e.g., Summer Home, Office"
                                            />
                                            <InputError message={errors.label} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address_line_1">Address Line 1 *</Label>
                                        <Input
                                            id="address_line_1"
                                            value={data.address_line_1}
                                            onChange={(e) => setData('address_line_1', e.target.value)}
                                            placeholder="Street address"
                                            required
                                        />
                                        <InputError message={errors.address_line_1} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address_line_2">Address Line 2</Label>
                                        <Input
                                            id="address_line_2"
                                            value={data.address_line_2}
                                            onChange={(e) => setData('address_line_2', e.target.value)}
                                            placeholder="Apartment, suite, unit, etc."
                                        />
                                        <InputError message={errors.address_line_2} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="city">City *</Label>
                                            <Input
                                                id="city"
                                                value={data.city}
                                                onChange={(e) => setData('city', e.target.value)}
                                                required
                                            />
                                            <InputError message={errors.city} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="state">State *</Label>
                                            <Select value={data.state} onValueChange={(value) => setData('state', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="State" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {usStates.map((state) => (
                                                        <SelectItem key={state} value={state}>
                                                            {state}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.state} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="postal_code">ZIP Code *</Label>
                                            <Input
                                                id="postal_code"
                                                value={data.postal_code}
                                                onChange={(e) => setData('postal_code', e.target.value)}
                                                required
                                            />
                                            <InputError message={errors.postal_code} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country *</Label>
                                        <Input
                                            id="country"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.country} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder="Additional notes about this address"
                                            rows={3}
                                        />
                                        <InputError message={errors.notes} />
                                    </div>

                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is_primary"
                                                checked={data.is_primary}
                                                onCheckedChange={(checked) => setData('is_primary', checked)}
                                            />
                                            <Label htmlFor="is_primary">Primary Address</Label>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is_active"
                                                checked={data.is_active}
                                                onCheckedChange={(checked) => setData('is_active', checked)}
                                            />
                                            <Label htmlFor="is_active">Active</Label>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            {processing ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {addresses.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses yet</h3>
                                <p className="text-gray-500 mb-4">
                                    Add your first address to get started
                                </p>
                                <Button onClick={openAddDialog}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Your First Address
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 grid-cols-3">
                            {addresses.map((address) => (
                                <Card key={address.id} className={`${!address.is_active ? 'opacity-60' : ''}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                {getAddressIcon(address.type)}
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        {address.label || address.type}
                                                        {address.label && address.label !== address.type && (
                                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                                ({address.type})
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                </div>
                                                <div className="flex space-x-2">
                                                    {address.is_primary && (
                                                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            Primary
                                                        </Badge>
                                                    )}
                                                    {!address.is_active && (
                                                        <Badge variant="secondary">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(address)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => deleteAddress(address.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm dark:text-gray-200 whitespace-pre-line">
                                                    {address.full_address}
                                                </p>
                                                {address.notes && (
                                                    <p className="text-sm text-gray-500 mt-2 italic">
                                                        {address.notes}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                                {!address.is_primary && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setPrimary(address.id)}
                                                    >
                                                        Set as Primary
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleActive(address.id)}
                                                >
                                                    {address.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-green-600">Address saved successfully!</p>
                    </Transition>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
