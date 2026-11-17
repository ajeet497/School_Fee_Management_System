
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useProfile from "./Profile.js";
import styles from "./Profile.module.css";

function Profile() {
  const navigate = useNavigate();

  const {
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
  } = useProfile();

  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [copied, setCopied] = useState(false);

  // Copy the school's unique code.
  const handleCopySchoolCode = async () => {
    if (!profile.schoolCode) return;

    try {
      await navigator.clipboard.writeText(profile.schoolCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Unable to copy school code:", error);
      window.alert("Unable to copy the School Code. Please copy it manually.");
    }
  };

  const openResetConfirmation = () => {
    setConfirmationText("");
    setShowResetConfirmation(true);
  };

  const closeResetConfirmation = () => {
    if (isResetting) return;

    setConfirmationText("");
    setShowResetConfirmation(false);
  };

  const confirmReset = async () => {
    if (confirmationText !== "RESET" || isResetting) return;

    const success = await handleResetAllData(confirmationText);

    if (success) {
      const warningsMessage =
        resetWarnings.length > 0
          ? "\n\nWarnings:\n" + resetWarnings.join("\n")
          : "";

      window.alert(
        "School data has been reset successfully. You will now be redirected to the admin login page." +
          warningsMessage
      );

      navigate("/admin-login", { replace: true });
    }
  };

  return (
    <div className={styles.profilePage}>
      <div className={styles.pageHeader}>
        <div>
          <h1>School Profile</h1>
          <p>
            Manage your school's information, academic session, and branding.
          </p>
        </div>
      </div>

      {saved && (
        <div className={styles.successMessage} role="status">
          School profile saved successfully!
        </div>
      )}

      {errors.general && (
        <div className={styles.errorMessage} role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* School Information */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>School Information</h2>
            <p>
              These details can be used on fee receipts and other school
              documents.
            </p>
          </div>

          {/* School Code */}
          <div className={styles.schoolCodeBox}>
            <div className={styles.schoolCodeInfo}>
              <label>School Code</label>

              <div className={styles.schoolCodeValue}>
                {isLoading
                  ? "Loading..."
                  : profile.schoolCode || "School Code unavailable"}
              </div>

              <small className={styles.helpText}>
                Keep this unique code safe. Students need it to log in to
                their accounts.
              </small>
            </div>

            <button
              type="button"
              className={styles.copyCodeButton}
              onClick={handleCopySchoolCode}
              disabled={isLoading || !profile.schoolCode}
            >
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="schoolName">
                School Name <span>*</span>
              </label>

              <input
                id="schoolName"
                name="schoolName"
                type="text"
                value={profile.schoolName}
                onChange={handleChange}
                placeholder="Enter official school name"
                required
              />

              {errors.schoolName && (
                <small className={styles.fieldError}>
                  {errors.schoolName}
                </small>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="principalName">Principal's Name</label>

              <input
                id="principalName"
                name="principalName"
                type="text"
                value={profile.principalName}
                onChange={handleChange}
                placeholder="Enter principal's name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="academicSession">
                Current Academic Session <span>*</span>
              </label>

              <input
                id="academicSession"
                name="academicSession"
                type="text"
                value={profile.academicSession}
                onChange={handleChange}
                placeholder="e.g. 2026-2027"
                aria-describedby="academicSessionHelp"
                required
              />

              <small
                id="academicSessionHelp"
                className={styles.helpText}
              >
                Enter the session used by your school. Fee Structure should
                use this saved value.
              </small>

              {errors.academicSession && (
                <small className={styles.fieldError}>
                  {errors.academicSession}
                </small>
              )}
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label htmlFor="address">School Address</label>

              <textarea
                id="address"
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Village, district, state and PIN code"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Contact Number</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter school contact number"
              />

              {errors.phone && (
                <small className={styles.fieldError}>
                  {errors.phone}
                </small>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="school@example.com"
              />

              {errors.email && (
                <small className={styles.fieldError}>
                  {errors.email}
                </small>
              )}
            </div>
          </div>
        </section>

        {/* School Logo */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>School Logo</h2>
            <p>Upload a logo to personalize your school's receipts.</p>
          </div>

          <div className={styles.logoSection}>
            <div className={styles.logoPreview}>
              {profile.logo ? (
                <img src={profile.logo} alt="School logo preview" />
              ) : (
                <span aria-label="School building">🏫</span>
              )}
            </div>

            <div className={styles.logoControls}>
              <label
                htmlFor="schoolLogo"
                className={styles.uploadButton}
              >
                Choose Logo
              </label>

              <input
                id="schoolLogo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className={styles.fileInput}
              />

              <p>Image files only. Maximum size: 1 MB.</p>

              {errors.logo && (
                <small className={styles.fieldError}>
                  {errors.logo}
                </small>
              )}
            </div>
          </div>
        </section>

        {/* Principal's Signature */}
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2>Principal's Signature</h2>
            <p>
              Upload the authorized signature to display automatically on
              fee receipts.
            </p>
          </div>

          <div className={styles.logoSection}>
            <div className={styles.signaturePreview}>
              {profile.principalSignature ? (
                <img
                  src={profile.principalSignature}
                  alt="Principal's signature preview"
                />
              ) : (
                <span>Signature preview</span>
              )}
            </div>

            <div className={styles.logoControls}>
              <label
                htmlFor="principalSignature"
                className={styles.uploadButton}
              >
                Choose Signature
              </label>

              <input
                id="principalSignature"
                type="file"
                accept="image/*"
                onChange={handleSignatureChange}
                className={styles.fileInput}
              />

              <p>
                Use a clear signature image, preferably PNG with a
                transparent background. Maximum size: 1 MB.
              </p>

              {errors.principalSignature && (
                <small className={styles.fieldError}>
                  {errors.principalSignature}
                </small>
              )}
            </div>
          </div>
        </section>

        {/* Form Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
          >
            Clear Form
          </button>

          <button type="submit" className={styles.saveButton}>
            Save School Profile
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <section className={styles.dangerZone}>
        <div className={styles.dangerHeader}>
          <h2>Danger Zone</h2>
          <p>
            Permanently remove all school data and start the system from
            scratch.
          </p>
        </div>

        <div className={styles.dangerContent}>
          <div>
            <h3>Reset All Data</h3>

            <p>
              This action deletes all students, classes, fee structures,
              payments, receipts data, admin accounts and related records.
              Your saved school profile will also be cleared.
            </p>

            <p className={styles.dangerWarning}>
              This action cannot be undone. You will need to create a new
              administrator account after resetting.
            </p>
          </div>

          <button
            type="button"
            className={styles.dangerButton}
            onClick={openResetConfirmation}
            disabled={isResetting}
          >
            Reset All Data
          </button>
        </div>

        {/* Reset Confirmation */}
        {showResetConfirmation && (
          <div className={styles.confirmDialog}>
            <h3>Confirm Permanent Reset</h3>

            <p>
              You are about to permanently delete all school records and
              administrator accounts.
            </p>

            <p>
              To continue, type <strong>RESET</strong> in the box below.
            </p>

            <input
              type="text"
              value={confirmationText}
              onChange={(event) =>
                setConfirmationText(event.target.value)
              }
              placeholder="Type RESET"
              autoComplete="off"
              disabled={isResetting}
              className={styles.confirmInput}
            />

            {resetError && (
              <p className={styles.errorMessage} role="alert">
                {resetError}
              </p>
            )}

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeResetConfirmation}
                disabled={isResetting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.confirmResetButton}
                onClick={confirmReset}
                disabled={
                  confirmationText !== "RESET" || isResetting
                }
              >
                {isResetting
                  ? "Resetting..."
                  : "Permanently Delete All Data"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Profile;
