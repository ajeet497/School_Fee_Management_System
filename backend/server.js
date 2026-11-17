

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const sharp = require("sharp");


const { db, testConnection } = require("./db");
const authRoutes = require("./auth");
const { authenticateAdmin } = require("./auth");
const {
  router: studentAuthRoutes,
  authenticateStudent,
} = require("./studentAuth");


const app = express();
const PORT = Number(process.env.PORT) || 5000;

/* ============================================
   STUDENT PHOTO UPLOAD CONFIGURATION
============================================ */

const studentUploadDir = path.join(
  __dirname,
  "uploads",
  "students"
);

// Create the upload directory if it doesn't exist.
fs.mkdirSync(studentUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, studentUploadDir);
  },

  filename: (req, file, cb) => {
    const extensionMap = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const extension = extensionMap[file.mimetype];

    if (!extension) {
      return cb(new Error("Unsupported photo format."));
    }

    const uniqueFilename =
      `student-${crypto.randomUUID()}${extension}`;

    cb(null, uniqueFilename);
  },
});

const uploadStudentPhoto = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, and WEBP photos are allowed.")
      );
    }

    cb(null, true);
  },
});

/* ============================================
   BASIC STUDENT PHOTO CONTENT CHECK
============================================ */

async function validateUploadedPhoto(file) {
  if (!file) {
    return true;
  }

  const buffer = await fs.promises.readFile(file.path);

  // JPEG signature
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  // PNG signature
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ])
    );

  // WebP signature
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  const matchesDeclaredType =
    (file.mimetype === "image/jpeg" && isJpeg) ||
    (file.mimetype === "image/png" && isPng) ||
    (file.mimetype === "image/webp" && isWebp);

  if (!matchesDeclaredType) {
    throw new Error(
      "The uploaded file is not a supported image."
    );
  }

  return true;
}

/* ============================================
   PROCESS STUDENT PHOTO
============================================ */

async function processStudentPhoto(file) {
  if (!file) {
    return null;
  }

  let processedPath = null;

  try {
    // Check the image signature first.
    await validateUploadedPhoto(file);

    // Generate a new safe filename.
    const filename = `student-${crypto.randomUUID()}.jpg`;

    processedPath = path.join(studentUploadDir, filename);

    // Decode, resize and convert the image.
    await sharp(file.path, {
      limitInputPixels: 20_000_000,
    })
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
      })
      .toFile(processedPath);

    // Return the relative path for MySQL.
    return `uploads/students/${filename}`;
  } catch (error) {
    // Remove an incomplete processed file if necessary.
    if (processedPath) {
      await fs.promises.unlink(processedPath).catch(() => {});
    }

    throw new Error("Unable to process student photo.");
  } finally {
    // Remove the temporary Multer upload.
    await fs.promises.unlink(file.path).catch(() => {});
  }
}




app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Admin authentication routes.
app.use("/api/auth", authRoutes);

// Student signup, login, OTP and password-reset routes.
app.use("/api/student-auth", studentAuthRoutes);

// ======================================================
// HOME AND HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "School Management System backend is running!",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      message: "Backend API and MySQL are working!",
    });
  } catch (error) {
    console.error("Health check error:", error.message);

    res.status(500).json({
      success: false,
      message: "Backend is running, but MySQL connection failed.",
    });
  }
});

// ======================================================
// SCHOOL PROFILE: GET AND UPDATE
// ======================================================

