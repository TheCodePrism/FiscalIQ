import React, { useState, useRef } from 'react';

// ==========================================
// 1. PROGRESS RING
// ==========================================
interface ProgressRingProps {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  color,
  size = 80,
  strokeWidth = 8,
  children
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        {/* Background track */}
        <circle
          stroke="rgba(255, 255, 255, 0.08)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Active progress */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%'
          }}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {children && (
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. DONUT CHART
// ==========================================
interface DonutChartItem {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartItem[];
  currencySymbol: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, currencySymbol }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Setup circle configurations
  const size = 200;
  const center = size / 2;
  const radius = 65;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 40
    });
    setHoveredIdx(index);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setTooltipPos(null);
  };

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No data available for this period</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        ref={chartRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background base circle to make it look clean */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth={strokeWidth}
        />

        {data.map((item, index) => {
          if (item.value <= 0) return null;
          
          const percentage = (item.value / total) * 100;
          const strokeDashoffset = circumference - (percentage / 100) * circumference;
          const rotateAngle = (accumulatedPercent / 100) * 360 - 90;
          
          accumulatedPercent += percentage;

          const isHovered = hoveredIdx === index;

          return (
            <circle
              key={item.name}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(${rotateAngle} ${center} ${center})`}
              style={{
                transition: 'stroke-width 0.2s ease, stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}

        {/* Center label */}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary)"
          style={{ fontSize: '1.25rem', fontWeight: 800 }}
        >
          {currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-muted)"
          style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
        >
          Total Spent
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && tooltipPos !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            opacity: 1
          }}
        >
          <div style={{ fontWeight: 600 }}>{data[hoveredIdx].name}</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {currencySymbol}{data[hoveredIdx].value.toLocaleString()} ({((data[hoveredIdx].value / total) * 100).toFixed(1)}%)
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. TREND AREA CHART (INCOME VS EXPENSE)
// ==========================================
interface TrendItem {
  label: string; // e.g. "Feb", "Mar"
  income: number;
  expense: number;
}

interface TrendLineChartProps {
  data: TrendItem[];
  currencySymbol: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, currencySymbol }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 500;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate scales
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    100 // fallback baseline
  ) * 1.1; // Add 10% breathing room

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + index * (chartWidth / (data.length - 1));
  };

  const getY = (value: number) => {
    return paddingTop + chartHeight - (value / maxVal) * chartHeight;
  };

  // Generate paths
  let incomePath = '';
  let expensePath = '';
  let incomeAreaPath = '';
  let expenseAreaPath = '';

  if (data.length > 0) {
    // 1. Income Line Path
    incomePath = `M ${getX(0)} ${getY(data[0].income)}`;
    for (let i = 1; i < data.length; i++) {
      incomePath += ` L ${getX(i)} ${getY(data[i].income)}`;
    }

    // 2. Income Area Path
    incomeAreaPath = `${incomePath} L ${getX(data.length - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`;

    // 3. Expense Line Path
    expensePath = `M ${getX(0)} ${getY(data[0].expense)}`;
    for (let i = 1; i < data.length; i++) {
      expensePath += ` L ${getX(i)} ${getY(data[i].expense)}`;
    }

    // 4. Expense Area Path
    expenseAreaPath = `${expensePath} L ${getX(data.length - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find closest data index by X coordinate
    let closestIdx = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(getX(i) - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    setActiveIdx(closestIdx);
    setTooltipPos({
      x: mouseX + 15,
      y: mouseY - 60
    });
  };

  const handleMouseLeave = () => {
    setActiveIdx(null);
    setTooltipPos(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-danger)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-danger)" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + chartHeight * ratio;
          const val = maxVal * (1 - ratio);
          return (
            <g key={ratio} opacity="0.3">
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--text-muted)"
                strokeDasharray="4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--text-secondary)"
                style={{ fontSize: '0.65rem', fontWeight: 600 }}
              >
                {currencySymbol}{Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        {data.length > 0 && (
          <>
            {/* Area Fills */}
            <path d={incomeAreaPath} fill="url(#incomeGrad)" />
            <path d={expenseAreaPath} fill="url(#expenseGrad)" />

            {/* Line Paths */}
            <path
              d={incomePath}
              fill="none"
              stroke="var(--color-success)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={expensePath}
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X Axis Labels */}
            {data.map((d, i) => (
              <text
                key={i}
                x={getX(i)}
                y={height - paddingBottom + 20}
                textAnchor="middle"
                fill={activeIdx === i ? 'var(--text-primary)' : 'var(--text-muted)'}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: activeIdx === i ? 700 : 500,
                  transition: 'fill 0.2s ease'
                }}
              >
                {d.label}
              </text>
            ))}

            {/* Highlighted vertical tracker bar */}
            {activeIdx !== null && (
              <line
                x1={getX(activeIdx)}
                y1={paddingTop}
                x2={getX(activeIdx)}
                y2={paddingTop + chartHeight}
                stroke="var(--text-muted)"
                strokeOpacity="0.4"
                strokeDasharray="2"
                strokeWidth="1.5"
              />
            )}

            {/* Highlight Dots */}
            {data.map((d, i) => {
              const isHovered = activeIdx === i;
              return (
                <g key={i} style={{ pointerEvents: 'none' }}>
                  {/* Income dot */}
                  <circle
                    cx={getX(i)}
                    cy={getY(d.income)}
                    r={isHovered ? 6 : 4}
                    fill="var(--bg-gradient-start)"
                    stroke="var(--color-success)"
                    strokeWidth="3"
                    style={{ transition: 'r 0.2s ease' }}
                  />
                  {/* Expense dot */}
                  <circle
                    cx={getX(i)}
                    cy={getY(d.expense)}
                    r={isHovered ? 6 : 4}
                    fill="var(--bg-gradient-start)"
                    stroke="var(--color-danger)"
                    strokeWidth="3"
                    style={{ transition: 'r 0.2s ease' }}
                  />
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* Tooltip */}
      {activeIdx !== null && tooltipPos !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            opacity: 1
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
            {data[activeIdx].label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }}></span>
            Income: {currencySymbol}{data[activeIdx].income.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-danger)', display: 'inline-block' }}></span>
            Expense: {currencySymbol}{data[activeIdx].expense.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)' }}>
            Net: {currencySymbol}{(data[activeIdx].income - data[activeIdx].expense).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};
