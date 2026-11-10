/* QuantSwing AI — laboratoire or, moteur de recherche déterministe v1.
 * Simulation uniquement, aucune transaction de courtage, aucun accès réseau.
 * Le CSV est lu en mémoire, jamais envoyé ni publié.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.QuantGold=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const FIN=Number.isFinite,feeDefault=.0015,START=200;
 const frac=(v)=>Number((v*100).toFixed(4));
 const round=(v,n=4)=>FIN(v)?Number(v.toFixed(n)):null;
 function csvLines(source){
  const lines=[];let row=[],value='',quoted=false;
  const str=String(source).replace(/^\uFEFF/,'');
  for(let i=0;i<str.length;i++){const c=str[i];
   if(c==='"'){if(quoted&&str[i+1]==='"'){value+='"';i++}else quoted=!quoted}
   else if(c===','&&!quoted){row.push(value.trim());value=''}
   else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&str[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))lines.push(row);row=[];value=''}
   else value+=c;
  }
  row.push(value.trim());if(row.some(Boolean))lines.push(row);
  return lines;
 }
 function parseOHLCV(source,{filename='',symbol=''}={}){
  if(typeof source!=='string'||source.length>8e6)throw Error('Le fichier CSV doit contenir 8 Mo ou moins.');
  const lines=csvLines(source);if(lines.length<21||lines.length>25000)throw Error('Au moins 20 chandelles et au plus 25 000 lignes sont nécessaires.');
  const cols=lines.shift().map(x=>x.toLowerCase().replace(/[^a-z]/g,''));
  const ix=(...keys)=>keys.map(k=>cols.indexOf(k)).find(i=>i>=0)??-1;
  const date=ix('date','datetime','timestamp','time'),o=ix('open'),hi=ix('high'),lo=ix('low'),c=ix('close'),v=ix('volume'),sy=ix('symbol','ticker','asset'),tf=ix('timeframe');
  if([date,o,hi,lo,c].some(i=>i<0))throw Error('Colonnes Date/Time, Open, High, Low, Close nécessaires. Volume recommandé, mais facultatif.');
  const wanted=String(symbol||'').trim().toUpperCase(),fileSymbol=String(filename).replace(/\.csv$/i,'').toUpperCase().replace(/[^A-Z0-9.\-].*$/,'');
  if(wanted&&!/^[A-Z0-9][A-Z0-9.\-]{0,17}$/.test(wanted))throw Error('Symbole invalide.');
  const instruments=new Map();let invalid=0,filtered=0,duplicates=0,intraday=0;
  for(const row of lines){
   if(tf>=0&&String(row[tf]).trim().toUpperCase()!=='D1'){intraday++;continue}
   const asset=sy>=0?String(row[sy]||'').trim().toUpperCase():wanted||fileSymbol||'INCONNU';
   if(!/^[A-Z0-9][A-Z0-9.\-]{0,17}$/.test(asset)){invalid++;continue}
   if(wanted&&asset!==wanted){filtered++;continue}
   const dateValue=String(row[date]||'').slice(0,10);
   const parsedDate=Date.parse(dateValue+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)||!FIN(parsedDate)||new Date(parsedDate).toISOString().slice(0,10)!==dateValue){invalid++;continue}
   const vals=[o,hi,lo,c].map(i=>Number(String(row[i]||'').replace(/\s/g,'')));
   const volume=v<0?null:Number(String(row[v]||'').trim());
   if(vals.some(x=>!FIN(x)||x<=0)||!FIN(volume)&&v>=0||volume!==null&&volume<0){invalid++;continue}
   const [open,high,low,close]=vals;
   if(high<low||open>high*1.0001||open<low*.9999||close>high*1.0001||close<low*.9999){invalid++;continue}
   if(!instruments.has(asset))instruments.set(asset,new Map());
   if(instruments.get(asset).has(dateValue))duplicates++;
   instruments.get(asset).set(dateValue,{date:dateValue,o:open,hi:high,lo:low,c:close,v:volume});
  }
  if(instruments.size===0)throw Error('Aucune chandelle valide à utiliser.');
  if(instruments.size>1)throw Error('Fichier multi-actifs : indique un symbole précis. Actifs trouvés : '+[...instruments.keys()].slice(0,8).join(', '));
  const [ticker,map]=instruments.entries().next().value;
  const bars=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(bars.length<20)throw Error('Pas assez de chandelles valides après nettoyage.');
  let jumps=0;
  for(let i=1;i<bars.length;i++){const ratio=bars[i].c/bars[i-1].c;if(ratio>1.4||ratio<.6)jumps++}
  return {ticker,bars,first:bars[0].date,last:bars[bars.length-1].date,invalid,duplicates,filtered,intraday,jumps,hasVolume:bars.some(x=>x.v!==null)};
 }
 const average=(arr,end,window,key)=>{let s=0;for(let i=end-window+1;i<=end;i++)s+=arr[i][key];return s/window};
 function metricsAt(bars,i){
  if(i<START)return null;
  const ma20=average(bars,i,20,'c'),ma50=average(bars,i,50,'c'),ma200=average(bars,i,200,'c');
  let h20=-Infinity,low20=Infinity;
  for(let k=i-20;k<i;k++){h20=Math.max(h20,bars[k].hi);low20=Math.min(low20,bars[k].lo)}
  let atr=0,up=0,down=0;
  for(let k=i-13;k<=i;k++){
   const b=bars[k],p=bars[k-1];atr+=Math.max(b.hi-b.lo,Math.abs(b.hi-p.c),Math.abs(b.lo-p.c));
   const d=b.c-p.c;if(d>0)up+=d;else down-=d;
  }
  atr/=14;
  const rsi=down===0?(up===0?50:100):100-100/(1+up/down);
  let vol=0,available=0;
  for(let k=i-20;k<i;k++){if(bars[k].v!==null){vol+=bars[k].v;available++}}
  const relativeVolume=bars[i].v!==null&&available===20&&vol>0?bars[i].v/(vol/20):null;
  return {ma20,ma50,ma200,h20,low20,atr,rsi,relativeVolume};
 }
 const MODELS=[
  {id:'tendance',name:'Cassure de tendance',hold:10,stopATR:1.5,targetATR:3,
   explain:'Clôture au-dessus du plus haut des 20 séances précédentes; MA20 > MA50; RSI 50–80.',
   go:(b,m)=>b.c>m.h20&&m.ma20>m.ma50&&m.rsi>=50&&m.rsi<=80},
  {id:'correction',name:'Rebond après correction',hold:10,stopATR:2,targetATR:2.5,
   explain:'Prix au-dessus de MA200, clôture sous MA20 − 0,75 ATR, RSI ≤ 38.',
   go:(b,m)=>b.c>m.ma200&&b.c<m.ma20-.75*m.atr&&m.rsi<=38}
 ];
 function drawdown(curve){
  let peak=1,maxDD=0;for(const p of curve){peak=Math.max(peak,p.equity);maxDD=Math.max(maxDD,1-p.equity/peak)}return maxDD;
 }
 function buyHold(bars,start,allocation,fee){
  const entry=bars[start].o,units=allocation/(entry*(1+fee)),reserve=1-allocation,curve=[];
  for(let i=start;i<bars.length;i++){const last=i===bars.length-1,exit=last?bars[i].c:bars[i].c;curve.push({date:bars[i].date,equity:reserve+units*exit*(1-fee)})}
  return {returnPct:frac(curve[curve.length-1].equity-1),maxDDPct:frac(drawdown(curve)),curve};
 }
 function evaluate(bars,model,{fee=feeDefault,allocation=.10,split=.30}={}){
  if(!FIN(fee)||fee<0||fee>.03||!FIN(allocation)||allocation<=0||allocation>1||!FIN(split)||split<=.1||split>=.5)throw Error('Paramètres de test invalides.');
  if(bars.length<260)return {status:'insufficient_history',minBars:260,available:bars.length};
  const cut=Math.max(START+1,Math.floor(bars.length*(1-split))),entries=[],curve=[];
  let cash=1,position=null,pending=null,exposed=0;
  for(let i=cut;i<bars.length;i++){
   const bar=bars[i];let exited=false;
   if(pending&&pending.next===i&&!position){
    const entry=bar.o,stop=entry-pending.m.atr*model.stopATR,target=entry+pending.m.atr*model.targetATR;
    if(stop>0&&target>entry&&entry>0&&FIN(stop)&&FIN(target)){
     const base=cash,reserve=base*(1-allocation),units=base*allocation/(entry*(1+fee));
     position={entry,stop,target,reserve,units,base,started:i,signalDate:pending.date,entryDate:bar.date};
    }
    pending=null;
   }
   if(position){
    exposed++;
    let exit=null,reason=null;
    // Stop prioritaire dans une bougie qui touche à la fois le stop et la cible.
    if(i>position.started&&bar.o<=position.stop){exit=bar.o;reason='Gap sous stop'}
    else if(bar.lo<=position.stop){exit=position.stop;reason='Stop'}
    else if(bar.hi>=position.target){exit=position.target;reason='Objectif'}
    else if(i-position.started+1>=model.hold){exit=bar.c;reason='Fin de durée'}
    else if(i===bars.length-1){exit=bar.c;reason='Fin de données (censuré)'}
    if(exit!==null){
     const final=position.reserve+position.units*exit*(1-fee);
     const tradeReturn=position.units*exit*(1-fee)/(position.base*allocation)-1;
     if(reason!=='Fin de données (censuré)')entries.push({signalDate:position.signalDate,entryDate:position.entryDate,exitDate:bar.date,entry:round(position.entry),exit:round(exit),reason,returnPct:frac(tradeReturn),capitalResultPct:frac(final/position.base-1)});
     cash=final;position=null;exited=true;
    }
   }
   if(!position&&!exited&&i<bars.length-1){
    const m=metricsAt(bars,i);
    if(m&&m.atr>0&&model.go(bar,m))pending={date:bar.date,next:i+1,m};
   }
   const nav=position?position.reserve+position.units*bar.c*(1-fee):cash;
   curve.push({date:bar.date,equity:nav});
  }
  const n=entries.length,wins=entries.filter(t=>t.returnPct>0),losses=entries.filter(t=>t.returnPct<0);
  const gross=wins.reduce((a,t)=>a+t.returnPct,0),loss=-losses.reduce((a,t)=>a+t.returnPct,0);
  return {status:'ok',name:model.name,model:model.id,firstTestDate:bars[cut].date,lastTestDate:bars[bars.length-1].date,
   totalBars:bars.length,testBars:bars.length-cut,splitIndex:cut,trades:n,wins:wins.length,winRatePct:n?round(100*wins.length/n,2):null,
   profitFactor:loss>0?round(gross/loss,3):gross>0?null:null,
   averageNetTradePct:n?round(entries.reduce((a,t)=>a+t.returnPct,0)/n,3):null,
   portfolioReturnPct:frac(curve[curve.length-1].equity-1),maxDrawdownPct:frac(drawdown(curve)),
   exposurePct:round(100*exposed/curve.length,2),entries,curve,feePerSidePct:round(fee*100,3),allocationPct:round(allocation*100,1)};
 }
 function study(dataset,config={}){
  const bars=dataset.bars||dataset,fee=config.fee??feeDefault,allocation=config.allocation??.10,split=config.split??.30;
  if(!Array.isArray(bars)||!bars.length)throw Error('Historique absent.');
  const latest=bars.length>START?metricsAt(bars,bars.length-1):null;
  const latestSignals=latest?MODELS.map(x=>({id:x.id,name:x.name,active:x.go(bars[bars.length-1],latest)})):[];
  if(bars.length<260)return {status:'insufficient_history',latest:latest?{date:bars[bars.length-1].date,close:round(bars[bars.length-1].c),ma20:round(latest.ma20),ma50:round(latest.ma50),ma200:round(latest.ma200),atr:round(latest.atr),rsi:round(latest.rsi),relativeVolume:round(latest.relativeVolume)}:null,latestSignals,minBars:260,bars:bars.length,reason:'Moins de 260 chandelles : historique trop court pour comparer sur une période de test.'};
  const cut=Math.max(START+1,Math.floor(bars.length*(1-split))),strategies=MODELS.map(m=>evaluate(bars,m,{fee,allocation,split}));
  const buyHold10=buyHold(bars,cut,allocation,fee),buyHold100=buyHold(bars,cut,1,fee);
  return {status:'ok',firstTestDate:bars[cut].date,lastTestDate:bars[bars.length-1].date,
    strategies,benchmarks:{matched:{returnPct:buyHold10.returnPct,maxDDPct:buyHold10.maxDDPct,curve:buyHold10.curve},full:{returnPct:buyHold100.returnPct,maxDDPct:buyHold100.maxDDPct,curve:buyHold100.curve}},
    latest:latest?{date:bars[bars.length-1].date,close:round(bars[bars.length-1].c),ma20:round(latest.ma20),ma50:round(latest.ma50),ma200:round(latest.ma200),atr:round(latest.atr),rsi:round(latest.rsi),relativeVolume:round(latest.relativeVolume)}:null,
    latestSignals,settings:{feePct:round(fee*100,3),allocationPct:round(allocation*100,1),splitPct:round(split*100,1)}};
 }
 return {parseOHLCV,metricsAt,study,evaluate,buyHold,MODELS};
});
