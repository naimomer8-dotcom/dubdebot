import { notFound } from "next/navigation";
import ConsentGate from "@/components/ConsentGate";

// Design preview of the consent gate. Disabled in production.
export default function PreviewConsent() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ConsentGate firstName="מיכל" />;
}
