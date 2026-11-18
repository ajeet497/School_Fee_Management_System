const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\\/$/, "");

export async function changeAdminPassword({
  currentPassword,
  newPassword,
}) {
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    throw new Error("Please login again.");
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/change-password`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Unable to change password."
    );
  }

  return result;
}
