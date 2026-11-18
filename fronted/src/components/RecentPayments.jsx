import { useEffect, useState } from "react";
import {
  CreditCard,
  ArrowUpRight,
  CalendarDays,
  Wallet,
} from "lucide-react";

import styles from "./RecentPayments.module.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`
).replace(/\/$/, "");

const ACADEMIC_SESSION = "2026-2027";

// Format currency in Indian number format
function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

// Format payment date
function formatDate(dateString) {
  if (!dateString) return "-";

  const dateText = String(dateString).slice(0, 10);
  const [year, month, day] = dateText.split("-");

  if (!year || !month || !day) return "-";

  return `${day} ${new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleString("en-IN", {
    month: "short",
  })} ${year}`;
}

function RecentPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRecentPayments() {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem("adminToken");

        if (!token) {
          throw new Error(
            "Please login again to view payments."
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/payments?academic_session=${encodeURIComponent(
            ACADEMIC_SESSION
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message ||
              "Unable to load recent payments."
          );
        }

        if (active) {
          const paymentRecords = Array.isArray(result.data)
            ? result.data
            : [];

          const latestPayments = paymentRecords
            .sort((a, b) => {
              const dateCompare = String(
                b.paymentDate || ""
              ).localeCompare(
                String(a.paymentDate || "")
              );

              return (
                dateCompare ||
                Number(b.id) - Number(a.id)
              );
            })
            .slice(0, 4);

          setPayments(latestPayments);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Unable to load recent payments."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRecentPayments();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={styles.container}>

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headingLeft}>
          <div className={styles.headingIcon}>
            <CreditCard size={20} />
          </div>

          <div>
            <h2>Recent Payments</h2>
            <p>
              Latest fee transactions from your school
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.viewAllButton}
        >
          View All
          <ArrowUpRight size={16} />
        </button>
      </div>

      {/* PAYMENTS TABLE */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>

          <thead>
            <tr>
              <th>STUDENT</th>
              <th>AMOUNT</th>
              <th>PAYMENT MODE</th>
              <th>PAYMENT DATE</th>
            </tr>
          </thead>

          <tbody>

            {/* LOADING STATE */}
            {loading ? (
              <tr>
                <td colSpan={4}>
                  <div className={styles.stateMessage}>
                    <span className={styles.loader}></span>
                    Loading recent payments...
                  </div>
                </td>
              </tr>

            ) : error ? (

              /* ERROR STATE */
              <tr>
                <td colSpan={4}>
                  <div className={styles.stateMessageError}>
                    {error}
                  </div>
                </td>
              </tr>

            ) : payments.length === 0 ? (

              /* EMPTY STATE */
              <tr>
                <td colSpan={4}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <Wallet size={25} />
                    </div>

                    <strong>No payments yet</strong>

                    <span>
                      New fee transactions will appear here.
                    </span>
                  </div>
                </td>
              </tr>

            ) : (

              /* PAYMENT RECORDS */
              payments.map((payment) => (
                <tr key={payment.id}>

                  {/* STUDENT */}
                  <td>
                    <div className={styles.studentCell}>
                      <div className={styles.studentAvatar}>
                        {payment.studentName
                          ? payment.studentName
                              .charAt(0)
                              .toUpperCase()
                          : "S"}
                      </div>

                      <span className={styles.studentName}>
                        {payment.studentName ||
                          "Unknown Student"}
                      </span>
                    </div>
                  </td>

                  {/* AMOUNT */}
                  <td>
                    <span className={styles.amount}>
                      ₹{formatCurrency(payment.amount)}
                    </span>
                  </td>

                  {/* PAYMENT MODE */}
                  <td>
                    <span className={styles.paymentMode}>
                      <CreditCard size={14} />

                      {payment.paymentMode || "-"}
                    </span>
                  </td>

                  {/* PAYMENT DATE */}
                  <td>
                    <span className={styles.paymentDate}>
                      <CalendarDays size={14} />

                      {formatDate(payment.paymentDate)}
                    </span>
                  </td>

                </tr>
              ))
            )}

          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      {!loading &&
        !error &&
        payments.length > 0 && (
          <div className={styles.footer}>
            Showing the latest {payments.length} transactions
          </div>
        )}

    </section>
  );
}

export default RecentPayments;
