import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardSection } from './DashboardSection';

interface SectionManagerProps {
    sections: DashboardSection[];
    visualizations: Visualization[];
    activeVizId: string | null;
    onReorderSections: (sections: DashboardSection[]) => void;
    onUpdateSection: (sectionId: string, updates: Partial<DashboardSection>) => void;
    onDeleteSection: (sectionId: string) => void;
    onVisualizationClick: (vizId: string) => void;
    onAddVisualization: (sectionId: string, type?: string) => void;
}

// Sortable Section Wrapper
const SortableSection = ({
    section,
    visualizations,
    activeVizId,
    onUpdateSection,
    onDeleteSection,
    onVisualizationClick,
    onAddVisualization,
}: {
    section: DashboardSection;
    visualizations: Visualization[];
    activeVizId: string | null;
    onUpdateSection: (sectionId: string, updates: Partial<DashboardSection>) => void;
    onDeleteSection: (sectionId: string) => void;
    onVisualizationClick: (vizId: string) => void;
    onAddVisualization: (sectionId: string, type?: string) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <DashboardSection
                section={section}
                visualizations={visualizations}
                activeVizId={activeVizId}
                onUpdateSection={onUpdateSection}
                onDeleteSection={onDeleteSection}
                onVisualizationClick={onVisualizationClick}
                onAddVisualization={onAddVisualization}
                dragHandleProps={listeners}
            />
        </div>
    );
};

export const SectionManager = ({
    sections,
    visualizations,
    activeVizId,
    onReorderSections,
    onUpdateSection,
    onDeleteSection,
    onVisualizationClick,
    onAddVisualization,
}: SectionManagerProps) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((section) => section.id === active.id);
            const newIndex = sections.findIndex((section) => section.id === over.id);

            const reorderedSections = arrayMove(sections, oldIndex, newIndex);
            onReorderSections(reorderedSections);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-6">
                    {sections.map((section) => (
                        <SortableSection
                            key={section.id}
                            section={section}
                            visualizations={visualizations}
                            activeVizId={activeVizId}
                            onUpdateSection={onUpdateSection}
                            onDeleteSection={onDeleteSection}
                            onVisualizationClick={onVisualizationClick}
                            onAddVisualization={onAddVisualization}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
