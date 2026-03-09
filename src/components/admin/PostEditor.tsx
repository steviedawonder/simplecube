import { useState, useEffect, useCallback, useRef } from 'react';
import TipTapEditor from './TipTapEditor';
import SEOPanel from './SEOPanel';
import ImagePicker from './ImagePicker';

interface PostEditorProps {
  post?: any;
  categories: any[];
  tags: any[];
}

interface SEOCheck {
  id: string;
  category: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  score: number;
  maxScore: number;
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
  const [showOgPreview, setShowOgPreview] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<'featured' | 'editor'>('featured');
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // SEO state
  const [seoScore, setSeoScore] = useState(post?.seo_score || 0);
  const [seoChecks, setSeoChecks] = useState<SEOCheck[]>([]);
  const seoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Debounced SEO analysis
  const analyzeSEO = useCallback(() => {
    if (seoTimerRef.current) {
      clearTimeout(seoTimerRef.current);
    }

    seoTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/seo/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            seoTitle: seoTitle || title,
            description: seoDescription,
            content,
            slug,
            focusKeyword: focusKeyword,
            postId: post?.id || 0,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSeoScore(data.score);
          setSeoChecks(data.checks || []);
        }
      } catch {
        // Silently fail SEO analysis
      }
    }, 800);
  }, [title, seoTitle, seoDescription, content, slug, focusKeyword, post?.id]);

  useEffect(() => {
    analyzeSEO();
    return () => {
      if (seoTimerRef.current) clearTimeout(seoTimerRef.current);
    };
  }, [analyzeSEO]);

  // Load revisions
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

  // Tag management
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

    const newIds: number[] = [...selectedTagIds];
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

  // Save handler
  async function handleSave() {
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

    const body = {
      title: title.trim(),
      slug: slug.trim(),
      description: seoDescription,
      content,
      category_id: categoryId,
      image,
      focus_keyword: focusKeyword,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_score: seoScore,
      draft: draft ? 1 : 0,
      scheduled_at: scheduledAt || null,
      tags: selectedTagIds,
    };

    try {
      const url = isEditing ? `/api/posts/${post.id}` : '/api/posts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '저장에 실패했습니다.');
        setSaving(false);
        return;
      }

      window.location.href = '/admin/posts';
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Left Column - 70% */}
      <div style={{ flex: '1 1 70%', minWidth: 0 }}>
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          style={{
            width: '100%',
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'inherit',
            border: 'none',
            outline: 'none',
            padding: '8px 0',
            color: '#1d1d1f',
            backgroundColor: 'transparent',
            marginBottom: 8,
          }}
        />

        {/* Slug Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: '0.8125rem', color: '#6e6e73', flexShrink: 0 }}>
            /blog/
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              setSlug(e.target.value);
            }}
            placeholder="post-slug"
            style={{
              flex: 1,
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              border: '1px solid #e8e8ed',
              borderRadius: 6,
              padding: '6px 10px',
              color: '#1d1d1f',
              backgroundColor: '#fafafa',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#D4AA45')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e8ed')}
          />
        </div>

        {/* TipTap Editor */}
        <TipTapEditor
          content={content}
          onChange={setContent}
          onImageButtonClick={() => {
            setImagePickerTarget('editor');
            setShowImagePicker(true);
          }}
        />
      </div>

      {/* Right Column - 30% Sticky Sidebar */}
      <div
        style={{
          flex: '0 0 320px',
          position: 'sticky',
          top: 72,
          maxHeight: 'calc(100vh - 88px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 8,
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        {/* SEO Score Panel - 최상단 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: '#1d1d1f' }}>
            SEO 점수
          </h3>
          <SEOPanel score={seoScore} checks={seoChecks} />
        </div>

        {/* Publish Section */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: '#1d1d1f' }}>
            발행
          </h3>

          {/* Draft / Publish Toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setDraft(true)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${draft ? '#D4AA45' : '#e8e8ed'}`,
                backgroundColor: draft ? 'rgba(212, 170, 69, 0.08)' : '#ffffff',
                color: draft ? '#D4AA45' : '#6e6e73',
                fontWeight: draft ? 600 : 400,
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={() => setDraft(false)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${!draft ? '#22c55e' : '#e8e8ed'}`,
                backgroundColor: !draft ? 'rgba(34, 197, 94, 0.08)' : '#ffffff',
                color: !draft ? '#22c55e' : '#6e6e73',
                fontWeight: !draft ? 600 : 400,
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              발행
            </button>
          </div>

          {/* Scheduled Publishing */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6e6e73', marginBottom: 4 }}>
              예약 발행
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #e8e8ed',
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                color: '#1d1d1f',
                outline: 'none',
              }}
            />
            {scheduledAt && (
              <button
                type="button"
                onClick={() => setScheduledAt('')}
                style={{
                  marginTop: 4,
                  padding: '2px 6px',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.6875rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                예약 취소
              </button>
            )}
          </div>

          {/* Save + Preview Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: saving ? '#8c8c8c' : '#1d1d1f',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            {isEditing && !post?.draft && (
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #e8e8ed',
                  backgroundColor: '#ffffff',
                  color: '#6e6e73',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
                title="미리보기"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Category Section */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 10, color: '#1d1d1f' }}>
            카테고리
          </h3>
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #e8e8ed',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              color: '#1d1d1f',
              backgroundColor: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">카테고리 선택</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags Section */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 10, color: '#1d1d1f' }}>
            태그
          </h3>

          {/* Selected tags as chips */}
          {selectedTagIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {selectedTagIds.map((tagId) => {
                const tag = tags.find((t: any) => t.id === tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tagId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      backgroundColor: '#f5f5f7',
                      borderRadius: 100,
                      fontSize: '0.75rem',
                      color: '#1d1d1f',
                    }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tagId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: '#8c8c8c',
                        fontSize: '0.875rem',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            onBlur={addTagsFromInput}
            placeholder="태그 입력 후 Enter"
            list="tag-suggestions"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #e8e8ed',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              color: '#1d1d1f',
              outline: 'none',
            }}
          />
          <datalist id="tag-suggestions">
            {tags
              .filter((t: any) => !selectedTagIds.includes(t.id))
              .map((t: any) => (
                <option key={t.id} value={t.name} />
              ))}
          </datalist>
        </div>

        {/* Featured Image */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 10, color: '#1d1d1f' }}>
            대표 이미지
          </h3>
          {image ? (
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <img
                src={image}
                alt="대표 이미지 미리보기"
                style={{
                  width: '100%',
                  height: 140,
                  objectFit: 'cover',
                  borderRadius: 6,
                  backgroundColor: '#f5f5f7',
                }}
              />
              <button
                type="button"
                onClick={() => setImage('')}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="이미지 제거"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setImagePickerTarget('featured');
                setShowImagePicker(true);
              }}
              style={{
                width: '100%',
                height: 100,
                borderRadius: 6,
                border: '2px dashed #e8e8ed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 10,
                color: '#8c8c8c',
                fontSize: '0.8125rem',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D4AA45';
                e.currentTarget.style.color = '#D4AA45';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e8e8ed';
                e.currentTarget.style.color = '#8c8c8c';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              이미지 선택
            </button>
          )}
          {image && (
            <button
              type="button"
              onClick={() => {
                setImagePickerTarget('featured');
                setShowImagePicker(true);
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #e8e8ed',
                backgroundColor: '#ffffff',
                color: '#6e6e73',
                fontSize: '0.8125rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#D4AA45')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e8e8ed')}
            >
              이미지 변경
            </button>
          )}
        </div>

        {/* SEO Settings */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: '#1d1d1f' }}>
            SEO 설정
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#6e6e73',
                  marginBottom: 4,
                }}
              >
                포커스 키워드
              </label>
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="예: 웨딩 촬영"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #e8e8ed',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                  color: '#1d1d1f',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#6e6e73',
                  marginBottom: 4,
                }}
              >
                SEO 제목
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || 'SEO 제목'}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #e8e8ed',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                  color: '#1d1d1f',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '0.6875rem', color: '#8c8c8c', marginTop: 2 }}>
                {(seoTitle || title).length}/60자
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#6e6e73',
                  marginBottom: 4,
                }}
              >
                SEO 설명
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="검색 결과에 표시될 설명"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #e8e8ed',
                  fontSize: '0.8125rem',
                  fontFamily: 'inherit',
                  color: '#1d1d1f',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
              />
              <div style={{ fontSize: '0.6875rem', color: '#8c8c8c', marginTop: 2 }}>
                {seoDescription.length}/160자
              </div>
            </div>
          </div>
        </div>

        {/* OG Preview */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8e8ed',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setShowOgPreview(!showOgPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#1d1d1f',
              padding: 0,
            }}
          >
            <span>공유 미리보기</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: showOgPreview ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showOgPreview && (
            <div style={{ marginTop: 12 }}>
              {/* Kakao / Facebook style */}
              <div style={{ fontSize: '0.6875rem', color: '#8c8c8c', marginBottom: 4 }}>카카오톡 / Facebook</div>
              <div
                style={{
                  border: '1px solid #e8e8ed',
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f7',
                }}
              >
                {image && (
                  <img
                    src={image}
                    alt="OG Preview"
                    style={{ width: '100%', height: 160, objectFit: 'cover' }}
                  />
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#8c8c8c', marginBottom: 2 }}>
                    simplecube.vercel.app
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d1d1f', marginBottom: 2, lineHeight: 1.3 }}>
                    {seoTitle || title || 'SEO 제목'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6e6e73', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {seoDescription || '메타 설명이 여기에 표시됩니다.'}
                  </div>
                </div>
              </div>

              {/* Google Search style */}
              <div style={{ fontSize: '0.6875rem', color: '#8c8c8c', marginTop: 12, marginBottom: 4 }}>Google 검색결과</div>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: '0.8125rem', color: '#1a0dab', fontWeight: 500, marginBottom: 2 }}>
                  {seoTitle || title || 'SEO 제목'} - SIMPLE CUBE
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#006621', marginBottom: 2 }}>
                  simplecube.vercel.app/blog/{slug || 'post-slug'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#545454', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {seoDescription || '메타 설명이 여기에 표시됩니다.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revisions Panel (only for editing) */}
        {isEditing && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e8e8ed',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowRevisions(!showRevisions);
                if (!showRevisions && revisions.length === 0) {
                  loadRevisions();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1d1d1f',
                padding: 0,
              }}
            >
              <span>버전 기록</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: showRevisions ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showRevisions && (
              <div style={{ marginTop: 12 }}>
                {loadingRevisions ? (
                  <div style={{ fontSize: '0.8125rem', color: '#8c8c8c', padding: '8px 0' }}>
                    불러오는 중...
                  </div>
                ) : revisions.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: '#8c8c8c', padding: '8px 0' }}>
                    저장된 버전이 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {revisions.map((rev: any) => (
                      <div
                        key={rev.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          backgroundColor: '#f5f5f7',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ color: '#1d1d1f', fontWeight: 500, marginBottom: 2 }}>
                            {rev.title?.substring(0, 30)}{rev.title?.length > 30 ? '...' : ''}
                          </div>
                          <div style={{ color: '#8c8c8c' }}>
                            {rev.created_at
                              ? new Date(rev.created_at).toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreRevision(rev.id)}
                          style={{
                            background: 'none',
                            border: '1px solid #e8e8ed',
                            borderRadius: 4,
                            padding: '3px 8px',
                            fontSize: '0.6875rem',
                            color: '#D4AA45',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontWeight: 500,
                          }}
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

      {/* Image Picker Modal */}
      <ImagePicker
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={(url) => {
          if (imagePickerTarget === 'featured') {
            setImage(url);
          } else {
            // Insert into TipTap editor - dispatch custom event
            window.dispatchEvent(new CustomEvent('tiptap-insert-image', { detail: { url } }));
          }
        }}
      />
    </div>
  );
}
