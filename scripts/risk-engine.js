/* QuantSwing AI — moteur de risque local (aucun accès réseau ni courtier).
 * Tous les montants de portefeuille restent dans le navigateur de l'utilisateur.
 * Les plafonds sont des hypothèses de simulation, non des recommandations personnalisées. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.QuantRisk=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VALID=/^[A-Z0-9][A-Z0-9.\-]{0,17}$/;
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const positive=v=>finite(v)&&v>0;
 const nonnegative=v=>finite(v)&&v>=0;
 const round=(v,d=2)=>finite(v)?Number(v.toFixed(d)):null;
 const isRecent=(value,now,maxDays=7)=>{const t=Date.parse(value);return Number.isFinite(t)&&t<=now.getTime()+3600000&&now.getTime()-t<=maxDays*86400000};
 const cleanSymbol=s=>String(s||'').trim().toUpperCase();
 function snapshot(data,now=new Date()){
  const issues=[],positions=new Map();
  if(!data||data.version!==1||!Array.isArray(data.trades)||!Array.isArray(data.cash))return {valid:false,issues:['Portefeuille local incompatible.'],positions:[],cash:null,equity:null,openRisk:null};
  let cash=0;
  for(const m of data.cash){
   if(!m||!positive(m.amount)||!['deposit','withdraw'].includes(m.side)){issues.push('Mouvement de liquidités invalide');continue;}
   cash+=m.side==='deposit'?m.amount:-m.amount;
  }
  const sorted=[...data.trades].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.order||0)-Number(b.order||0));
  for(const t of sorted){
   if(!t||!VALID.test(t.symbol)||!['CAD','USD'].includes(t.currency)||!['buy','sell'].includes(t.side)||!positive(t.qty)||!positive(t.price)||!positive(t.fx)||!nonnegative(t.fee)){
    issues.push('Transaction invalide dans le portefeuille');continue;
   }
   let p=positions.get(t.symbol);
   if(!p){p={symbol:t.symbol,currency:t.currency,qty:0,costCAD:0};positions.set(t.symbol,p)}
   if(p.currency!==t.currency){issues.push('Devise incohérente : '+t.symbol);continue}
   const gross=t.qty*t.price*t.fx,fees=t.fee*t.fx;
   if(t.side==='buy'){p.qty+=t.qty;p.costCAD+=gross+fees;cash-=gross+fees}
   else{
    if(t.qty>p.qty+0.0000001){issues.push('Vente excédentaire : '+t.symbol);continue}
    const basis=p.qty>0?p.costCAD*t.qty/p.qty:0;
    p.qty=Math.max(0,p.qty-t.qty);p.costCAD=Math.max(0,p.costCAD-basis);cash+=gross-fees;
   }
  }
  if(!finite(cash)){issues.push('Liquidités non finies');cash=null}
  const currentFx=data.fx&&positive(data.fx.rate)&&isRecent(data.fx.updatedAt,now)?data.fx.rate:null;
  let exposure=0,openRisk=0;
  const valued=[];
  for(const p of positions.values()){
   if(p.qty<1e-8)continue;
   const quote=data.quotes&&data.quotes[p.symbol];
   const price=quote&&positive(quote.price)?quote.price:null;
   const fx=p.currency==='CAD'?1:currentFx;
   const stale=!!price&&!isRecent(quote.updatedAt,now);
   const value=positive(price)&&positive(fx)?p.qty*price*fx:null;
   const configuredStop=data.risk&&data.risk[p.symbol]&&data.risk[p.symbol].stop;
   const stop=positive(configuredStop)?configuredStop:null;
   let stopRisk=null;
   if(value!==null&&stop!==null&&stop<price)stopRisk=p.qty*(price-stop)*fx;
   if(value===null)issues.push('Cours ou taux CAD/USD manquant pour '+p.symbol);
   if(stale)issues.push('Cours périmé pour '+p.symbol+' (plus de 7 jours)');
   if(stop===null)issues.push('Stop absent pour '+p.symbol);
   else if(price!==null&&stop>=price)issues.push('Stop atteint ou supérieur au dernier cours : '+p.symbol);
   if(stopRisk!==null)openRisk+=stopRisk;
   if(value!==null)exposure+=value;
   valued.push({...p,price,fx,value,stop,stopRisk,stale});
  }
  const fullyValued=valued.every(p=>p.value!==null);
  const equity=fullyValued&&cash!==null?cash+exposure:null;
  if(cash===null||cash<0)issues.push('Liquidités négatives ou non vérifiables');
  if(equity===null||equity<=0)issues.push('Valeur totale du portefeuille indisponible ou non positive');
  return {valid:issues.length===0,issues,positions:valued,cash,equity,exposure,openRisk,fx:currentFx,fullyValued};
 }
 function technicalLevels({entry,atr,swingLow,high20,highSinceEntry,currentStop,mode='support',bufferATR=.25,stopATR=1.5,targetMode='resistance',manualTarget}){
  const warnings=[];if(!positive(entry))return {valid:false,issues:['Prix d’entrée invalide'],warnings:[]};
  const support=positive(atr)&&positive(swingLow)&&swingLow<entry?swingLow-bufferATR*atr:null;
  const volatility=positive(atr)?entry-stopATR*atr:null;
  const usableSupport=positive(support)&&support<entry?support:null,usableVol=positive(volatility)&&volatility<entry?volatility:null;
  let selected=mode==='support'?usableSupport:mode==='atr'?usableVol:usableSupport&&usableVol?Math.min(usableSupport,usableVol):usableSupport||usableVol;
  if(!positive(selected)||selected>=entry)return {valid:false,issues:['Impossible de calculer un stop valide. Saisis l’ATR et le creux récent, ou change la méthode.'],support:round(usableSupport),atrStop:round(usableVol),warnings};
  const loss=entry-selected;
  let target=targetMode==='resistance'?high20:targetMode==='manual'?manualTarget:entry+2*loss;
  if(!positive(target)||target<=entry){
   if(targetMode==='resistance')warnings.push('Le plus haut récent n’est pas au-dessus de l’entrée : aucune cible de résistance valide.');
   target=null;
  }
  let trailing=null;
  if(positive(atr)&&positive(highSinceEntry)){
   if(highSinceEntry<entry)warnings.push('Le plus haut depuis l’entrée doit être au moins égal au prix d’entrée.');
   else {
    const calculated=highSinceEntry-2*atr;
    trailing=positive(calculated)?Math.max(calculated,positive(currentStop)?currentStop:0):null;
   }
  }
  if(target!==null&&(target-entry)/loss<1.5)warnings.push('Gain/risque inférieur à 1,5:1 avant frais.');
  return {valid:true,stop:round(selected,6),support:round(usableSupport,6),atrStop:round(usableVol,6),target:round(target,6),trailing:round(trailing,6),riskPerShare:round(loss,6),rewardRisk:target!==null?round((target-entry)/loss,3):null,warnings};
 }
 function positionPlan(state,{symbol,currency,entry,stop,target,riskPct=.5,maxTickerPct=10,maxTotalRiskPct=2,feePct=.15,sectorExposureCAD=null,sectorLimitPct=25}){
  const reasons=[],warnings=[];
  const s=cleanSymbol(symbol);if(!VALID.test(s))reasons.push('Symbole invalide');
  if(!['CAD','USD'].includes(currency))reasons.push('Devise invalide');
  if(!positive(entry)||!positive(stop)||stop>=entry)reasons.push('Le stop d’un achat doit être positif et inférieur à l’entrée');
  if(!positive(target)||target<=entry)reasons.push('Objectif absent ou inférieur à l’entrée');
  if(!finite(riskPct)||riskPct<.1||riskPct>2)reasons.push('Risque par trade hors de la plage 0,1–2 %');
  if(!finite(maxTickerPct)||maxTickerPct<=0||maxTickerPct>50)reasons.push('Plafond par action invalide');
  if(!finite(maxTotalRiskPct)||maxTotalRiskPct<=0||maxTotalRiskPct>10)reasons.push('Plafond de risque cumulé invalide');
  if(!finite(feePct)||feePct<0||feePct>3)reasons.push('Frais simulés invalides');
  if(sectorExposureCAD!==null&&(!nonnegative(sectorExposureCAD)||!finite(sectorLimitPct)||sectorLimitPct<=0||sectorLimitPct>100))reasons.push('Exposition du secteur invalide');
  if(!state||state.valid!==true)reasons.push(...(state?.issues||['Portefeuille indisponible']));
  if(reasons.length)return {eligible:false,quantity:0,reasons:[...new Set(reasons)],warnings,hardStop:true};
  const fx=currency==='CAD'?1:state.fx;
  if(!positive(fx))reasons.push('Taux USD/CAD récent requis');
  const held=state.positions.find(p=>p.symbol===s);
  if(held&&held.currency!==currency)reasons.push('Devise différente de celle de la position existante');
  if(!positive(state.equity)||!nonnegative(state.cash))reasons.push('Valeur totale ou liquidités invalides');
  if(reasons.length)return {eligible:false,quantity:0,reasons,warnings,hardStop:true};
  const fee=feePct/100;
  const entryCost=(entry*(1+fee))*fx;
  const riskUnit=(entry*(1+fee)-stop*(1-fee))*fx;
  const rewardUnit=(target*(1-fee)-entry*(1+fee))*fx;
  if(!(riskUnit>0&&entryCost>0))reasons.push('Risque unitaire impossible à calculer');
  const ratio=riskUnit>0?rewardUnit/riskUnit:null;
  if(!(ratio>=1.5))reasons.push('Ratio gain/risque net inférieur à 1,5:1');
  const budget=state.equity*riskPct/100;
  const maxOpenRisk=state.equity*maxTotalRiskPct/100;
  const remainingRisk=Math.max(0,maxOpenRisk-state.openRisk);
  const positionRoom=Math.max(0,state.equity*maxTickerPct/100-(held?.value||0));
  const cashRoom=Math.max(0,state.cash);
  const caps={
   risqueParTrade:Math.floor(budget/riskUnit),
   risqueCumule:Math.floor(remainingRisk/riskUnit),
   expositionTitre:Math.floor(positionRoom/entryCost),
   liquidites:Math.floor(cashRoom/entryCost)
  };
  if(sectorExposureCAD!==null)caps.expositionSecteur=Math.floor(Math.max(0,state.equity*sectorLimitPct/100-sectorExposureCAD)/entryCost);
  else warnings.push('Exposition sectorielle non vérifiée : renseigne ce champ pour appliquer un plafond de secteur.');
  const qty=Math.max(0,Math.min(...Object.values(caps)));
  if(qty===0)reasons.push('Aucune quantité compatible avec les limites de risque, de liquidités et de concentration');
  const cost=qty*entryCost,newRisk=qty*riskUnit;
  const existingRisk=state.openRisk,totalRisk=existingRisk+newRisk;
  warnings.push('Le stop ne garantit pas le prix de sortie : une ouverture en gap peut entraîner une perte beaucoup plus grande.');
  warnings.push('Cours et taux saisis localement, frais et conversions estimés, aucune cotation automatique.');
  return {eligible:reasons.length===0,quantity:reasons.length?0:qty,preliminaryQuantity:qty,caps,limitingFactors:Object.entries(caps).filter(([,v])=>v===qty).map(([k])=>k),riskBudgetCAD:round(budget),positionCostCAD:round(cost),lossToStopCAD:round(newRisk),totalRiskToStopsCAD:round(totalRisk),remainingRiskCAD:round(remainingRisk),riskUnitCAD:round(riskUnit),rewardRiskNet:round(ratio,3),existingTickerValueCAD:round(held?.value||0),fx,returnsAtTargetCAD:round(qty*rewardUnit),reasons,warnings,hardStop:false};
 }
 return {snapshot,technicalLevels,positionPlan,cleanSymbol,isRecent};
});
