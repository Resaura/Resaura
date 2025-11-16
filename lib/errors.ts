// lib/errors.ts

/** Normalise les messages d'erreurs Supabase/Auth en français */
export function toFrenchAuthError(err: any): string {
  const raw = String(err?.message || err || '');
  const code = String(err?.code || '');

  // Cooldown Supabase
  const m = raw.match(/For security purposes, you can only request this after (\d+) seconds?/i);
  if (m) {
    const s = Number(m[1] || '0');
    return `Pour des raisons de sécurité, vous pourrez réessayer dans ${s} seconde${s > 1 ? 's' : ''}.`;
  }

  if (/user.*already.*registered/i.test(raw) || code === 'user_already_registered') {
    return "Cet e-mail est déjà enregistré. Essayez de vous connecter ou réinitialisez votre mot de passe.";
  }
  if (/invalid login credentials/i.test(raw) || code === 'invalid_credentials') {
    return "Identifiants invalides. Vérifiez l’e-mail et le mot de passe.";
  }
  if (/email.*not.*confirmed/i.test(raw) || code === 'email_not_confirmed') {
    return "Veuillez confirmer votre adresse e-mail via le lien reçu avant de vous connecter.";
  }
  if (/row-level security/i.test(raw)) {
    return "Accès refusé par la sécurité des lignes (RLS). Réessayez dans un instant.";
  }
  if (/network/i.test(raw)) {
    return "Problème réseau. Vérifiez votre connexion.";
  }

  // Défaut
  return raw || "Une erreur est survenue.";
}
