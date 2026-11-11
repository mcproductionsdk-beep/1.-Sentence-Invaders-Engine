import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const url=process.env.INVADERS_REVIEW_URL;
if(!/^https:\/\/[a-f0-9]+\.bt-sentence-invaders-preview\.pages\.dev\/$/.test(url))throw Error('Invalid review URL');
const response=await fetch(new URL('version.json',url));assert.equal(response.ok,true);
const actual=await response.json(),expected=JSON.parse(await readFile(new URL('../dist-preview/version.json',import.meta.url),'utf8'));
assert.equal(actual.buildId,expected.buildId);
const browser=await chromium.launch();
try{const p=await browser.newPage();const errors=[],external=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>{if(new URL(r.request().url()).origin===new URL(url).origin)return r.continue();external.push(r.request().url());return r.abort()});
await p.goto(url);await p.getByRole('button',{name:'Play sample',exact:true}).click();await p.locator('#gameArea').waitFor({state:'visible'});assert.equal(await p.locator('#english').textContent(),'I will work tomorrow.');await p.getByRole('button',{name:'PAUSE',exact:true}).click();await p.getByRole('button',{name:'RESUME',exact:true}).waitFor();assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('Deployed immutable Invaders preview verified:',url,actual.buildId);
}finally{await browser.close()}
