// components/dashboard/tasks/TaskFlowTimelineCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number; label: string; value: number };

export default function TaskFlowTimelineCard() {
  // Data: Mon..Sun
  const values = [40, 48, 35, 60, 40, 28, 20];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Layout (height fixed, width responsive)
  const pad = 32;
  const h = 260;
  const maxY = 80;

  // keep a little safe-space for the last point, dot, glow and tooltip
  const SAFE_LEFT = 6;
  const SAFE_RIGHT = 16;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [w, setW] = useState<number>(720); // initial guess, replaced on mount

  // Track container width
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const update = () => {
      const next = Math.max(360, Math.floor(el.clientWidth)); // floor
      setW(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // drawable x-range with safe insets
  const xMin = pad + SAFE_LEFT;
  const xMax = w - pad - SAFE_RIGHT;

  // helpers derived from width
  const stepX = useMemo(() => {
    return (xMax - xMin) / (values.length - 1);
  }, [xMax, xMin, values.length]);

  const toX = (i: number) => xMin + i * stepX;
  const toY = (v: number) => pad + (maxY - v) * ((h - pad * 2) / maxY);

  const points: Point[] = useMemo(
    () =>
      values.map((v, i) => ({
        x: toX(i),
        y: toY(v),
        label: labels[i],
        value: v,
      })),
    // depends on width-sensitive functions
    [w] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Smooth path
  const pathD = useMemo(() => {
    return points
      .map((p, i) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = points[i - 1];
        const cx1 = prev.x + stepX / 2;
        const cy1 = prev.y;
        const cx2 = p.x - stepX / 2;
        const cy2 = p.y;
        return ` C ${cx1},${cy1} ${cx2},${cy2} ${p.x},${p.y}`;
      })
      .join("");
  }, [points, stepX]);

  // Area under curve
  const areaD = useMemo(() => {
    const last = points[points.length - 1];
    const first = points[0];
    return `${pathD} L ${last.x},${h - pad} L ${first.x},${h - pad} Z`;
  }, [pathD, points, h]);

  // Hover state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const handleMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = evt.clientX - rect.left;
    // nearest by x
    let nearest = 0;
    let min = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - x);
      if (d < min) {
        min = d;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const handleLeave = () => setHoverIdx(null);
  const active = hoverIdx != null ? points[hoverIdx] : null;

  // clamp tooltip x so it never gets cropped by the card
  const clampedTooltipLeft = active
    ? Math.min(Math.max(active.x, 12), w - 12)
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative rounded-3xl bg-gradient-to-b from-white to-slate-50 p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-200/60"
    >
      {/* soft top accent */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(120px_60px_at_50%_100%,rgba(99,102,241,0.10),transparent)]" />

      {/* header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-semibold text-slate-900">
            Task Flow
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
            Last 7 days
          </span>
        </div>
      </div>

      {/* chart */}
      <div className="relative mt-2 overflow-visible">
        <svg
          ref={svgRef}
          width={w}
          height={h}
          className="block w-full"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <defs>
            <linearGradient id="grid-fade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#E5E7EB" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E5E7EB" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.03" />
            </linearGradient>

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* axes (keep full width for rhythm) */}
          <line
            x1={pad}
            y1={h - pad}
            x2={w - pad}
            y2={h - pad}
            stroke="url(#grid-fade)"
            strokeWidth="1"
          />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#E5E7EB" />

          {/* horizontal gridlines */}
          {[0, 20, 40, 60, 80].map((v) => (
            <g key={v}>
              <line
                x1={pad}
                y1={toY(v)}
                x2={w - pad}
                y2={toY(v)}
                stroke="#EEF2F7"
              />
              <text
                x={pad - 10}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize={12}
                fill="#94A3B8"
              >
                {v}
              </text>
            </g>
          ))}

          {/* area and line */}
          <path d={areaD} fill="url(#area)" />
          <path
            d={pathD}
            fill="none"
            stroke="#111827"
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* points */}
          {points.map((p, i) => {
            const isActive = i === hoverIdx;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 6.5 : 5}
                  fill="#111827"
                  style={{ transition: "r 150ms ease" }}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 3.5 : 3}
                  fill="#FFFFFF"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 16 : 12}
                  fill="#6366F1"
                  opacity={isActive ? 0.16 : 0.1}
                />
              </g>
            );
          })}

          {/* x labels */}
          {labels.map((t, i) => (
            <text
              key={t}
              x={toX(i)}
              y={h - pad + 18}
              textAnchor="middle"
              fontSize={12}
              fill="#6B7280"
            >
              {t}
            </text>
          ))}

          {/* hover crosshair */}
          {active && (
            <line
              x1={active.x}
              y1={pad}
              x2={active.x}
              y2={h - pad}
              stroke="#CBD5E1"
              strokeDasharray="3 4"
            />
          )}
        </svg>

        {/* tooltip (clamped) */}
        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-3 rounded-xl bg-white px-3 py-2 text-[12px] shadow-[0_8px_30px_rgba(2,6,23,0.08)] ring-1 ring-slate-200"
            style={{ left: clampedTooltipLeft, top: active.y - 10 }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
              <span className="font-medium text-slate-800">{active.value}</span>
              <span className="text-slate-500">on {active.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* footer legend */}
      <div className="mt-4 flex items-center gap-3 text-[12px] text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500/80 ring-2 ring-indigo-300/30" />
          Tasks processed
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">Peak on Thu</span>
      </div>
    </div>
  );
}
