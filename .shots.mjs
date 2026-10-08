import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:1 });
  await p.goto('https://dubdebot.vercel.app/', { waitUntil:'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path:`shot_land_${tag}.png` });
  await p.evaluate(()=>document.querySelector('.vision-sec')?.scrollIntoView());
  await p.waitForTimeout(1200);
  await p.screenshot({ path:`shot_vision_${tag}.png` });
  await p.close();
}
await b.close();
