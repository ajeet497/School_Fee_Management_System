const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { db } = require("./db");

const {
  sendEmail,
  verifySmtpConnection,
} = require("./emailService");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "8h";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function checkAuthConfiguration() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createSchoolCode() {
  // Eight random hexadecimal characters, prefixed to make the code easy to identify.
  return `SCH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function createToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      schoolId: admin.school_id,
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY,
      issuer: "school-management-system",
      audience: "school-management-admin",
    }
  );
}

// --------------------------------------------------
// ADMIN AUTHENTICATION MIDDLEWARE
// --------------------------------------------------

async function authenticateAdmin(req, res, next) {
  try {
    checkAuthConfiguration();

    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "school-management-system",
      audience: "school-management-admin",
    });

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin session. Please log in again.",
      });
    }

    // Always load the school relationship from the database.
    // Do not trust a school ID supplied by the browser.
    const [admins] = await db.execute(
      `SELECT
         a.id,
         a.name,
         a.email,
         a.school_id,
         s.school_code,
         s.status AS school_status
       FROM admin_users a
       INNER JOIN schools s ON s.id = a.school_id
       WHERE a.id = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Admin account no longer exists. Please log in again.",
      });
    }

    const admin = admins[0];

    if (admin.school_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This school's account is inactive. Please contact support.",
      });
    }

    req.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      schoolId: admin.school_id,
      schoolCode: admin.school_code,
    };

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or has expired. Please log in again.",
      });
    }

    console.error("Admin authentication error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication configuration error.",
    });
  }
}

// --------------------------------------------------
// ADMIN REGISTRATION
// POST /api/auth/register
// --------------------------------------------------

