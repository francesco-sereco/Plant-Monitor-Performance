export function calculateCompliance(
  value: number | null,
  min: number | null,
  max: number | null
): "compliant" | "out_of_limit" | "limit_not_configured" | "incomplete" {
  if (value == null) return "incomplete";
  if (min == null && max == null) return "limit_not_configured";
  if (min != null && value < min) return "out_of_limit";
  if (max != null && value > max) return "out_of_limit";
  return "compliant";
}

export function calculateReduction(
  initialValue: number | null,
  finalValue: number | null
): number | null {
  if (initialValue == null || finalValue == null) return null;
  if (initialValue === 0) return null;
  return Math.round(((initialValue - finalValue) / initialValue) * 10000) / 100;
}
