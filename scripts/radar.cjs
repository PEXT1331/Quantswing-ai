'use strict';
// QuantSwing EOD scanner - research tool, not investment advice.
// Raw OHLCV never leaves provider processing. No personal portfolio is read.
const fs=require('node:fs');
const path=require('node:path');
const DEFAULT_WATCHLIST=['NVDA','AMD','MSFT','AAPL','MU','AVGO','SHOP.TRT','CCO.TRT'];
const GOOD_TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,16}$/;
function torontoClock(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return {date:parts.year+'-'+parts.month+'-'+parts.day,hour:Number(parts.hour),minute:Number(parts.minute)};
}
function cleanTickers(input,limit=8){
 if(!Array.isArray(input))throw Error('Invalid watchlist');
 const list=[...new Set(input.map(s=>String(s).trim().toUpperCase()))];
 if(list.length>limit||list.some(s=>!GOOD_TICKER.test(s)))throw Error('Watchlist limit or ticker invalid');
 return list;
}
function parseAlphaVantage(payload,now=new Date()){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid provider response');
 if(payload.Note||payload.Information||payload['Error Message'])throw Error('Provider unavailable or rate limit');
 const root=payload['Time Series (Daily)'];
 if(!root||typeof root!=='object')throw Error('No daily price series available');
 const clock=torontoClock(now);
 // We accept today's candle only after 18:15 ET; provider may still be delayed.
 const completeToday=clock.hour>18||(clock.hour===18&&clock.minute>=15);
 const bars=[];
 for(const [date,row] of Object.entries(root)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  if(date>clock.date||(date===clock.date&&!completeToday))continue;
  const values=['1. open','2. high','3. low','4. close','5. volume'].map(k=>Number(row[k]));
  const [o,hi,lo,c,v]=values;
  if(values.some(z=>!Number.isFinite(z))||Math.min(o,hi,lo,c)<=0||v<0||hi<lo||hi<Math.max(o,c)||lo>Math.min(o,c))continue;
  bars.push({date,o,hi,lo,c,v});
 }
 bars.sort((a,b)=>a.date.localeCompare(b.date));
 if(bars.length<61)throw Error('Fewer than 61 completed daily candles');
 const latest=bars.at(-1).date;
 const age=Math.round((Date.parse(clock.date+'T12:00:00Z')-Date.parse(latest+'T12:00:00Z'))/86400000);
 if(age>6)throw Error('Data too old for actionable signal');
 return bars;
}
function mean(bars,index,count,key){
 if(index<count-1)return null;
 let total=0;for(let i=index-count+1;i<=index;i++)total+=bars[i][key];
 return total/count;
}
function analytics(bars){
 const i=bars.length-1,last=bars[i];
 if(i<60)throw Error('Need more daily candles');
 const ma20=mean(bars,i,20,'c'),ma50=mean(bars,i,50,'c'),baseVol=mean(bars,i-1,20,'v');
 let hi20=-Infinity;for(let j=i-20;j<i;j++)hi20=Math.max(hi20,bars[j].hi);
 let up=0,down=0,atr=0;
 for(let j=i-13;j<=i;j++){
  const x=bars[j].c-bars[j-1].c;if(x>0)up+=x;else down-=x;
  atr+=Math.max(bars[j].hi-bars[j].lo,Math.abs(bars[j].hi-bars[j-1].c),Math.abs(bars[j].lo-bars[j-1].c));
 }
 atr/=14;
 const rsi=down===0?(up===0?50:100):100-100/(1+up/down);
 const rv=baseVol>0?last.v/baseVol:0;
 const breakout=last.c>hi20,aggressive=last.c>hi20*1.005&&rv>=1.7&&atr/last.c>=.025&&rsi>55&&rsi<85;
 const moderate=breakout&&ma20>ma50&&rsi>=48&&rsi<=78&&rv>=1.1;
 const change5=bars[i-5].c>0?last.c/bars[i-5].c-1:null;
 let score=0;
 if(breakout)score+=25;else if(last.c>hi20*.985)score+=12;
 if(ma20>ma50)score+=15;
 if(rv>=1.7)score+=20;else if(rv>=1.2)score+=12;
 if(rsi>=50&&rsi<=75)score+=15;
 if(change5!==null&&change5>0)score+=10;
 if(last.c>ma50)score+=10;
 if(atr/last.c>=.02)score+=5;
 const reasons=[];
 if(breakout)reasons.push('Clôture au-dessus du plus haut des 20 séances précédentes');
 if(rv>=1.2)reasons.push('Volume relatif '+rv.toFixed(2)+'× les 20 séances précédentes');
 if(ma20>ma50)reasons.push('Moyenne 20 jours supérieure à 50 jours');
 if(change5!==null&&change5>0)reasons.push('Progression sur cinq séances');
 const model=aggressive?'Agressive':moderate?'Modérée':null;
 const round=x=>Number.isFinite(x)?Number(x.toFixed(4)):null;
 return {date:last.date,score:Math.min(100,score),model,close:round(last.c),rsi:round(rsi),relativeVolume:round(rv),atrRatio:round(atr/last.c),change5:round(change5),distanceToBreakout:round(last.c/hi20-1),reasons,decision:model?'Signal historique à étudier':'Surveillance seulement — aucun signal confirmé'};
}
function safePublic(r){
 // Never export raw OHLCV, API tokens, cash or personal trades.
 const {ticker,date,score,model,rsi,relativeVolume,atrRatio,change5,distanceToBreakout,reasons,decision}=r;
 return {ticker,date,score,model,rsi,relativeVolume,atrRatio,change5,distanceToBreakout,reasons,decision,confidence:'NON ÉTABLIE (score ≠ probabilité de réussite)'};
}
async function scan({apiKey,now=new Date(),tickers=DEFAULT_WATCHLIST,fetchImpl=fetch,publicationAllowed=false}={}){
 const safeTickers=cleanTickers(tickers);
 const clock=torontoClock(now);
 const base={schemaVersion:1,generatedAt:now.toISOString(),session:clock.hour<12?'matin':'clôture',mode:'marché quotidien',provider:'Alpha Vantage',configured:!!apiKey,rightsConfirmed:publicationAllowed===true,watched:safeTickers.length,processed:0,unavailable:0,notes:['Recherche éducative, pas une recommandation personnalisée.','Score de présélection, pas probabilité de gain.','Aucune donnée de portefeuille personnel collectée.'],signals:[]};
 if(!apiKey)return {...base,status:'configuration_required',message:'Scanner programmé mais clé personnelle Alpha Vantage absente. Aucun cours récupéré, aucun signal publié.'};
 const findings=[];
 let unavailable=0;
 for(const ticker of safeTickers){
  try{
   const url=new URL('https://www.alphavantage.co/query');
   url.searchParams.set('function','TIME_SERIES_DAILY');url.searchParams.set('symbol',ticker);url.searchParams.set('outputsize','compact');url.searchParams.set('apikey',apiKey);
   const response=await fetchImpl(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw Error('Provider HTTP error');
   const payload=await response.json();
   const bars=parseAlphaVantage(payload,now);
   findings.push({ticker,...analytics(bars)});
  }catch(err){unavailable++;}
 }
 const summary={...base,processed:findings.length,unavailable};
 if(!publicationAllowed){
  return {...summary,status:findings.length?'private_results_not_publishable':'source_unavailable',message:'Calcul effectué sans publication de résultats individuels : aucune autorisation de diffusion des données dérivées n’a été confirmée.',signals:[]};
 }
 return {...summary,status:findings.length?'ready':'source_unavailable',message:findings.length?'Résultats techniques dérivés, publication autorisée selon les droits fournis.':'Aucune série exploitable — pas de recommandations.',signals:findings.filter(r=>r.score>=50||r.model).sort((a,b)=>b.score-a.score).map(safePublic)};
}
function simulatedInput(symbol,days=130){
 const root={},start=Date.UTC(2026,0,1);
 for(let i=0;i<days;i++){
  const date=new Date(start+i*86400000).toISOString().slice(0,10),trend=60+i*.15+Math.sin(i/6)*1.5,price=i===days-1?trend*1.09:trend,volume=i===days-1?900000:i>100?220000:100000;
  root[date]={'1. open':String(price-0.2),'2. high':String(price+1.5),'3. low':String(price-1.5),'4. close':String(price),'5. volume':String(volume)};
 }
 return {'Time Series (Daily)':root};
}
async function command(){
 const outArg=process.argv.indexOf('--output'),destination=outArg>=0?process.argv[outArg+1]:null;
 if(!destination)throw Error('Provide --output path');
 const demo=process.argv.includes('--demo'),now=demo?new Date('2026-05-11T22:35:00.000Z'):new Date();
 const fakeFetch=async()=>({ok:true,json:async()=>simulatedInput('DEMO')});
 const report=demo?await scan({now,tickers:['DEMO'],apiKey:'DEMO_ONLY',fetchImpl:fakeFetch,publicationAllowed:true}):
  await scan({now,apiKey:process.env.ALPHAVANTAGE_API_KEY||'',publicationAllowed:process.env.PUBLICATION_RIGHTS_CONFIRMED==='true'});
 // Public repo: no metadata that could reconstruct individual OHLCV, no credentials, no personal portfolio.
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('QuantSwing: '+report.status+' | available '+report.processed+' of '+report.watched+' | public signals '+report.signals.length);
}
module.exports={torontoClock,cleanTickers,parseAlphaVantage,analytics,safePublic,scan,simulatedInput};
if(require.main===module)command().catch(err=>{console.error('Pipeline execution error (no credentials printed).');process.exitCode=1});
