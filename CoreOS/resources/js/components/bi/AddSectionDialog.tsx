import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BarChart3, Grid3X3, Layout, Plus, Sidebar } from 'lucide-react';
import { useState } from 'react';

interface AddSectionDialogProps {
    onAddSection: (section: Omit<DashboardSection, 'id' | 'createdAt' | 'updatedAt' | 'visualizationIds'>) => void;
    trigger?: React.ReactNode;
}

export const AddSectionDialog = ({ onAddSection, trigger }: AddSectionDialogProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        layout: 'grid' as DashboardSection['layout'],
    });

    const handleSubmit = () => {
        if (form.title.trim()) {
            onAddSection({
                title: form.title.trim(),
                description: form.description.trim(),
                layout: form.layout,
            });
            setForm({ title: '', description: '', layout: 'grid' });
            setIsOpen(false);
        }
    };

    const layoutOptions = [
        {
            value: 'grid' as const,
            label: 'Grid Layout',
            description: 'Multiple charts arranged in a responsive grid',
            icon: Grid3X3,
        },
        {
            value: 'single' as const,
            label: 'Single Column',
            description: 'Charts stacked vertically in one column',
            icon: Layout,
        },
        {
            value: 'sidebar' as const,
            label: 'Sidebar Layout',
            description: 'Main content with sidebar arrangement',
            icon: Sidebar,
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Section
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Dashboard Section</DialogTitle>
                    <DialogDescription>Add a new section to organize your visualizations</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Section Title</Label>
                        <Input
                            id="title"
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g., Sales Overview, Performance Metrics"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe what this section will contain..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Choose Layout</Label>
                        <div className="grid gap-3">
                            {layoutOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <Card
                                        key={option.value}
                                        className={`cursor-pointer transition-colors ${
                                            form.layout === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => setForm((prev) => ({ ...prev, layout: option.value }))}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start space-x-3">
                                                <div
                                                    className={`mt-0.5 h-4 w-4 rounded-full border-2 ${
                                                        form.layout === option.value ? 'border-primary bg-primary' : 'border-muted-foreground'
                                                    }`}
                                                />
                                                <Icon className="text-muted-foreground mt-0.5 h-5 w-5" />
                                                <div className="flex-1">
                                                    <CardTitle className="text-sm">{option.label}</CardTitle>
                                                    <CardDescription className="mt-1 text-xs">{option.description}</CardDescription>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button onClick={handleSubmit} disabled={!form.title.trim()} className="flex-1">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Create Section
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
