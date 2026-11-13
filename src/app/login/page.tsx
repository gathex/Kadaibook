import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) {
    redirect("/dashboard");
  }

  return <AuthForm mode="login" />;
}

