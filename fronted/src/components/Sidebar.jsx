
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  School,
  ClipboardList,
  CreditCard,
  Receipt,
  UserRound,
  LockKeyhole,
  LogOut,
  HelpCircle,
} from "lucide-react";

import styles from "./Sidebar.module.css";

function Sidebar({ sidebarOpen, onClose }) {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", Icon: LayoutDashboard },
    { name: "Students", path: "/students", Icon: Users },
    { name: "Classes", path: "/classes", Icon: School },
    { name: "Fee Structure", path: "/fee-structure", Icon: ClipboardList },
    { name: "Payments", path: "/payments", Icon: CreditCard },
    { name: "Receipts", path: "/receipts", Icon: Receipt },
    { name: "Profile", path: "/profile", Icon: UserRound },
    { name: "Change Password", path: "/change-password", Icon: LockKeyhole },
  ];

  const getNavLinkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles.active : ""}`;

  const handleNavigation = () => {
    if (onClose) onClose();
  };

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (confirmed) {
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminProfile");

      if (onClose) onClose();

      navigate("/admin-login", { replace: true });
    }
  };

  return (
    <aside
      className={`${styles.sidebar} ${
        sidebarOpen ? styles.sidebarOpen : ""
      }`}
    >
      <div className={styles.brand}>
        <div className={styles.brandIcon}>S</div>

        <div className={styles.brandText}>
          <h2>School Management</h2>
          <span>ADMINISTRATION</span>
        </div>

        <button
          type="button"
          className={styles.mobileCloseButton}
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      <div className={styles.sectionLabel}>MAIN MENU</div>

      <nav className={styles.navigation}>
        {menuItems.map(({ name, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            className={getNavLinkClass}
            onClick={handleNavigation}
          >
            <span className={styles.icon}>
              <Icon size={19} strokeWidth={1.8} />
            </span>

            <span className={styles.navText}>{name}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.footerNote}>
          <div className={styles.footerIcon}>
            <HelpCircle size={19} />
          </div>

          <div>
            <strong>Need assistance?</strong>
            <span>Manage your school with ease.</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.logout}
          onClick={handleLogout}
        >
          <span className={styles.logoutIcon}>
            <LogOut size={19} />
          </span>
          <span>Logout</span>
        </button>

        <div className={styles.sidebarVersion}>
          SCHOOL MANAGEMENT SYSTEM
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
