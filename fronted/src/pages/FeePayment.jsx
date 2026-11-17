
import useFeePayment from "./FeePayment.js";
import styles from "./FeePayment.module.css";

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateString) => {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function FeePayment() {
  const {
    filteredStudents,
    classes,
    admissionSearch,
    setAdmissionSearch,
    selectedClass,
    setSelectedClass,
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
    errorMessage,
    successMessage,
    months,
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
    setSearchTerm,
  } = useFeePayment();

  const showStudentResults =
    admissionSearch.trim().length > 0 || selectedClass !== "";

  const handleStudentSearch = (value) => {
    setAdmissionSearch(value);
    handleChange("studentId", "");
  };

  const chooseStudent = (student) => {
    handleChange("studentId", student.studentId);
    setAdmissionSearch(student.studentId);
    setSelectedClass(student.className || "");
  };

  const clearStudentSelection = () => {
    handleChange("studentId", "");
    setAdmissionSearch("");
    setSelectedClass("");
  };

  return (
    <div className={styles.page}>
      {/* Page heading */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fee Payment</h1>
          <p className={styles.pageSubtitle}>
            Search students, calculate outstanding fees, and record payments.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className={styles.errorMessage} role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage} role="status">
          {successMessage}
        </div>
      )}

      {/* Payment form */}
      <section className={styles.formCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              {editingId ? "Edit Payment" : "Record New Payment"}
            </h2>
            <p className={styles.cardSubtitle}>
              Find a student by admission number or class.
            </p>
          </div>

          {editingId && (
            <span className={styles.editBadge}>Editing payment</span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Student search */}
          <section className={styles.studentSearchPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <h3>Find Student</h3>
                <p>
                  Student details and fee balances will load from saved records.
                </p>
              </div>
            </div>

            <div className={styles.studentSearchGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="admissionSearch">
                  Search by Admission Number
                </label>

                <input
                  id="admissionSearch"
                  type="search"
                  value={admissionSearch}
                  onChange={(event) =>
                    handleStudentSearch(event.target.value)
                  }
                  placeholder="Enter admission number..."
                  autoComplete="off"
                  disabled={saving || loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="studentClassFilter">Filter by Class</label>

                <select
                  id="studentClassFilter"
                  value={selectedClass}
                  onChange={(event) => {
                    setSelectedClass(event.target.value);
                    handleChange("studentId", "");
                  }}
                  disabled={saving || loading}
                >
                  <option value="">All Classes</option>

                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search results */}
            {showStudentResults && !selectedStudent && (
              <div className={styles.studentSearchResults}>
                {loading ? (
                  <p className={styles.helperText}>
                    Loading student records...
                  </p>
                ) : filteredStudents.length === 0 ? (
                  <p className={styles.helperText}>
                    No students found. Check the admission number or class.
                  </p>
                ) : (
                  <>
                    <p className={styles.resultCount}>
                      {filteredStudents.length} matching student
                      {filteredStudents.length !== 1 ? "s" : ""}
                      {filteredStudents.length > 10
                        ? " — showing the first 10"
                        : ""}
                    </p>

                    {filteredStudents.slice(0, 10).map((student) => (
                      <button
                        key={`${student.studentDatabaseId}-${student.academicSession}`}
                        type="button"
                        className={styles.studentSearchResult}
                        onClick={() => chooseStudent(student)}
                        disabled={saving}
                      >
                        <span className={styles.resultStudentName}>
                          {student.name || "Unnamed student"}
                        </span>

                        <span className={styles.resultStudentDetails}>
                          Admission No: {student.studentId || "—"}
                          {" · "}
                          {student.className || "Class not assigned"}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Selected student */}
            {selectedStudent && (
              <div className={styles.selectedStudentBanner}>
                <div>
                  <strong>{selectedStudent.name || "Unnamed student"}</strong>
                  <span>
                    Admission No: {selectedStudent.studentId || "—"}
                    {" · "}
                    {selectedStudent.className || "Class not assigned"}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={clearStudentSelection}
                  disabled={saving}
                >
                  Change Student
                </button>
              </div>
            )}

            {!showStudentResults && !selectedStudent && (
              <p className={styles.helperText}>
                Enter an admission number or choose a class to find a student.
                The full student list will not be displayed by default.
              </p>
            )}
          </section>

          {/* Session, date, and payment mode */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="academicSession">
                Academic Session{" "}
                <span className={styles.required}>*</span>
              </label>

              <select
                id="academicSession"
                name="academicSession"
                value={formData.academicSession}
                onChange={(event) => {
                  handleChange(event);
                  setAdmissionSearch("");
                  setSelectedClass("");
                }}
                required
                disabled={saving}
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="paymentDate">
                Payment Date <span className={styles.required}>*</span>
              </label>

              <input
                id="paymentDate"
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
                disabled={saving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="paymentMode">
                Payment Mode <span className={styles.required}>*</span>
              </label>

              <select
                id="paymentMode"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
                required
                disabled={saving}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Automatically populated student information */}
          {selectedStudent && (
            <>
              <div className={styles.studentSummary}>
                <div className={styles.summaryHeading}>
                  <h3>Student Fee Details</h3>
                </div>

                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span>Student Name</span>
                    <strong>{selectedStudent.name || "—"}</strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Admission Number</span>
                    <strong>{selectedStudent.studentId || "—"}</strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Class</span>
                    <strong>{selectedStudent.className || "—"}</strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Monthly Tuition Fee</span>
                    <strong>
                      {formatCurrency(selectedStudent.monthlyTuitionFee)}
                    </strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Fee Paid This Season</span>
                    <strong>{formatCurrency(totalPaid)}</strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Fee Status</span>
                    <strong>{feeStatus}</strong>
                  </div>
                </div>
              </div>

              {/* Tuition month selection */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h3>Select Tuition Months</h3>
                    <p>
                      Choose the months covered by this payment. Previously
                      unpaid months remain due until paid.
                    </p>
                  </div>
                </div>

                <div className={styles.monthGrid}>
                  {months.map((month) => {
                    const pending = getMonthPending(month.value);

                    const isSelected = formData.feeMonths.includes(
                      month.value
                    );

                    // A missing fee structure must never be treated as Paid.
                    const feeNotSet = selectedStudent.totalFee == null;

                    const beforeAdmission = isBeforeAdmissionMonth(
                      month.value
                    );

                    const future = isFutureMonth(month.value);

                    const paid =
                      !feeNotSet &&
                      pending <= 0 &&
                      !beforeAdmission &&
                      !future;

                    return (
                      <label
                        key={month.value}
                        className={`${styles.monthOption} ${
                          isSelected ? styles.monthSelected : ""
                        } ${
                          paid ? styles.monthPaid : ""
                        } ${
                          future || beforeAdmission
                            ? styles.monthFuture
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            handleMonthChange(
                              month.value,
                              event.target.checked
                            )
                          }
                          disabled={
                            saving ||
                            feeNotSet ||
                            pending <= 0 ||
                            future ||
                            beforeAdmission
                          }
                        />

                        <span className={styles.monthInfo}>
                          <strong>{month.label}</strong>

                          <small>
                            {beforeAdmission
                              ? "Before admission"
                              : future
                                ? "Future month"
                                : feeNotSet
                                  ? "Fee Not Set"
                                  : paid
                                    ? "Paid"
                                    : `${formatCurrency(pending)} due`}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional charges */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h3>Additional Charges</h3>
                    <p>
                      Optional charges such as books or computer fees. These
                      are separate from annual tuition.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={addExtraCharge}
                    disabled={saving}
                  >
                    + Add Charge
                  </button>
                </div>

                {formData.extraCharges.length === 0 ? (
                  <p className={styles.helperText}>
                    No additional charges added.
                  </p>
                ) : (
                  <div className={styles.chargeList}>
                    {formData.extraCharges.map((charge, index) => (
                      <div
                        className={styles.chargeRow}
                        key={`charge-${index}`}
                      >
                        <div className={styles.formGroup}>
                          <label htmlFor={`chargeName-${index}`}>
                            Charge Name
                          </label>

                          <input
                            id={`chargeName-${index}`}
                            type="text"
                            value={charge.chargeName}
                            onChange={(event) =>
                              handleExtraChargeChange(
                                charge.id,
                                "chargeName",
                                event.target.value
                              )
                            }
                            placeholder="e.g. Book Fee"
                            disabled={saving}
                            required
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label htmlFor={`chargeAmount-${index}`}>
                            Amount (₹)
                          </label>

                          <input
                            id={`chargeAmount-${index}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={charge.amount}
                            onChange={(event) =>
                              handleExtraChargeChange(
                                charge.id,
                                "amount",
                                event.target.value
                              )
                            }
                            placeholder="Enter amount"
                            disabled={saving}
                            required
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeExtraCharge(charge.id)}
                          disabled={saving}
                          aria-label={`Remove charge ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automatic payable calculation */}
              <div className={styles.paymentSummary}>
                <div className={styles.paymentSummaryItem}>
                  <span>Selected Months' Tuition Due</span>
                  <strong>{formatCurrency(selectedMonthsDue)}</strong>
                </div>

                <div className={styles.paymentSummaryItem}>
                  <span>Additional Charges</span>
                  <strong>{formatCurrency(additionalChargesTotal)}</strong>
                </div>

                <div className={styles.paymentSummaryTotal}>
                  <span>Total Payable</span>
                  <strong>{formatCurrency(payableAmount)}</strong>
                </div>
              </div>

              <div className={styles.amountSection}>
                <div className={styles.formGroup}>
                  <label htmlFor="amount">
                    Amount Paid (₹){" "}
                    <span className={styles.required}>*</span>
                  </label>

                  <input
                    id="amount"
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    readOnly
                    placeholder="Calculated automatically"
                    required
                    disabled={saving}
                  />

                  <small className={styles.helperText}>
                    This amount is calculated automatically from the selected
                    tuition months and additional charges.
                  </small>
                </div>
              </div>
            </>
          )}

          {/* Form buttons */}
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving || loading || !selectedStudent}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Payment"
                  : "Save Payment"}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetForm}
              disabled={saving}
            >
              {editingId ? "Cancel Editing" : "Reset Form"}
            </button>
          </div>
        </form>
      </section>

      {/* Payment history */}
      <section className={styles.historyCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Payment History</h2>
            <p className={styles.cardSubtitle}>
              Review, search, edit, or delete recorded payments.
            </p>
          </div>

          <span className={styles.recordCount}>
            {filteredPayments.length} record
            {filteredPayments.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search student, admission number, class, or receipt..."
            aria-label="Search payment history"
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.paymentTable}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No.</th>
                <th>Class</th>
                <th>Session</th>
                <th>Payment Date</th>
                <th>Months</th>
                <th>Amount Paid</th>
                <th>Mode</th>
                <th>Receipt No.</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className={styles.tableMessage}>
                    Loading payment records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="10" className={styles.tableMessage}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const monthLabels = (payment.feeMonths || [])
                    .map(
                      (monthNumber) =>
                        months.find(
                          (month) => month.value === monthNumber
                        )?.label
                    )
                    .filter(Boolean);

                  return (
                    <tr key={payment.id}>
                      <td>
                        <strong>{payment.studentName || "—"}</strong>
                      </td>
                      <td>{payment.studentId || "—"}</td>
                      <td>{payment.className || "—"}</td>
                      <td>{payment.academicSession || "—"}</td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>
                        {monthLabels.length
                          ? monthLabels.join(", ")
                          : "—"}
                      </td>
                      <td className={styles.amountCell}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td>{payment.paymentMode || "—"}</td>
                      <td>{payment.receiptNumber || "—"}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => handleEdit(payment)}
                            disabled={saving}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDelete(payment.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default FeePayment;
