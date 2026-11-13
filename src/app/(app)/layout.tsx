import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, shop } = await requireAuth();

  return (
    <AppShell shopName={shop.name} ownerName={user.name}>
      {children}
    </AppShell>
  );
}

