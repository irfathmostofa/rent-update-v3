import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  MessageSquare,
  Settings,
  LogOut,
  MoreHorizontal,
  Home,
  Bell,
  User,
  ChevronDown,
  Sun,
  Moon,
  Plus,
  X,
  Home as HomeIcon,
  FilePlus,
  UserPlus,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function DashboardLayout() {
  const { profile, signOut, isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const dropdownRef = useRef(null);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Close FAB + More sheet on route change
  useEffect(() => {
    setIsFabOpen(false);
    setIsMoreOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { path: "/dashboard/properties", label: "Properties", icon: Building2 },
    { path: "/dashboard/rentals", label: "Rentals", icon: Users },
    { path: "/dashboard/invoices", label: "Invoices", icon: FileText },
    { path: "/dashboard/overdue", label: "Overdue", icon: AlertTriangle },
    { path: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  ];

  if (isSuperAdmin) {
    navItems.push({ path: "/admin", label: "Admin Panel", icon: Settings });
  }

  // First 4 items live directly in the mobile bottom bar (icons only, like a
  // native app). Anything past that sits behind a "More" icon — no hamburger.
  const primaryNavItems = navItems.slice(0, 4);
  const overflowNavItems = navItems.slice(4);

  // Get current page title
  const currentPath = location.pathname;
  const currentPage = navItems.find((item) => currentPath.includes(item.path));
  const pageTitle = currentPage?.label || "Dashboard";

  // FAB Actions based on current page
  const getFabActions = () => {
    const actions = [];

    if (currentPath.includes("/dashboard/properties")) {
      actions.push({
        label: "Add Property",
        icon: HomeIcon,
        action: () => {
          // Trigger add property from Properties component
          window.dispatchEvent(new CustomEvent("openAddProperty"));
          setIsFabOpen(false);
        },
      });
    }

    if (currentPath.includes("/dashboard/rentals")) {
      actions.push({
        label: "New Rental",
        icon: UserPlus,
        action: () => {
          window.dispatchEvent(new CustomEvent("openAddRental"));
          setIsFabOpen(false);
        },
      });
    }

    if (currentPath.includes("/dashboard/invoices")) {
      actions.push({
        label: "Create Invoice",
        icon: FilePlus,
        action: () => {
          window.dispatchEvent(new CustomEvent("openAddInvoice"));
          setIsFabOpen(false);
        },
      });
    }

    if (currentPath.includes("/dashboard/messages")) {
      actions.push({
        label: "New Message",
        icon: MessageCircle,
        action: () => {
          window.dispatchEvent(new CustomEvent("openNewMessage"));
          setIsFabOpen(false);
        },
      });
    }

    // If no specific actions, add default ones
    if (actions.length === 0) {
      actions.push({
        label: "Add Property",
        icon: HomeIcon,
        action: () => {
          navigate("/dashboard/properties");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("openAddProperty"));
          }, 100);
          setIsFabOpen(false);
        },
      });
      actions.push({
        label: "New Rental",
        icon: UserPlus,
        action: () => {
          navigate("/dashboard/rentals");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("openAddRental"));
          }, 100);
          setIsFabOpen(false);
        },
      });
    }

    return actions;
  };

  const fabActions = getFabActions();

  return (
    <div className={`dashboard-app ${isDarkMode ? "dark" : ""}`}>
      {/* Mobile Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="brand">
            <Home size={24} className="brand-icon" />
            <span className="brand-text">RentManager</span>
          </div>
        </div>

        <div className="header-right">
          {/* <button
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button> */}

          {/* <div className="page-actions">
            <span className="date-display">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div> */}

          <div className="profile-dropdown" ref={dropdownRef}>
            <button
              className="profile-btn"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              aria-label="Profile menu"
            >
              <div className="avatar">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <span className="profile-name">
                {profile?.full_name || "User"}
              </span>
              <ChevronDown size={16} className="dropdown-arrow" />
            </button>

            {isProfileDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {profile?.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="dropdown-user-info">
                    <span className="dropdown-name">{profile?.full_name}</span>
                    <span className="dropdown-email">{user?.email}</span>
                    <span className="dropdown-role">
                      {isSuperAdmin ? "Super Admin" : "Owner"}
                    </span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item"
                  onClick={() => navigate("/dashboard/profile")}
                >
                  <User size={16} />
                  Profile Settings
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item signout"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-username">
                  {profile?.full_name || "User"}
                </span>
                <span className="sidebar-userrole">
                  {isSuperAdmin ? "Super Admin" : "Owner"}
                </span>
              </div>
            </div>
            <button className="sidebar-signout" onClick={handleSignOut}>
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-wrapper">
            <div className="content-body">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom icon nav — replaces the hamburger entirely */}
      <nav className="bottom-nav" aria-label="Primary">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {overflowNavItems.length > 0 && (
          <button
            className={`bottom-nav-item ${isMoreOpen ? "active" : ""}`}
            onClick={() => setIsMoreOpen((v) => !v)}
            aria-label="More"
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
        )}
      </nav>

      {/* "More" sheet for overflow nav items on mobile */}
      {isMoreOpen && (
        <>
          <div
            className="sheet-backdrop"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="more-sheet">
            <div className="more-sheet-header">
              <span>More</span>
              <button onClick={() => setIsMoreOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {overflowNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `more-sheet-item ${isActive ? "active" : ""}`
                }
                onClick={() => setIsMoreOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button className="more-sheet-item signout" onClick={handleSignOut}>
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}

      {/* Floating action button (mobile) — quick "add" per page */}
      {fabActions.length > 0 && (
        <div className="fab-wrap">
          {isFabOpen && (
            <div className="fab-actions">
              {fabActions.map((action) => (
                <button
                  key={action.label}
                  className="fab-action-item"
                  onClick={action.action}
                >
                  <action.icon size={16} />
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <button
            className={`fab-button ${isFabOpen ? "open" : ""}`}
            onClick={() => setIsFabOpen((v) => !v)}
            aria-label="Quick actions"
          >
            <Plus size={24} className="fab-icon" />
          </button>
        </div>
      )}

      <style>{`
        /* CSS Variables */
        :root {
          --bg-primary: #f8fafc;
          --bg-secondary: #ffffff;
          --bg-sidebar: #ffffff;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --radius: 12px;
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          --sidebar-width: 260px;
          --header-height: 64px;
          --accent-color: #2563eb;
          --accent-hover: #1d4ed8;
          --success: #22c55e;
          --warning: #f59e0b;
          --danger: #ef4444;
          --fab-bottom: 32px;
          --fab-right: 32px;
        }

        /* Dark Mode */
        .dark {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-sidebar: #1e293b;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-muted: #64748b;
          --border-color: #334155;
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }

        /* Reset & Base */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .dashboard-app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          transition: var(--transition);
        }

        /* App Header */
        .app-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--header-height);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
          transition: var(--transition);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .brand-icon {
          color: var(--accent-color);
        }

        .brand-text {
          background: linear-gradient(135deg, var(--accent-color), #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .theme-toggle,
        .notification-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 10px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
        }

        .theme-toggle:hover,
        .notification-btn:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          background: var(--danger);
          color: white;
          font-size: 10px;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Profile Dropdown */
        .profile-dropdown {
          position: relative;
        }

        .profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          border: 1px solid var(--border-color);
          border-radius: 50px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: var(--transition);
        }

        .profile-btn:hover {
          border-color: var(--accent-color);
          box-shadow: var(--shadow-sm);
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-color), #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .profile-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .dropdown-arrow {
          color: var(--text-muted);
          transition: var(--transition);
        }

        .profile-btn:hover .dropdown-arrow {
          color: var(--text-primary);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 280px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          padding: 8px;
          animation: slideDown 0.2s ease-out;
          z-index: 1001;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .dropdown-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
        }

        .dropdown-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-color), #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          flex-shrink: 0;
        }

        .dropdown-user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dropdown-name {
          font-weight: 600;
          font-size: 12px;
          color: var(--text-primary);
        }

        .dropdown-email {
          font-size: 12px;
          color: var(--text-muted);
        }

        .dropdown-role {
          font-size: 11px;
          color: var(--accent-color);
          font-weight: 500;
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-color);
          margin: 4px 0;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          font-size: 14px;
        }

        .dropdown-item:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .dropdown-item.signout {
          color: var(--danger);
        }

        .dropdown-item.signout:hover {
          background: #fef2f2;
        }

        /* App Body */
        .app-body {
          display: flex;
          margin-top: var(--header-height);
          min-height: calc(100vh - var(--header-height));
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          top: var(--header-height);
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
          transition: var(--transition);
          z-index: 999;
          overflow-y: auto;
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: var(--transition);
          font-weight: 500;
          position: relative;
        }

        .nav-item:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--accent-color);
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .nav-item.active:hover {
          background: var(--accent-hover);
        }

        .nav-badge {
          margin-left: auto;
          background: var(--danger);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 50px;
        }

        .nav-item.active .nav-badge {
          background: rgba(255, 255, 255, 0.3);
        }

        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
          margin-top: 8px;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 10px;
          margin-bottom: 8px;
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-color), #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .sidebar-username {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-userrole {
          font-size: 11px;
          color: var(--text-muted);
        }

        .sidebar-signout {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          font-weight: 500;
          font-size: 14px;
        }

        .sidebar-signout:hover {
          background: #fef2f2;
          color: var(--danger);
        }

        /* Main Content */
        .main-content {
          flex: 1;
          margin-left: var(--sidebar-width);
          padding: 10px;
          min-height: calc(100vh - var(--header-height));
          padding-bottom: 100px; /* Space for FAB */
        }

        .content-wrapper {
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .page-subtitle {
          color: var(--text-secondary);
          margin: 4px 0 0;
          font-size: 14px;
        }

        .page-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .date-display {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .content-body {
          background: var(--bg-secondary);
          border-radius: var(--radius);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
          min-height: 400px;
        }

       

        .fab-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
          animation: fabActionsIn 0.3s ease-out;
        }

        @keyframes fabActionsIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .fab-action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 50px;
          box-shadow: var(--shadow-md);
          cursor: pointer;
          transition: var(--transition);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          animation: fabActionItem 0.3s ease-out both;
        }

        @keyframes fabActionItem {
          from {
            opacity: 0;
            transform: translateX(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .fab-action-item:hover {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
          transform: translateX(-4px);
          box-shadow: var(--shadow-lg);
        }

        .fab-action-item svg {
          flex-shrink: 0;
        }

        .fab-button {
          width: 56px;
          height: 56px;
          border: none;
          border-radius: 50%;
          background: var(--accent-color);
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .fab-button:hover {
          background: var(--accent-hover);
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
        }

        .fab-button.open {
          background: var(--danger);
          transform: rotate(45deg);
        }

        .fab-button.open:hover {
          background: #dc2626;
          transform: rotate(45deg) scale(1.05);
        }

        .fab-icon {
          transition: var(--transition);
        }

        /* Mobile Overlay */
        .sheet-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1998;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Mobile bottom icon nav — hidden on desktop, shown below 1024px */
        .bottom-nav {
          display: none;
        }

        @media (max-width: 1024px) {
          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            z-index: 1000;
            padding-bottom: env(safe-area-inset-bottom, 0);
          }

          .bottom-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            border: none;
            background: none;
            color: var(--text-muted);
            font-size: 11px;
            cursor: pointer;
            text-decoration: none;
            transition: var(--transition);
          }

          .bottom-nav-item.active {
            color: var(--accent-color);
          }

          .sidebar {
            display: none;
          }
        }

        .more-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-secondary);
          border-radius: 20px 20px 0 0;
          z-index: 1999;
          padding: 8px 8px calc(16px + env(safe-area-inset-bottom, 0));
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.25s ease-out;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .more-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .more-sheet-header button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .more-sheet-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          color: var(--text-primary);
          text-decoration: none;
          border: none;
          background: none;
          width: 100%;
          font-size: 15px;
          cursor: pointer;
          text-align: left;
        }

        .more-sheet-item:hover {
          background: var(--bg-primary);
        }

        .more-sheet-item.active {
          color: var(--accent-color);
          background: var(--bg-primary);
        }

        .more-sheet-item.signout {
          color: var(--danger);
          margin-top: 4px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }

        .fab-wrap {
          display: none;
        }

        @media (max-width: 1024px) {
          .fab-wrap {
            display: block;
            position: fixed;
            bottom: calc(80px + env(safe-area-inset-bottom, 0));
            right: var(--fab-right);
            z-index: 999;
          }
        }

        /* Responsive Styles */
        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0;
            padding: 16px;
            padding-bottom: 100px;
          }

          .page-title {
            font-size: 24px;
          }

          .profile-name {
            display: none;
          }

          .dropdown-arrow {
            display: none;
          }

         
        }

        @media (max-width: 768px) {
          .app-header {
            padding: 0 16px;
          }

          .brand-text {
            font-size: 18px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .page-actions {
            width: 100%;
          }

          .date-display {
            width: 100%;
            text-align: center;
          }

          .content-body {
            padding: 16px;
          }

          .sidebar {
            width: 280px;
          }

          .dropdown-menu {
            right: -0px;
            min-width: 260px;
          }

          

          .fab-button {
            width: 48px;
            height: 48px;
          }

          .fab-button svg {
            width: 20px;
            height: 20px;
          }

          .fab-action-item {
            padding: 8px 14px;
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .app-header {
            padding: 0 12px;
          }

          .brand-text {
            font-size: 16px;
          }

          .brand-icon {
            width: 20px;
            height: 20px;
          }

          .main-content {
            padding: 12px;
            padding-bottom: 90px;
          }

          .content-body {
            padding: 12px;
          }

          .sidebar {
            width: 100%;
            max-width: 320px;
          }

          .dropdown-menu {
            right: -0px;
            min-width: 240px;
          }

          .theme-toggle,
          .notification-btn {
            width: 36px;
            height: 36px;
          }

          .page-title {
            font-size: 20px;
          }

         

          .fab-button {
            width: 44px;
            height: 44px;
          }

          .fab-button svg {
            width: 18px;
            height: 18px;
          }

          .fab-action-item {
            padding: 6px 12px;
            font-size: 12px;
            gap: 8px;
          }

          .fab-action-item svg {
            width: 16px;
            height: 16px;
          }
        }

        /* Scrollbar Styling */
        .sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 2px;
        }

        .sidebar::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
