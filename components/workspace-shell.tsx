"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { useWorkspace } from "@/lib/workspace-context";

const navigation = [
  { href: "/", label: "Command Center", icon: "grid_view" },
  { href: "/study-planner", label: "Study planner", icon: "menu_book" },
  { href: "/timeline", label: "Timeline", icon: "calendar_month" },
  { href: "/performance", label: "Performance", icon: "insights" },
  { href: "/assistant", label: "AI Companion", icon: "smart_toy" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const routeTitles: Record<string, string> = {
  "/": "Command Center",
  "/study-planner": "Study Planner",
  "/timeline": "Timeline",
  "/performance": "Performance",
  "/assistant": "AI Companion",
  "/settings": "Settings",
};

type WorkspaceShellProps = {
  children: ReactNode;
};

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

  const timeLabel = `${String(Math.floor(focusSeconds / 60)).padStart(2, "0")}:${String(focusSeconds % 60).padStart(2, "0")}`;

  return (
    <div className={`workspace-root${railCollapsed ? " is-rail-collapsed" : ""}`}>
      {mobileMenuOpen && (
        <button
          aria-label="Close navigation"
          className="workspace-scrim"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`workspace-rail${mobileMenuOpen ? " is-open" : ""}`}>
        <div>
          <div className="brand-lockup">
            <Link aria-label="DeadlineZero Command Center" href="/" className="brand-mark">
              <MaterialIcon name="timelapse" size={20} />
            </Link>
            <Link href="/" className="brand-wordmark">
              <span>Deadline<span className="brand-accent">Zero</span></span>
              <small>STUDENT PLANNER</small>
            </Link>
            <button
              aria-label="Close navigation"
              className="icon-button rail-close"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MaterialIcon name="close" size={17} />
            </button>
            <button
              aria-label={railCollapsed ? "Expand navigation pane" : "Collapse navigation pane"}
              className="icon-button rail-collapse-button"
              onClick={() => setRailCollapsed((collapsed) => !collapsed)}
              title={railCollapsed ? "Expand navigation pane" : "Collapse navigation pane"}
              type="button"
            >
              <MaterialIcon name={railCollapsed ? "dock_to_right" : "dock_to_left"} size={16} />
            </button>
          </div>

          <div className="rail-rule" />
          <nav aria-label="Workspace navigation" className="rail-nav">
            {navigation.map((item) => {
              const selected =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  aria-label={item.label}
                  aria-current={selected ? "page" : undefined}
                  className={`rail-link${selected ? " is-active" : ""}`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="rail-link-main">
                    <MaterialIcon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rail-footer">
          <div className="rail-rule" />
          <div className="connection-row">
            <span className={`status-dot${userId ? " online" : ""}`} />
            <span>{userId ? "Synced account" : "Not signed in"}</span>
          </div>
          <div className="rail-account">
            <div className="account-avatar" aria-hidden="true">
              {email ? email.charAt(0).toUpperCase() : <MaterialIcon name="school" size={17} />}
            </div>
            <div className="account-copy">
              <span>{email || "Student account"}</span>
              <small>{userId ? "Personal workspace" : "Sign in to sync data"}</small>
            </div>
            {userId && (
              <button
                aria-label="Sign out"
                className="icon-button"
                onClick={() => void signOut()}
                title="Sign out"
              >
                <MaterialIcon name="logout" size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="command-bar">
          <div className="command-bar-left">
            <button
              aria-label="Open navigation"
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              type="button"
            >
              <MaterialIcon name="menu" size={19} />
            </button>
            <div className="command-page-identity">
              <span className="command-context">WORKSPACE</span>
              <span className="command-context-divider" aria-hidden="true">/</span>
              <strong className="command-page-title">{title}</strong>
            </div>
          </div>

          <div className="command-bar-actions">
            {activeVariation && (
              <div className="experiment-menu-wrap">
                <button
                  aria-expanded={experimentDetailsOpen}
                  aria-label={`Experiment active. Assigned ${activeVariation.replaceAll("_", " ")}. Show details`}
                  className="experiment-status-trigger"
                  onClick={() => {
                    setExperimentDetailsOpen((open) => !open);
                    setProfileOpen(false);
                  }}
                  type="button"
                >
                  <span className="status-dot violet" />
                  <span className="experiment-status-label">Experiment</span>
                  <strong>{activeVariation === "smart_planner" ? "Smart" : activeVariation === "traditional_planner" ? "Traditional" : activeVariation.replaceAll("_", " ")}</strong>
                  <MaterialIcon name="expand_more" size={16} />
                </button>
                {experimentDetailsOpen && (
                  <div className="experiment-details-popover">
                    <span className="experiment-details-eyebrow">FLAGSMITH EXPERIMENT</span>
                    <strong>Study planner experience</strong>
                    <span className="experiment-details-variant">
                      <span className="status-dot violet" />
                      Assigned variant: {activeVariation.replaceAll("_", " ")}
                    </span>
                    <code>study_planner_experience_v2</code>
                    <span className="experiment-details-note">Your assigned experience is active for this account.</span>
                  </div>
                )}
              </div>
            )}
            <button
              aria-label={focusRunning ? `Pause focus timer, ${timeLabel} remaining` : "Start 25 minute focus timer"}
              className={`focus-trigger${focusRunning ? " is-running" : ""}`}
              onClick={toggleFocus}
              type="button"
            >
              <MaterialIcon name={focusRunning ? "pause" : "play_arrow"} size={16} />
              <span>{focusRunning ? timeLabel : focusSeconds === 0 ? "Restart Focus" : "Focus 25m"}</span>
            </button>
            <div className="profile-menu-wrap">
              <button
                aria-expanded={profileOpen}
                aria-label="Open account menu"
                className="profile-trigger profile-trigger-compact"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setExperimentDetailsOpen(false);
                }}
                type="button"
              >
                <span className="account-avatar small" aria-hidden="true">
                  {email ? email.charAt(0).toUpperCase() : <MaterialIcon name="account_circle" size={17} />}
                </span>
                <MaterialIcon name="expand_more" size={15} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <span className="profile-menu-email">{email || "Not signed in"}</span>
                  <Link href="/settings" onClick={() => setProfileOpen(false)}>
                    <MaterialIcon name="tune" size={16} /> Settings
                  </Link>
                  {userId ? (
                    <button onClick={() => void signOut()} type="button">
                      <MaterialIcon name="logout" size={16} /> Sign out
                    </button>
                  ) : (
                    <Link href="/login" onClick={() => setProfileOpen(false)}>
                      <MaterialIcon name="login" size={16} /> Sign in
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {message && (
          <div className="workspace-notice" role="status">
            <span>{message}</span>
            <button aria-label="Dismiss message" onClick={() => setMessage("")}>
              <MaterialIcon name="close" size={15} />
            </button>
          </div>
        )}

        <main className="workspace-content">{children}</main>
      </div>

    </div>
  );
}
