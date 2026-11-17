const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("./db");

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;
const JWT_SECRET = process.env.STUDENT_JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("A strong STUDENT_JWT_SECRET is required in backend/.env");
}

// ==========================================
// CUSTOM ERROR HANDLER
// ==========================================

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function handleError(res, error, label) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(`${label}:`, error.message);
  return res.status(500).json({
    message: "Something went wrong. Please try again later.",
  });
}

// ==========================================
// VALIDATION HELPERS
// ==========================================

function normalizeAdmissionNumber(value) {
  return String(value || "").trim();
}

function normalizeSchoolCode(value) {
  return String(value || "").trim().toUpperCase();
}

function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

// ==========================================
// SCHOOL AND STUDENT DATABASE HELPERS
// ==========================================

async function findActiveSchool(schoolCode) {
  const [rows] = await db.execute(
    `SELECT id, school_code
     FROM schools
     WHERE school_code = ? AND status = 'active'
     LIMIT 1`,
    [normalizeSchoolCode(schoolCode)]
  );

  return rows[0] || null;
}

async function findStudent(schoolId, admissionNumber) {
  const [rows] = await db.execute(
    `SELECT
       id,
       school_id,
       admission_number,
       student_name,
       password_hash,
       class_id
     FROM students
     WHERE school_id = ? AND admission_number = ?
     LIMIT 1`,
    [schoolId, normalizeAdmissionNumber(admissionNumber)]
  );

  return rows[0] || null;
}

async function findStudentBySchoolCode(schoolCode, admissionNumber) {
  const school = await findActiveSchool(schoolCode);
  if (!school) return null;

  const student = await findStudent(school.id, admissionNumber);
  return student ? { ...student, school_code: school.school_code } : null;
}

// ==========================================
// STUDENT JWT
// ==========================================

function createStudentToken(student) {
  return jwt.sign(
    {
      studentId: student.id,
      admissionNumber: student.admission_number,
      schoolId: student.school_id,
      role: "student",
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

// ==========================================
// STUDENT AUTHENTICATION MIDDLEWARE
// ==========================================

async function authenticateStudent(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Student authentication required.",
    });
  }

  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);

    if (
      decoded.role !== "student" ||
      !Number.isSafeInteger(Number(decoded.studentId)) ||
      Number(decoded.studentId) <= 0 ||
      !Number.isSafeInteger(Number(decoded.schoolId)) ||
      Number(decoded.schoolId) <= 0 ||
      !decoded.admissionNumber
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const [rows] = await db.execute(
      `SELECT s.id, s.school_id, s.admission_number
       FROM students s
       INNER JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ?
         AND s.school_id = ?
         AND s.admission_number = ?
         AND sc.status = 'active'
       LIMIT 1`,
      [
        Number(decoded.studentId),
        Number(decoded.schoolId),
        String(decoded.admissionNumber),
      ]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message:
          "Student account no longer exists or the school is inactive. Please contact the school.",
      });
    }

    req.student = {
      studentId: rows[0].id,
      schoolId: rows[0].school_id,
      admissionNumber: rows[0].admission_number,
      role: "student",
    };

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired student token.",
      });
    }

    console.error("Student authentication error:", error.message);
    return res.status(500).json({
      message: "Unable to verify student authentication.",
    });
  }
}

// ==========================================
// 1. STUDENT LOGIN
// POST /api/student-auth/login
// Requires: schoolCode, admissionNumber, password
// The admin creates the student's password.
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { schoolCode, admissionNumber, password } = req.body;

    if (!schoolCode || !admissionNumber || !password) {
      throw new AppError(
        "School Code, admission number and password are required."
      );
    }

    const student = await findStudentBySchoolCode(
      schoolCode,
      admissionNumber
    );

    if (!student || !student.password_hash) {
      throw new AppError(
        "Invalid School Code, admission number or password. If you have not received a password, contact the school administrator.",
        401
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!passwordMatches) {
      throw new AppError(
        "Invalid School Code, admission number or password.",
        401
      );
    }

    const token = createStudentToken(student);

    return res.json({
      message: "Student login successful.",
      token,
      student: {
        id: student.id,
        admissionNumber: student.admission_number,
        name: student.student_name,
        classId: student.class_id,
        schoolCode: student.school_code,
      },
    });
  } catch (error) {
    return handleError(res, error, "Student login error");
  }
});

// ==========================================
// 2. GET LOGGED-IN STUDENT PROFILE
// GET /api/student-auth/me
// ==========================================

router.get("/me", authenticateStudent, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         id,
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
         photo
       FROM students
       WHERE id = ? AND school_id = ?
       LIMIT 1`,
      [req.student.studentId, req.student.schoolId]
    );

    if (rows.length === 0) {
      throw new AppError("Student record not found.", 404);
    }

    return res.json({ student: rows[0] });
  } catch (error) {
    return handleError(res, error, "Student profile error");
  }
});

module.exports = {
  router,
  authenticateStudent,
};
