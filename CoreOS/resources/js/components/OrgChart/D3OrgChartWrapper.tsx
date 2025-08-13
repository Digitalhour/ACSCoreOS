import {ProcessedUser} from '@/pages/Organization/OrganizationChartPage'; // Use ProcessedUser type
import * as d3 from 'd3';
import {OrgChart} from 'd3-org-chart';
import React, {useLayoutEffect, useRef} from 'react';

interface D3OrgChartWrapperProps {
    data: ProcessedUser[];
}

const D3OrgChartWrapper: React.FC<D3OrgChartWrapperProps> = ({ data }) => {
    const d3Container = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<OrgChart<any> | null>(null); // Type as OrgChart from d3-org-chart

    function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const debounced = (...args: Parameters<F>) => {
            if (timeout !== null) {
                clearTimeout(timeout);
                timeout = null;
            }
            timeout = setTimeout(() => func(...args), waitFor);
        };
        return debounced;
    }

    useLayoutEffect(() => {
        if (!d3Container.current) return;

        if (!(data && data.length > 0) && d3Container.current) {
            d3.select(d3Container.current).selectAll('*').remove();
            return;
        }

        if (data && data.length > 0) {
            if (!chartRef.current) {
                chartRef.current = new OrgChart();
            }

            const roleColors: { [key: string]: string } = {
                management: '#718096',
                tech: '#4299E1',
                sales: '#48BB78',
                marketing: '#ED8936',
                operations: '#9F7AEA',
                default: '#A0AEC0',
            };

            try {
                // Configure chart properties
                chartRef.current
                    .container(d3Container.current as any)
                    .data(data)
                    .nodeWidth(() => 250)
                    .nodeHeight(() => 120)
                    .childrenMargin(() => 60)
                    .siblingsMargin(() => 25)
                    .compact(false)
                    .compactMarginBetween(() => 40)
                    .compactMarginPair(() => 90)
                    .initialZoom(0.2) // Set an initial zoom level slightly zoomed out
                    .nodeContent((d: any, i: any, arr: any, state: any) => {
                        const nodeData = d.data as ProcessedUser;
                        const initials = nodeData.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase();
                        const avatarSrc = nodeData.avatar;
                        const topBorderColor = roleColors[nodeData.roleType || 'default'] || roleColors.default;

                        return `
              <div class="org-chart-node" style="width: ${d.width}px; height: ${d.height}px; background-color: hsl(var(--card)); color: hsl(var(--card-foreground)); border: 1px solid hsl(var(--border)); border-radius: 0.375rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); font-family: 'Inter', sans-serif; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
                <div class="node-top-border" style="width: 100%; height: 6px; background-color: ${topBorderColor}; flex-shrink: 0;"></div>
                <div class="node-content-wrapper" style="display: flex; flex-grow: 1; padding: 0.75rem; align-items: center;">
                  <div class="node-avatar-container" style="flex-shrink: 0; margin-right: 0.75rem;">
                    <img class="node-avatar" src="${avatarSrc}" alt="${nodeData.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid hsl(var(--border));">
                  </div>
                  <div class="node-details" style="flex-grow: 1; text-align: left; overflow: hidden;">
                    <h3 class="node-name" style="font-size: 0.9rem; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 0.125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${nodeData.name}
                    </h3>
                    ${
                        nodeData.position
                            ? `
                    <p class="node-position" style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${nodeData.position}
                    </p>`
                            : ''
                    }
                  </div>
                </div>
              </div>
            `;
                    })
                    .render(); // Render the chart

                // After rendering, fit the chart to the container
                if (chartRef.current) {
                    chartRef.current.fit();

                    // After fitting, call zoomOut() to make it less zoomed in.
                    // You can call this multiple times if needed, e.g., chartRef.current.zoomOut(); chartRef.current.zoomOut();
                    chartRef.current.zoomOut();
                }
            } catch (e: any) {
                console.error('Error rendering D3 chart:', e);
                if (d3Container.current) {
                    d3.select(d3Container.current).html(
                        `<div style="padding: 20px; text-align: center; color: red;">Error rendering chart: ${e.message}</div>`,
                    );
                }
            }
        }

        const handleResize = debounce(() => {
            if (chartRef.current && data && data.length > 0 && chartRef.current.lastTransform()) {
                // Check if lastTransform (function) exists
                chartRef.current.fit();
                // Optionally, re-apply zoomOut after resize and fit
                // chartRef.current.zoomOut();
            }
        }, 250);

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (d3Container.current) {
                d3.select(d3Container.current).selectAll('*').remove();
            }
        };
    }, [data]);

    return <div ref={d3Container} style={{ width: '100%', height: '600px' }} className="bg-muted/20 rounded-md" />;
};

export default D3OrgChartWrapper;
