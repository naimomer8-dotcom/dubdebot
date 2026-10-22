export const PRIVACY_VERSION = "v1-2026-10";

export const BUSINESS_NAME = "קבוצת דובדבני (RND)";

/**
 * Marketing consent (סעיף 30א לחוק התקשורת). Required on every signup and at the consent gate.
 * The exact wording and its version are stored with each consent; bump the version whenever the text changes.
 */
export const MARKETING_CONSENT_TEXT =
  "אני מאשר/ת לקבל דיוור, עדכונים ותוכן שיווקי מניר דובדבני ומקבוצת דובדבני בוואטסאפ, SMS ומייל. אפשר להסיר את ההסכמה בכל עת.";
export const MARKETING_CONSENT_VERSION = "v1-2026-10-21";

/** Wording of the earlier, optional checkbox (kept for the Meta lead form records and old consents). */
export const LEGACY_MARKETING_CONSENT_TEXT =
  "אני מסכים/ה לקבל מקבוצת דובדבני (RND) דברי פרסומת, תוכן מקצועי, הזמנות לאירועים והצעות שיווקיות במייל, ב-SMS ובוואטסאפ. ידוע לי שאפשר להסיר את עצמי בכל עת.";

export const TERMS_TEXT = "קראתי ואני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות";

/** Consent counts only if it was given on the current mandatory wording. */
export const hasCurrentConsent = (u: { marketing_consent?: unknown; marketing_consent_text_version?: unknown } | null | undefined) =>
  !!u && u.marketing_consent === true && u.marketing_consent_text_version === MARKETING_CONSENT_VERSION;

export type ConsentSource = "signup" | "signup_claim" | "gate" | "meta_lead_form";

/** The columns written for one consent. */
export function consentFields(source: ConsentSource, ip: string | null, at = new Date().toISOString()) {
  return {
    marketing_consent: true,
    marketing_consent_at: at,
    marketing_consent_ip: ip,
    marketing_consent_text_version: MARKETING_CONSENT_VERSION,
    marketing_consent_source: source,
    consent_text: MARKETING_CONSENT_TEXT,
  };
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