router.post("/register", async (req, res) => {
  let connection;

  try {
    checkAuthConfiguration();

    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 1–100 characters.",
      });
    }

    if (cleanEmail.length > 255 || !isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 12 characters and no more than 72 UTF-8 bytes.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    connection = await db.getConnection();
    await connection.beginTransaction();

    // The unique email constraint prevents an email from registering twice.
    const [existingAdmins] = await connection.execute(
      "SELECT id FROM admin_users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (existingAdmins.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Retry a few times in the extremely unlikely event of a School Code collision.
    let schoolId = null;
    let schoolCode = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      schoolCode = createSchoolCode();

      try {
        const [schoolResult] = await connection.execute(
          "INSERT INTO schools (school_code) VALUES (?)",
          [schoolCode]
        );
        schoolId = schoolResult.insertId;
        break;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
      }
    }

    if (!schoolId) {
      throw new Error("Unable to generate a unique School Code.");
    }

    const [adminResult] = await connection.execute(
      `INSERT INTO admin_users (school_id, name, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [schoolId, cleanName, cleanEmail, passwordHash]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Registration successful. Your school account has been created.",
      schoolCode,
      admin: {
        id: adminResult.insertId,
        name: cleanName,
        email: cleanEmail,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Registration rollback error:", rollbackError.message);
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Admin registration error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create the account. Please try again.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// --------------------------------------------------
// ADMIN LOGIN
// POST /api/auth/login
// --------------------------------------------------

router.post("/login", async (req, res) => {
  try {
    checkAuthConfiguration();

    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [admins] = await db.execute(
      `SELECT
         a.id,
         a.name,
         a.email,
         a.password_hash,
         a.school_id,
         s.school_code,
         s.status AS school_status
       FROM admin_users a
       INNER JOIN schools s ON s.id = a.school_id
       WHERE a.email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (
      admins.length === 0 ||
      !(await bcrypt.compare(password, admins[0].password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const admin = admins[0];

    if (admin.school_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This school's account is inactive. Please contact support.",
      });
    }

    const token = createToken(admin);

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        schoolId: admin.school_id,
        schoolCode: admin.school_code,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
});

// --------------------------------------------------
// FORGOT ADMIN PASSWORD
// POST /api/auth/forgot-password
// --------------------------------------------------

router.post("/forgot-password", async (req, res) => {
  const genericResponse = {
    success: true,
    message: "If an admin account exists for this email, a reset link will be sent.",
  };

  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(200).json(genericResponse);
    }

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail.length > 255 || !isValidEmail(cleanEmail)) {
      return res.status(200).json(genericResponse);
    }

    const [admins] = await db.execute(
      "SELECT id, email FROM admin_users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );

    if (admins.length === 0) {
      return res.status(200).json(genericResponse);
    }

    const admin = admins[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    await db.execute(
      "DELETE FROM admin_password_resets WHERE admin_id = ?",
      [admin.id]
    );

    await db.execute(
      `INSERT INTO admin_password_resets (admin_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))`,
      [admin.id, tokenHash]
    );

    const resetUrl =
      `${FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=` +
      encodeURIComponent(resetToken);

    const emailInfo = await sendEmail({
      to: admin.email,
      subject: "Reset your School Management System password",
      text:
        "You requested a password reset.\n\n" +
        "Open this link to reset your password:\n" +
        resetUrl +
        "\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset for your admin account.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    console.log("Password reset email result:", {
      accepted: emailInfo.accepted,
      rejected: emailInfo.rejected,
      messageId: emailInfo.messageId,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(200).json(genericResponse);
  }
});

// --------------------------------------------------
// RESET ADMIN PASSWORD
// POST /api/auth/reset-password
// --------------------------------------------------

router.post("/reset-password", async (req, res) => {
  let connection;

  try {
    const { token, password } = req.body;

    if (typeof token !== "string" || typeof password !== "string" || !token.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required.",
      });
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 12 characters and no more than 72 UTF-8 bytes.",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [resetRecords] = await connection.execute(
      `SELECT id, admin_id
       FROM admin_password_resets
       WHERE token_hash = ?
         AND expires_at > UTC_TIMESTAMP()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (resetRecords.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    const adminId = resetRecords[0].admin_id;
    const [admins] = await connection.execute(
      "SELECT id FROM admin_users WHERE id = ? LIMIT 1",
      [adminId]
    );

    if (admins.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "The administrator account no longer exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await connection.execute(
      "UPDATE admin_users SET password_hash = ? WHERE id = ?",
      [passwordHash, adminId]
    );

    await connection.execute(
      "DELETE FROM admin_password_resets WHERE admin_id = ?",
      [adminId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Password reset rollback error:", rollbackError.message);
      }
    }

    console.error("Reset password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to reset your password. Please try again.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// --------------------------------------------------
// TEST SMTP CONNECTION
// GET /api/auth/test-smtp
// --------------------------------------------------

router.get("/test-smtp", async (req, res) => {
  try {
    await verifySmtpConnection();
    console.log("SMTP connection test: SUCCESS");

    return res.json({
      success: true,
      message: "SMTP authentication successful.",
    });
  } catch (error) {
    console.error("SMTP connection test failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "SMTP connection test failed.",
    });
  }
});

// --------------------------------------------------
// GET ADMIN PROFILE
// GET /api/auth/profile
// --------------------------------------------------

router.get("/profile", authenticateAdmin, async (req, res) => {
  try {
    const [admins] = await db.execute(
      `SELECT id, name, email, phone, username, photo
       FROM admin_users
       WHERE id = ?
       LIMIT 1`,
      [req.admin.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found.",
      });
    }

    return res.json({
      success: true,
      profile: admins[0],
    });
  } catch (error) {
    console.error("Get admin profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load admin profile.",
    });
  }
});


// --------------------------------------------------
// UPDATE ADMIN PROFILE
// PUT /api/auth/profile
// --------------------------------------------------

router.put("/profile", authenticateAdmin, async (req, res) => {
  try {
    const { name, email, phone, username, photo } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof username !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and username are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanUsername = username.trim();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 1–100 characters.",
      });
    }

    if (
      !cleanEmail ||
      cleanEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!cleanUsername || cleanUsername.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Username must contain 1–50 characters.",
      });
    }

    if (
      cleanPhone.length > 20 ||
      (cleanPhone && !/^\+?[0-9\s()-]{7,20}$/.test(cleanPhone))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    if (
      photo !== undefined &&
      photo !== null &&
      typeof photo !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile photo.",
      });
    }

    if (typeof photo === "string" && photo.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Profile photo is too large.",
      });
    }

    // Prevent another admin from using the same email.
    const [existingAdmins] = await db.execute(
      `SELECT id
       FROM admin_users
       WHERE email = ? AND id != ?
       LIMIT 1`,
      [cleanEmail, req.admin.id]
    );

    if (existingAdmins.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This email is already being used by another account.",
      });
    }

    // Update only the currently authenticated admin.
    await db.execute(
      `UPDATE admin_users
       SET name = ?, email = ?, phone = ?, username = ?, photo = ?
       WHERE id = ?`,
      [
        cleanName,
        cleanEmail,
        cleanPhone || null,
        cleanUsername,
        photo || null,
        req.admin.id,
      ]
    );

    return res.json({
      success: true,
      message: "Admin profile updated successfully.",
      profile: {
        id: req.admin.id,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        username: cleanUsername,
        photo: photo || "",
      },
    });
  } catch (error) {
    console.error("Update admin profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update admin profile.",
    });
  }
});


// --------------------------------------------------
// GET CURRENT ADMIN
// GET /api/auth/me
// --------------------------------------------------

router.get("/me", authenticateAdmin, async (req, res) => {
  try {
    const [admins] = await db.execute(
      `SELECT
         a.id,
         a.name,
         a.email,
         a.school_id AS schoolId,
         s.school_code AS schoolCode
       FROM admin_users a
       INNER JOIN schools s ON s.id = a.school_id
       WHERE a.id = ?
       LIMIT 1`,
      [req.admin.id]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found.",
      });
    }

    return res.json({
      success: true,
      admin: admins[0],
    });
  } catch (error) {
    console.error("Admin profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load the admin profile.",
    });
  }
});

// --------------------------------------------------
// CHANGE ADMIN PASSWORD
// PUT /api/auth/change-password
// --------------------------------------------------

router.put("/change-password", authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 12 || Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 12 characters and no more than 72 UTF-8 bytes.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must differ from the current password.",
      });
    }

    const [admins] = await db.execute(
      "SELECT id, password_hash FROM admin_users WHERE id = ? LIMIT 1",
      [req.admin.id]
    );

    if (
      admins.length === 0 ||
      !(await bcrypt.compare(currentPassword, admins[0].password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db.execute(
      "UPDATE admin_users SET password_hash = ? WHERE id = ?",
      [newPasswordHash, req.admin.id]
    );

    await db.execute(
      "DELETE FROM admin_password_resets WHERE admin_id = ?",
      [req.admin.id]
    );

    return res.json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change password error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to change the password.",
    });
  }
});

module.exports = router;
module.exports.authenticateAdmin = authenticateAdmin;
