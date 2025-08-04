import React, {useCallback, useEffect, useRef} from 'react';
import SunEditor from 'suneditor';
import plugins from 'suneditor/src/plugins';
import 'suneditor/dist/css/suneditor.min.css';

interface Template {
    name: string;
    html: string;
    featured_image?: string | null;
}

interface SunEditorProps {
    value: string;
    onChange: (content: string) => void;
    onTemplateChange?: (templateName: string) => void;
    templates?: Template[];
    placeholder?: string;
    height?: string;
    width?: string;
    className?: string;
}

export default function SunEditorComponent({
                                               value,
                                               onChange,
                                               onTemplateChange,
                                               templates = [],
                                               placeholder = "Write your content here...",
                                               height = "400px",
                                               width = "100%",
                                               className = ""
                                           }: SunEditorProps) {
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const sunEditorRef = useRef<any>(null);
    const isInternalChange = useRef(false);
    const templateClickHandlerRef = useRef<((event: Event) => void) | null>(null);

    // Stable template change handler
    const handleTemplateChange = useCallback((templateName: string) => {
        if (onTemplateChange) {
            onTemplateChange(templateName);
        }
    }, [onTemplateChange]);

    // Create editor only once
    useEffect(() => {
        if (!editorRef.current || sunEditorRef.current) return;

        // Create the editor instance
        sunEditorRef.current = SunEditor.create(editorRef.current, {
            plugins: plugins,
            height: height,
            width: width,
            placeholder: placeholder,
            value: value,

            pasteTagsWhitelist: "*",
            addTagsWhitelist: "*",
            attributesWhitelist: {
                global: 'id|style|class|data-*',
            },
            strictMode: false,
            strictHTMLValidation: false,
            "katex": "window.katex",
            "previewTemplate": "<div style='width:auto; max-width:1080px; margin:auto;'>    <h1>Preview Template</h1>     {{contents}}     <div>_Footer_</div></div>",

            templates: templates.length > 0 ? templates : [
                {
                    name: 'Empty Template',
                    html: '<p>Start writing your content here...</p>'
                }
            ],

            buttonList: [
                // default
                ['undo', 'redo'],
                [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                ['fontColor', 'hiliteColor', 'textStyle'],
                ['removeFormat'],
                ['outdent', 'indent'],
                ['align', 'horizontalRule', 'list', 'lineHeight'],
                ['-right', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'template'],
                ['-right', 'table', 'math', 'imageGallery'],
                ['-right', 'image', 'video', 'audio', 'link'],
                // (min-width: 992)
                ['%992', [
                    ['undo', 'redo'],
                    [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                    ['bold', 'underline', 'italic', 'strike'],
                    [':t-More Text-default.more_text', 'subscript', 'superscript', 'fontColor', 'hiliteColor', 'textStyle'],
                    ['removeFormat'],
                    ['outdent', 'indent'],
                    ['align', 'horizontalRule', 'list', 'lineHeight'],
                    ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template'],
                    ['-right', ':r-More Rich-default.more_plus', 'table', 'link', 'image', 'video', 'audio', 'math', 'imageGallery']
                ]],
                // (min-width: 767)
                ['%767', [
                    ['undo', 'redo'],
                    [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                    [':t-More Text-default.more_text', 'bold', 'underline', 'italic', 'strike', 'subscript', 'superscript', 'fontColor', 'hiliteColor', 'textStyle'],
                    ['removeFormat'],
                    ['outdent', 'indent'],
                    [':e-More Line-default.more_horizontal', 'align', 'horizontalRule', 'list', 'lineHeight'],
                    [':r-More Rich-default.more_plus', 'table', 'link', 'image', 'video', 'audio', 'math', 'imageGallery'],
                    ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template']
                ]],
                // (min-width: 480)
                ['%480', [
                    ['undo', 'redo'],
                    [':p-More Paragraph-default.more_paragraph', 'font', 'fontSize', 'formatBlock', 'paragraphStyle', 'blockquote'],
                    [':t-More Text-default.more_text', 'bold', 'underline', 'italic', 'strike', 'subscript', 'superscript', 'fontColor', 'hiliteColor', 'textStyle', 'removeFormat'],
                    [':e-More Line-default.more_horizontal', 'outdent', 'indent', 'align', 'horizontalRule', 'list', 'lineHeight'],
                    [':r-More Rich-default.more_plus', 'table', 'link', 'image', 'video', 'audio', 'math', 'imageGallery'],
                    ['-right', ':i-More Misc-default.more_vertical', 'fullScreen', 'showBlocks', 'codeView', 'preview', 'print', 'save', 'template']
                ]]
            ],
        });

        // Set up basic onChange handler
        sunEditorRef.current.onChange = (contents: any) => {
            const stringContent = typeof contents === 'string' ? contents : '';
            isInternalChange.current = true;
            onChange(stringContent);
        };

        // Cleanup function
        return () => {
            if (sunEditorRef.current) {
                sunEditorRef.current.destroy();
                sunEditorRef.current = null;
            }
        };
    }, []); // Empty dependency array - create only once

    // Update templates when they change
    useEffect(() => {
        if (!sunEditorRef.current || !templates.length) return;

        // Update templates in existing editor
        try {
            const editorTemplates = templates.length > 0 ? templates : [
                {
                    name: 'Empty Template',
                    html: '<p>Start writing your content here...</p>'
                }
            ];

            // Update the editor's template list
            sunEditorRef.current.options.templates = editorTemplates;
        } catch (error) {
            console.warn('Failed to update templates:', error);
        }
    }, [templates]);

    // Set up template detection
    useEffect(() => {
        if (!sunEditorRef.current || !onTemplateChange || !templates.length) return;

        // Clean up previous handler
        if (templateClickHandlerRef.current) {
            document.removeEventListener('click', templateClickHandlerRef.current);
        }

        // Simple template detection via button clicks
        const handleTemplateClick = (event: Event) => {
            const target = event.target as HTMLElement;
            if (!target) return;

            // Check if it's a template button click
            const isTemplateButton = target.closest('.se-btn-list') &&
                target.textContent &&
                templates.some(t => target.textContent!.includes(t.name));

            if (isTemplateButton) {
                // Find matching template
                const template = templates.find(t => target.textContent!.includes(t.name));
                if (template) {
                    // Small delay to let template content load
                    setTimeout(() => {
                        handleTemplateChange(template.name);
                    }, 150);
                }
            }
        };

        templateClickHandlerRef.current = handleTemplateClick;
        document.addEventListener('click', handleTemplateClick);

        return () => {
            if (templateClickHandlerRef.current) {
                document.removeEventListener('click', templateClickHandlerRef.current);
                templateClickHandlerRef.current = null;
            }
        };
    }, [templates, handleTemplateChange]);

    // Sync value changes from parent
    useEffect(() => {
        if (!sunEditorRef.current) return;

        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        const currentContent = sunEditorRef.current.getContents();
        if (currentContent !== value) {
            sunEditorRef.current.setContents(value || '');
        }
    }, [value]);

    return React.createElement('div', {
        className: className
    }, React.createElement('textarea', {
        ref: editorRef,
        style: { visibility: 'hidden' }
    }));
}
