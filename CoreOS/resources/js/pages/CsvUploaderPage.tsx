import CsvUploader from '@/components/CsvUploader';
import DatasetSummaryTable from '@/components/ImportedDataTableUploadPage';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Parts Database',
        href: route('parts.catalog'), // Ensure you have a 'dashboard' named route
    },
    {
        title: 'Parts Database Management',
        href: route('data.management'),
    },

    {
        title: 'CSV & Image Uploader',
        href: route('csv.uploader'), // Ensure you have a 'csv.uploader' named route for this page
    },
];

export default function CsvUploaderPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="CSV & Image Uploader" />
            <div className="flex">
                <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
                    <div className="col mx-auto max-w-3xl">
                        <h1 className="mb-8 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Upload CSV and Associated Images</h1>
                        <CsvUploader />
                    </div>
                </div>
                <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
                    <div className="col mx-auto max-w-3xl">
                        <h1 className="mb-8 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Upload CSV and Associated Images</h1>
                        <DatasetSummaryTable />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
