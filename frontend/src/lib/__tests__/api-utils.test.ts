import test from "node:test";
import assert from "node:assert/strict";
import {
  extractErrorMessage,
  getApplicationResumeViewUrl,
  getProfileResumeViewUrl,
  getSavedJobsStorageKey,
  isSafeRedirectPath,
} from "../api";

test("extractErrorMessage handles plain strings, Zod errors, messages, and network fallbacks", () => {
  assert.equal(extractErrorMessage("Forbidden"), "Forbidden");

  assert.equal(
    extractErrorMessage({
      response: {
        data: {
          message: "Validation error",
          errors: {
            fieldErrors: { email: ["Invalid email format"] },
            formErrors: [],
          },
        },
      },
    }),
    "email: Invalid email format"
  );

  assert.equal(
    extractErrorMessage({
      response: {
        data: {
          message: "Validation error",
          errors: {
            fieldErrors: {},
            formErrors: ["Salary range is invalid"],
          },
        },
      },
    }),
    "Salary range is invalid"
  );

  assert.equal(
    extractErrorMessage({
      response: {
        data: {
          message: "Account is disabled",
        },
      },
    }),
    "Account is disabled"
  );

  assert.equal(
    extractErrorMessage({
      response: undefined,
      code: "ECONNABORTED",
      message: "timeout of 5000ms exceeded",
    }),
    "Request timed out"
  );

  assert.equal(
    extractErrorMessage({
      response: undefined,
      message: "Network Error",
    }),
    "Network Error"
  );
});

test("isSafeRedirectPath allows internal paths and blocks protocol-relative or external URLs", () => {
  assert.equal(isSafeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(isSafeRedirectPath("/jobs/123?tab=apply"), "/jobs/123?tab=apply");
  assert.equal(isSafeRedirectPath("//evil.com"), null);
  assert.equal(isSafeRedirectPath("https://evil.com"), null);
  assert.equal(isSafeRedirectPath("http://localhost:3000"), null);
  assert.equal(isSafeRedirectPath(""), null);
  assert.equal(isSafeRedirectPath(null), null);
});

test("getSavedJobsStorageKey isolates saved jobs per user and guest", () => {
  assert.equal(
    getSavedJobsStorageKey("65f000000000000000000001"),
    "job_portal_saved_jobs:65f000000000000000000001"
  );
  assert.equal(
    getSavedJobsStorageKey("  user-2  "),
    "job_portal_saved_jobs:user-2"
  );
  assert.equal(getSavedJobsStorageKey(null), "job_portal_saved_jobs:guest");
  assert.equal(getSavedJobsStorageKey(undefined), "job_portal_saved_jobs:guest");
  assert.equal(getSavedJobsStorageKey("   "), "job_portal_saved_jobs:guest");
});

test("resume view URL helpers point to authenticated backend streaming endpoints", () => {
  assert.ok(getProfileResumeViewUrl().endsWith("/api/profile/seeker/resume"));
  assert.ok(
    getApplicationResumeViewUrl("app-123").endsWith(
      "/api/applications/app-123/resume"
    )
  );
});
