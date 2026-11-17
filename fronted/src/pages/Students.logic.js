import { useEffect, useRef, useState } from "react";

import {
  getStudents,
  addStudent,
  updateStudent,
  resetStudentPassword,
  deleteStudent,
  getStudentPhotoUrl,
} from "../services/studentApi";

const API_BASE_URL = "http://localhost:5000/api";

const emptyForm = {
  id: "",
  name: "",
  fatherName: "",
  motherName: "",
  dateOfBirth: "",
  gender: "",
  className: "",
  admissionDate: "",
  phone: "",
  address: "",
  password: "",
  photo: null,
};

function formatDateForInput(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function mapStudentFromDatabase(student) {
  return {
    ...student,
    databaseId: student.id,
    id: String(student.admission_number ?? ""),
    name: student.student_name,
    fatherName: student.father_name || "",
    motherName: student.mother_name || "",
    dateOfBirth: formatDateForInput(student.date_of_birth),
    gender: student.gender || "",
    classId: student.class_id,
    className:
      student.class_name +
      (student.section ? ` - ${student.section}` : ""),
    admissionDate: formatDateForInput(student.admission_date),
    phone: student.phone || "",
    address: student.address || "",
    photoPath: student.photo || null,
    photo: null,
  };
}

function useStudentsLogic() {
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [photoSources, setPhotoSources] = useState({});
  const photoUrlsRef = useRef(new Set());

  // Download protected student photos with the admin token.
  const loadStudentPhotos = async (studentRows) => {
    const entries = await Promise.all(
      studentRows.map(async (student) => {
        if (!student.photoPath || !student.databaseId) return null;

        try {
          const token = sessionStorage.getItem("adminToken");
          if (!token) throw new Error("Admin token is missing.");

          const response = await fetch(getStudentPhotoUrl(student.databaseId), {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            throw new Error(`Photo request failed (${response.status}).`);
          }

          const blob = await response.blob();
          if (!blob.type.startsWith("image/")) {
            throw new Error("Photo response is not an image.");
          }

          const objectUrl = URL.createObjectURL(blob);
          photoUrlsRef.current.add(objectUrl);
          return [student.databaseId, objectUrl];
        } catch (error) {
          console.warn(
            `Unable to load photo for student ${student.databaseId}:`,
            error.message
          );
          return null;
        }
      })
    );

    setPhotoSources(Object.fromEntries(entries.filter(Boolean)));
    return studentRows;
  };

  useEffect(
    () => () => {
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrlsRef.current.clear();
    },
    []
  );

  // LOAD STUDENTS AND CLASSES
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);

      try {
        const [studentData, classResponse] = await Promise.all([
          getStudents(),
          fetch(`${API_BASE_URL}/classes`, {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("adminToken")}`,
            },
          }),
        ]);

        if (!classResponse.ok) {
          throw new Error("Unable to load classes from the database.");
        }

        const classResult = await classResponse.json();

        if (!classResult.success) {
          throw new Error(
            classResult.message || "Unable to load classes."
          );
        }

        if (!active) return;

        setClasses(classResult.data || []);
        const mappedStudents = (studentData || []).map(mapStudentFromDatabase);
        const studentsWithPhotos = await loadStudentPhotos(mappedStudents);

        if (!active) return;
        setStudents(studentsWithPhotos);
      } catch (error) {
        console.error("Error loading students:", error.message);

        if (active) {
          alert(
            "Unable to load students or classes. Please check that the backend is running."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  // FORM INPUT
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // PHOTO
  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      alert("Student photo must not exceed 2 MB.");
      event.target.value = "";
      return;
    }

    setFormData((previous) => ({
      ...previous,
      photo: file,
    }));
  };

  // RESET FORM
  const resetForm = () => {
    setFormData({ ...emptyForm });
    setIsEditing(false);
    setEditingStudentId(null);
  };

  // OPEN AND CLOSE MODALS
  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleViewStudent = (student) => setSelectedStudent(student);
  const closeViewModal = () => setSelectedStudent(null);

  // ADD OR UPDATE STUDENT
  const handleSubmitStudent = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (
      !formData.name.trim() ||
      !formData.gender ||
      !formData.className ||
      !formData.admissionDate
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (!isEditing) {
      if (!formData.password || formData.password.length < 8) {
        alert("Please create an initial password with at least 8 characters.");
        return;
      }

      if (new TextEncoder().encode(formData.password).length > 72) {
        alert("Password must not exceed 72 UTF-8 bytes.");
        return;
      }
    }

    const selectedClassRecord = classes.find(
      (item) =>
        `${item.class_name}${
          item.section ? ` - ${item.section}` : ""
        }` === formData.className ||
        item.class_name === formData.className
    );

    if (!selectedClassRecord) {
      alert("Please select a valid class from the available classes.");
      return;
    }

    const studentData = {
      student_name: formData.name.trim(),
      father_name: formData.fatherName.trim(),
      mother_name: formData.motherName.trim(),
      date_of_birth: formData.dateOfBirth || null,
      gender: formData.gender,
      phone: formData.phone || "",
      address: formData.address || "",
      class_id: Number(selectedClassRecord.id),
      admission_date: formData.admissionDate,
    };

    if (!isEditing) {
      studentData.password = formData.password;
    }

    setSaving(true);

    try {
      if (isEditing) {
        studentData.admission_number = formData.id.trim();
        await updateStudent(editingStudentId, studentData, formData.photo);
      } else {
        await addStudent(studentData, formData.photo);
      }

      const refreshedStudents = await getStudents();
      const mappedStudents = (refreshedStudents || []).map(mapStudentFromDatabase);
      const studentsWithPhotos = await loadStudentPhotos(mappedStudents);
      setStudents(studentsWithPhotos);

      closeModal();
      alert(
        isEditing
          ? "Student updated successfully!"
          : "Student added successfully!"
      );
    } catch (error) {
      console.error("Error saving student:", error.message);
      alert(error.message || "Unable to save student.");
    } finally {
      setSaving(false);
    }
  };

  // SEARCH AND CLASS FILTER
  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      (student.name || "").toLowerCase().includes(search) ||
      (student.id || "").toLowerCase().includes(search);

    const matchesClass =
      selectedClass === "" || student.className === selectedClass;

    return matchesSearch && matchesClass;
  });

  const clearSearch = () => setSearchTerm("");

  const clearFilter = () => {
    setSearchTerm("");
    setSelectedClass("");
  };

  // EDIT STUDENT
  const handleEditStudent = (student) => {
    setIsEditing(true);
    setEditingStudentId(student.databaseId);

    setFormData({
      ...emptyForm,
      id: student.id || "",
      name: student.name || "",
      fatherName: student.fatherName || "",
      motherName: student.motherName || "",
      dateOfBirth: formatDateForInput(student.dateOfBirth),
      gender: student.gender || "",
      className: student.className || "",
      admissionDate: formatDateForInput(student.admissionDate),
      phone: student.phone || "",
      address: student.address || "",
      photoPath: student.photoPath || null,
      photo: null,
      password: "",
    });

    setShowModal(true);
  };

  // ADMIN-ASSISTED STUDENT PASSWORD RESET
  const handleResetStudentPassword = async (student) => {
    if (!student?.databaseId) {
      alert("Unable to reset password: student database ID is missing.");
      return;
    }

    const newPassword = window.prompt(
      `Enter a new password for ${student.name} (minimum 8 characters):`
    );

    if (newPassword === null) return;

    if (newPassword.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (new TextEncoder().encode(newPassword).length > 72) {
      alert("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    const confirmation = window.prompt("Re-enter the new password to confirm:");

    if (confirmation === null) return;

    if (newPassword !== confirmation) {
      alert("The passwords do not match. Please try again.");
      return;
    }

    try {
      await resetStudentPassword(student.databaseId, newPassword);
      alert(`Password reset successfully for ${student.name}.`);
    } catch (error) {
      console.error("Error resetting student password:", error.message);
      alert(error.message || "Unable to reset student password.");
    }
  };

  // DELETE STUDENT
  const handleDeleteStudent = (student) => setStudentToDelete(student);

  const cancelDelete = () => {
    if (deleting) return;
    setStudentToDelete(null);
  };

  const confirmDelete = async () => {
    if (!studentToDelete || deleting) return;

    const student = studentToDelete;

    if (!student.databaseId) {
      alert("Unable to delete student: database ID is missing.");
      return;
    }

    setDeleting(true);

    try {
      await deleteStudent(student.databaseId);

      setStudents((previous) =>
        previous.filter((item) => item.databaseId !== student.databaseId)
      );

      if (selectedStudent?.databaseId === student.databaseId) {
        setSelectedStudent(null);
      }

      setStudentToDelete(null);
      alert("Student deleted successfully!");
    } catch (error) {
      console.error("Error deleting student:", error.message);
      alert(error.message || "Unable to delete student.");
    } finally {
      setDeleting(false);
    }
  };

  return {
    showModal,
    selectedStudent,
    searchTerm,
    selectedClass,
    formData,
    filteredStudents,
    photoSources,
    isEditing,
    studentToDelete,
    loading,
    saving,
    deleting,
    classes,

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
    handleResetStudentPassword,

    handleDeleteStudent,
    cancelDelete,
    confirmDelete,
  };
}

export default useStudentsLogic;