app.get("/api/profile", authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT school_code, school_name, principal_name, academic_session,
              address, phone, email, logo, principal_signature
       FROM schools WHERE id = ? LIMIT 1`,
      [req.admin.schoolId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "School profile not found." });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Get school profile error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load school profile." });
  }
});

app.put("/api/profile", authenticateAdmin, async (req, res) => {
  try {
    const fields = ["school_name", "principal_name", "academic_session", "address", "phone", "email", "logo", "principal_signature"];
    const values = {};
    for (const field of fields) {
      const value = req.body?.[field];
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({ success: false, message: `Invalid ${field}.` });
      }
      values[field] = value === undefined ? null : value.trim();
    }
    if (values.school_name !== null && values.school_name.length > 150) return res.status(400).json({ success: false, message: "School name is too long." });
    if (values.principal_name !== null && values.principal_name.length > 100) return res.status(400).json({ success: false, message: "Principal name is too long." });
    if (values.academic_session !== null && values.academic_session !== "" && !/^\d{4}-\d{4}$/.test(values.academic_session)) return res.status(400).json({ success: false, message: "Academic session must look like 2026-2027." });
    if (values.phone !== null && values.phone.length > 20) return res.status(400).json({ success: false, message: "Phone number is too long." });
    if (values.email !== null && values.email.length > 255) return res.status(400).json({ success: false, message: "Email is too long." });
    if (values.address !== null && values.address.length > 2000) return res.status(400).json({ success: false, message: "Address is too long." });
    if (values.logo !== null && values.logo.length > 5000000) return res.status(400).json({ success: false, message: "Logo data is too large." });
    if (values.principal_signature !== null && values.principal_signature.length > 5000000) return res.status(400).json({ success: false, message: "Signature data is too large." });

    const [existing] = await db.query("SELECT id FROM schools WHERE id = ? LIMIT 1", [req.admin.schoolId]);
    if (!existing.length) return res.status(404).json({ success: false, message: "School not found." });

    // Only update fields actually sent by the frontend.
    const assignments = [];
    const params = [];
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        assignments.push(`${field} = ?`);
        params.push(values[field] || null);
      }
    }
    if (!assignments.length) return res.status(400).json({ success: false, message: "No profile fields were provided." });
    assignments.push("updated_at = CURRENT_TIMESTAMP");
    params.push(req.admin.schoolId);
    await db.query(`UPDATE schools SET ${assignments.join(", ")} WHERE id = ?`, params);

    const [rows] = await db.query(
      `SELECT school_code, school_name, principal_name, academic_session,
              address, phone, email, logo, principal_signature
       FROM schools WHERE id = ? LIMIT 1`,
      [req.admin.schoolId]
    );
    return res.json({ success: true, message: "School profile saved successfully.", data: rows[0] });
  } catch (error) {
    console.error("Update school profile error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save school profile." });
  }
});

// ======================================================
// ADMIN: RESET ONLY THE LOGGED-IN SCHOOL'S DATA
// DELETE /api/admin/reset-all-data
// ======================================================
app.delete(
  "/api/admin/reset-all-data",
  authenticateAdmin,
  async (req, res) => {
    let connection;
    try {
      if (req.body?.confirmation !== "RESET") {
        return res.status(400).json({
          success: false,
          message: 'Confirmation is required. Send { confirmation: "RESET" }.'
        });
      }

      const schoolId = Number(req.admin.schoolId);
      if (!Number.isSafeInteger(schoolId) || schoolId <= 0) {
        return res.status(401).json({ success: false, message: "Invalid school authentication." });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      await connection.query("DELETE FROM payment_extra_charges WHERE school_id = ?", [schoolId]);
      await connection.query("DELETE FROM payment_months WHERE school_id = ?", [schoolId]);
      await connection.query(
        `DELETE FROM student_otp_verifications
         WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)`,
        [schoolId]
      );
      await connection.query("DELETE FROM payments WHERE school_id = ?", [schoolId]);
      await connection.query("DELETE FROM fee_structure WHERE school_id = ?", [schoolId]);
      await connection.query("DELETE FROM students WHERE school_id = ?", [schoolId]);
      await connection.query("DELETE FROM classes WHERE school_id = ?", [schoolId]);

      // Keep the school, its profile, school code and admin accounts.
      await connection.commit();

      return res.json({
        success: true,
        message: "This school's students, classes, fees and payment records have been reset."
      });
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error("School reset error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to reset this school's data."
      });
    } finally {
      if (connection) connection.release();
    }
  }
);


/* ============================================
   SECURE STUDENT PHOTO ACCESS
============================================ */

app.get(
  "/api/students/:id/photo",
  authenticateAdmin,
  async (req, res) => {
    try {
      const studentId = Number(req.params.id);

      if (
        !Number.isSafeInteger(studentId) ||
        studentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      const [rows] = await db.query(
        "SELECT photo FROM students WHERE id = ? AND school_id = ? LIMIT 1",
        [studentId, req.admin.schoolId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      const photo = rows[0].photo;

      if (!photo) {
        return res.status(404).json({
          success: false,
          message: "Student photo not found.",
        });
      }

      // Only accept our expected stored photo path.
      const match = photo.match(
        /^uploads\/students\/(student-[a-f0-9-]+\.jpg)$/i
      );

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Invalid student photo path.",
        });
      }

      const filename = match[1];

      const photoPath = path.resolve(
        studentUploadDir,
        filename
      );

      // Confirm the resolved file is inside our upload folder.
      if (
        path.dirname(photoPath) !==
        path.resolve(studentUploadDir)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid photo path.",
        });
      }

      await fs.promises.access(photoPath);

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");

      return res.sendFile(photoPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          message: "Student photo file not found.",
        });
      }

      console.error("Student photo access error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to load student photo.",
      });
    }
  }
);


// ======================================================
// CLASSES: GET ALL
// ======================================================

app.get("/api/classes", authenticateAdmin, async (req, res) => {
  try {
    const [classes] = await db.query(`
      SELECT
        c.id,
        c.class_name,
        c.section,
        c.class_teacher,
        c.created_at,
        COUNT(s.id) AS student_count,
        COALESCE(
          JSON_ARRAYAGG(
            CASE WHEN s.id IS NOT NULL THEN s.student_name ELSE NULL END
          ),
          JSON_ARRAY()
        ) AS student_names
      FROM classes AS c
      LEFT JOIN students AS s ON s.class_id = c.id AND s.school_id = c.school_id
      WHERE c.school_id = ?
      GROUP BY
        c.id,
        c.class_name,
        c.section,
        c.class_teacher,
        c.created_at
      ORDER BY c.id ASC
    `, [req.admin.schoolId]);

    const data = classes.map((item) => {
      let studentNames = item.student_names;

      // Depending on the MySQL driver, a JSON column may be returned as a string.
      if (typeof studentNames === "string") {
        try {
          studentNames = JSON.parse(studentNames);
        } catch {
          studentNames = [];
        }
      }

      return {
        ...item,
        student_count: Number(item.student_count || 0),
        students: Array.isArray(studentNames)
          ? studentNames.filter((name) => name !== null)
          : [],
      };
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching classes:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch classes.",
    });
  }
});

// ======================================================
// CLASSES: VALIDATE INPUT
// ======================================================

function validateClassData(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      message: "Please provide valid class data.",
    };
  }

  const className = body.class_name;
  const section = body.section;
  const classTeacher = body.class_teacher;

  if (
    typeof className !== "string" ||
    !className.trim() ||
    className.trim().length > 50
  ) {
    return {
      valid: false,
      message: "Class name is required and must be at most 50 characters.",
    };
  }

  if (
    typeof section !== "string" ||
    !section.trim() ||
    section.trim().length > 10
  ) {
    return {
      valid: false,
      message: "Section is required and must be at most 10 characters.",
    };
  }

  if (
    typeof classTeacher !== "string" ||
    !classTeacher.trim() ||
    classTeacher.trim().length > 100
  ) {
    return {
      valid: false,
      message: "Class teacher is required and must be at most 100 characters.",
    };
  }

  return {
    valid: true,
    className: className.trim(),
    section: section.trim(),
    classTeacher: classTeacher.trim(),
  };
}

// ======================================================
// CLASSES: ADD
// ======================================================

app.post("/api/classes", authenticateAdmin, async (req, res) => {
  try {
    const validation = validateClassData(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const [result] = await db.query(
      `INSERT INTO classes (school_id, class_name, section, class_teacher)
       VALUES (?, ?, ?, ?)`,
      [
        req.admin.schoolId,
        validation.className,
        validation.section,
        validation.classTeacher,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Class added successfully!",
      classId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding class:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This class and section already exist.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to add class.",
    });
  }
});

// ======================================================
// CLASSES: UPDATE
// ======================================================

app.put("/api/classes/:id", authenticateAdmin, async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID.",
      });
    }

    const validation = validateClassData(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const [result] = await db.query(
      `UPDATE classes
       SET class_name = ?, section = ?, class_teacher = ?
       WHERE id = ? AND school_id = ?`,
      [
        validation.className,
        validation.section,
        validation.classTeacher,
        classId,
        req.admin.schoolId,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM classes WHERE id = ? AND school_id = ?",
        [classId, req.admin.schoolId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Class not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Class updated successfully!",
    });
  } catch (error) {
    console.error("Error updating class:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This class and section already exist.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to update class.",
    });
  }
});

// ======================================================
// CLASSES: DELETE
// ======================================================

app.delete("/api/classes/:id", authenticateAdmin, async (req, res) => {
  try {
    const classId = Number(req.params.id);

    if (!Number.isInteger(classId) || classId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID.",
      });
    }

    const [result] = await db.query(
      "DELETE FROM classes WHERE id = ? AND school_id = ?",
      [classId, req.admin.schoolId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    res.json({
      success: true,
      message: "Class deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting class:", error.message);

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This class has related student or fee records. Handle those records before deleting it.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to delete class.",
    });
  }
});

// ======================================================
// STUDENT PASSWORD VALIDATION
// ======================================================

function validateStudentPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

// ======================================================
// STUDENTS: VALIDATE INPUT
// ======================================================

function validateStudentData(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      message: "Please provide valid student data.",
    };
  }

  const {
    student_name,
    father_name,
    mother_name,
    date_of_birth,
    gender,
    phone,
    address,
    class_id,
    admission_date,
  } = body;

  // Admission number is generated by the backend and is not entered manually.

  // Student name
  if (
    typeof student_name !== "string" ||
    !student_name.trim() ||
    student_name.trim().length > 100
  ) {
    return {
      valid: false,
      message: "Enter a valid student name (maximum 100 characters).",
    };
  }

  // Optional parent names
  for (const [field, value] of [
    ["Father name", father_name],
    ["Mother name", mother_name],
  ]) {
    if (
      value != null &&
      (typeof value !== "string" || value.trim().length > 100)
    ) {
      return {
        valid: false,
        message: `${field} must be at most 100 characters.`,
      };
    }
  }

  // Gender
  if (
    typeof gender !== "string" ||
    !gender.trim() ||
    gender.trim().length > 20
  ) {
    return {
      valid: false,
      message: "Please provide a valid gender.",
    };
  }

  // Class ID
  const classId = Number(class_id);

  if (
    class_id === undefined ||
    class_id === null ||
    class_id === "" ||
    !Number.isInteger(classId) ||
    classId <= 0
  ) {
    return {
      valid: false,
      message: "Please select a valid class.",
    };
  }

  // Validate dates in YYYY-MM-DD format
  function isValidDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  if (
    date_of_birth != null &&
    date_of_birth !== "" &&
    !isValidDate(date_of_birth)
  ) {
    return {
      valid: false,
      message: "Please provide a valid date of birth.",
    };
  }

  if (
    admission_date != null &&
    admission_date !== "" &&
    !isValidDate(admission_date)
  ) {
    return {
      valid: false,
      message: "Please provide a valid admission date.",
    };
  }

  // Optional phone number
  if (
    phone != null &&
    (typeof phone !== "string" || phone.trim().length > 20)
  ) {
    return {
      valid: false,
      message: "Phone number must be at most 20 characters.",
    };
  }

  // Optional address
  if (
    address != null &&
    (typeof address !== "string" || address.trim().length > 500)
  ) {
    return {
      valid: false,
      message: "Address must be at most 500 characters.",
    };
  }

  return {
    valid: true,
    classId,
  };
}

/* ======================================================
   STUDENTS: GET ALL
   ====================================================== */

app.get("/api/students", authenticateAdmin, async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT
        s.id,
        s.admission_number,
        s.student_name,
        s.father_name,
        s.mother_name,
        s.date_of_birth,
        s.gender,
        s.phone,
        s.address,
        s.class_id,
        c.class_name,
        c.section,
        s.admission_date,
        s.photo,
        s.created_at
      FROM students AS s
      LEFT JOIN classes AS c ON c.id = s.class_id AND c.school_id = s.school_id
      WHERE s.school_id = ?
      ORDER BY s.id DESC
    `, [req.admin.schoolId]);

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("Error fetching students:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch students.",
    });
  }
});


