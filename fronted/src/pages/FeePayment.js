import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:5000/api";
const DEFAULT_SESSION = "2026-2027";

const MONTHS = [
  { label: "April", value: 1 },
  { label: "May", value: 2 },
  { label: "June", value: 3 },
  { label: "July", value: 4 },
  { label: "August", value: 5 },
  { label: "September", value: 6 },
  { label: "October", value: 7 },
  { label: "November", value: 8 },
  { label: "December", value: 9 },
  { label: "January", value: 10 },
  { label: "February", value: 11 },
  { label: "March", value: 12 },
];

const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

function getLocalDate() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentAcademicSession() {
  const date = new Date();
  const startYear = date.getMonth() >= 3
    ? date.getFullYear()
    : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function getCurrentAcademicMonth() {
  const month = new Date().getMonth() + 1;
  return month >= 4 ? month - 3 : month + 9;
}

function createEmptyForm() {
  return {
    studentId: "",
    academicSession: DEFAULT_SESSION,
    paymentDate: getLocalDate(),
    amount: "",
    paymentMode: "Cash",
    feeMonths: [],
    extraCharges: [],
  };
}

function getRecords(result, key = "data") {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.[key])) return result[key];
  return [];
}

function getClassName(className, section) {
  if (!className) return "Class not assigned";
  return section ? `${className} - Section ${section}` : className;
}

// Convert the stored admission date into the student's local calendar date.
// MySQL DATE values may arrive as YYYY-MM-DD or as an ISO timestamp.
function getAdmissionDateParts(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const text = String(value).trim();

  if (text.includes("T")) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    month < 1 || month > 12 || day < 1 ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

// Returns the first tuition month in the selected academic session.
// April = 1, May = 2, ... March = 12.
function getFirstApplicableAcademicMonth(admissionDate, academicSession) {
  const date = getAdmissionDateParts(admissionDate);
  if (!date) return null;

  const match = String(academicSession || "").match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);

  if (date.year < startYear || (date.year === startYear && date.month < 4)) {
    return 1;
  }

  if (date.year === startYear && date.month >= 4) {
    return date.month - 3;
  }

  if (date.year === startYear + 1 && date.month <= 3) {
    return date.month + 9;
  }

  // Admission is after this academic session.
  return 13;
}

function mapStudent(record) {
  const databaseId = Number(record.id ?? record.student_id);
  const monthlyTuitionFee = Number(record.monthly_tuition_fee ?? 0);

  return {
    id: databaseId,
    studentDatabaseId: databaseId,
    studentId: String(record.admission_number ?? ""),
    name: record.student_name ?? "",
    admissionDate: record.admission_date ?? null,
    classId: record.class_id ?? "",
    className: getClassName(record.class_name, record.section),
    academicSession: record.academic_session ?? DEFAULT_SESSION,
    admissionFee: Number(record.admission_fee ?? 0),
    monthlyTuitionFee,
    otherCharges: Number(record.other_charges ?? 0),
    annualFee: record.annual_fee == null
      ? (record.monthly_tuition_fee == null ? null : monthlyTuitionFee * 12)
      : Number(record.annual_fee),
    totalFee: record.annual_fee == null
      ? (record.monthly_tuition_fee == null ? null : monthlyTuitionFee * 12)
      : Number(record.annual_fee),
    totalPaid: Number(record.total_paid ?? 0),
    pendingAmount: record.pending_amount == null
      ? null
      : Number(record.pending_amount),
    feeStatus: record.fee_status ?? "Pending",
  };
}

