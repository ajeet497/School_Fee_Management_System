// Use the deployed backend URL from the Vite environment variable.
// The localhost URL is used only when VITE_API_URL is not configured.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\\/$/, "");

// Get the admin token saved during login.
function getAuthHeaders() {
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    throw new Error("Please login again.");
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

// Convert student data to multipart FormData.
function createStudentFormData(studentData, photo) {
  const formData = new FormData();

  Object.entries(studentData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  if (photo instanceof File) {
    formData.append("photo", photo);
  }

  return formData;
}

// GET ALL STUDENTS
export async function getStudents() {
  try {
    const response = await fetch(`${API_BASE_URL}/students`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return result.data;
  } catch (error) {
    console.error("Error fetching students:", error.message);
    throw error;
  }
}

// ADD A NEW STUDENT
export async function addStudent(studentData, photo = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: createStudentFormData(studentData, photo),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Error adding student:", error.message);
    throw error;
  }
}

// UPDATE AN EXISTING STUDENT
export async function updateStudent(databaseId, studentData, photo = null) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/students/${encodeURIComponent(databaseId)}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: createStudentFormData(studentData, photo),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Error updating student:", error.message);
    throw error;
  }
}

// RESET A STUDENT'S PASSWORD (ADMIN ONLY)
export async function resetStudentPassword(databaseId, newPassword) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/students/${encodeURIComponent(databaseId)}/password`,
      {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Error resetting student password:", error.message);
    throw error;
  }
}

// DELETE A STUDENT
export async function deleteStudent(databaseId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/students/${encodeURIComponent(databaseId)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Error deleting student:", error.message);
    throw error;
  }
}

// GET THE PROTECTED STUDENT PHOTO ENDPOINT URL.
// The caller must send the Authorization header separately.
export function getStudentPhotoUrl(databaseId) {
  if (
    databaseId === null ||
    databaseId === undefined ||
    String(databaseId).trim() === ""
  ) {
    return "";
  }

  return `${API_BASE_URL}/students/${encodeURIComponent(
    String(databaseId)
  )}/photo`;
}
