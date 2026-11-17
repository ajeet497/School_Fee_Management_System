
import { Link } from "react-router-dom";
import { useLogin } from "./Login.js";
import styles from "./Login.module.css";

function Login() {
  const {
    formData,
    showPassword,
    errors,
    message,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
    isSubmitting,
  } = useLogin();

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>🏫</div>
          <h1>Admin Login</h1>
          <p>School Fee & Student Management System</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
            />

            {errors.email && (
              <small className={styles.error} role="alert">
                {errors.email}
              </small>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>

            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
              />

              <button
                type="button"
                className={styles.togglePassword}
                onClick={togglePasswordVisibility}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.password && (
              <small className={styles.error} role="alert">
                {errors.password}
              </small>
            )}
          </div>

          <div className={styles.forgotPasswordRow}>
            <Link to="/forgot-password" className={styles.forgotPasswordLink}>
              Forgot Password?
            </Link>
          </div>

          {message && (
            <div className={styles.message} role="status">
              {message}
            </div>
          )}

          <button
            type="submit"
            className={styles.loginButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p>Authorized administrators only</p>

          <p>
            New school?{" "}
            <Link to="/register" style={{ color: "#4f46e5", fontWeight: 600 }}>
              Register your school
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
