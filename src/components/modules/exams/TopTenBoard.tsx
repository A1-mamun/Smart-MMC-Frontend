"use client";
import { Trophy, Medal, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TExamDetail } from "@/types/exam";

type Props = { exam: TExamDetail };

// Per-row visual treatment for ranks 1–3. Each entry carries:
//  - `rowClass` — full-row tinting (background + border) so the row stands
//    out from the rest of the leaderboard at a glance.
//  - `chipClass` — solid-fill pill for the rank number, ensuring the digit
//    is always legible regardless of the row tint underneath. White text
//    on a saturated background reads cleanly in both light and dark mode.
//  - `iconClass` — accent color for the trophy/medal/award icon.
//
// Rank ≥ 4 falls through to neutral chrome.
type RankTheme = {
  rowClass: string;
  rowTextClass: string;
  chipClass: string;
  iconClass: string;
};

const rankTheme = (rank: number | null | undefined): RankTheme => {
  if (rank === 1)
    return {
      // Deep amber background for a real "gold" feel; white digit on
      // yellow-500 reads with strong contrast (~3.6:1).
      rowClass: "bg-yellow-100 border-yellow-300 ",
      rowTextClass: "text-black",
      chipClass: "bg-yellow-500 text-white border-yellow-600",
      iconClass: "text-yellow-700",
    };
  if (rank === 2)
    return {
      rowClass: "bg-zinc-100 border-zinc-300",
      rowTextClass: "text-black",
      chipClass: "bg-zinc-500 text-white border-zinc-600",
      iconClass: "text-zinc-700",
    };
  if (rank === 3)
    return {
      rowClass: "bg-orange-100 border-orange-300",
      rowTextClass: "text-black",
      chipClass: "bg-orange-500 text-white border-orange-600",
      iconClass: "text-orange-700",
    };
  return {
    rowClass: "bg-background",
    rowTextClass: "text-foreground",
    chipClass: "bg-muted text-foreground border-border",
    iconClass: "text-muted-foreground",
  };
};

const rankIcon = (rank: number | null | undefined, cls: string) => {
  if (rank === 1) return <Trophy className={`h-4 w-4 ${cls}`} />;
  if (rank === 2) return <Medal className={`h-4 w-4 ${cls}`} />;
  if (rank === 3) return <Award className={`h-4 w-4 ${cls}`} />;
  return null;
};

const TopTenBoard = ({ exam }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Top 10 leaderboard
        </CardTitle>
        <CardDescription>
          Tied scores share the same rank (1, 2, 2, 4…). Highest marks:{" "}
          <span className="font-semibold">{exam.stats.highestMarks}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {exam.topTen.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No results yet — enter marks in the Results tab.
          </p>
        ) : (
          exam.topTen.map((e) => {
            const theme = rankTheme(e.rank);
            return (
              <div
                key={e.resultId}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${theme.rowClass}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border ${theme.chipClass}`}
                  >
                    {e.rank ?? "—"}
                  </span>
                  <span className={`font-medium ${theme.rowTextClass}`}>
                    {e.studentName}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {e.studentCode}
                  </span>
                </div>
                <div className={`flex items-center gap-2 `}>
                  <Badge variant="outline" className={theme.rowTextClass}>
                    {e.obtainedMarks} marks
                  </Badge>
                  {rankIcon(e.rank, theme.iconClass)}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default TopTenBoard;
