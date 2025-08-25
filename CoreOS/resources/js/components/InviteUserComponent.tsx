import React from 'react';
import {Link} from '@inertiajs/react';
import {Button} from "@/components/ui/button";
import {UserPlus} from 'lucide-react';

interface InviteUserComponentProps {
    buttonText?: string;
    buttonStyle?: React.CSSProperties;
    onUserInvited?: (userId: number, userName: string, userEmail: string) => void;
}

const InviteUserComponent: React.FC<InviteUserComponentProps> = () => {
    return (
        <Link href="/human-resources/onboard">
            <Button variant="secondary">
                <UserPlus className="mr-2 h-4 w-4" />
                Onboard Employee
            </Button>
        </Link>
    );
};

export default InviteUserComponent;
