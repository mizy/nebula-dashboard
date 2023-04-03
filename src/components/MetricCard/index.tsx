import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import intl from 'react-intl-universal';

import LineCard from '@/components/DashboardCard/LineCard';
import { VALUE_TYPE } from '@/utils/promQL';
import { ILineChartMetric } from '@/utils/interface';
import { asyncBatchQueries } from '@/requests';
import { calcTimeRange, TIME_OPTION_TYPE } from '@/utils/dashboard';
import { getQueryRangeInfo } from '@/utils';

export interface PromResultMetric {
  componentType: string;
  instance: string;
  instanceName: string;
  nebula_cluster: string;
  __name__: string;
  device?: string;
}

interface IProps {
  valueType: VALUE_TYPE;
  queries: any;
  timeRange: TIME_OPTION_TYPE | [number, number]
  metricTypeFn?: (resultNum: number, refId: string, reusltMetric: PromResultMetric) => string;
}

const MetricCard = forwardRef((props: IProps, ref) => {

  const { valueType, queries, metricTypeFn, timeRange } = props;

  const [metricData, setMetricData] = React.useState<ILineChartMetric[]>([]);

  useImperativeHandle(ref, () => (
    {
      handleRefresh: () => asyncGetMetricData(queries)
    }
  ), [queries]);

  const defaultMetricTypeFn = (resultNum: number, refId: string, resultMetric: PromResultMetric) => {
    return resultNum > 1 ? resultMetric.device + intl.get(`metric_description.${refId}`) : intl.get(`metric_description.${refId}`);
  }

  const asyncGetMetricData = async (queries) => {
    const curTimeRange = calcTimeRange(timeRange);
    const { start, end, step } = getQueryRangeInfo(curTimeRange[0], curTimeRange[1]);
    const data: any = await asyncBatchQueries(queries.map(q => ({
      ...q,
      start,
      end,
      step,
    })));
    const { results } = data;
    if (!results) return [];

    const metricData: ILineChartMetric[] = [];
    Object.keys(results).forEach(key => {
      const { result } = results[key];
      result.forEach(r => {
        r.values.forEach(([timestamp, value]) => {
          metricData.push({
            time: timestamp,
            value: Number(value),
            type: metricTypeFn ? metricTypeFn(result.length, key, r.metric) : defaultMetricTypeFn(result.length, key, r.metric),
          })
        })
      })
    })
    setMetricData(metricData);
    return;
  }

  return (
    <LineCard
      data={metricData}
      valueType={valueType}
      loading={false}
    />
  )
});

export default MetricCard;