function decodePayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch (_error) {
    return null;
  }
}

export function isTokenExpired(token) {
  if (!token) {
    return true;
  }

  const payload = decodePayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

export function clearApplicantSession() {
  localStorage.removeItem("alesun_applicant_token");
  localStorage.removeItem("alesun_applicant_user");
}
