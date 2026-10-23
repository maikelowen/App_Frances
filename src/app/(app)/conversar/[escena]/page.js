import { Suspense } from "react";
import ConversationScreen from "@/components/screens/ConversationScreen";

export default async function ConversationPage({ params }) {
  const { escena } = await params;
  return (
    <Suspense>
      <ConversationScreen index={Number(escena)} />
    </Suspense>
  );
}
