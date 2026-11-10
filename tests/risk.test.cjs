'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const risk=require('../scripts/risk-engine.js');
const now=new Date('2026-11-10T18:00:00Z');
const quoteDate='2026-11-10T17:20:00Z';
const demo=()=>({version:1,cash:[{side:'deposit',amount:10000}],trades:[],quotes:{},risk:{},fx:null});
const input=(overrides={})=>({symbol:'DEMO',currency:'CAD',entry:100,stop:93.5,target:112,riskPct:.5,maxTickerPct:10,maxTotalRiskPct:2,feePct:.15,sectorExposureCAD:null,...overrides});
const real=()=>({version:1,cash:[{id:'a',side:'deposit',amount:1000}],trades:[{id:'b',symbol:'SHOP.TO',date:'2026-11-10',order:1,side:'buy',currency:'CAD',qty:2,price:100,fee:0,fx:1}],quotes:{'SHOP.TO':{price:110,updatedAt:quoteDate}},risk:{'SHOP.TO':{stop:95}},fx:null});
test('Code navigateur sans dépendance réseau ni compte de courtage',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','scripts','risk-engine.js'),'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(|window\.open\s*\(/);
 const html=fs.readFileSync(path.join(__dirname,'..','risque.html'),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/body class="locked"/);
 assert.match(html,/id="privateArea" inert/);
 assert.match(html,/src="scripts\/risk-engine\.js"/);
 const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 assert.doesNotThrow(()=>new Function(js));
});
test('Le même identifiant localStorage reste utilisé',()=>{
 const home=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.match(home,/const KEY='quantswing-ipad-v1'/);
 assert.match(home,/href="risque\.html"/);
});
test('Le portefeuille fictif sans positions est entièrement calculable',()=>{
 const s=risk.snapshot(demo(),now);assert.equal(s.valid,true);assert.equal(s.cash,10000);assert.equal(s.equity,10000);assert.equal(s.openRisk,0);
});
test('Stop support avec tampon ATR, stop volatilité et cible par résistance',()=>{
 const s=risk.technicalLevels({entry:100,atr:2,swingLow:94,high20:112});
 assert.equal(s.valid,true);assert.equal(s.support,93.5);assert.equal(s.atrStop,97);assert.equal(s.stop,93.5);assert.equal(s.target,112);
});
test('Choix prudent du stop le plus éloigné et objectif 2R hypothétique',()=>{
 const s=risk.technicalLevels({entry:100,atr:3,swingLow:97,mode:'wide',targetMode:'2r'});
 assert.equal(s.valid,true);assert.equal(s.stop,95.5);assert.equal(s.target,109);
});
test('Stop suiveur ne diminue jamais en dessous du stop existant',()=>{
 const x=risk.technicalLevels({entry:100,atr:4,swingLow:92,high20:125,highSinceEntry:115,currentStop:109});
 assert.equal(x.trailing,109);
 const y=risk.technicalLevels({entry:100,atr:4,swingLow:92,high20:125,highSinceEntry:125,currentStop:109});
 assert.equal(y.trailing,117);
});
test('Une résistance sous le prix d’entrée est refusée comme objectif',()=>{
 const tech=risk.technicalLevels({entry:100,atr:2,swingLow:94,high20:98});
 assert.equal(tech.target,null);
 const plan=risk.positionPlan(risk.snapshot(demo(),now),input({target:null}));
 assert.equal(plan.eligible,false);assert.ok(plan.reasons.some(x=>/Objectif/.test(x)));
});
test('Exemple 10 000 CAD: au maximum 7 actions après frais et risque',()=>{
 const plan=risk.positionPlan(risk.snapshot(demo(),now),input());
 assert.equal(plan.eligible,true);assert.equal(plan.quantity,7);
 assert.equal(plan.positionCostCAD,701.05);
 assert.ok(plan.lossToStopCAD<50);
 assert.equal(plan.caps.risqueParTrade,7);
});
test('Risque cumulé limite la taille des nouvelles positions',()=>{
 const s=risk.snapshot(real(),now);
 assert.equal(s.equity,1020);assert.equal(s.cash,800);assert.equal(s.openRisk,30);
 assert.equal(s.valid,true);
 const plan=risk.positionPlan(s,input({symbol:'NVDA',entry:10,stop:9,target:12}));
 assert.equal(plan.eligible,false);assert.equal(plan.quantity,0);assert.equal(plan.caps.risqueCumule,0);
});
test('Sans stop sur position existante, aucune nouvelle position conseillée',()=>{
 const d=real();d.risk={};
 const s=risk.snapshot(d,now);
 assert.equal(s.valid,false);assert.ok(s.issues.some(x=>/Stop absent/.test(x)));
 assert.equal(risk.positionPlan(s,input()).eligible,false);
});
test('Quote vieille de plus de sept jours bloque la validation',()=>{
 const d=real();d.quotes['SHOP.TO'].updatedAt='2026-10-20T12:00:00Z';
 const s=risk.snapshot(d,now);assert.equal(s.valid,false);
 assert.ok(s.issues.some(x=>/périmé/.test(x)));
});
test('Stop atteint ou au-dessus du dernier cours est considéré comme anomalie',()=>{
 const d=real();d.risk['SHOP.TO'].stop=110;
 const s=risk.snapshot(d,now);assert.equal(s.valid,false);assert.ok(s.issues.some(x=>/Stop atteint/.test(x)));
});
test('Le portefeuille tient compte des USD, taux et frais de change',()=>{
 const d=demo();d.trades=[{date:'2026-11-10',symbol:'NVDA',side:'buy',currency:'USD',qty:2,price:100,fee:0,fx:1.4}];
 d.fx={rate:1.5,updatedAt:quoteDate};d.quotes.NVDA={price:110,updatedAt:quoteDate};d.risk.NVDA={stop:100};
 const s=risk.snapshot(d,now);assert.equal(s.valid,true);assert.equal(s.cash,9720);assert.equal(s.equity,10050);assert.equal(s.openRisk,30);
 const p=risk.positionPlan(s,input({symbol:'MSFT',currency:'USD',entry:100,stop:95,target:115}));
 assert.equal(p.eligible,true);assert.equal(p.quantity,6);assert.equal(p.fx,1.5);
});
test('Un taux USD/CAD manquant ou périmé bloque le portefeuille USD',()=>{
 const d=real();d.trades[0].symbol='NVDA';d.trades[0].currency='USD';d.quotes={NVDA:{price:110,updatedAt:quoteDate}};d.risk={NVDA:{stop:95}};
 assert.equal(risk.snapshot(d,now).valid,false);
 d.fx={rate:1.5,updatedAt:'2026-10-01T09:00:00Z'};
 assert.equal(risk.snapshot(d,now).valid,false);
});
test('Limiter la concentration du portefeuille dans le même titre',()=>{
 const s=risk.snapshot(real(),now);const p=risk.positionPlan(s,input({symbol:'SHOP.TO',entry:110,stop:105,target:125}));
 assert.equal(p.caps.expositionTitre,0);assert.equal(p.quantity,0);
});
test('Contrôler en option la concentration sectorielle, sans inventer un secteur',()=>{
 const s=risk.snapshot(demo(),now);
 const noSector=risk.positionPlan(s,input());
 assert.ok(noSector.warnings.some(x=>/sectorielle non vérifiée/.test(x)));
 const p=risk.positionPlan(s,input({sectorExposureCAD:2499,sectorLimitPct:25}));
 assert.equal(p.caps.expositionSecteur,0);assert.equal(p.eligible,false);
});
test('Un ratio net insuffisant est bloquant, même si le trade pourrait gagner',()=>{
 const s=risk.snapshot(demo(),now),p=risk.positionPlan(s,input({target:102}));
 assert.equal(p.eligible,false);assert.ok(p.reasons.some(x=>/1,5:1/.test(x)));
});
test('Liquidités insuffisantes interdisent tout achat au comptant',()=>{
 const d=demo();d.cash=[{side:'deposit',amount:5}];
 const s=risk.snapshot(d,now),p=risk.positionPlan(s,input());
 assert.equal(p.eligible,false);assert.equal(p.caps.liquidites,0);
});
test('Une vente supérieure au stock détenu bloque le bilan',()=>{
 const d=real();d.trades.push({date:'2026-11-11',symbol:'SHOP.TO',side:'sell',currency:'CAD',qty:4,price:110,fee:0,fx:1});
 const s=risk.snapshot(d,now);assert.equal(s.valid,false);assert.ok(s.issues.some(x=>/Vente excédentaire/.test(x)));
});
test('Un gap de 20 % franchit le stop : pas de garantie de perte plafonnée',()=>{
 const s=risk.snapshot(demo(),now),p=risk.positionPlan(s,input());
 assert.equal(p.eligible,true);
 const gapLoss=(100-80)*p.quantity;
 assert.ok(gapLoss>p.lossToStopCAD);assert.ok(p.warnings.some(x=>/gap/.test(x)));
});
test('Stress test: 600 positions fictives vérifiées sans lecture réseau',()=>{
 const d=demo();let sum=0;for(let i=0;i<600;i++){
  const symbol='T'+i;
  d.trades.push({date:'2026-11-10',symbol,side:'buy',currency:'CAD',qty:1,price:10,fx:1,fee:0});
  d.quotes[symbol]={price:11,updatedAt:quoteDate};d.risk[symbol]={stop:9};sum+=11;
 }
 const s=risk.snapshot(d,now);
 assert.equal(s.valid,true);assert.equal(s.positions.length,600);assert.equal(s.cash,4000);assert.equal(s.equity,10600);assert.equal(s.openRisk,1200);
 assert.equal(s.exposure,sum);
});

