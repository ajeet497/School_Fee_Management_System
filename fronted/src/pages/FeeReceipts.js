import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// Use Render's VITE_API_URL in production and localhost during local development.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

function getClassName(className, section) {
  if (!className) return "Class not assigned";

  return section
    ? `${className} - Section ${section}`
    : className;
}

// Use the same authentication mechanism as Fee Payment.
async function requestApi(path) {
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    throw new Error(
      "Your admin session was not found. Please log in again."
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
      "Cannot connect to the backend. Please check your internet connection and backend service."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Your admin session was rejected. Please log in again."
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return result;
}

// Convert the backend payment into the format used by the Receipt Page.
function mapPayment(record) {
  const rawMonths = Array.isArray(record.feeMonths)
    ? record.feeMonths
    : [];

  const rawCharges = Array.isArray(record.extraCharges)
    ? record.extraCharges
    : [];

  return {
    id: Number(record.id),

    studentId: String(
      record.studentId ??
        record.admission_number ??
        ""
    ),

    studentDatabaseId: Number(
      record.studentDatabaseId ??
        record.student_id ??
        0
    ),

    studentName:
      record.studentName ??
      record.student_name ??
      "Unknown Student",

    fatherName:
      record.fatherName ??
      record.father_name ??
      "",

    className:
      record.className ??
      getClassName(
        record.class_name,
        record.section
      ),

    academicSession:
      record.academicSession ??
      record.academic_session ??
      "",

    paymentDate: String(
      record.paymentDate ??
        record.payment_date ??
        ""
    ).slice(0, 10),

    amount: Number(
      record.amount ??
        record.amount_paid ??
        0
    ),

    paymentMode:
      record.paymentMode ??
      record.payment_mode ??
      "—",

    receiptNumber: String(
      record.receiptNumber ??
        record.receipt_number ??
        ""
    ),

    feeMonths: rawMonths
      .map(Number)
      .filter(
        (month) =>
          Number.isInteger(month) &&
          month >= 1 &&
          month <= 12
      ),

    extraCharges: rawCharges.map((charge, index) => ({
      id: charge.id ?? `charge-${record.id}-${index}`,
      chargeName:
        charge.chargeName ??
        charge.charge_name ??
        "Additional Charge",
      amount: Number(charge.amount ?? 0),
    })),

    remarks: record.remarks ?? "",
  };
}

function useFeeReceipts() {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load saved payment records from MySQL through the backend.
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await requestApi("/payments");

      const records = Array.isArray(result.data)
        ? result.data
        : [];

      const mappedRecords = records.map(mapPayment);

      // Newest payment first. The backend also sorts by date and ID.
      mappedRecords.sort((a, b) => {
        const dateDifference =
          (b.paymentDate || "").localeCompare(
            a.paymentDate || ""
          );

        return dateDifference || b.id - a.id;
      });

      setPayments(mappedRecords);

      // Refresh the currently open receipt if it still exists.
      setSelectedReceipt((current) => {
        if (!current) return null;

        return (
          mappedRecords.find(
            (payment) => payment.id === current.id
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        err.message || "Unable to load payment records."
      );
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Only payments with a saved receipt number are available as receipts.
  const receipts = useMemo(
    () =>
      payments.filter(
        (payment) => payment.receiptNumber.trim() !== ""
      ),
    [payments]
  );

  // Search by receipt number, admission number, or student name.
  const filteredReceipts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return receipts;

    return receipts.filter((receipt) => {
      return (
        receipt.receiptNumber.toLowerCase().includes(search) ||
        receipt.studentId.toLowerCase().includes(search) ||
        receipt.studentName.toLowerCase().includes(search)
      );
    });
  }, [receipts, searchTerm]);

  // Open a saved receipt for viewing or printing.
  const handleViewReceipt = (receipt) => {
    setError("");
    setSelectedReceipt(receipt);
  };

  const handleGenerateReceipt = (payment) => {
    if (!payment.receiptNumber) {
      setError(
        "This payment has no saved receipt number. Check the backend payment record."
      );
      return;
    }

    setError("");
    setSelectedReceipt(payment);
  };

  const handleCloseReceipt = () => {
    setSelectedReceipt(null);
  };

  return {
    payments,
    receipts,
    searchTerm,
    setSearchTerm,
    filteredReceipts,
    selectedReceipt,
    loading,
    error,
    reloadPayments: loadPayments,
    handleGenerateReceipt,
    handleViewReceipt,
    handleCloseReceipt,
  };
}

export default useFeeReceipts;
