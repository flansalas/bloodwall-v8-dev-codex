import { cookies } from "next/headers";
import MePageClient from "./MePageClient";

export default function Page() {
  const email = cookies().get("userEmail")?.value ?? null;
  return <MePageClient email={email} />;
}
