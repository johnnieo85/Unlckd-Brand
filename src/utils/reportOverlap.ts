import { SavedReport } from '../types';
import { getLocalDateString, parseLocalDate, getPlanDurationWeeks } from '../lib/utils';

export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
  startISO: string;
  endISO: string;
  weeks: number;
}

export interface ReportOverlapConflict {
  report1: SavedReport;
  report2: SavedReport;
  range1: ReportDateRange;
  range2: ReportDateRange;
  overlapStartISO: string;
  overlapEndISO: string;
  overlapDays: number;
}

export function getReportDateRange(report: SavedReport): ReportDateRange {
  let startStr = report.userData?.planStartDate;
  if (!startStr && report.timestamp) {
    if (typeof report.timestamp.toDate === 'function') {
      startStr = getLocalDateString(report.timestamp.toDate());
    } else if (typeof report.timestamp === 'string') {
      startStr = report.timestamp.split('T')[0];
    } else if (typeof report.timestamp === 'number') {
      startStr = getLocalDateString(new Date(report.timestamp));
    }
  }
  if (!startStr) {
    startStr = getLocalDateString(new Date());
  }

  const startDate = parseLocalDate(startStr);
  const weeks = getPlanDurationWeeks(report.userData?.planDuration || (report.report as any)?.planOverview?.duration);
  // Date range is inclusive: startDate + (weeks * 7 - 1) days
  const endDate = new Date(startDate.getTime() + (weeks * 7 - 1) * 86400000);

  return {
    startDate,
    endDate,
    startISO: getLocalDateString(startDate),
    endISO: getLocalDateString(endDate),
    weeks
  };
}

/**
 * Checks a list of saved reports for full transformation reports that have overlapping date ranges.
 * Returns a list of conflict details.
 */
export function checkReportOverlaps(reports: SavedReport[]): ReportOverlapConflict[] {
  if (!reports || reports.length < 2) return [];

  // Filter for full transformation reports
  const fullReports = reports.filter(r => r.path === 'full' || (!r.path && r.report?.workoutPlan));
  if (fullReports.length < 2) return [];

  const conflicts: ReportOverlapConflict[] = [];

  for (let i = 0; i < fullReports.length; i++) {
    for (let j = i + 1; j < fullReports.length; j++) {
      const r1 = fullReports[i];
      const r2 = fullReports[j];

      const range1 = getReportDateRange(r1);
      const range2 = getReportDateRange(r2);

      // Overlap condition: start1 <= end2 AND start2 <= end1
      if (range1.startDate.getTime() <= range2.endDate.getTime() && range2.startDate.getTime() <= range1.endDate.getTime()) {
        const overlapStart = new Date(Math.max(range1.startDate.getTime(), range2.startDate.getTime()));
        const overlapEnd = new Date(Math.min(range1.endDate.getTime(), range2.endDate.getTime()));
        const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;

        conflicts.push({
          report1: r1,
          report2: r2,
          range1,
          range2,
          overlapStartISO: getLocalDateString(overlapStart),
          overlapEndISO: getLocalDateString(overlapEnd),
          overlapDays
        });
      }
    }
  }

  return conflicts;
}

/**
 * Helper to check if a specific report ID is involved in any overlap conflict
 */
export function getReportConflicts(reportId: string, conflicts: ReportOverlapConflict[]): ReportOverlapConflict[] {
  return conflicts.filter(c => c.report1.id === reportId || c.report2.id === reportId);
}