// ======================================================
// STUDENTS: ADD
// ======================================================


/* ============================================
   STUDENT PHOTO UPLOAD MIDDLEWARE
============================================ */

/* ======================================================
   STUDENTS: ADD
====================================================== */

/* ------------------------------------------------------
   STUDENT PHOTO UPLOAD MIDDLEWARE
------------------------------------------------------ */

function handleStudentPhotoUpload(req, res, next) {
  uploadStudentPhoto.single("photo")(req, res, (error) => {
    if (error) {
      console.error("Photo upload error:", error.message);

      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Student photo must not exceed 2 MB."
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "Unexpected photo field. Use the photo field."
            : error.message || "Unable to upload student photo.";

      return res.status(400).json({
        success: false,
        message,
      });
    }

    next();
  });
}

/* ------------------------------------------------------
   ADD STUDENT
------------------------------------------------------ */

app.post(
  "/api/students",
  authenticateAdmin,
  handleStudentPhotoUpload,
  async (req, res) => {
    let processedPhotoPath = null;
    let connection = null;
    let transactionStarted = false;

    try {
      // 1. Validate the submitted student details.
      const validation = validateStudentData(req.body);

      if (!validation.valid) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      const {
        student_name,
        father_name,
        mother_name,
        date_of_birth,
        gender,
        phone,
        address,
        admission_date,
        password,
      } = req.body;

      // 2. Validate and hash the student's initial password.
      if (!validateStudentPassword(password)) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message:
            "Initial password must contain at least 8 characters and no more than 72 UTF-8 bytes.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // 3. Verify the authenticated school and selected class.
      const schoolId = Number(req.admin.schoolId);

      if (!Number.isSafeInteger(schoolId) || schoolId <= 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(401).json({
          success: false,
          message: "Invalid school authentication.",
        });
      }

      const [classRows] = await db.query(
        "SELECT id FROM classes WHERE id = ? AND school_id = ? LIMIT 1",
        [validation.classId, schoolId]
      );

      if (!classRows.length) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message: "The selected class does not belong to this school.",
        });
      }

      // 4. Process the optional student photo.
      processedPhotoPath = await processStudentPhoto(req.file);

      // 5. Generate the admission number in a transaction.
      connection = await db.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      // For a school without a counter row, initialize it from its
      // highest existing numeric admission number.
      await connection.query(
        `INSERT IGNORE INTO school_admission_counters
          (school_id, last_admission_number)
         SELECT
          ?,
          COALESCE(
            MAX(
              CASE
                WHEN admission_number REGEXP '^[0-9]+$'
                THEN CAST(admission_number AS UNSIGNED)
                ELSE 0
              END
            ),
            0
          )
         FROM students
         WHERE school_id = ?`,
        [schoolId, schoolId]
      );

      // Lock this school's counter to prevent duplicate numbers
      // when multiple students are registered at the same time.
      const [counterRows] = await connection.query(
        `SELECT last_admission_number
         FROM school_admission_counters
         WHERE school_id = ?
         FOR UPDATE`,
        [schoolId]
      );

      if (!counterRows.length) {
        throw new Error("Unable to initialize the school's admission counter.");
      }

      const lastAdmissionNumber = Number(
        counterRows[0].last_admission_number
      );

      if (
        !Number.isSafeInteger(lastAdmissionNumber) ||
        lastAdmissionNumber < 0 ||
        lastAdmissionNumber >= Number.MAX_SAFE_INTEGER
      ) {
        throw new Error("Invalid next admission number.");
      }

      const admissionNumber = lastAdmissionNumber + 1;

      await connection.query(
        `UPDATE school_admission_counters
         SET last_admission_number = ?
         WHERE school_id = ?`,
        [admissionNumber, schoolId]
      );

      // 6. Insert the student using the generated admission number.
      const [result] = await connection.query(
        `INSERT INTO students (
          school_id,
          admission_number,
          student_name,
          father_name,
          mother_name,
          date_of_birth,
          gender,
          phone,
          address,
          class_id,
          admission_date,
          photo,
          password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          String(admissionNumber),
          student_name.trim(),
          father_name?.trim() || null,
          mother_name?.trim() || null,
          date_of_birth || null,
          gender.trim(),
          phone?.trim() || null,
          address?.trim() || null,
          validation.classId,
          admission_date || null,
          processedPhotoPath,
          passwordHash,
        ]
      );

      // 7. Save both the student and counter update together.
      await connection.commit();
      transactionStarted = false;
      processedPhotoPath = null;

      return res.status(201).json({
        success: true,
        message: "Student added successfully!",
        studentId: result.insertId,
        admissionNumber: String(admissionNumber),
      });
    } catch (error) {
      if (connection && transactionStarted) {
        await connection.rollback().catch((rollbackError) => {
          console.error(
            "Student registration rollback error:",
            rollbackError.message
          );
        });
        transactionStarted = false;
      }

      console.error("Error adding student:", error.message);

      // Remove the processed photo if registration failed.
      if (processedPhotoPath) {
        const filename = path.basename(processedPhotoPath);
        const safePath = path.resolve(studentUploadDir, filename);

        if (path.dirname(safePath) === path.resolve(studentUploadDir)) {
          await fs.promises.unlink(safePath).catch(() => {});
        }
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "This admission number already exists. Please try again.",
        });
      }

      if (
        error.code === "ER_NO_REFERENCED_ROW_2" ||
        error.code === "ER_NO_REFERENCED_ROW"
      ) {
        return res.status(400).json({
          success: false,
          message: "The selected class or school does not exist.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to add student.",
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// ======================================================
// STUDENTS: UPDATE
// ======================================================


app.put(
  "/api/students/:id",
  authenticateAdmin,
  handleStudentPhotoUpload,
  async (req, res) => {
    let processedPhotoPath = null;

    try {
      const studentId = Number(req.params.id);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message: "Invalid student database ID.",
        });
      }

      // Validate student details.
      const validation = validateStudentData(req.body);

      if (!validation.valid) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message: validation.message,
        });
      }

      const {
        student_name,
        father_name,
        mother_name,
        date_of_birth,
        gender,
        phone,
        address,
        admission_date,
      } = req.body;

      // Confirm that the student exists.
      const [existingStudents] = await db.query(
        "SELECT id FROM students WHERE id = ? AND school_id = ?",
        [studentId, req.admin.schoolId]
      );

      if (existingStudents.length === 0) {
        if (req.file) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      const [classRows] = await db.query(
        "SELECT id FROM classes WHERE id = ? AND school_id = ? LIMIT 1",
        [validation.classId, req.admin.schoolId]
      );
      if (!classRows.length) {
        if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ success: false, message: "The selected class does not belong to this school." });
      }

      // Process the new photo only if one was selected.
      // This function also removes the temporary Multer upload.
      if (req.file) {
        processedPhotoPath = await processStudentPhoto(req.file);
      }

      // Update student information.
      // COALESCE keeps the old photo if no new photo is selected.
      const [result] = await db.query(
        `UPDATE students
         SET
           student_name = ?,
           father_name = ?,
           mother_name = ?,
           date_of_birth = ?,
           gender = ?,
           phone = ?,
           address = ?,
           class_id = ?,
           admission_date = ?,
           photo = COALESCE(?, photo)
         WHERE id = ? AND school_id = ?`,
        [
          student_name.trim(),
          father_name || null,
          mother_name || null,
          date_of_birth || null,
          gender,
          phone || null,
          address || null,
          validation.classId,
          admission_date || null,
          processedPhotoPath,
          studentId,
          req.admin.schoolId,
        ]
      );

      // Do not leave an unused processed image behind.
      // A zero affectedRows can also mean unchanged values.
      if (result.affectedRows === 0 && processedPhotoPath) {
        await fs.promises
          .unlink(path.join(__dirname, processedPhotoPath))
          .catch(() => {});
        processedPhotoPath = null;
      }

      res.json({
        success: true,
        message: "Student updated successfully!",
      });
    } catch (error) {
      console.error("Error updating student:", error.message);

      // Remove a newly processed photo if saving failed.
      if (processedPhotoPath) {
        await fs.promises
          .unlink(path.join(__dirname, processedPhotoPath))
          .catch(() => {});
      }

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "This admission number already exists.",
        });
      }

      if (
        error.code === "ER_NO_REFERENCED_ROW_2" ||
        error.code === "ER_NO_REFERENCED_ROW"
      ) {
        return res.status(400).json({
          success: false,
          message: "The selected class does not exist.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Unable to update student.",
      });
    }
  }
);

// ======================================================
// STUDENTS: RESET PASSWORD
// PUT /api/students/:id/password
// Only the admin of the student's school can reset it.
// ======================================================

app.put("/api/students/:id/password", authenticateAdmin, async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    const { password } = req.body || {};

    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    if (!validateStudentPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters and no more than 72 UTF-8 bytes.",
      });
    }

    const [students] = await db.query(
      "SELECT id FROM students WHERE id = ? AND school_id = ? LIMIT 1",
      [studentId, req.admin.schoolId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.query(
      "UPDATE students SET password_hash = ? WHERE id = ? AND school_id = ?",
      [passwordHash, studentId, req.admin.schoolId]
    );

    return res.json({
      success: true,
      message: "Student password reset successfully.",
    });
  } catch (error) {
    console.error("Student password reset error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to reset student password.",
    });
  }
});


// ======================================================
// STUDENTS: DELETE
// ======================================================

app.delete("/api/students/:id", authenticateAdmin, async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid student database ID.",
      });
    }

    const [result] = await db.query(
      "DELETE FROM students WHERE id = ? AND school_id = ?",
      [studentId, req.admin.schoolId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting student:", error.message);

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This student has related payment records. Handle those records first.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to delete student.",
    });
  }
});

// ======================================================
// FEE STRUCTURE VALIDATION
// ======================================================

function validateFeeStructureData(body) {
  // Ensure the request body is a valid object.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      message: "Please provide valid fee structure data.",
    };
  }

  // Validate class ID.
  const classId = Number(body.class_id);

  if (
    body.class_id === undefined ||
    body.class_id === null ||
    body.class_id === "" ||
    !Number.isInteger(classId) ||
    classId <= 0
  ) {
    return {
      valid: false,
      message: "Please select a valid class.",
    };
  }

  // Validate fee amounts.
  const feeFields = [
    "admission_fee",
    "monthly_tuition_fee",
    "other_charges",
  ];

  for (const field of feeFields) {
    const value = body[field];

    if (
      value === undefined ||
      value === null ||
      value === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      return {
        valid: false,
        message: `Please provide a valid non-negative value for ${field}.`,
      };
    }
  }

  // Validate academic session.
  const academicSession = body.academic_session;

  if (
    typeof academicSession !== "string" ||
    !/^\d{4}-\d{4}$/.test(academicSession)
  ) {
    return {
      valid: false,
      message: "Please select a valid academic session.",
    };
  }

  return {
    valid: true,
    classId,
    admissionFee: Number(body.admission_fee),
    monthlyTuitionFee: Number(body.monthly_tuition_fee),
    otherCharges: Number(body.other_charges),
    academicSession,
  };
}
// ======================================================
// FEE STRUCTURES: GET ALL
// ======================================================

app.get("/api/fee-structures", authenticateAdmin, async (req, res) => {
  try {
    const [feeStructures] = await db.query(`
      SELECT
        fs.id,
        fs.class_id,
        c.class_name,
        c.section,
        fs.admission_fee,
        fs.monthly_tuition_fee,
        fs.other_charges,
        fs.academic_session,
        fs.created_at,
        fs.updated_at
      FROM fee_structure AS fs
      INNER JOIN classes AS c ON fs.class_id = c.id AND c.school_id = fs.school_id
      WHERE fs.school_id = ?
      ORDER BY c.id ASC
    `, [req.admin.schoolId]);

    res.json({
      success: true,
      count: feeStructures.length,
      data: feeStructures,
    });
  } catch (error) {
    console.error("Error fetching fee structures:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch fee structures.",
    });
  }
});

// ======================================================
// FEE STRUCTURES: GET ONE
// ======================================================

app.get("/api/fee-structures/:id", authenticateAdmin, async (req, res) => {
  try {
    const feeStructureId = Number(req.params.id);

    if (!Number.isInteger(feeStructureId) || feeStructureId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee structure ID.",
      });
    }

    const [rows] = await db.query(
      `SELECT
         fs.id,
         fs.class_id,
         c.class_name,
         c.section,
         fs.admission_fee,
         fs.monthly_tuition_fee,
         fs.other_charges,
         fs.academic_session,
         fs.created_at,
         fs.updated_at
       FROM fee_structure AS fs
       INNER JOIN classes AS c ON fs.class_id = c.id AND c.school_id = fs.school_id
       WHERE fs.id = ? AND fs.school_id = ?`,
      [feeStructureId, req.admin.schoolId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found.",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching fee structure:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch fee structure.",
    });
  }
});

// ======================================================
// FEE STRUCTURES: ADD
// ======================================================

app.post("/api/fee-structures", authenticateAdmin, async (req, res) => {
  try {
    const validation = validateFeeStructureData(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const [classRows] = await db.query(
      "SELECT id FROM classes WHERE id = ? AND school_id = ? LIMIT 1",
      [validation.classId, req.admin.schoolId]
    );
    if (!classRows.length) {
      return res.status(400).json({ success: false, message: "The selected class does not belong to this school." });
    }

    const [result] = await db.query(
  `INSERT INTO fee_structure (
    school_id,
    class_id,
    admission_fee,
    monthly_tuition_fee,
    annual_fee,
    other_charges,
    academic_session
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [
    req.admin.schoolId,
    validation.classId,
    validation.admissionFee,
    validation.monthlyTuitionFee,
    validation.monthlyTuitionFee * 12,
    validation.otherCharges,
    validation.academicSession,
  ]
);

    res.status(201).json({
      success: true,
      message: "Fee structure added successfully!",
      feeStructureId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding fee structure:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A fee structure already exists for this class.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to add fee structure.",
    });
  }
});

