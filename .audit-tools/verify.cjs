const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:768,height:1024}});const out={};
await p.goto('http://localhost:3000/',{waitUntil:'networkidle'});await p.waitForTimeout(1200);out.tabletSearch=await p.locator('button[type="submit"]').first().evaluate(e=>({text:e.innerText,rect:e.getBoundingClientRect().toJSON(),viewport:innerWidth}));
out.images=await p.locator('img').evaluateAll(es=>es.filter(e=>e.complete&&!e.naturalWidth).map(e=>({src:e.src,alt:e.alt})));
await p.setViewportSize({width:390,height:844});await p.goto('http://localhost:3000/properties',{waitUntil:'networkidle'});await p.screenshot({path:__dirname+'/mobile-list-confirmed.png'});
await p.locator('#filter-search').fill('Tanger');await p.waitForTimeout(1400);await p.locator('#filter-search').fill('Marrakech');await p.waitForTimeout(1400);const current=p.url();await p.goBack({waitUntil:'networkidle'});out.back={before:current,after:p.url(),input:await p.locator('#filter-search').inputValue()};
await p.goto('http://localhost:3000/contact',{waitUntil:'networkidle'});await p.waitForTimeout(800);await p.screenshot({path:__dirname+'/mobile-contact.png',fullPage:true});
await p.goto('http://localhost:3000/register-property',{waitUntil:'networkidle'});await p.screenshot({path:__dirname+'/mobile-register.png',fullPage:true});
fs.writeFileSync(__dirname+'/verified.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));await b.close()})().catch(e=>{console.error(e);process.exitCode=1});
