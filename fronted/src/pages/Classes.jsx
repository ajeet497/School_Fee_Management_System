
import { useClasses } from "./Classes.js";
import styles from "./Classes.module.css";

function Classes() {
  const {
    classes = [],
    showModal,
    showViewModal,
    editingClass,
    deletingClass,
    selectedClass,
    className,
    classTeacher,
    section,
    isLoading,
    isSaving,
    isDeleting,
    error,
    setClassName,
    setClassTeacher,
    setSection,
    handleAddClass,
    handleEditClass,
    handleCloseModal,
    handleSubmit,
    handleViewClass,
    handleCloseViewModal,
    handleDeleteClass,
    handleCloseDelete,
    handleConfirmDelete,
  } = useClasses();

  const getStudentCount = (item) => {
    if (item.studentCount != null) {
      return Number(item.studentCount) || 0;
    }

    if (item.student_count != null) {
      return Number(item.student_count) || 0;
    }

    return Array.isArray(item.students) ? item.students.length : 0;
  };

  const getStudentNames = (item) => {
    const students = item?.students;

    if (!Array.isArray(students)) return [];

    return students
      .map((student) =>
        typeof student === "string"
          ? student
          : student?.student_name || student?.name || ""
      )
      .filter(Boolean);
  };

  return (
    <div className={styles.page}>
      {/* PAGE HEADER */}
      <header className={styles.pageHeader}>
        <div>
          <h1>Classes</h1>
          <p>Manage classes and assign class teachers.</p>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddClass}
        >
          + Add Class
        </button>
      </header>

      {/* CLASS LIST CARD */}
      <section className={styles.classList}>
        <div className={styles.listHeader}>
          <div>
            <h2>Class List</h2>
            <p>View and manage all classes.</p>
          </div>

          <span className={styles.classCount}>
            {classes.length}{" "}
            {classes.length === 1 ? "Class" : "Classes"}
          </span>
        </div>

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>Loading classes...</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Class Teacher</th>
                  <th>Section</th>
                  <th>Students</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {classes.length > 0 ? (
                  classes.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.className}>
                        {item.name || item.class_name}
                      </td>

                      <td>
                        {item.teacher || item.class_teacher || "Not assigned"}
                      </td>

                      <td>
                        <span className={styles.sectionBadge}>
                          {item.section || "A"}
                        </span>
                      </td>

                      <td>
                        <span className={styles.studentCount}>
                          {getStudentCount(item)}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.viewButton}
                            onClick={() => handleViewClass(item)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => handleEditClass(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDeleteClass(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={styles.noClasses}>
                      No classes found. Click Add Class to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ADD / EDIT CLASS MODAL */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-form-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="class-form-title">
                  {editingClass ? "Edit Class" : "Add New Class"}
                </h2>
                <p>Enter the class information below.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseModal}
                disabled={isSaving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="class-name">Class Name</label>
                <input
                  id="class-name"
                  type="text"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  placeholder="e.g. Class 1"
                  maxLength={50}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="class-teacher">Class Teacher</label>
                <input
                  id="class-teacher"
                  type="text"
                  value={classTeacher}
                  onChange={(event) => setClassTeacher(event.target.value)}
                  placeholder="Enter teacher's name"
                  maxLength={100}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="class-section">Section</label>
                <input
                  id="class-section"
                  type="text"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  placeholder="e.g. A"
                  maxLength={10}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingClass
                      ? "Update Class"
                      : "Add Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CLASS MODAL */}
      {showViewModal && selectedClass && (
        <div
          className={styles.modalOverlay}
          onClick={handleCloseViewModal}
        >
          <div
            className={styles.viewModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-class-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="view-class-title">Class Details</h2>
                <p>View class and student information.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseViewModal}
                aria-label="Close class details"
              >
                ×
              </button>
            </div>

            <div className={styles.viewContent}>
              <div className={styles.classInfoGrid}>
                <div className={styles.infoBox}>
                  <span>Class</span>
                  <strong>{selectedClass.name || selectedClass.class_name}</strong>
                </div>

                <div className={styles.infoBox}>
                  <span>Section</span>
                  <strong>{selectedClass.section || "A"}</strong>
                </div>

                <div className={styles.infoBox}>
                  <span>Total Students</span>
                  <strong>{getStudentCount(selectedClass)}</strong>
                </div>
              </div>

              <div className={styles.infoBox}>
                <span>Class Teacher</span>
                <strong>
                  {selectedClass.teacher ||
                    selectedClass.class_teacher ||
                    "Not assigned"}
                </strong>
              </div>

              <div className={styles.studentSection}>
                <div className={styles.studentSectionHeader}>
                  <div>
                    <h3>Student List</h3>
                    <p>
                      {getStudentCount(selectedClass)} students in this class
                    </p>
                  </div>
                </div>

                <div className={styles.studentList}>
                  {getStudentNames(selectedClass).length > 0 ? (
                    getStudentNames(selectedClass).map((name, index) => (
                      <div
                        key={`${name}-${index}`}
                        className={styles.studentItem}
                      >
                        <span className={styles.studentNumber}>
                          {index + 1}
                        </span>
                        <span>{name}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noStudents}>
                      <div className={styles.noStudentsIcon}>👨‍🎓</div>
                      <p>No student names are available for this class.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.viewFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCloseViewModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingClass && (
        <div
          className={styles.modalOverlay}
          onClick={handleCloseDelete}
        >
          <div
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-class-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.deleteIcon}>⚠️</div>

            <h2 id="delete-class-title">Delete Class?</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>{deletingClass.name}</strong>?
            </p>

            <p className={styles.warningText}>
              Classes with related records may not be deletable.
            </p>

            <div className={styles.deleteActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCloseDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classes;
