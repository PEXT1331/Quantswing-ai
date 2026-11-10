'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const radar=require('../scripts/radar.cjs');
const NOW=new Date('2026-05-11T22:35:00.000Z');
const fixture=radar.simulatedInput('DEMO');
const mock=async()=>({ok:true,json:async()=>fixture});
test('Horloge America/Toronto en saison été/hiver',()=>{
 assert.deepEqual(radar.torontoClock(new Date('2026-01-14T13:00:00Z')),{date:'2026-01-14',hour:8,minute:0});
 assert.deepEqual(radar.torontoClock(new Date('2026-07-14T12:00:00Z')),{date:'2026-07-14',hour:8,minute:0});
});
test('Sans identifiant fournisseur: aucun signal, aucun fetch',async()=>{
 const report=await radar.scan({now:NOW,apiKey:'',fetchImpl:()=>{throw Error('should not call network')}});
 assert.equal(report.status,'configuration_required');assert.equal(report.processed,0);assert.deepEqual(report.signals,[]);
});
test('Historique connu validé',()=>{
 const bars=radar.parseAlphaVantage(fixture,NOW);
 assert.equal(bars.length,130);
 assert.ok(bars.every(b=>b.hi>=Math.max(b.c,b.o)&&b.lo<=Math.min(b.c,b.o)));
});
test('Bougie incomplète de la séance exclue à 8h',()=>{
 const raw=JSON.parse(JSON.stringify(fixture));
 raw['Time Series (Daily)']['2026-05-11']={'1. open':'1','2. high':'1000','3. low':'1','4. close':'999','5. volume':'10000000'};
 const bars=radar.parseAlphaVantage(raw,new Date('2026-05-11T12:10:00Z'));
 assert.notEqual(bars.at(-1).date,'2026-05-11');
});
test('Refuser données périmées et erreurs du fournisseur',()=>{
 assert.throws(()=>radar.parseAlphaVantage(fixture,new Date('2026-08-01T22:30:00Z')),/old/);
 assert.throws(()=>radar.parseAlphaVantage({Note:'Rate limit'},NOW),/unavailable/);
});
test('Sans droits de publication, aucune donnée individuelle dans le rapport public',async()=>{
 const report=await radar.scan({now:NOW,apiKey:'TEST_KEY',tickers:['NVDA'],fetchImpl:mock,publicationAllowed:false});
 assert.equal(report.status,'private_results_not_publishable');
 assert.equal(report.processed,1);
 assert.deepEqual(report.signals,[]);
 assert.doesNotMatch(JSON.stringify(report),/TEST_KEY|NVDA/);
});
test('Avec droits confirmés, score dérivé et preuves calculables',async()=>{
 const report=await radar.scan({now:NOW,apiKey:'TEST_KEY',tickers:['DEMO'],fetchImpl:mock,publicationAllowed:true});
 assert.equal(report.status,'ready');
 assert.equal(report.processed,1);
 assert.ok(report.signals.length>=1);
 assert.ok(report.signals[0].score>=0&&report.signals[0].score<=100);
 assert.equal(report.signals[0].confidence,'NON ÉTABLIE (score ≠ probabilité de réussite)');
 assert.equal(report.signals[0].close,undefined);
 assert.equal(report.signals[0].cash,undefined);
 assert.equal(report.signals[0].password,undefined);
});
test('Strictement huit titres par session et anti injection',()=>{
 assert.throws(()=>radar.cleanTickers(Array.from({length:9},(_,i)=>'T'+i)));
 assert.throws(()=>radar.cleanTickers(['AAPL; echo secret']));
 assert.deepEqual(radar.cleanTickers(['aapl','AAPL',' shop.trt ']),['AAPL','SHOP.TRT']);
});
test('Aucun signal inventé si le fournisseur ne donne aucune chandelle',async()=>{
 const report=await radar.scan({now:NOW,apiKey:'TEST_KEY',tickers:['AAPL'],fetchImpl:async()=>({ok:true,json:async()=>({Note:'quota exceeded'})}),publicationAllowed:true});
 assert.equal(report.status,'source_unavailable');assert.equal(report.unavailable,1);assert.deepEqual(report.signals,[]);
});
