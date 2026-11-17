import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./StudentLogin.css";

const API_BASE_URL = "http://localhost:5000/api";

async function handleResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed. Please try again.");
  }

  return result;
}

function StudentRegister() {
  const navigate = useNavigate();

  const [schoolCode, setSchoolCode] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const normalizedSchoolCode = schoolCode.trim().toUpperCase();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (
      !normalizedSchoolCode ||
      !admissionNumber.trim() ||
      !phone.trim()
    ) {
      setError("Please enter your School Code, Admission Number and registered mobile number.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/student-auth/signup/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolCode: normalizedSchoolCode,
            admissionNumber: admissionNumber.trim(),
            phone: phone.trim(),
          }),
        }
      );

      const result = await handleResponse(response);

      setStep("verify");
      setMessage(
        result.message ||
          "OTP request processed. During local development, check the backend terminal for the OTP."
      );
    } catch (err) {
      setError(err.message || "Unable to request OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the six-digit OTP.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/student-auth/signup/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolCode: normalizedSchoolCode,
            admissionNumber: admissionNumber.trim(),
            otp: otp.trim(),
            password,
          }),
        }
      );

      const result = await handleResponse(response);

      setMessage(
        result.message ||
          "Your student account has been created. You can now log in."
      );
      setStep("complete");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
    } catch (err) {
      setError(err.message || "Unable to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const SchoolBrand = () => (
    <>
      <div className="student-brand-icon">S</div>
      <span>STUDENT PORTAL</span>
    </>
  );

  return (
    <div className="student-login-page">
      <div className="student-login-card">
        {/* Welcome section */}
        <section className="student-login-welcome">
          <div className="student-brand">
            <SchoolBrand />
          </div>

          <div className="student-welcome-content">
            <span className="student-welcome-label">
              STUDENT PORTAL
            </span>

            <h1>
              Create your account,
              <span> get connected.</span>
            </h1>

            <p>
              Register your student account using the details
              already recorded by your school.
            </p>

            <div className="student-feature-list">
              <div>
                <span>01</span>
                <p>Enter your school details</p>
              </div>

              <div>
                <span>02</span>
                <p>Verify your registered mobile number</p>
              </div>

              <div>
                <span>03</span>
                <p>Create your secure password</p>
              </div>
            </div>
          </div>

          <div className="student-welcome-footer">
            A smarter way to stay connected with your school.
          </div>
        </section>

        {/* Registration form section */}
        <section className="student-login-form-section">
          <div className="student-login-form-wrapper">
            <div className="student-mobile-brand">
              <SchoolBrand />
            </div>

            <div className="student-form-heading">
              <span>
                {step === "complete" ? "REGISTRATION COMPLETE" : "NEW STUDENT ACCOUNT"}
              </span>
              <h2>Student Registration</h2>
              <p>
                {step === "details" &&
                  "Enter the details registered with your school."}
                {step === "verify" &&
                  "Enter the OTP and create your account password."}
                {step === "complete" &&
                  "Your student account is ready to use."}
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
                    onChange={(e) =>
                      setSchoolCode(e.target.value.toUpperCase())
                    }
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

                <div className="student-form-group">
                  <label htmlFor="studentPhone">Registered Mobile Number</label>
                  <input
                    id="studentPhone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter the mobile number given to your school"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>

                <p className="student-signup-text">
                  Use the mobile number already saved in your school's student record.
                </p>

                {error && (
                  <div className="student-login-error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="student-login-button"
                  disabled={loading}
                >
                  {loading ? "Requesting OTP..." : "Request OTP"}
                  {!loading && <span>→</span>}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyOtp}>
                <div className="student-form-group">
                  <label htmlFor="studentOtp">Six-Digit OTP</label>
                  <input
                    id="studentOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    autoComplete="one-time-code"
                    required
                  />
                </div>

                <div className="student-form-group">
                  <label htmlFor="studentPassword">Create Password</label>
                  <input
                    id="studentPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="student-form-group">
                  <label htmlFor="confirmStudentPassword">Confirm Password</label>
                  <input
                    id="confirmStudentPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                {message && (
                  <div className="student-signup-text" role="status">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="student-login-error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="student-login-button"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Verify OTP & Create Account"}
                </button>

                <div className="student-signup-text">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("details");
                      setOtp("");
                      setPassword("");
                      setConfirmPassword("");
                      setError("");
                      setMessage("");
                    }}
                    disabled={loading}
                  >
                    Change student details
                  </button>
                </div>
              </form>
            )}

            {step === "complete" && (
              <div>
                <div className="student-signup-text" role="status">
                  {message}
                </div>

                <button
                  type="button"
                  className="student-login-button"
                  onClick={() => navigate("/student-login", { replace: true })}
                >
                  Go to Student Login <span>→</span>
                </button>
              </div>
            )}

            {step !== "complete" && message && (
              <div className="student-signup-text" role="status">
                {message}
              </div>
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

export default StudentRegister;
