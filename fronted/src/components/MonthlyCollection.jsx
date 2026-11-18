import { useEffect, useState } from "react";
import styles from "./MonthlyCollection.module.css";

// Automatically selects the correct backend URL.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\\/$/, "");

const ACADEMIC_SESSION = "2026-2027";

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getLastFourMonths() {
  const now = new Date();

  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - index,
      1
    );

    return {
      key: getMonthKey(date),
      label: date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    };
  });
}

function MonthlyCollection() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMonthlyCollection() {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem("adminToken");

        if (!token) {
          throw new Error("Please login again to view collections.");
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
            result.message || "Unable to load monthly collections."
          );
        }

        const payments = Array.isArray(result.data)
          ? result.data
          : [];

        const months = getLastFourMonths();

        const monthlyTotals = {};

        months.forEach((month) => {
          monthlyTotals[month.key] = 0;
        });

        payments.forEach((payment) => {
          if (!payment.paymentDate) return;

          // Avoid timezone conversion when grouping payments.
          const date = String(payment.paymentDate).slice(0, 10);

          if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return;

          const monthKey = date.slice(0, 7);

          if (Object.prototype.hasOwnProperty.call(
            monthlyTotals,
            monthKey
          )) {
            monthlyTotals[monthKey] += Number(payment.amount || 0);
          }
        });

        const rows = months.map((month) => ({
          ...month,
          amount: monthlyTotals[month.key],
        }));

        if (active) {
          setCollections(rows);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load monthly collections."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMonthlyCollection();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Monthly Collection</h2>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Amount Collected</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2}>Loading collections...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={2}>{error}</td>
              </tr>
            ) : (
              collections.map((month) => (
                <tr key={month.key}>
                  <td>{month.label}</td>
                  <td>₹{formatCurrency(month.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MonthlyCollection;