// ======================================================
// NEXT PART: FEE STRUCTURE UPDATE AND DELETE
// ======================================================
// ======================================================
// FEE STRUCTURES: UPDATE
// ======================================================

app.put("/api/fee-structures/:id", authenticateAdmin, async (req, res) => {
  try {
    const feeStructureId = Number(req.params.id);

    if (!Number.isInteger(feeStructureId) || feeStructureId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee structure ID.",
      });
    }

    const validation = validateFeeStructureData(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const [classRows] = await db.query(
      "SELECT id FROM classes WHERE id = ? AND school_id = ? LIMIT 1",
      [validation.classId, req.admin.schoolId]
    );
    if (!classRows.length) {
      return res.status(400).json({ success: false, message: "The selected class does not belong to this school." });
    }

    const [result] = await db.query(
      `UPDATE fee_structure
       SET
         class_id = ?,
         admission_fee = ?,
         monthly_tuition_fee = ?,
         other_charges = ?,
         academic_session = ?
       WHERE id = ? AND school_id = ?`,
      [
        validation.classId,
        validation.admissionFee,
        validation.monthlyTuitionFee,
        validation.otherCharges,
        validation.academicSession,
        feeStructureId,
        req.admin.schoolId,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        "SELECT id FROM fee_structure WHERE id = ? AND school_id = ?",
        [feeStructureId, req.admin.schoolId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Fee structure not found.",
        });
      }
    }

    res.json({
      success: true,
      message: "Fee structure updated successfully!",
    });
  } catch (error) {
    console.error("Error updating fee structure:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A fee structure already exists for this class.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to update fee structure.",
    });
  }
});

