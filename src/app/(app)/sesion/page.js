import { Suspense } from "react";
import SessionScreen from "@/components/screens/SessionScreen";

export default function SessionPage() {
  // SessionScreen lee ?tema= con useSearchParams, que necesita un Suspense alrededor.
  return (
    <Suspense>
      <SessionScreen />
    </Suspense>
  );
}
