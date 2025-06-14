import React from 'react';
// Shadcn UI imports - ensure these paths are correct for your setup
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Interface for the hierarchical data structure
export interface UserNodeData {
    id: string | number;
    name: string;
    position?: string;
    avatar?: string;
    children: UserNodeData[];
}

// Props for the OrgChartNode component
interface OrgChartNodeProps {
    node: UserNodeData;
    isFirstChildInGroup?: boolean; // Is this the first child in its sibling group?
    isLastChildInGroup?: boolean; // Is this the last child in its sibling group?
    siblingCountInGroup?: number; // How many siblings (including itself) in its group?
    isRootLevelNode?: boolean; // Is this a node directly rendered by OrgChartPage?
}

const OrgChartNode: React.FC<OrgChartNodeProps> = ({
    node,
    isFirstChildInGroup = false,
    isLastChildInGroup = false,
    siblingCountInGroup = 0,
    isRootLevelNode = false,
}) => {
    const hasChildren = node.children && node.children.length > 0;
    const cardId = `org-node-${node.id}`;

    return (
        // Each node group is an inline-flex element, allowing them to sit side-by-side.
        // It's a column for the card and its children's branch.
        // align-top ensures that sibling nodes align at their tops.
        <div className="relative inline-flex flex-col items-center px-1 align-top sm:px-2">
            {/* --- Connectors FROM Parent TO this Node's Card --- */}
            {/* This section draws the lines connecting this node to its parent's horizontal line. */}
            {!isRootLevelNode && (
                <>
                    {/* Vertical line from parent's horizontal bar down to this node's card's horizontal connector. */}
                    {/* This line effectively sits on top of the horizontal connector part. */}
                    <div className="absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 transform bg-slate-400 dark:bg-slate-600"></div>

                    {/* Horizontal line part of the "T" connector from parent. */}
                    {/* This line extends from the center of this node outwards. */}
                    {/* Only draw if part of a group of siblings (siblingCountInGroup > 1). */}
                    {/* If it's a single child, no horizontal part is needed from its perspective. */}
                    {siblingCountInGroup > 1 && (
                        <div
                            className="absolute top-0 h-px bg-slate-400 dark:bg-slate-600"
                            // If first child, line goes from center to right.
                            // If last child, line goes from center to left.
                            // If middle child, line goes fully left to right.
                            style={{
                                left: isFirstChildInGroup ? '50%' : '0%', // For middle or last, line starts from left edge of its allocated space
                                right: isLastChildInGroup ? '50%' : '0%', // For middle or first, line starts from right edge
                                width: isFirstChildInGroup || isLastChildInGroup ? '50%' : '100%', // Half width for ends, full for middle
                            }}
                        ></div>
                    )}
                </>
            )}

            {/* User Card */}
            {/* Margin top is added if it's a child node, to make space for the incoming connector lines. */}
            <div className={`mt-4 ${isRootLevelNode ? 'mt-0' : ''}`} id={cardId}>
                <Card className="bg-card text-card-foreground border-border hover:border-primary/50 dark:hover:border-primary/70 max-w-[220px] min-w-[170px] rounded-xl border shadow-lg transition-all duration-300 hover:shadow-xl sm:min-w-[200px]">
                    <CardHeader className="p-3 text-center sm:p-4">
                        <div className="mb-2 flex justify-center sm:mb-3">
                            <Avatar className="border-primary/30 dark:border-primary/50 h-16 w-16 border-2 text-lg sm:h-20 sm:w-20 sm:text-xl">
                                <AvatarImage
                                    src={node.avatar} // Avatar URL from data
                                    alt={node.name}
                                    onError={(e) => {
                                        // Fallback for broken avatar links
                                        const target = e.currentTarget;
                                        target.onerror = null; // Prevent infinite loop
                                        target.src = `https://placehold.co/80x80/e2e8f0/4a5568?text=${encodeURIComponent(
                                            node.name
                                                .split(' ')
                                                .map((n) => n[0])
                                                .join('')
                                                .toUpperCase(),
                                        )}`;
                                    }}
                                />
                                <AvatarFallback className="font-semibold">
                                    {node.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle className="text-[0.9rem] leading-tight font-semibold sm:text-base">{node.name}</CardTitle>
                        {node.position && (
                            <CardDescription className="text-muted-foreground mt-1 px-1 text-[0.7rem] sm:text-xs">{node.position}</CardDescription>
                        )}
                    </CardHeader>
                </Card>
            </div>

            {/* --- Connectors FROM this Node TO its Children & Children Row --- */}
            {hasChildren && (
                <>
                    {/* Vertical line from this card down towards its children's horizontal bar. */}
                    <div className="h-4 w-px bg-slate-400 dark:bg-slate-600"></div>

                    {/* Children's flex container. whitespace-nowrap helps keep children in a single row if space is tight. */}
                    {/* items-start ensures children align at their top (where their connectors start). */}
                    <div className="flex items-start justify-center whitespace-nowrap">
                        {node.children.map((childNode, index) => (
                            <OrgChartNode
                                key={childNode.id}
                                node={childNode}
                                isFirstChildInGroup={index === 0}
                                isLastChildInGroup={index === node.children.length - 1}
                                siblingCountInGroup={node.children.length}
                                isRootLevelNode={false} // Children are never root level in this recursive call
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default OrgChartNode;