// ======================================================
// FEE STRUCTURES: DELETE
// ======================================================

app.delete("/api/fee-structures/:id", authenticateAdmin, async (req, res) => {
  try {
    const feeStructureId = Number(req.params.id);

    if (!Number.isInteger(feeStructureId) || feeStructureId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee structure ID.",
      });
    }

    const [result] = await db.query(
      "DELETE FROM fee_structure WHERE id = ? AND school_id = ?",
      [feeStructureId, req.admin.schoolId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found.",
      });
    }

    res.json({
      success: true,
      message: "Fee structure deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting fee structure:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to delete fee structure.",
    });
  }
});

// ======================================================
// NEXT PART: PAYMENT HELPERS AND VALIDATION
// ======================================================
// ======================================================
// PAYMENT HELPERS AND VALIDATION
// ======================================================

// Tuition fee only: annual tuition is monthly tuition multiplied by 12.
// Admission fees and other charges are separate, optional charges.
function calculateAnnualFee(fee) {
  return Number(fee.monthly_tuition_fee || 0) * 12;
}

// Validate academic session format, for example 2026-2027.
function validSession(session) {
  return (
    typeof session === "string" &&
    /^\d{4}-\d{4}$/.test(session)
  );
}

// Validate payment data before saving or updating a payment.
function validatePaymentData(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      message: "Please provide valid payment data.",
    };
  }

  const studentId = Number(body.student_id);
  const amount = Number(body.amount_paid);
  const paymentDate = body.payment_date;
  const paymentMode = body.payment_mode;
  const academicSession = body.academic_session;

  if (
    body.student_id === undefined ||
    body.student_id === null ||
    body.student_id === "" ||
    !Number.isInteger(studentId) ||
    studentId <= 0
  ) {
    return {
      valid: false,
      message: "Please select a valid student.",
    };
  }

  if (
    body.amount_paid === "" ||
    body.amount_paid === undefined ||
    body.amount_paid === null ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      valid: false,
      message: "Payment amount must be greater than zero.",
    };
  }

  // Check the date format and whether the date actually exists.
  if (
    typeof paymentDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)
  ) {
    return {
      valid: false,
      message: "Please provide a valid payment date.",
    };
  }

  const parsedDate = new Date(`${paymentDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== paymentDate
  ) {
    return {
      valid: false,
      message: "Please provide a valid payment date.",
    };
  }

  const allowedModes = [
    "Cash",
    "UPI",
    "Card",
    "Bank Transfer",
    "Cheque",
  ];

  if (!allowedModes.includes(paymentMode)) {
    return {
      valid: false,
      message: "Please select a valid payment mode.",
    };
  }

  if (!validSession(academicSession)) {
    return {
      valid: false,
      message: "Please select a valid academic session.",
    };
  }

  return {
    valid: true,
    studentId,
    amount,
    paymentDate,
    paymentMode,
    academicSession,
    remarks:
      typeof body.remarks === "string"
        ? body.remarks.trim().slice(0, 255) || null
        : null,
  };
}

// Generate a unique receipt number.
function createReceiptNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const uniquePart = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `REC-${date}-${uniquePart}`;
}

// Load a student's fee details for a particular academic session.
async function getStudentFee(schoolId, studentId, academicSession) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.admission_number,
       s.student_name,
       s.class_id,
       c.class_name,
       c.section,
       fs.admission_fee,
       fs.monthly_tuition_fee,
       fs.other_charges,
       fs.academic_session
     FROM students AS s
     INNER JOIN classes AS c ON c.id = s.class_id AND c.school_id = s.school_id
     INNER JOIN fee_structure AS fs
       ON fs.class_id = s.class_id
      AND fs.academic_session = ?
      AND fs.school_id = ?
     WHERE s.id = ? AND s.school_id = ?`,
    [academicSession, schoolId, studentId, schoolId]
  );

  return rows[0] || null;
}

// Calculate payments for a student and academic session.
// Optionally exclude the payment currently being edited.
async function getPaymentTotals(
  schoolId,
  studentId,
  academicSession,
  excludePaymentId = null
) {
  let sql = `
    SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM payments
    WHERE school_id = ?
      AND student_id = ?
      AND academic_session = ?
  `;

  const params = [schoolId, studentId, academicSession];

  if (excludePaymentId !== null) {
    sql += " AND id <> ?";
    params.push(excludePaymentId);
  }

  const [rows] = await db.query(sql, params);

  return Number(rows[0].total_paid || 0);
}

// Month values use the academic-year order: April=1 ... March=12.
const VALID_FEE_MONTHS = new Set(
  Array.from({ length: 12 }, (_, index) => index + 1)
);

function validatePaymentBreakdown(body, monthlyTuitionFee) {
  const rawMonths = body.fee_months;
  const rawCharges = body.extra_charges;

  if (!Array.isArray(rawMonths) || !Array.isArray(rawCharges)) {
    return {
      valid: false,
      message: "Please provide the selected tuition months and additional charges.",
    };
  }

  const feeMonths = rawMonths.map(Number);

  if (
    feeMonths.some((month) => !Number.isInteger(month) || !VALID_FEE_MONTHS.has(month)) ||
    new Set(feeMonths).size !== feeMonths.length
  ) {
    return {
      valid: false,
      message: "Selected tuition months are invalid or duplicated.",
    };
  }

  const extraCharges = [];
  for (const charge of rawCharges) {
    const chargeName =
      typeof charge?.charge_name === "string" ? charge.charge_name.trim() : "";
    const amount = Number(charge?.amount);

    if (
      !chargeName ||
      chargeName.length > 100 ||
      charge?.amount === "" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return {
        valid: false,
        message: "Each additional charge needs a name and a valid non-negative amount.",
      };
    }

    if (amount > 0) extraCharges.push({ chargeName, amount });
  }

  const tuitionTotal = feeMonths.length * Number(monthlyTuitionFee || 0);
  const chargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);

  return {
    valid: true,
    feeMonths,
    extraCharges,
    tuitionTotal,
    chargesTotal,
    payableTotal: Number((tuitionTotal + chargesTotal).toFixed(2)),
  };
}

async function loadPaymentBreakdown(queryable, schoolId, paymentId) {
  const [monthRows] = await queryable.query(
    `SELECT fee_month, amount_due, amount_paid
     FROM payment_months
     WHERE payment_id = ? AND school_id = ?
     ORDER BY fee_month ASC`,
    [paymentId, schoolId]
  );

  const [chargeRows] = await queryable.query(
    `SELECT id, charge_name, amount
     FROM payment_extra_charges
     WHERE payment_id = ? AND school_id = ?
     ORDER BY id ASC`,
    [paymentId, schoolId]
  );

  return {
    feeMonths: monthRows.map((row) => Number(row.fee_month)),
    monthDetails: monthRows.map((row) => ({
      feeMonth: Number(row.fee_month),
      amountDue: Number(row.amount_due),
      amountPaid: Number(row.amount_paid),
    })),
    extraCharges: chargeRows.map((row) => ({
      id: row.id,
      chargeName: row.charge_name,
      amount: Number(row.amount),
    })),
  };
}

