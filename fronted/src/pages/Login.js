import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Use Render's VITE_API_URL in production and localhost during local development.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export function useLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  };

  const togglePasswordVisibility = () => {
    setShowPassword((previousState) => !previousState);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      newErrors.password = "Please enter your password.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    if (isSubmitting || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setMessage(
          data.message || "Login failed. Please check your credentials."
        );
        return;
      }

      if (!data.token || !data.admin) {
        setMessage("Invalid login response. Please try again.");
        return;
      }

      // Save authentication token.
      sessionStorage.setItem("adminToken", data.token);

      // Save admin and school information.
      sessionStorage.setItem(
        "adminProfile",
        JSON.stringify(data.admin)
      );

      sessionStorage.setItem(
        "schoolId",
        String(data.admin.schoolId)
      );

      sessionStorage.setItem(
        "schoolCode",
        data.admin.schoolCode ?? ""
      );

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login request failed:", error);

      setMessage(
        "Cannot connect to the backend. Please check your internet connection and backend service."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    showPassword,
    errors,
    message,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
    isSubmitting,
  };
}
