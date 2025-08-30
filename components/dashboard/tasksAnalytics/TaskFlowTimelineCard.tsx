// components/dashboard/tasks/TaskFlowTimelineCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TaskFlowGraphAnalysis } from "@/app/services/data.service";

interface TaskFlowTimelineCardProps {
  data?: TaskFlowGraphAnalysis;
  title?: string;
  description?: string;
}

type Point = { x: number; y: number; label: string; value: number };

export default function TaskFlowTimelineCard({
  data,
  title = "Task Flow",
  description,
}: TaskFlowTimelineCardProps) {
  // Default data if none provided
  const defaultValues = [40, 48, 35, 60, 40, 28, 20];
  const defaultLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Process the incoming data
  const values = useMemo(() => {
    if (!data) return defaultValues;
    return Object.values(data);
  }, [data]);

  const labels = useMemo(() => {
    if (!data) return defaultLabels;
    return Object.keys(data);
  }, [data]);

  // Calculate peak day
  const peakDay = useMemo(() => {
    if (!values.length) return "";
    const maxValue = Math.max(...values);
    const peakIndex = values.indexOf(maxValue);
    return labels[peakIndex];
  }, [values, labels]);

  // Calculate week-over-week change
  const wowChange = useMemo(() => {
    if (values.length < 2) return 0;
    const lastValue = values[values.length - 1];
    const prevValue = values[values.length - 2];
    if (prevValue === 0) return 0;
    return ((lastValue - prevValue) / prevValue) * 100;
  }, [values]);

  // Layout (height fixed, width responsive)
  const pad = 32;
  const h = 280;
  const maxY = useMemo(() => Math.max(...values, 80), [values]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [w, setW] = useState<number>(720);

  // Track container width
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const update = () => {
      const next = Math.max(360, Math.floor(el.clientWidth));
      setW(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sidePad = 55;
  const xMin = sidePad;
  const xMax = w - sidePad;

  // helpers derived from width
  const stepX = useMemo(() => {
    return (xMax - xMin) / (values.length + 1);
  }, [xMax, xMin, values.length]);

  const toX = (i: number) => xMin + (i + 1) * stepX;
  const toY = (v: number) => pad + (maxY - v) * ((h - pad * 2) / maxY);

  const points: Point[] = useMemo(
    () =>
      values.map((v, i) => ({
        x: toX(i),
        y: toY(v),
        label: labels[i],
        value: v,
      })),
    [w, values, labels]
  );

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
      className="relative rounded-2xl bg-white p-6 shadow-sm border border-slate-100"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">
            {description ||
              `Last ${values.length} ${values.length === 1 ? "day" : "days"}`}
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
            <span className="text-sm text-slate-600">Tasks Processed</span>
          </div>
          {peakDay && (
            <div className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
              Peak: {peakDay}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={w}
          height={h}
          className="block w-full"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[
            0,
            Math.floor(maxY / 4),
            Math.floor(maxY / 2),
            Math.floor((3 * maxY) / 4),
            maxY,
          ].map((v) => (
            <g key={v}>
              <line
                x1={xMin}
                y1={toY(v)}
                x2={xMax}
                y2={toY(v)}
                stroke="#F1F5F9"
                strokeWidth={1}
              />
              <text
                x={xMin - 8}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize={11}
                fill="#94A3B8"
                className="font-medium"
              >
                {v}
              </text>
            </g>
          ))}

          {/* Area under curve */}
          <path
            d={`M ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${xMax},${
              h - pad
            } L ${xMin},${h - pad} Z`}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#4F46E5"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Points */}
          {points.map((p, i) => {
            const isActive = i === hoverIdx;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 8 : 6}
                  fill="white"
                  stroke="#4F46E5"
                  strokeWidth={isActive ? 3 : 2}
                  style={{ transition: "all 150ms ease" }}
                />
                {isActive && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={12}
                    fill="#4F46E5"
                    opacity={0.15}
                  />
                )}
              </g>
            );
          })}

          {/* X labels */}
          {labels.map((t, i) => (
            <text
              key={t}
              x={toX(i)}
              y={h - pad + 20}
              textAnchor="middle"
              fontSize={12}
              fill="#64748B"
              fontWeight={500}
            >
              {t}
            </text>
          ))}

          {/* Hover crosshair */}
          {active && (
            <g>
              <line
                x1={active.x}
                y1={pad}
                x2={active.x}
                y2={h - pad}
                stroke="#CBD5E1"
                strokeDasharray="4 4"
              />
              <circle cx={active.x} cy={active.y} r={4} fill="#4F46E5" />
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-slate-800 px-3 py-2 text-white text-xs shadow-lg"
            style={{ left: clampedTooltipLeft, top: active.y - 10 }}
          >
            <div className="flex items-center gap-2 font-medium">
              <span>{active.value} tasks</span>
              <span className="text-slate-300">• {active.label}</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-4 h-4 overflow-hidden">
              <div className="w-3 h-3 bg-slate-800 rotate-45 transform origin-center"></div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">
              {values.reduce((a, b) => a + b, 0)}
            </span>{" "}
            tasks completed this period
          </div>
          {values.length >= 2 && (
            <div className="text-sm text-slate-600">
              <span
                className={
                  wowChange >= 0 ? "text-emerald-600" : "text-rose-600"
                }
              >
                {wowChange >= 0 ? "+" : ""}
                {Math.round(wowChange)}%
              </span>{" "}
              from previous day
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
