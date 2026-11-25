import test from "node:test";
import assert from "node:assert/strict";
import {
  createJobSchema,
  resolveJobSort,
  updateJobSchema,
  validateSalaryRange,
} from "../controllers/job.controller.js";
import {
  inferResumeMimeType,
  parseCloudinaryRawUrl,
  sanitizeResumeFilename,
} from "../services/cloudinary.service.js";

test("validateSalaryRange handles 0, undefined, equal, and inverted bounds accurately", () => {
  assert.equal(validateSalaryRange(undefined, undefined), true);
  assert.equal(validateSalaryRange(1000, undefined), true);
  assert.equal(validateSalaryRange(undefined, 0), true);
  assert.equal(validateSalaryRange(0, 1000), true);
  assert.equal(validateSalaryRange(1500, 1500), true);
  assert.equal(validateSalaryRange(100, 0), false);
  assert.equal(validateSalaryRange(3000, 2000), false);
});

test("resolveJobSort maps sort query variants and falls back to newest", () => {
  assert.deepEqual(resolveJobSort("newest"), { createdAt: -1 });
  assert.deepEqual(resolveJobSort("oldest"), { createdAt: 1 });
  assert.deepEqual(resolveJobSort("salary_desc"), {
    salaryMax: -1,
    salaryMin: -1,
    createdAt: -1,
  });
  assert.deepEqual(resolveJobSort("salary_asc"), {
    salaryMin: 1,
    salaryMax: 1,
    createdAt: -1,
  });
  assert.deepEqual(resolveJobSort("unknown"), { createdAt: -1 });
  assert.deepEqual(resolveJobSort(undefined), { createdAt: -1 });
});

test("createJobSchema & updateJobSchema reject salaryMin > 0 when salaryMax === 0 and accept 0 <= 100", () => {
  const validZeroMin = createJobSchema.safeParse({
    title: "Frontend Developer",
    description: "Build accessible web apps with React and TypeScript.",
    skills: ["React"],
    level: "mid",
    type: "full-time",
    salaryMin: 0,
    salaryMax: 100,
  });
  assert.equal(validZeroMin.success, true);

  const invalidZeroMax = createJobSchema.safeParse({
    title: "Frontend Developer",
    description: "Build accessible web apps with React and TypeScript.",
    skills: ["React"],
    level: "mid",
    type: "full-time",
    salaryMin: 100,
    salaryMax: 0,
  });
  assert.equal(invalidZeroMax.success, false);

  const partialUpdateInvalid = updateJobSchema.safeParse({
    salaryMin: 500,
    salaryMax: 0,
  });
  assert.equal(partialUpdateInvalid.success, false);
});

test("parseCloudinaryRawUrl extracts publicId & filename only for matching cloud", () => {
  const parsed = parseCloudinaryRawUrl(
    "https://res.cloudinary.com/dp9npl93f/raw/upload/v1795624988/job-portal/applications/abc123.pdf",
    "dp9npl93f"
  );
  assert.deepEqual(parsed, {
    publicId: "job-portal/applications/abc123.pdf",
    filename: "abc123.pdf",
  });

  const withoutVersion = parseCloudinaryRawUrl(
    "https://res.cloudinary.com/dp9npl93f/raw/upload/job-portal/resumes/my%20cv.docx",
    "dp9npl93f"
  );
  assert.deepEqual(withoutVersion, {
    publicId: "job-portal/resumes/my cv.docx",
    filename: "my_cv.docx",
  });

  assert.equal(
    parseCloudinaryRawUrl(
      "https://res.cloudinary.com/demo/raw/upload/v123/sample_resume.pdf",
      "dp9npl93f"
    ),
    null
  );
  assert.equal(
    parseCloudinaryRawUrl("https://evil.example.com/dp9npl93f/raw/upload/a.pdf", "dp9npl93f"),
    null
  );
});

test("inferResumeMimeType & sanitizeResumeFilename handle PDF, DOC, DOCX, and unsafe chars", () => {
  assert.equal(inferResumeMimeType("cv.PDF"), "application/pdf");
  assert.equal(inferResumeMimeType("cv.doc"), "application/msword");
  assert.equal(
    inferResumeMimeType("cv.docx?foo=bar"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.equal(inferResumeMimeType("cv.txt"), "application/octet-stream");
  assert.equal(sanitizeResumeFilename('my "cv"\r\n.pdf'), "my__cv___.pdf");
  assert.equal(sanitizeResumeFilename("   "), "resume.pdf");
});
