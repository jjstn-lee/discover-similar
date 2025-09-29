// app/login/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { signIn } from "next-auth/react";
import LoginCard from "@/components/LoginCard";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) redirect("/");

  return (
    <LoginCard/>
  );
}
