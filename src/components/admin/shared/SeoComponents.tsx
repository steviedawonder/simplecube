import { useState } from 'react';
import { colors } from './styles';
import type { ScoreCategory } from './seoScoring';

// ── Collapsible Score Category Component ──
export function ScoreCategoryPanel({ category, defaultOpen = false }: { category: ScoreCategory; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const allPass = category.failCount === 0;
  return (
    <div style={{ borderBottom: `1px solid ${colors.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          color: colors.text, textAlign: 'left',
        }}
      >
        <span>{category.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {category.failCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: colors.red, borderRadius: 10, padding: '1px 8px' }}>
              ✕ {category.failCount} 오류
            </span>
          )}
          {allPass && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: colors.green, borderRadius: 10, padding: '1px 8px' }}>
              ✓ 모두 정상
            </span>
          )}
          <span style={{ fontSize: 16, color: colors.textLight, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 10 }}>
          {category.checks.map((check, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 12, lineHeight: 1.6, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>
                {check.ok
                  ? <span style={{ color: colors.green, fontSize: 14 }}>✓</span>
                  : <span style={{ color: colors.red, fontSize: 14 }}>✕</span>
                }
              </span>
              <span style={{ color: check.ok ? '#444' : '#333' }}>{check.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score Circle ──
export function ScoreCircle({ score, label, size = 64 }: { score: number; label: string; size?: number }) {
  const color = score >= 80 ? colors.green : score >= 50 ? colors.orange : colors.red;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: size, height: size, borderRadius: '50%', border: `4px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', background: '#fff' }}>
        <span style={{ fontSize: size * 0.35, fontWeight: 800, color }}>{score}</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: colors.textLight }}>{label}</span>
    </div>
  );
}
