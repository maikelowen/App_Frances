import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { readProfile } from "@/lib/profile";
import Landing from "@/components/Landing";
import AppProvider from "@/components/AppProvider";
import TabBar from "@/components/TabBar";

// Todas las pantallas de la app comparten perfil, progreso y barra de navegación.
export default async function AppLayout({ children }) {
  const user = await currentUser();

  // 1. Visitante: landing
  if (!user) return <Landing />;

  // 2. Registrado sin perfil: al onboarding
  const profile = readProfile(user);
  if (!profile) redirect("/onboarding");

  // 3. App personalizada
  return (
    <AppProvider userId={user.id} firstName={user.firstName} profile={profile}>
      <div
        className="mx-auto flex min-h-full w-full max-w-lg flex-col pb-28"
        style={{
          paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
          paddingTop: "max(16px, env(safe-area-inset-top, 0px))",
        }}>
        {children}
      </div>
      <TabBar />
    </AppProvider>
  );
}
