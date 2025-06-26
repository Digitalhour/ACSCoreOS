import React, {useState} from 'react';
import {Document, Page} from 'react-pdf';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ChevronLeft, ChevronRight, Download, Loader2} from 'lucide-react';

interface SimplePDFViewerProps {
    url: string;
    fileName: string;
    downloadUrl: string;
}

export default function SimplePDFViewer({ url, fileName, downloadUrl }: SimplePDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>PDF Viewer</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <a href={downloadUrl}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </a>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Simple Controls */}
                    {numPages > 1 && (
                        <div className="flex items-center justify-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                                disabled={pageNumber <= 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <span className="text-sm">
                                Page {pageNumber} of {numPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                                disabled={pageNumber >= numPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* PDF Document */}
                    <div className="border rounded-lg overflow-auto bg-gray-50 flex justify-center p-4">
                        <Document
                            file={url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <span className="ml-2">Loading PDF...</span>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                width={800}
                                loading={
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                }
                            />
                        </Document>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
