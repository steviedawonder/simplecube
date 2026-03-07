import { useState } from 'react';

interface PostListProps {
  initialPosts: any[];
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

function StatusBadge({ draft }: { draft: number | boolean }) {
  const isDraft = Boolean(draft);
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

export default function PostList({ initialPosts }: PostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleting, setDeleting] = useState<number | null>(null);

  const filteredPosts = posts.filter((post) => {
    // Filter by status
    if (filter === 'published' && post.draft) return false;
    if (filter === 'draft' && !post.draft) return false;

    // Filter by search
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
    if (!window.confirm(`"${postTitle}" 글을 삭제하시겠습니까?`)) return;

    setDeleting(postId);
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
    setDeleting(null);
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
            글 관리
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6e6e73' }}>
            총 {posts.length}개의 글
          </p>
        </div>
        <a
          href="/admin/posts/new"
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
            textDecoration: 'none',
            transition: 'background-color 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 글 작성
        </a>
      </div>

      {/* Filters */}
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
            {search || filter !== 'all' ? '검색 결과가 없습니다.' : '아직 작성된 글이 없습니다.'}
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
                  <th
                    style={{
                      textAlign: 'left',
                      fontWeight: 500,
                      color: '#6e6e73',
                      padding: '10px 16px',
                      borderBottom: '1px solid #e8e8ed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    제목
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      fontWeight: 500,
                      color: '#6e6e73',
                      padding: '10px 16px',
                      borderBottom: '1px solid #e8e8ed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    카테고리
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      fontWeight: 500,
                      color: '#6e6e73',
                      padding: '10px 16px',
                      borderBottom: '1px solid #e8e8ed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SEO 점수
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      fontWeight: 500,
                      color: '#6e6e73',
                      padding: '10px 16px',
                      borderBottom: '1px solid #e8e8ed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    상태
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      fontWeight: 500,
                      color: '#6e6e73',
                      padding: '10px 16px',
                      borderBottom: '1px solid #e8e8ed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    날짜
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      fontWeight: 500,
                      color: '#6e6e73',
                      padding: '10px 16px',
                      borderBottom: '1px solid #e8e8ed',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f3f5',
                        maxWidth: 300,
                      }}
                    >
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
                        {post.title}
                      </a>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f3f5',
                        color: '#8c8c8c',
                        fontSize: '0.8125rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {post.category_name || '-'}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f3f5',
                        textAlign: 'center',
                      }}
                    >
                      <SEOBadge score={post.seo_score || 0} />
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f3f5',
                        textAlign: 'center',
                      }}
                    >
                      <StatusBadge draft={post.draft} />
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f3f5',
                        color: '#8c8c8c',
                        fontSize: '0.8125rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {post.created_at
                        ? new Date(post.created_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f3f5',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <a
                        href={`/admin/posts/${post.id}`}
                        style={{
                          color: '#6e6e73',
                          textDecoration: 'none',
                          fontSize: '0.8125rem',
                          marginRight: 12,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#D4AA45')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#6e6e73')}
                      >
                        수정
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id, post.title)}
                        disabled={deleting === post.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: deleting === post.id ? '#8c8c8c' : '#ef4444',
                          fontSize: '0.8125rem',
                          cursor: deleting === post.id ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          padding: 0,
                        }}
                      >
                        {deleting === post.id ? '삭제 중...' : '삭제'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
