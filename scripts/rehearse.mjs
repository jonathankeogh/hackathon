import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { io } = require('socket.io-client');
const base = process.env.DEMO_URL || 'http://localhost:3000';
const label = process.argv[2] || 'baseline';
const out = path.resolve(process.env.DEMO_ARTIFACTS || 'artifacts/demo', label);
await fs.mkdir(out, { recursive: true });
const errors = [], timeline = [], notes = [];
const t0 = Date.now();
const observer = io(base, { auth: { adminKey: process.env.ADMIN_KEY || '' }, transports: ['websocket'] });
let state;
observer.on('state', next => { state = next; timeline.push({ ms: Date.now()-t0, status: next.plan?.status || 'none', count: next.attendeeCount, unlocked: next.commitments.filter(c=>c.status==='unlocked').map(c=>c.offers), explanation: next.explanation }); });
observer.on('cascade', payload => timeline.push({ ms: Date.now()-t0, cascade: payload.order }));
const until = async (fn, title, ms=20000) => {
  const start = Date.now();
  while(!fn()) { if(Date.now()-start>ms) throw Error(`Timeout: ${title}`); await new Promise(r=>setTimeout(r,15)); }
};
const browser = await chromium.launch({ channel:process.env.BROWSER_CHANNEL || 'chrome', headless:true });
const stageContext = await browser.newContext({ viewport:{width:1920,height:1080}, reducedMotion:process.env.REDUCED_MOTION==='true'?'reduce':'no-preference' });
const stage = await stageContext.newPage();
const admin = await stageContext.newPage();
const phoneContexts = [];
const pages = [stage,admin];
const monitor = (p, name) => { p.on('pageerror', e=>errors.push({page:name,type:'pageerror',text:e.message})); p.on('console',m=>{if(m.type()==='error') errors.push({page:name,type:'console',text:m.text()});}); p.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED')) errors.push({page:name,type:'requestfailed',text:r.url()+': '+r.failure()?.errorText});}); };
monitor(stage,'stage'); monitor(admin,'admin');
const shot = async (p, name) => {
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow,false, name + ': no horizontal overflow');
  await p.screenshot({path:path.join(out,`${name}.png`),animations:'disabled'}); };
