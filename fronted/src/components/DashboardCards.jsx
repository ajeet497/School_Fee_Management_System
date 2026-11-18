
import { useEffect, useState } from "react";
import {
  Users,
  School,
  Wallet,
  AlertCircle,
  CircleCheck,
  CircleX,
} from "lucide-react";

import styles from "./DashboardCards.module.css";
import { getStudents } from "../services/studentApi";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`
).replace(/\\/$/, "");

const initialStats = {
  totalStudents: 0,
  totalClasses: 0,
  totalFeeCollected: 0,
  pendingFee: 0,
  paidStudents: 0,
  unpaidStudents: 0,
};

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

// Fetch protected backend data.
async function fetchProtectedData(path) {
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    throw new Error(
      "Please login again to view Dashboard statistics."
    );
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Please check your internet connection or try again later."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Unable to load Dashboard data."
    );
  }

  return result;
}

// Extract records from API response.
function getRecords(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}

// Get actual student database ID.
function getStudentDatabaseId(student) {
  return Number(student.id ?? student.student_id ?? 0);
}

// Get student database ID from payment.
function getPaymentStudentId(payment) {
  return Number(
    payment.studentDatabaseId ?? payment.student_id ?? 0
  );
}

// Academic month numbering:
// April = 1, May = 2, ... March = 12.
function getCurrentAcademicMonth() {
  const month = new Date().getMonth() + 1;

  return month >= 4 ? month - 3 : month + 9;
}

// Parse an admission date safely.
function getAdmissionCalendarDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const dateText = String(value).trim();

  if (dateText.includes("T")) {
    const parsedDate = new Date(dateText);

    if (Number.isNaN(parsedDate.getTime())) return null;

    return {
      year: parsedDate.getFullYear(),
      month: parsedDate.getMonth() + 1,
      day: parsedDate.getDate(),
    };
  }

  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const checkDate = new Date(Date.UTC(year, month - 1, day));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() + 1 !== month ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

// Get the first applicable academic month for a student.
function getFirstApplicableAcademicMonth(
  admissionDate,
  academicSession
) {
  const date = getAdmissionCalendarDate(admissionDate);

  if (!date || !academicSession) return null;

  const { year, month } = date;

  const sessionStartYear = Number(
    academicSession.split("-")[0]
  );

  if (
    year < sessionStartYear ||
    (year === sessionStartYear && month < 4)
  ) {
    return 1;
  }

  if (year === sessionStartYear && month >= 4) {
    return month - 3;
  }

  if (year === sessionStartYear + 1 && month <= 3) {
    return month + 9;
  }

  return 13;
}

function DashboardCards() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [academicSession, setAcademicSession] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboardStats() {
      try {
        setLoading(true);
        setError("");

        // STEP 1: Load the saved school profile.
        const profileResult = await fetchProtectedData("/profile");

        const savedSession =
          profileResult?.data?.academic_session?.trim();

        if (!savedSession) {
          throw new Error(
            "Academic session is missing. Please save it in School Profile."
          );
        }

        if (active) {
          setAcademicSession(savedSession);
        }

        // STEP 2: Fetch Dashboard data using the saved session.
        const [
          studentsResult,
          classesResult,
          paymentsResult,
          paymentStudentsResult,
        ] = await Promise.all([
          getStudents(),

          fetchProtectedData("/classes"),

          fetchProtectedData(
            `/payments?academic_session=${encodeURIComponent(
              savedSession
            )}`
          ),

          fetchProtectedData(
            `/payment-students?academic_session=${encodeURIComponent(
              savedSession
            )}`
          ),
        ]);

        const students = getRecords(studentsResult);
        const classes = getRecords(classesResult);
        const payments = getRecords(paymentsResult);
        const paymentStudents = getRecords(paymentStudentsResult);

        // 1. Total fee collected.
        const totalFeeCollected = payments.reduce(
          (sum, payment) => {
            return (
              sum +
              Number(payment.amount ?? payment.amount_paid ?? 0)
            );
          },
          0
        );

        // 2. Current academic month.
        const currentAcademicMonth = getCurrentAcademicMonth();

        // 3. Eligible students.
        const eligibleStudents = paymentStudents.filter(
          (student) =>
            student.annual_fee != null &&
            getStudentDatabaseId(student) > 0 &&
            getFirstApplicableAcademicMonth(
              student.admission_date,
              savedSession
            ) !== null
        );

        // 4. Track monthly payments for each student.
        const studentPaidMonths = new Map();

        for (const student of eligibleStudents) {
          const studentId = getStudentDatabaseId(student);

          studentPaidMonths.set(studentId, new Map());
        }

        for (const payment of payments) {
          const studentId = getPaymentStudentId(payment);
          const paidMonths = studentPaidMonths.get(studentId);

          if (!paidMonths) continue;

          const monthDetails = Array.isArray(payment.monthDetails)
            ? payment.monthDetails
            : [];

          for (const detail of monthDetails) {
            const month = Number(detail.feeMonth);
            const amountPaid = Number(detail.amountPaid || 0);

            if (
              !Number.isInteger(month) ||
              month < 1 ||
              month > currentAcademicMonth
            ) {
              continue;
            }

            const previousAmount = paidMonths.get(month) || 0;

            paidMonths.set(
              month,
              previousAmount + amountPaid
            );
          }
        }

        // 5. Calculate pending fee and unpaid students.
        let pendingFee = 0;
        let unpaidStudents = 0;

        for (const student of eligibleStudents) {
          const studentId = getStudentDatabaseId(student);

          const monthlyFee = Number(
            student.monthly_tuition_fee || 0
          );

          const firstApplicableMonth =
            getFirstApplicableAcademicMonth(
              student.admission_date,
              savedSession
            );

          if (
            firstApplicableMonth === null ||
            firstApplicableMonth > currentAcademicMonth ||
            monthlyFee <= 0
          ) {
            continue;
          }

          const paidMonths =
            studentPaidMonths.get(studentId) || new Map();

          const monthsDue =
            currentAcademicMonth - firstApplicableMonth + 1;

          const totalFeeDue = monthlyFee * monthsDue;

          let tuitionPaid = 0;

          for (
            let month = firstApplicableMonth;
            month <= currentAcademicMonth;
            month++
          ) {
            const amountPaid = Number(
              paidMonths.get(month) || 0
            );

            tuitionPaid += Math.min(monthlyFee, amountPaid);
          }

          const studentPendingFee = Math.max(
            0,
            totalFeeDue - tuitionPaid
          );

          pendingFee += studentPendingFee;

          if (studentPendingFee > 0) {
            unpaidStudents++;
          }
        }

        // 6. Calculate paid students.
        const paidStudents = Math.max(
          0,
          eligibleStudents.length - unpaidStudents
        );

        // 7. Update Dashboard statistics.
        if (active) {
          setStats({
            totalStudents: students.length,
            totalClasses: classesResult.count ?? classes.length,
            totalFeeCollected,
            pendingFee,
            paidStudents,
            unpaidStudents,
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Unable to load Dashboard statistics."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboardStats();

    // Refresh Dashboard when the School Profile is saved.
    window.addEventListener(
      "schoolProfileUpdated",
      loadDashboardStats
    );

    return () => {
      active = false;

      window.removeEventListener(
        "schoolProfileUpdated",
        loadDashboardStats
      );
    };
  }, []);

  const cards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toLocaleString("en-IN"),
      description: "Registered students",
      Icon: Users,
      color: "blue",
    },
    {
      title: "Total Classes",
      value: stats.totalClasses.toLocaleString("en-IN"),
      description: "Available classes",
      Icon: School,
      color: "purple",
    },
    {
      title: "Total Fee Collected",
      value: `₹${formatCurrency(stats.totalFeeCollected)}`,
      description: "Fees received",
      Icon: Wallet,
      color: "green",
    },
    {
      title: "Pending Fee",
      value: `₹${formatCurrency(stats.pendingFee)}`,
      description: "Outstanding tuition",
      Icon: AlertCircle,
      color: "orange",
    },
    {
      title: "Paid Students",
      value: stats.paidStudents.toLocaleString("en-IN"),
      description: "No outstanding tuition",
      Icon: CircleCheck,
      color: "teal",
    },
    {
      title: "Unpaid Students",
      value: stats.unpaidStudents.toLocaleString("en-IN"),
      description: "With pending tuition",
      Icon: CircleX,
      color: "red",
    },
  ];

  return (
    <section className={styles.dashboardSection}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Overview</h2>
          <p>Here's a summary of your school's performance.</p>
        </div>

        <span className={styles.sessionBadge}>
          Academic Session {academicSession || "Loading..."}
        </span>
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.cardsContainer}>
        {cards.map(({ title, value, description, Icon, color }) => (
          <article
            className={`${styles.card} ${styles[color]}`}
            key={title}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardIcon}>
                <Icon size={22} strokeWidth={1.9} />
              </div>

              <span className={styles.cardDot} />
            </div>

            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>{title}</p>

              <h3 className={styles.cardValue}>
                {loading ? "—" : value}
              </h3>

              <span className={styles.cardDescription}>
                {description}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardCards;
