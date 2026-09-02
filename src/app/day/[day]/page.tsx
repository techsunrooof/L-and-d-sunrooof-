import { redirect, notFound } from "next/navigation";
import { getLearnerId } from "@/lib/learner";
import { getState, buildItemDetail } from "@/lib/state";
import { getDay } from "@/lib/content";
import { buildDaySnapshot } from "@/lib/view";
import { getDayView, isAccessible } from "@/lib/locking";
import { DayModule } from "@/components/day-module";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
  searchParams,
}: {
  params: Promise<{ day: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { day } = await params;
  const { item } = await searchParams;
  const dayNumber = Number(day);

  const meta = getDay(dayNumber);
  if (!meta || !Number.isInteger(dayNumber)) notFound();

  const learnerId = await getLearnerId();
  const state = getState(learnerId);

  const dayView = getDayView(state, dayNumber);
  if (!dayView || !dayView.unlocked) redirect("/"); // locked day → home (§6.6)

  const snapshot = buildDaySnapshot(state, dayNumber);
  if (!snapshot) notFound();

  const allIds = snapshot.modules.flatMap((m) => m.items.map((i) => i.id));

  // Pick the item. A locked/foreign ?item is sent back to the day default.
  let selectedId = snapshot.currentItemId;
  if (item) {
    if (allIds.includes(item) && isAccessible(state, item)) selectedId = item;
    else redirect(`/day/${dayNumber}`);
  }

  const detail = selectedId ? buildItemDetail(learnerId, selectedId) : null;

  return (
    <DayModule
      dayNumber={dayNumber}
      dayTitle={meta.title}
      initialSnapshot={snapshot}
      initialSelectedId={selectedId}
      initialDetail={detail}
    />
  );
}
