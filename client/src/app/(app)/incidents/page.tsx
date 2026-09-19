import { Suspense } from "react";
import { IncidentQueue } from "@/features/incidents/IncidentQueue";
import { Skeleton } from "@/components/ui/primitives";

export default function IncidentQueuePage() {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-[420px]" />}>
      <IncidentQueue />
    </Suspense>
  );
}
