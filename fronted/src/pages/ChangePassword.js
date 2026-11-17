
import { useState } from "react";
import { changeAdminPassword } from "../api/authApi";

export function useChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
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

  // Show or hide a password
  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords((previousState) => ({
      ...previousState,
      [fieldName]: !previousState[fieldName],
    }));
  };

  // Validate the form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword =
        "Please enter your current password.";
    }

    // Backend requires 12–72 characters.
    if (!formData.newPassword) {
      newErrors.newPassword =
        "Please enter a new password.";
    } else if (
      formData.newPassword.length < 12 ||
      formData.newPassword.length > 72
    ) {
      newErrors.newPassword =
        "Password must contain 12–72 characters.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      formData.newPassword !== formData.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword =
        "New password must differ from the current password.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setMessage("");
    setMessageType("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await changeAdminPassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setMessage(
        result.message || "Password changed successfully."
      );
      setMessageType("success");

      // Clear sensitive form values.
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch (error) {
      setMessage(
        error.message || "Unable to change password."
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    showPasswords,
    errors,
    message,
    messageType,
    isSubmitting,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
  };
}
