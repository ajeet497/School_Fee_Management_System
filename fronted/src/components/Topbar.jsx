
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  UserRound,
  School,
  KeyRound,
  LogOut,
} from "lucide-react";

import styles from "./Topbar.module.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`;

const initialAdmin = {
  name: "Admin",
  email: "",
  photo: "",
};

function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [admin, setAdmin] = useState(initialAdmin);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load administrator profile
  useEffect(() => {
    let active = true;

    const loadAdminProfile = async () => {
      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        if (active) {
          setAdmin(initialAdmin);
          setProfileLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          sessionStorage.removeItem("adminToken");

          if (active) {
            setAdmin(initialAdmin);
            navigate("/login", { replace: true });
          }
          return;
        }

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Unable to load admin profile."
          );
        }

        const profile = result.profile || result.admin;

        if (!profile) {
          throw new Error(
            "Admin profile was not returned by the server."
          );
        }

        if (active) {
          setAdmin({
            name: profile.name || "Admin",
            email: profile.email || "",
            photo: profile.photo || "",
          });
        }
      } catch (error) {
        console.error("Unable to load admin profile:", error);

        if (active) {
          setAdmin(initialAdmin);
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    loadAdminProfile();

    window.addEventListener("adminProfileUpdated", loadAdminProfile);
    window.addEventListener("focus", loadAdminProfile);

    return () => {
      active = false;

      window.removeEventListener(
        "adminProfileUpdated",
        loadAdminProfile
      );

      window.removeEventListener("focus", loadAdminProfile);
    };
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // Close dropdown after navigation
  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  // Page titles and descriptions
  const pageDetails = {
    "/": {
      title: "Dashboard",
      description: "Welcome back! Here's what's happening today.",
    },
    "/dashboard": {
      title: "Dashboard",
      description: "Welcome back! Here's what's happening today.",
    },
    "/students": {
      title: "Students",
      description: "Manage student information and records.",
    },
    "/classes": {
      title: "Classes",
      description: "Manage classes in your school.",
    },
    "/fee-structure": {
      title: "Fee Structure",
      description: "Manage class-wise fee structures.",
    },
    "/payments": {
      title: "Payments",
      description: "Manage student fee payments.",
    },
    "/receipts": {
      title: "Receipts",
      description: "View and manage fee receipts.",
    },
    "/profile": {
      title: "School Profile",
      description: "Manage your school's information.",
    },
    "/admin-profile": {
      title: "Admin Profile",
      description: "Manage your administrator account.",
    },
    "/change-password": {
      title: "Change Password",
      description: "Update your account password.",
    },
  };

  const currentPage = pageDetails[location.pathname] || {
    title: "School Management",
    description: "Manage your school efficiently.",
  };

  const openPage = (path) => {
    setProfileOpen(false);
    navigate(path);
  };

  // Logout
  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (confirmed) {
      setProfileOpen(false);
      sessionStorage.removeItem("adminToken");
      localStorage.removeItem("adminProfile");
      setAdmin(initialAdmin);

      navigate("/login", { replace: true });
    }
  };

  const adminInitial =
    admin.name?.charAt(0).toUpperCase() || "A";

  return (
    <header className={styles.topbar}>

      {/* MOBILE MENU BUTTON */}
      <button
        type="button"
        className={styles.menuButton}
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* PAGE INFORMATION */}
      <div className={styles.pageInfo}>
        <span className={styles.pageEyebrow}>
          SCHOOL MANAGEMENT SYSTEM
        </span>

        <h1>{currentPage.title}</h1>

        <p>{currentPage.description}</p>
      </div>

      {/* ADMIN PROFILE */}
      <div className={styles.adminInfo} ref={dropdownRef}>
        <button
          type="button"
          className={styles.adminProfileButton}
          onClick={() =>
            setProfileOpen((previous) => !previous)
          }
          aria-expanded={profileOpen}
          aria-haspopup="true"
          aria-label="Open administrator profile menu"
        >
          <div className={styles.adminAvatar}>
            {admin.photo ? (
              <img
                src={admin.photo}
                alt="Admin profile"
              />
            ) : (
              <span>{adminInitial}</span>
            )}
          </div>

          <div className={styles.adminText}>
            <h3>
              {profileLoading ? "Loading..." : admin.name}
            </h3>

            <p>{admin.email}</p>
          </div>

          <ChevronDown
            className={`${styles.dropdownArrow} ${
              profileOpen ? styles.arrowOpen : ""
            }`}
            size={17}
          />
        </button>

        {/* PROFILE DROPDOWN */}
        {profileOpen && (
          <div className={styles.profileDropdown}>

            <div className={styles.dropdownHeader}>
              <div className={styles.dropdownAvatar}>
                {admin.photo ? (
                  <img src={admin.photo} alt="" />
                ) : (
                  <span>{adminInitial}</span>
                )}
              </div>

              <div className={styles.dropdownUser}>
                <strong>{admin.name}</strong>
                <span>{admin.email}</span>
              </div>
            </div>

            <div className={styles.dropdownLabel}>
              ACCOUNT SETTINGS
            </div>

            <button
              type="button"
              onClick={() => openPage("/admin-profile")}
            >
              <span className={styles.dropdownIcon}>
                <UserRound size={17} />
              </span>
              Admin Profile
            </button>

            <button
              type="button"
              onClick={() => openPage("/profile")}
            >
              <span className={styles.dropdownIcon}>
                <School size={17} />
              </span>
              School Profile
            </button>

            <button
              type="button"
              onClick={() => openPage("/change-password")}
            >
              <span className={styles.dropdownIcon}>
                <KeyRound size={17} />
              </span>
              Change Password
            </button>

            <div className={styles.dropdownDivider} />

            <button
              type="button"
              className={styles.dropdownLogout}
              onClick={handleLogout}
            >
              <span className={styles.dropdownIcon}>
                <LogOut size={17} />
              </span>
              Logout
            </button>

          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
