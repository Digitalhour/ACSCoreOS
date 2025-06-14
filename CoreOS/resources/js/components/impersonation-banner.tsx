import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SharedData } from '@/types';
import { Link as InertiaLink, usePage } from '@inertiajs/react';
import { AlertCircleIcon } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
}
interface ImpersonationBannerProps {
    variant?: 'default' | 'header';
}
export function ImpersonationBanner({ variant = 'default' }: ImpersonationBannerProps) {
    const isImpersonating = Boolean(usePage<SharedData>().props?.isImpersonating);

    if (!isImpersonating) {
        return null;
    }

    const isHeader = variant === 'header';

    return (
        <div className={`${isHeader ? ' px-3 py-1 ' : ''}`}>
            <Badge
                asChild
                variant={isHeader ? 'secondary' : 'destructive'}

            >
                <InertiaLink href="/impersonate/leave">
                    Leave Impersonation
                </InertiaLink>
            </Badge>
        </div>
    );
}
export function ImpersonationBannerHome() {
    const { isImpersonating } = usePage<SharedData>().props;

    if (!isImpersonating) {
        return null;
    }

    return (
        // <div className="">
        //     <Badge asChild variant="destructive">
        //         <InertiaLink href="/impersonate/leave">Bye fucker Impersonation</InertiaLink>
        //     </Badge>
        // </div>

        <div className="w-full max-w-xl items-start">
            <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>You are currently Impersonating an employee. </AlertTitle>
                <AlertDescription>
                    <p>This should only be used for debugging purposes. </p>
                    <p>
                        If you done this by mistake please switch back to your profile by{' '}
                        <InertiaLink className="font-bold text-blue-500 underline" href="/impersonate/leave">
                            Leave Impersonation
                        </InertiaLink>
                    </p>
                    <ul className="list-inside list-disc text-sm">
                        <li>Your actions are being tracked</li>

                        <li>Admins have been notified of your current status</li>
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    );
}