async function savePaymentBreakdown(
  connection,
  schoolId,
  paymentId,
  studentId,
  academicSession,
  breakdown,
  monthlyTuitionFee
) {
  if (breakdown.feeMonths.length) {
    const placeholders = breakdown.feeMonths.map(() => "?").join(", ");
    const [alreadyPaid] = await connection.query(
      `SELECT fee_month
       FROM payment_months
       WHERE school_id = ?
         AND student_id = ?
         AND academic_session = ?
         AND payment_id <> ?
         AND fee_month IN (${placeholders})`,
      [
        schoolId,
        studentId,
        academicSession,
        paymentId,
        ...breakdown.feeMonths,
      ]
    );

    if (alreadyPaid.length) {
      const labels = alreadyPaid.map((row) => row.fee_month).join(", ");
      const error = new Error(
        `One or more selected months are already recorded (month numbers: ${labels}).`
      );
      error.statusCode = 409;
      throw error;
    }
  }

  await connection.query(
    "DELETE FROM payment_months WHERE payment_id = ? AND school_id = ?",
    [paymentId, schoolId]
  );
  await connection.query(
    "DELETE FROM payment_extra_charges WHERE payment_id = ? AND school_id = ?",
    [paymentId, schoolId]
  );

  for (const month of breakdown.feeMonths) {
    await connection.query(
      `INSERT INTO payment_months
       (school_id, payment_id, student_id, academic_session, fee_month, amount_due, amount_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        paymentId,
        studentId,
        academicSession,
        month,
        Number(monthlyTuitionFee || 0),
        Number(monthlyTuitionFee || 0),
      ]
    );
  }

  for (const charge of breakdown.extraCharges) {
    await connection.query(
      `INSERT INTO payment_extra_charges (school_id, payment_id, charge_name, amount)
       VALUES (?, ?, ?, ?)`,
      [schoolId, paymentId, charge.chargeName, charge.amount]
    );
  }
}

// ======================================================
// NEXT PART: PAYMENT STUDENTS ROUTE
// ======================================================
// ======================================================
// PAYMENT STUDENTS: REAL STUDENTS AND ANNUAL FEES
// GET /api/payment-students?academic_session=2026-2027
// ======================================================

app.get("/api/payment-students", authenticateAdmin, async (req, res) => {
  try {
    const academicSession =
      req.query.academic_session || "2026-2027";

    if (!validSession(academicSession)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic session.",
      });
    }

    const [students] = await db.query(
      `SELECT
         s.id,
         s.admission_number,
         s.student_name,
         s.class_id,
         s.admission_date,
         c.class_name,
         c.section,
         fs.admission_fee,
         fs.monthly_tuition_fee,
         fs.other_charges,
         fs.academic_session
       FROM students AS s
       INNER JOIN classes AS c ON c.id = s.class_id AND c.school_id = s.school_id
       LEFT JOIN fee_structure AS fs
         ON fs.class_id = s.class_id
        AND fs.academic_session = ?
        AND fs.school_id = s.school_id
       WHERE s.school_id = ?
       ORDER BY s.student_name ASC`,
      [academicSession, req.admin.schoolId]
    );

    const data = await Promise.all(
      students.map(async (student) => {
        const hasFee = student.admission_fee !== null;

        const annualFee = hasFee
          ? calculateAnnualFee(student)
          : null;

        const [tuitionPaidRows] = await db.query(
          `SELECT COALESCE(SUM(pm.amount_paid), 0) AS tuition_paid
           FROM payment_months AS pm
           WHERE pm.school_id = ? AND pm.student_id = ? AND pm.academic_session = ?`,
          [req.admin.schoolId, student.id, academicSession]
        );
        const totalPaid = Number(tuitionPaidRows[0]?.tuition_paid || 0);

        return {
          id: student.id,
          student_id: student.id,
          admission_number: student.admission_number,
          student_name: student.student_name,
          class_id: student.class_id,
          admission_date: student.admission_date,
          class_name: student.class_name,
          section: student.section,
          academic_session: academicSession,
          admission_fee: student.admission_fee,
          monthly_tuition_fee: student.monthly_tuition_fee,
          other_charges: student.other_charges,
          annual_fee: annualFee,
          total_paid: totalPaid,
          pending_amount:
            annualFee === null
              ? null
              : Math.max(0, annualFee - totalPaid),
          fee_status:
            annualFee === null
              ? "Fee Not Set"
              : totalPaid >= annualFee
                ? "Paid"
                : totalPaid > 0
                  ? "Partial"
                  : "Pending",
        };
      })
    );

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error loading payment students:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load students for fee payment.",
    });
  }
});

// ======================================================
// NEXT PART: PAYMENT HISTORY
// ======================================================
// ======================================================
// PAYMENTS: GET HISTORY
// GET /api/payments?academic_session=2026-2027
// ======================================================

app.get("/api/payments", authenticateAdmin, async (req, res) => {
  try {
    const academicSession = req.query.academic_session;

    if (
      academicSession !== undefined &&
      !validSession(academicSession)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic session.",
      });
    }

    let sql = `
      SELECT
        p.id,
        p.student_id,
        s.admission_number,
        s.student_name,
        s.class_id,
        c.class_name,
        c.section,
        p.academic_session,
        p.amount_paid,
        p.payment_date,
        p.payment_mode,
        p.receipt_number,
        p.remarks,
        p.created_at
      FROM payments AS p
      INNER JOIN students AS s ON s.id = p.student_id AND s.school_id = p.school_id
      INNER JOIN classes AS c ON c.id = s.class_id AND c.school_id = p.school_id
    `;

    const params = [req.admin.schoolId];

    sql += " WHERE p.school_id = ?";
    if (academicSession) {
      sql += " AND p.academic_session = ?";
      params.push(academicSession);
    }

    sql += " ORDER BY p.payment_date DESC, p.id DESC";

    const [payments] = await db.query(sql, params);

    const data = await Promise.all(
      payments.map(async (payment) => {
        const fee = await getStudentFee(
          req.admin.schoolId,
          payment.student_id,
          payment.academic_session
        );

        const annualFee = fee ? calculateAnnualFee(fee) : null;

        const [tuitionPaidRows] = await db.query(
          `SELECT COALESCE(SUM(pm.amount_paid), 0) AS tuition_paid
           FROM payment_months AS pm
           WHERE pm.school_id = ? AND pm.student_id = ? AND pm.academic_session = ?`,
          [req.admin.schoolId, payment.student_id, payment.academic_session]
        );
        const totalPaid = Number(tuitionPaidRows[0]?.tuition_paid || 0);

        const breakdown = await loadPaymentBreakdown(db, req.admin.schoolId, payment.id);

        return {
          ...breakdown,
          id: payment.id,
          studentId: String(payment.admission_number),
          studentDatabaseId: payment.student_id,
          studentName: payment.student_name,
          className: payment.section
            ? `${payment.class_name} - Section ${payment.section}`
            : payment.class_name,
          academicSession: payment.academic_session,
          paymentDate:
            typeof payment.payment_date === "string"
              ? payment.payment_date
              : new Date(payment.payment_date)
                  .toISOString()
                  .slice(0, 10),
          amount: Number(payment.amount_paid),
          paymentMode: payment.payment_mode,
          receiptNumber: payment.receipt_number,
          annualFee,
          totalPaid,
          pendingAmount:
            annualFee === null
              ? null
              : Math.max(0, annualFee - totalPaid),
          feeStatus:
            annualFee === null
              ? "Fee Not Set"
              : totalPaid >= annualFee
                ? "Paid"
                : totalPaid > 0
                  ? "Partial"
                  : "Pending",
          remarks: payment.remarks,
        };
      })
    );

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching payments:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch payment history.",
    });
  }
});

// ======================================================
// NEXT PART: GET ONE PAYMENT
// ======================================================
// ======================================================
// PAYMENTS: GET ONE
// ======================================================

app.get("/api/payments/:id", authenticateAdmin, async (req, res) => {
  try {
    const paymentId = Number(req.params.id);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const [rows] = await db.query(
      `SELECT
         p.id,
         p.student_id,
         s.admission_number,
         s.student_name,
         p.academic_session,
         p.amount_paid,
         p.payment_date,
         p.payment_mode,
         p.receipt_number,
         p.remarks
       FROM payments AS p
       INNER JOIN students AS s ON s.id = p.student_id AND s.school_id = p.school_id
       WHERE p.id = ? AND p.school_id = ?`,
      [paymentId, req.admin.schoolId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const breakdown = await loadPaymentBreakdown(db, req.admin.schoolId, paymentId);

    res.json({
      success: true,
      data: { ...rows[0], ...breakdown },
    });
  } catch (error) {
    console.error("Error fetching payment:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch payment.",
    });
  }
});

// ======================================================
// PAYMENTS: ADD
// POST /api/payments
// ======================================================

app.post("/api/payments", authenticateAdmin, async (req, res) => {
  let connection;
  try {
    const validation = validatePaymentData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const {
      studentId,
      amount,
      paymentDate,
      paymentMode,
      academicSession,
      remarks,
    } = validation;

    const studentFee = await getStudentFee(req.admin.schoolId, studentId, academicSession);
    if (!studentFee) {
      return res.status(400).json({
        success: false,
        message: "No fee structure exists for this student's class and academic session.",
      });
    }

    const breakdown = validatePaymentBreakdown(
      req.body,
      studentFee.monthly_tuition_fee
    );
    if (!breakdown.valid) {
      return res.status(400).json({ success: false, message: breakdown.message });
    }

    if (Math.abs(amount - breakdown.payableTotal) > 0.009) {
      return res.status(400).json({
        success: false,
        message: `Amount Paid must equal Total Payable (₹${breakdown.payableTotal.toFixed(2)}).`,
        totalPayable: breakdown.payableTotal,
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const receiptNumber = createReceiptNumber();
    const [result] = await connection.query(
      `INSERT INTO payments (
        school_id, student_id, amount_paid, payment_date, payment_mode,
        receipt_number, remarks, academic_session
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.admin.schoolId,
        studentId,
        amount,
        paymentDate,
        paymentMode,
        receiptNumber,
        remarks,
        academicSession,
      ]
    );

    await savePaymentBreakdown(
      connection,
      req.admin.schoolId,
      result.insertId,
      studentId,
      academicSession,
      breakdown,
      studentFee.monthly_tuition_fee
    );

    await connection.commit();

    const totalPaid = await getPaymentTotals(req.admin.schoolId, studentId, academicSession);
    const annualFee = calculateAnnualFee(studentFee);

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully!",
      paymentId: result.insertId,
      receiptNumber,
      annualFee,
      totalPaid,
      pendingAmount: Math.max(0, annualFee - totalPaid),
      totalPayable: breakdown.payableTotal,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error("Payment rollback error:", rollbackError.message);
      }
    }
    console.error("Error recording payment:", error.message);

    if (error.statusCode === 409 || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: error.statusCode === 409
          ? error.message
          : "This tuition month or receipt number is already recorded.",
      });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "The selected student does not exist.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Unable to record payment. Check that the payment breakdown tables have been created.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// ======================================================
