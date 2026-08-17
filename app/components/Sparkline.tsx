'use client';

/**
 * Mini-gráfico de línea sin dependencias (SVG puro).
 * Ideal para mostrar tendencia de peso / medidas a lo largo del tiempo.
 */
export function Sparkline({
  values,
  width = 80,
  height = 28,
  color = 'var(--color-primary-500)',
  fill = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (!values || values.length < 2) {
    return (
      <svg width={width} height={height} aria-label="Sin datos suficientes">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--color-ink-200)"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPath = `M0,${height} ${linePath} L${width},${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} aria-label="Tendencia">
      {fill && (
        <path
          d={fillPath}
          fill={color}
          fillOpacity={0.12}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}