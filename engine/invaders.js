'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const mobilePortrait=matchMedia('(max-width:700px) and (orientation:portrait) and (pointer:coarse)').matches;
const W=mobilePortrait?600:960,H=mobilePortrait?900:600;canvas.width=W;canvas.height=H;
let activeLanguage='es-ES',sentences=[],running=false,rafId=0,touchDir=0;const timers=new Set();
function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id}
function clearTimers(){for(const id of timers)clearTimeout(id);timers.clear()}
function stopSpeech(){window.speechSynthesis?.cancel()}
function tokenize(t){return t.trim().replace(/[.!?。！？]+$/u,'').split(/\s+/).filter(Boolean).map(w=>w.replace(/[.!?。！？]+$/u,''))}
function makeSentence(pair,pool){const words=tokenize(pair[1]);return {en:pair[0],target:pair[1],words,waves:words.map(w=>{const result=[w],seen=new Set([w.toLocaleLowerCase(activeLanguage)]);for(const candidate of [...words,...pool]){const key=candidate.toLocaleLowerCase(activeLanguage);if(!seen.has(key)){result.push(candidate);seen.add(key)}if(result.length===4)break}return result})}}
function start(pairs,lang='es-ES'){
 if(!Array.isArray(pairs)||pairs.length<2||pairs.length>100||pairs.some(p=>!Array.isArray(p)||p.length!==2||p.some(t=>typeof t!=='string'||!t.trim()||t.length>1000)||!tokenize(p[1]).length))return;
 stop();activeLanguage=lang;const pool=[...new Set(pairs.flatMap(p=>tokenize(p[1])))];sentences=pairs.map(p=>makeSentence(p,pool));
 $('preview').hidden=true;$('gameArea').hidden=false;$('gameArea').style.display='flex';running=true;restart();last=performance.now();rafId=requestAnimationFrame(frame);
}
function stop(){running=false;cancelAnimationFrame(rafId);rafId=0;clearTimers();completionToken++;keys.clear();touchDir=0;stopSpeech()}
function back(){stop();$('gameArea').hidden=true;$('gameArea').style.display='none';$('preview').hidden=false}
let completionToken=0;let idx=0,step=0,score=0,lives=3,paused=false,over=false,wave=[],bullets=[],enemyBullets=[],enemyFireTimer=1.5,invulnerable=0,particles=[],shipX=480,last=0,spawnDelay=0,flashUntil=0,noticeTimer=0,keys=new Set(),completed=false;const palette=['#6ee7b7','#fca5a5','#fde68a','#c4b5fd'];let audioCtx=null,soundOn=true;function beep(freq=500,dur=.09){if(!soundOn)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.025,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch(e){}}function speak(text){if(!soundOn||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang=activeLanguage;u.rate=.82;let v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(activeLanguage.slice(0,2).toLowerCase()));if(v)u.voice=v;speechSynthesis.speak(u)}catch(e){}}function shuffle(a){return [...a].sort(()=>Math.random()-.5)}function update(){const s=sentences[idx%sentences.length];$('english').textContent=s.en;$('stats').textContent=`SCORE ${String(score).padStart(4,'0')} · ${'♥ '.repeat(lives).trim()}`;$('tiles').innerHTML=s.words.map((w,i)=>`<div class="tile ${i>=step?'ghost':''}">${i<step?escapeHTML(w):'?'}</div>`).join('')}function escapeHTML(t){return t.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}function nextWave(){const s=sentences[idx%sentences.length];if(step>=s.words.length){complete();return}const opts=shuffle(s.waves[step]);wave=opts.map((word,i)=>({word,laneX:W*(i+.5)/opts.length,x:W*(i+.5)/opts.length,y:mobilePortrait?195:125-(i%2)*35,vy:18+Math.min(idx*3,25),color:palette[i],alive:true,phase:Math.random()*6}));bullets=[];enemyBullets=[];enemyFireTimer=1.2+Math.random()*.8;spawnDelay=.65;update()}function newSentence(){completionToken++;$('continue').style.display='none';try{speechSynthesis.cancel()}catch(e){}completed=false;over=false;paused=false;syncPauseButton();step=0;wave=[];bullets=[];$('flash').classList.remove('show');nextWave()}function complete(){completed=true;wave=[];bullets=[];enemyBullets=[];const s=sentences[idx%sentences.length];$('complete').textContent=s.target;$('completeInfo').textContent='Listen to the complete sentence';$('continue').textContent='NEXT SENTENCE ▶';$('flash').classList.add('show');score+=100;update();beep(880,.18);const token=++completionToken;let spoken=false;const go=()=>{if(spoken)return;spoken=true;later(()=>{if(token===completionToken&&completed&&!over&&$('gameArea').style.display!=='none')advance()},1050)};if(soundOn&&'speechSynthesis'in window){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s.target);u.lang=activeLanguage;u.rate=.82;const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(activeLanguage.slice(0,2).toLowerCase()));if(v)u.voice=v;u.onend=go;u.onerror=go;speechSynthesis.speak(u)}catch(e){go()}}else{later(go,1200)}later(go,6500)}function end(){completionToken++;over=true;wave=[];enemyBullets=[];$('complete').textContent='GAME OVER';$('completeInfo').textContent=`Final score: ${score}`;$('continue').textContent='PLAY AGAIN ▶';$('continue').style.display='inline-block';$('flash').classList.add('show')}function wrong(x,y){lives--;beep(170,.2);$('notice').style.opacity='1';noticeTimer=.55;for(let j=0;j<10;j++)particles.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*140,t:.5,c:'#fb7185'});if(lives<=0)end();update()}function hit(enemy){if(enemy.word===sentences[idx%sentences.length].words[step]){score+=25;beep(740,.12);if(step<sentences[idx%sentences.length].words.length-1)speak(enemy.word);for(let j=0;j<15;j++)particles.push({x:enemy.x,y:enemy.y,vx:(Math.random()-.5)*200,vy:(Math.random()-.5)*180,t:.5,c:['#fff2b0','#ffce47','#ff892e','#db6254'][j%4]});step++;wave=[];bullets=[];update();if(step===sentences[idx%sentences.length].words.length)complete();else nextWave()}else{wrong(enemy.x,enemy.y);enemy.alive=false;/* wrong choices are replenished without changing the correct target */later(()=>{if(!completed&&!over&&wave.includes(enemy))enemy.alive=true},650)}}function restart(){artTime=0;clearTimers();keys.clear();touchDir=0;stopSpeech();idx=0;step=0;score=0;lives=3;shipX=W/2;particles=[];enemyBullets=[];invulnerable=0;newSentence()}function enemyFire(dt){if(!mobilePortrait||spawnDelay>0||!wave.length)return;enemyFireTimer-=dt;if(enemyFireTimer>0)return;const shooters=wave.filter(e=>e.alive&&e.y<620);if(shooters.length){const e=shooters[Math.floor(Math.random()*shooters.length)];enemyBullets.push({x:e.x,y:e.y+68});beep(230,.03)}enemyFireTimer=1.35+Math.random()*.85}
function fire(){if(paused||completed||over||spawnDelay>0)return;if(bullets.length>=2)return;bullets.push({x:shipX,y:mobilePortrait?770:480});beep(390,.04)}// Original pixel art: amber rocket and glass-domed Martian saucers.
// Art scale is independent of collision bounds and movement speeds.
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
let artTime=0;
function artRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function artPoly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
function drawRocket(x,y){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(2,2);
 const flicker=reducedMotion?0:Math.floor(artTime*12)%3;
 // Three nested exhaust colors retain a crisp pixel silhouette.
 artPoly([[-6,13],[-6,20],[-4,20],[-4,24+flicker],[-2,24+flicker],[-2,30+flicker],[0,33+flicker],[2,28+flicker],[4,28+flicker],[4,21],[6,21],[6,13]],'#e9541d');
 artPoly([[-4,14],[-4,22],[-2,22],[0,30+flicker],[2,24],[4,21],[4,14]],'#ffbd22');
 artPoly([[-2,14],[-2,22],[0,27+flicker],[2,21],[2,14]],'#fff2a3');
 // Dark outline, orange side shading and broad gold nose.
 artPoly([[-3,-24],[3,-24],[3,-20],[6,-20],[6,-15],[9,-15],[9,-7],[13,-7],[13,12],[8,12],[8,17],[-8,17],[-8,12],[-13,12],[-13,-7],[-9,-7],[-9,-15],[-6,-15],[-6,-20],[-3,-20]],'#322943');
 artRect(-12,-5,4,17,'#376c80');artRect(8,-5,4,17,'#27536d');
 artRect(-14,-1,3,10,'#69c7b3');artRect(11,-1,3,10,'#49a895');
 artRect(-8,-13,16,27,'#ec771b');artRect(-6,-18,12,29,'#ffaf22');artRect(-3,-23,6,34,'#ffd32c');
 artRect(-6,-12,3,20,'#ffd950');artRect(5,-9,3,22,'#c85b1c');
 artRect(-7,12,14,4,'#a84b27');artRect(-4,16,8,2,'#78617a');
 // Mint cockpit, glass highlights and bolts.
 artRect(-5,-14,10,2,'#d4a234');artRect(-7,-12,14,8,'#83d5c6');artRect(-5,-14,10,12,'#83d5c6');
 artRect(-4,-12,8,8,'#d6fff3');artRect(-2,-13,4,10,'#effff7');artRect(-5,-11,2,3,'#fff');
 artRect(-5,5,2,2,'#fff0a8');artRect(3,5,2,2,'#fff0a8');
 ctx.restore();
}
function pixelInvader(x,y,color){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(2,2);
 const blink=reducedMotion?false:Math.floor(artTime*4+x/60)%2===0;
 // Stepped glass dome, with a clear outline and directional highlights.
 artPoly([[-13,0],[-13,-8],[-11,-8],[-11,-13],[-8,-13],[-8,-17],[-4,-17],[-4,-19],[4,-19],[4,-17],[8,-17],[8,-13],[11,-13],[11,-8],[13,-8],[13,0]],'#080f20');
 artPoly([[-11,0],[-11,-8],[-9,-8],[-9,-12],[-6,-12],[-6,-15],[-3,-15],[-3,-17],[3,-17],[3,-15],[6,-15],[6,-12],[9,-12],[9,-8],[11,-8],[11,0]],'#839d9e');
 artRect(-9,-9,3,9,'#bdd5cf');artRect(-6,-13,3,5,'#e0f5e8');artRect(-3,-15,7,2,'#e0f5e8');artRect(8,-6,3,6,'#526e78');
 // Green Martian head and black slanted eyes, visible through the glass.
 artRect(-5,-11,10,11,'#12583d');artRect(-7,-8,14,7,'#16754b');artRect(-4,-12,8,2,'#2d9960');
 artPoly([[-5,-7],[-1,-5],[-1,-2],[-4,-3]],'#071b1d');artPoly([[5,-7],[1,-5],[1,-2],[4,-3]],'#071b1d');artRect(-1,-1,2,2,'#6bbd72');
 // A wider gunmetal saucer with colored trim, bevels and illuminated ports.
 artPoly([[-14,-1],[14,-1],[14,1],[18,1],[18,4],[20,4],[20,9],[17,9],[17,12],[12,12],[12,15],[-12,15],[-12,12],[-17,12],[-17,9],[-20,9],[-20,4],[-18,4],[-18,1],[-14,1]],'#080f20');
 artRect(-14,0,28,2,color);artRect(-18,3,36,5,'#697583');artRect(-17,8,34,3,'#465163');artRect(-12,11,24,3,'#82609e');
 artRect(-15,2,30,1,'#c3c9bb');artRect(-17,9,34,2,color);artRect(-8,13,16,2,'#493c70');artRect(-3,15,6,2,'#ffbd45');
 for(let i=0;i<6;i++){const lx=-16+i*6;artRect(lx,5,3,3,blink&&i%2===0?'#fff2a2':['#ff6a64','#d774bb','#ffad45','#8edbea','#b8d75e','#ffd050'][i]);}
 ctx.restore();
}
function draw(){ctx.fillStyle='#101a2d';ctx.fillRect(0,0,W,H);ctx.fillStyle='#30415b';for(let i=0;i<46;i++){const x=(i*197+53)%W,y=(i*107+35)%H;ctx.fillRect(x,y,2,2)}ctx.strokeStyle='#29425c';ctx.beginPath();ctx.moveTo(0,mobilePortrait?800:505);ctx.lineTo(W,mobilePortrait?800:505);ctx.stroke();wave.forEach(e=>{if(!e.alive)return;pixelInvader(e.x,e.y,e.color);const width=Math.max(104,Math.min(192,ctx.measureText(e.word).width+35));ctx.font='bold 18px monospace';const ww=Math.min(W/4-12,Math.max(112,ctx.measureText(e.word).width+30));ctx.fillStyle='#263b55';ctx.strokeStyle=e.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(e.x-ww/2,e.y+40,ww,34,5);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(e.word,e.x,e.y+63,ww-12)});const sy=mobilePortrait?770:470;drawRocket(shipX,sy);ctx.fillStyle='#fde68a';bullets.forEach(b=>ctx.fillRect(b.x-3,b.y-10,6,15));if(mobilePortrait){ctx.fillStyle='#fb7185';enemyBullets.forEach(b=>{ctx.fillRect(b.x-4,b.y,8,19);ctx.fillRect(b.x-7,b.y+5,14,7)});if(invulnerable>0){ctx.strokeStyle='#7dd3fc';ctx.lineWidth=4;ctx.strokeRect(shipX-38,sy-27,76,68)}}particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.t*2);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,5,5)});ctx.globalAlpha=1;if(paused&&!completed){ctx.fillStyle='#101a2dcc';ctx.fillRect(0,0,W,H);ctx.fillStyle='#a5f3fc';ctx.font='bold 42px monospace';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2)}}function frame(ts){rafId=0;if(!running)return;let dt=Math.min((ts-last)/1000||0,.04);last=ts;if(!paused&&!completed&&!over){artTime+=dt;spawnDelay=Math.max(0,spawnDelay-dt);if(mobilePortrait){invulnerable=Math.max(0,invulnerable-dt);enemyFire(dt);enemyBullets.forEach(b=>b.y+=360*dt);for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];if(b.y>H+25){enemyBullets.splice(i,1);continue}if(b.y>746&&b.y<805&&Math.abs(b.x-shipX)<35){enemyBullets.splice(i,1);if(invulnerable===0){invulnerable=1.15;wrong(shipX,770)}if(over)break}}}if(touchDir<0||keys.has('ArrowLeft')||keys.has('KeyA'))shipX=Math.max(35,shipX-420*dt);if(touchDir>0||keys.has('ArrowRight')||keys.has('KeyD'))shipX=Math.min(W-35,shipX+420*dt);bullets.forEach(b=>b.y-=630*dt);bullets=bullets.filter(b=>b.y>-20);wave.forEach(e=>{if(!e.alive)return;e.y+=e.vy*dt;e.x=e.laneX+Math.sin(ts/700+e.phase)*10;for(const b of bullets){if(Math.abs(b.x-e.x)<48&&b.y>e.y-28&&b.y<e.y+69){b.y=-100;hit(e);break}}if(e.y>(mobilePortrait?715:420)&&!completed&&!over){e.y=mobilePortrait?155:110;wrong(e.x,e.y)}})}particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt});particles=particles.filter(p=>p.t>0);if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)$('notice').style.opacity='0'}draw();rafId=requestAnimationFrame(frame)}

