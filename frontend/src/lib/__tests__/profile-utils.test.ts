import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateProfileCompleteness,
  calculateSkillMatch,
  isValidOptionalHttpUrl,
  validateJobSalaryInputs,
} from "../profileUtils";
import {
  POPULAR_REQUIREMENTS,
  POPULAR_SKILLS,
  filterSuggestions,
} from "../suggestions";

test("calculateProfileCompleteness evaluates empty, partial, and complete profiles accurately", () => {
  const emptyResult = calculateProfileCompleteness(null);
  assert.equal(emptyResult.percentage, 0);
  assert.equal(emptyResult.completedCount, 0);
  assert.equal(emptyResult.missingFields.length, 8);

  const partialResult = calculateProfileCompleteness({
    bio: "Full-stack engineer",
    skills: ["React", "Node.js"],
    resumeUrl: "https://example.com/cv.pdf",
    github: "https://github.com/dev",
  });
  assert.equal(partialResult.completedCount, 4);
  assert.equal(partialResult.percentage, 50);
  assert.deepEqual(partialResult.missingFields, [
    "phone",
    "location",
    "experience",
    "education",
  ]);

  const fullResult = calculateProfileCompleteness({
    bio: "Engineer",
    skills: ["TypeScript"],
    phone: "0123456789",
    location: "HCMC",
    experience: "3 years",
    education: "BS CS",
    resumeUrl: "https://example.com/cv.pdf",
    linkedin: "https://linkedin.com/in/dev",
  });
  assert.equal(fullResult.percentage, 100);
  assert.deepEqual(fullResult.missingFields, []);
});

test("calculateSkillMatch performs case-insensitive matching and handles empty job skills", () => {
  assert.deepEqual(calculateSkillMatch([], ["React"]), {
    percentage: 0,
    matched: [],
    missing: [],
  });

  const match = calculateSkillMatch(
    ["React", "TypeScript", "MongoDB", "Docker"],
    ["react", " typescript ", "Python"]
  );
  assert.equal(match.percentage, 50);
  assert.deepEqual(match.matched, ["React", "TypeScript"]);
  assert.deepEqual(match.missing, ["MongoDB", "Docker"]);
});

test("isValidOptionalHttpUrl accepts blank strings and http/https URLs while rejecting invalid schemes", () => {
  assert.equal(isValidOptionalHttpUrl(""), true);
  assert.equal(isValidOptionalHttpUrl("   "), true);
  assert.equal(isValidOptionalHttpUrl("https://github.com/dev"), true);
  assert.equal(isValidOptionalHttpUrl("http://localhost:3000"), true);
  assert.equal(isValidOptionalHttpUrl("ftp://example.com/file"), false);
  assert.equal(isValidOptionalHttpUrl("not-a-url"), false);
});

test("validateJobSalaryInputs allows empty inputs (undefined), handles 0, and rejects inverted or negative ranges", () => {
  assert.deepEqual(validateJobSalaryInputs("", ""), {
    salaryMin: undefined,
    salaryMax: undefined,
  });
  assert.deepEqual(validateJobSalaryInputs("0", "1000"), {
    salaryMin: 0,
    salaryMax: 1000,
  });
  assert.deepEqual(validateJobSalaryInputs("1500", ""), {
    salaryMin: 1500,
    salaryMax: undefined,
  });
  assert.deepEqual(validateJobSalaryInputs("500", "0"), {
    error: "inverted",
  });
  assert.deepEqual(validateJobSalaryInputs("-100", "500"), {
    error: "negative",
  });
  assert.deepEqual(validateJobSalaryInputs("abc", "500"), {
    error: "invalid",
  });
});

test("filterSuggestions excludes selected items, matches Vietnamese diacritics, and respects maxResults", () => {
  const topUnselected = filterSuggestions(
    POPULAR_SKILLS,
    "",
    ["javascript", "TypeScript"],
    3
  );
  assert.equal(topUnselected.length, 3);
  assert.ok(!topUnselected.includes("JavaScript"));
  assert.ok(!topUnselected.includes("TypeScript"));

  const reactMatches = filterSuggestions(POPULAR_SKILLS, "react", ["React"]);
  assert.deepEqual(reactMatches, ["React Native"]);

  const viReqMatches = filterSuggestions(
    POPULAR_REQUIREMENTS.vi,
    "kinh nghiem",
    []
  );
  assert.ok(viReqMatches.length > 0);
  assert.ok(viReqMatches.every((item) => item.toLowerCase().includes("kinh nghiệm")));
});