let passed=false;
try {
  await until(()=>state,'initial socket');
  observer.emit('admin:reset');
  await until(()=>state.plan===null&&state.attendeeCount===12,'reset');
  timeline.length = 0;
  await stage.goto(`${base}/stage`); await admin.goto(`${base}/admin${process.env.ADMIN_KEY?'?key='+encodeURIComponent(process.env.ADMIN_KEY):''}`);
  await stage.getByTestId('attendee-count').waitFor();
  await shot(stage,'stage-idle');
  await admin.getByTestId('chat-input').fill('we should run a hands-on Grok agents workshop next week');
  await admin.getByRole('button',{name:'Send',exact:true}).click();
  await until(()=>state.plan?.status==='blocked'&&state.explanation,'blocked with explanation');
  await shot(stage,'stage-blocked');
  for (const [i,name] of ['Ada','Noor','Ellis'].entries()) {
    const context = await browser.newContext({viewport:{width:Number(process.env.PHONE_WIDTH || 390),height:Number(process.env.PHONE_HEIGHT || 844)},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    if(process.env.TTS_FAILURE==='true' && i===2) await context.addInitScript(() => {
      Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(u){setTimeout(()=>u.onerror?.({error:'synthesis-failed'}),100);},getVoices(){return [];}}});
    });
    if(process.env.TTS_NO_BOUNDARIES==='true' && i===2) await context.addInitScript(() => {
      Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(u){setTimeout(()=>u.onstart?.({}),20);setTimeout(()=>u.onend?.({}),16000);}}});
    });
    phoneContexts.push(context);
    const phone = await context.newPage(); pages.push(phone); monitor(phone,`phone-${name}`);
    await phone.goto(`${base}/join`);
    await phone.getByTestId('name-input').waitFor();
    if(i===0) await shot(phone,'phone-name');
    await phone.getByTestId('name-input').fill(name);
    await phone.getByRole('button',{name:'Join',exact:true}).click();
    await phone.getByTestId('joined-as').waitFor();
    if(i===0) {
      await shot(phone,'phone-roles');
      await phone.getByRole('button',{name:"I'm in",exact:true}).click();
      await shot(phone,'phone-confirmed');
      await phone.reload();
      await phone.getByTestId('joined-as').waitFor();
      assert.match(await phone.getByTestId('joined-as').innerText(),/Ada/);
      await until(()=>state.attendeeCount===13,'reconnect count');
    }
    if(i===1) { await until(()=>state.attendeeCount===14,'14 attendees'); await shot(stage,'stage-14'); }
    if(i===2) {
      await until(()=>state.commitments.some(c=>c.status==='unlocked'),'first relay');
      await shot(stage,'stage-half-unlocked');
      await until(()=>timeline.some(x=>x.status==='viable'),'viable event');
      await stage.locator('[data-testid="plan-status"][data-status="viable"]').waitFor();
      await stage.waitForFunction(() => !document.querySelector('.stage-flap-leaf'));
      await shot(stage,'stage-viable');
      if(state.plan.status==='booked') notes.push('VIABLE screenshot landed after BOOKED; viable has no visible dwell.');
      await until(()=>state.plan?.status==='booked','booked');
      await stage.locator('[data-testid="plan-status"][data-status="booked"]').waitFor();
      await stage.waitForFunction(() => !document.querySelector('.stage-flap-leaf'));
      await shot(stage,'stage-booked');
      await pages[2].getByTestId('invite').waitFor(); await shot(pages[2],'phone-invite');
      await pages[2].screenshot({path:path.join(out,'phone-invite-full.png'),fullPage:true});
      await phone.getByRole('button',{name:'Accept',exact:true}).waitFor({timeout:15000});
      await shot(phone,'phone-incoming');
      await phone.getByRole('button',{name:'Accept',exact:true}).click();
      await phone.getByRole('button',{name:'Hang up',exact:true}).waitFor();
      if(process.env.TTS_FAILURE==='true') await phone.getByText('Read along',{exact:true}).waitFor({timeout:3000});
      if(process.env.TTS_NO_BOUNDARIES==='true') await phone.waitForFunction(() => {const transcript=document.querySelector('[data-testid="call-transcript"]');const current=transcript?.querySelector('.word-current');return !!current && current.textContent.trim() !== transcript.querySelector('span')?.textContent.trim();},{},{timeout:2000});
      await shot(phone,'phone-connected');
      await phone.getByTestId('invite').waitFor({timeout:65000});
      await shot(phone,'phone-call-complete');
      // The preserved first phone must return to RSVP after re-seed, not retain an old invite.
      observer.emit('admin:seed');
      await until(()=>state.plan===null,'re-seed');
      await new Promise(r=>setTimeout(r,150));
      if(await pages[2].getByTestId('invite').count()) notes.push('BUG: re-seed leaves the previous invitation visible on a preserved phone.');
      assert.equal(await pages[2].getByTestId('invite').count(),0,'Re-seed must clear the previous invitation on a preserved phone');
    }
  }
  assert.equal(state.attendeeCount,15);
  assert.equal(errors.length,0,'Browser console/page/network errors must be empty');
  const viable = timeline.find(x=>x.status==='viable'), booked = timeline.find(x=>x.status==='booked');
  assert.ok(viable && booked && booked.ms-viable.ms >= 1500,'VIABLE must remain visible before booking');
  passed=true;
} catch(e) { notes.push(e.stack); process.exitCode=1; }
finally {
  const viable = timeline.find(x=>x.status==='viable'), booked = timeline.find(x=>x.status==='booked');
  const result={label,base,passed,errors,notes,viableDwellMs:viable&&booked?booked.ms-viable.ms:null,timeline};
  await fs.writeFile(path.join(out,'run.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({label,passed,errors,notes,viableDwellMs:result.viableDwellMs,out},null,2));
  observer.close(); await browser.close();
}