function syncPauseButton(){$('pause').textContent=paused?'RESUME':'PAUSE';$('pause').setAttribute('aria-pressed',String(paused))}
function togglePause(){if(!running||over||completed)return;paused=!paused;keys.clear();touchDir=0;syncPauseButton();if(paused)stopSpeech()}
function advance(){if(!running)return;if(over){restart();return}idx++;newSentence()}
$('continue').onclick=advance;$('restart').onclick=restart;$('pause').onclick=togglePause;$('backMenu').onclick=back;
$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(soundOn));if(!soundOn){stopSpeech();try{audioCtx?.suspend()}catch{}}else try{void audioCtx?.resume()}catch{}};
$('play').onclick=()=>start([['I will work tomorrow.','Yo trabajaré mañana.'],['We eat apples every day.','Nosotros comemos manzanas todos los días.']]);
document.addEventListener('keydown',e=>{if(!running)return;if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Space')fire();if(e.code==='KeyP')togglePause();if(e.code==='KeyR')restart();if(e.code==='Enter'&&completed)advance()});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const [id,dir] of [['left',-1],['right',1]]){const b=$(id);b.onpointerdown=e=>{if(!running||paused)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch{};touchDir=dir};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>touchDir=0)}
$('fire').onpointerdown=e=>{e.preventDefault();fire()};
const touch={id:null,startX:0,initialX:0,moved:false,startAt:0};
function clearTouch(){touch.id=null;touch.moved=false;touchDir=0;keys.clear()}
for(const surface of [canvas,$('thumbDeck')]){
 surface.addEventListener('pointerdown',e=>{if(!running||paused||completed||over||touch.id!==null)return;e.preventDefault();if(e.pointerType==='mouse'){if(surface===canvas){const r=canvas.getBoundingClientRect();shipX=Math.max(35,Math.min(W-35,(e.clientX-r.left)*W/r.width));fire()}return}touch.id=e.pointerId;touch.startX=e.clientX;touch.initialX=shipX;touch.startAt=performance.now();touch.moved=false;try{surface.setPointerCapture(e.pointerId)}catch{}},{passive:false});
 surface.addEventListener('pointermove',e=>{if(e.pointerId!==touch.id)return;e.preventDefault();const dx=e.clientX-touch.startX;if(Math.abs(dx)>9)touch.moved=true;if(touch.moved){const r=surface.getBoundingClientRect();shipX=Math.max(35,Math.min(W-35,touch.initialX+dx*W/r.width))}},{passive:false});
 surface.addEventListener('pointerup',e=>{if(e.pointerId!==touch.id)return;e.preventDefault();if(!touch.moved&&performance.now()-touch.startAt<340)fire();clearTouch()},{passive:false});
 for(const ev of ['pointercancel','lostpointercapture'])surface.addEventListener(ev,clearTouch);
}
window.addEventListener('blur',()=>{clearTouch();if(running&&!paused&&!completed&&!over)togglePause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTouch();if(running&&!paused&&!completed&&!over)togglePause();stopSpeech()}});
window.addEventListener('pagehide',stop,{once:true});
