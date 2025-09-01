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

export default function LeadSourcesCard({ data }: LeadSourcesCardProps) {
  // Explicit colors instead of CSS variables (so you don’t get “all black” slices)
  const colors = [
    "#3B82F6", // blue
    "#F97316", // orange
    "#8B5CF6", // purple
    "#10B981", // green
    "#F59E0B", // amber
    "#06B6D4", // cyan
    "#22C55E", // emerald
    "#EF4444", // red
  ];

  const chartData = data
    ? Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([source, count], index) => ({
          source,
          count,
          fill: colors[index % colors.length],
        }))
    : [];

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  const chartConfig: ChartConfig = Object.fromEntries(
    chartData.map((d) => [
      d.source,
      {
        label: d.source,
        color: d.fill,
      },
    ])
  );

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <CardHeader className="items-start pb-0">
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>Distribution of captured leads</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center lg:flex-row gap-6 pb-0">
        {total > 0 ? (
          <>
            {/* Chart */}
            <ChartContainer
              config={chartConfig}
              className="relative mx-auto h-[250px] w-[250px]"
            >
              <ResponsiveContainer>
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        className="!bg-white !text-black !border !border-slate-200 shadow-md"
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="source"
                    innerRadius={70}
                    outerRadius={100}
                    strokeWidth={3}
                    activeIndex={activeIndex ?? undefined}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    activeShape={({
                      outerRadius = 0,
                      ...props
                    }: PieSectorDataItem) => (
                      <Sector {...props} outerRadius={outerRadius + 10} />
                    )}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        className="transition-all duration-300"
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
                                className="fill-slate-500 text-sm"
                              >
                                Leads
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

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {chartData.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between p-2 rounded-md border hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm font-medium">{item.source}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{item.count}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((item.count / total) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full py-12 text-slate-400 text-sm text-center">
            No data available
          </div>
        )}
      </CardContent>
    </div>
  );
}
