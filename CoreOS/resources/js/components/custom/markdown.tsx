// src/components/custom/markdown.tsx
import type { Options as ReactMarkdownOptions } from 'react-markdown';

// @ts-ignore
const customMarkdownComponents: ReactMarkdownOptions['components'] = {
    table: ({ node, ...props }) => (
        <div className="my-4 overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
        </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
    tbody: ({ node, ...props }) => <tbody {...props} />,
    tr: ({ node, ...props }) => <tr className="border-b border-gray-200 dark:border-gray-700" {...props} />,
    th: ({ node, ...props }) => <th className="border border-gray-200 p-3 text-left font-semibold dark:border-gray-600" {...props} />,
    td: ({ node, ...props }) => <td className="border border-gray-200 p-3 dark:border-gray-600" {...props} />,
    h1: ({ node, ...props }) => <h1 className="my-3 text-3xl font-bold dark:text-white" {...props} />,
    h2: ({ node, ...props }) => <h2 className="my-3 border-b pb-1 text-2xl font-semibold dark:border-gray-700 dark:text-gray-200" {...props} />,
    h3: ({ node, ...props }) => <h3 className="my-2 text-xl font-semibold dark:text-gray-100" {...props} />,
    h4: ({ node, ...props }) => <h4 className="my-2 text-lg font-semibold dark:text-gray-200" {...props} />,
    p: ({ node, ...props }) => <p className="my-2 leading-relaxed dark:text-gray-300" {...props} />,
    ul: ({ node, ...props }) => <ul className="my-3 ml-6 list-disc dark:text-gray-300 [&>li]:mt-1" {...props} />,
    ol: ({ node, ...props }) => <ol className="my-3 ml-6 list-decimal dark:text-gray-300 [&>li]:mt-1" {...props} />,
    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
    blockquote: ({ node, ...props }) => (
        <blockquote className="my-3 border-l-4 border-gray-300 pl-4 text-gray-600 italic dark:border-gray-600 dark:text-gray-400" {...props} />
    ),

    a: ({ node, ...props }) => <a className="text-red-600 hover:underline dark:text-red-400" {...props} />, // Example for styling links
    hr: ({ node, ...props }) => <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />, // Example for styling horizontal rules
};

export default customMarkdownComponents;
