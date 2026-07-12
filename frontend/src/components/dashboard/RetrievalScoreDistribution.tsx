import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface ScoreData {
  chunkIndex: string;
  score: number;
}

interface RetrievalScoreDistributionProps {
  data?: ScoreData[];
}

const defaultData: ScoreData[] = [
  { chunkIndex: 'Chunk 1', score: 0.92 },
  { chunkIndex: 'Chunk 2', score: 0.88 },
  { chunkIndex: 'Chunk 3', score: 0.74 },
  { chunkIndex: 'Chunk 4', score: 0.61 },
  { chunkIndex: 'Chunk 5', score: 0.48 },
];

export default function RetrievalScoreDistribution({ data = defaultData }: RetrievalScoreDistributionProps) {
  const [cyanColor, setCyanColor] = useState('#33D6C0');
  const [amberColor, setAmberColor] = useState('#F2B84B');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styles = getComputedStyle(document.documentElement);
      const secondary = styles.getPropertyValue('--color-secondary').trim();
      const accent = styles.getPropertyValue('--color-accent').trim();
      if (secondary) setCyanColor(secondary);
      if (accent) setAmberColor(accent);
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[140px] flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-mono tracking-wider text-neutral-content uppercase">
          Similarity Score Distribution
        </span>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <XAxis
              dataKey="chunkIndex"
              stroke="#8E97AC"
              fontSize={8}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8E97AC"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
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
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                // Color scale: high similarity (>= 0.75) gets cyan, low similarity gets amber/rose
                const barColor = entry.score >= 0.75 ? cyanColor : amberColor;
                return <Cell key={`cell-${index}`} fill={barColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
