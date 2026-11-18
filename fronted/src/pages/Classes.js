import {
  useCallback,
  useEffect,
  useState,
} from "react";

// Use the configured backend URL.
// VITE_API_URL is set in the frontend deployment environment.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`
).replace(/\/$/, "");

// Send requests to the existing backend.
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
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Please check your internet connection or try again later."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Authentication failed. Please log in again using your existing login."
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed with status ${response.status}.`
    );
  }

  return result;
}

// Convert database field names to the names used by the Classes UI.
function normalizeClass(record) {
  return {
    id: Number(record.id),
    name: record.class_name || "",
    teacher: record.class_teacher || "",
    section: record.section || "",
    students: Array.isArray(record.students)
      ? record.students
      : [],
  };
}

function useClasses() {
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const [className, setClassName] = useState("");
  const [classTeacher, setClassTeacher] = useState("");
  const [section, setSection] = useState("A");

  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Load classes from the database through the existing API.
  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await requestApi("/classes");
      const records = Array.isArray(result.data) ? result.data : [];

      setClasses(records.map(normalizeClass));
    } catch (err) {
      setError(err.message || "Unable to load classes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const resetForm = () => {
    setEditingClass(null);
    setClassName("");
    setClassTeacher("");
    setSection("A");
  };

  const handleAddClass = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setClassName(classItem.name);
    setClassTeacher(classItem.teacher);
    setSection(classItem.section || "A");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;

    setShowModal(false);
    resetForm();
  };

  // Save a new class or update an existing database record.
  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = className.trim();
    const teacher = classTeacher.trim();
    const classSection = section.trim();

    if (!name || !teacher || !classSection) {
      alert("Please enter the class name, class teacher, and section.");
      return;
    }

    if (name.length > 50 || classSection.length > 10 || teacher.length > 100) {
      alert("Please check the maximum allowed length of each field.");
      return;
    }

    const duplicate = classes.some(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() &&
        item.section.toLowerCase() === classSection.toLowerCase() &&
        item.id !== editingClass?.id
    );

    if (duplicate) {
      alert("This class and section already exist.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        class_name: name,
        section: classSection,
        class_teacher: teacher,
      };

      if (editingClass) {
        await requestApi(`/classes/${editingClass.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await requestApi("/classes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      resetForm();

      await loadClasses();

      if (selectedClass && editingClass?.id === selectedClass.id) {
        const result = await requestApi("/classes");
        const records = Array.isArray(result.data) ? result.data : [];

        const updated = records
          .map(normalizeClass)
          .find((item) => item.id === editingClass.id);

        if (updated) setSelectedClass(updated);
      }
    } catch (err) {
      alert(err.message || "Unable to save the class.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewClass = (classItem) => {
    setSelectedClass(classItem);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setSelectedClass(null);
    setShowViewModal(false);
  };

  const handleDeleteClass = (classItem) => {
    setDeletingClass(classItem);
  };

  const handleCloseDelete = () => {
    if (!isDeleting) setDeletingClass(null);
  };

  // Delete the record through the backend, then reload the list.
  const handleConfirmDelete = async () => {
    if (!deletingClass) return;

    setIsDeleting(true);
    setError("");

    try {
      await requestApi(`/classes/${deletingClass.id}`, {
        method: "DELETE",
      });

      if (selectedClass?.id === deletingClass.id) {
        handleCloseViewModal();
      }

      setDeletingClass(null);
      await loadClasses();
    } catch (err) {
      alert(err.message || "Unable to delete the class.");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    classes,

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

    loadClasses,
    handleAddClass,
    handleEditClass,
    handleCloseModal,
    handleSubmit,

    handleViewClass,
    handleCloseViewModal,

    handleDeleteClass,
    handleCloseDelete,
    handleConfirmDelete,
  };
}

export { useClasses };
