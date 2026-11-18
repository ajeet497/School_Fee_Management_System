import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./StudentLogin.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

async function handleResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed. Please try again.");
  }

  return result;
}

function StudentForgotPassword() {
  const navigate = useNavigate();

  const [schoolCode, setSchoolCode] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const normalizedSchoolCode = schoolCode.trim().toUpperCase();
  const normalizedAdmissionNumber = admissionNumber.trim();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!normalizedSchoolCode || !normalizedAdmissionNumber) {
      setError("Please enter your School Code and Admission Number.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/student-auth/forgot-password/request-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolCode: normalizedSchoolCode,
            admissionNumber: normalizedAdmissionNumber,
          }),
        }
      );

      const result = await handleResponse(response);

      setStep("reset");
      setMessage(
        result.message ||
          "If the account is eligible, an OTP request has been processed. During local development, check the backend terminal for the OTP."
      );
    } catch (err) {
      setError(err.message || "Unable to request OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the six-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (new TextEncoder().encode(newPassword).length > 72) {
      setError("Your password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/student-auth/forgot-password/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolCode: normalizedSchoolCode,
            admissionNumber: normalizedAdmissionNumber,
            otp: otp.trim(),
            newPassword,
          }),
        }
      );

      const result = await handleResponse(response);

      setMessage(
        result.message || "Password reset successfully. You can now log in."
      );
      setStep("complete");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-login-page">
      <div className="student-login-card">
        <section className="student-login-welcome">
          <div className="student-brand">
            <div className="student-brand-icon">S</div>
            <span>STUDENT PORTAL</span>
          </div>

          <div className="student-welcome-content">
            <span className="student-welcome-label">ACCOUNT SECURITY</span>
            <h1>
              Get back to
              <span> your learning.</span>
            </h1>
            <p>
              Reset your student account password securely using the
              verification process provided by your school.
            </p>

            <div className="student-feature-list">
              <div><span>01</span><p>Identify your student account</p></div>
              <div><span>02</span><p>Verify with a one-time password</p></div>
              <div><span>03</span><p>Create a new password</p></div>
            </div>
          </div>

          <div className="student-welcome-footer">
            A smarter way to stay connected with your school.
          </div>
        </section>

        <section className="student-login-form-section">
          <div className="student-login-form-wrapper">
            <div className="student-mobile-brand">
              <div className="student-brand-icon">S</div>
              <span>STUDENT PORTAL</span>
            </div>

            <div className="student-form-heading">
              <span>
                {step === "complete" ? "PASSWORD UPDATED" : "ACCOUNT RECOVERY"}
              </span>
              <h2>Forgot Password?</h2>
              <p>
                {step === "details" && "Enter your school and student details to request an OTP."}
                {step === "reset" && "Enter the OTP and choose a new password."}
                {step === "complete" && "Your password has been changed successfully."}
              </p>
            </div>

            {step === "details" && (
              <form onSubmit={handleRequestOtp}>
                <div className="student-form-group">
                  <label htmlFor="schoolCode">School Code</label>
                  <input
                    id="schoolCode"
                    type="text"
                    placeholder="Enter your school code"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="student-form-group">
                  <label htmlFor="admissionNumber">Admission Number</label>
                  <input
                    id="admissionNumber"
                    type="text"
                    placeholder="Enter your admission number"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>

                {error && <div className="student-login-error" role="alert">{error}</div>}

                <button type="submit" className="student-login-button" disabled={loading}>
                  {loading ? "Requesting OTP..." : "Request OTP"}
                  {!loading && <span>→</span>}
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword}>
                <div className="student-form-group">
                  <label htmlFor="studentOtp">Six-Digit OTP</label>
                  <input
                    id="studentOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    required
                  />
                </div>

                <div className="student-form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="student-form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                {message && <div className="student-signup-text" role="status">{message}</div>}
                {error && <div className="student-login-error" role="alert">{error}</div>}

                <button type="submit" className="student-login-button" disabled={loading}>
                  {loading ? "Updating password..." : "Reset Password"}
                </button>

                <div className="student-signup-text">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setStep("details");
                      setOtp("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                      setMessage("");
                    }}
                  >
                    Change student details
                  </button>
                </div>
              </form>
            )}

            {step === "complete" && (
              <button
                type="button"
                className="student-login-button"
                onClick={() => navigate("/student-login", { replace: true })}
              >
                Go to Student Login <span>→</span>
              </button>
            )}

            {step !== "reset" && message && (
              <div className="student-signup-text" role="status">{message}</div>
            )}

            <Link to="/student-login" className="student-back-link">
              ← Back to Student Login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentForgotPassword;
