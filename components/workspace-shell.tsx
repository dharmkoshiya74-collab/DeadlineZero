"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const commandInput = useRef<HTMLInputElement>(null);
  const commandTrigger = useRef<HTMLButtonElement>(null);
  const commandWasOpen = useRef(false);
  const title = routeTitles[pathname] ?? "DeadlineZero";
  const activeVariation = experimentConnected ? experience : null;
  const normalizedCommandQuery = commandQuery.trim().toLowerCase();
  const matchingNavigation = navigation.filter((item) =>
    item.label.toLowerCase().includes(normalizedCommandQuery),
  );
  const focusCommandLabel = focusRunning ? "Pause focus timer" : "Start focus timer";
  const showFocusCommand = focusCommandLabel
    .toLowerCase()
    .includes(normalizedCommandQuery);

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
    if (commandOpen) {
      commandInput.current?.focus();
      commandWasOpen.current = true;
    } else if (commandWasOpen.current) {
      commandTrigger.current?.focus();
      commandWasOpen.current = false;
    }
  }, [commandOpen]);

  const openCommands = useCallback(() => {
    setCommandQuery("");
    setCommandOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (commandOpen) setCommandOpen(false);
        else openCommands();
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setMobileMenuOpen(false);
        setProfileOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, openCommands]);

  function navigate(href: string) {
    setCommandOpen(false);
    setMobileMenuOpen(false);
    router.push(href);
  }

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
              <span>Deadline<span className="brand-accent">//</span>Zero</span>
              <small>ACADEMIC OS</small>
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
            >
              <MaterialIcon name="menu" size={19} />
            </button>
            <div className="breadcrumb">
              <span>WORKSPACE</span>
              <span aria-hidden="true">/</span>
              <strong>{title}</strong>
            </div>
            <div className="term-chip">
              <MaterialIcon name="school" size={15} />
              <span>STUDY SPACE</span>
            </div>
          </div>

          <div className="command-bar-actions">
            {activeVariation && (
              <div className="variation-chip" title="Assigned Flagsmith experiment variation">
                <span className="status-dot violet" />
                <span className="variation-key">study_planner_experience_v2</span>
                <strong>{activeVariation}</strong>
              </div>
            )}
            <button
              aria-label="Open quick command menu"
              className="command-trigger"
              onClick={openCommands}
              ref={commandTrigger}
            >
              <MaterialIcon name="search" size={16} />
              <span>Quick Command</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              aria-label={focusRunning ? `Pause focus timer, ${timeLabel} remaining` : "Start 25 minute focus timer"}
              className={`focus-trigger${focusRunning ? " is-running" : ""}`}
              onClick={toggleFocus}
            >
              <MaterialIcon name="play_arrow" size={16} />
              <span>{focusRunning ? timeLabel : focusSeconds === 0 ? "Restart Focus" : "Focus 25m"}</span>
            </button>
            <div className="profile-menu-wrap">
              <button
                aria-expanded={profileOpen}
                aria-label="Open account menu"
                className="profile-trigger"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="account-avatar small" aria-hidden="true">
                  {email ? email.charAt(0).toUpperCase() : <MaterialIcon name="account_circle" size={16} />}
                </span>
                <span className="profile-email">{email || "Account"}</span>
                <MaterialIcon name="expand_more" size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <span className="profile-menu-email">{email || "Not signed in"}</span>
                  <Link href="/settings" onClick={() => setProfileOpen(false)}>
                    <MaterialIcon name="tune" size={16} /> Settings
                  </Link>
                  {userId ? (
                    <button onClick={() => void signOut()}>
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

      {commandOpen && (
        <div
          className="command-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCommandOpen(false);
          }}
        >
          <section
            aria-label="Quick commands"
            aria-modal="true"
            className="command-dialog"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
                'input:not([disabled]), button:not([disabled])',
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            role="dialog"
          >
            <div className="command-search">
              <MaterialIcon name="search" size={18} />
              <input
                aria-label="Search workspace commands"
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Search screens and actions..."
                ref={commandInput}
                value={commandQuery}
              />
              <button aria-label="Close commands" className="icon-button" onClick={() => setCommandOpen(false)}>
                <MaterialIcon name="close" size={16} />
              </button>
            </div>
            <p className="eyebrow">NAVIGATE</p>
            <div className="command-items">
              {matchingNavigation.map((item) => {
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                  >
                    <MaterialIcon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    <span className="command-enter">↵</span>
                  </button>
                );
              })}
              {showFocusCommand && (
                <button onClick={() => { toggleFocus(); setCommandOpen(false); }}>
                  <MaterialIcon name="play_arrow" size={16} />
                  <span>{focusCommandLabel}</span>
                  <span className="command-enter">↵</span>
                </button>
              )}
              {matchingNavigation.length === 0 && !showFocusCommand && (
                <p className="command-empty">No matching commands.</p>
              )}
            </div>
            <p className="command-hint">Press <kbd>ESC</kbd> to close</p>
          </section>
        </div>
      )}
    </div>
  );
}
