import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Copy, ExternalLink, Eye, MoreVertical, Trash2 } from 'lucide-react';

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
