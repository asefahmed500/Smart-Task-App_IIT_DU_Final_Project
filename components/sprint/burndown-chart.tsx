'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface BurndownPoint {
  date: string
  ideal: number
  actual: number
}

interface BurndownChartProps {
  data: BurndownPoint[]
  useStoryPoints?: boolean
  height?: number
}

export function BurndownChart({ data, useStoryPoints = false, height = 250 }: BurndownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-text text-sm">
        No burndown data available
      </div>
    )
  }

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const unit = useStoryPoints ? 'pts' : 'tasks'

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            stroke="var(--color-muted-text)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            stroke="var(--color-muted-text)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(label: any) => typeof label === 'string' ? formatDay(label) : label}
            formatter={(value: any) => [`${typeof value === 'number' ? value : 0} ${unit}`, undefined]}
          />
          <Legend
            verticalAlign="bottom"
            height={24}
            iconType="line"
            formatter={(value) => (
              <span style={{ color: 'var(--color-body-text)', fontSize: '11px' }}>
                {value === 'ideal' ? 'Ideal' : 'Actual'}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="var(--color-muted-text)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            name="ideal"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            name="actual"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
