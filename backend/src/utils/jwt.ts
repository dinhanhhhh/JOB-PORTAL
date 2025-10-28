// backend/src/utils/jwt.ts
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";
import type { UserRole } from "../types/common";

// Kiểu chuỗi thời gian hợp lệ theo ms (vd: "15m", "7d", "3600", "500ms")
type MsString = import("ms").StringValue;

type Payload = { sub: string; role: UserRole };

function getAccessSecret(): Secret {
  return (process.env.JWT_ACCESS_SECRET ??
    "dev_access_secret_change_me") as Secret;
}
function getRefreshSecret(): Secret {
  return (process.env.JWT_REFRESH_SECRET ??
    "dev_refresh_secret_change_me") as Secret;
}

// Regex đơn giản để xác thực "s/m/h/d/w/y/ms" hoặc số thuần (giây)
const MS_TOKEN_RE = /^\d+(ms|s|m|h|d|w|y)$/i;
const NUMBER_RE = /^\d+$/;

function buildExpiresIn(
  envVal: string | undefined,
  fallback: MsString | number
): SignOptions {
  let expiresIn: MsString | number = fallback;

  if (envVal) {
    if (NUMBER_RE.test(envVal)) {
      // số thuần => dùng number
      expiresIn = Number(envVal);
    } else if (MS_TOKEN_RE.test(envVal)) {
      // dạng "15m", "7d", "500ms" => coi là MsString
      expiresIn = envVal as unknown as MsString;
    } else {
      // giá trị không hợp lệ -> giữ fallback
    }
  }

  return { expiresIn };
}

export function signAccessToken(userId: string, role: UserRole): string {
  const payload: Payload = { sub: userId, role };
  const secret: Secret = getAccessSecret();
  const options: SignOptions = buildExpiresIn(
    process.env.JWT_ACCESS_EXPIRES,
    "15m" as MsString
  );
  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(userId: string, role: UserRole): string {
  const payload: Payload = { sub: userId, role };
  const secret: Secret = getRefreshSecret();
  const options: SignOptions = buildExpiresIn(
    process.env.JWT_REFRESH_EXPIRES,
    "7d" as MsString
  );
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string): Payload {
  return jwt.verify(token, getAccessSecret()) as Payload;
}

export function verifyRefreshToken(token: string): Payload {
  return jwt.verify(token, getRefreshSecret()) as Payload;
}
