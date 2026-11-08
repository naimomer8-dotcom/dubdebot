import { notFound } from "next/navigation";
import GraphicStudio from "@/components/GraphicStudio";
export default function P() { if (process.env.NODE_ENV === "production") notFound(); return <div style={{ padding: 16, direction: "rtl" }}><GraphicStudio /></div>; }
