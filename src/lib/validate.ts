const EMAIL_RE = /^[a-zA-Z0-9._+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/;
const ID_RE = /^[a-zA-Z0-9._-]{1,128}$/;

export function isValidEmail(v: string | null | undefined): v is string {
  return typeof v === "string" && v.length <= 320 && EMAIL_RE.test(v);
}

export function isValidId(v: string | null | undefined): v is string {
  return typeof v === "string" && ID_RE.test(v);
}
