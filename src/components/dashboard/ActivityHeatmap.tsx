import { Fragment, useMemo } from "react";
import { Card } from "../ui/Card";
import { summariseHeatmap } from "../../lib/db/activity";
import type { HeatmapDay } from "../../lib/db/types";

interface ActivityHeatmapProps {
  days: HeatmapDay[];
  weeks?: number;
}

const CELL = 12;
const GAP = 4;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

const LEVEL_CLASS = [
  "bg-white/[0.05]",
  "bg-[#cf9eff]/25",
  "bg-[#cf9eff]/50",
  "bg-[#cf9eff]/75",
  "bg-[#cf9eff] shadow-[0_0_10px_rgba(207,158,255,0.7)]",
];

interface GridCell {
  key: string;
  seconds: number;
  sessions: number;
  level: number;
  future: boolean;
}

interface GridColumn {
  key: string;
  monthLabel: string | null;
  cells: GridCell[];
}

function levelFor(seconds: number): number {
  if (seconds <= 0) return 0;
  const minutes = seconds / 60;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

function buildColumns(days: HeatmapDay[], weeks: number): GridColumn[] {
  const lookup = new Map<string, HeatmapDay>();
  for (const day of days) {
    lookup.set(String(day.day).slice(0, 10), day);
  }

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(today.getUTCDate() - today.getUTCDay());
  const first = new Date(lastSunday);
  first.setUTCDate(lastSunday.getUTCDate() - (weeks - 1) * 7);

  const columns: GridColumn[] = [];
  let previousMonth = -1;

  for (let week = 0; week < weeks; week += 1) {
    const columnStart = new Date(first);
    columnStart.setUTCDate(first.getUTCDate() + week * 7);

    const cells: GridCell[] = [];
    for (let dow = 0; dow < 7; dow += 1) {
      const date = new Date(columnStart);
      date.setUTCDate(columnStart.getUTCDate() + dow);
      const key = date.toISOString().slice(0, 10);
      const record = lookup.get(key);
      const seconds = record ? Number(record.total_seconds) || 0 : 0;

      cells.push({
        key,
        seconds,
        sessions: record ? Number(record.session_count) || 0 : 0,
        level: levelFor(seconds),
        future: date.getTime() > today.getTime(),
      });
    }

    const month = columnStart.getUTCMonth();
    const monthLabel =
      previousMonth === -1 || month !== previousMonth ? MONTHS[month] : null;
    previousMonth = month;

    columns.push({ key: `w${week}`, monthLabel, cells });
  }

  return columns;
}

function cellTitle(cell: GridCell): string | undefined {
  if (cell.future) return undefined;
  const minutes = Math.round(cell.seconds / 60);
  if (minutes <= 0) return `${cell.key}: no focus time`;
  return `${cell.key}: ${minutes} min across ${cell.sessions} session${
    cell.sessions === 1 ? "" : "s"
  }`;
}

export function ActivityHeatmap({ days, weeks = 53 }: ActivityHeatmapProps) {
  const columns = useMemo(() => buildColumns(days, weeks), [days, weeks]);
  const { totalSeconds, activeDays } = useMemo(
    () => summariseHeatmap(days),
    [days],
  );
  const hours = Math.round((totalSeconds / 3600) * 10) / 10;

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-star/70">
            Activity
          </p>
          <h2 className="mt-1.5 text-lg font-medium tracking-[-0.02em] text-white">
            Last {weeks} weeks
          </h2>
        </div>
        <p className="text-xs text-white/40">
          <span className="font-medium text-white">{activeDays}</span> active
          days <span className="text-white/20">/</span>{" "}
          <span className="font-medium text-white">{hours}</span> hours focused
        </p>
      </div>

      <div
        className="mt-6 flex gap-3"
        role="img"
        aria-label={`Focus activity for the last ${weeks} weeks, ${activeDays} active days.`}
      >
        <div className="min-w-0 flex-1 pb-1">
          <div className="relative h-4">
            {columns.map((column, index) =>
              column.monthLabel ? (
                <span
                  key={`${column.key}-label`}
                  className="absolute top-0 text-[10px] leading-none text-white/35"
                  style={{
                    left: `calc(${index} * (100% + ${GAP}px) / ${columns.length})`,
                  }}
                >
                  {column.monthLabel}
                </span>
              ) : null,
            )}
          </div>

          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))`,
            }}
          >
            {DAY_LABELS.map((label, dow) => (
              <Fragment key={dow}>
                <span className="flex items-center pr-1 text-[10px] leading-none text-white/30">
                  {label}
                </span>
                {columns.map((column) => {
                  const cell = column.cells[dow];
                  return (
                    <span
                      key={cell.key}
                      title={cellTitle(cell)}
                      className={`aspect-square w-full self-center rounded-[3px] ${
                        cell.future
                          ? "bg-transparent"
                          : LEVEL_CLASS[cell.level]
                      }`}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-1.5 text-[10px] text-white/35">
        <span className="mr-1">Less</span>
        {LEVEL_CLASS.map((className, level) => (
          <span
            key={level}
            className={`rounded-[3px] ${className}`}
            style={{ width: CELL, height: CELL }}
          />
        ))}
        <span className="ml-1">More</span>
      </div>
    </Card>
  );
}
