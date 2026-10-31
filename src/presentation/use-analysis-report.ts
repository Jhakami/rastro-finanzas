import { useCallback } from 'react';
import type { AnalysisPeriod } from '@/application/analysis-view-model';
import { reportingRepository } from '@/infrastructure/reporting-repository';
import { useFinance } from './finance-provider';
import { useLocalQuery } from './use-local-query';
export function useAnalysisReport(period: AnalysisPeriod, accountId: string | null) {
  const { allCategories, allTags, microThresholdCents, revision } = useFinance();
  return useLocalQuery(
    useCallback(
      () =>
        reportingRepository.report(period, accountId, microThresholdCents, allCategories, allTags),
      [period, accountId, microThresholdCents, allCategories, allTags],
    ),
    revision,
  );
}
