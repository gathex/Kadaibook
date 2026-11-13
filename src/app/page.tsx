import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }
  redirect("/dashboard");
}
