
import { Link } from "react-router-dom";
import { useRegister } from "./Register.js";
import styles from "./Register.module.css";

function Register() {
  const {
    formData,
    errors,
    message,
    registrationResult,
    isSubmitting,
    handleChange,
    handleSubmit,
  } = useRegister();

  if (registrationResult) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.logo}>✅</div>
            <h1>Registration Successful!</h1>
            <p>Your school account has been created.</p>
          </div>

          <div className={styles.successDetails}>
            <div className={styles.detailRow}>
              <span>Admin Name</span>
              <strong>{registrationResult.name}</strong>
            </div>

            <div className={styles.detailRow}>
              <span>Email Address</span>
              <strong>{registrationResult.email}</strong>
            </div>

            <div className={styles.schoolCodeBox}>
              <span>Your School Code</span>
              <strong>
                {registrationResult.schoolCode || "Not provided"}
              </strong>
              <p>Keep this code safe. You may need it for student access.</p>
            </div>

            {registrationResult.schoolCode && (
              <button
                type="button"
                className={styles.loginButton}
                onClick={() =>
                  navigator.clipboard.writeText(
                    registrationResult.schoolCode
                  )
                }
              >
                Copy School Code
              </button>
            )}
          </div>

          <div className={styles.loginFooter}>
            <Link to="/admin-login" className={styles.loginLink}>
              Go to Admin Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>🏫</div>
          <h1>Create School Account</h1>
          <p>Register your school to get started</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="name">Admin Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Enter admin name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <p className={styles.error}>{errors.name}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <p className={styles.error}>{errors.email}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Create a password (minimum 12 characters)"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && (
              <p className={styles.error}>{errors.password}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
            />
            {errors.confirmPassword && (
              <p className={styles.error}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {message && (
            <p className={styles.message} role="alert">
              {message}
            </p>
          )}

          <button
            type="submit"
            className={styles.loginButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Register School"}
          </button>
        </form>

        <div className={styles.loginFooter}>
          Already have an account?{" "}
          <Link to="/admin-login" className={styles.loginLink}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
