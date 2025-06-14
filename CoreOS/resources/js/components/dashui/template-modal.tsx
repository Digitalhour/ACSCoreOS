import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Template {
    id: string;
    name: string;
    description: string;
    preview: string;
    widgets: any[];
}

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: Template[];
    onSelectTemplate: (template: Template) => void;
}

export function TemplateModal({ isOpen, onClose, templates, onSelectTemplate }: TemplateModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Choose a Template</DialogTitle>
                    <DialogDescription>Start with a pre-built dashboard layout</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            className="cursor-pointer transition-colors hover:bg-gray-50"
                            onClick={() => onSelectTemplate(template)}
                        >
                            <CardContent className="p-4">
                                <div className="mb-3 text-center">
                                    <div className="mb-2 text-3xl">{template.preview}</div>
                                    <h3 className="font-medium">{template.name}</h3>
                                    <p className="text-sm text-gray-600">{template.description}</p>
                                </div>
                                <Badge variant="outline" className="w-full justify-center">
                                    {template.widgets.length} widgets
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
