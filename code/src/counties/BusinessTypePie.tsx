import React from 'react';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface PieDatum {
  name: string;
  value: number;
}

interface Props {
  items: PieDatum[];
  width?: number | string;
  height?: number | string | number;
}

// Simple deterministic color generator using a hash of the category name
// Deterministic color generator returning HEX (stable per category)
function colorFor(name: string) {
  let h = 2166136261 >>> 0; // FNV-1a seed
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  const hue = h % 360; // 0-359
  const saturation = 65; // percent
  const lightness = 55; // percent

  return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number) {
  // Convert HSL (0-360, 0-100, 0-100) to hex color
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const val = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * val);
  };

  const r = f(0);
  const g = f(8);
  const b = f(4);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function BusinessTypePie({ items, width = '100%', height = 300 }: Props) {
  if (!items || items.length === 0) {
    return <p>No business type data available</p>;
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <PieChart>
        <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label />
        {items.map((d, i) => (
          <Cell key={`cell-${i}`} fill={colorFor(d.name)} />
        ))}
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
