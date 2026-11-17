
import useFeeStructureHook from "./FeeStructure.js";
import styles from "./FeeStructure.module.css";

function FeeStructure() {
  const {
    feeStructures,
    classes,
    formData,
    editingId,
    academicSession,
    validSession,
    loading,
    saving,
    deletingId,
    error,
    successMessage,
    handleChange,
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
  } = useFeeStructureHook();

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  return (
    <div className={styles.feePage}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Fee Structure</h1>
          <p>Set and manage monthly tuition fees for each class.</p>
        </div>
      </div>

      <section className={styles.formCard}>
        <h2>
          {editingId !== null ? "Edit Fee Structure" : "Add Fee Structure"}
        </h2>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className={styles.successMessage} role="status">
            {successMessage}
          </div>
        )}

        {!validSession && (
          <div className={styles.warningMessage} role="status">
            Please open School Profile, enter a valid academic session such
            as 2026-2027, and save the profile before adding a fee structure.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="classId">Class</label>

              <select
                id="classId"
                name="classId"
                value={formData.classId}
                onChange={handleChange}
                required
                disabled={loading || saving || classes.length === 0}
              >
                <option value="">Select Class</option>

                {classes.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.class_name}
                    {item.section ? ` - Section ${item.section}` : ""}
                  </option>
                ))}
              </select>

              {!loading && classes.length === 0 && (
                <small className={styles.helpText}>
                  No classes found. Add a class in the Classes module first.
                </small>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="academicSession">Academic Session</label>

              <input
                id="academicSession"
                type="text"
                value={academicSession}
                placeholder="Set session in School Profile"
                readOnly
                aria-readonly="true"
              />

            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tuitionFee">Monthly Tuition Fee (₹)</label>

              <input
                id="tuitionFee"
                type="number"
                name="tuitionFee"
                min="0"
                step="0.01"
                value={formData.tuitionFee}
                onChange={handleChange}
                placeholder="Enter monthly tuition fee"
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={
                loading ||
                saving ||
                classes.length === 0 ||
                !validSession
              }
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Update Fee Structure"
                  : "Save Fee Structure"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className={styles.cancelButton}
                onClick={resetForm}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Fee Structure List</h2>
            <p>Monthly tuition fees configured for each academic session.</p>
          </div>

          <span className={styles.countBadge}>
            {feeStructures.length} Records
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.feeTable}>
            <thead>
              <tr>
                <th>Class</th>
                <th>Academic Session</th>
                <th>Monthly Tuition Fee</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={styles.emptyMessage}>
                    Loading fee structures...
                  </td>
                </tr>
              ) : feeStructures.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyMessage}>
                    No fee structures found. Add your first fee structure
                    above.
                  </td>
                </tr>
              ) : (
                feeStructures.map((structure) => (
                  <tr key={structure.id}>
                    <td className={styles.classNameCell}>
                      {structure.className}
                    </td>

                    <td>{structure.academicSession}</td>

                    <td className={styles.amountCell}>
                      {formatCurrency(structure.tuitionFee)}
                    </td>

                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => handleEdit(structure)}
                          disabled={
                            saving || deletingId === structure.id
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDelete(structure.id)}
                          disabled={
                            saving || deletingId === structure.id
                          }
                        >
                          {deletingId === structure.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default FeeStructure;
