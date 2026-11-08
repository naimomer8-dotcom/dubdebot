"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import GraphicStudio from "./GraphicStudio";
import type { ConvItem, ShellUser } from "@/lib/data";

export default function StudioPage({ user, conversations }: { user: ShellUser; conversations: ConvItem[] }) {
  const [side, setSide] = useState(false);
  return (
    <div className="app home-app">
      <Sidebar active="home" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
      <main className="main home-main">
        <div className="home room cmp">
          <header className="home-top">
            <button className="icon-btn mobile-only home-ibtn" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={19} /></button>
            <Link href="/home" className="room-back"><Icon name="arrow" size={18} /> חזרה לבית</Link>
          </header>
          <div className="room-head">
            <span className="room-ico room-ico-lg" aria-hidden="true"><Icon name="image" size={30} /></span>
            <div><h1>סטודיו גרפיקה</h1><p>8 סגנונות, פוסט, סטורי או ריבוע. בוחרים, כותבים (או שניר כותב), ומורידים.</p></div>
          </div>
          <GraphicStudio />
        </div>
      </main>
    </div>
  );
}
