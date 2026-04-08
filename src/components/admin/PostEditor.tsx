import { useState, useEffect, useRef } from 'react';
import { colors, s } from './shared/styles';
import { calculateScores } from './shared/seoScoring';
import { ScoreCategoryPanel, ScoreCircle } from './shared/SeoComponents';
import RichTextEditor from './RichTextEditor';
import ImagePicker from './ImagePicker';

interface PostEditorProps {
  post?: any;
  categories: any[];
  tags: any[];
}

function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export default function PostEditor({ post, categories, tags }: PostEditorProps) {
  const isEditing = !!post;

  // ── State ──
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [content, setContent] = useState(post?.content || '');
  const [categoryId, setCategoryId] = useState<number | null>(post?.category_id || null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    post?.tags?.map((t: any) => t.id) || []
  );
  const [tagInput, setTagInput] = useState('');
  const [image, setImage] = useState(post?.image || '');
  const [focusKeyword, setFocusKeyword] = useState(post?.focus_keyword || '');
  const [seoTitle, setSeoTitle] = useState(post?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(post?.seo_description || '');
  const [draft, setDraft] = useState(post ? Boolean(post.draft) : false);
  const [scheduledAt, setScheduledAt] = useState(post?.scheduled_at || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);
  const [toastMsg, setToastMsg] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Image settings panel state
  const [selectedEditorImg, setSelectedEditorImg] = useState<HTMLImageElement | null>(null);
  const [imgAlt, setImgAlt] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const [imgLink, setImgLink] = useState('');

  // Revision state
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // ── Auto-generate slug from title ──
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // ── Toast helper ──
  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  }

  // ── Client-side SEO/GEO scoring ──
  const selectedTagNames = selectedTagIds
    .map((id) => tags.find((t: any) => t.id === id)?.name || '')
    .filter(Boolean);
  const categoryName = categories.find((c: any) => c.id === categoryId)?.name || '';
  const scores = calculateScores({
    title,
    excerpt: seoDescription,
    body: content,
    focusKeyword,
    seoTitle: seoTitle || title,
    seoDesc: seoDescription,
    tags: selectedTagNames,
    category: categoryName,
    slug,
  });

  // ── Save handler ──
  async function handleSave(publish?: boolean) {
    if (!title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    if (!slug.trim()) {
      setError('슬러그를 입력하세요.');
      return;
    }

    setSaving(true);
    setError('');

    const isDraft = publish === undefined ? draft : !publish;

    const reqBody = {
      title: title.trim(),
      slug: slug.trim(),
      description: seoDescription,
      content,
      category_id: categoryId,
      image,
      focus_keyword: focusKeyword,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_score: scores.totalScore,
      draft: isDraft ? 1 : 0,
      scheduled_at: scheduledAt || null,
      tags: selectedTagIds,
    };

    try {
      const url = isEditing ? `/api/posts/${post.id}` : '/api/posts';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '저장 실패');
        setSaving(false);
        return;
      }

      showToast(publish ? '발행되었습니다!' : '임시저장 완료!');
      setTimeout(() => {
        window.location.href = '/admin/posts';
      }, 1000);
    } catch {
      setError('네트워크 오류');
      setSaving(false);
    }
  }

  // ── Tag management (ID-based) ──
  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagsFromInput();
    }
  }

  function addTagsFromInput() {
    const names = tagInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const newIds = [...selectedTagIds];
    for (const name of names) {
      const found = tags.find(
        (t: any) => t.name.toLowerCase() === name.toLowerCase()
      );
      if (found && !newIds.includes(found.id)) {
        newIds.push(found.id);
      }
    }
    setSelectedTagIds(newIds);
    setTagInput('');
  }

  function removeTag(tagId: number) {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  }

  // ── Revision handlers ──
  async function loadRevisions() {
    if (!isEditing) return;
    setLoadingRevisions(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
      }
    } catch {
      // silently fail
    }
    setLoadingRevisions(false);
  }

  async function restoreRevision(revisionId: number) {
    if (!window.confirm('이 버전으로 복원하시겠습니까? 현재 내용은 리비전으로 저장됩니다.')) return;
    try {
      const res = await fetch(`/api/posts/${post.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || '복원에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
  }

  // ── Render ──
  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '10px 28px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toastMsg}
        </div>
      )}

      {/* Back link */}
      <a
        href="/admin/posts"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: colors.textLight, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
      >
        <span>{'<'}</span> 글 목록으로
      </a>

      {/* Grid: Left (editor) + Right (sidebar) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* ── Left Column ── */}
        <div>
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            style={{ width: '100%', fontSize: 24, fontWeight: 800, border: `1px solid ${colors.border}`, borderRadius: 8, outline: 'none', padding: '14px 16px', marginBottom: 10, color: colors.text, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }}
          />

          {/* Slug */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, fontSize: 13, color: colors.textLight }}>
            <span style={{ fontWeight: 600 }}>/blog/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setSlug(e.target.value);
              }}
              onClick={() => setSlugManuallyEdited(true)}
              placeholder="post-slug"
              style={{ border: `1px solid ${colors.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 13, color: colors.textLight, flex: 1, outline: 'none', background: '#fafafa', fontFamily: 'monospace' }}
            />
          </div>

          {/* Rich Text Editor */}
          <RichTextEditor
            value={content}
            onChange={setContent}
            onImageSelect={(img) => {
              setSelectedEditorImg(img);
              if (img && img.tagName === 'IMG') {
                setImgAlt(img.getAttribute('alt') || '');
                const wrapper = img.closest('.img-overlay-wrapper');
                const container = wrapper || img;
                const figureWrapper = container.closest('.img-figure-wrapper');
                const captionEl = figureWrapper?.querySelector('.img-caption');
                setImgCaption(captionEl?.textContent || '');
                const link = img.closest('a');
                setImgLink(link?.getAttribute('href') || '');
              } else {
                setImgAlt('');
                setImgCaption('');
                setImgLink('');
              }
            }}
          />
        </div>

        {/* ── Right Column (Sidebar) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Panel 1: Conditional Image Settings / SEO Score */}
          {selectedEditorImg && selectedEditorImg.tagName === 'IMG' ? (
            <div style={s.card} className="image-settings-panel">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: colors.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>이미지 설정</div>
                  <div style={{ fontSize: 10, color: colors.textLight }}>다른 곳을 클릭하면 SEO 분석으로 돌아갑니다</div>
                </div>
              </div>

              {/* Preview thumbnail */}
              <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: `1px solid ${colors.border}`, background: '#f5f5f5' }}>
                <img src={selectedEditorImg.src} style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'contain' }} />
              </div>

              {/* Alt text */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
                  이미지 설명 (Alt Text)
                  <span style={{ fontSize: 9, fontWeight: 500, color: '#fff', background: colors.green, padding: '1px 5px', borderRadius: 3 }}>SEO</span>
                </label>
                <input
                  type="text"
                  placeholder="검색엔진이 이미지를 이해할 수 있도록 설명을 입력하세요"
                  value={imgAlt}
                  onChange={(e) => {
                    setImgAlt(e.target.value);
                    selectedEditorImg.setAttribute('alt', e.target.value);
                  }}
                  style={{ ...s.input, fontSize: 12, padding: '8px 10px' }}
                />
              </div>

              {/* Caption */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 4, display: 'block' }}>
                  캡션
                </label>
                <input
                  type="text"
                  placeholder="이미지 하단 설명 (선택)"
                  value={imgCaption}
                  onChange={(e) => {
                    setImgCaption(e.target.value);
                    const wrapper = selectedEditorImg.closest('.img-overlay-wrapper');
                    const imgEl = wrapper || selectedEditorImg;
                    let figureEl = imgEl.closest('.img-figure-wrapper') as HTMLElement | null;
                    let captionEl = figureEl?.querySelector('.img-caption') as HTMLElement | null;

                    if (e.target.value) {
                      if (!figureEl) {
                        figureEl = document.createElement('div');
                        figureEl.className = 'img-figure-wrapper';
                        figureEl.style.cssText = 'display:inline-block;margin:8px 0;max-width:100%;vertical-align:top;';
                        imgEl.parentElement?.insertBefore(figureEl, imgEl);
                        figureEl.appendChild(imgEl);
                      }
                      if (!captionEl) {
                        captionEl = document.createElement('div');
                        captionEl.className = 'img-caption';
                        captionEl.style.cssText = 'text-align:center;font-size:13px;color:#888;margin:0;padding:2px 0;word-wrap:break-word;overflow-wrap:break-word;';
                        figureEl.appendChild(captionEl);
                      }
                      captionEl.textContent = e.target.value;
                    } else {
                      if (captionEl) captionEl.remove();
                      if (figureEl && !figureEl.querySelector('.img-caption')) {
                        figureEl.parentElement?.insertBefore(imgEl, figureEl);
                        figureEl.remove();
                      }
                    }
                    setContent(document.querySelector('[contenteditable]')?.innerHTML || content);
                  }}
                  style={{ ...s.input, fontSize: 12, padding: '8px 10px' }}
                />
              </div>

              {/* Link */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 4, display: 'block' }}>
                  클릭 시 이동 링크
                </label>
                <input
                  type="text"
                  placeholder="https://example.com (선택)"
                  value={imgLink}
                  onChange={(e) => {
                    setImgLink(e.target.value);
                    const existingLink = selectedEditorImg.closest('a');
                    if (e.target.value) {
                      if (existingLink) {
                        existingLink.setAttribute('href', e.target.value);
                      } else {
                        const a = document.createElement('a');
                        a.href = e.target.value;
                        a.target = '_blank';
                        a.rel = 'noopener';
                        selectedEditorImg.parentElement?.insertBefore(a, selectedEditorImg);
                        a.appendChild(selectedEditorImg);
                      }
                    } else {
                      if (existingLink) {
                        existingLink.parentElement?.insertBefore(selectedEditorImg, existingLink);
                        existingLink.remove();
                      }
                    }
                    setContent(document.querySelector('[contenteditable]')?.innerHTML || content);
                  }}
                  style={{ ...s.input, fontSize: 12, padding: '8px 10px' }}
                />
              </div>

              {/* Image info */}
              <div style={{ fontSize: 11, color: colors.textLight, padding: '8px 0', borderTop: `1px solid ${colors.border}` }}>
                <div>크기: {selectedEditorImg.naturalWidth} x {selectedEditorImg.naturalHeight}px</div>
              </div>
            </div>
          ) : (
            /* SEO/GEO Score Panel */
            <div style={s.card}>
              {/* Score header with circles */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${colors.border}` }}>
                <ScoreCircle score={scores.seoScore} label="SEO" size={48} />
                <ScoreCircle score={scores.totalScore} label="종합" size={64} />
                <ScoreCircle score={scores.geoScore} label="GEO" size={48} />
              </div>

              {/* SEO Categories */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.text, marginBottom: 4, letterSpacing: '0.02em' }}>
                  SEO 분석 <span style={{ fontWeight: 400, color: colors.textLight }}>({scores.seoScore}/100)</span>
                </div>
                {scores.seoCategories.map((cat, i) => (
                  <ScoreCategoryPanel key={i} category={cat} defaultOpen={cat.failCount > 0 && i === 0} />
                ))}
              </div>

              {/* GEO Categories */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `2px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.text, marginBottom: 4, letterSpacing: '0.02em' }}>
                  GEO 분석 (AI 검색 최적화) <span style={{ fontWeight: 400, color: colors.textLight }}>({scores.geoScore}/100)</span>
                </div>
                {scores.geoCategories.map((cat, i) => (
                  <ScoreCategoryPanel key={i} category={cat} defaultOpen={cat.failCount > 0 && i === 0} />
                ))}
              </div>
            </div>
          )}

          {/* Panel 2: Error message */}
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Panel 3: Publish */}
          <div style={s.card}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>발행</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{ ...s.btn, ...s.btnOutline, flex: 1, fontSize: 12 }}
              >
                {saving ? '...' : '임시저장'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{ ...s.btn, padding: '10px 20px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '2px solid #22c55e', background: '#fff', color: '#22c55e', cursor: 'pointer', flex: 1 }}
              >
                {saving ? '...' : '발행'}
              </button>
            </div>

            {/* Scheduled publishing */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.orange }}>예약 발행</label>
              <input
                type="datetime-local"
                style={{ ...s.input, fontSize: 12, marginTop: 4 }}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => setScheduledAt('')}
                  style={{ marginTop: 4, padding: '2px 6px', background: 'none', border: 'none', color: colors.red, fontSize: 11, cursor: 'pointer' }}
                >
                  예약 취소
                </button>
              )}
            </div>

            {/* Draft toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12 }}>
              <input
                type="checkbox"
                id="draft-toggle"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="draft-toggle" style={{ cursor: 'pointer', color: colors.textLight }}>
                임시글 (비공개)
              </label>
            </div>

            {/* Save button */}
            <button
              onClick={() => handleSave()}
              disabled={saving}
              style={{ ...s.btn, width: '100%', background: colors.text, color: '#fff', fontSize: 13, padding: '12px 0', fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>

            {/* Preview link */}
            {isEditing && !post?.draft && (
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: colors.textLight, textDecoration: 'underline' }}
              >
                미리보기
              </a>
            )}
          </div>

          {/* Panel 4: Category */}
          <div style={s.card}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>카테고리</h3>
            <select
              style={s.input}
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">카테고리 선택</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Panel 5: Tags */}
          <div style={s.card}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>태그</h3>
            <input
              style={s.input}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={addTagsFromInput}
              placeholder="태그 입력 후 Enter"
              list="tag-suggestions"
            />
            <datalist id="tag-suggestions">
              {tags
                .filter((t: any) => !selectedTagIds.includes(t.id))
                .map((t: any) => (
                  <option key={t.id} value={t.name} />
                ))}
            </datalist>
            {selectedTagIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {selectedTagIds.map((id) => {
                  const tag = tags.find((t: any) => t.id === id);
                  return tag ? (
                    <span
                      key={id}
                      style={{ ...s.badge, background: '#f0f0f0', cursor: 'pointer', fontSize: 11 }}
                      onClick={() => removeTag(id)}
                    >
                      #{tag.name} ✕
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Panel 6: Featured Image */}
          <div style={s.card}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>대표 이미지</h3>
            <div
              onClick={() => setShowImagePicker(true)}
              style={{ border: `2px dashed ${colors.border}`, borderRadius: 8, padding: image ? 0 : 24, textAlign: 'center', cursor: 'pointer', background: '#fafafa', transition: 'border-color 0.15s', overflow: 'hidden', position: 'relative' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.border)}
            >
              {image ? (
                <div style={{ position: 'relative' }}>
                  <img src={image} alt="대표 이미지" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block', borderRadius: 4 }} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage('');
                    }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                    title="이미지 제거"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <div style={{ fontSize: 12, color: colors.textLight }}>이미지 선택</div>
                </>
              )}
            </div>
          </div>

          {/* Panel 7: SEO Settings */}
          <div style={s.card}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>SEO 설정</h3>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textLight, marginBottom: 4, display: 'block' }}>포커스 키워드</label>
              <input style={s.input} value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} placeholder="예: 웨딩 촬영" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textLight, marginBottom: 4, display: 'block' }}>SEO 제목</label>
              <input style={s.input} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || 'SEO 제목'} />
              <span style={{ fontSize: 11, color: (seoTitle || title).length > 60 ? colors.red : colors.textLight }}>{(seoTitle || title).length}/60</span>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textLight, marginBottom: 4, display: 'block' }}>SEO 설명</label>
              <textarea style={{ ...s.textarea, minHeight: 60 }} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="검색 결과에 표시될 설명" />
              <span style={{ fontSize: 11, color: seoDescription.length > 160 ? colors.red : colors.textLight }}>{seoDescription.length}/160</span>
            </div>
          </div>

          {/* Panel 8: Share Preview */}
          <div style={s.card}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>공유 미리보기</h3>
            <div style={{ fontSize: 11, color: colors.textLight, marginBottom: 6 }}>카카오톡 / Facebook</div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: 12, marginBottom: 12, background: '#fafafa' }}>
              <div style={{ fontSize: 11, color: colors.textLight }}>simplecube.co.kr</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, margin: '4px 0 2px' }}>{seoTitle || title || 'SEO 제목'}</div>
              <div style={{ fontSize: 11, color: colors.textLight }}>{seoDescription || '메타 설명이 여기에 표시됩니다.'}</div>
            </div>
            <div style={{ fontSize: 11, color: colors.textLight, marginBottom: 6 }}>Google 검색결과</div>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a0dab' }}>{seoTitle || title || 'SEO 제목'} - 심플큐브</div>
              <div style={{ fontSize: 11, color: '#006621' }}>simplecube.co.kr/blog/{slug || 'post-slug'}</div>
              <div style={{ fontSize: 11, color: colors.textLight }}>{seoDescription || '메타 설명이 여기에 표시됩니다.'}</div>
            </div>
          </div>

          {/* Panel 9: Revisions (only if editing) */}
          {isEditing && (
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>리비전</h3>
                <button
                  onClick={() => {
                    if (!showRevisions) loadRevisions();
                    setShowRevisions(!showRevisions);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: colors.textLight }}
                >
                  {showRevisions ? '접기' : '펼치기'}
                </button>
              </div>
              {showRevisions && (
                <div>
                  {loadingRevisions ? (
                    <div style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', padding: 12 }}>불러오는 중...</div>
                  ) : revisions.length === 0 ? (
                    <div style={{ fontSize: 12, color: colors.textLight, textAlign: 'center', padding: 12 }}>저장된 리비전이 없습니다</div>
                  ) : (
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {revisions.map((rev: any) => (
                        <div key={rev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 12 }}>
                          <span style={{ color: colors.textLight }}>
                            {new Date(rev.created_at).toLocaleString('ko-KR')}
                          </span>
                          <button
                            onClick={() => restoreRevision(rev.id)}
                            style={{ ...s.btn, fontSize: 11, padding: '4px 10px', background: 'none', border: `1px solid ${colors.border}`, color: colors.text, cursor: 'pointer', borderRadius: 4 }}
                          >
                            복원
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ImagePicker modal */}
      {showImagePicker && (
        <ImagePicker
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={(url: string) => {
            setImage(url);
            setShowImagePicker(false);
          }}
        />
      )}
    </div>
  );
}
