import * as React from "react";
import { Pie, PieChart, Label, ResponsiveContainer, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface SalesFunnelCardProps {
  data?: Record<string, number>;
}

// Known stage colors with better visual distinction
const defaultStageColors: Record<string, string> = {
  "NEW LEAD": "#3B82F6", // Blue
  CONTACTED: "#F97316", // Orange
  QUALIFIED: "#8B5CF6", // Purple
  DEMO: "#10B981", // Green
  "PROPOSAL SENT": "#F59E0B", // Amber
  NEGOTIATION: "#06B6D4", // Cyan
  "CLOSED WON": "#22C55E", // Emerald
  "CLOSED LOST": "#EF4444", // Red
};

// Helper: generate consistent color if stage not in default list
const generateColor = (stage: string) => {
  const hash = stage
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

// Format stage names for better readability
const formatStageName = (stage: string): string => {
  return stage
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function LeadStatus({ data }: SalesFunnelCardProps) {
  const chartData = React.useMemo(() => {
    if (!data) return [];

    return Object.entries(data)
      .filter(([_, value]) => value > 0)
      .map(([stage, value]) => ({
        status: stage,
        visitors: value,
        fill: defaultStageColors[stage] || generateColor(stage),
        label: formatStageName(stage),
      }))
      .sort((a, b) => b.visitors - a.visitors); // Sort by count descending
  }, [data]);

  const total = React.useMemo(
    () => chartData.reduce((sum, curr) => sum + curr.visitors, 0),
    [chartData]
  );

  const chartConfig = Object.fromEntries(
    chartData.map((d) => [d.status, { label: d.label, color: d.fill }])
  ) satisfies ChartConfig;

  const activeStagesCount = chartData.length;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
      <CardHeader className="items-start pb-0">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Lead Status
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Sales pipeline progression and conversion metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 items-center pt-4">
        {total > 0 ? (
          <>
            <div className="flex flex-col lg:flex-row gap-8 w-full">
              {/* Donut chart with metrics */}
              <div className="flex flex-col items-center">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto h-[220px] w-[220px]"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            className="!bg-white !text-slate-800 !shadow-md !rounded-md !border !border-slate-200 p-2"
                            formatter={(value) => [`${value} leads`, null]}
                          />
                        }
                      />
                      <Pie
                        data={chartData}
                        dataKey="visitors"
                        nameKey="label"
                        innerRadius={70}
                        outerRadius={90}
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-slate-800 text-2xl font-bold"
                                  >
                                    {total?.toLocaleString()}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 20}
                                    className="fill-slate-500 text-xs font-medium"
                                  >
                                    Total Leads
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>

                {/* Mini metrics below chart */}
                <div className="flex gap-4 mt-4 text-xs text-slate-600">
                  <div className="text-center">
                    <div className="font-semibold">{chartData.length}</div>
                    <div>Stages</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">
                      {Math.round(
                        (chartData[chartData.length - 1]?.visitors / total) *
                          100
                      )}
                      %
                    </div>
                    <div>Overall Conv.</div>
                  </div>
                </div>
              </div>

              {/* Funnel list with enhanced data */}
              <div className="flex-1 relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800 text-base">
                    Funnel Progression
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {total.toLocaleString()} total
                  </span>
                </div>

                {/* Scroll container with better styling */}
                <div className="relative">
                  <div
                    className={`space-y-3 pr-3 ${
                      activeStagesCount > 4
                        ? "overflow-y-auto max-h-[280px]"
                        : ""
                    }`}
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#cbd5e1 #f1f5f9",
                    }}
                  >
                    <style>
                      {`
                        .scroll-container::-webkit-scrollbar {
                          width: 6px;
                        }
                        .scroll-container::-webkit-scrollbar-track {
                          background: #f1f5f9;
                          border-radius: 3px;
                        }
                        .scroll-container::-webkit-scrollbar-thumb {
                          background: #cbd5e1;
                          border-radius: 3px;
                        }
                        .scroll-container::-webkit-scrollbar-thumb:hover {
                          background: #94a3b8;
                        }
                      `}
                    </style>

                    <div
                      className={`space-y-3 ${
                        activeStagesCount > 4 ? "scroll-container" : ""
                      }`}
                    >
                      {chartData.map((stage, index) => {
                        const conversionRate =
                          index > 0
                            ? Math.round(
                                (stage.visitors /
                                  chartData[index - 1].visitors) *
                                  100
                              )
                            : null;

                        return (
                          <div key={stage.status} className="space-y-2">
                            <div
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                              style={{
                                borderLeft: `4px solid ${stage.fill}`,
                              }}
                            >
                              {/* Left side: stage info */}
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                  style={{ backgroundColor: stage.fill }}
                                >
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="font-medium text-sm text-slate-800 block">
                                    {stage.label}
                                  </span>
                                  {conversionRate && (
                                    <span className="text-xs text-slate-500">
                                      {conversionRate}% conversion
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right side: numbers */}
                              <div className="flex items-center gap-4 sm:text-right">
                                <div className="text-right">
                                  <span className="font-semibold text-sm text-slate-800 block">
                                    {stage.visitors.toLocaleString()}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {Math.round((stage.visitors / total) * 100)}
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gradient fade effect for scrollable content */}
                  {activeStagesCount > 4 && (
                    <>
                      <div className="pointer-events-none absolute top-0 left-0 right-3 h-4 bg-gradient-to-b from-white to-transparent" />
                      <div className="pointer-events-none absolute bottom-0 left-0 right-3 h-4 bg-gradient-to-t from-white to-transparent" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full py-12 text-slate-400">
            <div className="text-sm mb-2">No lead data available</div>
            <div className="text-xs">Try selecting a different time period</div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
