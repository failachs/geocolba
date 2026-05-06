'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardShell.module.css';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <IconChart /> },
    ],
  },
  {
    label: 'Plan de campaña',
    items: [
      { href: '/mapa', label: 'Mapa Electoral', icon: <IconMap /> },
    ],
  },
  {
    label: 'Datos',
    items: [
      { href: '/base-datos', label: 'Base de datos', icon: <IconDb /> },
      { href: '/enriquecimiento', label: 'Enriquecimiento', icon: <IconEnrich /> },
      { href: '/puesto-votacion', label: 'Puesto de Votación', icon: <IconVote /> },
    ],
  },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === '/mapa';
  const [collapsed, setCollapsed] = useState(false);

  const activeItem = NAV_GROUPS
    .flatMap((group) => group.items)
    .find((item) => pathname === item.href || pathname.startsWith(item.href));

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${
          collapsed && !isMapPage ? styles.collapsed : ''
        }`}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoName}>Campaña 360</span>
              <span className={styles.logoSub}>GeoCOLBA · 2026</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              {!collapsed && (
                <div className={styles.navGroupLabel}>{group.label}</div>
              )}

              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${
                      active ? styles.navItemActive : ''
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>

                    {!collapsed && (
                      <span className={styles.navLabel}>{item.label}</span>
                    )}

                    {!collapsed && item.badge !== undefined && item.badge !== null && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className={styles.sidebarFoot}>
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>SF</div>

            {!collapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>Sergio Failach</span>
                <span className={styles.userRole}>Administrador</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            className={styles.collapseBtn}
            onClick={() => !isMapPage && setCollapsed((value) => !value)}
            aria-label="Toggle sidebar"
            style={isMapPage ? { opacity: 0.3, cursor: 'default' } : {}}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className={styles.breadcrumb}>
            <span className={styles.breadRoot}>GeoCOLBA</span>
            <span className={styles.breadSep}>/</span>
            <span className={styles.breadCurrent}>
              {activeItem?.label ?? 'Dashboard'}
            </span>
          </div>

          <div className={styles.topbarRight}>
            <button className={styles.topbarBtn} title="Notificaciones">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className={styles.notifDot} />
            </button>

            <button className={styles.topbarBtn} title="Configuración">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            <div className={styles.topbarUser}>
              <div className={styles.topbarAvatar}>SF</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`${styles.content} ${isMapPage ? styles.contentMap : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Icons ── */
function IconChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function IconVote() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconEnrich() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconDb() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}