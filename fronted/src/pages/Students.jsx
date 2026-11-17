
import { useEffect, useMemo } from "react";
import styles from "./Students.module.css";
import useStudentsLogic from "./Students.logic";

function Students() {
  const {
    showModal,
    selectedStudent,
    searchTerm,
    selectedClass,
    formData,
    filteredStudents,
    isEditing,
    studentToDelete,
    deleting,
    classes,
    photoSources,
    setSearchTerm,
    setSelectedClass,
    openAddModal,
    closeModal,
    handleInputChange,
    handlePhotoChange,
    handleSubmitStudent,
    clearSearch,
    clearFilter,
    handleViewStudent,
    closeViewModal,
    handleEditStudent,
    handleDeleteStudent,
    handleResetStudentPassword,
    cancelDelete,
    confirmDelete,
  } = useStudentsLogic();

  const visibleStudents = useMemo(
    () => (Array.isArray(filteredStudents) ? filteredStudents : []),
    [filteredStudents]
  );

  const getClassLabel = (classItem) =>
    `${classItem.class_name}${
      classItem.section ? ` - ${classItem.section}` : ""
    }`;

  const getPhotoSource = (student) => {
    if (!student?.databaseId) return "";
    return photoSources?.[student.databaseId] || "";
  };

  const photoPreview = useMemo(() => {
    if (!(formData.photo instanceof File)) return "";
    return URL.createObjectURL(formData.photo);
  }, [formData.photo]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const getInitial = (name) =>
    name?.trim()?.charAt(0)?.toUpperCase() || "?";

  const getAdmissionNumber = (student) =>
    student?.admissionNumber ??
    student?.admission_number ??
    student?.id ??
    "";

  return (
    <div className={styles.page}>
      {/* PAGE HEADER */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Students</h1>
          <p>
            Manage student information, classes, admission dates
            and student records.
          </p>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={openAddModal}
        >
          + Add Student
        </button>
      </div>

      {/* STUDENT LIST */}
      <div className={styles.studentList}>
        <div className={styles.listHeader}>
          <div>
            <h2>Student List</h2>
            <p>View and manage all student records.</p>
          </div>

          <span className={styles.studentCount}>
            {visibleStudents.length}{" "}
            {visibleStudents.length === 1 ? "Student" : "Students"}
          </span>
        </div>

        {/* SEARCH AND FILTER */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <label
              className={styles.filterLabel}
              htmlFor="student-search"
            >
              Search Students
            </label>

            <div className={styles.searchBox}>
              <span className={styles.searchIcon} aria-hidden="true">
                🔍
              </span>

              <input
                id="student-search"
                type="search"
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className={styles.classFilterWrapper}>
            <label
              className={styles.filterLabel}
              htmlFor="student-class-filter"
            >
              Class
            </label>

            <select
              id="student-class-filter"
              className={styles.classFilter}
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
            >
              <option value="">All Classes</option>

              {classes.map((classItem) => {
                const classLabel = getClassLabel(classItem);

                return (
                  <option key={classItem.id} value={classLabel}>
                    {classLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            className={styles.clearFilterButton}
            onClick={clearFilter}
          >
            Clear Filter
          </button>
        </div>

        {(searchTerm || selectedClass) && (
          <p className={styles.filterResult}>
            Showing <strong>{visibleStudents.length}</strong>{" "}
            {visibleStudents.length === 1 ? "student" : "students"}
          </p>
        )}

        {/* STUDENT TABLE */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Admission Number</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Admission Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visibleStudents.length > 0 ? (
                visibleStudents.map((student) => {
                  const photoSource = getPhotoSource(student);

                  return (
                    <tr key={student.id}>
                      <td>
                        <span className={styles.studentId}>
                          {getAdmissionNumber(student)}
                        </span>
                      </td>

                      <td>
                        <div className={styles.studentName}>
                          <span className={styles.studentAvatar}>
                            {photoSource ? (
                              <img
                                src={photoSource}
                                alt={`${student.name}'s photo`}
                              />
                            ) : (
                              getInitial(student.name)
                            )}
                          </span>

                          <span>{student.name}</span>
                        </div>
                      </td>

                      <td>
                        <span className={styles.classBadge}>
                          {student.className}
                        </span>
                      </td>

                      <td>{student.admissionDate}</td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.viewButton}
                            onClick={() => handleViewStudent(student)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => handleEditStudent(student)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => handleResetStudentPassword(student)}
                          >
                            Reset Password
                          </button>

                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDeleteStudent(student)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className={styles.noResults}>
                    <div className={styles.noResultsContent}>
                      <div className={styles.noResultsIcon}>🔍</div>
                      <h3>No students found</h3>
                      <p>
                        Try changing your search or class filter.
                      </p>

                      <button
                        type="button"
                        className={styles.resetButton}
                        onClick={clearFilter}
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT STUDENT MODAL */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-form-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="student-form-title">
                  {isEditing ? "Edit Student" : "Add New Student"}
                </h2>

                <p>
                  {isEditing
                    ? "Update the student's information below."
                    : "Enter the student's information below."}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
                aria-label="Close student form"
              >
                ×
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={handleSubmitStudent}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="student-admission-number">
                    Admission Number
                  </label>

                  <input
                    id="student-admission-number"
                    type="text"
                    value={
                      isEditing
                        ? String(getAdmissionNumber(formData))
                        : "Assigned automatically"
                    }
                    readOnly
                  />

                  <small>
                    {isEditing
                      ? "The admission number cannot be changed."
                      : "Assigned automatically when the student is saved."}
                  </small>
                </div>

                {!isEditing && (
                  <div className={styles.formGroup}>
                    <label htmlFor="student-password">Initial Password</label>
                    <input
                      id="student-password"
                      type="password"
                      name="password"
                      placeholder="Create student login password"
                      value={formData.password || ""}
                      onChange={handleInputChange}
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <small>
                      The student will use this password with the School Code
                      and admission number to log in. Minimum 8 characters.
                    </small>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="student-name">Student Name</label>

                  <input
                    id="student-name"
                    type="text"
                    name="name"
                    placeholder="Enter student name"
                    value={formData.name || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-father-name">
                    Father's Name
                  </label>

                  <input
                    id="student-father-name"
                    type="text"
                    name="fatherName"
                    placeholder="Enter father's name"
                    value={formData.fatherName || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-mother-name">
                    Mother's Name
                  </label>

                  <input
                    id="student-mother-name"
                    type="text"
                    name="motherName"
                    placeholder="Enter mother's name"
                    value={formData.motherName || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-dob">Date of Birth</label>

                  <input
                    id="student-dob"
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-gender">Gender</label>

                  <select
                    id="student-gender"
                    name="gender"
                    value={formData.gender || ""}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-class">Class</label>

                  <select
                    id="student-class"
                    name="className"
                    value={formData.className || ""}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Class</option>

                    {classes.map((classItem) => {
                      const classLabel = getClassLabel(classItem);

                      return (
                        <option key={classItem.id} value={classLabel}>
                          {classLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-admission-date">
                    Admission Date
                  </label>

                  <input
                    id="student-admission-date"
                    type="date"
                    name="admissionDate"
                    value={formData.admissionDate || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* NEW: STUDENT MOBILE NUMBER */}
                <div className={styles.formGroup}>
                  <label htmlFor="student-phone">
                   Mobile Number
                  </label>

                  <input
                    id="student-phone"
                    type="tel"
                    name="phone"
                    placeholder="Enter student's mobile number"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    maxLength={15}
                  />

                  <small>
                    This number is saved as part of the student's contact details.
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="student-photo">Student Photo</label>

                  <input
                    id="student-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />

                  {photoPreview && (
                    <div className={styles.photoPreviewContainer}>
                      <img
                        className={styles.photoPreview}
                        src={photoPreview}
                        alt="Student preview"
                      />

                      <span>Photo selected</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={false}
                >
                  {isEditing ? "Update Student" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STUDENT MODAL */}
      {selectedStudent && (
        <div
          className={styles.modalOverlay}
          onClick={closeViewModal}
        >
          <div
            className={styles.detailsModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="student-details-title">Student Details</h2>
                <p>Complete information about the student.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeViewModal}
                aria-label="Close student details"
              >
                ×
              </button>
            </div>

            <div className={styles.studentDetails}>
              <div className={styles.studentPhoto}>
                {getPhotoSource(selectedStudent) ? (
                  <img
                    src={getPhotoSource(selectedStudent)}
                    alt={`${selectedStudent.name}'s photo`}
                  />
                ) : (
                  getInitial(selectedStudent.name)
                )}
              </div>

              <div className={styles.detailRow}>
                <span>Admission Number</span>
                <strong>{getAdmissionNumber(selectedStudent)}</strong>
              </div>

              <div className={styles.detailRow}>
                <span>Student Name</span>
                <strong>{selectedStudent.name}</strong>
              </div>

              <div className={styles.detailRow}>
                <span>Father's Name</span>
                <strong>
                  {selectedStudent.fatherName || "Not provided"}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Mother's Name</span>
                <strong>
                  {selectedStudent.motherName || "Not provided"}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Date of Birth</span>
                <strong>
                  {selectedStudent.dateOfBirth || "Not provided"}
                </strong>
              </div>

              <div className={styles.detailRow}>
                <span>Gender</span>
                <strong>{selectedStudent.gender || "Not provided"}</strong>
              </div>

              <div className={styles.detailRow}>
                <span>Class</span>
                <strong>{selectedStudent.className || "Not provided"}</strong>
              </div>

              <div className={styles.detailRow}>
                <span>Admission Date</span>
                <strong>
                  {selectedStudent.admissionDate || "Not provided"}
                </strong>
              </div>

              {/* NEW: DISPLAY MOBILE NUMBER */}
              <div className={styles.detailRow}>
                <span>Registered Mobile Number</span>
                <strong>
                  {selectedStudent.phone || "Not provided"}
                </strong>
              </div>
            </div>

            <div className={styles.detailsFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeViewModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {studentToDelete && (
        <div
          className={styles.modalOverlay}
          onClick={deleting ? undefined : cancelDelete}
        >
          <div
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-student-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.deleteIcon}>⚠️</div>

            <h2 id="delete-student-title">Delete Student?</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>{studentToDelete.name}</strong>?
            </p>

            <p className={styles.warningText}>
              This action cannot be undone.
            </p>

            <div className={styles.deleteActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={cancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;
