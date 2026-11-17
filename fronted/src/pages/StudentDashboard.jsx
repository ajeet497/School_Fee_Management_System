
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStudentDashboard,
  getStudentPayments,
  getStudentPaymentReceipt,
  getStudentPhoto,
  studentLogout,
} from "../services/studentPortalApi";
import "./StudentDashboard.css";

function StudentAvatar({ photoUrl, firstLetter, large = false }) {
  return (
    <div className={`student-avatar ${large ? "large" : ""}`}>
      {photoUrl ? (
        <img src={photoUrl} alt="Student profile" />
      ) : (
        firstLetter
      )}
    </div>
  );
}

function StudentDashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [studentPhotoUrl, setStudentPhotoUrl] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [schoolProfile, setSchoolProfile] = useState({
    schoolName: "",
    address: "",
    phone: "",
    email: "",
    principalName: "",
    logo: "",
    principalSignature: "",
  });

  // Load the student's photo from the authenticated student-portal endpoint.
  // The API returns a temporary object URL; revoke it when the component unmounts.
  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function loadStudentPhoto() {
      try {
        const photoUrl = await getStudentPhoto();
        if (active && photoUrl) {
          objectUrl = photoUrl;
          setStudentPhotoUrl(photoUrl);
        }
      } catch (err) {
        console.error("Unable to load student photo:", err);
      }
    }

    loadStudentPhoto();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const data = await getStudentDashboard();

        if (active) {
          setDashboard(data);

          // School branding comes from the authenticated student's school.
          // Never read it from shared browser localStorage.
          const school = data.school || {};

          setSchoolProfile({
            schoolName: school.schoolName || "",
            address: school.address || "",
            phone: school.phone || "",
            email: school.email || "",
            principalName: school.principalName || "",
            logo: school.logo || "",
            principalSignature: school.principalSignature || "",
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load dashboard.");

          if (
            err.message.toLowerCase().includes("token") ||
            err.message.toLowerCase().includes("session")
          ) {
            studentLogout();
            navigate("/student-login", { replace: true });
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    studentLogout();
    navigate("/student-login", { replace: true });
  };

  const handlePaymentHistory = async () => {
    setActiveSection("payments");
    setPaymentError("");

    if (payments.length > 0) return;

    setPaymentsLoading(true);

    try {
      const result = await getStudentPayments();
      setPayments(result.payments || []);
    } catch (err) {
      setPaymentError(
        err.message || "Unable to load payment history."
      );
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleDashboard = () => {
    setActiveSection("dashboard");
    setSelectedReceipt(null);
    setProfileMenuOpen(false);
  };

  const handleViewReceipt = async (paymentId) => {
    setReceiptLoading(true);
    setReceiptError("");
    setSelectedReceipt(null);

    try {
      const result = await getStudentPaymentReceipt(paymentId);
      setSelectedReceipt(result.data);
    } catch (err) {
      setReceiptError(
        err.message || "Unable to load receipt."
      );
    } finally {
      setReceiptLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleReceiptClose = () => {
    setSelectedReceipt(null);
    setReceiptError("");
  };

  if (loading) {
    return (
      <div className="student-loading">
        <div className="student-loader"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-error">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button onClick={handleLogout}>Back to Login</button>
      </div>
    );
  }

  if (!dashboard?.student) {
    return (
      <div className="student-error">
        Student information unavailable.
      </div>
    );
  }

  const {
    student,
    feeOverview,
    recentPayments = [],
  } = dashboard;

  const studentName = student.name || "Student";
  const firstLetter = studentName.charAt(0).toUpperCase();

  return (
    <div className="student-portal">
      {/* Sidebar */}
      <aside className="student-sidebar">
        <div className="student-brand">
          <div className="student-brand-logo">
            {schoolProfile.logo ? (
              <img src={schoolProfile.logo} alt="School logo" />
            ) : (
              (schoolProfile.schoolName || "N").charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <h3>{schoolProfile.schoolName || "STUDENT PORTAL"}</h3>
            <span>STUDENT PORTAL</span>
          </div>
        </div>

        <div className="student-sidebar-label">
          STUDENT PORTAL
        </div>

        <nav className="student-navigation">
          <div
            className={`student-nav-item ${
              activeSection === "dashboard" ? "active" : ""
            }`}
            onClick={handleDashboard}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleDashboard();
              }
            }}
          >
            <span>▦</span>
            Dashboard
          </div>

          <div
            className={`student-nav-item ${
              activeSection === "profile" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("profile");
              setProfileMenuOpen(false);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setActiveSection("profile");
              }
            }}
          >
            <span>◉</span>
            My Profile
          </div>

          <div
            className={`student-nav-item ${
              activeSection === "fees" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("fees");
              setProfileMenuOpen(false);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setActiveSection("fees");
              }
            }}
          >
            <span>₹</span>
            Fee Overview
          </div>

          <div
            className={`student-nav-item ${
              activeSection === "payments" ? "active" : ""
            }`}
            onClick={handlePaymentHistory}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handlePaymentHistory();
              }
            }}
          >
            <span>▤</span>
            Payment History
          </div>
        </nav>

        <div className="student-sidebar-bottom">
          <div className="student-help">
            <div className="student-help-icon">?</div>
            <strong>Need Help?</strong>
            <p>
              Contact your school administration for assistance.
            </p>
          </div>

          <button
            className="student-logout"
            onClick={handleLogout}
          >
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="student-main">
        {/* Topbar */}
        <header className="student-topbar">
          <div>
            <span className="student-breadcrumb">
              STUDENT PORTAL /{" "}
              {activeSection === "payments"
                ? "PAYMENT HISTORY"
                : activeSection === "profile"
                ? "MY PROFILE"
                : activeSection === "fees"
                ? "FEE OVERVIEW"
                : "OVERVIEW"}
            </span>

            <h2>
              {activeSection === "payments"
                ? "Payment History"
                : activeSection === "profile"
                ? "My Profile"
                : activeSection === "fees"
                ? "Fee Overview"
                : "Dashboard"}
            </h2>
          </div>

          <div className="student-top-profile-wrap">
            <button
              type="button"
              className="student-top-profile"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <StudentAvatar
                photoUrl={studentPhotoUrl}
                firstLetter={firstLetter}
              />

              <span className="student-top-name">
                <strong>{studentName}</strong>
                <span>Student Account</span>
              </span>

              <span className={`student-profile-chevron ${profileMenuOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {profileMenuOpen && (
              <div className="student-profile-dropdown" role="menu">
                <div className="student-dropdown-heading">
                  <StudentAvatar
                    photoUrl={studentPhotoUrl}
                    firstLetter={firstLetter}
                  />
                  <div>
                    <strong>{studentName}</strong>
                    <span>{student.admissionNumber || "Student Account"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveSection("profile");
                    setProfileMenuOpen(false);
                  }}
                >
                  <span>◉</span> View My Profile
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="student-dropdown-logout"
                  onClick={handleLogout}
                >
                  <span>↪</span> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="student-content">
          {/* Dashboard Section */}
          {activeSection === "dashboard" && (
            <>
              <section className="student-welcome">
                <div>
                  <span className="student-welcome-tag">
                    STUDENT OVERVIEW
                  </span>

                  <h1>Welcome back, {studentName}!</h1>

                  <p>
                    Here's your academic and fee information
                    for the current session.
                  </p>
                </div>
              </section>

              {/* Fee Summary */}
              <section className="student-section">
                <div className="student-section-heading">
                  <div>
                    <h2>Fee Overview</h2>
                    <p>Your current academic fee summary</p>
                  </div>

                  <span className="student-session">
                    {dashboard.academicSession ||
                      "Academic Session"}
                  </span>
                </div>

                <div className="student-fee-grid">
                  <div className="student-fee-card">
                    <div className="student-fee-icon purple">
                      ₹
                    </div>
                    <span>Monthly Tuition</span>
                    <h3>
                      {formatCurrency(
                        feeOverview?.monthlyTuitionFee
                      )}
                    </h3>
                    <small>Monthly fee</small>
                  </div>

                  <div className="student-fee-card">
                    <div className="student-fee-icon blue">
                      ▤
                    </div>
                    <span>Annual Tuition</span>
                    <h3>
                      {formatCurrency(
                        feeOverview?.annualTuitionFee
                      )}
                    </h3>
                    <small>Annual fee</small>
                  </div>

                  <div className="student-fee-card">
                    <div className="student-fee-icon green">
                      ✓
                    </div>
                    <span>Tuition Paid</span>
                    <h3>
                      {formatCurrency(
                        feeOverview?.tuitionPaid
                      )}
                    </h3>
                    <small>Amount received</small>
                  </div>

                  <div className="student-fee-card">
                    <div className="student-fee-icon orange">
                      !
                    </div>
                    <span>Pending Tuition</span>
                    <h3>
                      {formatCurrency(
                        feeOverview?.pendingTuitionFee
                      )}
                    </h3>
                    <small>Outstanding amount</small>
                  </div>
                </div>
              </section>

              {/* Student Information */}
              <section className="student-section">
                <div className="student-section-heading">
                  <div>
                    <h2>My Profile</h2>
                    <p>Your registered student information</p>
                  </div>
                </div>

                <div className="student-profile-card">
                  <div className="student-profile-heading">
                    <StudentAvatar
                      photoUrl={studentPhotoUrl}
                      firstLetter={firstLetter}
                      large
                    />

                    <div>
                      <h3>{studentName}</h3>
                      <span>
                        Admission No. {student.admissionNumber}
                      </span>
                    </div>

                    <span className="student-status">
                      Registered Student
                    </span>
                  </div>

                  <div className="student-profile-details">
                    <div>
                      <span>Student Name</span>
                      <strong>{student.name || "—"}</strong>
                    </div>

                    <div>
                      <span>Admission Number</span>
                      <strong>
                        {student.admissionNumber || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Class & Section</span>
                      <strong>
                        {student.className || "Not assigned"}
                        {student.section
                          ? ` - ${student.section}`
                          : ""}
                      </strong>
                    </div>

                    <div>
                      <span>Mobile Number</span>
                      <strong>
                        {student.phone || "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span>Academic Session</span>
                      <strong>
                        {dashboard.academicSession || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Recent Payments */}
              <section className="student-section">
                <div className="student-section-heading">
                  <div>
                    <h2>Recent Payments</h2>
                    <p>Your latest fee transactions</p>
                  </div>

                  <button
                  className="view"
                    type="button"
                    onClick={handlePaymentHistory}
                  >
                    View All
                  </button>
                </div>

                <div className="student-payment-card">
                  {recentPayments.length === 0 ? (
                    <div className="student-empty">
                      <div>▤</div>
                      <h3>No payment records yet</h3>
                      <p>
                        Your fee transactions will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="student-table-wrapper">
                      <table className="student-payment-table">
                        <thead>
                          <tr>
                            <th>Payment Date</th>
                            <th>Academic Session</th>
                            <th>Amount</th>
                            <th>Payment Mode</th>
                            <th>Receipt Number</th>
                          </tr>
                        </thead>

                        <tbody>
                          {recentPayments.map((payment) => (
                            <tr key={payment.id}>
                              <td>
                                {formatDate(payment.paymentDate)}
                              </td>
                              <td>
                                {payment.academicSession || "—"}
                              </td>
                              <td className="student-payment-amount">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td>
                                {payment.paymentMode || "—"}
                              </td>
                              <td>
                                {payment.receiptNumber || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Payment History Section */}
          {activeSection === "payments" && (
            <section className="student-section">
              <div className="student-section-heading">
                <div>
                  <h2>Payment History</h2>
                  <p>All your recorded fee transactions</p>
                </div>

                <span className="student-payment-count">
                  {payments.length} Records
                </span>
              </div>

              <div className="student-payment-card">
                {paymentsLoading ? (
                  <div className="student-empty">
                    <p>Loading payment history...</p>
                  </div>
                ) : paymentError ? (
                  <div className="student-empty">
                    <p>{paymentError}</p>
                    <button onClick={handlePaymentHistory}>
                      Try Again
                    </button>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="student-empty">
                    <div>▤</div>
                    <h3>No payment records yet</h3>
                    <p>
                      Your fee transactions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="student-table-wrapper">
                    <table className="student-payment-table">
                      <thead>
                        <tr>
                          <th>Payment Date</th>
                          <th>Academic Session</th>
                          <th>Amount</th>
                          <th>Payment Mode</th>
                          <th>Receipt Number</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>

                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              {formatDate(payment.payment_date)}
                            </td>
                            <td>
                              {payment.academic_session || "—"}
                            </td>
                            <td className="student-payment-amount">
                              {formatCurrency(payment.amount_paid)}
                            </td>
                            <td>
                              {payment.payment_mode || "—"}
                            </td>
                            <td>
                              {payment.receipt_number || "—"}
                            </td>
                            <td>
                              <button
                              className="coloring"
                                type="button"
                                onClick={() =>
                                  handleViewReceipt(payment.id)
                                }
                              >
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Profile Section */}
          {activeSection === "profile" && (
            <section className="student-section">
              <div className="student-section-heading">
                <div>
                  <h2>My Profile</h2>
                  <p>Your registered student information</p>
                </div>
              </div>

              <div className="student-profile-card">
                <div className="student-profile-heading">
                  <StudentAvatar
                    photoUrl={studentPhotoUrl}
                    firstLetter={firstLetter}
                    large
                  />

                  <div>
                    <h3>{studentName}</h3>
                    <span>
                      Admission No. {student.admissionNumber}
                    </span>
                  </div>

                  <span className="student-status">
                    Registered Student
                  </span>
                </div>

                <div className="student-profile-details">
                  <div>
                    <span>Student Name</span>
                    <strong>{student.name || "—"}</strong>
                  </div>

                  <div>
                    <span>Admission Number</span>
                    <strong>{student.admissionNumber || "—"}</strong>
                  </div>

                  <div>
                    <span>Class & Section</span>
                    <strong>
                      {student.className || "Not assigned"}
                      {student.section ? ` - ${student.section}` : ""}
                    </strong>
                  </div>

                  <div>
                    <span>Mobile Number</span>
                    <strong>{student.phone || "Not available"}</strong>
                  </div>

                  <div>
                    <span>Academic Session</span>
                    <strong>{dashboard.academicSession || "—"}</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Fee Overview Section */}
          {activeSection === "fees" && (
            <section className="student-section">
              <div className="student-section-heading">
                <div>
                  <h2>Fee Overview</h2>
                  <p>Your current academic fee summary</p>
                </div>

                <span className="student-session">
                  {dashboard.academicSession || "Academic Session"}
                </span>
              </div>

              <div className="student-fee-grid">
                <div className="student-fee-card">
                  <div className="student-fee-icon purple">₹</div>
                  <span>Monthly Tuition</span>
                  <h3>{formatCurrency(feeOverview?.monthlyTuitionFee)}</h3>
                  <small>Monthly fee</small>
                </div>

                <div className="student-fee-card">
                  <div className="student-fee-icon blue">▤</div>
                  <span>Annual Tuition</span>
                  <h3>{formatCurrency(feeOverview?.annualTuitionFee)}</h3>
                  <small>Annual fee</small>
                </div>

                <div className="student-fee-card">
                  <div className="student-fee-icon green">✓</div>
                  <span>Tuition Paid</span>
                  <h3>{formatCurrency(feeOverview?.tuitionPaid)}</h3>
                  <small>Amount received</small>
                </div>

                <div className="student-fee-card">
                  <div className="student-fee-icon orange">!</div>
                  <span>Pending Tuition</span>
                  <h3>{formatCurrency(feeOverview?.pendingTuitionFee)}</h3>
                  <small>Outstanding amount</small>
                </div>
              </div>
            </section>
          )}

          <footer className="student-footer">
            © {new Date().getFullYear()} {schoolProfile.schoolName || "Student Portal"}.
            All rights reserved.
          </footer>
        </div>
      </main>

      {/* Receipt Loading / Error */}
      {receiptLoading && (
        <div className="student-empty">
          <p>Loading receipt...</p>
        </div>
      )}

      {receiptError && (
        <div className="student-error">
          <p>{receiptError}</p>
          <button onClick={() => setReceiptError("")}>
            Close
          </button>
        </div>
      )}

      {/* Receipt Preview */}
      {selectedReceipt && (
        <div
          className="student-receipt-overlay"
          onClick={handleReceiptClose}
        >
          <div
            className="student-receipt-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-receipt-modal-header">
              <h3>Fee Payment Receipt</h3>
              <button
                type="button"
                className="student-receipt-close"
                onClick={handleReceiptClose}
                aria-label="Close receipt"
              >
                ×
              </button>
            </div>

            <div className="student-receipt-modal-actions">
              <button
                type="button"
                className="student-receipt-secondary-button"
                onClick={handleReceiptClose}
              >
                Close
              </button>
              <button
                type="button"
                className="student-receipt-print-button"
                onClick={handlePrintReceipt}
              >
                Print / Save PDF
              </button>
            </div>

            <div
              id="student-printable-receipt"
              className="student-receipt-content"
            >
              <div className="student-school-heading">
                {schoolProfile.logo && (
                  <img
                    className="student-school-logo"
                    src={schoolProfile.logo}
                    alt="School logo"
                  />
                )}
                <div className="student-school-information">
                  <h1>
                    {schoolProfile.schoolName || "Nachiketa Concept School"}
                  </h1>
                  {schoolProfile.address && <p>{schoolProfile.address}</p>}
                  {(schoolProfile.phone || schoolProfile.email) && (
                    <p>
                      {schoolProfile.phone || ""}
                      {schoolProfile.phone && schoolProfile.email ? " | " : ""}
                      {schoolProfile.email || ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="student-receipt-title">FEE PAYMENT RECEIPT</div>

              <div className="student-receipt-meta">
                <p><strong>Receipt No:</strong> {selectedReceipt.receipt_number || "—"}</p>
                <p><strong>Payment Date:</strong> {formatDate(selectedReceipt.payment_date)}</p>
              </div>

              <div className="student-receipt-details">
                <div><span>Student Name</span><strong>{selectedReceipt.student_name || studentName}</strong></div>
                <div><span>Father's Name</span><strong>{selectedReceipt.father_name || "—"}</strong></div>
                <div><span>Admission No.</span><strong>{selectedReceipt.admission_number || "—"}</strong></div>
                <div><span>Class / Section</span><strong>{selectedReceipt.class_name || "—"}{selectedReceipt.section ? ` / ${selectedReceipt.section}` : ""}</strong></div>
                <div><span>Academic Session</span><strong>{selectedReceipt.academic_session || "—"}</strong></div>
                <div><span>Payment Mode</span><strong>{selectedReceipt.payment_mode || "—"}</strong></div>
              </div>

              <h3 className="student-receipt-section-title">Payment Particulars</h3>
              <table className="student-particulars-table">
                <thead>
                  <tr><th>Particulars</th><th>Amount (₹)</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const months = selectedReceipt.monthDetails || [];
                    const extras = selectedReceipt.extraCharges || [];
                    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const extraTotal = extras.reduce((sum, item) => sum + Number(item.amount || 0), 0);
                    const tuitionTotal = months.length
                      ? months.reduce((sum, item) => sum + Number(item.amount_paid ?? item.amountPaid ?? 0), 0)
                      : Math.max(0, Number(selectedReceipt.amount_paid || 0) - extraTotal);
                    if (!months.length && !extras.length) {
                      return <tr><td>Fee Payment</td><td>{formatCurrency(selectedReceipt.amount_paid)}</td></tr>;
                    }
                    return (
                      <>
                        {months.length > 0 && (
                          <tr>
                            <td>Tuition Fee {months.map((item) => {
                              const raw = item.fee_month ?? item.month;
                              const number = Number(raw);
                              const label = Number.isInteger(number) && number >= 1 && number <= 12 ? monthNames[number - 1] : raw;
                              return label;
                            }).filter(Boolean).join(", ")}</td>
                            <td>{formatCurrency(tuitionTotal)}</td>
                          </tr>
                        )}
                        {extras.map((charge, index) => (
                          <tr key={charge.id || index}>
                            <td>{charge.charge_name || charge.chargeName || "Additional Charge"}</td>
                            <td>{formatCurrency(charge.amount)}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>

              <div className="student-receipt-total-row">
                <strong>Total Amount Received</strong>
                <strong>{formatCurrency(selectedReceipt.amount_paid)}</strong>
              </div>

              {selectedReceipt.remarks && (
                <p className="student-receipt-remarks"><strong>Remarks:</strong> {selectedReceipt.remarks}</p>
              )}

              <div className="student-receipt-footer">
                <p className="student-receipt-thankyou">Thank you for your payment!</p>
                <div className="student-receipt-signature">
                  {schoolProfile.principalSignature && (
                    <img src={schoolProfile.principalSignature} alt="Principal signature" />
                  )}
                  <span>{schoolProfile.principalName || "Authorized Signatory"}</span>
                  <small>Principal</small>
                </div>
              </div>
              <p className="student-receipt-note">This is a computer-generated fee receipt.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