function mapPayment(record) {
  return {
    id: Number(record.id),
    studentId: String(record.studentId ?? record.admission_number ?? ""),
    studentDatabaseId: Number(record.studentDatabaseId ?? record.student_id ?? 0),
    studentName: record.studentName ?? record.student_name ?? "",
    className: record.className ?? getClassName(record.class_name, record.section),
    academicSession: record.academicSession ?? record.academic_session ?? DEFAULT_SESSION,
    paymentDate: String(record.paymentDate ?? record.payment_date ?? "").slice(0, 10),
    amount: Number(record.amount ?? record.amount_paid ?? 0),
    paymentMode: record.paymentMode ?? record.payment_mode ?? "",
    receiptNumber: record.receiptNumber ?? record.receipt_number ?? "",
    remarks: record.remarks ?? "",
    feeMonths: Array.isArray(record.feeMonths)
      ? record.feeMonths.map(Number)
      : Array.isArray(record.fee_months)
        ? record.fee_months.map(Number)
        : [],
    extraCharges: Array.isArray(record.extraCharges)
      ? record.extraCharges.map((charge, index) => ({
          id: charge.id ?? `saved-${record.id}-${index}`,
          chargeName: charge.chargeName ?? charge.charge_name ?? "",
          amount: Number(charge.amount ?? 0),
        }))
      : Array.isArray(record.extra_charges)
        ? record.extra_charges.map((charge, index) => ({
            id: charge.id ?? `saved-${record.id}-${index}`,
            chargeName: charge.chargeName ?? charge.charge_name ?? "",
            amount: Number(charge.amount ?? 0),
          }))
        : [],
  };
}

// Uses the same admin token and login mechanism as the existing application.
async function requestApi(path, options = {}) {
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check that your server is running on port 5000."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Request failed with status ${response.status}.`);
  }
  return result;
}

