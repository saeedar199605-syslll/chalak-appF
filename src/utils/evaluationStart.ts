import type { Employee, Evaluation, JobProfile } from '../types';

export interface EvaluationStartRow { employeeId: string; code: string; name: string; reason: 'eligible' | 'already_exists' | 'missing_profile' | 'missing_configuration'; }
export interface EvaluationStartPreview { selected: number; eligible: number; alreadyExists: number; ineligible: number; rows: EvaluationStartRow[]; }

export function isEvaluationPeriodActive(activePeriod: string | null | undefined, requestedPeriod: string): boolean {
  return Boolean(activePeriod?.trim()) && activePeriod.trim() === requestedPeriod.trim();
}

export function previewEvaluationStart(employeeIds: string[], period: string, employees: Employee[], profiles: JobProfile[], evaluations: Evaluation[]): EvaluationStartPreview {
  const selected = Array.from(new Set(employeeIds));
  const selectedEmployees = new Map(employees.map(employee => [employee.id, employee]));
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const existing = new Set(evaluations.map(evaluation => `${evaluation.empId}\u0000${evaluation.period}`));
  const rows = selected.map(id => {
    const employee = selectedEmployees.get(id);
    if (!employee || !employee.profileId || !profilesById.has(employee.profileId)) return { employeeId: id, code: employee?.code || '', name: employee?.name || id, reason: 'missing_profile' as const };
    if (existing.has(`${id}\u0000${period}`)) return { employeeId: id, code: employee.code, name: employee.name, reason: 'already_exists' as const };
    const profile = profilesById.get(employee.profileId);
    if (!profile?.items?.length) return { employeeId: id, code: employee.code, name: employee.name, reason: 'missing_configuration' as const };
    return { employeeId: id, code: employee.code, name: employee.name, reason: 'eligible' as const };
  });
  return {
    selected: rows.length,
    eligible: rows.filter(row => row.reason === 'eligible').length,
    alreadyExists: rows.filter(row => row.reason === 'already_exists').length,
    ineligible: rows.filter(row => row.reason === 'missing_profile' || row.reason === 'missing_configuration').length,
    rows,
  };
}

export function buildEvaluationStarts(employeeIds: string[], period: string, employees: Employee[], profiles: JobProfile[], evaluations: Evaluation[], now = Date.now()): Evaluation[] {
  if (!period.trim()) return [];
  const plan = previewEvaluationStart(employeeIds, period.trim(), employees, profiles, evaluations);
  const byId = new Map(employees.map(employee => [employee.id, employee]));
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  return plan.rows.filter(row => row.reason === 'eligible').flatMap(row => {
    const employee = byId.get(row.employeeId)!;
    const profile = profilesById.get(employee.profileId)!;
    return [{
      id: `eval:${encodeURIComponent(period.trim())}:${encodeURIComponent(employee.id)}`,
      empId: employee.id,
      profileId: profile.id,
      period: period.trim(),
      stage: 'self_review',
      status: 'draft' as const,
      currentAssigneeId: employee.id,
      currentAssigneeName: employee.name,
      currentAssigneeRole: employee.role,
      scores: profile.items.map(item => ({ cid: item.cid, weight: item.weight, value: 0, self: 0, doc: '', sourceType: 'supervisor' as const })),
      created: now,
    }];
  });
}
