/**
 * Lets Convex read Firebase ID tokens sent as `Authorization: Bearer <token>`.
 * Only the admin dashboard does this (Google sign-in); convex/admin.ts then checks
 * the email against ADMIN_EMAILS. Phone sign-in tokens carry no email, so they never pass.
 */
const projectId = process.env.FIREBASE_PROJECT_ID ?? "kamana-b2c23";

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      jwks: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      algorithm: "RS256",
    },
  ],
};