function useFeePayment() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [formData, setFormData] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedStudent = useMemo(
    () => students.find((student) =>
      student.studentId === formData.studentId &&
      student.academicSession === formData.academicSession
    ) ?? null,
    [students, formData.studentId, formData.academicSession]
  );

  const classes = useMemo(
    () => [...new Set(students.map((student) => student.className))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const search = admissionSearch.trim().toLowerCase();
    if (!search && !selectedClass) return [];

    return students.filter((student) => {
      const matchesAdmission = !search || student.studentId.toLowerCase().includes(search);
      const matchesClass = !selectedClass || student.className === selectedClass;
      return matchesAdmission && matchesClass;
    }).slice(0, 10);
  }, [students, admissionSearch, selectedClass]);

  const getStudentTuitionPaid = useCallback(
    (studentId, academicSession, excludeId = null) => {
      const student = students.find((item) =>
        item.studentId === String(studentId) &&
        item.academicSession === academicSession
      );
      if (!student) return 0;

      const firstMonth = getFirstApplicableAcademicMonth(
        student.admissionDate,
        academicSession
      );
      if (firstMonth === null || firstMonth > 12) return 0;

      const paidMonthSet = new Set();

      payments
        .filter((payment) =>
          payment.studentId === String(studentId) &&
          payment.academicSession === academicSession &&
          payment.id !== excludeId
        )
        .forEach((payment) => {
          (payment.feeMonths || []).forEach((month) => {
            const monthNumber = Number(month);
            if (
              Number.isInteger(monthNumber) &&
              monthNumber >= firstMonth &&
              monthNumber <= 12
            ) {
              paidMonthSet.add(monthNumber);
            }
          });
        });

      return paidMonthSet.size * student.monthlyTuitionFee;
    },
    [payments, students]
  );

  const totalPaid = selectedStudent
    ? getStudentTuitionPaid(selectedStudent.studentId, formData.academicSession, editingId)
    : 0;

  const selectedFirstMonth = selectedStudent
    ? getFirstApplicableAcademicMonth(
        selectedStudent.admissionDate,
        formData.academicSession
      )
    : null;

  const selectedMonthsToDate = formData.academicSession === getCurrentAcademicSession()
    ? getCurrentAcademicMonth()
    : 12;

  const selectedTuitionDue = selectedStudent &&
    selectedStudent.totalFee != null &&
    selectedFirstMonth !== null &&
    selectedFirstMonth <= selectedMonthsToDate
      ? (selectedMonthsToDate - selectedFirstMonth + 1) * selectedStudent.monthlyTuitionFee
      : 0;

  const pendingAmount = Math.max(0, selectedTuitionDue - totalPaid);

  const getMonthPaid = useCallback(
    (studentId, academicSession, monthNumber, excludeId = null) => {
      const student = students.find((item) =>
        item.studentId === String(studentId) &&
        item.academicSession === academicSession
      );
      if (!student) return 0;

      return payments.some((payment) =>
        payment.id !== excludeId &&
        payment.studentId === String(studentId) &&
        payment.academicSession === academicSession &&
        payment.feeMonths?.includes(Number(monthNumber))
      ) ? student.monthlyTuitionFee : 0;
    },
    [payments, students]
  );

  const isFutureMonth = useCallback((monthNumber) => {
    if (formData.academicSession !== getCurrentAcademicSession()) return false;
    return Number(monthNumber) > getCurrentAcademicMonth();
  }, [formData.academicSession]);

  const isBeforeAdmissionMonth = useCallback((monthNumber) => {
    if (!selectedStudent) return false;

    const firstApplicableMonth = getFirstApplicableAcademicMonth(
      selectedStudent.admissionDate,
      formData.academicSession
    );

    return (
      firstApplicableMonth !== null &&
      firstApplicableMonth <= 12 &&
      Number(monthNumber) < firstApplicableMonth
    );
  }, [selectedStudent, formData.academicSession]);

  const getMonthPending = useCallback((monthNumber) => {
    if (!selectedStudent || isFutureMonth(monthNumber)) return 0;

    const firstApplicableMonth = getFirstApplicableAcademicMonth(
      selectedStudent.admissionDate,
      formData.academicSession
    );

    // Months before the student's admission are not tuition months.
    if (
      firstApplicableMonth === null ||
      Number(monthNumber) < firstApplicableMonth ||
      firstApplicableMonth > 12
    ) {
      return 0;
    }

    const paid = getMonthPaid(
      selectedStudent.studentId,
      formData.academicSession,
      monthNumber,
      editingId
    );
    return Math.max(0, selectedStudent.monthlyTuitionFee - paid);
  }, [selectedStudent, formData.academicSession, editingId, getMonthPaid, isFutureMonth]);

  const selectedMonthsDue = useMemo(
    () => formData.feeMonths.reduce((sum, monthNumber) => sum + getMonthPending(monthNumber), 0),
    [formData.feeMonths, getMonthPending]
  );

  // Status is based on tuition being paid through the current month,
  // not on whether the full year's tuition has already been collected.
  const feeStatus = useMemo(() => {
    if (!selectedStudent) return "Pending";
    if (selectedStudent.totalFee == null) return "Fee Not Set";

    const monthsToCheck = formData.academicSession === getCurrentAcademicSession()
      ? getCurrentAcademicMonth()
      : 12;

    const firstApplicableMonth = getFirstApplicableAcademicMonth(
      selectedStudent.admissionDate,
      formData.academicSession
    );

    if (firstApplicableMonth === null || firstApplicableMonth > monthsToCheck) {
      return "No Tuition Due";
    }

    const dueMonths = Array.from(
      { length: Math.max(0, monthsToCheck - firstApplicableMonth + 1) },
      (_, index) => firstApplicableMonth + index
    );
    const paidCount = dueMonths.filter((monthNumber) =>
      getMonthPaid(
        selectedStudent.studentId,
        formData.academicSession,
        monthNumber,
        editingId
      ) > 0
    ).length;

    if (paidCount === dueMonths.length) return "Paid";
    return paidCount > 0 ? "Partial" : "Pending";
  }, [selectedStudent, formData.academicSession, getMonthPaid, editingId]);

  const additionalChargesTotal = useMemo(
    () => formData.extraCharges.reduce(
      (sum, charge) => sum + Math.max(0, Number(charge.amount) || 0),
      0
    ),
    [formData.extraCharges]
  );

  const payableAmount = selectedMonthsDue + additionalChargesTotal;

  // Keep Amount Paid synchronized with the calculated payable amount.
  // The user only needs to review the total and click Save Payment.
  useEffect(() => {
    setFormData((previous) => {
      const nextAmount = payableAmount > 0 ? payableAmount.toFixed(2) : "";
      return previous.amount === nextAmount
        ? previous
        : { ...previous, amount: nextAmount };
    });
  }, [payableAmount]);

  const loadStudents = useCallback(async (session = DEFAULT_SESSION) => {
    const result = await requestApi(
      `/payment-students?academic_session=${encodeURIComponent(session)}`
    );
    setStudents(getRecords(result).map(mapStudent));
  }, []);

  const loadPayments = useCallback(async (session) => {
    const suffix = session ? `?academic_session=${encodeURIComponent(session)}` : "";
    const result = await requestApi(`/payments${suffix}`);
    setPayments(getRecords(result).map(mapPayment));
  }, []);

  const loadData = useCallback(async (session = formData.academicSession) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const results = await Promise.allSettled([
        loadStudents(session),
        loadPayments(session),
      ]);
      const errors = results
        .filter((item) => item.status === "rejected")
        .map((item) => item.reason?.message || "Unable to load payment data.");
      if (errors.length) setErrorMessage(errors.join(" "));
    } finally {
      setLoading(false);
    }
  }, [formData.academicSession, loadStudents, loadPayments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (eventOrName, possibleValue) => {
    const name = typeof eventOrName === "string" ? eventOrName : eventOrName.target.name;
    const value = typeof eventOrName === "string" ? possibleValue : eventOrName.target.value;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleMonthChange = (monthNumber, checked) => {
    if (isFutureMonth(monthNumber)) return;
    if (checked && getMonthPending(monthNumber) <= 0) return;

    setFormData((previous) => ({
      ...previous,
      feeMonths: checked
        ? [...new Set([...previous.feeMonths, Number(monthNumber)])]
        : previous.feeMonths.filter((number) => number !== Number(monthNumber)),
    }));
    setErrorMessage("");
  };

  const addExtraCharge = () => {
    setFormData((previous) => ({
      ...previous,
      extraCharges: [
        ...previous.extraCharges,
        { id: `${Date.now()}-${previous.extraCharges.length}`, chargeName: "", amount: "" },
      ],
    }));
  };

  const handleExtraChargeChange = (id, field, value) => {
    setFormData((previous) => ({
      ...previous,
      extraCharges: previous.extraCharges.map((charge) =>
        charge.id === id ? { ...charge, [field]: value } : charge
      ),
    }));
  };

  const removeExtraCharge = (id) => {
    setFormData((previous) => ({
      ...previous,
      extraCharges: previous.extraCharges.filter((charge) => charge.id !== id),
    }));
  };

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setAdmissionSearch("");
    setSelectedClass("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedStudent) {
      setErrorMessage("Please search for and select a student.");
      return;
    }
    if (!Number.isInteger(selectedStudent.studentDatabaseId) || selectedStudent.studentDatabaseId <= 0) {
      setErrorMessage("The selected student has an invalid database ID.");
      return;
    }
    if (selectedStudent.totalFee == null) {
      setErrorMessage("No fee structure is configured for this student and academic session.");
      return;
    }
    if (!formData.feeMonths.length && !formData.extraCharges.some((charge) => Number(charge.amount) > 0)) {
      setErrorMessage("Select at least one unpaid tuition month or add an additional charge.");
      return;
    }

    const invalidCharge = formData.extraCharges.find((charge) => {
      const amount = Number(charge.amount);
      return !charge.chargeName.trim() || charge.amount === "" || !Number.isFinite(amount) || amount < 0;
    });
    if (invalidCharge) {
      setErrorMessage("Enter a name and valid amount for each additional charge, or remove the empty charge.");
      return;
    }

    const amount = Number(formData.amount);
    if (formData.amount === "" || !Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Enter a payment amount greater than zero.");
      return;
    }
    if (!PAYMENT_MODES.includes(formData.paymentMode)) {
      setErrorMessage("Please select a valid payment mode.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.paymentDate) ||
        Number.isNaN(new Date(`${formData.paymentDate}T00:00:00`).getTime())) {
      setErrorMessage("Please select a valid payment date.");
      return;
    }

    const expectedAmount = Number(payableAmount.toFixed(2));
    if (Math.abs(amount - expectedAmount) > 0.009) {
      setErrorMessage(`Amount Paid must equal Total Payable (₹${expectedAmount.toFixed(2)}).`);
      return;
    }

    const payload = {
      student_id: selectedStudent.studentDatabaseId,
      academic_session: formData.academicSession,
      payment_date: formData.paymentDate,
      amount_paid: amount,
      payment_mode: formData.paymentMode,
      fee_months: formData.feeMonths.map(Number),
      extra_charges: formData.extraCharges
        .filter((charge) => Number(charge.amount) > 0)
        .map((charge) => ({
          charge_name: charge.chargeName.trim(),
          amount: Number(charge.amount),
        })),
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        await requestApi(`/payments/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMessage("Payment updated successfully.");
      } else {
        await requestApi("/payments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage("Payment saved successfully.");
      }
      resetForm();
      await loadData(DEFAULT_SESSION);
    } catch (err) {
      setErrorMessage(err.message || "Unable to save the payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (payment) => {
    setFormData({
      ...createEmptyForm(),
      studentId: payment.studentId,
      academicSession: payment.academicSession,
      paymentDate: payment.paymentDate || getLocalDate(),
      amount: String(payment.amount),
      paymentMode: payment.paymentMode,
      feeMonths: [...(payment.feeMonths || [])],
      extraCharges: (payment.extraCharges || []).map((charge, index) => ({
        id: charge.id ?? `edit-${payment.id}-${index}`,
        chargeName: charge.chargeName,
        amount: String(charge.amount),
      })),
    });
    setEditingId(payment.id);
    setAdmissionSearch(payment.studentId);
    setSelectedClass("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (id) => {
    if (deletingId !== null) return;
    if (!window.confirm("Are you sure you want to delete this payment?")) return;

    setDeletingId(id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await requestApi(`/payments/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      setSuccessMessage("Payment deleted successfully.");
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || "Unable to delete payment.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPayments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return payments.filter((payment) =>
      payment.studentName.toLowerCase().includes(search) ||
      payment.studentId.toLowerCase().includes(search) ||
      payment.paymentMode.toLowerCase().includes(search) ||
      payment.receiptNumber.toLowerCase().includes(search)
    );
  }, [payments, searchTerm]);

  const getPaymentSummary = (studentId, academicSession) => {
    const student = students.find((item) =>
      item.studentId === String(studentId) && item.academicSession === academicSession
    );
    if (!student || student.totalFee == null) {
      return { totalFee: 0, totalPaid: 0, pendingAmount: 0, feeStatus: "Fee Not Set" };
    }

    const firstApplicableMonth = getFirstApplicableAcademicMonth(
      student.admissionDate,
      academicSession
    );
    const monthsToCheck = academicSession === getCurrentAcademicSession()
      ? getCurrentAcademicMonth()
      : 12;

    if (firstApplicableMonth === null || firstApplicableMonth > monthsToCheck) {
      return {
        totalFee: 0,
        totalPaid: 0,
        pendingAmount: 0,
        feeStatus: "No Tuition Due",
      };
    }

    const dueMonthCount = monthsToCheck - firstApplicableMonth + 1;
    const totalFeeDue = dueMonthCount * student.monthlyTuitionFee;
    const paid = getStudentTuitionPaid(studentId, academicSession);
    const pending = Math.max(0, totalFeeDue - paid);

    return {
      totalFee: totalFeeDue,
      totalPaid: paid,
      pendingAmount: pending,
      feeStatus: pending === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending",
    };
  };

  return {
    students,
    payments,
    formData,
    editingId,
    searchTerm,
    selectedStudent,
    totalPaid,
    pendingAmount,
    feeStatus,
    filteredPayments,
    loading,
    saving,
    deletingId,
    errorMessage,
    successMessage,
    months: MONTHS,
    paymentModes: PAYMENT_MODES,
    filteredStudents,
    classes,
    admissionSearch,
    selectedClass,
    setAdmissionSearch,
    setSelectedClass,
    setSearchTerm,
    selectedMonthsDue,
    additionalChargesTotal,
    payableAmount,
    handleChange,
    handleMonthChange,
    getMonthPending,
    isFutureMonth,
    isBeforeAdmissionMonth,
    addExtraCharge,
    handleExtraChargeChange,
    removeExtraCharge,
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    getPaymentSummary,
    loadData,
  };
}

export default useFeePayment;
