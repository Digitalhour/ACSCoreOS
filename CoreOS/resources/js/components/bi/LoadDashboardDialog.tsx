import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