test('CSV multi-titres : chandelles calculées localement sur le bon symbole',()=>{
 const now=new Date('2026-05-11T15:00:00Z'),rows=['Symbol,Date,Open,High,Low,Close,Volume'];
 for(let i=0;i<131;i++){
  const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);
  for(const [symbol,price] of [['NVDA',100],['SHOP.TO',60]])
   rows.push([symbol,date,price,price+3,price-2,price+i*.01,100000+i*500].join(','));
 }
 const csv=rows.join('\n');
 const result=risk.levelsFromCSV({csv,ticker:'SHOP.TO',filename:'multi.csv',now});
 assert.equal(result.symbol,'SHOP.TO');assert.equal(result.barCount,130);
 assert.equal(result.date,'2026-05-10');assert.equal(result.stale,false);
 assert.equal(result.swingLow,58);assert.equal(result.atr,5);
 assert.ok(result.relativeVolume>1);
 const noSelection=risk.levelsFromCSV({csv,filename:'multi.csv',now});
 assert.equal(noSelection.symbol,'NVDA');
});
test('Une chandelle du jour encore ouverte est ignorée à l’import',()=>{
 const now=new Date('2026-05-11T15:00:00Z'),rows=['Date,Open,High,Low,Close,Volume'];
 for(let i=0;i<131;i++){
  const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);
  rows.push([date,100,103,98,i===130?999:101,200000].join(','));
 }
 const x=risk.levelsFromCSV({csv:rows.join('\n'),filename:'AAPL.csv',now});
 assert.equal(x.date,'2026-05-10');assert.ok(x.entry<200);
});
test('Un ancien historique bloque le plan d’achat même si le score paraît élevé',()=>{
 const s=risk.snapshot(demo(),now);
 const stale=risk.positionPlan(s,input({marketAsOf:'2026-10-01'}),now);
 assert.equal(stale.eligible,false);assert.ok(stale.reasons.some(x=>/périmés/.test(x)));
 const current=risk.positionPlan(s,input({marketAsOf:'2026-11-10'}),now);
 assert.equal(current.eligible,true);
});
test('Un fichier sans OHLCV valide ne produit aucun niveau trompeur',()=>{
 const bad='Date,Open,High,Low,Close,Volume\n2026-01-01,100,90,110,100,1000';
 assert.throws(()=>risk.levelsFromCSV({csv:bad,filename:'TEST.csv',now}),/30 chandeliers/);
});
