
import { useChangePassword } from "./ChangePassword.js";
import styles from "./ChangePassword.module.css";

function ChangePassword() {
  const {
    formData,
    showPasswords,
    errors,
    message,
    messageType,
    isSubmitting,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
  } = useChangePassword();

  const passwordFields = [
    {
      name: "currentPassword",
      label: "Current Password",
      placeholder: "Enter your current password",
    },
    {
      name: "newPassword",
      label: "New Password",
      placeholder: "Enter your new password",
    },
    {
      name: "confirmPassword",
      label: "Confirm New Password",
      placeholder: "Confirm your new password",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Change Password</h1>
        <p>Update your account password to keep it secure.</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} noValidate>
          {passwordFields.map((field) => (
            <div className={styles.formGroup} key={field.name}>
              <label htmlFor={field.name}>
                {field.label}
              </label>

              <div className={styles.passwordWrapper}>
                <input
                  id={field.name}
                  type={
                    showPasswords[field.name]
                      ? "text"
                      : "password"
                  }
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors[field.name])}
                  aria-describedby={
                    errors[field.name]
                      ? `${field.name}-error`
                      : undefined
                  }
                />

                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() =>
                    togglePasswordVisibility(field.name)
                  }
                  disabled={isSubmitting}
                  aria-label={
                    showPasswords[field.name]
                      ? `Hide ${field.label}`
                      : `Show ${field.label}`
                  }
                >
                  {showPasswords[field.name]
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              {errors[field.name] && (
                <small
                  id={`${field.name}-error`}
                  className={styles.error}
                  role="alert"
                >
                  {errors[field.name]}
                </small>
              )}
            </div>
          ))}

          {message && (
            <div
              className={`${styles.message} ${
                messageType === "error"
                  ? styles.errorMessage
                  : ""
              }`}
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Changing Password..."
              : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
