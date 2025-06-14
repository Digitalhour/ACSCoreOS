import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface DashboardSuccessDialogProps {
    isOpen: boolean;
    onClose: () => void;
    dashboard: {
        name: string;
        url: string;
        public_url?: string;
    } | null;
}

export const DashboardSuccessDialog = ({ isOpen, onClose, dashboard }: DashboardSuccessDialogProps) => {
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const copyToClipboard = async (url: string, type: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(type);
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    if (!dashboard) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Dashboard Saved Successfully!
                    </DialogTitle>
                    <DialogDescription>Your dashboard "{dashboard.name}" has been saved and is ready to share</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Dashboard URL</Label>
                        <div className="flex gap-2">
                            <Input value={dashboard.url} readOnly className="flex-1" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(dashboard.url, 'private')}>
                                {copiedUrl === 'private' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => window.open(dashboard.url, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {dashboard.public_url && (
                        <div className="space-y-2">
                            <Label>Public URL (No login required)</Label>
                            <div className="flex gap-2">
                                <Input value={dashboard.public_url} readOnly className="flex-1" />
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(dashboard.public_url!, 'public')}>
                                    {copiedUrl === 'public' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => window.open(dashboard.public_url, '_blank')}>
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button onClick={onClose}>Done</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
