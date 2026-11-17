
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styles from "./Login.module.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("This password reset link is missing its token.");
      return;
    }

    if (password.length < 12 || password.length > 72) {
      setError("Password must contain between 12 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to reset your password."
        );
      }

      setMessage("Your password has been reset successfully.");

      setPassword("");
      setConfirmPassword("");

      // Return to login after a short pause.
      window.setTimeout(() => {
        navigate("/admin-login", { replace: true });
      }, 1800);
    } catch (err) {
      setError(
        err.message || "Unable to reset your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>🔑</div>
          <h1>Reset Password</h1>
          <p>Choose a new password for your admin account.</p>
        </div>

        {!token && (
          <div className={styles.error} role="alert">
            This reset link is invalid or incomplete. Please request a new
            password reset link.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>

            <div className={styles.passwordWrapper}>
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your new password"
                autoComplete="new-password"
                disabled={!token || loading}
              />

              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((previous) => !previous)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <small className={styles.error}>
              Use 12–72 characters.
            </small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password</label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              disabled={!token || loading}
            />
          </div>

          {error && (
            <div className={styles.message} role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className={styles.authSuccess} role="status">
              {message}
            </div>
          )}

          <button
            type="submit"
            className={styles.authSubmitButton}
            disabled={!token || loading || Boolean(message)}
          >
            {loading ? "Updating Password..." : "Reset Password"}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <Link to="/admin-login" className={styles.authBackLink}>
            ← Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
