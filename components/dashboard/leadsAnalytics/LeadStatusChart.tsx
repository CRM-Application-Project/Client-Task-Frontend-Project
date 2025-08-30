"use client";

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

// Define the sales funnel stages in order
const funnelStages = [
  "NEW LEAD",
  "CONTACTED",
  "QUALIFIED",
  "DEMO",
  "PROPOSAL SENT",
  "NEGOTIATION",
  "CLOSED WON",
  "CLOSED LOST",
];

const statusColors: Record<string, string> = {
  "NEW LEAD": "#3B82F6",
  CONTACTED: "#F97316",
  QUALIFIED: "#8B5CF6",
  DEMO: "#10B981",
  "PROPOSAL SENT": "#F59E0B",
  NEGOTIATION: "#06B6D4",
  "CLOSED WON": "#22C55E",
  "CLOSED LOST": "#EF4444",
};

const statusLabels: Record<string, string> = {
  "NEW LEAD": "New Leads",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  DEMO: "Demo Scheduled",
  "PROPOSAL SENT": "Proposal Sent",
  NEGOTIATION: "Negotiation",
  "CLOSED WON": "Closed Won",
  "CLOSED LOST": "Closed Lost",
};

export default function LeadStatus({ data }: SalesFunnelCardProps) {
  const chartData = React.useMemo(() => {
    if (!data) return [];

    return funnelStages
      .filter((stage) => data[stage] > 0)
      .map((stage) => ({
        status: stage,
        visitors: data[stage],
        fill: statusColors[stage] || "#64748B",
        label: statusLabels[stage] || stage,
      }));
  }, [data]);

  const total = React.useMemo(
    () => chartData.reduce((sum, curr) => sum + curr.visitors, 0),
    [chartData]
  );

  const getConversionRate = (currentStage: string, previousStage: string) => {
    if (!data) return 0;
    const currentValue = data[currentStage] || 0;
    const previousValue = data[previousStage] || 0;

    if (previousValue === 0) return 0;
    return Math.round((currentValue / previousValue) * 100);
  };

  const chartConfig = Object.fromEntries(
    Object.keys(statusColors).map((key) => [
      key,
      { label: statusLabels[key], color: statusColors[key] },
    ])
  ) satisfies ChartConfig;

  const activeStagesCount = data
    ? Object.values(data).filter((value) => value > 0).length
    : 0;

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <CardHeader className="items-start pb-0">
        <CardTitle>Lead Status</CardTitle>
        <CardDescription>Sales Funnel Overview</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {total > 0 ? (
          <>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Donut chart */}
              <ChartContainer
                config={chartConfig}
                className="mx-auto h-[250px] w-[250px]"
              >
                <ResponsiveContainer>
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={chartData}
                      dataKey="visitors"
                      nameKey="status"
                      innerRadius={70}
                      strokeWidth={5}
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
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  {total.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-muted-foreground"
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

              {/* Funnel visualization with scroll & styled scrollbar */}
              <div className="flex-1 relative">
                <h3 className="font-semibold text-lg mb-4">
                  Funnel Progression
                </h3>
                <div
                  className={`space-y-4 pr-2 ${
                    activeStagesCount > 4
                      ? "overflow-y-auto max-h-[300px] custom-scrollbar"
                      : ""
                  }`}
                >
                  {funnelStages.map((stage, index) => {
                    if (!data || data[stage] === 0) return null;

                    const previousStage =
                      index > 0 ? funnelStages[index - 1] : null;
                    const conversionRate = previousStage
                      ? getConversionRate(stage, previousStage)
                      : 100;

                    return (
                      <div key={stage} className="space-y-2">
                        {previousStage && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              {conversionRate}% conversion from{" "}
                              {statusLabels[previousStage]}
                            </span>
                          </div>
                        )}
                        <div
                          className="flex items-center justify-between p-3 rounded-lg border"
                          style={{
                            borderLeft: `4px solid ${statusColors[stage]}`,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: statusColors[stage] }}
                            />
                            <span className="font-medium">
                              {statusLabels[stage]}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold">
                              {data[stage].toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {Math.round((data[stage] / total) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gradient scroll hint */}
                {activeStagesCount > 4 && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                )}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {data?.["NEW LEAD"] || 0}
                </div>
                <div className="text-sm text-blue-600">New Leads</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {data?.["CLOSED WON"] || 0}
                </div>
                <div className="text-sm text-green-600">Won Deals</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data?.["NEW LEAD"]
                    ? `${Math.round(
                        ((data?.["CLOSED WON"] || 0) / data?.["NEW LEAD"]) * 100
                      )}% overall conversion`
                    : "0% conversion"}
                </div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {data?.["CLOSED LOST"] || 0}
                </div>
                <div className="text-sm text-red-600">Lost Deals</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-slate-400 text-sm py-8 text-center">
            No lead data available for the selected period
          </div>
        )}
      </CardContent>

      {/* Inline scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(100, 116, 139, 0.4);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(100, 116, 139, 0.6);
        }
      `}</style>
    </div>
  );
}
