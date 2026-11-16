interface LifeDates { birth: number | string | null; death: number | string | null; pendingFields?: string[] }

/** Unresolved source conflicts must never look like confirmed dates. */
export function lifeYears(person: LifeDates): string {
  const label = (field: 'birth' | 'death', title: string) => person[field] ?? `${title}${person.pendingFields?.includes(field) ? '待核实' : '待补'}`
  return `${label('birth', '出生年')} — ${label('death', '逝世年')}`
}
