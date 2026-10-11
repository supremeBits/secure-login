import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = () => new TextEncoder().encode(process.env.SESSION_SECRET);

// stage "pending" = password OK, waiting for 2FA code
// stage "full"    = fully logged in
export async function setSession(payload, maxAgeSeconds) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());

  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function getSession() {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().set("session", "", { path: "/", maxAge: 0 });
}
