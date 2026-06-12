const FEEDBACK_EMAIL = "peiliangkrausse@gmail.com";

export function feedbackPayload(message) {
  const body = String(message || "").trim() || "I want to share feedback about YouTube Summary App.";
  return {
    subject: "YouTube Summary App Feedback",
    body,
    email: FEEDBACK_EMAIL
  };
}

export function mailtoFromPayload(payload) {
  return `mailto:${payload.email}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;
}
