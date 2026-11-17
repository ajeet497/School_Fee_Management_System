
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:5000/api";
const PROFILE_STORAGE_KEY = "schoolManagementProfile";

const EMPTY_FORM = {
  classId: "",
  tuitionFee: "",
};

function formatClassName(className, section) {
  return section ? `${className} - Section ${section}` : className;
}

function getAcademicSession() {
  try {
    const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!savedProfile) return "";

    const profile = JSON.parse(savedProfile);
    const session = String(profile.academicSession || "").trim();

    return /^\d{4}-\d{4}$/.test(session) ? session : "";
  } catch {
    return "";
  }
}

function mapFeeStructure(record) {
  return {
    id: record.id,
    classId: String(record.class_id),
    className: formatClassName(record.class_name, record.section),
    academicSession: record.academic_session || "",
    tuitionFee: Number(record.monthly_tuition_fee ?? 0),
  };
}

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
      "Cannot connect to the backend. Check that the backend server is running and the API address is correct."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed with status ${response.status}.`
    );
  }

  return result;
}

function useFeeStructure() {
  const [feeStructures, setFeeStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [academicSession, setAcademicSession] = useState(getAcademicSession);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const validSession = useMemo(
    () => /^\d{4}-\d{4}$/.test(academicSession),
    [academicSession]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [feeResult, classResult] = await Promise.all([
        requestApi("/fee-structures"),
        requestApi("/classes"),
      ]);

      const feeRecords = Array.isArray(feeResult.data)
        ? feeResult.data
        : [];

      const classRecords = Array.isArray(classResult.data)
        ? classResult.data
        : [];

      setFeeStructures(feeRecords.map(mapFeeStructure));
      setClasses(classRecords);
    } catch (err) {
      setError(err.message || "Unable to load fee structure data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep the displayed session in sync with School Profile.
  useEffect(() => {
    const refreshSession = () => {
      setAcademicSession(getAcademicSession());
    };

    window.addEventListener("storage", refreshSession);

    return () => {
      window.removeEventListener("storage", refreshSession);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccessMessage("");

    // Read the latest profile value before saving.
    const currentSession = getAcademicSession();
    setAcademicSession(currentSession);

    if (!/^\d{4}-\d{4}$/.test(currentSession)) {
      setError(
        "Please save a valid Academic Session in School Profile first, for example 2026-2027."
      );
      return;
    }

    const selectedClass = classes.find(
      (item) => String(item.id) === String(formData.classId)
    );

    if (!selectedClass) {
      setError("Please select a valid class from the list.");
      return;
    }

    if (
      formData.tuitionFee === "" ||
      !Number.isFinite(Number(formData.tuitionFee)) ||
      Number(formData.tuitionFee) < 0
    ) {
      setError("Please enter a valid, non-negative monthly tuition fee.");
      return;
    }

    const payload = {
      class_id: Number(selectedClass.id),
      academic_session: currentSession,
      monthly_tuition_fee: Number(formData.tuitionFee),

      // Compatibility with the current backend validation/schema.
      admission_fee: 0,
      other_charges: 0,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await requestApi(`/fee-structures/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Fee structure updated successfully.");
      } else {
        await requestApi("/fee-structures", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccessMessage("Fee structure saved successfully.");
      }

      setFormData(EMPTY_FORM);
      setEditingId(null);

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save the fee structure.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (structure) => {
    setFormData({
      classId: String(structure.classId),
      tuitionFee: String(structure.tuitionFee),
    });

    setEditingId(structure.id);
    setError("");
    setSuccessMessage("");
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this fee structure?"
    );

    if (!shouldDelete) return;

    setDeletingId(id);
    setError("");
    setSuccessMessage("");

    try {
      await requestApi(`/fee-structures/${id}`, {
        method: "DELETE",
      });

      setFeeStructures((previous) =>
        previous.filter((structure) => structure.id !== id)
      );

      if (editingId === id) {
        setFormData(EMPTY_FORM);
        setEditingId(null);
      }

      setSuccessMessage("Fee structure deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete the fee structure.");
    } finally {
      setDeletingId(null);
    }
  };

  return {
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
    reloadFeeStructures: loadData,
  };
}

export default useFeeStructure;
