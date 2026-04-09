import { useState, useEffect, useRef } from 'react';
import { colors, s } from './shared/styles';

// Simplecube: upload image via Cloudinary API
async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('이미지 업로드 실패');
  return res.json();
}

// Simplecube: upload file (reuse same endpoint)
async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('파일 업로드 실패');
  return res.json();
}

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 13, fontWeight: 600, border: 'none',
  background: 'none', cursor: 'pointer', color: colors.text, borderRadius: 4,
  minWidth: 32, textAlign: 'center', transition: 'background 0.15s',
};

function RichTextEditor({ value, onChange, onImageSelect }: { value: string; onChange: (html: string) => void; onImageSelect?: (img: HTMLImageElement | null) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);
  const resizeState = useRef<{ img: HTMLImageElement; startX: number; startY: number; startW: number; startH: number; handle: string } | null>(null);

  // Image resize overlay state
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgRect, setImgRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Notify parent when image selection changes
  useEffect(() => {
    onImageSelect?.(selectedImg);
  }, [selectedImg]);

  // Update overlay position on editor scroll
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !selectedImg) return;
    const onScroll = () => {
      const calcRect = (editor as any).__calcRect;
      if (calcRect && selectedImg) {
        setImgRect(calcRect(selectedImg));
      }
    };
    editor.addEventListener('scroll', onScroll);
    return () => editor.removeEventListener('scroll', onScroll);
  }, [selectedImg]);

  // Click outside to deselect image
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedImg && !(e.target as HTMLElement)?.closest?.('.img-resize-overlay') && !(e.target as HTMLElement)?.closest?.('.image-settings-panel') && !(e.target as HTMLElement)?.closest?.('.img-overlay-wrapper') && !(e.target as HTMLElement)?.closest?.('.img-overlay-minibar') && e.target !== selectedImg) {
        setSelectedImg(null);
        setImgRect(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedImg]);

  // Select media on click and add click overlays to iframes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const calcRect = (media: HTMLElement) => {
      const tag = media.tagName.toLowerCase();
      let target: HTMLElement;
      if (tag === 'iframe' || tag === 'video') {
        target = media.parentElement!;
      } else if (media.parentElement?.classList?.contains('img-overlay-wrapper')) {
        target = media.parentElement!;
      } else {
        target = media;
      }
      const editorRect = editor.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      return { top: r.top - editorRect.top + editor.scrollTop, left: r.left - editorRect.left + editor.scrollLeft, width: r.width, height: r.height };
    };

    const selectMedia = (media: HTMLElement) => {
      setSelectedImg(media as any);
      setImgRect(calcRect(media));
    };

    // Expose calcRect for external use
    (editor as any).__calcRect = calcRect;

    // Add transparent click overlays to all iframes/videos in editor
    const addOverlays = () => {
      editor.querySelectorAll('div[contenteditable="false"]').forEach(wrapper => {
        if (wrapper.querySelector('.media-click-overlay')) return;
        const media = wrapper.querySelector('iframe') || wrapper.querySelector('video');
        if (!media) return;
        const overlay = document.createElement('div');
        overlay.className = 'media-click-overlay';
        overlay.style.cssText = 'position:absolute;inset:0;cursor:pointer;z-index:1;';
        (wrapper as HTMLElement).style.position = 'relative';
        overlay.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); selectMedia(media as HTMLElement); });
        wrapper.appendChild(overlay);
      });
    };

    const handleImgClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        selectMedia(target);
      }
    };

    addOverlays();
    editor.addEventListener('click', handleImgClick);
    // Re-add overlays when content changes
    const observer = new MutationObserver(addOverlays);
    observer.observe(editor, { childList: true, subtree: true });

    return () => {
      editor.removeEventListener('click', handleImgClick);
      observer.disconnect();
    };
  }, []);

  // Get the resizable target element (for iframes/videos or overlay wrappers, resize the parent wrapper)
  const getResizeTarget = (): HTMLElement | null => {
    if (!selectedImg) return null;
    const tag = selectedImg.tagName.toLowerCase();
    if (tag === 'iframe' || tag === 'video') {
      return selectedImg.parentElement as HTMLElement;
    }
    const parent = selectedImg.parentElement;
    if (parent?.classList?.contains('img-overlay-wrapper')) {
      return parent as HTMLElement;
    }
    return selectedImg;
  };

  // Handle resize drag
  const startResize = (handle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = getResizeTarget();
    if (!target) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = target.offsetWidth;
    const startH = target.offsetHeight;
    const aspectRatio = startW / startH;
    const isMedia = selectedImg!.tagName.toLowerCase() === 'iframe' || selectedImg!.tagName.toLowerCase() === 'video';

    const onMouseMove = (ev: MouseEvent) => {
      let newW = startW;
      let newH = startH;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (handle.includes('right')) newW = Math.max(100, startW + dx);
      if (handle.includes('left')) newW = Math.max(100, startW - dx);
      if (handle.includes('bottom')) newH = Math.max(60, startH + dy);
      if (handle.includes('top')) newH = Math.max(60, startH - dy);

      // Corner handles maintain aspect ratio
      if (handle.length > 6) {
        newH = newW / aspectRatio;
      }

      target.style.width = `${newW}px`;
      target.style.maxWidth = '100%';
      if (isMedia) {
        // Also resize the inner iframe/video
        selectedImg!.style.width = '100%';
        selectedImg!.style.height = `${newH}px`;
        target.style.height = 'auto';
      } else {
        target.style.height = `${newH}px`;
      }

      const editor = editorRef.current;
      if (editor) {
        const editorRect = editor.getBoundingClientRect();
        const r = target.getBoundingClientRect();
        setImgRect({ top: r.top - editorRect.top + editor.scrollTop, left: r.left - editorRect.left + editor.scrollLeft, width: r.width, height: r.height });
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      syncContent();
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Image alignment - apply to wrapper if image has text overlay wrapper
  const alignImage = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg) return;
    const parent = selectedImg.parentElement;
    const hasWrapper = parent?.style?.position === 'relative' && parent?.classList?.contains('img-overlay-wrapper');
    const target = hasWrapper ? parent! : selectedImg;
    target.style.display = align === 'center' ? 'block' : 'inline-block';
    target.style.margin = align === 'center' ? '8px auto' : '8px 0';
    target.style.float = align === 'center' ? 'none' : align;
    syncContent();
    // Update rect
    const editor = editorRef.current;
    if (editor) {
      setTimeout(() => {
        const editorRect = editor.getBoundingClientRect();
        const r = target.getBoundingClientRect();
        setImgRect({ top: r.top - editorRect.top + editor.scrollTop, left: r.left - editorRect.left + editor.scrollLeft, width: r.width, height: r.height });
      }, 50);
    }
  };

  // Delete selected media (image/video/iframe) - also removes wrapper if present
  const deleteSelectedMedia = () => {
    if (!selectedImg) return;
    const tag = selectedImg.tagName.toLowerCase();
    const parent = selectedImg.parentElement;
    const hasOverlayWrapper = parent?.classList?.contains('img-overlay-wrapper');
    let target: HTMLElement | null;
    if (tag === 'iframe' || tag === 'video') {
      target = parent;
    } else if (hasOverlayWrapper) {
      target = parent;
    } else {
      target = selectedImg;
    }
    if (target) {
      target.remove();
      setSelectedImg(null);
      setImgRect(null);
      syncContent();
    }
  };

  // Keyboard handler - only Escape to deselect (delete only via toolbar button)
  useEffect(() => {
    if (!selectedImg) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImg(null);
        setImgRect(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedImg]);

  // Sync external value into editor only when it changes externally
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleHeading = (tag: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    syncContent();
  };

  const handleLink = () => {
    const url = prompt('링크 URL을 입력하세요:', 'https://');
    if (url) exec('createLink', url);
  };

  // Heading dropdown state
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [currentHeading, setCurrentHeading] = useState('본문');
  const headingDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (headingDropdownRef.current && !headingDropdownRef.current.contains(e.target as Node)) setShowHeadingDropdown(false);
    };
    if (showHeadingDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showHeadingDropdown]);

  // Detect current heading at cursor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const detectHeading = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      if (!node || !editor.contains(node)) return;
      let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
      while (el && el !== editor) {
        const tag = el.tagName?.toLowerCase();
        if (tag === 'h1') { setCurrentHeading('제목 1'); return; }
        if (tag === 'h2') { setCurrentHeading('제목 2'); return; }
        if (tag === 'h3') { setCurrentHeading('제목 3'); return; }
        if (tag === 'h4') { setCurrentHeading('제목 4'); return; }
        el = el.parentElement;
      }
      setCurrentHeading('본문');
    };
    document.addEventListener('selectionchange', detectHeading);
    return () => document.removeEventListener('selectionchange', detectHeading);
  }, []);

  const applyHeading = (tag: string, label: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    setCurrentHeading(label);
    setShowHeadingDropdown(false);
    syncContent();
  };

  // Insert menu state
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // Close insert menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (insertMenuRef.current && !insertMenuRef.current.contains(e.target as Node)) {
        setShowInsertMenu(false);
      }
    };
    if (showInsertMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showInsertMenu]);

  // Image upload state (#3)
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setUploadingCount(fileArray.length);

    const results: { url: string; alt: string }[] = [];
    for (const file of fileArray) {
      try {
        const asset = await uploadImage(file);
        results.push({ url: asset.url, alt: file.name.replace(/\.[^/.]+$/, '') });
      } catch (err: any) {
        alert('이미지 업로드 실패: ' + err.message);
      }
    }

    if (results.length > 0) {
      editorRef.current?.focus();
      if (results.length === 1) {
        document.execCommand('insertHTML', false, `<img src="${results[0].url}" alt="${results[0].alt}" style="max-width:100%;height:auto;margin:8px 0;" />`);
      } else {
        const imgsHtml = results.map(r => `<img src="${r.url}" alt="${r.alt}" style="max-width:${Math.floor(100 / results.length)}%;height:auto;flex:0 1 auto;min-width:0;" />`).join('');
        document.execCommand('insertHTML', false, `<div class="img-row" style="display:flex;gap:8px;margin:8px 0;align-items:flex-start;">${imgsHtml}</div>`);
      }
      syncContent();
    }
    setUploadingCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Rotate selected image
  const rotateImage = (degrees: number) => {
    if (!selectedImg || selectedImg.tagName.toLowerCase() !== 'img') return;
    const current = selectedImg.style.transform || '';
    const match = current.match(/rotate\((\d+)deg\)/);
    const currentDeg = match ? parseInt(match[1]) : 0;
    const newDeg = (currentDeg + degrees) % 360;
    selectedImg.style.transform = newDeg === 0 ? '' : `rotate(${newDeg}deg)`;
    syncContent();
  };

  // Add text overlay to selected image - inline editable, draggable within image bounds
  const addTextOverlay = () => {
    if (!selectedImg || selectedImg.tagName.toLowerCase() !== 'img') return;
    const parent = selectedImg.parentElement;

    // If overlay already exists, focus it for editing
    if (parent?.classList?.contains('img-overlay-wrapper') && parent?.querySelector?.('.img-text-overlay')) {
      const overlay = parent.querySelector('.img-text-overlay') as HTMLElement;
      overlay.focus();
      return;
    }

    // Wrap image in relative container
    const wrapper = document.createElement('div');
    wrapper.className = 'img-overlay-wrapper';
    wrapper.style.cssText = 'position:relative;display:inline-block;max-width:100%;overflow:hidden;';
    selectedImg.parentElement?.insertBefore(wrapper, selectedImg);
    wrapper.appendChild(selectedImg);

    // Create editable overlay
    const overlay = document.createElement('div');
    overlay.className = 'img-text-overlay';
    overlay.contentEditable = 'true';
    overlay.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#ffffff;font-size:24px;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,0.6);padding:8px 16px;cursor:text;min-width:40px;min-height:1em;outline:none;white-space:nowrap;user-select:text;z-index:5;';
    overlay.textContent = '텍스트 입력';
    wrapper.appendChild(overlay);

    // Create mini toolbar (hidden by default)
    const miniBar = document.createElement('div');
    miniBar.className = 'img-overlay-minibar';
    miniBar.style.cssText = 'position:absolute;top:-32px;left:50%;transform:translateX(-50%);display:none;gap:4px;background:#1a1a1a;border-radius:6px;padding:3px 6px;z-index:20;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;';
    miniBar.innerHTML = `
      <button class="overlay-btn" data-action="size-down" title="글씨 축소" style="width:24px;height:22px;border:none;background:none;cursor:pointer;border-radius:3px;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">A-</button>
      <button class="overlay-btn" data-action="size-up" title="글씨 확대" style="width:24px;height:22px;border:none;background:none;cursor:pointer;border-radius:3px;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;">A+</button>
      <input type="color" data-action="color" value="#ffffff" title="글씨 색상" style="width:22px;height:22px;border:1px solid #555;border-radius:3px;cursor:pointer;padding:0;background:none;" />
      <button class="overlay-btn" data-action="remove-text" title="텍스트 삭제" style="width:24px;height:22px;border:none;background:none;cursor:pointer;border-radius:3px;color:#ff6666;font-size:12px;display:flex;align-items:center;justify-content:center;">✕</button>
    `;
    wrapper.appendChild(miniBar);

    // Mini toolbar button handlers
    miniBar.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'size-up') {
        const cur = parseInt(overlay.style.fontSize) || 24;
        overlay.style.fontSize = Math.min(cur + 4, 80) + 'px';
        syncContent();
      } else if (action === 'size-down') {
        const cur = parseInt(overlay.style.fontSize) || 24;
        overlay.style.fontSize = Math.max(cur - 4, 10) + 'px';
        syncContent();
      } else if (action === 'remove-text') {
        overlay.remove();
        miniBar.remove();
        // Unwrap: move image out of wrapper
        const img = wrapper.querySelector('img');
        if (img) {
          wrapper.parentElement?.insertBefore(img, wrapper);
          wrapper.remove();
        }
        syncContent();
      }
    });

    // Color input change
    const colorInput = miniBar.querySelector('input[data-action="color"]') as HTMLInputElement;
    colorInput?.addEventListener('input', (e) => {
      overlay.style.color = (e.target as HTMLInputElement).value;
      syncContent();
    });

    // Show minibar when overlay is focused/clicked
    overlay.addEventListener('focus', () => {
      miniBar.style.display = 'flex';
    });

    overlay.addEventListener('blur', () => {
      setTimeout(() => {
        // Don't hide if focus went to minibar
        if (!miniBar.contains(document.activeElement)) {
          miniBar.style.display = 'none';
          syncContent();
        }
      }, 200);
    });

    // Dragging logic
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let overlayStartLeft = 0, overlayStartTop = 0;

    overlay.addEventListener('mousedown', (e: MouseEvent) => {
      // If clicking to edit text, don't drag
      if (overlay === document.activeElement || (e.target as HTMLElement).isContentEditable) {
        // Already editing, let text selection work
        if (overlay.textContent !== '텍스트 입력') return;
      }
      e.preventDefault();
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const wrapperRect = wrapper.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      overlayStartLeft = overlayRect.left - wrapperRect.left + overlayRect.width / 2;
      overlayStartTop = overlayRect.top - wrapperRect.top + overlayRect.height / 2;
      overlay.style.cursor = 'grabbing';

      const onMove = (ev: MouseEvent) => {
        if (!isDragging) return;
        const dx = ev.clientX - dragStartX;
        const dy = ev.clientY - dragStartY;
        const wRect = wrapper.getBoundingClientRect();
        const oRect = overlay.getBoundingClientRect();
        // Calculate new center position as percentage
        let newLeft = overlayStartLeft + dx;
        let newTop = overlayStartTop + dy;
        // Clamp within wrapper bounds
        const halfW = oRect.width / 2;
        const halfH = oRect.height / 2;
        newLeft = Math.max(halfW, Math.min(wRect.width - halfW, newLeft));
        newTop = Math.max(halfH, Math.min(wRect.height - halfH, newTop));
        // Convert to percentage for responsive
        const leftPct = (newLeft / wRect.width) * 100;
        const topPct = (newTop / wRect.height) * 100;
        overlay.style.left = leftPct + '%';
        overlay.style.top = topPct + '%';
      };

      const onUp = () => {
        isDragging = false;
        overlay.style.cursor = 'text';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        syncContent();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Double-click to edit text
    overlay.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      overlay.focus();
      miniBar.style.display = 'flex';
      // Select all text on double click for easy replacement
      const range = document.createRange();
      range.selectNodeContents(overlay);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });

    // Prevent editor from deselecting image when clicking overlay
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Focus the overlay for immediate editing
    setTimeout(() => {
      overlay.focus();
      const range = document.createRange();
      range.selectNodeContents(overlay);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, 50);

    syncContent();
    // Update rect after DOM change
    const editor = editorRef.current;
    if (editor) {
      setTimeout(() => {
        const editorRect = editor.getBoundingClientRect();
        const r = wrapper.getBoundingClientRect();
        setImgRect({ top: r.top - editorRect.top + editor.scrollTop, left: r.left - editorRect.left + editor.scrollLeft, width: r.width, height: r.height });
      }, 100);
    }
  };

  // Custom mouse-based image drag (no HTML5 drag API — avoids contenteditable conflicts)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    let dragging = false;
    let dragEl: HTMLElement | null = null;
    let ghost: HTMLElement | null = null;
    let indicator: HTMLElement | null = null;
    let dropInfo: { target: HTMLElement; side: 'before' | 'after' | 'left' | 'right' } | null = null;
    let startX = 0, startY = 0;

    const getBlock = (el: HTMLElement): HTMLElement =>
      el.closest('.img-overlay-wrapper') as HTMLElement
      || el.closest('.img-figure-wrapper') as HTMLElement
      || el.closest('.img-row') as HTMLElement
      || el;

    const cleanup = () => {
      if (ghost) { ghost.remove(); ghost = null; }
      if (indicator) { indicator.remove(); indicator = null; }
      if (dragEl) { dragEl.style.opacity = '1'; dragEl = null; }
      dragging = false;
      dropInfo = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Disable native drag on images inside editor
    const preventNativeDrag = (e: DragEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG' && editor.contains(t)) {
        e.preventDefault();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== 'IMG' || !editor.contains(t)) return;
      // Only left button
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      dragEl = getBlock(t);

      const onMouseMoveStart = (ev: MouseEvent) => {
        // Start drag only after moving 5px (avoid accidental drags)
        if (Math.abs(ev.clientX - startX) < 5 && Math.abs(ev.clientY - startY) < 5) return;
        document.removeEventListener('mousemove', onMouseMoveStart);
        document.removeEventListener('mouseup', onMouseUpCancel);
        startDrag(ev);
      };
      const onMouseUpCancel = () => {
        document.removeEventListener('mousemove', onMouseMoveStart);
        document.removeEventListener('mouseup', onMouseUpCancel);
        dragEl = null;
      };
      document.addEventListener('mousemove', onMouseMoveStart);
      document.addEventListener('mouseup', onMouseUpCancel);
    };

    const startDrag = (e: MouseEvent) => {
      if (!dragEl) return;
      dragging = true;
      dragEl.style.opacity = '0.3';
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      // Create ghost thumbnail
      ghost = document.createElement('div');
      const imgSrc = dragEl.tagName === 'IMG' ? (dragEl as HTMLImageElement).src : (dragEl.querySelector('img') as HTMLImageElement)?.src;
      ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;opacity:0.8;border-radius:4px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:120px;max-height:90px;`;
      if (imgSrc) ghost.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;display:block;" />`;
      document.body.appendChild(ghost);
      moveGhost(e);

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      // Deselect current image
      setSelectedImg(null);
      setImgRect(null);
    };

    const moveGhost = (e: MouseEvent) => {
      if (ghost) {
        ghost.style.left = `${e.clientX + 12}px`;
        ghost.style.top = `${e.clientY + 12}px`;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging || !dragEl) return;
      moveGhost(e);

      const edRect = editor.getBoundingClientRect();
      const container = editor.parentElement!;

      // Check if mouse is inside editor bounds
      if (e.clientX < edRect.left || e.clientX > edRect.right || e.clientY < edRect.top || e.clientY > edRect.bottom) {
        if (indicator) { indicator.remove(); indicator = null; }
        dropInfo = null;
        return;
      }

      // Find element under cursor (ignore ghost)
      if (ghost) ghost.style.display = 'none';
      const elUnder = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (ghost) ghost.style.display = '';

      if (!elUnder || !editor.contains(elUnder)) {
        if (indicator) { indicator.remove(); indicator = null; }
        dropInfo = null;
        return;
      }

      // Check if hovering over an image (for side-by-side)
      const hoverImg = elUnder.tagName === 'IMG' ? elUnder : null;
      const hoverBlock = hoverImg ? getBlock(hoverImg) : null;

      if (!indicator) indicator = document.createElement('div');

      if (hoverImg && hoverBlock && hoverBlock !== dragEl) {
        // Side-by-side: show vertical blue line on left or right
        const rect = hoverImg.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const side = e.clientX < midX ? 'left' : 'right';
        const lineX = side === 'left' ? rect.left - 2 : rect.right + 2;

        indicator.style.cssText = `position:fixed;width:4px;background:#3b82f6;border-radius:2px;pointer-events:none;z-index:9999;top:${rect.top}px;height:${rect.height}px;left:${lineX}px;`;
        if (!indicator.parentElement) document.body.appendChild(indicator);
        dropInfo = { target: hoverBlock, side };
      } else {
        // Vertical: find direct child of editor to insert before/after
        let refNode = elUnder;
        while (refNode && refNode !== editor && refNode.parentElement !== editor) {
          if (!editor.contains(refNode)) break;
          refNode = refNode.parentElement!;
        }
        if (refNode && refNode !== editor && refNode.parentElement === editor && refNode !== dragEl) {
          const rect = refNode.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const side = e.clientY < midY ? 'before' : 'after';
          const lineY = side === 'before' ? rect.top : rect.bottom;

          indicator.style.cssText = `position:fixed;height:4px;background:#D4AA45;border-radius:2px;pointer-events:none;z-index:9999;left:${edRect.left + 16}px;width:${edRect.width - 32}px;top:${lineY}px;`;
          if (!indicator.parentElement) document.body.appendChild(indicator);
          dropInfo = { target: refNode as HTMLElement, side };
        } else {
          if (indicator.parentElement) indicator.remove();
          dropInfo = null;
        }
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (!dragging || !dragEl || !dropInfo) { cleanup(); return; }

      const { target, side } = dropInfo;

      // Safety: ensure target is inside editor
      if (!editor.contains(target)) { cleanup(); return; }

      if (side === 'left' || side === 'right') {
        // Side-by-side
        const existingRow = target.closest('.img-row') as HTMLElement;
        if (existingRow && editor.contains(existingRow)) {
          if (side === 'left') existingRow.insertBefore(dragEl, target);
          else existingRow.insertBefore(dragEl, target.nextSibling);
          const count = existingRow.querySelectorAll('img').length;
          existingRow.querySelectorAll('img').forEach((img: any) => {
            img.style.maxWidth = `${Math.floor(100 / count)}%`;
            img.style.height = 'auto';
            img.style.flex = '0 1 auto';
            img.style.minWidth = '0';
          });
        } else if (target.parentElement && editor.contains(target.parentElement)) {
          const row = document.createElement('div');
          row.className = 'img-row';
          row.style.cssText = 'display:flex;gap:8px;margin:8px 0;align-items:flex-start;';
          target.parentElement.insertBefore(row, target);
          if (side === 'left') { row.appendChild(dragEl); row.appendChild(target); }
          else { row.appendChild(target); row.appendChild(dragEl); }
          row.querySelectorAll('img').forEach((img: any) => {
            img.style.maxWidth = '50%';
            img.style.height = 'auto';
            img.style.flex = '0 1 auto';
            img.style.minWidth = '0';
          });
        }
      } else {
        // Vertical: only insert if target's parent is editor
        if (target.parentElement === editor) {
          if (side === 'before') editor.insertBefore(dragEl, target);
          else editor.insertBefore(dragEl, target.nextSibling);
          // Restore full width
          const imgEl = dragEl.tagName === 'IMG' ? dragEl : dragEl.querySelector('img');
          if (imgEl) {
            (imgEl as HTMLElement).style.maxWidth = '100%';
            (imgEl as HTMLElement).style.flex = '';
            (imgEl as HTMLElement).style.minWidth = '';
          }
        }
      }

      // Clean up empty/single-image rows
      editor.querySelectorAll('.img-row').forEach(row => {
        const imgs = row.querySelectorAll('img');
        if (imgs.length <= 1) {
          const img = imgs[0];
          if (img) {
            (img as HTMLElement).style.maxWidth = '100%';
            (img as HTMLElement).style.flex = '';
            (img as HTMLElement).style.minWidth = '';
            (img as HTMLElement).style.margin = '8px 0';
            row.parentElement?.insertBefore(img, row);
          }
          row.remove();
        }
      });

      cleanup();
      syncContent();
    };

    editor.addEventListener('mousedown', onMouseDown);
    editor.addEventListener('dragstart', preventNativeDrag);

    return () => {
      editor.removeEventListener('mousedown', onMouseDown);
      editor.removeEventListener('dragstart', preventNativeDrag);
    };
  }, []);

  const updateImgRect = (target: HTMLElement) => {
    const editor = editorRef.current;
    if (!editor) return;
    setTimeout(() => {
      const editorRect = editor.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      setImgRect({ top: r.top - editorRect.top + editor.scrollTop, left: r.left - editorRect.left + editor.scrollLeft, width: r.width, height: r.height });
    }, 50);
  };

  // YouTube modal state
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [youtubePreviewId, setYoutubePreviewId] = useState('');

  const handleVideoInsert = () => {
    setYoutubeUrl('');
    setYoutubeError('');
    setYoutubePreviewId('');
    setShowYoutubeModal(true);
    setShowInsertMenu(false);
  };

  const extractYoutubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return '';
  };

  const handleYoutubeUrlChange = (url: string) => {
    setYoutubeUrl(url);
    setYoutubeError('');
    const id = extractYoutubeId(url);
    setYoutubePreviewId(id);
  };

  const confirmYoutubeInsert = () => {
    if (!youtubePreviewId) {
      setYoutubeError('유효한 유튜브 링크를 입력해 주세요.');
      return;
    }
    editorRef.current?.focus();
    const embedHtml = `<div style="position:relative;max-width:560px;margin:12px 0;" contenteditable="false"><iframe width="560" height="315" src="https://www.youtube.com/embed/${youtubePreviewId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;height:315px;border-radius:8px;"></iframe></div>`;
    document.execCommand('insertHTML', false, embedHtml);
    syncContent();
    setShowYoutubeModal(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const asset = await uploadImage(file);
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, `<div style="max-width:560px;margin:12px 0;" contenteditable="false"><video controls style="width:100%;border-radius:8px;" src="${asset.url}"></video></div>`);
      syncContent();
    } catch (err: any) {
      alert('동영상 업로드 실패: ' + err.message);
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const asset = await uploadFile(file);
      editorRef.current?.focus();
      const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)}KB` : `${(file.size / 1024 / 1024).toFixed(1)}MB`;
      document.execCommand('insertHTML', false, `<div contenteditable="false" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;margin:8px 0;font-size:13px;"><span style="font-size:18px;">📎</span><a href="${asset.url}" target="_blank" rel="noopener" style="color:#3b82f6;text-decoration:none;font-weight:600;">${file.name}</a><span style="color:#999;font-size:11px;">(${sizeStr})</span></div>`);
      syncContent();
    } catch (err: any) {
      alert('파일 업로드 실패: ' + err.message);
    }
    if (fileUploadRef.current) fileUploadRef.current.value = '';
  };

  // (iframe/video click handling is now in the combined selectMedia handler above)

  // Font size dropdown
  const fontSizes = [11, 13, 15, 16, 19, 24, 28, 30, 34, 38];
  const [showFontSize, setShowFontSize] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(15);
  const fontSizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) setShowFontSize(false);
    };
    if (showFontSize) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFontSize]);

  // Detect current font size at cursor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const detectSize = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      if (!node || !editor.contains(node)) return;
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
      if (el) {
        const computed = window.getComputedStyle(el).fontSize;
        const px = parseInt(computed);
        if (px && px !== currentFontSize) setCurrentFontSize(px);
      }
    };
    document.addEventListener('selectionchange', detectSize);
    return () => document.removeEventListener('selectionchange', detectSize);
  }, [currentFontSize]);

  // Helper: insert a styled span and place cursor inside it
  const insertStyledSpan = (styles: Partial<CSSStyleDeclaration>) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (sel.isCollapsed) {
      const span = document.createElement('span');
      Object.assign(span.style, styles);
      span.textContent = '\u200B';
      const range = sel.getRangeAt(0);
      range.insertNode(span);
      // Place cursor inside the span, after the zero-width space
      const newRange = document.createRange();
      newRange.setStart(span.firstChild!, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      const range = sel.getRangeAt(0);
      const contents = range.extractContents();
      const span = document.createElement('span');
      Object.assign(span.style, styles);
      span.appendChild(contents);
      range.insertNode(span);
      sel.collapseToEnd();
    }
    syncContent();
  };

  const applyFontSize = (size: number) => {
    // Preserve current font family when changing size
    const currentFont = fontFamilies.find(f => f.label === currentFontFamily);
    const styles: Partial<CSSStyleDeclaration> = { fontSize: `${size}px` };
    if (currentFont) styles.fontFamily = currentFont.value;
    insertStyledSpan(styles);
    setCurrentFontSize(size);
    setShowFontSize(false);
  };

  // Font family dropdown (웹폰트 기반 - 모든 OS에서 동작)
  const fontFamilies = [
    { label: '프리텐다드', value: 'Pretendard, sans-serif' },
    { label: '나눔고딕', value: '"Nanum Gothic", sans-serif' },
    { label: '나눔명조', value: '"Nanum Myeongjo", serif' },
    { label: '나눔스퀘어', value: '"NanumSquare", sans-serif' },
    { label: '고딕 A1', value: '"Gothic A1", sans-serif' },
    { label: '노토 산스', value: '"Noto Sans KR", sans-serif' },
    { label: '노토 세리프', value: '"Noto Serif KR", serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier', value: '"Courier New", monospace' },
  ];
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [currentFontFamily, setCurrentFontFamily] = useState('프리텐다드');
  const fontFamilyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(e.target as Node)) setShowFontFamily(false);
    };
    if (showFontFamily) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFontFamily]);

  const applyFontFamily = (font: { label: string; value: string }) => {
    // Preserve current font size when changing font family
    insertStyledSpan({ fontFamily: font.value, fontSize: `${currentFontSize}px` });
    setCurrentFontFamily(font.label);
    setShowFontFamily(false);
  };

  // Text color picker - 7 columns (gray, red, orange, yellow, green, blue, purple) x 7 rows (light→dark)
  const textColors = [
    // Col:  Gray      Red       Orange    Yellow    Green     Blue      Purple
    /*1*/  '#ffffff', '#ffcccc', '#ffe0cc', '#ffffcc', '#ccffcc', '#cce0ff', '#e0ccff',
    /*2*/  '#dddddd', '#ff9999', '#ffbb77', '#ffff99', '#99ff99', '#99ccff', '#cc99ff',
    /*3*/  '#bbbbbb', '#ff6666', '#ff9933', '#ffff66', '#66cc66', '#6699ff', '#9966ff',
    /*4*/  '#888888', '#ff0000', '#ff6600', '#ffcc00', '#00cc00', '#0066ff', '#6633cc',
    /*5*/  '#555555', '#cc0000', '#cc5500', '#cc9900', '#009900', '#0044cc', '#4400aa',
    /*6*/  '#333333', '#880000', '#883300', '#886600', '#006600', '#003388', '#330077',
    /*7*/  '#000000', '#440000', '#441a00', '#443300', '#003300', '#001a44', '#1a0033',
  ];
  const [showTextColor, setShowTextColor] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState('#1a1a1a');
  const textColorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (textColorRef.current && !textColorRef.current.contains(e.target as Node)) setShowTextColor(false);
    };
    if (showTextColor) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTextColor]);

  const applyTextColor = (color: string) => {
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
    setCurrentTextColor(color);
    setShowTextColor(false);
    syncContent();
  };

  const toolbarGroups: { label: string; action: () => void; title: string }[][] = [
    [
      { label: '\u2022 UL', action: () => exec('insertUnorderedList'), title: '글머리 기호' },
      { label: '1. OL', action: () => exec('insertOrderedList'), title: '번호 매기기' },
    ],
    [
      { label: '\u201C\u201D', action: () => handleHeading('blockquote'), title: '인용문' },
      { label: '<>', action: () => {
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, '<pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-family:monospace;overflow-x:auto;"><code>\n</code></pre>');
        syncContent();
      }, title: '코드 블록' },
    ],
    [
      { label: '\uD83D\uDD17', action: handleLink, title: '링크 삽입' },
    ],
    [
      { label: 'align-left', action: () => exec('justifyLeft'), title: '왼쪽 정렬' },
      { label: 'align-center', action: () => exec('justifyCenter'), title: '가운데 정렬' },
      { label: 'align-right', action: () => exec('justifyRight'), title: '오른쪽 정렬' },
    ],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
        border: `1px solid ${colors.border}`, borderBottom: 'none',
        borderRadius: '8px 8px 0 0', background: '#fafafa', alignItems: 'center',
        flexShrink: 0,
      }}>
        {/* 0. Undo / Redo */}
        <button type="button" title="실행 취소 (Ctrl+Z)"
          onMouseDown={e => { e.preventDefault(); exec('undo'); }}
          style={{ ...toolbarBtnStyle, padding: '4px 8px' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <button type="button" title="다시 실행 (Ctrl+Y)"
          onMouseDown={e => { e.preventDefault(); exec('redo'); }}
          style={{ ...toolbarBtnStyle, padding: '4px 8px' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
        </button>
        <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 4px' }} />
        {/* 1. B I U S */}
        {[
          { label: 'B', action: () => exec('bold'), title: '굵게', fw: 800, fs: 'normal' as const, td: 'none' },
          { label: 'I', action: () => exec('italic'), title: '기울임', fw: 600, fs: 'italic' as const, td: 'none' },
          { label: 'U', action: () => exec('underline'), title: '밑줄', fw: 600, fs: 'normal' as const, td: 'underline' },
          { label: 'S', action: () => exec('strikeThrough'), title: '취소선', fw: 600, fs: 'normal' as const, td: 'line-through' },
        ].map((btn, i) => (
          <button key={i} type="button" title={btn.title}
            onMouseDown={e => { e.preventDefault(); btn.action(); }}
            style={{ ...toolbarBtnStyle, fontWeight: btn.fw, fontStyle: btn.fs, textDecoration: btn.td }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >{btn.label}</button>
        ))}
        {/* 2. Heading dropdown */}
        <div ref={headingDropdownRef} style={{ position: 'relative', marginLeft: 2 }}>
          <button type="button" title="소제목"
            onMouseDown={e => { e.preventDefault(); setShowHeadingDropdown(!showHeadingDropdown); }}
            style={{
              ...toolbarBtnStyle, display: 'flex', alignItems: 'center', gap: 3,
              padding: '5px 8px', minWidth: 64, justifyContent: 'center',
              border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{currentHeading}</span>
            <span style={{ fontSize: 8, color: colors.textLight }}>▾</span>
          </button>
          {showHeadingDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff',
              border: `1px solid ${colors.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: 150, padding: '4px 0',
            }}>
              {[
                { tag: 'p', label: '본문', size: 13, weight: 400 },
                { tag: 'h1', label: '제목 1', size: 20, weight: 800 },
                { tag: 'h2', label: '제목 2', size: 17, weight: 700 },
                { tag: 'h3', label: '제목 3', size: 15, weight: 700 },
                { tag: 'h4', label: '제목 4', size: 13, weight: 700 },
              ].map(h => (
                <button key={h.tag}
                  onMouseDown={e => { e.preventDefault(); applyHeading(h.tag, h.label); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 14px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: h.size, fontWeight: h.weight,
                    color: currentHeading === h.label ? colors.green : colors.text, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span>{h.label}</span>
                  {currentHeading === h.label && <span style={{ fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 1, height: 20, background: colors.border, margin: '0 4px' }} />
        {/* Text color picker */}
        <div ref={textColorRef} style={{ position: 'relative' }}>
          <button type="button" title="글자색"
            onMouseDown={e => { e.preventDefault(); setShowTextColor(!showTextColor); }}
            style={{ ...toolbarBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 0, padding: '4px 8px' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>A</span>
            <div style={{ width: 14, height: 3, borderRadius: 1, background: currentTextColor, marginTop: 1 }} />
          </button>
          {showTextColor && (
            <div style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4,
              background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, padding: 10,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {textColors.map(c => (
                  <button key={c}
                    onMouseDown={e => { e.preventDefault(); applyTextColor(c); }}
                    style={{
                      width: 24, height: 24, borderRadius: 3,
                      border: c === currentTextColor ? '2px solid #333' : (c === '#ffffff' || c === '#eeeeee' || c === '#dddddd' ? '1px solid #ccc' : '1px solid transparent'),
                      background: c, cursor: 'pointer', transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, height: 20, background: colors.border, margin: '0 4px' }} />
        {/* 3. Font size dropdown */}
        <div ref={fontSizeRef} style={{ position: 'relative', marginRight: 2 }}>
          <button type="button" title="글자 크기"
            onMouseDown={e => { e.preventDefault(); setShowFontSize(!showFontSize); }}
            style={{
              ...toolbarBtnStyle, display: 'flex', alignItems: 'center', gap: 3,
              padding: '5px 8px', minWidth: 48, justifyContent: 'center',
              border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>{currentFontSize}</span>
            <span style={{ fontSize: 8, color: colors.textLight }}>▾</span>
          </button>
          {showFontSize && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff',
              border: `1px solid ${colors.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: 70, maxHeight: 280, overflowY: 'auto', padding: '4px 0',
            }}>
              {fontSizes.map(size => (
                <button key={size}
                  onMouseDown={e => { e.preventDefault(); applyFontSize(size); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 14px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: size === currentFontSize ? 700 : 400,
                    color: size === currentFontSize ? colors.green : colors.text, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span>{size}</span>
                  {size === currentFontSize && <span style={{ fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 4. Font family dropdown */}
        <div ref={fontFamilyRef} style={{ position: 'relative', marginRight: 2 }}>
          <button type="button" title="글꼴"
            onMouseDown={e => { e.preventDefault(); setShowFontFamily(!showFontFamily); }}
            style={{
              ...toolbarBtnStyle, display: 'flex', alignItems: 'center', gap: 3,
              padding: '5px 8px', minWidth: 80, justifyContent: 'center',
              border: `1px solid ${colors.border}`, borderRadius: 4, background: '#fff',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 65 }}>{currentFontFamily}</span>
            <span style={{ fontSize: 8, color: colors.textLight }}>▾</span>
          </button>
          {showFontFamily && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff',
              border: `1px solid ${colors.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: 160, maxHeight: 320, overflowY: 'auto', padding: '4px 0',
            }}>
              {fontFamilies.map(font => (
                <button key={font.label}
                  onMouseDown={e => { e.preventDefault(); applyFontFamily(font); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 14px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, fontFamily: font.value,
                    fontWeight: font.label === currentFontFamily ? 700 : 400,
                    color: font.label === currentFontFamily ? colors.green : colors.text, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span>{font.label}</span>
                  {font.label === currentFontFamily && <span style={{ fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 1, height: 20, background: colors.border, margin: '0 4px' }} />
        {/* 5. Remaining toolbar groups (UL, OL, quote, code, link, align) */}
        {toolbarGroups.map((group, gi, arr) => (
          <div key={gi} style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {group.map((btn, bi) => (
              <button key={bi} type="button" title={btn.title}
                onMouseDown={e => { e.preventDefault(); btn.action(); }}
                style={toolbarBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {btn.label === 'align-left' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
                ) : btn.label === 'align-center' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                ) : btn.label === 'align-right' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
                ) : btn.label}
              </button>
            ))}
            {gi < arr.length - 1 && (
              <div style={{ width: 1, height: 20, background: colors.border, margin: '0 4px' }} />
            )}
          </div>
        ))}
        {/* Insert (+) menu button */}
        <div style={{ width: 1, height: 20, background: colors.border, margin: '0 4px' }} />
        <div ref={insertMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            title="미디어 삽입"
            onMouseDown={e => { e.preventDefault(); setShowInsertMenu(!showInsertMenu); }}
            style={{ ...toolbarBtnStyle, fontSize: 18, fontWeight: 800, lineHeight: 1, padding: '4px 10px' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8e8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            +
          </button>
          {showInsertMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff',
              border: `1px solid ${colors.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: 180, overflow: 'hidden',
            }}>
              {[
                {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
                  label: '이미지', desc: '이미지 파일 업로드',
                  action: () => { fileInputRef.current?.click(); setShowInsertMenu(false); },
                },
                {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
                  label: '유튜브 동영상', desc: '유튜브 링크로 삽입',
                  action: handleVideoInsert,
                },
                {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
                  label: '동영상 파일', desc: '동영상 파일 업로드',
                  action: () => { videoInputRef.current?.click(); setShowInsertMenu(false); },
                },
                {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                  label: '파일 첨부', desc: 'PDF, 문서 등 첨부',
                  action: () => { fileUploadRef.current?.click(); setShowInsertMenu(false); },
                },
              ].map((item, i) => (
                <button key={i} onMouseDown={e => { e.preventDefault(); item.action(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ color: colors.textLight, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: colors.text }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google Fonts for editor */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Gothic+A1:wght@400;700&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" />
      {/* Editor media hover styles */}
      <style>{`
        [contenteditable] img { cursor: pointer; transition: outline 0.15s; border-radius: 4px; }
        [contenteditable] img:hover { outline: 2px solid #3b82f6; outline-offset: 2px; }
        [contenteditable] div[contenteditable="false"] { cursor: pointer; transition: outline 0.15s; border-radius: 4px; }
        [contenteditable] div[contenteditable="false"]:hover { outline: 2px solid #3b82f6; outline-offset: 2px; }
      `}</style>
      {/* Editor Area - fills container height (#4) */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Upload loading overlay (#3) */}
        {uploadingCount > 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 8px 8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e8e8e8', borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>이미지 업로드 중... ({uploadingCount}장)</div>
            </div>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncContent}
          onBlur={syncContent}
          onPaste={async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (!file) return;
                setUploadingCount(1);
                try {
                  const asset = await uploadImage(file);
                  const imgUrl = asset.url;
                  editorRef.current?.focus();
                  document.execCommand('insertHTML', false, `<img src="${imgUrl}" alt="붙여넣기 이미지" style="max-width:100%;height:auto;margin:8px 0;" />`);
                  syncContent();
                } catch (err: any) {
                  alert('이미지 업로드 실패: ' + err.message);
                }
                setUploadingCount(0);
                return;
              }
            }
          }}
          style={{
            flex: 1, minHeight: 0, padding: '16px 18px', fontSize: 15, lineHeight: 1.8,
            border: `1px solid ${colors.border}`, borderRadius: '0 0 8px 8px',
            outline: 'none', background: '#fff', fontFamily: 'inherit',
            overflowY: 'auto',
          }}
          data-placeholder="본문을 작성하세요..."
        />

        {/* Image resize overlay */}
        {selectedImg && imgRect && (
          <div className="img-resize-overlay" style={{ position: 'absolute', top: imgRect.top, left: imgRect.left, width: imgRect.width, height: imgRect.height, pointerEvents: 'none', zIndex: 10 }}>
            {/* Border */}
            <div style={{ position: 'absolute', inset: 0, border: '2px solid #3b82f6', borderRadius: 2, pointerEvents: 'none' }} />
            {/* Alignment toolbar */}
            <div style={{ position: 'absolute', top: -36, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2, background: '#1a1a1a', borderRadius: 6, padding: '4px 6px', pointerEvents: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); alignImage(a); }} style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#444')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {a === 'left' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="14" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
                  : a === 'center' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: '#555', margin: '0 2px' }} />
              {/* Rotate left */}
              <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); rotateImage(270); }}
                style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#444')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                title="왼쪽 회전"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </button>
              {/* Rotate right */}
              <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); rotateImage(90); }}
                style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#444')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                title="오른쪽 회전"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
              </button>
              {/* Text overlay */}
              <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); addTextOverlay(); }}
                style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#444')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                title="텍스트 추가"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v18"/><path d="M5 6V3h14v3"/></svg>
              </button>
              <div style={{ width: 1, height: 16, background: '#555', margin: '0 2px' }} />
              <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); deleteSelectedMedia(); }}
                style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6666', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#442222')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                title="삭제"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
            {/* Size display */}
            <div style={{ position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              {Math.round(imgRect.width)} × {Math.round(imgRect.height)}
            </div>
            {/* Resize handles */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(h => (
              <div key={h} onMouseDown={startResize(h)} style={{
                position: 'absolute', width: 10, height: 10, background: '#3b82f6', border: '2px solid #fff', borderRadius: 2, pointerEvents: 'auto', cursor: h.includes('left') ? (h.includes('top') ? 'nw-resize' : 'sw-resize') : (h.includes('top') ? 'ne-resize' : 'se-resize'),
                ...(h.includes('top') ? { top: -5 } : { bottom: -5 }),
                ...(h.includes('left') ? { left: -5 } : { right: -5 }),
              }} />
            ))}
            {/* Edge handles */}
            {['right', 'bottom', 'left', 'top'].map(h => (
              <div key={h} onMouseDown={startResize(h)} style={{
                position: 'absolute', pointerEvents: 'auto', background: '#3b82f6', borderRadius: 1,
                ...(h === 'right' ? { right: -3, top: '50%', transform: 'translateY(-50%)', width: 4, height: 24, cursor: 'ew-resize' } :
                  h === 'left' ? { left: -3, top: '50%', transform: 'translateY(-50%)', width: 4, height: 24, cursor: 'ew-resize' } :
                  h === 'bottom' ? { bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 24, height: 4, cursor: 'ns-resize' } :
                  { top: -3, left: '50%', transform: 'translateX(-50%)', width: 24, height: 4, cursor: 'ns-resize' }),
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />
      <input ref={fileUploadRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

      {/* YouTube embed modal */}
      {showYoutubeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setShowYoutubeModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>유튜브 동영상 삽입</div>
                <div style={{ fontSize: 12, color: colors.textLight }}>유튜브 링크를 붙여넣으면 미리보기가 표시됩니다</div>
              </div>
            </div>

            <input
              autoFocus
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => handleYoutubeUrlChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmYoutubeInsert()}
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14, border: `2px solid ${youtubeError ? colors.red : youtubePreviewId ? colors.green : colors.border}`,
                borderRadius: 10, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
            />
            {youtubeError && <div style={{ fontSize: 12, color: colors.red, marginTop: 6 }}>{youtubeError}</div>}

            {youtubePreviewId && (
              <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                <iframe
                  width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${youtubePreviewId}`}
                  frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ display: 'block' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setShowYoutubeModal(false)}
                style={{ ...s.btn, ...s.btnOutline, padding: '10px 24px', fontSize: 13, borderRadius: 8 }}
              >취소</button>
              <button
                onClick={confirmYoutubeInsert}
                disabled={!youtubePreviewId}
                style={{
                  ...s.btn, padding: '10px 24px', fontSize: 13, borderRadius: 8, fontWeight: 700,
                  background: youtubePreviewId ? colors.text : '#ccc', color: '#fff', border: 'none',
                  cursor: youtubePreviewId ? 'pointer' : 'not-allowed',
                }}
              >삽입</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RichTextEditor;
export { toolbarBtnStyle };
