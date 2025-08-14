import React from 'react';
import {HoverCard, HoverCardContent, HoverCardTrigger} from '@/components/ui/hover-card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {ImageOff, ShoppingCart, Store, Wrench} from 'lucide-react';
import {Part} from './types';
import {slugify} from './utils';

interface PartHoverCardProps {
    part: Part;
    children: React.ReactNode;
}

/**
 * Enhanced Hover Card Component for Parts with Shopify image
 */
const PartHoverCard: React.FC<PartHoverCardProps> = ({ part, children }) => {
    return (
        <HoverCard openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>{children}</HoverCardTrigger>
            <HoverCardContent className="w-80 border shadow-gray-500 dark:shadow-gray-700">
                <div className="space-y-3">
                    {/* Images - showing both original and Shopify if available */}
                    <div className="flex justify-center space-x-2">
                        {/* Original image */}
                        <div className="flex flex-col items-center space-y-1">
                            {part.image_url ? (
                                <img src={part.image_url} alt={part.part_number || 'Part Image'} className="h-32 w-32 rounded-lg object-cover" />
                            ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                                    <ImageOff size={24} />
                                </div>
                            )}
                            <span className="text-xs text-gray-500">Manual</span>
                        </div>

                        {/* Shopify image */}
                        {part.shopify_image && (
                            <div className="flex flex-col items-center space-y-1">
                                <img src={part.shopify_image} alt={`${part.part_number} - Shopify`} className="h-32 w-32 rounded-lg object-cover" />
                                <div className="flex items-center space-x-1">
                                    <ShoppingCart size={10} className="text-gray-500" />
                                    <span className="text-xs text-gray-500">Shopify</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Part Details */}
                    <div className="space-y-2">
                        <div>
                            <h4 className="text-sm font-semibold">{part.part_number || 'N/A'}</h4>
                            <p className="text-muted-foreground text-xs">{part.part_type || 'Unknown Type'}</p>
                        </div>

                        {part.description && <p className="text-muted-foreground line-clamp-2 text-xs">{part.description}</p>}

                        <Separator />

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="font-medium">Manufacturer:</span>
                                <p className="text-muted-foreground">{part.manufacture || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="font-medium">Category:</span>
                                <p className="text-muted-foreground">{part.part_category || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="font-medium">Quantity:</span>
                                <p className="text-muted-foreground">{part.quantity || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="font-medium">Location:</span>
                                <p className="text-muted-foreground">{part.part_location || 'N/A'}</p>
                            </div>
                        </div>

                        {part.models && part.models.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <span className="text-xs font-medium">Compatible Models:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {part.models.slice(0, 5).map((model, index) => (
                                            <Badge key={index} variant="secondary" className="py-0 text-xs">
                                                {model}
                                            </Badge>
                                        ))}
                                        {part.models.length > 5 && (
                                            <Badge variant="outline" className="py-0 text-xs">
                                                +{part.models.length - 5}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {part.has_shopify_match && part.nsproduct_match && part.nsproduct_match.name && (
                            <>
                                <Separator />
                                <p className="flex justify-between">
                                    <Button asChild variant="outline">
                                        <a
                                            href={`${slugify(part.nsproduct_match.storefront_url)}`}
                                            target={'_blank'}
                                        >
                                            <Store className="h-3 w-3" />
                                            ACS Store
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <a
                                            href={`https://admin.shopify.com/store/aircompressorservices/products/${part.nsproduct_match.shop_id}`}
                                            target={'_blank'}
                                        >
                                            <Wrench className="h-3 w-3" />
                                            Shopify Admin
                                        </a>
                                    </Button>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};

export default PartHoverCard;
