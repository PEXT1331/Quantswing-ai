'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const gold=require('../scripts/gold-engine.js');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'or.html'),'utf8');
function barSeries(n=420,price=100){
 const bars=[];for(let i=0;i<n;i++){const date=new Date(Date.UTC(2016,0,1+i)).toISOString().slice(0,10);bars.push({date,o:price,hi:price+1,lo:price-1,c:price,v:100000})}
 return bars;
}
function csv(n=450){const rows=['Date,Open,High,Low,Close,Volume'];let p=100;for(let i=0;i<n;i++){const date=new Date(Date.UTC(2016,0,1+i)).toISOString().slice(0,10),o=p,c=p*(1+.001+Math.sin(i*.12)*.01);rows.push([date,o.toFixed(4),(Math.max(o,c)*1.01).toFixed(4),(Math.min(o,c)*.99).toFixed(4),c.toFixed(4),100000+(i%17)*5000].join(','));p=c}return rows.join('\n')}
const fakeModel={id:'fixture',name:'fixture',hold:10,stopATR:1,targetATR:1,go:(b,m)=>b.date==='2016-10-27'};
function testModel(bars,signal=350){return {id:'fixture',name:'fixture',hold:10,stopATR:1,targetATR:1,go:(b,m)=>b.date===bars[signal].date}}
test('La page or existe et son script se compile',()=>{
 assert.match(html,/Laboratoire de l.or/);assert.match(html,/src="scripts\/gold-engine\.js"/);
 assert.doesNotThrow(()=>new Function(html.match(/<script>([\s\S]+?)<\/script>/)[1]));
});
test('Aucune requête réseau, aucun portefeuille et aucune clé API dans le laboratoire',()=>{
 const js=fs.readFileSync(path.join(root,'scripts/gold-engine.js'),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html+js,/\bfetch\s*\(|\bXMLHttpRequest\b|localStorage\b|sendBeacon\b|ALPHAVANTAGE_API_KEY|quantswing-ipad-v1/);
});
test('Les sources externes ne sont que des liens explicites pour les utilisateurs',()=>{
 assert.match(html,/spdrgoldshares\.com\/usa\/gld/);
 assert.match(html,/github\.com\/tohaitrieu\/market-history/);
 assert.match(html,/provenance|non v[eé]rifi[ée]/i);
});
test('Importer un CSV OHLCV classique',()=>{
 const d=gold.parseOHLCV(csv(),{filename:'GLD.csv'});
 assert.equal(d.ticker,'GLD');assert.equal(d.bars.length,450);assert.equal(d.hasVolume,true);
});
test('Pas de volume : les chandeliers GOLD restent analysables',()=>{
 const data=['Asset,TimeFrame,Time,Open,High,Low,Close,Year'];
 for(let i=0;i<320;i++){const date=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);data.push('GOLD,D1,'+date+' 21:00,1900,1908,1892,1900,2024')}
 const d=gold.parseOHLCV(data.join('\n'),{filename:'GOLD-D1.csv'});
 assert.equal(d.ticker,'GOLD');assert.equal(d.bars.length,320);assert.equal(d.hasVolume,false);
 assert.equal(gold.study(d).status,'ok');
});
test('Rejeter colonnes absentes ou fichier trop court',()=>{
 assert.throws(()=>gold.parseOHLCV('Date,Close\n2019-01-01,100',{filename:'GLD.csv'}));
 assert.throws(()=>gold.parseOHLCV(csv(21).replace('High','HIGHXX'),{filename:'GLD.csv'}),/Colonnes/);
});
test('Nettoyer les chandelles impossibles et les dates calendaires invalides',()=>{
 const c=csv(350)+'\n2019-02-31,100,102,99,100,1000\n2019-03-01,100,90,110,100,1000';
 const d=gold.parseOHLCV(c,{filename:'GLD.csv'});
 assert.equal(d.bars.length,350);assert.equal(d.invalid,2);
});
test('Les dates dupliquées sont décomptées',()=>{
 const c=csv(310),last=c.split('\n').at(-1),d=gold.parseOHLCV(c+'\n'+last,{filename:'GLD.csv'});
 assert.equal(d.duplicates,1);assert.equal(d.bars.length,310);
});
test('Plusieurs instruments mélangés sont refusés explicitement',()=>{
 const c=csv(320).replace('Date,Open','Asset,Date,Open').split('\n');
 const data=c.map((line,i)=>i===0?line:(i%2===0?'GLD,':'GOLD,')+line).join('\n');
 assert.throws(()=>gold.parseOHLCV(data,{filename:'bundle.csv'}),/multi-actifs/);
 const filtered=gold.parseOHLCV(data,{filename:'bundle.csv',symbol:'GLD'});
 assert.equal(filtered.ticker,'GLD');assert.equal(filtered.bars.length,160);
});
test('Exclure les séries non quotidiennes si la colonne TimeFrame existe',()=>{
 const rows=['Asset,TimeFrame,Time,Open,High,Low,Close'];
 for(let i=0;i<320;i++){const date=new Date(Date.UTC(2023,0,1+i)).toISOString().slice(0,10);rows.push('GOLD,D1,'+date+' 21:00,100,102,98,100')}
 rows.push('GOLD,H4,2023-11-17 05:00,100,102,98,100');
 const d=gold.parseOHLCV(rows.join('\n'),{filename:'GOLD-D1.csv'});assert.equal(d.intraday,1);assert.equal(d.bars.length,320);
});
test('Moins de 260 séances ne produisent pas de conclusion rétrospective',()=>{
 const d=gold.parseOHLCV(csv(100),{filename:'GLD.csv'});
 const s=gold.study(d);assert.equal(s.status,'insufficient_history');assert.equal(s.bars,100);
});
test('Les indicateurs de la date de signal ignorent les bougies futures',()=>{
 const a=barSeries(450),b=barSeries(450);b[401]={...b[401],o:200,hi:300,lo:100,c:220,v:900000};
 assert.deepEqual(gold.metricsAt(a,300),gold.metricsAt(b,300));
});
test('Les deux stratégies ont des règles fixes et distinctes',()=>{
 assert.equal(gold.MODELS.length,2);
 assert.equal(gold.MODELS[0].hold,10);
 assert.equal(gold.MODELS[1].stopATR,2);
 assert.notEqual(gold.MODELS[0].go.toString(),gold.MODELS[1].go.toString());
});
test('Une entrée a lieu au prochain Open et jamais au Close de signal',()=>{
 const bars=barSeries(450);bars[351]={...bars[351],o:105,hi:106,lo:104,c:105};
 const model=testModel(bars);
 const s=gold.evaluate(bars,model);
 assert.equal(s.trades,1);assert.equal(s.entries[0].entryDate,bars[351].date);
 assert.equal(s.entries[0].entry,105);
});
test('Stop et cible atteints sur la même séance : stop prioritaire',()=>{
 const bars=barSeries(450);bars[351]={...bars[351],o:100,hi:120,lo:80,c:100};
 const s=gold.evaluate(bars,testModel(bars));
 assert.equal(s.trades,1);assert.equal(s.entries[0].reason,'Stop');assert.ok(s.entries[0].returnPct<0);
});
test('Ouverture en gap sous le stop : sortir au prix Open',()=>{
 const bars=barSeries(450);bars[352]={...bars[352],o:70,hi:75,lo:65,c:70};
 const s=gold.evaluate(bars,testModel(bars));
 assert.equal(s.trades,1);assert.equal(s.entries[0].reason,'Gap sous stop');
 assert.equal(s.entries[0].exit,70);assert.ok(s.entries[0].returnPct<-25);
});
test('Les deux côtés de commission sont imputés même si le prix ne bouge pas',()=>{
 const bars=barSeries(450),model={...testModel(bars),hold:2,stopATR:20,targetATR:20};
 const s=gold.evaluate(bars,model,{fee:.0015});
 assert.equal(s.trades,1);assert.ok(s.entries[0].returnPct<-.29&&s.entries[0].returnPct>-.32);
});
test('Le test débute seulement après la fenêtre chronologique de développement',()=>{
 const bars=barSeries(600),model={...testModel(bars,550)};
 const s=gold.evaluate(bars,model);
 assert.equal(s.firstTestDate,bars[420].date);
 assert.ok(s.entries.every(x=>x.signalDate>=s.firstTestDate));
});
test('Référence 10 % investis et 100 % investis : comparaison cohérente',()=>{
 const bars=barSeries(400);bars[399]={...bars[399],o:140,hi:145,lo:130,c:140};
 const a=gold.buyHold(bars,300,.1,.0015),b=gold.buyHold(bars,300,1,.0015);
 assert.ok(Math.abs(b.returnPct/10-a.returnPct)<.0002);
});
test('Sur cours plat, acheter et conserver doit perdre les frais',()=>{
 const bars=barSeries(350),bench=gold.buyHold(bars,250,.1,.0015);
 assert.ok(bench.returnPct<0);
});
test('Aucun trade si aucune configuration : profit factor non inventé',()=>{
 const s=gold.study({bars:barSeries(400)});
 assert.equal(s.status,'ok');
 for(const strat of s.strategies){assert.equal(strat.trades,0);assert.equal(strat.winRatePct,null);assert.equal(strat.profitFactor,null)}
});
test('Un portefeuille n’investit jamais plus de 10 % en une seule position',()=>{
 const bars=barSeries(400);
 const result=gold.evaluate(bars,testModel(bars));
 assert.ok(result.entries.length===1);
 const ret=result.entries[0].returnPct;
 const port=result.entries[0].capitalResultPct;
 assert.ok(Math.abs(port-ret*.1)<.0005);
});
test('Ni lookahead ni chevauchement de transactions pour une stratégie',()=>{
 const bars=barSeries(650),model={id:'always',name:'always',hold:10,stopATR:8,targetATR:9,go:()=>true};
 const result=gold.evaluate(bars,model);
 for(let i=1;i<result.entries.length;i++)assert.ok(result.entries[i].entryDate>result.entries[i-1].exitDate);
 assert.ok(result.entries.every(x=>x.entryDate>x.signalDate));
});
test('Simulation sur 10 000 bougies : statistiques finies',()=>{
 const bars=[];let p=100;
 for(let i=0;i<10000;i++){let o=p,c=p*(1+Math.sin(i*.25)*.008+.0002);const date=new Date(Date.UTC(1990,0,1+i)).toISOString().slice(0,10);bars.push({date,o,hi:Math.max(o,c)*1.01,lo:Math.min(o,c)*.99,c,v:200000});p=c}
 const s=gold.study({bars});
 assert.equal(s.status,'ok');
 assert.ok(s.strategies.every(x=>Number.isFinite(x.portfolioReturnPct)&&Number.isFinite(x.maxDrawdownPct)));
});
