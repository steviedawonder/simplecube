import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Heading from '@tiptap/extension-heading';
import { useCallback, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';

/* ================================================================
   Resizable Image Node View
   ================================================================ */
function ResizableImageView({ node, updateAttributes, selected }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const img = containerRef.current?.querySelector('img');
    if (!img) return;
    startX.current = e.clientX;
    startW.current = img.offsetWidth;
    setResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX.current;
      const newW = Math.max(50, startW.current + diff);
      const parent = containerRef.current?.closest('.tiptap');
      const maxW = parent ? (parent as HTMLElement).offsetWidth - 48 : 800;
      const clampedW = Math.min(newW, maxW);
      updateAttributes({ width: `${Math.round(clampedW)}px` });
    };

    const onMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [updateAttributes]);

  const width = node.attrs.width || undefined;

  return (
    <NodeViewWrapper as="div" style={{ display: 'inline-block', position: 'relative', maxWidth: '100%' }}>
      <div
        ref={containerRef}
        style={{
          display: 'inline-block',
          position: 'relative',
          width: width || 'auto',
          maxWidth: '100%',
          lineHeight: 0,
        }}
        data-drag-handle
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || undefined}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 6,
            display: 'block',
            outline: selected ? '2px solid #D4AA45' : undefined,
            cursor: 'default',
          }}
          draggable={false}
        />
        {/* Right edge handle */}
        {selected && (
          <div
            onMouseDown={onMouseDown}
            style={{
              position: 'absolute',
              top: 0,
              right: -4,
              width: 8,
              height: '100%',
              cursor: 'ew-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 4,
                height: 40,
                maxHeight: '50%',
                borderRadius: 2,
                background: '#D4AA45',
                opacity: resizing ? 1 : 0.7,
                transition: 'opacity 0.15s',
              }}
            />
          </div>
        )}
        {/* Bottom-right corner handle */}
        {selected && (
          <div
            onMouseDown={onMouseDown}
            style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 14,
              height: 14,
              cursor: 'nwse-resize',
              background: '#D4AA45',
              borderRadius: 3,
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              zIndex: 10,
            }}
          />
        )}
        {/* Width indicator while resizing */}
        {selected && resizing && (
          <div
            style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1d1d1f',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              zIndex: 20,
            }}
          >
            {width || 'auto'}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ================================================================
   Custom Image Extension with NodeView
   ================================================================ */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('width') || element.style.width || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

/* ================================================================
   Toolbar Components
   ================================================================ */
interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageButtonClick?: () => void;
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: active ? '#e8e8ed' : 'transparent',
        color: active ? '#1d1d1f' : '#6e6e73',
        fontFamily: 'inherit',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f7';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        backgroundColor: '#e8e8ed',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  );
}

/* ================================================================
   Main Editor Component
   ================================================================ */
export default function TipTapEditor({ content, onChange, onImageButtonClick }: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Heading.configure({
        levels: [2, 3, 4],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      ResizableImage.configure({
        HTMLAttributes: {
          class: 'blog-image',
        },
      }),
      Placeholder.configure({
        placeholder: '본문을 작성하세요...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, []);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('링크 URL을 입력하세요', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    if (onImageButtonClick) {
      onImageButtonClick();
    } else {
      const url = window.prompt('이미지 URL을 입력하세요', 'https://');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  }, [editor, onImageButtonClick]);

  // Listen for image insertion from ImagePicker
  useEffect(() => {
    function handleInsertImage(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.url && editor) {
        editor.chain().focus().setImage({ src: detail.url }).run();
      }
    }
    window.addEventListener('tiptap-insert-image', handleInsertImage);
    return () => window.removeEventListener('tiptap-insert-image', handleInsertImage);
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      style={{
        border: '1px solid #e8e8ed',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          padding: '6px 8px',
          borderBottom: '1px solid #e8e8ed',
          backgroundColor: '#fafafa',
        }}
      >
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="굵게"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="기울임"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="밑줄"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="제목 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="제목 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          title="제목 4"
        >
          H4
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="글머리 기호 목록"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="번호 목록"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="inherit">1</text>
            <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="inherit">2</text>
            <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="inherit">3</text>
          </svg>
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="인용구"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="코드 블록"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive('link')}
          onClick={setLink}
          title="링크"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="이미지">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="왼쪽 정렬"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="가운데 정렬"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="10" x2="6" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="오른쪽 정렬"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="tiptap-editor-wrapper">
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .tiptap-editor-wrapper .tiptap {
          min-height: 400px;
          padding: 1.5rem;
          outline: none;
          font-size: 1rem;
          line-height: 1.8;
          color: #1d1d1f;
        }

        .tiptap-editor-wrapper .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        .tiptap-editor-wrapper .tiptap h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem;
          color: #1d1d1f;
        }

        .tiptap-editor-wrapper .tiptap h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.625rem;
          color: #1d1d1f;
        }

        .tiptap-editor-wrapper .tiptap h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          color: #1d1d1f;
        }

        .tiptap-editor-wrapper .tiptap p {
          margin: 0.5rem 0;
        }

        .tiptap-editor-wrapper .tiptap ul,
        .tiptap-editor-wrapper .tiptap ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .tiptap-editor-wrapper .tiptap li {
          margin: 0.25rem 0;
        }

        .tiptap-editor-wrapper .tiptap blockquote {
          border-left: 3px solid #D4AA45;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6e6e73;
          font-style: italic;
        }

        .tiptap-editor-wrapper .tiptap pre {
          background-color: #1d1d1f;
          color: #f5f5f7;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1rem 0;
          font-size: 0.875rem;
        }

        .tiptap-editor-wrapper .tiptap code {
          background-color: #f5f5f7;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-size: 0.875rem;
        }

        .tiptap-editor-wrapper .tiptap pre code {
          background: none;
          padding: 0;
        }

        .tiptap-editor-wrapper .tiptap a {
          color: #D4AA45;
          text-decoration: underline;
        }

        .tiptap-editor-wrapper .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 1rem 0;
        }

        .tiptap-editor-wrapper .tiptap .ProseMirror-selectednode img {
          outline: 2px solid #D4AA45;
        }

        /* NodeView wrapper for images */
        .tiptap-editor-wrapper .tiptap [data-node-view-wrapper] {
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
}
