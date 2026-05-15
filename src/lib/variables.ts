/**
 * Resolves dynamic variables in strings.
 * Supports:
 * {hoy}, {ayer}, {mañana}
 * {inicio_mes}, {fin_mes}
 * {inicio_año}, {fin_año}
 * {mes_actual}, {año_actual}
 * {hace_N_dias}, {dentro_de_N_dias}
 * {inicio_semana}, {fin_semana}
 */
export function resolveVariables(input: string): string {
  if (typeof input !== "string") return input;

  const now = new Date();
  
  // For filters, ISO format is best as it handles both date and timestamp columns well.
  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatDateTime = (d: Date) => d.toISOString();
  
  const variables: Record<string, () => string> = {
    "{hoy}": () => formatDate(now),
    "{ayer}": () => {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return formatDate(d);
    },
    "{mañana}": () => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return formatDate(d);
    },
    "{inicio_mes}": () => {
      return formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    },
    "{fin_mes}": () => {
      return formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    },
    "{inicio_año}": () => {
      return formatDate(new Date(now.getFullYear(), 0, 1));
    },
    "{fin_año}": () => {
      return formatDate(new Date(now.getFullYear(), 11, 31));
    },
    "{inicio_semana}": () => {
      const d = new Date(now);
      const day = d.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      return formatDate(new Date(d.setDate(diff)));
    },
    "{fin_semana}": () => {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust to Sunday
      return formatDate(new Date(d.setDate(diff)));
    },
    "{mes_actual}": () => String(now.getMonth() + 1).padStart(2, "0"),
    "{año_actual}": () => String(now.getFullYear()),
  };

  let result = input;

  // Handle {hace_N_dias} and {dentro_de_N_dias}
  const relativeMatch = result.match(/\{(hace|dentro_de)_(\d+)_dias\}/g);
  if (relativeMatch) {
    for (const m of relativeMatch) {
      const parts = m.slice(1, -1).split("_");
      const isPast = parts[0] === "hace";
      const count = Number(parts[parts.length - 2]);
      const d = new Date(now);
      d.setDate(d.getDate() + (isPast ? -count : count));
      result = result.split(m).join(formatDate(d));
    }
  }

  for (const [v, resolver] of Object.entries(variables)) {
    if (result.includes(v)) {
      result = result.split(v).join(resolver());
    }
  }

  return result;
}

/**
 * Resolves variables in a value (string, number, or object).
 */
export function resolveValueVariables<T>(val: T): T {
  if (typeof val === "string") {
    return resolveVariables(val) as unknown as T;
  }
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const res = { ...val } as Record<string, unknown>;
    for (const k in res) {
      res[k] = resolveValueVariables(res[k]);
    }
    return res as unknown as T;
  }
  return val;
}
