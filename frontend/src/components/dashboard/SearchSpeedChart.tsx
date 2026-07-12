import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartData {
  time: string;
  ms: number;
}

interface SearchSpeedChartProps {
  data?: ChartData[];
}

const defaultData: ChartData[] = [
  { time: '10:00', ms: 12 },
  { time: '10:15', ms: 14 },
  { time: '10:30', ms: 9 },
  { time: '10:45', ms: 21 },
  { time: '11:00', ms: 11 },
  { time: '11:15', ms: 16 },
  { time: '11:30', ms: 8 },
];

export default function SearchSpeedChart({ data = defaultData }: SearchSpeedChartProps) {
  const [secondaryColor, setSecondaryColor] = useState('#33D6C0');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styles = getComputedStyle(document.documentElement);
      const color = styles.getPropertyValue('--color-secondary').trim();
      if (color) setSecondaryColor(color);
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[160px] flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-mono tracking-wider text-neutral-content uppercase">
          Vector Search Time
        </span>
        <span className="text-xs font-mono font-bold text-secondary">
          Avg: {Math.round(data.reduce((acc, d) => acc + d.ms, 0) / data.length)}ms
        </span>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <XAxis
              dataKey="time"
              stroke="#8E97AC"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={5}
            />
            <YAxis
              stroke="#8E97AC"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dx={-5}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-base-300)',
                borderColor: 'var(--color-neutral)',
                borderRadius: '8px',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: 'var(--color-base-content)',
              }}
              labelStyle={{ color: 'var(--color-neutral-content)' }}
            />
            <Line
              type="monotone"
              dataKey="ms"
              stroke={secondaryColor}
              strokeWidth={1.5}
              dot={{ r: 2, strokeWidth: 1 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
