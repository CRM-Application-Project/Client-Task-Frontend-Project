"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, Cell } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface TasksByStatusCardProps {
  data?: Record<string, number>;
}

type ChartPoint = { status: string; count: number; color: string };

const statusColors: Record<string, string> = {
  "TO DO": "#60A5FA", // blue-400
  "IN PROGRESS": "#F59E0B", // amber-500
  "IN REVIEW": "#8B5CF6", // violet-500
  DONE: "#10B981", // emerald-500
  NEW: "#94A3B8", // slate-400
  BACKLOG: "#64748B", // slate-500
};

// Always plot all stages in a fixed order so a single non-zero category doesn't stretch full-width.
const ALL_STATUSES = [
  "NEW",
  "BACKLOG",
  "TO DO",
  "IN PROGRESS",
  "IN REVIEW",
  "DONE",
] as const;

type StatusKey = (typeof ALL_STATUSES)[number];

const chartConfig = {
  count: {
    label: "Tasks",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function TasksByStatusCard({ data }: TasksByStatusCardProps) {
  const chartData: ChartPoint[] = useMemo(() => {
    return ALL_STATUSES.map((status) => ({
      status,
      count: (data?.[status as StatusKey] ?? 0) as number,
      color: statusColors[status] || "#94A3B8",
    }));
  }, [data]);

  const total = useMemo(
    () => chartData.reduce((sum, p) => sum + p.count, 0),
    [chartData]
  );

  // Custom label: hide 0s to avoid visual noise
  const renderValueLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    const cx = x + width / 2;
    return (
      <text
        x={cx}
        y={(y ?? 0) - 8}
        textAnchor="middle"
        className="fill-foreground"
        fontSize={12}
      >
        {value}
      </text>
    );
  };

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <CardHeader>
        <CardTitle>Tasks by Status</CardTitle>
        <CardDescription>{total?.toLocaleString()} total tasks</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
            barCategoryGap="25%"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="status"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={8} barSize={60}>
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
              <LabelList content={renderValueLabel} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="leading-none font-medium">
          All stages shown, even when counts are zero
        </div>
        <div className="text-muted-foreground leading-none">
          Bar width is fixed so one category never dominates the layout
        </div>
      </CardFooter>
    </div>
  );
}
