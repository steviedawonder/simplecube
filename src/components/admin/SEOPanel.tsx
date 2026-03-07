import { useState } from 'react';

interface SEOCheck {
  id: string;
  category: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  score: number;
  maxScore: number;
}

interface SEOPanelProps {
  score: number;
  checks: SEOCheck[];
}

const categoryLabels: Record<string, string> = {
  basic: '기본 SEO',
  title: '제목 가독성',
  content: '콘텐츠 가독성',
  links: '링크 분석',
};

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getScoreBg(score: number): string {
  if (score >= 70) return '#dcfce7';
  if (score >= 40) return '#fef3c7';
  return '#fee2e2';
}

function StatusIcon({ status }: { status: 'pass' | 'fail' | 'warning' }) {
  if (status === 'pass') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === 'warning') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export default function SEOPanel({ score, checks }: SEOPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    basic: true,
    title: false,
    content: false,
    links: false,
  });

  const categories = ['basic', 'title', 'content', 'links'];

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function getCategoryChecks(cat: string) {
    return checks.filter((c) => c.category === cat);
  }

  function getCategorySummary(cat: string) {
    const catChecks = getCategoryChecks(cat);
    const passed = catChecks.filter((c) => c.status === 'pass').length;
    return `${passed}/${catChecks.length} 통과`;
  }

  const scoreColor = getScoreColor(score);
  const scoreBg = getScoreBg(score);

  // SVG circle parameters
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div>
      {/* Score Circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0' }}>
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e8e8ed"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: scoreColor }}>{score}</span>
          </div>
        </div>
        <span
          style={{
            marginTop: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            color: scoreColor,
            backgroundColor: scoreBg,
            padding: '2px 10px',
            borderRadius: 100,
          }}
        >
          {score >= 70 ? '좋음' : score >= 40 ? '보통' : '개선 필요'}
        </span>
      </div>

      {/* Category Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {categories.map((cat) => {
          const catChecks = getCategoryChecks(cat);
          if (catChecks.length === 0) return null;
          const isExpanded = expandedCategories[cat];

          return (
            <div key={cat} style={{ borderRadius: 6, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: '#f5f5f7',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#1d1d1f',
                  borderRadius: isExpanded ? '6px 6px 0 0' : 6,
                }}
              >
                <span>{categoryLabels[cat] || cat}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6e6e73' }}>
                  {getCategorySummary(cat)}
                </span>
              </button>
              {isExpanded && (
                <div style={{ backgroundColor: '#fafafa', padding: '4px 0' }}>
                  {catChecks.map((check) => (
                    <div
                      key={check.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '6px 10px',
                      }}
                    >
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        <StatusIcon status={check.status} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1d1d1f' }}>
                          {check.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6e6e73', marginTop: 1 }}>
                          {check.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