// NEXT PART: UPDATE PAYMENT
// ======================================================
// ======================================================
// PAYMENTS: UPDATE
// PUT /api/payments/:id
// ======================================================

app.put("/api/payments/:id", authenticateAdmin, async (req, res) => {
  const paymentId = Number(req.params.id);
  let connection;

  try {
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    const validation = validatePaymentData(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const {
      studentId,
      amount,
      paymentDate,
      paymentMode,
      academicSession,
      remarks,
    } = validation;

    const studentFee = await getStudentFee(req.admin.schoolId, studentId, academicSession);
    if (!studentFee) {
      return res.status(400).json({
        success: false,
        message: "No fee structure exists for this student's class and academic session.",
      });
    }

    const breakdown = validatePaymentBreakdown(
      req.body,
      studentFee.monthly_tuition_fee
    );
    if (!breakdown.valid) {
      return res.status(400).json({ success: false, message: breakdown.message });
    }

    if (Math.abs(amount - breakdown.payableTotal) > 0.009) {
      return res.status(400).json({
        success: false,
        message: `Amount Paid must equal Total Payable (₹${breakdown.payableTotal.toFixed(2)}).`,
        totalPayable: breakdown.payableTotal,
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      "SELECT id, receipt_number FROM payments WHERE id = ? AND school_id = ? FOR UPDATE",
      [paymentId, req.admin.schoolId]
    );

    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    await connection.query(
      `UPDATE payments
       SET student_id = ?, amount_paid = ?, payment_date = ?,
           payment_mode = ?, remarks = ?, academic_session = ?
       WHERE id = ? AND school_id = ?`,
      [
        studentId,
        amount,
        paymentDate,
        paymentMode,
        remarks,
        academicSession,
        paymentId,
        req.admin.schoolId,
      ]
    );

    await savePaymentBreakdown(
      connection,
      req.admin.schoolId,
      paymentId,
      studentId,
      academicSession,
      breakdown,
      studentFee.monthly_tuition_fee
    );

    await connection.commit();

    const totalPaid = await getPaymentTotals(req.admin.schoolId, studentId, academicSession);
    const annualFee = calculateAnnualFee(studentFee);

    res.json({
      success: true,
      message: "Payment updated successfully!",
      receiptNumber: existingRows[0].receipt_number,
      totalPaid,
      pendingAmount: Math.max(0, annualFee - totalPaid),
      updated: true,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error("Payment rollback error:", rollbackError.message);
      }
    }
    console.error("Error updating payment:", error.message);

    if (error.statusCode === 409 || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: error.statusCode === 409
          ? error.message
          : "This tuition month or receipt number is already recorded.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Unable to update payment. Check that the payment breakdown tables have been created.",
    });
  } finally {
    if (connection) connection.release();
  }
});

// ======================================================
// NEXT PART: DELETE PAYMENT
// ======================================================
// ======================================================
// PAYMENTS: DELETE
// ======================================================

app.delete("/api/payments/:id", authenticateAdmin, async (req, res) => {
  const paymentId = Number(req.params.id);
  let connection;

  try {
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM payments WHERE id = ? AND school_id = ? FOR UPDATE",
      [paymentId, req.admin.schoolId]
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    await connection.query("DELETE FROM payment_months WHERE payment_id = ? AND school_id = ?", [paymentId, req.admin.schoolId]);
    await connection.query("DELETE FROM payment_extra_charges WHERE payment_id = ? AND school_id = ?", [paymentId, req.admin.schoolId]);
    await connection.query("DELETE FROM payments WHERE id = ? AND school_id = ?", [paymentId, req.admin.schoolId]);

    await connection.commit();

    res.json({ success: true, message: "Payment deleted successfully!" });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error("Payment rollback error:", rollbackError.message);
      }
    }
    console.error("Error deleting payment:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to delete payment. Check that the payment breakdown tables have been created.",
    });
  } finally {
    if (connection) connection.release();
  }
});

/* ======================================================
   STUDENT PORTAL: DASHBOARD
   GET /api/student-portal/dashboard

   This endpoint uses the student JWT. It never accepts a
   student ID from the URL or query string, so a student
   can only retrieve their own information.
====================================================== */

