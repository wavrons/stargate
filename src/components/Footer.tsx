export function Footer({ fixed }: { fixed?: boolean }) {
  return (
    <footer
      style={{
        position: fixed ? 'fixed' : undefined,
        left: fixed ? 0 : undefined,
        right: fixed ? 0 : undefined,
        bottom: fixed ? 0 : undefined,
        borderTop: '1px solid var(--border-color)',
        padding: '24px',
        marginTop: fixed ? undefined : '48px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px',
        background: fixed ? 'var(--bg-main)' : undefined,
      }}
    >
      lyra@2026 all rights reserved
    </footer>
  );
}
