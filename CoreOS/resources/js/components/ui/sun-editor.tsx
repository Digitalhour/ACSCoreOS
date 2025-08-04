import React, {useEffect, useRef} from 'react';
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

    // Ref to track if the content change is from the editor's own onChange event
    const isInternalChange = useRef(false);

    // This hook manages the editor's creation and destruction
    useEffect(() => {
        if (!editorRef.current) return;

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

            // Use templates from props, fallback to empty array if none provided
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

        // Attach the onChange handler
        sunEditorRef.current.onChange = (contents: any) => {
            const stringContent = typeof contents === 'string' ? contents : '';

            isInternalChange.current = true;
            onChange(stringContent);
        };

        // Add template change detection if callback is provided
        if (onTemplateChange && templates.length > 0) {
            // Store the previous content to detect template changes
            let previousContent = value || '';

            // Enhanced onChange handler to detect template usage
            const originalOnChange = sunEditorRef.current.onChange;
            sunEditorRef.current.onChange = (contents: any) => {
                const stringContent = typeof contents === 'string' ? contents : '';

                // Check if content dramatically changed (likely a template was applied)
                const contentChanged = stringContent.length > previousContent.length + 100;

                if (contentChanged) {
                    // Try to match which template was applied based on content
                    for (const template of templates) {
                        // Check if the new content contains significant portions of the template
                        const templateContent = template.html.replace(/<[^>]*>/g, '').substring(0, 200);
                        const newContent = stringContent.replace(/<[^>]*>/g, '').substring(0, 200);

                        if (templateContent && newContent.includes(templateContent.substring(0, 50))) {
                            setTimeout(() => onTemplateChange(template.name), 100);
                            break;
                        }
                    }
                }

                previousContent = stringContent;

                // Call the original onChange
                isInternalChange.current = true;
                onChange(stringContent);
            };

            // Also listen for clicks on the editor container to detect template button clicks
            const handleTemplateClick = (event: any) => {
                const target = event.target;
                if (target && target.textContent) {
                    // Look for matching template names in the clicked element
                    for (const template of templates) {
                        if (target.textContent.includes(template.name)) {
                            // Delay to let the template content load
                            setTimeout(() => {
                                const content = sunEditorRef.current?.getContents() || '';
                                // Verify the template was actually applied
                                const templateCheck = template.html.replace(/<[^>]*>/g, '').substring(0, 50);
                                const contentCheck = content.replace(/<[^>]*>/g, '').substring(0, 50);

                                if (templateCheck && contentCheck.includes(templateCheck)) {
                                    onTemplateChange(template.name);
                                }
                            }, 200);
                            break;
                        }
                    }
                };

                // Add event listener using delegation on document
                document.addEventListener('click', handleTemplateClick);

                // Return cleanup function for this listener
                return () => {
                    document.removeEventListener('click', handleTemplateClick);
                };
            }
        } else {
            // Original onChange handler when no template detection needed
            sunEditorRef.current.onChange = (contents: any) => {
                const stringContent = typeof contents === 'string' ? contents : '';
                isInternalChange.current = true;
                onChange(stringContent);
            };
        }

        // Cleanup function to destroy the editor instance
        return () => {
            if (sunEditorRef.current) {
                sunEditorRef.current.destroy();
                sunEditorRef.current = null;
            }
        };
    }, [onTemplateChange, templates]); // Add templates to dependencies

    // This hook syncs changes from the parent component back to the editor
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        if (sunEditorRef.current && sunEditorRef.current.getContents() !== value) {
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
