import test from "node:test";
import assert from "node:assert/strict";
import {
  canWithdrawApplication,
  countApplicationsByStatus,
  getApplicationTimelineStep,
  safeGetJobInfo,
  safeGetSeekerInfo,
} from "../applicationUtils";

test("safeGetJobInfo safely handles null, undefined, string IDs, and populated job objects", () => {
  assert.deepEqual(safeGetJobInfo(null), {
    id: null,
    title: null,
    companyName: null,
  });
  assert.deepEqual(safeGetJobInfo(undefined), {
    id: null,
    title: null,
    companyName: null,
  });
  assert.deepEqual(safeGetJobInfo("65a1b2c3"), {
    id: "65a1b2c3",
    title: null,
    companyName: null,
  });
  assert.deepEqual(
    safeGetJobInfo({
      _id: "65a1b2c3",
      title: "Senior React Developer",
      company: { _id: "c1", name: "TechCorp" },
    }),
    {
      id: "65a1b2c3",
      title: "Senior React Developer",
      companyName: "TechCorp",
    }
  );
});

test("safeGetSeekerInfo safely extracts name and email only for populated objects", () => {
  assert.deepEqual(safeGetSeekerInfo("u1"), { name: null, email: null });
  assert.deepEqual(safeGetSeekerInfo(null), { name: null, email: null });
  assert.deepEqual(
    safeGetSeekerInfo({ name: "Dev Seeker", email: "dev@example.com" }),
    { name: "Dev Seeker", email: "dev@example.com" }
  );
});

test("canWithdrawApplication allows submitted and viewed while blocking decided statuses", () => {
  assert.equal(canWithdrawApplication("submitted"), true);
  assert.equal(canWithdrawApplication("viewed"), true);
  assert.equal(canWithdrawApplication("accepted"), false);
  assert.equal(canWithdrawApplication("rejected"), false);
});

test("countApplicationsByStatus and getApplicationTimelineStep calculate counts and stages accurately", () => {
  const counts = countApplicationsByStatus([
    { status: "submitted" },
    { status: "submitted" },
    { status: "viewed" },
    { status: "accepted" },
  ]);
  assert.deepEqual(counts, {
    all: 4,
    submitted: 2,
    viewed: 1,
    accepted: 1,
    rejected: 0,
  });

  assert.equal(getApplicationTimelineStep("submitted"), 1);
  assert.equal(getApplicationTimelineStep("viewed"), 2);
  assert.equal(getApplicationTimelineStep("accepted"), 3);
  assert.equal(getApplicationTimelineStep("rejected"), 3);
});
