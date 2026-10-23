import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { readProfile } from "@/lib/profile";
import Landing from "@/components/Landing";
import LearnApp from "@/components/LearnApp";

export default async function Home() {
  const user = await currentUser();

  // 1. Visitante: landing comercial
  if (!user) return <Landing />;

  // 2. Registrado sin perfil: al onboarding
  const profile = readProfile(user);
  if (!profile) redirect("/onboarding");

  // 3. App personalizada
  return <LearnApp userId={user.id} profile={profile} />;
}
