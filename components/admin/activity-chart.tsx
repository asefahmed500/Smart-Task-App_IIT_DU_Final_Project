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
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            cursor={{ 
              fill: 'var(--primary)', 
              opacity: 0.05
            } as any}
            contentStyle={{ 
              backgroundColor: 'var(--background)', 
              borderColor: 'var(--border)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              borderWidth: '1px',
              boxShadow: 'var(--shadow-lg)',
              padding: '12px'
            }}
            itemStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px' }}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]}
            animationDuration={1500}
            animationEasing="ease-in-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill="url(#barGradient)"
                className="transition-all duration-500 hover:brightness-110 cursor-pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

