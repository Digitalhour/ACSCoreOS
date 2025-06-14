// components/bi/SaveDashboardDialog.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { useState } from 'react';

interface SaveDashboardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SaveDashboardData) => void;
    currentDashboard?: any;
}

interface SaveDashboardData {
    name: string;
    description: string;
    is_public: boolean;
}

export const SaveDashboardDialog = ({ isOpen, onClose, onSave, currentDashboard }: SaveDashboardDialogProps) => {
    const [form, setForm] = useState({
        name: currentDashboard?.name || '',
        description: currentDashboard?.description || '',
        is_public: currentDashboard?.is_public || false,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!form.name.trim()) return;

        setIsLoading(true);
        try {
            await onSave(form);
            onClose();
            setForm({ name: '', description: '', is_public: false });
        } catch (error) {
            console.error('Failed to save dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Save Dashboard</DialogTitle>
                    <DialogDescription>Save your current dashboard configuration to access it later</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="dashboard-name">Dashboard Name</Label>
                        <Input
                            id="dashboard-name"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Sales Overview Dashboard"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dashboard-description">Description (Optional)</Label>
                        <Textarea
                            id="dashboard-description"
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe what this dashboard shows..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="public-dashboard"
                            checked={form.is_public}
                            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_public: checked }))}
                        />
                        <Label htmlFor="public-dashboard">Make this dashboard public</Label>
                    </div>

                    {form.is_public && (
                        <div className="text-muted-foreground bg-muted rounded p-3 text-sm">
                            <p>Public dashboards can be viewed by anyone with the link, even without logging in.</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={!form.name.trim() || isLoading} className="flex-1">
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? 'Saving...' : 'Save Dashboard'}
                    </Button>
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// components/bi/LoadDashboardDialog.tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Eye, Globe, Lock } from 'lucide-react';

interface LoadDashboardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    savedDashboards: SavedDashboard[];
    onLoad: (slug: string) => void;
}

interface SavedDashboard {
    id: number;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
    is_public: boolean;
}

export const LoadDashboardDialog = ({ isOpen, onClose, savedDashboards, onLoad }: LoadDashboardDialogProps) => {
    const handleLoad = (slug: string) => {
        onLoad(slug);
        onClose();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Load Saved Dashboard</DialogTitle>
                    <DialogDescription>Choose a previously saved dashboard to load</DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-96">
                    <div className="space-y-3">
                        {savedDashboards.length > 0 ? (
                            savedDashboards.map((dashboard) => (
                                <Card
                                    key={dashboard.id}
                                    className="hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => handleLoad(dashboard.slug)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <h3 className="font-medium">{dashboard.name}</h3>
                                                    {dashboard.is_public ? (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <Globe className="mr-1 h-3 w-3" />
                                                            Public
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs">
                                                            <Lock className="mr-1 h-3 w-3" />
                                                            Private
                                                        </Badge>
                                                    )}
                                                </div>
                                                {dashboard.description && (
                                                    <p className="text-muted-foreground mb-2 text-sm">{dashboard.description}</p>
                                                )}
                                                <div className="text-muted-foreground flex items-center text-xs">
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    {formatDate(dashboard.created_at)}
                                                </div>
                                            </div>
                                            <Eye className="text-muted-foreground h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="text-muted-foreground py-8 text-center">
                                <p>No saved dashboards found</p>
                                <p className="text-sm">Create and save your first dashboard to see it here</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// components/bi/DashboardSuccessDialog.tsx
import { CheckCircle, Copy, ExternalLink } from 'lucide-react';

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

// components/bi/DashboardManager.tsx
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';

interface DashboardManagerProps {
    savedDashboards: SavedDashboard[];
    onLoad: (slug: string) => void;
    onDelete: (id: number) => void;
}

export const DashboardManager = ({ savedDashboards, onLoad, onDelete }: DashboardManagerProps) => {
    const copyToClipboard = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            // Could add toast notification here
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Saved Dashboards</h3>
                <Badge variant="secondary">{savedDashboards.length} dashboards</Badge>
            </div>

            {savedDashboards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {savedDashboards.map((dashboard) => (
                        <Card key={dashboard.id} className="group">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-base">{dashboard.name}</CardTitle>
                                        <div className="mt-1 flex items-center gap-2">
                                            {dashboard.is_public ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    Public
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">
                                                    Private
                                                </Badge>
                                            )}
                                            <span className="text-muted-foreground text-xs">{formatDate(dashboard.created_at)}</span>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onLoad(dashboard.slug)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Load Dashboard
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => copyToClipboard(`/bi/dashboard/${dashboard.slug}`)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copy Link
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => window.open(`/bi/dashboard/${dashboard.slug}`, '_blank')}>
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open in New Tab
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDelete(dashboard.id)} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {dashboard.description && <CardDescription className="text-sm">{dashboard.description}</CardDescription>}
                                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onLoad(dashboard.slug)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Load Dashboard
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8">
                    <div className="text-muted-foreground text-center">
                        <p>No saved dashboards yet</p>
                        <p className="text-sm">Create your first dashboard and save it to see it here</p>
                    </div>
                </Card>
            )}
        </div>
    );
};
