"use client";

import * as React from "react";
import {
  Label,
  Pie,
  PieChart,
  Sector,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

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

interface LeadSourcesCardProps {
  data?: Record<string, number>;
}

// Function to format source names from uppercase with underscores to human-readable
const formatSourceName = (source: string): string => {
  return source
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => {
      if (word === "seo") return "SEO";
      if (word === "crm") return "CRM";
      if (word === "api") return "API";
      if (word === "ppc") return "PPC";
      if (word === "social") return "Social Media";
      if (word === "email") return "Email Marketing";
      if (word === "organic") return "Organic Search";
      if (word === "direct") return "Direct Traffic";
      if (word === "referral") return "Referral";

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

export default function LeadSourcesCard({ data }: LeadSourcesCardProps) {
  // Color palette with better visual distinction
  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // purple
    "#06B6D4", // cyan
    "#F97316", // orange
    "#84CC16", // lime
    "#6366F1", // indigo
    "#EC4899", // pink
    "#14B8A6", // teal
    "#64748B", // slate
  ];

  const chartData = React.useMemo(() => {
    if (!data) return [];

    return Object.entries(data)
      .filter(([_, value]) => value > 0)
      .map(([source, count], index) => ({
        source,
        formattedSource: formatSourceName(source),
        count,
        fill: colors[index % colors.length],
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [data]);

  const total = React.useMemo(
    () => chartData.reduce((sum, d) => sum + d.count, 0),
    [chartData]
  );

  const chartConfig: ChartConfig = React.useMemo(
    () =>
      Object.fromEntries(
        chartData.map((d) => [
          d.source,
          {
            label: d.formattedSource,
            color: d.fill,
          },
        ])
      ),
    [chartData]
  );

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const activeSourcesCount = chartData.length;

  // Calculate top performing source
  const topSource = chartData.length > 0 ? chartData[0] : null;

  return (
    <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200">
      <CardHeader className="items-start pb-0">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Lead Sources
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Performance analysis of lead acquisition channels
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center lg:flex-row gap-8 pt-4">
        {total > 0 ? (
          <>
            {/* Chart with metrics */}
            <div className="flex flex-col items-center">
              <ChartContainer
                config={chartConfig}
                className="relative mx-auto h-[220px] w-[220px]"
              >
                <ResponsiveContainer>
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          className="!bg-white !text-slate-800 !border !border-slate-200 shadow-sm p-2"
                          formatter={(value, name, props) => [
                            `${value} leads`,
                            props.payload.formattedSource,
                          ]}
                        />
                      }
                    />
                    <Pie
                      data={chartData}
                      dataKey="count"
                      nameKey="formattedSource"
                      innerRadius={70}
                      outerRadius={90}
                      strokeWidth={2}
                      stroke="#fff"
                      activeIndex={activeIndex ?? undefined}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      activeShape={({
                        outerRadius = 0,
                        ...props
                      }: PieSectorDataItem) => (
                        <Sector {...props} outerRadius={outerRadius + 5} />
                      )}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          className="transition-all duration-200"
                        />
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
                                  {total}
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

              {/* Top source indicator */}
              {topSource && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-center w-full max-w-[200px]">
                  <div className="text-xs text-slate-500 mb-1">Top Source</div>
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: topSource.fill }}
                    ></span>
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {topSource.formattedSource}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {Math.round((topSource.count / total) * 100)}% of total
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced legend with performance metrics */}
            <div className="flex-1 pr-2 lg:pr-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 text-base">
                  Source Performance
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {chartData.length} sources
                </span>
              </div>

              {/* Scroll container with better styling */}
              <div className="relative px-1">
                <div
                  className={`space-y-3 pr-2 ${
                    activeSourcesCount > 4
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
                      activeSourcesCount > 4 ? "scroll-container" : ""
                    }`}
                  >
                    {chartData.map((item, index) => (
                      <div
                        key={item.source}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors group"
                      >
                        {/* Left side */}
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                            style={{ backgroundColor: item.fill }}
                          >
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-800 break-words">
                            {item.formattedSource}
                          </span>
                        </div>

                        {/* Right side with visual bar indicator */}
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(item.count / total) * 100}%`,
                                backgroundColor: item.fill,
                              }}
                            ></div>
                          </div>
                          <div className="text-right min-w-[70px]">
                            <span className="font-semibold text-sm text-slate-800 block">
                              {item.count}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round((item.count / total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gradient fade effect for scrollable content */}
                {activeSourcesCount > 4 && (
                  <>
                    <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent" />
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full py-12 text-slate-400">
            <div className="text-sm mb-2">No source data available</div>
            <div className="text-xs">Try selecting a different time period</div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
