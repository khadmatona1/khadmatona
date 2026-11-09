const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 for(const width of [1440,390,768]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/properties','/reserver','/register-property','/contact','/services','/about','/blog']){
   try{
    const response=await page.goto('http://localhost:3000'+route,{waitUntil:'networkidle',timeout:60000});
    await page.evaluate(async()=>{for(let i=0;i<document.body.scrollHeight;i+=650){window.scrollTo(0,i);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0)});
    await page.screenshot({path:__dirname+'/'+width+'-'+(route.slice(1)||'home')+'.png',fullPage:true});
    results.push({width,route,status:response.status(),...await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,dir:document.documentElement.dir,scrollWidth:document.documentElement.scrollWidth,text:document.querySelector('main')?.innerText.slice(0,6500),overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&getComputedStyle(e).position!=='fixed'}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,70)})),links:[...document.querySelectorAll('main a')].map(e=>({text:e.innerText,href:e.getAttribute('href')}))}))});
   }catch(e){results.push({width,route,error:e.message})}
   fs.writeFileSync(__dirname+'/results.json',JSON.stringify({results,errors},null,2));
   console.log(width,route,results.at(-1).status||results.at(-1).error);
  }
 }
 await browser.close();
})();
