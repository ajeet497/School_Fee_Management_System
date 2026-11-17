
import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`;

const initialProfile = {
  name: "",
  email: "",
  phone: "",
  username: "",
  photo: "",
};

// Common API request function
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
      "Cannot connect to the backend. Please check your server."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Something went wrong. Please try again."
    );
  }

  return result;
}

export function useAdminProfile() {
  const [formData, setFormData] = useState(initialProfile);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the currently logged-in admin's profile
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);

        const result = await requestApi("/auth/profile");

        if (isMounted) {
          setFormData({
            ...initialProfile,
            ...result.profile,
          });
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message);
          setMessageType("error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle text input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));

    setMessage("");
    setMessageType("");
  };

  // Handle profile photo upload
  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        photo: "Please select a valid image file.",
      }));

      event.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        photo: "Profile photo must be 1 MB or smaller.",
      }));

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setFormData((previousData) => ({
        ...previousData,
        photo: reader.result,
      }));

      setErrors((previousErrors) => ({
        ...previousErrors,
        photo: "",
      }));

      setMessage("");
      setMessageType("");
    };

    reader.onerror = () => {
      setErrors((previousErrors) => ({
        ...previousErrors,
        photo: "Unable to read the selected image.",
      }));
    };

    reader.readAsDataURL(file);
  };

  // Remove profile photo
  const handleRemovePhoto = () => {
    setFormData((previousData) => ({
      ...previousData,
      photo: "",
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      photo: "",
    }));

    setMessage("");
    setMessageType("");
  };

  // Validate profile information
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter the administrator's name.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Please enter an email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (
      formData.phone.trim() &&
      !/^\+?[0-9\s()-]{7,20}$/.test(formData.phone.trim())
    ) {
      newErrors.phone = "Please enter a valid phone number.";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Please enter a username.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Save profile to MySQL
  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!validateForm()) return;

    const updatedProfile = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      username: formData.username.trim(),
      photo: formData.photo || "",
    };

    try {
      setSaving(true);

      const result = await requestApi("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(updatedProfile),
      });

      const savedProfile = {
        ...initialProfile,
        ...result.profile,
      };

      setFormData(savedProfile);

      // Notify Topbar about the updated administrator details
      window.dispatchEvent(new Event("adminProfileUpdated"));

      setMessage("Admin profile saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  return {
    formData,
    errors,
    message,
    messageType,
    loading,
    saving,
    handleChange,
    handlePhotoChange,
    handleRemovePhoto,
    handleSubmit,
  };
}
