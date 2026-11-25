import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import {
  buildDiacriticPattern,
  buildWordBoundaryRegexPattern,
  escapeRegex,
  isValidObjectId,
  normalizeEmail,
  parseBoundedInt,
  parseNonNegativeNumber,
} from "../utils/validation.js";
import { createRateLimiter, resetRateLimits } from "../middlewares/rateLimit.js";

test("escapeRegex escapes special regex characters such as C++, .NET, and parentheses", () => {
  assert.equal(escapeRegex("C++"), "C\\+\\+");
  assert.equal(escapeRegex(".NET"), "\\.NET");
  assert.equal(escapeRegex("Ho Chi Minh (HCM)"), "Ho Chi Minh \\(HCM\\)");
  assert.equal(new RegExp(escapeRegex("C++")).test("Experience with C++"), true);
});

test("buildDiacriticPattern matches Vietnamese text regardless of diacritics or special chars", () => {
  const daNangRegex = new RegExp(buildDiacriticPattern("da nang"), "i");
  assert.equal(daNangRegex.test("Làm việc tại Đà Nẵng."), true);

  const cppRegex = new RegExp(buildDiacriticPattern("C++"), "i");
  assert.equal(cppRegex.test("Experience with C++ and Rust"), true);
});

test("buildWordBoundaryRegexPattern handles Vietnamese diacritics and prevents substring false positives", () => {
  const ngheRegex = new RegExp(buildWordBoundaryRegexPattern("nghe"), "i");
  assert.equal(ngheRegex.test("công nghệ thông tin"), true);

  const ungDungRegex = new RegExp(buildWordBoundaryRegexPattern("ung dung"), "i");
  assert.equal(ungDungRegex.test("Phát triển ứng dụng web"), true);

  const uiRegex = new RegExp(buildWordBoundaryRegexPattern("ui"), "i");
  assert.equal(uiRegex.test("Thiết kế UI/UX chuyên nghiệp"), true);
  assert.equal(uiRegex.test("build scalable systems"), false);

  const cppRegex = new RegExp(buildWordBoundaryRegexPattern("C++"), "i");
  assert.equal(cppRegex.test("Experience with C++ and Rust"), true);
});

test("parseBoundedInt safely parses integers and clamps bounds", () => {
  assert.equal(parseBoundedInt("abc", 10, 1, 100), 10);
  assert.equal(parseBoundedInt("12abc", 10, 1, 100), 10);
  assert.equal(parseBoundedInt("-5", 10, 1, 100), 1);
  assert.equal(parseBoundedInt("999", 10, 1, 100), 100);
  assert.equal(parseBoundedInt("25", 10, 1, 100), 25);
  assert.equal(parseBoundedInt(undefined, 1, 1, 50), 1);
});

test("parseNonNegativeNumber validates numbers and rejects negative or NaN values", () => {
  assert.equal(parseNonNegativeNumber("1500"), 1500);
  assert.equal(parseNonNegativeNumber("0"), 0);
  assert.equal(parseNonNegativeNumber("-1"), undefined);
  assert.equal(parseNonNegativeNumber("abc"), undefined);
  assert.equal(parseNonNegativeNumber(""), undefined);
  assert.equal(parseNonNegativeNumber(undefined), undefined);
});

test("isValidObjectId and normalizeEmail validate and normalize correctly", () => {
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("not-an-id"), false);
  assert.equal(isValidObjectId(undefined), false);
  assert.equal(normalizeEmail("  User.Name@Example.COM "), "user.name@example.com");
});

test("createRateLimiter allows requests up to max and blocks the next with 429 + retryAfter", () => {
  resetRateLimits();
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 3,
    message: "Too many requests",
    keyPrefix: "test-limiter",
  });

  const makeRes = () => {
    const state: { statusCode: number; body: unknown } = { statusCode: 200, body: null };
    const res = {
      status(code: number) {
        state.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        state.body = payload;
        return this;
      },
    } as unknown as Response;
    return { res, state };
  };

  const req = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } } as unknown as Request;

  for (let i = 0; i < 3; i += 1) {
    let nextCalled = false;
    const { res } = makeRes();
    const next: NextFunction = () => {
      nextCalled = true;
    };
    limiter(req, res, next);
    assert.equal(nextCalled, true);
  }

  let blockedNextCalled = false;
  const blocked = makeRes();
  limiter(req, blocked.res, () => {
    blockedNextCalled = true;
  });

  assert.equal(blockedNextCalled, false);
  assert.equal(blocked.state.statusCode, 429);
  assert.equal((blocked.state.body as { message: string }).message, "Too many requests");
  assert.equal(typeof (blocked.state.body as { retryAfter: number }).retryAfter, "number");
  assert.ok((blocked.state.body as { retryAfter: number }).retryAfter >= 1);
});
