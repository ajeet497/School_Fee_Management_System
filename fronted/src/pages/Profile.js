
import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`;

const initialProfile = {
  schoolCode: "",
  schoolName: "",
  principalName: "",
  academicSession: "",
  address: "",
  phone: "",
  email: "",
  logo: "",
  principalSignature: "",
};

// Convert database fields into frontend fields.
const mapFromDatabase = (data = {}) => ({
  schoolCode: data.school_code || "",
  schoolName: data.school_name || "",
  principalName: data.principal_name || "",
  academicSession: data.academic_session || "",
  address: data.address || "",
  phone: data.phone || "",
  email: data.email || "",
  logo: data.logo || "",
  principalSignature: data.principal_signature || "",
});

// Convert frontend fields into database fields.
const mapToDatabase = (profile) => ({
  school_name: profile.schoolName,
  principal_name: profile.principalName,
  academic_session: profile.academicSession,
  address: profile.address,
  phone: profile.phone,
  email: profile.email,
  logo: profile.logo,
  principal_signature: profile.principalSignature,
});

function useProfile() {
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Reset All Data states.
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetWarnings, setResetWarnings] = useState([]);

  // Load the profile belonging to the logged-in school.
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const token = sessionStorage.getItem("adminToken");

        if (!token) {
          throw new Error(
            "Your admin session has expired. Please log in again."
          );
        }

        const response = await fetch(`${API_BASE_URL}/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Unable to load the school profile."
          );
        }

        if (active) {
          setProfile(mapFromDatabase(result.data));
          setErrors({});
        }
      } catch (error) {
        console.error("Unable to load school profile:", error);

        if (active) {
          setErrors({
            general:
              error.message || "Unable to load the school profile.",
          });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  // Handle normal text inputs.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previousProfile) => ({
      ...previousProfile,
      [name]: value,
    }));

    setSaved(false);

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
      general: "",
    }));
  };

  // Handle school logo and principal signature uploads.
  const handleImageChange = (event, fieldName) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        [fieldName]: "Please select a valid image file.",
      }));

      event.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        [fieldName]: "Image size must be 1 MB or less.",
      }));

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previousProfile) => ({
        ...previousProfile,
        [fieldName]: reader.result,
      }));

      setSaved(false);

      setErrors((previousErrors) => ({
        ...previousErrors,
        [fieldName]: "",
        general: "",
      }));
    };

    reader.onerror = () => {
      setErrors((previousErrors) => ({
        ...previousErrors,
        [fieldName]: "Unable to read the selected image.",
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleLogoChange = (event) => {
    handleImageChange(event, "logo");
  };

  const handleSignatureChange = (event) => {
    handleImageChange(event, "principalSignature");
  };

  // Save the school profile to MySQL.
  const handleSubmit = async (event) => {
    event.preventDefault();

    const newErrors = {};

    if (!profile.schoolName.trim()) {
      newErrors.schoolName = "School name is required.";
    }

    if (!profile.academicSession.trim()) {
      newErrors.academicSession = "Academic session is required.";
    }

    if (
      profile.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
    ) {
      newErrors.email = "Enter a valid email address.";
    }

    if (
      profile.phone &&
      !/^[0-9+\-()\s]{7,20}$/.test(profile.phone)
    ) {
      newErrors.phone = "Enter a valid contact number.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaved(false);
      return;
    }

    try {
      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        throw new Error(
          "Your admin session has expired. Please log in again."
        );
      }

      const profileToSave = {
        ...profile,
        schoolName: profile.schoolName.trim(),
        principalName: profile.principalName.trim(),
        academicSession: profile.academicSession.trim(),
        address: profile.address.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
      };

      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mapToDatabase(profileToSave)),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to save the school profile."
        );
      }

      // Update React state with the database response.
      setProfile(
        result.data
          ? mapFromDatabase(result.data)
          : profileToSave
      );

      setErrors({});
      setSaved(true);

      window.dispatchEvent(new Event("schoolProfileUpdated"));
    } catch (error) {
      console.error("Unable to save school profile:", error);

      setSaved(false);
      setErrors({
        general:
          error.message ||
          "Unable to save the school profile. Please try again.",
      });
    }
  };

  // Clear Form without deleting saved database information.
  const handleReset = () => {
    const confirmed = window.confirm(
      "Clear the form? Your saved school details will remain unchanged unless you save the cleared form."
    );

    if (!confirmed) return;

    setProfile(initialProfile);
    setErrors({});
    setSaved(false);
  };

  // Permanently reset this school's data through the backend.
  const handleResetAllData = async (confirmationText) => {
    if (confirmationText !== "RESET") {
      setResetError("Please type RESET exactly to confirm.");
      return false;
    }

    if (isResetting) return false;

    setIsResetting(true);
    setResetError("");
    setResetWarnings([]);

    try {
      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        throw new Error(
          "Your admin session has expired. Please log in again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/reset-all-data`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            confirmation: confirmationText,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            `Reset request failed with status ${response.status}.`
        );
      }

      // Clear old browser data only after backend reset succeeds.
      localStorage.removeItem("schoolManagementProfile");
      sessionStorage.removeItem("adminToken");

      setProfile(initialProfile);
      setSaved(false);
      setErrors({});

      setResetWarnings(
        Array.isArray(result.warnings) ? result.warnings : []
      );

      return true;
    } catch (error) {
      console.error("Unable to reset school data:", error);

      setResetError(
        error.message ||
          "Unable to reset school data. Please try again."
      );

      return false;
    } finally {
      setIsResetting(false);
    }
  };

  return {
    profile,
    saved,
    errors,
    isLoading,
    handleChange,
    handleLogoChange,
    handleSignatureChange,
    handleSubmit,
    handleReset,

    isResetting,
    resetError,
    resetWarnings,
    handleResetAllData,
  };
}

export default useProfile;
