"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";

const navigation = [
  { href: "/", label: "Command Center", icon: "grid_view", group: "WORKSPACE" },
  { href: "/study-planner", label: "Study Planner", icon: "menu_book", group: "WORKSPACE" },
  { href: "/timeline", label: "Timeline", icon: "calendar_month", group: "WORKSPACE" },
  { href: "/performance", label: "Performance", icon: "insights", group: "INSIGHTS" },
  { href: "/assistant", label: "AI Companion", icon: "smart_toy", group: "INSIGHTS" },
  { href: "/settings", label: "Settings", icon: "settings", group: "PREFERENCES" },
];

const routeTitles: Record<string, string> = {
  "/": "Command Center",
  "/study-planner": "Study Planner",
  "/timeline": "Timeline",
  "/performance": "Performance",
  "/assistant": "AI Companion",
  "/settings": "Settings",
};

type WorkspaceShellProps = { children: ReactNode };

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const {
    email,
    userId,
    experience,
    experimentConnected,
    message,
    setMessage,
    signOut,
  } = useWorkspace();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [experimentDetailsOpen, setExperimentDetailsOpen] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  const title = routeTitles[pathname] ?? "DeadlineZero";
  const activeVariation = experimentConnected ? experience : null;
  const timeLabel = `${String(Math.floor(focusSeconds / 60)).padStart(2, "0")}:${String(focusSeconds % 60).padStart(2, "0")}`;
  const initials = email ? email.charAt(0).toUpperCase() : "D";

  useEffect(() => {
    if (!focusRunning) return;
    const interval = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setFocusRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [focusRunning]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setProfileOpen(false);
        setExperimentDetailsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleFocus() {
    if (focusSeconds === 0) setFocusSeconds(25 * 60);
    setFocusRunning((running) => !running);
  }

  const groupedNavigation = [
    { label: "WORKSPACE", items: navigation.filter((item) => item.group === "WORKSPACE") },
    { label: "INSIGHTS", items: navigation.filter((item) => item.group === "INSIGHTS") },
    { label: "PREFERENCES", items: navigation.filter((item) => item.group === "PREFERENCES") },
  ];

  return (
    <div className={`dz-shell${railCollapsed ? " dz-shell--collapsed" : ""}`}>
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          className="dz-scrim"
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      )}

      <aside className={`dz-sidebar${mobileMenuOpen ? " dz-sidebar--open" : ""}`}>
        <div className="dz-sidebar-top">
          <div className="dz-brand-row">
            <Link href="/" aria-label="DeadlineZero home" className="dz-brand-mark">
              <MaterialIcon name="timelapse" size={21} />
            </Link>
            <Link href="/" className="dz-brand-copy">
              <span className="dz-brand-name">Deadline<span>Zero</span></span>
              <span className="dz-brand-caption">ACADEMIC MISSION CONTROL</span>
            </Link>
            <button
              className="dz-icon-button dz-mobile-close"
              aria-label="Close navigation"
              onClick={() => setMobileMenuOpen(false)}
              type="button"
            >
              <MaterialIcon name="close" size={18} />
            </button>
            <button
              className="dz-icon-button dz-collapse-button"
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setRailCollapsed((value) => !value)}
              type="button"
            >
              <MaterialIcon name={railCollapsed ? "dock_to_right" : "dock_to_left"} size={17} />
            </button>
          </div>

          <div className="dz-workspace-chip">
            <span className="dz-workspace-chip-icon"><MaterialIcon name="school" size={15} /></span>
            <span className="dz-workspace-chip-copy">
              <strong>Personal workspace</strong>
              <small>STUDENT EDITION</small>
            </span>
            <MaterialIcon name="unfold_more" size={16} />
          </div>

          <nav className="dz-navigation" aria-label="Main navigation">
            {groupedNavigation.map((group) => (
              <div className="dz-nav-group" key={group.label}>
                <div className="dz-nav-heading">{group.label}</div>
                {group.items.map((item) => {
                  const selected = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      href={item.href}
                      key={item.href}
                      aria-current={selected ? "page" : undefined}
                      aria-label={item.label}
                      title={railCollapsed ? item.label : undefined}
                      className={`dz-nav-link${selected ? " dz-nav-link--active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="dz-nav-icon"><MaterialIcon name={item.icon} size={19} /></span>
                      <span className="dz-nav-label">{item.label}</span>
                      {selected && <span className="dz-nav-active-mark" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="dz-sidebar-bottom">
          <div className="dz-sync-status">
            <span className={`dz-sync-dot${userId ? " dz-sync-dot--online" : ""}`} />
            <span>{userId ? "Cloud sync active" : "Local workspace"}</span>
            <span className="dz-sync-indicator">{userId ? "LIVE" : "LOCAL"}</span>
          </div>
          <div className="dz-account-card">
            <div className="dz-avatar">{email ? initials : <MaterialIcon name="school" size={18} />}</div>
            <div className="dz-account-details">
              <strong>{email || "Student account"}</strong>
              <span>{userId ? "Personal account" : "Sign in to sync data"}</span>
            </div>
            {userId && (
              <button
                className="dz-icon-button dz-signout-button"
                aria-label="Sign out"
                title="Sign out"
                onClick={() => void signOut()}
                type="button"
              >
                <MaterialIcon name="logout" size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <section className="dz-main">
        <header className="dz-topbar">
          <div className="dz-topbar-leading">
            <button
              className="dz-icon-button dz-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
              type="button"
            >
              <MaterialIcon name="menu" size={20} />
            </button>
            <div className="dz-page-heading">
              <span className="dz-page-overline">DEADLINEZERO <span>/</span> WORKSPACE</span>
              <h1>{title}</h1>
            </div>
          </div>

          <div className="dz-topbar-actions">
            {activeVariation && (
              <div className="dz-popover-anchor">
                <button
                  className={`dz-experiment-pill${experimentDetailsOpen ? " dz-experiment-pill--open" : ""}`}
                  aria-expanded={experimentDetailsOpen}
                  aria-label={`Experiment active. Assigned ${activeVariation.replaceAll("_", " ")}. Show details`}
                  onClick={() => {
                    setExperimentDetailsOpen((open) => !open);
                    setProfileOpen(false);
                  }}
                  type="button"
                >
                  <span className="dz-experiment-pulse" />
                  <span className="dz-experiment-label">EXPERIMENT</span>
                  <strong>{activeVariation === "smart_planner" ? "Smart" : activeVariation === "traditional_planner" ? "Traditional" : activeVariation.replaceAll("_", " ")}</strong>
                  <MaterialIcon name="expand_more" size={16} />
                </button>
                {experimentDetailsOpen && (
                  <div className="dz-popover dz-experiment-popover">
                    <span className="dz-popover-kicker">LIVE EXPERIMENT</span>
                    <strong>Study planner experience</strong>
                    <div className="dz-assignment-row">
                      <span className="dz-experiment-pulse" />
                      <span>Assigned variant</span>
                      <b>{activeVariation.replaceAll("_", " ")}</b>
                    </div>
                    <code>study_planner_experience_v2</code>
                    <p>Your assigned experience is active for this account.</p>
                  </div>
                )}
              </div>
            )}

            <div className="dz-focus-wrap">
              <button
                className={`dz-focus-button${focusRunning ? " dz-focus-button--running" : ""}`}
                aria-label={focusRunning ? `Pause focus timer, ${timeLabel} remaining` : "Start 25 minute focus timer"}
                onClick={toggleFocus}
                type="button"
              >
                <span className="dz-focus-icon"><MaterialIcon name={focusRunning ? "pause" : "play_arrow"} size={17} /></span>
                <span>{focusRunning ? timeLabel : focusSeconds === 0 ? "Restart focus" : "Focus session"}</span>
                {!focusRunning && <kbd>25m</kbd>}
              </button>
            </div>

            <div className="dz-popover-anchor">
              <button
                className="dz-profile-button"
                aria-expanded={profileOpen}
                aria-label="Open account menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setExperimentDetailsOpen(false);
                }}
                type="button"
              >
                <span className="dz-avatar dz-avatar--top">{email ? initials : <MaterialIcon name="account_circle" size={18} />}</span>
                <MaterialIcon name="expand_more" size={15} />
              </button>
              {profileOpen && (
                <div className="dz-popover dz-profile-popover">
                  <div className="dz-profile-summary">
                    <span className="dz-avatar">{email ? initials : <MaterialIcon name="account_circle" size={18} />}</span>
                    <span><strong>{email || "Guest account"}</strong><small>{userId ? "Synced workspace" : "Not signed in"}</small></span>
                  </div>
                  <div className="dz-popover-divider" />
                  <Link href="/settings" onClick={() => setProfileOpen(false)}>
                    <MaterialIcon name="tune" size={17} /> Settings
                  </Link>
                  {userId ? (
                    <button onClick={() => void signOut()} type="button">
                      <MaterialIcon name="logout" size={17} /> Sign out
                    </button>
                  ) : (
                    <Link href="/login" onClick={() => setProfileOpen(false)}>
                      <MaterialIcon name="login" size={17} /> Sign in
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {message && (
          <div className="dz-notice" role="status">
            <span><MaterialIcon name="info" size={17} />{message}</span>
            <button aria-label="Dismiss message" onClick={() => setMessage("")} type="button">
              <MaterialIcon name="close" size={16} />
            </button>
          </div>
        )}

        <main className="dz-content">{children}</main>
      </section>
    </div>
  );
}

