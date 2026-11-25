import test from "node:test";
import assert from "node:assert/strict";
import {
  formatRelativeDate,
  formatSalaryRange,
  matchesKeyword,
  parsePageParam,
  splitHighlightSegments,
} from "../searchHighlight";

test("splitHighlightSegments highlights ALL occurrences without skipping even matches (/g lastIndex bug fix)", () => {
  const segments = splitHighlightSegments("React and React with react", "react");
  const highlightedParts = segments
    .filter((s) => s.highlighted)
    .map((s) => s.text);
  assert.deepEqual(highlightedParts, ["React", "React", "react"]);

  const vnSegments = splitHighlightSegments(
    "Lập trình viên lập trình hệ thống",
    "lap trinh"
  );
  const vnHighlighted = vnSegments
    .filter((s) => s.highlighted)
    .map((s) => s.text);
  assert.deepEqual(vnHighlighted, ["Lập trình", "lập trình"]);

  const cppSegments = splitHighlightSegments("C++ core and C++ engine", "C++");
  const cppHighlighted = cppSegments
    .filter((s) => s.highlighted)
    .map((s) => s.text);
  assert.deepEqual(cppHighlighted, ["C++", "C++"]);
});

test("matchesKeyword handles Vietnamese diacritics and special characters safely", () => {
  assert.equal(matchesKeyword("Thiết kế UI/UX", "ui/ux"), true);
  assert.equal(matchesKeyword("Phát triển ứng dụng", "ung dung"), true);
  assert.equal(matchesKeyword("Backend C++", "C++"), true);
  assert.equal(matchesKeyword("Node.js Engineer", "python"), false);
});

test("formatSalaryRange formats both ends, single-sided bounds, zero, and negotiable", () => {
  assert.equal(formatSalaryRange(1500, 2500, "vi"), "$1,500 – $2,500");
  assert.equal(formatSalaryRange(0, 1000, "en"), "$0 – $1,000");
  assert.equal(formatSalaryRange(2000, undefined, "vi"), "Từ $2,000");
  assert.equal(formatSalaryRange(2000, undefined, "en"), "From $2,000");
  assert.equal(formatSalaryRange(undefined, 3000, "vi"), "Đến $3,000");
  assert.equal(formatSalaryRange(undefined, 3000, "en"), "Up to $3,000");
  assert.equal(formatSalaryRange(undefined, undefined, "vi"), "Thỏa thuận");
  assert.equal(formatSalaryRange(undefined, undefined, "en"), "Negotiable");
});

test("parsePageParam parses positive integers cleanly and guards NaN or invalid inputs", () => {
  assert.equal(parsePageParam("3"), 3);
  assert.equal(parsePageParam("abc"), 1);
  assert.equal(parsePageParam("-2"), 1);
  assert.equal(parsePageParam("0"), 1);
  assert.equal(parsePageParam(null), 1);
});

test("formatRelativeDate renders today, yesterday, and days ago in vi and en", () => {
  const now = Date.UTC(2026, 10, 24, 12, 0, 0);
  assert.equal(
    formatRelativeDate(new Date(now - 2 * 3600 * 1000).toISOString(), "vi", now),
    "Hôm nay"
  );
  assert.equal(
    formatRelativeDate(new Date(now - 2 * 3600 * 1000).toISOString(), "en", now),
    "Today"
  );
  assert.equal(
    formatRelativeDate(new Date(now - 24 * 3600 * 1000).toISOString(), "vi", now),
    "Hôm qua"
  );
  assert.equal(
    formatRelativeDate(new Date(now - 24 * 3600 * 1000).toISOString(), "en", now),
    "Yesterday"
  );
  assert.equal(
    formatRelativeDate(new Date(now - 3 * 24 * 3600 * 1000).toISOString(), "vi", now),
    "3 ngày trước"
  );
});
