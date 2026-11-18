// Use the deployed backend URL from the Vite environment variable.
// The localhost URL is used only when VITE_API_URL is not configured.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\\/$/, "");

// Get the logged-in student's token.
function getStudentAuthHeaders() {
  const token = sessionStorage.getItem("studentToken");

  if (!token) {
    throw new Error("Student session expired. Please log in again.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

// Handle API responses consistently.
async function handleResponse(response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

// STUDENT LOGIN — MULTI-SCHOOL
export async function studentLogin(
  schoolCode,
  admissionNumber,
  password
) {
  const normalizedSchoolCode = schoolCode.trim().toUpperCase();

  const response = await fetch(
    `${API_BASE_URL}/student-auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schoolCode: normalizedSchoolCode,
        admissionNumber: admissionNumber.trim(),
        password,
      }),
    }
  );

  const result = await handleResponse(response);

  // Keep the school code for the student's current session.
  sessionStorage.setItem("studentSchoolCode", normalizedSchoolCode);

  return result;
}

// GET STUDENT DASHBOARD
export async function getStudentDashboard() {
  const response = await fetch(
    `${API_BASE_URL}/student-portal/dashboard`,
    {
      method: "GET",
      headers: getStudentAuthHeaders(),
    }
  );

  return handleResponse(response);
}

// GET COMPLETE STUDENT PAYMENT HISTORY
export async function getStudentPayments() {
  const response = await fetch(
    `${API_BASE_URL}/student-portal/payments`,
    {
      method: "GET",
      headers: getStudentAuthHeaders(),
    }
  );

  return handleResponse(response);
}

// GET INDIVIDUAL STUDENT PAYMENT RECEIPT
export async function getStudentPaymentReceipt(paymentId) {
  const response = await fetch(
    `${API_BASE_URL}/student-portal/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: getStudentAuthHeaders(),
    }
  );

  return handleResponse(response);
}

// GET THE LOGGED-IN STUDENT'S PROFILE PHOTO
export async function getStudentPhoto() {
  const response = await fetch(
    `${API_BASE_URL}/student-portal/photo`,
    {
      method: "GET",
      headers: getStudentAuthHeaders(),
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    throw new Error("Unable to load student profile photo.");
  }

  const imageBlob = await response.blob();

  return URL.createObjectURL(imageBlob);
}

// STUDENT LOGOUT
export function studentLogout() {
  sessionStorage.removeItem("studentToken");
  sessionStorage.removeItem("studentProfile");
  sessionStorage.removeItem("studentSchoolCode");
}
