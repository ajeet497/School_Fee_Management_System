import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { studentLogin } from "../services/studentPortalApi";
import "./StudentLogin.css";

function StudentLogin() {
  const navigate = useNavigate();

  const [schoolCode, setSchoolCode] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const normalizedSchoolCode = schoolCode.trim().toUpperCase();
    const normalizedAdmissionNumber = admissionNumber.trim();

    if (!normalizedSchoolCode || !normalizedAdmissionNumber || !password) {
      setError("Please enter your school code, admission number and password.");
      return;
    }

    try {
      setLoading(true);

      const data = await studentLogin(
        normalizedSchoolCode,
        normalizedAdmissionNumber,
        password
      );

      if (!data.token || !data.student) {
        throw new Error("Invalid login response from server.");
      }

      sessionStorage.setItem("studentToken", data.token);
      sessionStorage.setItem("studentProfile", JSON.stringify(data.student));

      setPassword("");
      navigate("/student-dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
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
        <section className="student-login-welcome">
          <div className="student-brand"><SchoolBrand /></div>

          <div className="student-welcome-content">
            <span className="student-welcome-label">STUDENT PORTAL</span>
            <h1>Your learning journey,<span> all in one place.</span></h1>
            <p>
              Access your academic profile, fee details, payment history and
              receipts through your personal student account.
            </p>

            <div className="student-feature-list">
              <div><span>01</span><p>View your student profile</p></div>
              <div><span>02</span><p>Track your fee payments</p></div>
              <div><span>03</span><p>Access your fee receipts</p></div>
            </div>
          </div>

          <div className="student-welcome-footer">
            A smarter way to stay connected with your school.
          </div>
        </section>

        <section className="student-login-form-section">
          <div className="student-login-form-wrapper">
            <div className="student-mobile-brand"><SchoolBrand /></div>

            <div className="student-form-heading">
              <span>WELCOME BACK</span>
              <h2>Student Login</h2>
              <p>Enter your school and account details to continue.</p>
            </div>

            <form onSubmit={handleLogin}>
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
                  autoComplete="username"
                  required
                />
              </div>

              <div className="student-form-group">
                <label htmlFor="studentPassword">Password</label>
                <div className="student-password-wrapper">
                  <input
                    id="studentPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="student-show-password"
                    onClick={() => setShowPassword((previous) => !previous)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="student-forgot-row">
                <Link to="/student-forgot-password">Forgot password?</Link>
              </div>

              {error && <div className="student-login-error" role="alert">{error}</div>}

              <button type="submit" className="student-login-button" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <span>→</span>}
              </button>
            </form>

            <div className="student-signup-text">
              Don't have an account?
              <Link to="/student-register">Create Account</Link>
            </div>

            <Link to="/" className="student-back-link">
              ← Back to Portal Selection
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentLogin;
