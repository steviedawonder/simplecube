import { useState } from 'react';

interface PostListProps {
  initialPosts: any[];
  viewMode?: 'active' | 'trash';
}

function SEOBadge({ score }: { score: number }) {
  let bgColor = '#fee2e2';
  let textColor = '#991b1b';
  if (score >= 70) {
    bgColor = '#dcfce7';
    textColor = '#166534';
  } else if (score >= 40) {
    bgColor = '#fef3c7';
    textColor = '#92400e';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 100,
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {score}
    </span>
  );
}

function StatusBadge({ draft, scheduledAt }: { draft: number | boolean; scheduledAt?: string }) {
  const isDraft = Boolean(draft);
  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  if (isScheduled) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 100,
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: '#ede9fe',
          color: '#6d28d9',
        }}
      >
        예약됨
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 100,
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: isDraft ? '#fef3c7' : '#dcfce7',
        color: isDraft ? '#92400e' : '#166534',
      }}
    >
      {isDraft ? '임시저장' : '발행됨'}
    </span>
  );
}

export default function PostList({ initialPosts, viewMode = 'active' }: PostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ title: '', url: '', description: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const filteredPosts = posts.filter((post) => {
    if (filter === 'published' && post.draft) return false;
    if (filter === 'draft' && !post.draft) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        post.title?.toLowerCase().includes(q) ||
        post.category_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleDelete(postId: number, postTitle: string) {
    if (!window.confirm(`"${postTitle}" 글을 휴지통으로 이동하시겠습니까?`)) return;

    setActionInProgress(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
    setActionInProgress(null);
  }

  async function handleDuplicate(postId: number) {
    setActionInProgress(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/admin/posts/${data.id}`;
      } else {
        const data = await res.json();
        alert(data.error || '복제에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
    setActionInProgress(null);
  }

  async function handleRestore(postId: number) {
    setActionInProgress(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/restore`, { method: 'POST' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        const data = await res.json();
        alert(data.error || '복원에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
    setActionInProgress(null);
  }

  async function handleQuickPublish(postId: number) {
    setActionInProgress(postId);
    try {
      // Fetch full post data first
      const getRes = await fetch(`/api/posts/${postId}`);
      if (!getRes.ok) {
        alert('글 데이터를 불러올 수 없습니다.');
        setActionInProgress(null);
        return;
      }
      const postData = await getRes.json();

      // Update with draft = 0 (published)
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...postData,
          draft: 0,
          tags: postData.tags?.map((t: any) => t.id) || [],
        }),
      });

      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, draft: 0 } : p))
        );
      } else {
        const data = await res.json();
        alert(data.error || '발행에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
    setActionInProgress(null);
  }

  async function handleReviewSubmit() {
    if (!reviewForm.title.trim() || !reviewForm.url.trim()) {
      alert('제목과 URL은 필수입니다.');
      return;
    }
    try {
      new URL(reviewForm.url);
    } catch {
      alert('올바른 URL을 입력해주세요. (예: https://blog.naver.com/...)');
      return;
    }
    setReviewSubmitting(true);
    try {
      const slug = reviewForm.title
        .trim()
        .toLowerCase()
        .replace(/[^가-힣a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60) + '-' + Date.now().toString(36);

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reviewForm.title.trim(),
          slug,
          description: reviewForm.description.trim() || `${reviewForm.title} - 외부 후기`,
          content: '',
          external_url: reviewForm.url.trim(),
          draft: 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowReviewModal(false);
        setReviewForm({ title: '', url: '', description: '' });
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || '등록에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
    setReviewSubmitting(false);
  }

  async function handlePermanentDelete(postId: number, postTitle: string) {
    if (!window.confirm(`"${postTitle}" 글을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    setActionInProgress(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/permanent-delete`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    }
    setActionInProgress(null);
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d1d1f', marginBottom: 2 }}>
            {viewMode === 'trash' ? '휴지통' : '글 관리'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6e6e73' }}>
            {viewMode === 'trash'
              ? `${posts.length}개의 삭제된 글`
              : `총 ${posts.length}개의 글`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {viewMode === 'active' ? (
            <>
              <a
                href="/admin/posts?view=trash"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#ffffff',
                  color: '#6e6e73',
                  border: '1px solid #e8e8ed',
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                휴지통
              </a>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowNewMenu((v) => !v)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    backgroundColor: '#1d1d1f',
                    color: '#ffffff',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  글 작성
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showNewMenu && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => setShowNewMenu(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e8e8ed',
                        borderRadius: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        zIndex: 50,
                        minWidth: 180,
                      }}
                    >
                      <a
                        href="/admin/posts/new"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          fontSize: '0.8125rem',
                          color: '#1d1d1f',
                          textDecoration: 'none',
                          borderBottom: '1px solid #f3f3f5',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f8f8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6e6e73" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        새 글 작성
                      </a>
                      <button
                        type="button"
                        onClick={() => { setShowNewMenu(false); setShowReviewModal(true); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          fontSize: '0.8125rem',
                          color: '#1d1d1f',
                          background: 'none',
                          border: 'none',
                          width: '100%',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f8f8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6e6e73" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        후기 가져오기
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <a
              href="/admin/posts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                backgroundColor: '#1d1d1f',
                color: '#ffffff',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              ← 글 목록으로
            </a>
          )}
        </div>
      </div>

      {/* Filters (only for active view) */}
      {viewMode === 'active' && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            style={{
              flex: '1 1 200px',
              maxWidth: 320,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #e8e8ed',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              color: '#1d1d1f',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
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
            <option value="all">전체</option>
            <option value="published">발행됨</option>
            <option value="draft">임시저장</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e8e8ed',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {filteredPosts.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: '#8c8c8c',
              fontSize: '0.9rem',
            }}
          >
            {viewMode === 'trash'
              ? '휴지통이 비어있습니다.'
              : search || filter !== 'all'
                ? '검색 결과가 없습니다.'
                : '아직 작성된 글이 없습니다.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>제목</th>
                  <th style={thStyle}>카테고리</th>
                  {viewMode === 'active' && <th style={{ ...thStyle, textAlign: 'center' }}>SEO 점수</th>}
                  <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>
                  <th style={thStyle}>
                    {viewMode === 'trash' ? '삭제일' : '날짜'}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td style={{ ...tdStyle, maxWidth: 300 }}>
                      {viewMode === 'active' ? (
                        <a
                          href={`/admin/posts/${post.id}`}
                          style={{
                            color: '#1d1d1f',
                            textDecoration: 'none',
                            fontWeight: 500,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#D4AA45')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#1d1d1f')}
                        >
                          {post.external_url && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4AA45" strokeWidth="2.5" style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          )}
                          {post.title}
                        </a>
                      ) : (
                        <span
                          style={{
                            color: '#8c8c8c',
                            fontWeight: 500,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {post.title}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#8c8c8c', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {post.category_name || '-'}
                    </td>
                    {viewMode === 'active' && (
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <SEOBadge score={post.seo_score || 0} />
                      </td>
                    )}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {viewMode === 'trash' ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 100,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                          }}
                        >
                          삭제됨
                        </span>
                      ) : (
                        <StatusBadge draft={post.draft} scheduledAt={post.scheduled_at} />
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#8c8c8c', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {viewMode === 'trash'
                        ? post.deleted_at
                          ? new Date(post.deleted_at).toLocaleDateString('ko-KR')
                          : '-'
                        : post.created_at
                          ? new Date(post.created_at).toLocaleDateString('ko-KR')
                          : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {viewMode === 'active' ? (
                        <>
                          {Boolean(post.draft) && (
                            <button
                              type="button"
                              onClick={() => handleQuickPublish(post.id)}
                              disabled={actionInProgress === post.id}
                              style={{
                                ...actionBtnStyle,
                                color: actionInProgress === post.id ? '#8c8c8c' : '#22c55e',
                                fontWeight: 600,
                              }}
                              onMouseEnter={(e) => {
                                if (actionInProgress !== post.id) e.currentTarget.style.color = '#16a34a';
                              }}
                              onMouseLeave={(e) => {
                                if (actionInProgress !== post.id) e.currentTarget.style.color = '#22c55e';
                              }}
                            >
                              발행
                            </button>
                          )}
                          <a
                            href={`/admin/posts/${post.id}`}
                            style={actionLinkStyle}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#D4AA45')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#6e6e73')}
                          >
                            수정
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(post.id)}
                            disabled={actionInProgress === post.id}
                            style={{
                              ...actionBtnStyle,
                              color: actionInProgress === post.id ? '#8c8c8c' : '#6e6e73',
                            }}
                            onMouseEnter={(e) => {
                              if (actionInProgress !== post.id) e.currentTarget.style.color = '#D4AA45';
                            }}
                            onMouseLeave={(e) => {
                              if (actionInProgress !== post.id) e.currentTarget.style.color = '#6e6e73';
                            }}
                          >
                            복제
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id, post.title)}
                            disabled={actionInProgress === post.id}
                            style={{
                              ...actionBtnStyle,
                              color: actionInProgress === post.id ? '#8c8c8c' : '#ef4444',
                              marginRight: 0,
                            }}
                          >
                            삭제
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestore(post.id)}
                            disabled={actionInProgress === post.id}
                            style={{
                              ...actionBtnStyle,
                              color: actionInProgress === post.id ? '#8c8c8c' : '#22c55e',
                            }}
                          >
                            복원
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(post.id, post.title)}
                            disabled={actionInProgress === post.id}
                            style={{
                              ...actionBtnStyle,
                              color: actionInProgress === post.id ? '#8c8c8c' : '#ef4444',
                              marginRight: 0,
                            }}
                          >
                            영구삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review import modal */}
      {showReviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 440,
              margin: '0 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
                후기 가져오기
              </h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8c8c8c' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#6e6e73', marginBottom: 20, lineHeight: 1.5 }}>
              외부 블로그 후기 링크를 입력하면 블로그 목록에 표시됩니다.<br/>
              클릭 시 해당 링크로 이동합니다.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={modalLabelStyle}>제목 *</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="예: 심플큐브 웨딩 포토부스 후기"
                  style={modalInputStyle}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>후기 URL *</label>
                <input
                  type="url"
                  value={reviewForm.url}
                  onChange={(e) => setReviewForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://blog.naver.com/..."
                  style={modalInputStyle}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>설명 (선택)</label>
                <input
                  type="text"
                  value={reviewForm.description}
                  onChange={(e) => setReviewForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="블로그 목록에 표시될 짧은 설명"
                  style={modalInputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #e8e8ed',
                  backgroundColor: '#ffffff',
                  color: '#6e6e73',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={reviewSubmitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: reviewSubmitting ? '#8c8c8c' : '#1d1d1f',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: reviewSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {reviewSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#1d1d1f',
  marginBottom: 5,
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 6,
  border: '1px solid #e8e8ed',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
  color: '#1d1d1f',
  outline: 'none',
  boxSizing: 'border-box',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontWeight: 500,
  color: '#6e6e73',
  padding: '10px 16px',
  borderBottom: '1px solid #e8e8ed',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #f3f3f5',
};

const actionLinkStyle: React.CSSProperties = {
  color: '#6e6e73',
  textDecoration: 'none',
  fontSize: '0.8125rem',
  marginRight: 12,
};

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '0.8125rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 0,
  marginRight: 12,
};
