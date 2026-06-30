const ROLE_LABELS: Record<string, string> = {
  admin: "Amministratore",
  assistenza: "Assistenza tecnica",
  commerciale: "Commerciale",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
