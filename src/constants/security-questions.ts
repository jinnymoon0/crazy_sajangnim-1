/*
 * Fixed list so answers stay comparable. The index is stored with the
 * account; never reorder or remove entries — append only.
 */
export const SECURITY_QUESTIONS = [
  "What city were you born in?",
  "What was the name of your first pet?",
  "What is your favorite clothing brand?",
  "What was the name of your elementary school?",
] as const;

export function isSecurityQuestionIndex(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value < SECURITY_QUESTIONS.length
  );
}
