import {useEffect, useRef, useState} from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    error?: string;
}

export default function QuillEditor({
                                        value,
                                        onChange,
                                        placeholder = "Write your content...",
                                        className = "",
                                        error
                                    }: QuillEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !editorRef.current || quillRef.current) return;

        // Initialize Quill
        const quill = new Quill(editorRef.current, {
            theme: 'snow',
            placeholder: placeholder,
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['clean']
                ],
                clipboard: {
                    matchVisual: false
                }
            },
            formats: [
                'header', 'font', 'size',
                'bold', 'italic', 'underline', 'strike',
                'color', 'background',
                'script',
                'blockquote', 'code-block',
                'list', 'bullet', 'indent',
                'align',
                'link', 'image', 'video'
            ]
        });

        quillRef.current = quill;

        // Set initial content
        if (value) {
            quill.root.innerHTML = value;
        }

        // Handle content changes
        quill.on('text-change', () => {
            const html = quill.root.innerHTML;
            onChange(html === '<p><br></p>' ? '' : html);
        });

        return () => {
            if (quillRef.current) {
                quillRef.current = null;
            }
        };
    }, [mounted, placeholder]);

    // Update content when value prop changes
    useEffect(() => {
        if (quillRef.current && value !== quillRef.current.root.innerHTML) {
            const quill = quillRef.current;
            const selection = quill.getSelection();
            quill.root.innerHTML = value || '';
            if (selection) {
                quill.setSelection(selection);
            }
        }
    }, [value]);

    if (!mounted) {
        return (
            <div className={`${className} min-h-[250px] animate-pulse bg-gray-100 dark:bg-gray-700 rounded-md`} />
        );
    }

    return (
        <div className={className}>
            <div
                ref={editorRef}
                className="quill-editor"
                style={{ minHeight: '200px' }}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}


        </div>
    );
}
