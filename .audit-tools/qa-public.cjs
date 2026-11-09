const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
 const page = await context.newPage(); page.setDefaultTimeout(20000);
 const checks = []; const errors = []; page.on('pageerror', e => errors.push(e.message));
 async function check(name, fn) { if(process.env.QA_ONLY && !name.includes(process.env.QA_ONLY)) return; try { await fn(); checks.push({name,pass:true}); console.log('PASS',name); } catch(e) { checks.push({name,pass:false,error:e.message}); console.log('FAIL',name,e.message.slice(0,350)); } fs.writeFileSync(__dirname+(process.env.QA_ONLY?'/qa-layout.json':'/qa-results.json'), JSON.stringify({checks,errors},null,2)); }
 try {
 await check('tablet search button visible and usable', async()=>{
  const response = await page.goto('http://localhost:3000/', {waitUntil:'networkidle',timeout:60000}); assert.equal(response.status(),200);
  const button = page.locator('[data-analytics-cta="hero_search"]');
  const box = await button.boundingBox(); assert(box.x>=0 && box.x+box.width<=768);
  await page.screenshot({path:__dirname+'/after-tablet.png'});
  await page.locator('select[name="transaction_type"]').selectOption('rent');
  await page.locator('select[name="price_period"]').selectOption('month');
  await page.locator('input[name="price_max"]').fill('7000'); await button.click();
  await page.waitForURL('**/properties?**'); assert(page.url().includes('transaction_type=rent')); assert(page.url().includes('price_max=7000'));
 });
 await check('mobile filters collapse and show results before fold', async()=>{
  await page.setViewportSize({width:390,height:844}); await page.goto('http://localhost:3000/properties',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#advanced-property-filters').isVisible(),false);
  await page.locator('main a[href^="/properties/"]').first().waitFor();
  const box = await page.locator('main a[href^="/properties/"]').first().boundingBox(); assert(box.y<844);
  await page.screenshot({path:__dirname+'/after-mobile-list.png'});
  await page.getByRole('button',{name:'Filtres',exact:true}).click(); assert(await page.locator('#advanced-property-filters').isVisible());
  await page.getByLabel('Prix min. (DH)',{exact:true}).fill('3000'); await page.getByLabel('Prix max. (DH)',{exact:true}).fill('7000');
  await page.getByRole('button',{name:'Afficher les résultats',exact:true}).click(); await page.waitForURL('**price_min=3000**');
  assert(!await page.locator('#advanced-property-filters').isVisible());
 });
 await check('search, sorting and browser back keep criteria in sync', async()=>{
  await page.goto('http://localhost:3000/properties',{waitUntil:'networkidle'});
  await page.locator('#filter-search').fill('Tanger'); await page.getByRole('button',{name:'Rechercher',exact:true}).click();await page.waitForURL('**search=Tanger');
  await page.getByLabel('Trier par').selectOption('price'); await page.waitForURL('**sort=price');
  await page.goBack({waitUntil:'networkidle'}); assert.equal(await page.locator('#filter-search').inputValue(),'Tanger'); assert(!page.url().includes('sort='));
  await page.goBack({waitUntil:'networkidle'}); assert.equal(await page.locator('#filter-search').inputValue(),'');
 });
 await check('mobile menu traps focus and restores it on escape', async()=>{
  const trigger = page.getByRole('button',{name:'Ouvrir le menu',exact:true});
  await trigger.click(); const dialog=page.getByRole('dialog'); await dialog.waitFor();
  for(let i=0;i<14;i++) await page.keyboard.press('Tab');
  assert(await dialog.evaluate(e=>e.contains(document.activeElement)));
  await page.keyboard.press('Escape'); assert.equal(await dialog.count(),0); assert(await trigger.evaluate(e=>e===document.activeElement));
 });
 let propertyPath;
 await check('property inquiry only exposes one form at a time', async()=>{
  await page.goto('http://localhost:3000/properties',{waitUntil:'networkidle'});
  propertyPath = await page.locator('main a[href^="/properties/"]').first().getAttribute('href');
  await page.goto('http://localhost:3000'+propertyPath,{waitUntil:'networkidle'});
  assert.equal(await page.locator('#inquiry form:visible').count(),1);
  const stay=page.getByRole('button',{name:'Demander un séjour',exact:true});
  if(await stay.count()){ await stay.click(); assert.equal(await page.locator('#inquiry form:visible').count(),1); await page.getByRole('button',{name:'Demander une visite',exact:true}).click(); }
  await page.screenshot({path:__dirname+'/after-mobile-detail.png',fullPage:true});
 });
 await check('registration compresses phone photos and accepts empty email', async()=>{
  await page.goto('http://localhost:3000/register-property',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#email').getAttribute('required'),null);
  assert.equal(await page.locator('details').first().getAttribute('open'),null);await page.locator('summary').click();
  const data = await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2000;c.height=1500;const ctx=c.getContext('2d');const d=ctx.createImageData(c.width,c.height);let seed=7;for(let i=0;i<d.data.length;i+=4){seed=(seed*16807)%2147483647;d.data[i]=seed%256;d.data[i+1]=(seed>>8)%256;d.data[i+2]=(seed>>16)%256;d.data[i+3]=255;}ctx.putImageData(d,0,0);return c.toDataURL('image/png').split(',')[1]});
  const buffer = Buffer.from(data,'base64');assert(buffer.length>2*1024*1024);
  await page.locator('#photos').setInputFiles({name:'phone-photo.png',mimeType:'image/png',buffer});
  await page.locator('img[alt$=".jpg"]').waitFor({state:'attached',timeout:30000});
  await page.locator('input[name="transaction"][value="sell_request"]').check();
  await page.locator('input[name="propertyType"][value="apartment"]').check();
  await page.locator('#area').fill('80');await page.locator('#price').fill('900000');await page.locator('#district').fill('Gueliz');await page.locator('#address').fill('Gueliz, Marrakech');await page.locator('#name').fill('Browser QA');await page.locator('#phone').fill('0612345678');await page.locator('#consent').check();
  let captured=false;await page.route('**/api/v1/leads',async route=>{captured=true;const bytes=route.request().postDataBuffer();const body=bytes.toString();assert(body.includes('sell_request'));assert(body.includes('name="photos[]"'));assert(bytes.length<3*1024*1024);await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{id:999999}})})});
  await page.locator('button[type="submit"]').click();await page.locator('[role="status"]').filter({hasText:/KI-999999/}).waitFor();assert(captured);
  await page.unroute('**/api/v1/leads');
 });
 await check('saved alerts submit the selected transaction and rental period', async()=>{
  await page.goto('http://localhost:3000/properties?transaction_type=rent&price_period=month',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Recevoir des alertes pour cette recherche',exact:true}).click();
  const form=page.locator('form').filter({has:page.locator('input[name="phone"]')});
  await form.locator('input[name="phone"]').fill('0612345678');
  let captured=false;await page.route('**/api/v1/property-alerts',async route=>{const body=route.request().postDataJSON();assert.equal(body.transaction_type,'rent');assert.equal(body.price_period,'month');captured=true;await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{id:999999},meta:{already_existed:false}})})});
  await form.locator('button[type="submit"]').click();await page.waitForTimeout(500);assert(captured);await page.unroute('**/api/v1/property-alerts');
 });
 await check('rate limiting shows a recoverable inline message', async()=>{
  await page.route('**/api/v1/properties?*',route=>route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({success:false,message:'Too many attempts',errors:{}})}));
  await page.goto('http://localhost:3000/properties',{waitUntil:'networkidle'});
  await page.getByRole('alert').filter({hasText:'Patientez une minute'}).waitFor();assert(await page.getByRole('button',{name:'Réessayer',exact:true}).isVisible());
  await page.unroute('**/api/v1/properties?*');await page.getByRole('button',{name:'Réessayer',exact:true}).click();await page.locator('main a[href^="/properties/"]').first().waitFor();
 });
 await check('Arabic and light theme render without horizontal overflow', async()=>{
  await context.addCookies([{name:'NEXT_LOCALE',value:'ar',url:'http://localhost:3000'}]);
  await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){console.log('OVERFLOW',width,await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1)}).slice(0,18).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,50),rect:e.getBoundingClientRect().toJSON()}))));await page.screenshot({path:__dirname+'/overflow-'+width+'.png'});}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`)}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:__dirname+'/after-ar-light.png'});
 });
 } finally { await browser.close(); }
 console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length,errors}));if(checks.some(c=>!c.pass)||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
