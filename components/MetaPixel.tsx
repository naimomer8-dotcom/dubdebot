"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

/** Meta pixel (dataset "ניר דובדבני חברה's Pixel"). Browser events carry an eventID so the
 *  server copy (lib/metaCapi.ts) is deduplicated by Meta. Never sends personal data from the browser. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "454361155165301";

type Fbq = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function pixelTrack(event: string, params: Record<string, unknown> = {}, eventId?: string) {
  try {
    if (typeof window === "undefined" || !window.fbq) return;
    if (eventId) window.fbq("track", event, params, { eventID: eventId });
    else window.fbq("track", event, params);
  } catch {}
}

export default function MetaPixel() {
  const path = usePathname();
  // one PageView per client-side navigation (the base snippet sends the first one)
  useEffect(() => {
    if (window.fbq && (window as unknown as { __fbFirst?: boolean }).__fbFirst) window.fbq("track", "PageView");
    (window as unknown as { __fbFirst?: boolean }).__fbFirst = true;
  }, [path]);
  if (!META_PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}</Script>
  );
}

/** Fires one event once when mounted (used on server-rendered pages such as /pay/thanks). */
export function PixelEvent({ event, params, eventId }: { event: string; params?: Record<string, unknown>; eventId?: string }) {
  useEffect(() => {
    const key = `px_${event}_${eventId ?? ""}`;
    try {
      if (eventId && sessionStorage.getItem(key)) return;
      if (eventId) sessionStorage.setItem(key, "1");
    } catch {}
    const t = setTimeout(() => pixelTrack(event, params ?? {}, eventId), 600);
    return () => clearTimeout(t);
  }, [event, eventId, params]);
  return null;
}
