
import { useState } from "react";

const API_BASE_URL = "http://localhost:5000/api";

export function useRegister() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [registrationResult, setRegistrationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setMessage("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter the admin name.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      newErrors.password = "Please create a password.";
    } else if (formData.password.length < 12) {
      newErrors.password = "Password must contain at least 12 characters.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setRegistrationResult(null);

    if (isSubmitting || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message || "Registration failed. Please try again."
        );
        return;
      }

      setRegistrationResult({
        name: data.admin?.name || formData.name.trim(),
        email: data.admin?.email || formData.email.trim(),
        schoolCode: data.schoolCode || "",
      });

      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Registration error:", error);

      setMessage(
        "Cannot connect to the backend. Make sure the server is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    message,
    registrationResult,
    isSubmitting,
    handleChange,
    handleSubmit,
  };
}
