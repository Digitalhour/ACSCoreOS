import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, Link, router} from '@inertiajs/react';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {BatteryFullIcon, FilterIcon, RefreshCwIcon, ThermometerIcon, WifiIcon} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';

// Interface for a single device, representing its latest status
interface Device {
    id: number;
    device_id: string | null;
    name: string | null; // Added name property
    signal_strength: number | null;
    battery_soc: number | null;
    temperature: number | null;
    created_at: string;
}

// Interface for the paginated response from the controller
interface PaginatedDevices {
    data: Device[];
    current_page: number;
    last_page: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

// Interface for filter parameters
interface DeviceFilters {
    search?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    devices: PaginatedDevices;
    filters: DeviceFilters;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Vibetrack Devices', href: '/vibetrack' },
];

// A component for displaying an individual device card
const DeviceCard = ({ device }: { device: Device }) => {
    return (
        <Link href={`/vibetrack/${device.id}`} className="block">
            <Card className="h-full flex flex-col hover:border-primary/80 hover:shadow-lg transition-all duration-200">
                <CardHeader>
                    <CardTitle className="truncate">{device.name || device.device_id}</CardTitle>
                    <CardDescription>
                        {device.name ? <span className="font-mono">{device.device_id} </span>  : <span>Last seen: {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}</span>}

                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">

                    <div className="flex items-center gap-3">
                        <WifiIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{device.signal_strength ?? 'N/A'} dBm</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <BatteryFullIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{device.battery_soc?.toFixed(1) ?? 'N/A'}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThermometerIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{device.temperature ?? 'N/A'} °F</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="secondary" className="w-full">View Details</Button>
                </CardFooter>
            </Card>
        </Link>
    );
};

export default function VibetrackIndex({ devices, filters }: Props) {
    const [localFilters, setLocalFilters] = useState<DeviceFilters>(filters);

    const applyFilters = () => {
        router.get('/vibetrack', localFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({});
        router.get('/vibetrack', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vibetrack Devices" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 p-4">

                {/* Filters Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FilterIcon className="h-4 w-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                placeholder="Search by Name or Device ID..."
                                value={localFilters.search || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            />
                            <Input
                                type="date"
                                value={localFilters.date_from || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value || undefined })}
                            />
                            <Input
                                type="date"
                                value={localFilters.date_to || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value || undefined })}
                            />
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button onClick={applyFilters}>Apply Filters</Button>
                            <Button variant="outline" onClick={clearFilters}>Clear</Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.reload()}
                                className="ml-auto"
                            >
                                <RefreshCwIcon className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Devices Grid */}
                <div className="flex-grow overflow-y-auto pr-2">
                    {devices.data.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {devices.data.map(device => (
                                <DeviceCard key={device.id} device={device} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/30 rounded-lg">
                            No devices found matching your criteria.
                        </div>
                    )}
                </div>


                {/* Pagination */}
                {devices.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-4 flex-shrink-0">
                        {devices.links.map((link, index) =>
                            link.url ? (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => router.visit(link.url!, { preserveState: true, preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={index}
                                    className="px-3 py-1.5 text-sm text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            )
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
