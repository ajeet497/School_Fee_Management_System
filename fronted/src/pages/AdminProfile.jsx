
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  Camera,
  Upload,
  Trash2,
  User,
  Mail,
  Phone,
  AtSign,
  Save,
  X,
} from "lucide-react";

import { useAdminProfile } from "./AdminProfile.js";
import styles from "./AdminProfile.module.css";

function AdminProfile() {
  const navigate = useNavigate();

  const {
    formData,
    errors,
    message,
    messageType,
    handleChange,
    handlePhotoChange,
    handleRemovePhoto,
    handleSubmit,
  } = useAdminProfile();

  return (
    <div className={styles.page}>
      {/* Page heading */}
      <div className={styles.pageHeader}>
        <div className={styles.headingText}>
          <span className={styles.eyebrow}>ACCOUNT SETTINGS</span>
          <h1>Admin Profile</h1>
          <p>
            Manage your administrator account and personal information.
          </p>
        </div>

        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={17} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <form
        className={styles.profileCard}
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Profile photo */}
        <section className={styles.photoSection}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>
              <Camera size={19} />
            </div>

            <div>
              <h2>Profile Photo</h2>
              <p>
                Your photo will appear in the dashboard topbar.
              </p>
            </div>
          </div>

          <div className={styles.photoContent}>
            <div className={styles.avatar}>
              {formData.photo ? (
                <img
                  src={formData.photo}
                  alt="Admin profile preview"
                />
              ) : (
                <UserRound size={42} strokeWidth={1.5} />
              )}
            </div>

            <div className={styles.photoActions}>
              <div className={styles.photoButtons}>
                <label className={styles.uploadButton}>
                  <Upload size={16} />
                  Upload Photo

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    hidden
                  />
                </label>

                {formData.photo && (
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                )}
              </div>

              <small>
                JPG, PNG or other image formats. Maximum size: 1 MB.
              </small>

              {errors.photo && (
                <span className={styles.error} role="alert">
                  {errors.photo}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className={styles.sectionDivider} />

        {/* Personal information */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>
              <UserRound size={19} />
            </div>

            <div>
              <h2>Personal Information</h2>
              <p>
                Update your contact and administrator account details.
              </p>
            </div>
          </div>

          <div className={styles.formGrid}>
            {/* Full name */}
            <div className={styles.formGroup}>
              <label htmlFor="adminName">
                Full Name <span>*</span>
              </label>

              <div className={styles.inputWrapper}>
                <User size={17} />
                <input
                  id="adminName"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                />
              </div>

              {errors.name && (
                <small className={styles.error}>
                  {errors.name}
                </small>
              )}
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <label htmlFor="adminEmail">
                Email Address <span>*</span>
              </label>

              <div className={styles.inputWrapper}>
                <Mail size={17} />
                <input
                  id="adminEmail"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
              </div>

              {errors.email && (
                <small className={styles.error}>
                  {errors.email}
                </small>
              )}
            </div>

            {/* Phone */}
            <div className={styles.formGroup}>
              <label htmlFor="adminPhone">Phone Number</label>

              <div className={styles.inputWrapper}>
                <Phone size={17} />
                <input
                  id="adminPhone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                />
              </div>

              {errors.phone && (
                <small className={styles.error}>
                  {errors.phone}
                </small>
              )}
            </div>

            {/* Username */}
            <div className={styles.formGroup}>
              <label htmlFor="adminUsername">
                Username <span>*</span>
              </label>

              <div className={styles.inputWrapper}>
                <AtSign size={17} />
                <input
                  id="adminUsername"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.username)}
                />
              </div>

              {errors.username && (
                <small className={styles.error}>
                  {errors.username}
                </small>
              )}
            </div>
          </div>
        </section>

        {/* Save status */}
        {message && (
          <div
            className={`${styles.message} ${
              messageType === "success"
                ? styles.successMessage
                : messageType === "error"
                  ? styles.errorMessage
                  : ""
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        {/* Form actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate("/")}
          >
            <X size={16} />
            Cancel
          </button>

          <button type="submit" className={styles.saveButton}>
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminProfile;
