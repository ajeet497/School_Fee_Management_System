import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Login.module.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to process your request."
        );
      }

      setMessage(
        result.message ||
          "If an admin account exists for this email, a reset link will be sent."
      );
    } catch (err) {
      setError(
        err.message || "Cannot connect to the backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>🔐</div>
          <h1>Forgot Password?</h1>
          <p>School Fee & Student Management System</p>
        </div>

        <p className={styles.authDescription}>
          Enter the email address registered with your administrator account.
          If an account exists, we'll send you a password reset link.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email">Registered Email Address</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setMessage("");
              }}
              placeholder="Enter your email address"
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
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
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;