
import { useNavigate } from "react-router-dom";
import styles from "./PortalSelection.module.css";

function PortalSelection() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.schoolIcon}>🏫</div>

        <h1>School Management System</h1>

        <p className={styles.subtitle}>
          Welcome! Please select your portal to continue.
        </p>

        <div className={styles.portalContainer}>
          <button
            type="button"
            className={styles.portalCard}
            onClick={() => navigate("/admin-login")}
          >
            <div className={styles.adminIcon}>🛡️</div>

            <h2>Admin Portal</h2>

            <p>
              Manage students, classes, fees, payments
              and school records.
            </p>

            <span className={styles.portalLink}>
              Continue as Admin →
            </span>
          </button>

          <button
            type="button"
            className={styles.portalCard}
            onClick={() => navigate("/student-login")}
          >
            <div className={styles.studentIcon}>🎓</div>

            <h2>Student Portal</h2>

            <p>
              View your profile, fee details, payment
              history and receipts.
            </p>

            <span className={styles.portalLink}>
              Continue as Student →
            </span>
          </button>
        </div>

        <div className={styles.footer}>
          © {new Date().getFullYear()} School Management System
        </div>
      </div>
    </div>
  );
}

export default PortalSelection;