app.get(
  "/api/student-portal/dashboard",
  authenticateStudent,
  async (req, res) => {
    try {
      const studentId = Number(req.student.studentId);

      if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid student authentication. Please log in again.",
        });
      }

      // Load only the profile belonging to the authenticated student's school.
      const [schoolRows] = await db.query(
        `SELECT
           school_name,
           principal_name,
           academic_session,
           address,
           phone,
           email,
           logo,
           principal_signature
         FROM schools
         WHERE id = ?
         LIMIT 1`,
        [req.student.schoolId]
      );

      if (schoolRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "School profile not found.",
        });
      }

      const school = schoolRows[0];

      // Load the logged-in student's own profile and latest fee structure.
      const [studentRows] = await db.query(
        `SELECT
           s.id,
           s.admission_number,
           s.student_name,
           s.phone,
           s.photo,
           s.class_id,
           c.class_name,
           c.section,
           fs.academic_session,
           fs.admission_fee,
           fs.monthly_tuition_fee,
           fs.other_charges
         FROM students AS s
         LEFT JOIN classes AS c
           ON c.id = s.class_id AND c.school_id = s.school_id
         LEFT JOIN fee_structure AS fs
           ON fs.class_id = s.class_id AND fs.school_id = s.school_id
          AND fs.academic_session = (
            SELECT MAX(fs2.academic_session)
            FROM fee_structure AS fs2
            WHERE fs2.class_id = s.class_id AND fs2.school_id = s.school_id
          )
         WHERE s.id = ? AND s.school_id = ?
         LIMIT 1`,
        [studentId, req.student.schoolId]
      );

      if (studentRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student record not found.",
        });
      }

      const student = studentRows[0];
      const academicSession = student.academic_session || null;
      let feeOverview = null;

      // The existing fee system records tuition month-by-month.
      // Keep tuition separate from admission and other charges.
      if (
        academicSession &&
        student.monthly_tuition_fee !== null &&
        student.monthly_tuition_fee !== undefined
      ) {
        const annualTuitionFee =
          Number(student.monthly_tuition_fee || 0) * 12;

        const [paidRows] = await db.query(
          `SELECT COALESCE(SUM(pm.amount_paid), 0) AS tuition_paid
           FROM payment_months AS pm
           WHERE pm.school_id = ? AND pm.student_id = ?
             AND pm.academic_session = ?`,
          [req.student.schoolId, studentId, academicSession]
        );

        const tuitionPaid = Number(paidRows[0]?.tuition_paid || 0);

        feeOverview = {
          academicSession,
          monthlyTuitionFee: Number(student.monthly_tuition_fee || 0),
          annualTuitionFee,
          tuitionPaid,
          pendingTuitionFee: Math.max(0, annualTuitionFee - tuitionPaid),
          feeStatus:
            tuitionPaid >= annualTuitionFee
              ? "Paid"
              : tuitionPaid > 0
                ? "Partial"
                : "Pending",
          admissionFee: Number(student.admission_fee || 0),
          otherCharges: Number(student.other_charges || 0),
        };
      }

      // Only the logged-in student's five latest payment records.
      const [paymentRows] = await db.query(
        `SELECT
           id,
           academic_session,
           amount_paid,
           payment_date,
           payment_mode,
           receipt_number
         FROM payments
         WHERE student_id = ? AND school_id = ?
         ORDER BY payment_date DESC, id DESC
         LIMIT 5`,
        [studentId, req.student.schoolId]
      );

      const recentPayments = paymentRows.map((payment) => ({
        id: payment.id,
        academicSession: payment.academic_session,
        amount: Number(payment.amount_paid || 0),
        paymentDate:
          typeof payment.payment_date === "string"
            ? payment.payment_date.slice(0, 10)
            : payment.payment_date
              ? new Date(payment.payment_date).toISOString().slice(0, 10)
              : null,
        paymentMode: payment.payment_mode,
        receiptNumber: payment.receipt_number,
      }));

      return res.json({
        success: true,
        school: {
          schoolName: school.school_name || "",
          principalName: school.principal_name || "",
          academicSession: school.academic_session || academicSession || "",
          address: school.address || "",
          phone: school.phone || "",
          email: school.email || "",
          logo: school.logo || "",
          principalSignature: school.principal_signature || "",
        },
        student: {
          id: student.id,
          admissionNumber: student.admission_number,
          name: student.student_name,
          phone: student.phone,
          photo: student.photo,
          classId: student.class_id,
          className: student.class_name,
          section: student.section,
        },
        academicSession,
        feeOverview,
        recentPayments,
      });
    } catch (error) {
      console.error("Student dashboard error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to load student dashboard.",
      });
    }
  }
);
// ======================================================
// STUDENT PORTAL: SECURE PHOTO ACCESS
// GET /api/student-portal/photo
// A student can retrieve only their own saved photo.
// ======================================================

app.get(
  "/api/student-portal/photo",
  authenticateStudent,
  async (req, res) => {
    try {
      const studentId = Number(req.student.studentId);

      if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid student authentication.",
        });
      }

      const [rows] = await db.query(
        "SELECT photo FROM students WHERE id = ? AND school_id = ? LIMIT 1",
        [studentId, req.student.schoolId]
      );

      if (rows.length === 0 || !rows[0].photo) {
        return res.status(404).json({
          success: false,
          message: "Student photo not found.",
        });
      }

      // Accept only the expected saved student-photo filename.
      const match = rows[0].photo.match(
        /^uploads\/students\/(student-[a-f0-9-]+\.jpg)$/i
      );

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Invalid student photo path.",
        });
      }

      const filename = match[1];

      const photoPath = path.resolve(
        studentUploadDir,
        filename
      );

      // Ensure the file remains inside the student upload folder.
      if (
        path.dirname(photoPath) !==
        path.resolve(studentUploadDir)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid photo path.",
        });
      }

      await fs.promises.access(photoPath);

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");

      return res.sendFile(photoPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          message: "Student photo file not found.",
        });
      }

      console.error("Student portal photo error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to load student photo.",
      });
    }
  }
);
// STUDENT PAYMENT HISTORY
app.get(
  "/api/student-portal/payments",
  authenticateStudent,
  async (req, res) => {
    try {
      const studentId = req.student.studentId;

      const [payments] = await db.query(
        `SELECT
          p.id,
          p.amount_paid,
          p.payment_date,
          p.payment_mode,
          p.receipt_number,
          p.academic_session,
          p.remarks
        FROM payments p
        WHERE p.student_id = ? AND p.school_id = ?
        ORDER BY p.payment_date DESC, p.id DESC`,
        [studentId, req.student.schoolId]
      );

      const paymentHistory = [];

      for (const payment of payments) {
        const breakdown = await loadPaymentBreakdown(
          db,
          req.student.schoolId,
          payment.id
        );

        paymentHistory.push({
          ...payment,
          feeMonths: breakdown.feeMonths,
          monthDetails: breakdown.monthDetails,
          extraCharges: breakdown.extraCharges,
        });
      }

      return res.json({
        success: true,
        payments: paymentHistory,
      });
    } catch (error) {
      console.error("Student payment history error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load payment history.",
      });
    }
  }
);

// ======================================================
// STUDENT: GET INDIVIDUAL PAYMENT RECEIPT
// ======================================================

app.get(
  "/api/student-portal/payments/:id",
  authenticateStudent,
  async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      const studentId = req.student.studentId;

      if (!Number.isInteger(paymentId) || paymentId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID.",
        });
      }

      // Only fetch a receipt belonging to the logged-in student.
      const [rows] = await db.query(
        `SELECT
           p.id,
           p.student_id,
           s.admission_number,
           s.student_name,
           s.father_name,
           s.class_id,
           c.class_name,
           c.section,
           p.academic_session,
           p.amount_paid,
           p.payment_date,
           p.payment_mode,
           p.receipt_number,
           p.remarks
         FROM payments AS p
         INNER JOIN students AS s ON s.id = p.student_id AND s.school_id = p.school_id
         LEFT JOIN classes AS c ON c.id = s.class_id AND c.school_id = p.school_id
         WHERE p.id = ?
           AND p.student_id = ?
           AND p.school_id = ?
           AND p.receipt_number IS NOT NULL
           AND p.receipt_number <> ''`,
        [paymentId, studentId, req.student.schoolId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found.",
        });
      }

      const breakdown = await loadPaymentBreakdown(
        db,
        req.student.schoolId,
        paymentId
      );

      return res.json({
        success: true,
        data: {
          ...rows[0],
          ...breakdown,
        },
      });
    } catch (error) {
      console.error("Student receipt error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch receipt.",
      });
    }
  }
);

// ======================================================
// UNKNOWN ROUTES
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ======================================================
// UNEXPECTED ERRORS
// ======================================================

app.use((error, req, res, next) => {
  console.error("Unexpected server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// ======================================================
// START SERVER
// ======================================================

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log("Network interface: 0.0.0.0");
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  await testConnection();
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other server or choose another port.`
    );
  } else {
    console.error("Backend server error:", error.message);
  }
});