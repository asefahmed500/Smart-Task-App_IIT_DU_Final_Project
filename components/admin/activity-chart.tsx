'use client'

import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell
} from "recharts"

interface ChartProps {
  data: { name: string; value: number }[]
}

export function SystemActivityChart({ data }: ChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
            contentStyle={{ 
              backgroundColor: 'rgba(var(--background), 0.8)', 
              borderColor: 'rgba(var(--border), 0.5)',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)'
            }}
          />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`oklch(0.6 0.15 250 / ${0.3 + (index * 0.1)})`} 
                className="transition-all duration-300 hover:opacity-100"
                style={{ opacity: 0.8 }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
