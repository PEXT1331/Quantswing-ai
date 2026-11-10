'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'analyse.html'),'utf8');
function script(source){const m=source.match(/<script>([\s\S]*?)<\/script>/);assert.ok(m,'Inline script missing');return m[1]}
function fakeDoc(){
 const elements=new Map();
 return {body:{classList:{add(){},remove(){},toggle(){return false}},addEventListener(){}},
   querySelectorAll(){return []},getElementById(id){
    if(!elements.has(id))elements.set(id,{addEventListener(){},classList:{add(){},remove(){},toggle(){return false}},setAttribute(){},value:'',textContent:'',innerHTML:'',getContext(){return null}});
    return elements.get(id);
 }}}
function portfolio(saved){
 const storage={getItem(){return saved?JSON.stringify(saved):null},setItem(){}};
 const win={scrollTo(){},clearTimeout(){},setTimeout(){},open(){}};
 return new Function('document','window','localStorage','crypto','confirm',script(home)+';return {ledger,data,verifyImportedBackup};')(fakeDoc(),win,storage,{randomUUID:()=> 'unit-id'},()=>true);
}
function labAPI(){return new Function('document',script(lab)+';return {readSeries,readBundle,testOne,strategies,wilson};')(fakeDoc())}
const date='2026-11-10',purchase={id:'buy',date,symbol:'SHOP.TO',currency:'CAD',side:'buy',qty:2,price:100,fee:0,fx:1,order:1};
const saved=(trades,quotes,fx=null)=>({version:1,cash:[{id:'cash',date,side:'deposit',amount:1000}],trades,quotes,fx,risk:{},backtests:[],backtestImportedAt:null});

test('Both JavaScript files compile',()=>{assert.doesNotThrow(()=>new Function(script(home)));assert.doesNotThrow(()=>new Function(script(lab)))});
test('No unexpected external connections from historical laboratory',()=>{assert.match(lab,/connect-src 'none'/);assert.match(home,/connect-src 'none'/)});
test('Existing portfolio storage key preserved',()=>assert.match(home,/const KEY='quantswing-ipad-v1'/));
test('Portfolio initially masked',()=>assert.match(home,/document\.body\.classList\.add\('privacy-on'\)/));
test('CAD buys and valuation',()=>{
 const p=portfolio(saved([purchase],{'SHOP.TO':{price:110,updatedAt:new Date().toISOString()}})).ledger();
 assert.equal(p.cash,800);assert.equal(p.equity,1020);assert.equal(p.unrealized,20);
});
test('Partial sale realizes gains without losing remaining cost basis',()=>{
 const sell={...purchase,id:'sell',side:'sell',date:'2026-11-11',qty:1,price:120,order:2};
 const p=portfolio(saved([purchase,sell],{'SHOP.TO':{price:110,updatedAt:new Date().toISOString()}})).ledger();
 assert.equal(p.realized,20);assert.equal(p.equity,1030);
});
test('USD purchase and changing CAD/USD rate',()=>{
 const a={...purchase,symbol:'NVDA',currency:'USD',fx:1.4};
 const p=portfolio(saved([a],{NVDA:{price:110,updatedAt:new Date().toISOString()}},{rate:1.5,updatedAt:new Date().toISOString()})).ledger();
 assert.ok(Math.abs(p.equity-1050)<1e-8);
});
test('Reject selling assets not owned',()=>{
 const p=portfolio(saved([{...purchase,side:'sell'}],{})).ledger();
 assert.ok(p.errors.length>0);
});
test('Validate backup and reject malformed data',()=>{
 const good=saved([purchase],{'SHOP.TO':{price:110,updatedAt:new Date().toISOString()}});
 const p=portfolio(good);assert.doesNotThrow(()=>p.verifyImportedBackup(good));
 assert.throws(()=>p.verifyImportedBackup({...good,trades:[{...purchase,price:'untrusted'}]}));
});
test('Wilson confidence band is not certainty',()=>{
 const h=labAPI();assert.equal(h.wilson(0,0),null);const ci=h.wilson(5,10);assert.ok(ci[0]>.2&&ci[1]<.8);
});
test('Multi-symbol CSV gets separated without uploading personal data',()=>{
 const h=labAPI();const rows=['Symbol,Date,Open,High,Low,Close,Volume'];
 for(let i=0;i<150;i++){const date=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);for(const [symbol,price] of [['AMD',100],['SHOP.TO',60]])rows.push([symbol,date,price,price*1.03,price*.97,price,250000].join(','))}
 const bars=h.readBundle('bundle.csv',rows.join('\n'));assert.deepEqual(bars.map(s=>s.ticker).sort(),['AMD','SHOP.TO']);assert.equal(bars[0].bars.length,150);
});
test('Do not leak development trades that finish within test period',()=>{
 const h=labAPI();let price=100,bars=[];
 for(let i=0;i<300;i++){const date=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),o=price,c=price*(1+.004+Math.sin(i*.6)*.008);bars.push({date,o,hi:Math.max(o,c)*1.024,lo:Math.min(o,c)*.976,c,v:250000+(i%17===4?500000:0)});price=c}
 const s={ticker:'FIX',bars};for(const model of h.strategies){const x=h.testOne(s,model,.3);for(const t of x.out){assert.ok(t.sample==='Test'?t.signal>=x.cut:t.exitDate<x.cut)}}
});
