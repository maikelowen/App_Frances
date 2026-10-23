import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { readProfile } from "@/lib/profile";
import OnboardingForm from "@/components/OnboardingForm";

export const metadata = { title: "Tu plan · TravelLingo" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  // Si ya tiene perfil, la misma página sirve para editarlo.
  const profile = readProfile(user);

  return (
    <OnboardingForm
      firstName={user.firstName}
      initial={profile ? {
        name: profile.name ?? user.firstName ?? "",
        companions: profile.companions ?? [],
        language: profile.language,
        level: profile.level,
        goal: profile.goal,
        context: profile.context,
        tripDate: profile.tripDate ?? "",
        dailyMinutes: profile.dailyMinutes ?? 10,
      } : null}
    />
  );
}
