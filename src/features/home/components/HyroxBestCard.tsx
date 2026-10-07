import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Text, View } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import { Card } from '@/components/ui';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import type { HyroxRun } from '../summary';

const t = fr.home.hyrox;

/** Carte « Meilleure simu Hyrox » (SPEC_V2 §5.5) : meilleur temps et courbe des simus complètes. */
export function HyroxBestCard({ runs }: { runs: readonly HyroxRun[] }) {
  const best = runs.reduce<HyroxRun | null>(
    (b, run) => (!b || run.totalS < b.totalS ? run : b),
    null,
  );
  return (
    <Card className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-body-bold text-18 text-text">{t.title}</Text>
        {runs.length > 0 ? (
          <Text className="font-body text-13 text-muted">{t.count(runs.length)}</Text>
        ) : null}
      </View>
      {best ? (
        <>
          <View className="flex-row items-baseline gap-2.5">
            <Text className="pr-1 font-display text-40 text-volt">{formatClock(best.totalS)}</Text>
            <Text className="font-body text-13 text-muted">
              {format(parseISO(best.endedAt), 'd MMM yyyy', { locale: frLocale })}
            </Text>
          </View>
          {runs.length > 1 ? (
            <LineChart
              height={120}
              data={runs.map((run, index) => ({
                x: index,
                y: run.totalS,
                highlight: run === best,
              }))}
              formatY={(value) => formatClock(Math.round(value))}
              accessibilityLabel={t.chartA11y(runs.length)}
            />
          ) : null}
        </>
      ) : (
        <Text className="font-body text-14 text-muted">{t.empty}</Text>
      )}
    </Card>
  );
}
