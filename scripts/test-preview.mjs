import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import {chromium,devices} from 'playwright';
const root=new URL('../dist-preview/',import.meta.url);const headers=await readFile(new URL('_headers',root),'utf8'),csp=headers.match(/Content-Security-Policy: (.+)/)[1];
const files={'/':['index.html','text/html'],'/engine/invaders.js':['engine/invaders.js','text/javascript'],'/engine/invaders.css':['engine/invaders.css','text/css']};
const server=createServer(async(req,res)=>{const f=files[new URL(req.url,'http://localhost').pathname];if(!f)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':f[1],'Content-Security-Policy':csp});res.end(await readFile(new URL(f[0],root)))});
const browser=await chromium.launch();try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
for(const [name,opts] of [['desktop',{viewport:{width:1280,height:800}}],['portrait',devices['Pixel 7']],['landscape',{...devices['Pixel 7'],viewport:{width:844,height:390}}]]){
 const ctx=await browser.newContext(opts),errors=[],external=[];await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();external.push(r.request().url());return r.abort()});await ctx.addInitScript(()=>{window.spoken=[];speechSynthesis.getVoices=()=>[];speechSynthesis.speak=u=>{spoken.push([u.lang,u.text]);queueMicrotask(()=>u.onend?.())}});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.getByRole('button',{name:'Play sample',exact:true}).click();assert.deepEqual(await p.locator('.gamebar button').allTextContents(),['PAUSE','RESTART','MAIN MENU','SOUND ON']);assert.equal(await p.locator('iframe').count(),0);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok(await p.locator('.gamebar button').evaluateAll(bs=>bs.every(b=>b.getBoundingClientRect().height>=44)));
 const initial=await p.evaluate(()=>shipX);await p.keyboard.down('ArrowRight');await p.waitForTimeout(160);await p.keyboard.up('ArrowRight');assert.ok(await p.evaluate(()=>shipX)>initial);
 await p.getByRole('button',{name:'PAUSE',exact:true}).click();const pos=await p.evaluate(()=>shipX);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(120);await p.keyboard.up('ArrowLeft');assert.equal(await p.evaluate(()=>shipX),pos);await p.getByRole('button',{name:'RESUME',exact:true}).click();
 // Real bullet collision advances exactly one word and preserves score/assembly.
 await p.evaluate(()=>{const e=wave.find(e=>e.word===sentences[0].words[0]);e.y=180;shipX=e.laneX;spawnDelay=0;fire()});await p.waitForFunction(()=>step===1);assert.equal(await p.evaluate(()=>score),25);assert.equal(await p.locator('.tile:not(.ghost)').first().textContent(),'Yo');
 await p.evaluate(()=>hit(wave.find(e=>e.word!==sentences[idx].words[step])));assert.equal(await p.evaluate(()=>lives),2);assert.equal(await p.evaluate(()=>step),1);assert.equal(await p.locator('#notice').textContent(),'NOPE');
 assert.ok(await p.evaluate(()=>wave.some(e=>e.alive&&e.word===sentences[idx].words[step])));
 // Complete a sentence, verify exact full target speech, then restart mid-transition.
 await p.evaluate(()=>{while(!completed)hit(wave.find(e=>e.word===sentences[idx].words[step]))});await p.getByText('Yo trabajaré mañana.',{exact:true}).waitFor();assert.ok((await p.evaluate(()=>spoken)).some(x=>x[0]==='es-ES'&&x[1]==='Yo trabajaré mañana.'));
 await p.getByRole('button',{name:'RESTART',exact:true}).click();await p.waitForTimeout(1300);assert.deepEqual(await p.evaluate(()=>[idx,step,lives,score]),[0,0,3,0]);
 if(name==='portrait'){
  const deck=p.locator('#thumbDeck'),b=await deck.boundingBox();await p.evaluate(()=>spawnDelay=0);await deck.tap();assert.equal(await p.evaluate(()=>bullets.length),1);
  await p.evaluate(()=>bullets=[]);await p.dispatchEvent('#thumbDeck','pointerdown',{pointerType:'touch',pointerId:7,clientX:b.x+b.width/2,clientY:b.y+20});await p.dispatchEvent('#thumbDeck','pointermove',{pointerType:'touch',pointerId:7,clientX:b.x+b.width*.7,clientY:b.y+20});await p.dispatchEvent('#thumbDeck','pointerup',{pointerType:'touch',pointerId:7,clientX:b.x+b.width*.7,clientY:b.y+20});assert.equal(await p.evaluate(()=>bullets.length),0);
  await p.evaluate(()=>{spawnDelay=0;enemyFireTimer=0;enemyFire(.1)});assert.ok(await p.evaluate(()=>enemyBullets.length)>0);
 }
 // Long labels stay inside lanes and the correct answer remains available.
 await p.evaluate(()=>start([['Long prompt '.repeat(40),'Donaudampfschifffahrtsgesellschaft foo bar baz'],['Other','eins zwei drei vier']], 'de-DE'));
 assert.ok(await p.evaluate(()=>wave.every(e=>e.x>=W/8-1&&e.x<=W-W/8+1)));assert.equal(await p.evaluate(()=>wave.filter(e=>e.word===sentences[0].words[0]).length),1);
 await p.getByRole('button',{name:'SOUND ON',exact:true}).click();await p.getByRole('button',{name:'MAIN MENU',exact:true}).click();assert.equal(await p.evaluate(()=>running),false);assert.equal(await p.evaluate(()=>timers.size),0);assert.equal(await p.getByRole('button',{name:'Play sample',exact:true}).isVisible(),true);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await ctx.close();console.log(name+' passed');
}
}finally{await browser.close();server.close()}
