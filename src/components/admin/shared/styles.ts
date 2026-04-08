// ── Admin Shared Styles & Constants ──

export const colors = {
  bg: '#f8f9fa', sidebar: '#ffffff', sidebarActive: '#fef9e7',
  primary: '#D4AA45', primaryDark: '#b8922e', text: '#1a1a1a',
  textLight: '#666', border: '#e8e8e8', card: '#ffffff',
  green: '#22c55e', orange: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
};

export const s = {
  sidebar: { width: 200, minWidth: 200, background: colors.sidebar, borderRight: `1px solid ${colors.border}`, height: '100vh', position: 'fixed' as const, left: 0, top: 0, display: 'flex', flexDirection: 'column' as const, fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif', zIndex: 10, overflowY: 'auto' as const },
  sidebarLogo: { padding: '20px 16px 16px', fontSize: 14, fontWeight: 800, color: colors.text, letterSpacing: '0.03em', borderBottom: `1px solid ${colors.border}` },
  navItem: { display: 'flex', alignItems: 'center' as const, gap: 8, padding: '11px 16px', fontSize: 13, fontWeight: 500, color: colors.textLight, cursor: 'pointer', border: 'none', background: 'none', width: '100%', textAlign: 'left' as const, transition: 'all 0.15s', whiteSpace: 'nowrap' as const },
  navItemActive: { background: colors.sidebarActive, color: colors.text, fontWeight: 700 },
  main: { marginLeft: 200, padding: '24px 32px', background: colors.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif', flex: 1, overflow: 'hidden' as const },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 800, color: colors.text },
  card: { background: colors.card, borderRadius: 12, padding: 24, border: `1px solid ${colors.border}`, marginBottom: 16 },
  statCard: { background: colors.card, borderRadius: 12, padding: '20px 24px', border: `1px solid ${colors.border}`, textAlign: 'center' as const },
  btn: { padding: '10px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s' },
  btnPrimary: { background: colors.text, color: '#fff' },
  btnOutline: { background: '#fff', color: colors.text, border: `1px solid ${colors.border}` },
  btnDanger: { background: colors.red, color: '#fff' },
  input: { width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  textarea: { width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 8, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'inherit', minHeight: 120 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left' as const, fontWeight: 600, color: colors.textLight, borderBottom: `2px solid ${colors.border}`, fontSize: 12 },
  td: { padding: '12px', borderBottom: `1px solid ${colors.border}`, color: colors.text },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 },
};
