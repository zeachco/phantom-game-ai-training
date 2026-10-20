var qu=Object.defineProperty;var ju=(r,t,e)=>t in r?qu(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e;var Gt=(r,t,e)=>(ju(r,typeof t!="symbol"?t+"":t,e),e),bo=(r,t,e)=>{if(!t.has(r))throw TypeError("Cannot "+e)};var Rt=(r,t,e)=>(bo(r,t,"read from private field"),e?e.call(r):t.get(r)),Ft=(r,t,e)=>{if(t.has(r))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(r):t.set(r,e)},Ce=(r,t,e,n)=>(bo(r,t,"write to private field"),n?n.call(r,e):t.set(r,e),e);var Wt=(r,t,e)=>(bo(r,t,"access private method"),e);import{d as $u,e as Ju,r as Yu,i as Zu}from"./index.d7f0c936.js";function za(r=-1,t=1){return r+Math.random()*(t-r)}function qn(r,t,e){return r+(t-r)*e}function Ku(r,t,e,n){const i=(n.x-e.x)*(r.y-e.y)-(n.y-e.y)*(r.x-e.x),s=(e.y-r.y)*(r.x-t.x)-(e.x-r.x)*(r.y-t.y),o=(n.y-e.y)*(t.x-r.x)-(n.x-e.x)*(t.y-r.y);if(o!==0){const a=i/o,l=s/o;if(a>=0&&a<=1&&l>=0&&l<=1)return{x:qn(r.x,t.x,a),y:qn(r.y,t.y,a),offset:a}}return null}function wv(r,t,e,n,i){let s=0,o=1;const a=e-r,l=n-t;if(a===0){if(r<i.minX||r>i.maxX)return!1}else{const c=1/a;let h=(i.minX-r)*c,u=(i.maxX-r)*c;if(h>u){const d=h;h=u,u=d}if(h>s&&(s=h),u<o&&(o=u),s>o)return!1}if(l===0){if(t<i.minY||t>i.maxY)return!1}else{const c=1/l;let h=(i.minY-t)*c,u=(i.maxY-t)*c;if(h>u){const d=h;h=u,u=d}if(h>s&&(s=h),u<o&&(o=u),s>o)return!1}return!0}function Sv(r,t){for(let e=0;e<r.length;e++)for(let n=0;n<t.length;n++)if(Ku(r[e],r[(e+1)%r.length],t[n],t[(n+1)%t.length]))return!0;return!1}function Ev(r,t,e={x:0,y:0}){let n=1/0;for(let i=0;i<t.length;i++){const s=t[i],o=t[(i+1)%t.length],a=o.x-s.x,l=o.y-s.y,c=a*a+l*l,h=c===0?0:Math.max(0,Math.min(1,((r.x-s.x)*a+(r.y-s.y)*l)/c)),u=s.x+a*h,d=s.y+l*h,f=(u-r.x)**2+(d-r.y)**2;f<n&&(n=f,e.x=u,e.y=d)}return e}function Tv(r){let t=r>>>0;return()=>{t|=0,t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}const Ze="neural",Ua=.05;function _l(r){return r<-1?-1:r>1?1:r}const ka=[-1,1];function Ls(r,t=ka){return r<t[0]?t[0]:r>t[1]?t[1]:r}const Qu=1e4;function td(r,t=Ua){if(!Number.isFinite(r)||r<=0)return t*4;const e=Math.min(1,r/Qu);return t*(1+3*(1-e))}var Us,uh;const Ai=class{constructor(t,e,n=Math.ceil(t/4)){Gt(this,"version",0);Gt(this,"levels");Gt(this,"score",0);Gt(this,"mutationFactor",.5);Gt(this,"mutationIndex",.5);Gt(this,"diff",0);Gt(this,"date",Date.now());Gt(this,"kind",Ze);Gt(this,"lastErrors",null);Gt(this,"lastMutations",null);if(t<e)throw new Error("requires more inputs than outputs");this.levels=[];for(let i=0;i<n;i++){const s=Math.floor(qn(t,e,i/n)),o=Math.floor(qn(t,e,(i+1)/n));this.levels.push(new Ue(s,o))}}static feedForward(t,e){let n=Ue.feedForward(t,e.levels[0]);for(let i=1;i<e.levels.length;i++)n=Ue.feedForward(n,e.levels[i]);return n}static hydrate(t){const e=new Ai(1,1,0);return e.levels=(t.levels||[]).map(n=>{const i=n.weights,s=new Ue(i.length,i[0].length);for(let o=0;o<i.length;o++)for(let a=0;a<i[o].length;a++)s.weights[o][a]=i[o][a];return s}),e.version=t.version||0,e.score=t.score||0,e.mutationIndex=t.mutationIndex||0,e.mutationFactor=0,e.kind=t.kind||Ze,e}process(t){return Ai.feedForward(t,this)}get id(){return[this.levels.length,this.version,this.mutationIndex].join("-")}get inputCount(){return this.levels[0]?this.levels[0].weights.length:0}get outputCount(){const t=this.levels[this.levels.length-1];return t?t.weights[0].length:0}mutate(t){this.version=t.version;for(let e=0;e<this.levels.length;e++)for(let n=0;n<this.levels[e].weights.length;n++)for(let i=0;i<this.levels[e].weights[n].length;i++)this.levels[e].weights[n][i]=qn(t.levels[e].weights[n][i],za(),this.mutationFactor)}train(t,e,n=Ua,i=[]){var d,f,g;const s=[t];let o=t;for(const m of this.levels)o=Ue.feedForward(o,m),s.push(o);const a=o;let l=0;const c=new Array(a.length),h=new Array(a.length);for(let m=0;m<a.length;m++){const p=(d=i[m])!=null?d:ka,x=Ls(a[m],p)-Ls((f=e[m])!=null?f:0,p);l+=x*x,h[m]=x,c[m]=2*x/a.length}const u=Wt(g=Ai,Us,uh).call(g,this.levels);return Ai.applyGradients(this.levels,s,c,n,u),this.lastErrors=h,this.lastMutations=u,l}static applyGradients(t,e,n,i,s=null){for(let o=t.length-1;o>=0;o--){const a=t[o],l=e[o],c=o>0?new Array(l.length).fill(0):null;let h=1;for(let d=0;d<l.length;d++)h+=l[d]*l[d];const u=i/h;for(let d=0;d<a.inputs.length;d++){const f=l[d];if(!f)continue;const g=a.weights[d];for(let m=0;m<a.outputs.length;m++){const p=n[m];if(!p)continue;c&&(c[d]+=g[m]*p);const x=u*p*f;!Number.isFinite(x)||(g[m]-=x,s&&(s[o][m]+=Math.abs(x)))}}c&&(n=c)}}};let jn=Ai;Us=new WeakSet,uh=function(t){return t.map(e=>new Array(e.outputs.length).fill(0))},Ft(jn,Us);var ks,dh;const pl=class{constructor(t=1,e=1){Gt(this,"inputs");Gt(this,"outputs");Gt(this,"weights");var n;this.inputs=new Array(t),this.outputs=new Array(e),this.weights=[];for(let i=0;i<t;i++)this.weights[i]=new Array(e);Wt(n=pl,ks,dh).call(n,this)}static feedForward(t,e){for(let n=0;n<e.inputs.length;n++)e.inputs[n]=t[n];for(let n=0;n<e.outputs.length;n++){let i=0;for(let s=0;s<e.inputs.length;s++)i+=e.inputs[s]*e.weights[s][n];e.outputs[n]=i}return e.outputs}};let Ue=pl;ks=new WeakSet,dh=function(t){for(let e=0;e<t.inputs.length;e++)for(let n=0;n<t.outputs.length;n++)t.weights[e][n]=za()},Ft(Ue,ks);const en="mixed",ed=.1,nd=2;var ve,Di,Ni,Vn,Rr,xa,Hs,fh,Vs,ph;const ml=class extends jn{constructor(e,n,i=[],s={}){var a;super(1,1,0);Ft(this,Rr);Ft(this,Hs);Ft(this,Vs);Gt(this,"kind",en);Gt(this,"expertIds",[]);Gt(this,"resetChance",.15);Gt(this,"selectedIndex",0);Gt(this,"selectionCounts",[]);Gt(this,"switches",0);Ft(this,ve,[]);Ft(this,Di,[]);Ft(this,Ni,0);Ft(this,Vn,null);if(Ce(this,ve,i.filter(l=>l.inputCount===e&&l.outputCount===n)),!Rt(this,ve).length)throw new Error(`No expert matching ${e} inputs / ${n} outputs`);const o=Math.max(2,s.hiddenNodes||Math.ceil((e+Rt(this,ve).length)/2));this.levels=[new Ue(e,o),new Ue(o,Rt(this,ve).length)],Ce(this,Ni,n),this.expertIds=rd(Rt(this,ve)),this.selectionCounts=Rt(this,ve).map(()=>0),this.resetChance=(a=s.resetChance)!=null?a:this.resetChance}get experts(){return Rt(this,ve)}get activeExpert(){return Rt(this,ve)[this.selectedIndex]}get expertLayers(){return Rt(this,ve).map(e=>e.levels.length)}get selectionShares(){if(!Rt(this,Vn)){const e=this.selectionCounts.reduce((n,i)=>n+(i||0),0);Ce(this,Vn,this.selectionCounts.map(n=>e?(n||0)/e:0))}return Rt(this,Vn)}get id(){return[en,this.version,this.mutationIndex].join("-")}get outputCount(){return Rt(this,Ni)}process(e){Ce(this,Di,e);const{index:n,outputs:i}=Wt(this,Rr,xa).call(this,e);return n!==this.selectedIndex&&this.switches++,this.selectedIndex=n,this.selectionCounts[n]=(this.selectionCounts[n]||0)+1,Ce(this,Vn,null),i}train(e,n,i=Ua,s=[]){var p,x;const o=[e];let a=e;for(const v of this.levels)a=Ue.feedForward(a,v),o.push(a);const l=id(a),c=Rt(this,ve).map(v=>v.process(e)),h=Rt(this,Ni),u=new Array(h).fill(0);for(let v=0;v<l.length;v++){const w=l[v];if(!w)continue;const y=c[v];for(let b=0;b<h;b++)u[b]+=w*y[b]}let d=0;const f=new Array(h);for(let v=0;v<h;v++){const w=(p=s[v])!=null?p:ka;f[v]=Ls(u[v],w)-Ls((x=n[v])!=null?x:0,w),d+=f[v]*f[v]}const g=new Array(a.length).fill(0);for(let v=0;v<a.length;v++){const w=l[v];if(!w)continue;const y=c[v];let b=0;for(let C=0;C<h;C++)b+=f[C]*(y[C]-u[C]);g[v]=2*w*b/h}const m=this.levels.map(v=>new Array(v.outputs.length).fill(0));return jn.applyGradients(this.levels,o,g,i,m),this.lastErrors=f,this.lastMutations=m,d}replay(){Rt(this,Di).length&&Wt(this,Rr,xa).call(this,Rt(this,Di))}mutate(e){Wt(this,Vs,ph).call(this,e),this.mutationFactor=Math.min(1,Math.max(this.mutationFactor,ed)),super.mutate(e),Wt(this,Hs,fh).call(this)}adoptSelector(e){var i,s,o;const n=(i=e.levels)!=null?i:[];for(let a=0;a<this.levels.length;a++){const l=(s=n[a])==null?void 0:s.weights,c=this.levels[a];if(!l||l.length!==c.weights.length)return;for(let h=0;h<l.length;h++){if(l[h].length!==c.weights[h].length)return;c.weights[h]=[...l[h]]}}this.version=(o=e.version)!=null?o:0}static fromSave(e,n,i,s,o={}){var h,u;const a=e==null?void 0:e.levels;if(!(a!=null&&a.length)||!s.length)return null;const l=a[a.length-1];if(((u=(h=l==null?void 0:l.weights)==null?void 0:h[0])==null?void 0:u.length)!==s.length)return null;const c=new ml(n,i,s,o);return c.adoptSelector(e),c.score=e.score||0,c}};let On=ml;ve=new WeakMap,Di=new WeakMap,Ni=new WeakMap,Vn=new WeakMap,Rr=new WeakSet,xa=function(e){const n=jn.feedForward(e,this);let i=0;for(let a=1;a<n.length;a++)n[a]>n[i]&&(i=a);const s=Rt(this,ve)[i],o=s?s.process(e):new Array(this.outputCount).fill(0);return{index:i,outputs:o}},Hs=new WeakSet,fh=function(){if(this.mutationFactor<=0)return;const e=this.levels[this.levels.length-1];for(let n=0;n<e.outputs.length;n++)if(!(Math.random()>this.resetChance*this.mutationFactor))for(let i=0;i<e.inputs.length;i++)e.weights[i][n]=za()},Vs=new WeakSet,ph=function(e){const n=(e==null?void 0:e.levels)||[];if(n.length!==this.levels.length)throw new Error(`Mixed save has ${n.length} levels, expected ${this.levels.length}`);const i=n[n.length-1].weights[0].length;if(i!==Rt(this,ve).length)throw new Error(`Mixed save targets ${i} experts, ${Rt(this,ve).length} are loaded`);const s=(e.expertIds||[]).join();if(s&&s!==this.expertIds.join())throw new Error("Expert library changed since the mixed brain was saved")};function id(r){const t=Math.max(...r,0),e=r.map(i=>Math.exp(i-t)),n=e.reduce((i,s)=>i+s,0);return e.map(i=>i/n)}function rd(r){const t={};return r.map(e=>{const n=e.levels.length;return t[n]=(t[n]||0)+1,`${n}.${t[n]}`})}function Av(r,t,e,n=1){const i=[];return r.forEach(s=>{!(s!=null&&s.length)||s.slice(0,n).forEach(o=>{var l;if(!((l=o==null?void 0:o.levels)!=null&&l.length)||o.kind===en)return;const a=jn.hydrate(o);a.inputCount!==t||a.outputCount!==e||i.push(a)})}),i}const sd=4e3,od=220;let In;function ad(){return In&&In.isConnected||(In=document.createElement("div"),In.className="toast-stack",document.body.appendChild(In)),In}function Un(r,t={}){var s,o;if(typeof document>"u")return;const e=document.createElement("div");e.className="toast",e.dataset.tone=(s=t.tone)!=null?s:"info",e.setAttribute("role","status"),e.setAttribute("aria-live","polite"),e.textContent=r;const n=()=>{!e.isConnected||(e.classList.remove("visible"),setTimeout(()=>e.remove(),od))},i=setTimeout(n,(o=t.duration)!=null?o:sd);e.addEventListener("click",()=>{clearTimeout(i),n()}),ad().appendChild(e),requestAnimationFrame(()=>e.classList.add("visible"))}const ld=10,no="https://phantom-game-ai-training-production.up.railway.app",vl="phantom_client_id",cd=5e3,hd=3e4,ud=500,Rs={cooldownMs:6e4,backoffStartMs:3e4,backoffCapMs:5*6e4};function dd(){let r=localStorage.getItem(vl);return r||(r=crypto.randomUUID(),localStorage.setItem(vl,r)),r}function io(r,t={},e=cd){const n=new AbortController,i=setTimeout(()=>n.abort(),e);return fetch(r,{...t,signal:n.signal}).finally(()=>clearTimeout(i))}function ge(r){return typeof r=="number"&&Number.isFinite(r)?r:void 0}async function fd(r){var s,o,a;let t;try{t=await io(`${no}/api/models?game=${encodeURIComponent(r)}&limit=200`)}catch{return null}if(!t.ok)return null;let e;try{e=await t.json()}catch{return null}const n=e&&typeof e=="object"?e.models:void 0;if(!Array.isArray(n)||!n.length)return{};const i={};for(const l of n){if(!l||typeof l!="object")continue;const c=l,h=c.group,u=c.model;if(typeof h!="string"||!h.startsWith(`${r}_`)||!u||typeof u!="object"||!Array.isArray(u.levels))continue;const d=(a=(o=(s=ge(c.globalScore))!=null?s:ge(c.score))!=null?o:ge(u.score))!=null?a:0;(!i[h]||d>i[h].score)&&(i[h]={score:d,model:u})}return i}const Ha=r=>`phantom_base_${r}`,ro=r=>`phantom_submitted_${r}`,mh=r=>`phantom_sync_${r}`;function Ps(r,t){localStorage.setItem(Ha(r),JSON.stringify(t)),gh(r)}function pd(r){const t=localStorage.getItem(mh(r));if(!t)return null;const e=Number(t);return Number.isFinite(e)&&e>0?e:null}function gh(r){localStorage.setItem(mh(r),String(Date.now()))}function zi(r){try{const t=JSON.parse(localStorage.getItem(Ha(r))||"{}");return t&&typeof t=="object"?t:{}}catch{return{}}}async function Cv(r,t,e=!1){const n=await fd(r);if(n===null)return{source:"none",written:[],synced:!1};if(Ps(r,Object.fromEntries(Object.entries(n).map(([o,a])=>[o,a.score]))),!Object.keys(n).length)return{source:"none",written:[],synced:!0};const i=e?Object.keys(n).filter(o=>!localStorage.getItem(o)):Object.keys(n),s={};for(const o of i)s[o]=[n[o].model];return{source:"server",written:t.importModels(s),synced:!0}}async function md(r,t){var s,o,a;let e;try{e=await io(`${no}/api/models?game=${encodeURIComponent(r)}&group=${encodeURIComponent(t)}&limit=1`)}catch{return null}if(!e.ok)return null;let n;try{n=await e.json()}catch{return null}const i=n&&typeof n=="object"?n.models:void 0;if(!Array.isArray(i))return null;for(const l of i){if(!l||typeof l!="object")continue;const c=l;if(c.group!==t)continue;const h=c.model;if(!h||typeof h!="object"||!Array.isArray(h.levels))continue;return{score:(a=(o=(s=ge(c.globalScore))!=null?s:ge(c.score))!=null?o:ge(h.score))!=null?a:0,model:h}}return null}async function gd(r,t,e){var o;const n=await md(r,t);if(!n||!e.importModels({[t]:[n.model]}).length)return null;const s=zi(r);return s[t]=Math.max((o=ge(s[t]))!=null?o:0,n.score),Ps(r,s),n.score}async function xd(r,t){let e;try{e=await io(`${no}/api/models?game=${encodeURIComponent(r)}&group=${encodeURIComponent(t)}`,{method:"DELETE"})}catch{return null}if(!e.ok)return null;let n=0;try{const l=await e.json();typeof l.deleted=="number"&&l.deleted>=0&&(n=l.deleted)}catch{}const i=zi(r);t in i&&(delete i[t],localStorage.setItem(Ha(r),JSON.stringify(i)));const s=`${t}@`,o=so(r),a=o.filter(l=>!l.startsWith(s));return a.length!==o.length&&localStorage.setItem(ro(r),JSON.stringify(a)),gh(r),n}async function _d(r,t,e,n,i,s){try{const o={game:r,group:t,model:e,score:n};i!==void 0&&(o.globalScore=i),s!==void 0&&(o.trackCount=s);const a=await io(`${no}/api/models`,{method:"POST",headers:{"content-type":"application/json","x-client-id":dd()},body:JSON.stringify(o)},hd);if(a.ok)return{ok:!0,notBetter:!1,best:0,rejected:!1};if(a.status===409){let l=0,c="";try{const h=await a.json();typeof(h==null?void 0:h.best)=="number"&&(l=h.best),typeof h.error=="string"&&(c=h.error)}catch{}return{ok:!1,notBetter:!0,best:l,rejected:!0,error:c}}if(a.status>=400&&a.status<500){let l=`HTTP ${a.status}`;try{const c=await a.json();typeof c.error=="string"&&(l=c.error)}catch{}return{ok:!1,notBetter:!1,best:0,rejected:!0,error:l}}return{ok:!1,notBetter:!1,best:0,rejected:!1}}catch{return{ok:!1,notBetter:!1,best:0,rejected:!1}}}function vd(r,t,e){var s,o,a,l;const n=(s=ge(t.score))!=null?s:0,i=`:g${((o=ge(e))!=null?o:0).toFixed(4)}`;return`${r}@${(a=t.version)!=null?a:0}:${(l=t.mutationIndex)!=null?l:0}:${n.toFixed(4)}${i}`}const xh=(r,t)=>`${r}:${t}`;function so(r){try{const t=JSON.parse(localStorage.getItem(ro(r))||"[]");return Array.isArray(t)?t:[]}catch{return[]}}function wo(r,t){const e=so(r);e.includes(t)||localStorage.setItem(ro(r),JSON.stringify([...e,t].slice(-ud)))}let yl=Promise.resolve(),Is=0,Wr=0;const Ml=new Map,_a=new Set,_h=new Map,So=new Map;function va(r,t){const e=So.get(r);e&&clearTimeout(e),So.set(r,setTimeout(()=>{So.delete(r);const n=_h.get(r);!n||vh(n.game,n.group,n)},t))}function yd(r){_a.add(r.sig);const t=xh(r.game,r.group);yl=yl.then(async()=>{var e,n,i,s;try{const o=(e=ge(r.globalScore))!=null?e:r.score,a=await _d(r.game,r.group,r.model,r.score,r.globalScore,r.trackCount);if(a.ok){Is=0,Wr=0,wo(r.game,r.sig);const l=zi(r.game);l[r.group]=Math.max((n=ge(l[r.group]))!=null?n:o,o),Ps(r.game,l);const c=r.globalScore!==void 0?`\u2601\uFE0F Uploaded ${r.group} \xB7 global ${o.toFixed(2)}`:`\u2601\uFE0F Uploaded ${r.group} \xB7 score ${r.score.toFixed(2)}`;Un(c,{tone:"success"})}else if(a.notBetter){wo(r.game,r.sig);const l=zi(r.game);l[r.group]=Math.max((i=ge(l[r.group]))!=null?i:Number.NEGATIVE_INFINITY,a.best,o),Ps(r.game,l),Un(`\u2601\uFE0F Server already has a better ${r.group} \xB7 best ${a.best.toFixed(2)}`,{tone:"info"})}else if(a.rejected)wo(r.game,r.sig),Un(`\u2601\uFE0F Server rejected ${r.group}: ${(s=a.error)!=null?s:"request was invalid"}`,{tone:"error"});else{Wr=Math.min(Wr+1,16);const l=Math.min(Rs.backoffCapMs,Rs.backoffStartMs*2**(Wr-1));Is=Date.now()+l,console.warn(`\u26A0\uFE0F submit of ${r.group} failed, retrying in ${Math.round(l/1e3)}s`),va(t,l)}}finally{_a.delete(r.sig)}}).catch(()=>{})}function Md(r,t){const e=so(r);localStorage.setItem(ro(r),JSON.stringify(e.filter(n=>n!==t)))}function vh(r,t,e){var l,c;const n=(l=ge(e.globalScore))!=null?l:e.score,i=ge(zi(r)[t]);if(so(r).includes(e.sig)){if(i!==void 0&&i>=n)return;Md(r,e.sig)}else if(i!==void 0&&n<=i)return;if(_a.has(e.sig))return;const s=xh(r,t);_h.set(s,e);const o=Date.now();if(o<Is){va(s,Is-o);return}const a=(c=Ml.get(s))!=null?c:0;if(o-a<Rs.cooldownMs){va(s,Rs.cooldownMs-(o-a));return}Ml.set(s,o),yd(e)}function Lv(r,t){return(e,n)=>{if(!Array.isArray(n)||!n.length)return;const i=n.reduce((l,c)=>{var h,u;return((h=ge(c.score))!=null?h:0)>((u=ge(l.score))!=null?u:0)?c:l}),s=ge(i.score);if(s===void 0)return;let o,a;if(t!=null&&t.globalScore){const l=t.globalScore(e);if(!l||l.trackCount<ld)return;o=l.globalScore,a=l.trackCount}vh(r,e,{game:r,group:e,model:i,score:s,globalScore:o,trackCount:a,sig:vd(e,i,o)})}}const yh="learning_step_percent",Eo=1;function Mh(){let r=null;try{r=localStorage.getItem(yh)}catch{return Eo}if(r===null)return Eo;const t=Number(r);return Number.isFinite(t)&&t>=0&&t<=100?t:Eo}function bd(r){try{localStorage.setItem(yh,String(Math.max(0,Math.min(100,r))))}catch{}}const wd=.01,Sd=180,Mr=new Map;function Ed(r){Mr.set(r,{losses:[],latest:null,complete:!1})}function Td(r,t){let e=Mr.get(r);if(e||(Ed(r),e=Mr.get(r)),e.complete||!Number.isFinite(t))return bl(r);if(e.latest=t,e.losses.length===Sd){const n=[];for(let i=0;i<e.losses.length;i+=2)n.push((e.losses[i]+e.losses[i+1])/2);e.losses=n}return e.losses.push(t),t<wd&&(e.complete=!0),bl(r)}function bl(r){const t=Mr.get(r);return t?{losses:t.losses,average:t.latest,complete:t.complete}:null}function Ad(r){var t;return!r||!((t=Mr.get(r))!=null&&t.complete)}var Gn,Wn,Gs,bh;const gl=class{constructor(t,e=gl.PROBES_PER_FRAME,n=[]){Ft(this,Gs);Ft(this,Gn,void 0);Ft(this,Wn,void 0);Gt(this,"outputRanges",[]);Gt(this,"lastLoss",null);Gt(this,"lastErrors",null);Gt(this,"lastDelta",null);this.inputCount=t,this.probesPerFrame=e,Ce(this,Gn,new Array(t).fill(1/0)),Ce(this,Wn,new Array(t).fill(-1/0)),this.outputRanges=n}rangeOf(t){const e=Rt(this,Gn)[t],n=Rt(this,Wn)[t],i=Number.isFinite(e)?Math.min(e,0):0,s=Number.isFinite(n)?Math.max(n,1):1;return[i,s]}sample(){const t=new Array(this.inputCount);for(let e=0;e<this.inputCount;e++){const[n,i]=this.rangeOf(e);t[e]=n+(i-n)*Math.random()}return t}step(t,e,n,i){var l;const s=td(i)*Mh()/100,o=t.train(n,e.process(n),s,this.outputRanges);this.lastErrors=t.lastErrors,this.lastDelta=(l=this.lastErrors)!=null&&l.length?this.lastErrors.reduce((c,h,u)=>{var g;const[d,f]=(g=this.outputRanges[u])!=null?g:[-1,1];return c+Math.abs(h)/(f-d)},0)/this.lastErrors.length:null,Wt(this,Gs,bh).call(this,n);let a=o;for(let c=0;c<this.probesPerFrame;c++){const h=this.sample();a+=t.train(h,e.process(h),s,this.outputRanges)}this.lastLoss=a/(this.probesPerFrame+1)}};let Ss=gl;Gn=new WeakMap,Wn=new WeakMap,Gs=new WeakSet,bh=function(t){const e=Math.min(this.inputCount,t.length);for(let n=0;n<e;n++){const i=t[n];!Number.isFinite(i)||(i<Rt(this,Gn)[n]&&(Rt(this,Gn)[n]=i),i>Rt(this,Wn)[n]&&(Rt(this,Wn)[n]=i))}},Gt(Ss,"PROBES_PER_FRAME",5);function Rv(r,t,e){return!!r&&r.inputCount===t&&r.outputCount===e}function Pv(r,t,e,n,i,s=[],o){const a=r!=null?r:new Ss(n.length,void 0,s);return Ad(o)&&(a.step(t,e,n,i),o&&a.lastDelta!==null&&Td(o,a.lastDelta)),a}const Cd="\u{1F393}";function Iv(r,t){return t?`${r} ${Cd}`:r}function Dv(r,t){const e=JSON.parse(JSON.stringify(r));return e.score=t,e}function Nv(r,t,e){return[t,...r.filter(n=>n!==t&&n!==void 0)].slice(0,Math.max(1,e))}const wh=r=>`${r}_trainFrom_`,Sh=r=>`${r}_guidedRun_`,Eh=r=>`${r}_guidedTarget_`,Th=r=>`${r}_guidedGuide_`,qi=r=>r==="mixed"?en:String(r),Ah=r=>r===null?null:r===en?"mixed":Number(r);function wl(r,t){return wh(r)+(t==="mixed"?en:String(t))}function Fv(r,t,e){try{e===null?localStorage.removeItem(wl(r,t)):localStorage.setItem(wl(r,t),e==="mixed"?en:String(e))}catch(n){console.warn("Unable to persist the train-from target",n)}}function Ld(r,t){return localStorage.getItem(Sh(r)+qi(t))==="1"}function Bv(r,t){localStorage.setItem(Sh(r)+qi(t),"1")}function Ov(r,t,e){try{const n=Eh(r)+qi(t);e===null?localStorage.removeItem(n):localStorage.setItem(n,String(e))}catch(n){console.warn("Unable to persist the guided target score",n)}}function zv(r,t){const e=localStorage.getItem(Eh(r)+qi(t));if(e===null)return null;const n=Number(e);return Number.isFinite(n)?n:null}function Uv(r,t,e){try{const n=Th(r)+qi(t);e===null?localStorage.removeItem(n):localStorage.setItem(n,e==="mixed"?en:String(e))}catch(n){console.warn("Unable to persist the guided guide",n)}}function kv(r,t){return Ah(localStorage.getItem(Th(r)+qi(t)))}function Hv(r){const t=[],e=wh(r);for(let n=0;n<localStorage.length;n++){const i=localStorage.key(n);if(!i||!i.startsWith(e))continue;const s=i.slice(e.length),o=Ah(localStorage.getItem(i));if(o===null)continue;const a=s===en?"mixed":Number(s);t.push([a,o])}return t}const Rd=3;function Vv(r,t,e=Rd){const n=t.filter(s=>s.active).length,i=Math.max(0,e-n);return i?t.filter(s=>!s.active&&!Ld(r,s.value)).sort((s,o)=>s.score-o.score).slice(0,i).map(s=>s.value):[]}function Gv(r,t){return`${r}:${t==="mixed"?"mixed":t}`}function Pd(r,t,e=[]){if(!r||!t)return!1;const n=(i,s)=>e.includes(i)?void 0:s;return JSON.stringify(r,n)===JSON.stringify(t,n)}const Id=["#ffffdd","#ff0000","#00aaff","#ffff00","#00ff00","#ff69ff","#00ffff","#ff8800","#447722","#aa22ff"],Wv="#ddffbb",Dd=3,Sl=10**Dd;function Xv(r,t,e){return Array.from({length:e+1},(n,i)=>Math.floor(r+(t-r)*i/e))}function Nd(r,t){if(!t.levelSizes.length||t.levelSizes.some(n=>!Number.isInteger(n)||n<1)||!r||typeof r!="object")return!1;const e=r;return!Array.isArray(e.levels)||e.levels.length!==t.levelSizes.length-1||t.kind&&(t.requireKind||e.kind!==void 0)&&e.kind!==t.kind||t.expertIds&&e.expertIds!==void 0&&(!Array.isArray(e.expertIds)||e.expertIds.length!==t.expertIds.length||e.expertIds.some((n,i)=>{var s;return n!==((s=t.expertIds)==null?void 0:s[i])}))?!1:e.levels.every((n,i)=>{if(!n||typeof n!="object")return!1;const s=n.weights,o=t.levelSizes[i],a=t.levelSizes[i+1];return Array.isArray(s)&&s.length===o&&s.every(l=>Array.isArray(l)&&l.length===a&&l.every(c=>typeof c=="number"&&Number.isFinite(c)))})}function qv(r="",t){const e=(x,v=Ze)=>v===Ze?`${r}_${x}`:`${r}_${v}_${x}`;return{saveBestModels:h,saveModelList:l,loadAllModelLayers:u,compactSaves:s,discardModels:d,discardModel:f,discardGameModels:g,exportModels:m,importModels:p};function n(x){const{levels:v,...w}=x;return{...w,levels:(v||[]).map(y=>({weights:(y.weights||[]).map(b=>b.map(C=>Math.round(C*Sl)/Sl))}))}}function i(x,v){for(let w=v.length;w>=1;w--)try{return localStorage.setItem(x,JSON.stringify(v.slice(0,w).map(n))),!0}catch(y){w===1&&console.warn(`Could not save ${x}, storage is full`,y)}return!1}function s(){for(const x of Object.keys(localStorage)){if(!x.startsWith(`${r}_`))continue;const v=localStorage.getItem(x);if(!v)continue;let w;try{w=JSON.parse(v)}catch{continue}!o(w)||JSON.stringify(w.map(n)).length>=v.length||i(x,w)}}function o(x){return Array.isArray(x)&&x.length>0&&x.every(v=>!!v&&Array.isArray(v.levels))}function a(x,v,w=Ze,y=e(x,w)){const b=c(x,w),C=["id","version","mutationIndex","mutationFactor","score"],R=b[0]?v[0].score-b[0].score:v[0].score;if(R<0)i(y,b.map(D=>({...D,diff:R,date:new Date})));else if(!Pd(v.map(n),b,C)){const D=v.map(V=>({...V,version:V.version+1,diff:R,date:new Date}));i(y,D)&&(t==null||t(y,D))}}function l(x,v,w=Ze,y=e(x,w)){i(y,v)&&(t==null||t(y,v))}function c(x,v=Ze,w=e(x,v),y){const b=localStorage.getItem(w);if(!b)return[];try{let C=JSON.parse(b);if(C&&!Array.isArray(C)&&(C=[C]),!Array.isArray(C)||y&&(!C.length||!C.every(R=>Nd(R,y))))throw new Error("incompatible model shape");return C}catch(C){return localStorage.removeItem(w),console.warn(`Discarding invalid save ${w}`,C),[]}}function h(x,v=1){const w={};x.forEach(y=>{const b=y.kind||Ze;w[b]=w[b]||[];const C=w[b],R=y.levels.length,D=C[R]||[];D.length>=v||(C[R]=[...D,y].sort((V,F)=>F.score-V.score))}),Object.keys(w).forEach(y=>{w[y].forEach((b,C)=>{a(C,b,y)})})}function u(x=1,v=Ze,w){const y=[];for(let b=1;b<=x;b++){const C=c(b,v,e(b,v),w==null?void 0:w(b));C.length&&(y[b]=C)}return y}function d(){localStorage.clear()}function f(x,v=Ze){localStorage.removeItem(e(x,v))}function g(){for(const x of Object.keys(localStorage))x.startsWith(`${r}_`)&&localStorage.removeItem(x)}function m(){const x={};return Object.keys(localStorage).forEach(v=>{if(!!v.startsWith(`${r}_`))try{const w=JSON.parse(localStorage.getItem(v)||"");Array.isArray(w)&&(x[v]=w)}catch{console.warn(`Skipping unreadable save ${v}`)}}),x}function p(x){const v=[];return Object.entries(x||{}).forEach(([w,y])=>{if(!w.startsWith(`${r}_`)||!Array.isArray(y)){console.warn(`Skipping incompatible model entry ${w}`);return}i(w,y)&&v.push(w)}),v}}function jv(r,t,e){return e<r?r:e>t?t:e}function $v(){return`hsl(${290+Math.random()*260}, 100%, 60%)`}function Fd(r=0,t=1,e=.5,n=1){const i=Math.round(r*360),s=Math.round(t*100),o=Math.round(e*100);return`hsla(${i}, ${s}%, ${o}%, ${n})`}function Bd(r){const t=/^#([0-9a-f]{6})$/i.exec(r);if(t){const n=parseInt(t[1],16);return .2126*Ci((n>>16&255)/255)+.7152*Ci((n>>8&255)/255)+.0722*Ci((n&255)/255)>.18?"#000":"#fff"}const e=/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i.exec(r);if(e){const[n,i,s]=zd(+e[1],+e[2]/100,+e[3]/100);return Od(n,i,s)>.18?"#000":"#fff"}return"#000"}const Ci=r=>r<=.04045?r/12.92:((r+.055)/1.055)**2.4,Od=(r,t,e)=>.2126*Ci(r/255)+.7152*Ci(t/255)+.0722*Ci(e/255),zd=(r,t,e)=>{const n=i=>{const s=(i+r*12)%12,o=e+t*Math.min(e,1-e)*Math.max(-1,Math.min(s-3,9-s,1));return Math.round(o*255)};return[n(0),n(8),n(4)]};function oo(r,t){var e;return(e=Id[r])!=null?e:Fd(r/t)}function Ud(r){const t=/^#([0-9a-f]{6})$/i.exec(r);if(!t)return[136,136,136];const e=parseInt(t[1],16);return[e>>16&255,e>>8&255,e&255]}function Ch(r,t,e){let n=0,i=0,s=0,o=0;return r.forEach(({layer:a,weight:l})=>{if(!(l>0))return;const[c,h,u]=Ud(oo(a,t));n+=c*l,i+=h*l,s+=u*l,o+=l}),o?`rgb(${Math.round(n/o)}, ${Math.round(i/o)}, ${Math.round(s/o)})`:e}const Xr=new Map;function kd(r,t,e){const n=r.selectionShares,i=r.expertLayers,s=`${i.join()}:${n.map(a=>Math.round(a*20)).join()}`;let o=Xr.get(s);return o||(o=Ch(i.map((a,l)=>({layer:a,weight:n[l]})),t,e),Xr.size>512&&Xr.clear(),Xr.set(s,o)),o}function Jv(r,t,e){return Ch((r.expertIds||[]).map((n,i)=>{var s;return{layer:parseInt(n,10),weight:((s=r.selectionCounts)==null?void 0:s[i])||0}}),t,e)}class Hd{constructor(t=new Map,e=!1,n=document,i=!1){Gt(this,"inputs",new Map);Gt(this,"strokes",new Map);Gt(this,"bound",new Set);this.aliases=t,this.debug=e,this.container=n,this.useMouse=i,this.register=this.register.bind(this),this.unregister=this.unregister.bind(this),this.onkey=this.onkey.bind(this),this.handleMouveMovement=this.handleMouveMovement.bind(this),this.cancel=this.cancel.bind(this),this.inputs.set("MouseX",0),this.inputs.set("MouseY",0),this.inputs.set("MouseZ",0),n.addEventListener("keydown",this.register),n.addEventListener("keyup",this.unregister),n.addEventListener("keypress",this.onkey),this.useMouse&&(n.addEventListener("mousedown",this.register),n.addEventListener("mouseup",this.unregister),n.addEventListener("mouseclick",this.onkey),n.addEventListener("contextmenu",this.cancel),n.addEventListener("mousemove",this.handleMouveMovement),n.addEventListener("wheel",this.handleMouveMovement))}remove(){this.container.removeEventListener("keydown",this.register),this.container.removeEventListener("keyup",this.unregister),this.container.removeEventListener("keypress",this.onkey),this.useMouse&&(this.container.removeEventListener("mousedown",this.register),this.container.removeEventListener("mouseup",this.unregister),this.container.removeEventListener("mouseclick",this.onkey),this.container.removeEventListener("contextmenu",this.cancel),this.container.removeEventListener("mousemove",this.handleMouveMovement),this.container.removeEventListener("wheel",this.handleMouveMovement))}get(t){const e=this.aliases.get(t)||t;return this.bound.add(e),this.inputs.get(e)||0}set(t,e,n=!1){const i=this.aliases.get(t)||t;n&&this.strokes.set(i,e),this.debug&&console.log(i,e),this.inputs.set(i,e)}once(t){const e=this.aliases.get(t)||t;this.bound.add(e);const n=this.inputs.get(e);return n&&this.inputs.delete(e),Boolean(n)}isBrowserKey(t){if(t.ctrlKey||t.metaKey||t.altKey||/^F\d{1,2}$/.test(t.code))return!0;const e=t.target;return!!e&&(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement||e.isContentEditable)}register(t){if(t instanceof KeyboardEvent){if(this.isBrowserKey(t))return;const e=t.code;this.bound.has(e)&&t.preventDefault(),this.set(e,1)}else this.set(`Mouse${t.button}`,1)}unregister(t){const e=t instanceof MouseEvent?`Mouse${t.button}`:t.code;this.set(e,0)}onkey(t){if(t instanceof KeyboardEvent){if(this.isBrowserKey(t))return;const e=t.code;this.bound.has(e)&&t.preventDefault(),this.set(e,1,!0)}else this.set(`Mouse${t.button}`,1,!0)}handleMouveMovement(t){t instanceof WheelEvent?(this.set("MouseOZ",this.get("MouseZ")),this.set("MouseZ",t.wheelDelta)):(this.set("MouseOX",this.get("MouseX")),this.set("MouseOY",this.get("MouseY")),this.set("MouseX",t.offsetX),this.set("MouseY",t.offsetY))}cancel(t){t.preventDefault()}}const Ui=14,se=Math.max(Ui,10),El=Ui*3,To=["F","L","R","B"],xr=Math.PI*2,Vd=[3,2],ir=[],Ao=[],ya=48,Gd=new Array(ya).fill(0).map((r,t)=>{const e=t/(ya-1)*2-1;return`hsla(56, 100%, ${Math.round((e+1)*100)}%, ${Math.abs(e)})`}),Wd=.03,Va=new Map;Va.set("KeyL","ToggleLines");Va.set("KeyS","ToggleStats");const Tl=new Hd(Va);function Xd(r){const t=(Math.max(-1,Math.min(1,r))+1)*.5;return Math.round(t*(ya-1))}function ii(r,t,e){const n=new Array(r);for(let i=0;i<r;i++)n[i]=qn(t,e,r===1?.5:i/(r-1));return n}const Al=[];function rr(r,t){return t<=1?Math.min(Ui,Math.max(2,r*.4)):Math.min(Ui,r/(t-1)*.35)}const Co=[];function qd(r){return Co[r]||(Co[r]=new Array(r).fill(0).map((t,e)=>`${e}`)),Co[r]}function jd(r,t,e,n){r.moveTo(t+n,e),r.arc(t,e,n,0,xr)}function $d(r,t,e,n,i,s,o,a){for(let l=0;l<2;l++){const c=l===0;let h=!1;r.beginPath();for(let u=0;u<t.length;u++){const d=i[u];!d||d>0!==c||(r.moveTo(t[u]+n,e),r.arc(t[u],e,n,0,xr*(a?Math.abs(d):d)),h=!0)}!h||(r.strokeStyle=c?s:o,r.stroke())}}function Jd(r,t){var h;const{level:e,inputX:n,outputX:i,bottom:s,radius:o}=t,a=t.top+o,l=e.weights,c=[];for(let u=0;u<n.length;u++){const d=l[u];if(!!d)for(let f=0;f<i.length;f++){const g=d[f];if(!(Math.abs(g)>Wd))continue;const m=Xd(g);(h=c[m])!=null||(c[m]=[]),c[m].push(u,f)}}for(let u=0;u<c.length;u++){const d=c[u];if(!!d){r.beginPath();for(let f=0;f<d.length;f+=2)r.moveTo(n[d[f]],s),r.lineTo(i[d[f+1]],a);r.strokeStyle=Gd[u],r.stroke()}}}var Xn,Ws,Pr,Ir,Dr,Nr,Fr,Xs,Lh;const yr=class{constructor(){Ft(this,Xs);Ft(this,Xn,document.createElement("canvas"));Ft(this,Ws,Rt(this,Xn).getContext("2d"));Ft(this,Pr,void 0);Ft(this,Ir,"");Ft(this,Dr,NaN);Ft(this,Nr,0);Ft(this,Fr,0)}draw(t,e,n,i,s,o=""){const a=Math.ceil(s)+yr.PAD*2,l=t.canvas.height;a<1||l<1||((Rt(this,Pr)!==e||Rt(this,Ir)!==o||Rt(this,Dr)!==i||Rt(this,Nr)!==a||Rt(this,Fr)!==l)&&Wt(this,Xs,Lh).call(this,e,n,i,a,l,o),t.drawImage(Rt(this,Xn),i-yr.PAD,0))}};let Li=yr;Xn=new WeakMap,Ws=new WeakMap,Pr=new WeakMap,Ir=new WeakMap,Dr=new WeakMap,Nr=new WeakMap,Fr=new WeakMap,Xs=new WeakSet,Lh=function(t,e,n,i,s,o){const a=Rt(this,Ws);Rt(this,Xn).width=i,Rt(this,Xn).height=s,a.setTransform(1,0,0,1,yr.PAD-n,0),a.lineWidth=2,a.setLineDash(Vd);for(let l=0;l<e.length;l++)Jd(a,e[l]);Ce(this,Pr,t),Ce(this,Ir,o),Ce(this,Dr,n),Ce(this,Nr,i),Ce(this,Fr,s)},Gt(Li,"PAD",2);var Fi,qs,js,Br,Ba,Yd,Oa,Zd,$s,Rh,Js,Ph,Ys,Ih,Bi,Es,Zs,Dh,Oi,Ts,Ke,Sn,Ks,Nh,Qs,Fh,to,Bh,Or,Ma,eo,Oh;class Yv{constructor(t){Ft(this,Ba);Ft(this,Oa);Ft(this,$s);Ft(this,Js);Ft(this,Ys);Ft(this,Bi);Ft(this,Zs);Ft(this,Oi);Ft(this,Ke);Ft(this,Ks);Ft(this,Qs);Ft(this,to);Ft(this,Or);Ft(this,eo);Gt(this,"renderLines",!0);Gt(this,"renderStats",!0);Ft(this,Fi,new Li);Ft(this,qs,new Li);Ft(this,js,new Li);Ft(this,Br,new WeakMap);this.config=t}renderNetwork(t,e,n=null,i=null){Tl.once("ToggleLines")&&(this.renderLines=!this.renderLines),Tl.once("ToggleStats")&&(this.renderStats=!this.renderStats),e instanceof On&&e.replay(),n instanceof On&&n.activeExpert&&(n=n.activeExpert),Wt(this,$s,Rh).call(this,t,e,n,i)}}Fi=new WeakMap,qs=new WeakMap,js=new WeakMap,Br=new WeakMap,Ba=new WeakSet,Yd=function(t){return oo(t,this.config.MAX_NETWORK_LAYERS)},Oa=new WeakSet,Zd=function(t){return kd(t,this.config.MAX_NETWORK_LAYERS,"#808080")},$s=new WeakSet,Rh=function(t,e,n,i){var o;if(n){const a=e instanceof On&&(o=e.activeExpert)!=null?o:e;Wt(this,Ks,Nh).call(this,t,a,n,i,e instanceof On?null:e.lastMutations);return}if(!(e instanceof On)){const a=t.canvas.width-se*2;return Wt(this,Ys,Ih).call(this,t,e,se,a,To,Rt(this,Fi))}const s=e.activeExpert;s&&Wt(this,Js,Ph).call(this,t,e,s)},Js=new WeakSet,Ph=function(t,e,n){var u,d,f,g,m;const i=Math.max(1,(t.canvas.width-se*2-El)/2),s=se,o=s+i+El,a=ii((d=(u=e.levels[0])==null?void 0:u.inputs.length)!=null?d:0,se,t.canvas.width-se),l=Wt(this,Bi,Es).call(this,t,e,s,i,qd(e.experts.length)).map(p=>({...p})),c=Wt(this,Bi,Es).call(this,t,n,o,i,To).map(p=>({...p}));for(const p of[l,c]){const x=p[p.length-1];x&&(x.inputX=a,x.bottom=t.canvas.height-se)}this.renderLines&&(Rt(this,Fi).draw(t,e,l,0,t.canvas.width,"mixed-selector"),Rt(this,qs).draw(t,n,c,0,t.canvas.width,"mixed-expert")),Wt(this,Oi,Ts).call(this,t,l,!0),Wt(this,Oi,Ts).call(this,t,c,!0);const h=l[l.length-1];Wt(this,Ke,Sn).call(this,t,a,(f=h==null?void 0:h.bottom)!=null?f:t.canvas.height-se,rr(t.canvas.width-se*2,a.length),(m=(g=e.levels[0])==null?void 0:g.inputs)!=null?m:[],"rgba(0, 0, 0, 0.65)","orange","green",!0)},Ys=new WeakSet,Ih=function(t,e,n,i,s,o,a=""){const l=Wt(this,Bi,Es).call(this,t,e,n,i,s);return this.renderLines&&o.draw(t,e,l,n,i,a),Wt(this,Oi,Ts).call(this,t,l),l},Bi=new WeakSet,Es=function(t,e,n,i,s){const o=t.canvas.height-se*2,a=`${n}|${i}|${o}|${s.length}`;let l=Rt(this,Br).get(e);l||(l=new Map,Rt(this,Br).set(e,l));const c=l.get(a);if(c)return c;const h=Wt(this,Zs,Dh).call(this,e,n,i,o,s);return l.set(a,h),h},Zs=new WeakSet,Dh=function(t,e,n,i,s){const o=se,a=t.levels.length,l=i/a,c=e+n,h=[];for(let u=a-1;u>=0;u--){const d=t.levels[u],f=o+qn(i-l,0,a===1?.5:u/(a-1)),g=Math.max(d.inputs.length,d.outputs.length);h.push({level:d,top:f,bottom:f+l,radius:g>1?Math.min(Ui,n/(g-1)*.45):Math.min(Ui,n*.4),inputX:ii(d.inputs.length,e,c),outputX:ii(d.outputs.length,e,c),labels:u===a-1?s:Ao})}return h},Oi=new WeakSet,Ts=function(t,e,n=!1){t.setLineDash(ir),t.lineWidth=2,t.textAlign="center",t.textBaseline="middle";for(let i=0;i<e.length;i++){const{level:s,top:o,bottom:a,radius:l,inputX:c,outputX:h,labels:u}=e[i];n&&i===e.length-1||Wt(this,Ke,Sn).call(this,t,c,a,l,s.inputs,"rgba(0, 0, 0, 0.65)","orange","green",!0),Wt(this,Ke,Sn).call(this,t,h,o,l,s.outputs,"rgba(255, 255, 255, 0.4)","#def","#86f",!1,u)}},Ke=new WeakSet,Sn=function(t,e,n,i,s,o,a,l,c,h=Ao){t.beginPath();for(let u=0;u<e.length;u++)jd(t,e[u],n,i);if(t.strokeStyle=o,t.stroke(),$d(t,e,n,i*(c?.55:.8),s,a,l,c),!!h.length){t.font=`${Math.max(9,Math.round(i))}px Arial`,t.fillStyle="white";for(let u=0;u<e.length;u++)h[u]&&t.fillText(h[u],e[u],n+i*.1)}},Ks=new WeakSet,Nh=function(t,e,n,i,s){var l,c,h,u,d,f,g,m;const o=Wt(this,Qs,Fh).call(this,t,e,n);t.setLineDash(ir),t.lineWidth=2,t.textAlign="center",t.textBaseline="middle",this.renderLines&&(Rt(this,Fi).draw(t,e,o.traineeLevels,se,t.canvas.width-se*2,"split"),Rt(this,js).draw(t,n,o.guideLevels,se,t.canvas.width-se*2,"split")),Wt(this,Ke,Sn).call(this,t,o.inputs,o.inputY,o.inputRadius,(c=(l=e.levels[0])==null?void 0:l.inputs)!=null?c:[],"rgba(0, 0, 0, 0.65)","orange","green",!0);for(const p of o.hiddenRows)Wt(this,Ke,Sn).call(this,t,p.trainee.x,p.y,p.trainee.radius,p.trainee.values,"rgba(255, 255, 255, 0.4)","#def","#86f",!1),s&&p.traineeLevelIndex!==null&&Wt(this,Or,Ma).call(this,t,p.trainee.x,p.y,p.trainee.radius,(h=s[p.traineeLevelIndex])!=null?h:[]),Wt(this,Ke,Sn).call(this,t,p.guide.x,p.y,p.guide.radius,p.guide.values,"rgba(255, 255, 255, 0.4)","#dfd","#6d6",!1);const a=e.levels[e.levels.length-1];Wt(this,Ke,Sn).call(this,t,o.outputs,o.outputY,o.outputRadius,(u=a==null?void 0:a.outputs)!=null?u:[],"rgba(255, 255, 255, 0.4)","#def","#86f",!1,To),s&&Wt(this,Or,Ma).call(this,t,o.outputs,o.outputY,o.outputRadius,(d=s[e.levels.length-1])!=null?d:[]),i?Wt(this,to,Bh).call(this,t,o.outputs,o.outputY,o.outputRadius,i):Wt(this,eo,Oh).call(this,t,o.outputs,o.outputY,o.outputRadius,(f=a==null?void 0:a.outputs)!=null?f:[],(m=(g=n.levels[n.levels.length-1])==null?void 0:g.outputs)!=null?m:[])},Qs=new WeakSet,Fh=function(t,e,n){var k,P,X,Y,Q,K;const i=se,s=Math.max(1,t.canvas.width-se*2),o=Math.max(1,t.canvas.height-se*2),a=Math.max(0,e.levels.length-1),l=Math.max(0,n.levels.length-1),c=Math.max(1,a,l),h=c+2,u=o/(h-1),d=at=>se+o-at*u,f=i+s/2,g=Math.max(se,s*.06),m=i,p=f-g,x=f+g,v=i+s,w=Math.max((P=(k=e.levels[0])==null?void 0:k.inputs.length)!=null?P:0,(Y=(X=n.levels[0])==null?void 0:X.inputs.length)!=null?Y:0),y=e.levels[e.levels.length-1],b=n.levels[n.levels.length-1],C=Math.max((Q=y==null?void 0:y.outputs.length)!=null?Q:0,(K=b==null?void 0:b.outputs.length)!=null?K:0),R=rr(s,w),D=rr(s,C),V=ii(w,i+R,i+s-R),F=ii(C,i+D,i+s-D),_=(at,bt)=>c-bt+at,A=(at,bt,xt,W)=>({x:ii(at.length,bt+W,xt-W),radius:W,values:at}),j=[];for(let at=1;at<=c;at++){const bt=at-(c-a)-1,xt=e.levels[bt],W=n.levels[at-(c-l)-1],pt=xt?xt.outputs:Al,yt=W?W.outputs:Al,wt=Math.min(rr(p-m,pt.length),rr(v-x,yt.length));j.push({y:d(at),trainee:A(pt,m,p,wt),guide:A(yt,x,v,wt),traineeLevelIndex:xt?bt:null})}const I=(at,bt,xt)=>at.levels.map((W,pt)=>{const yt=pt===0,wt=pt===at.levels.length-1,it=yt?{y:d(0),x:V}:{y:d(_(pt,bt)),x:xt(pt)},Ct=wt?{y:d(h-1),x:F}:{y:d(_(pt+1,bt)),x:xt(pt+1)};return{level:W,top:Ct.y,bottom:it.y,radius:R,inputX:it.x,outputX:Ct.x,labels:Ao}}),z=at=>j[_(at,a)-1].trainee.x,B=at=>j[_(at,l)-1].guide.x;return{inputs:V,inputY:d(0),inputRadius:R,outputs:F,outputY:d(h-1),outputRadius:D,hiddenRows:j,traineeLevels:I(e,a,z),guideLevels:I(n,l,B)}},to=new WeakSet,Bh=function(t,e,n,i,s){var a;const o=Math.max(5,i*1.25);t.setLineDash(ir),t.lineWidth=2.5,t.strokeStyle="red";for(let l=0;l<e.length;l++){const c=(a=s[l])!=null?a:0;if(!Number.isFinite(c)||Math.abs(c)<.01)continue;const h=xr*Math.max(-1,Math.min(1,c));t.beginPath(),t.arc(e[l],n,o,-Math.PI/2,-Math.PI/2+h),t.stroke()}},Or=new WeakSet,Ma=function(t,e,n,i,s){var a;const o=i*1.5;t.setLineDash(ir),t.lineWidth=3;for(let l=0;l<e.length;l++){const c=(a=s[l])!=null?a:0;if(!Number.isFinite(c)||c<1e-6)continue;const h=Math.max(.15,Math.min(1,c/.05));t.strokeStyle=`rgba(255, 40, 40, ${h})`,t.beginPath(),t.arc(e[l],n,o,0,xr),t.stroke()}},eo=new WeakSet,Oh=function(t,e,n,i,s,o){var l,c;const a=Math.max(5,i*1.25);t.setLineDash(ir),t.lineWidth=2.5,t.strokeStyle="red";for(let h=0;h<e.length;h++){const u=_l((l=o[h])!=null?l:0)-_l((c=s[h])!=null?c:0);if(!Number.isFinite(u)||Math.abs(u)<.01)continue;const d=xr*Math.max(-1,Math.min(1,u));t.beginPath(),t.arc(e[h],n,a,-Math.PI/2,-Math.PI/2+d),t.stroke()}};function Zv(r={}){const{gauge:t,statsTitle:e="followed brain stats",startHidden:n=!0}=r,i=document.createElement("div");i.className=n?"steer-overlay hidden":"steer-overlay";const s=document.createElement("div");s.className="control-indicators";const o=document.createElement("canvas");o.className="control-axis",o.width=110,o.height=110;const a=o.getContext("2d");s.append(o);let l,c;t&&(l=document.createElement("div"),l.className="gate-gauge",l.title=t.title,l.setAttribute("role","progressbar"),l.setAttribute("aria-label",t.ariaLabel),l.setAttribute("aria-valuemin","0"),l.setAttribute("aria-valuemax",String(t.max)),c=document.createElement("div"),c.className="gate-gauge-fill",l.append(c));const h=document.createElement("div");h.className="readout";const u=document.createElement("div");u.className="brain-stats",u.title=e,i.append(s),l&&i.append(l),i.append(h);let d="";return{el:i,ctx:a,readout:h,stats:u,setStats(f){const g=f.map(m=>`<span>${m}</span>`).join("");g!==d&&(d=g,u.innerHTML=g)},gauge:l&&c?{el:l,set(f,g){const m=Math.max(0,Math.min(1,f));c.style.height=`${m*100}%`,l.setAttribute("aria-valuenow",String(g))}}:void 0,timingLine:(f,g)=>Kd(f,g),show(f){i.style.setProperty("--hud-color",f||"#c4c4c4"),i.classList.toggle("hidden",f===null)}}}function Kv(){const r=document.createElement("div");r.className="speedo",r.title="speed";const t=document.createElement("span");t.className="speedo-value",t.textContent="0.0";const e=document.createElement("span");return e.className="speedo-unit",e.textContent="u/f",r.append(t,e),{el:r,set(n){t.textContent=n.toFixed(1)}}}function Kd(r,t){const e=document.createElement("div");e.className="timing-line",e.title=t;const n=document.createElement("span");n.className="timing-label",n.textContent=r;const i=document.createElement("span");i.className="timing-value",i.textContent="\u2014";const s=document.createElement("span");return s.className="timing-delta",e.append(n,i,s),{el:e,label:n,value:i,delta:s}}function Qv(r,t,e){r.value.textContent=t===null?"\u2014":String(Math.max(0,Math.round(t))),r.delta.textContent=e===null?"":`(${e>0?"+":""}${Math.round(e)})`,r.delta.style.color=e===null?"":e<0?"#70e08a":e>0?"#ff7070":"rgba(255, 255, 255, 0.55)"}function ty(r,{x:t,y:e,color:n,action:i=!1,actionLabel:s,actionHistory:o},a=110){const l=a/2,c=42,h=32,u=10,d=84,f=a-20,g=20,m=y=>Math.max(-1,Math.min(1,y));r.clearRect(0,0,a,a),r.fillStyle="rgba(25, 52, 94, 0.55)",r.fillRect(0,0,a,a),r.strokeStyle=n,r.globalAlpha=.7,r.lineWidth=2,r.strokeRect(1,1,a-2,a-2),r.globalAlpha=.25,r.lineWidth=1,r.beginPath(),r.arc(l,c,h,0,Math.PI*2),r.stroke(),r.beginPath(),r.moveTo(l,c-h+6),r.lineTo(l,c+h-6),r.moveTo(l-h+6,c),r.lineTo(l+h-6,c),r.stroke();const p=l+m(t)*(h-4),x=c-m(e)*(h-4);r.globalAlpha=.9,r.lineWidth=4,r.beginPath(),r.moveTo(l,c),r.lineTo(p,x),r.stroke(),r.fillStyle=n,r.beginPath(),r.arc(p,x,6,0,Math.PI*2),r.fill();const v=(y,b,C,R,D)=>{r.beginPath(),r.moveTo(y+D,b),r.arcTo(y+C,b,y+C,b+R,D),r.arcTo(y+C,b+R,y,b+R,D),r.arcTo(y,b+R,y,b,D),r.arcTo(y,b,y+C,b,D),r.closePath()},w=o;if(i&&w&&w.length>1){r.globalAlpha=.35,r.lineWidth=1,r.beginPath(),r.moveTo(u+4,d+g-5.5),r.lineTo(u+f-4,d+g-5.5),r.stroke(),r.fillStyle=n,r.globalAlpha=.9;const y=f-10,b=u+5+Math.max(0,y-w.length);for(let C=0;C<w.length;C++)!w[C]||r.fillRect(b+C,d+3,1,g-9)}else i&&(r.globalAlpha=.9,r.fillStyle=n,v(u,d,f,g,g/2),r.fill());r.globalAlpha=.7,r.lineWidth=1.5,v(u,d,f,g,g/2),r.stroke(),s&&(i&&w&&w.length>1||(r.globalAlpha=i?.25:.5,r.fillStyle=i?"#000":n,r.font="bold 9px monospace",r.textAlign="center",r.textBaseline="middle",r.fillText(s,l,d+g/2+.5))),r.globalAlpha=1}const Qd=r=>r.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function ey(r="Score board"){const t=document.createElement("div");t.className="track-score-board score-board-left";const e=document.createElement("div");e.className="track-score-title",e.textContent=r;const n=document.createElement("div");n.className="score-board-cars";const i=document.createElement("div");i.className="score-board-rows",t.append(e,n,i);let s="",o="",a="";return{el:t,update:(c,h)=>{var g,m;const u=(g=c==null?void 0:c.text)!=null?g:"",d=(m=c==null?void 0:c.color)!=null?m:"";(u!==s||d!==o)&&(s=u,o=d,n.textContent=u,n.style.color=d);const f=h.map(({emoji:p,text:x,color:v})=>`<div class="score-board-row" style="color:${v}">${p?`${p} `:""}${Qd(x)}</div>`).join("");f!==a&&(a=f,i.innerHTML=f)}}}function tf(r){const t=e=>{if(e.repeat||e.isComposing)return;const n=e.target;if(!(n&&(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement||n instanceof HTMLSelectElement||n.isContentEditable))){if(e.code==="Backquote")r.mixed();else if(e.code==="Digit0")r.all();else if(e.code.startsWith("Digit")){const i=Number(e.code.slice(5));i>=1&&i<=9&&r.digit(i)}}};return document.addEventListener("keydown",t),()=>document.removeEventListener("keydown",t)}function Lo(r,t){return t==="mixed"?`${r}_${en}_${nd}`:`${r}_${t}`}function ef(r,t=Date.now()){if(r===null)return"never";const e=Math.max(0,Math.round((t-r)/1e3));if(e<60)return`${e}s ago`;const n=Math.round(e/60);if(n<60)return`${n}m ago`;const i=Math.round(n/60);return i<24?`${i}h ago`:`${Math.round(i/24)}d ago`}const sr=r=>r==null||!Number.isFinite(r)?"\u2014":String(Math.round(r));function nf(r){const{game:t,io:e,label:n,seedBest:i,globalBest:s,resetLocal:o,reinitialize:a,groups:l,trainFrom:c,setTrainFrom:h,teacherScore:u,groupColor:d,displayedGroup:f,trainingProgress:g,activeTrainingGroup:m}=r,p=document.createElement("div");p.className="group-panel",p.hidden=!0;const x=document.createElement("hr");x.className="group-panel-divider",p.appendChild(x);const v=document.createElement("div");v.className="group-panel-actions";const w=(Z,nt)=>{const st=document.createElement("button");return st.type="button",st.className="group-panel-btn",st.textContent=Z,st.title=nt,v.appendChild(st),st},y=w("Delete local","Delete this group\u2019s saved brains from this browser"),b=w("Reload remote","Download the group\u2019s best stored model from the server (overwrites local)"),C=w("Delete remote","Delete the group\u2019s stored models from the server");p.appendChild(v);const R=document.createElement("div");R.className="group-panel-readouts";const D=Z=>{const nt=document.createElement("div");nt.className="group-panel-row";const st=document.createElement("span");st.className="group-panel-name",st.textContent=Z;const ot=document.createElement("span");return ot.className="group-panel-value",nt.appendChild(st),nt.appendChild(ot),R.appendChild(nt),ot},V=document.createElement("div");V.className="group-panel-row";const F=document.createElement("span");F.className="group-panel-name",F.textContent="train from";const _=document.createElement("select");_.className="group-panel-select",V.appendChild(F),V.appendChild(_);const A=document.createElement("span");A.className="group-panel-value",A.hidden=!0,V.appendChild(A),R.appendChild(V);const j=D("teacher"),I=j.parentElement,z=D("seed best"),B=D("global"),k=D("remote"),P=D("last sync"),X=document.createElement("div");X.className="group-panel-row",X.hidden=!0;const Y=document.createElement("label");Y.className="group-panel-name",Y.textContent="learn per step";const Q=document.createElement("input");Q.type="range",Q.min="0",Q.max="100",Q.step="1",Q.value=String(Mh()),Q.id=`learning-step-${t}`,Y.htmlFor=Q.id;const K=document.createElement("span");K.className="group-panel-value",K.textContent=`${Q.value}%`,X.append(Y,Q,K),R.appendChild(X),Q.addEventListener("input",()=>{bd(Number(Q.value)),K.textContent=`${Q.value}%`});const at=document.createElement("div");at.className="group-panel-loss",at.hidden=!0;const bt=document.createElement("div"),xt=document.createElement("canvas");xt.width=420,xt.height=72,xt.setAttribute("aria-label","Average absolute guide delta since this group run started"),at.append(bt,xt),R.appendChild(at);const W=Z=>{var zt,E;if(at.hidden=!Z,!Z)return;bt.textContent=Z.complete?`guide delta ${(((zt=Z.average)!=null?zt:0)*100).toFixed(2)}% \xB7 learning paused`:`guide delta ${(((E=Z.average)!=null?E:0)*100).toFixed(2)}% \xB7 learning`;const nt=xt.getContext("2d"),{width:st,height:ot}=xt;nt.clearRect(0,0,st,ot),nt.strokeStyle="rgba(255,255,255,.2)",nt.beginPath(),nt.moveTo(0,ot-1),nt.lineTo(st,ot-1),nt.stroke();const It=Z.losses;!It.length||(nt.strokeStyle=Z.complete?"#7ee787":"#55d6f2",nt.lineWidth=2,nt.beginPath(),It.forEach((M,U)=>{const tt=It.length===1?0:U/(It.length-1)*st,ut=ot-2-Math.min(1,M)*(ot-4);U?nt.lineTo(tt,ut):nt.moveTo(tt,ut)}),nt.stroke())};p.appendChild(R);let pt=0,yt=null,wt=!1,it=null;const Ct=Z=>Z===null?"":Z==="mixed"?"mixed":String(Z);function G(){var ot,It,zt,E;if(p.hidden)return;const Z=pt===0,nt=Z?(ot=f==null?void 0:f())!=null?ot:null:pt;yt=pt==="mixed"&&(It=m==null?void 0:m())!=null?It:null;const st=yt!=null?yt:pt;if(Z)A.textContent=nt===null?"\u2014":n(nt),X.hidden=!0;else{const M=Ct(c(st));_.value!==M&&(_.value=M);const U=c(st);X.hidden=U===null,W((zt=g==null?void 0:g(st))!=null?zt:null),_.style.color=U===null?"":(E=d==null?void 0:d(U))!=null?E:"",j.textContent=sr(u(pt))}if(Z&&W(null),nt===null)z.textContent="\u2014",B.textContent="\u2014",k.textContent="\u2014";else{const M=Lo(t,nt);z.textContent=sr(i(M)),B.textContent=sr(s(M)),k.textContent=sr(zi(t)[M])}P.textContent=ef(pd(t))}function $(){it!==null&&(clearInterval(it),it=null)}function rt(){it!==null||!wt||p.hidden||(it=setInterval(G,500))}y.addEventListener("click",()=>{o(pt),G()}),b.addEventListener("click",async()=>{const nt=(pt===0?l:[pt]).map(st=>Lo(t,st));if(!!confirm(pt===0?`Reload all ${t} models from the server? This overwrites local saves for ${nt.join(", ")}.`:`Reload ${n(pt)} from the server? This overwrites the local save of ${nt[0]}.`)){b.disabled=!0;try{const ot=(await Promise.all(nt.map(It=>gd(t,It,e)))).filter(It=>It!==null);ot.length===0?Un(`No ${pt===0?t:nt[0]} model on the server (or offline)`,{tone:"error"}):(a(),Un(pt===0?`Reloaded ${ot.length} of ${nt.length} ${t} models from the server`:`Reloaded ${nt[0]} from the server (score ${sr(ot[0])})`,{tone:"success"}))}finally{b.disabled=!1,G()}}}),C.addEventListener("click",async()=>{const nt=(pt===0?l:[pt]).map(st=>Lo(t,st));if(!!confirm(pt===0?`Delete all ${t} models from the server? Your local saves are kept.`:`Delete ${nt[0]} from the server? This removes the publicly stored models of the group; your local saves are kept.`)){C.disabled=!0;try{const st=await Promise.all(nt.map(ot=>xd(t,ot)));if(st.every(ot=>ot===null))Un(`Could not delete ${pt===0?t:nt[0]} models from the server (offline?)`,{tone:"error"});else{const ot=st.reduce((It,zt)=>It+(zt!=null?zt:0),0);Un(pt===0?`Deleted ${ot} stored ${t} model(s)`:`Deleted ${ot} stored model(s) of ${nt[0]}`,{tone:"success"})}}finally{C.disabled=!1,G()}}});function gt(Z=pt){_.length=0;const nt=document.createElement("option");nt.value="",nt.textContent="free (own brains)",_.appendChild(nt);for(const st of l){const ot=document.createElement("option");ot.value=st==="mixed"?"mixed":String(st),ot.textContent=n(st),ot.disabled=st===Z;const It=d==null?void 0:d(st);It&&(ot.style.color=It),_.appendChild(ot)}_.value=Ct(c(Z))}return _.addEventListener("change",()=>{if(pt===0)return;const Z=_.value;h(yt!=null?yt:pt,Z===""?null:Z==="mixed"?"mixed":Number(Z)),G()}),{el:p,apply(Z){var st;pt=Z,p.hidden=!1,R.hidden=!1,x.hidden=!1;const nt=Z===0;F.textContent=nt?"showing":"train from",_.hidden=nt,A.hidden=!nt,I.hidden=nt,nt||gt(Z==="mixed"&&(st=m==null?void 0:m())!=null?st:Z),G(),rt()},setOpen(Z){wt=Z,Z?(G(),rt()):$()},refresh:G}}const Cl=.75,Ll=800,zh="#c4c4c4";function rf(r){return t=>t===0?zh:oo(t==="mixed"?0:t,r)}function sf(r){return t=>typeof t=="number"&&t>0?oo(t,r):zh}function ny(r){const{groupActions:t,content:e,layers:n=9,initialFollow:i=0,initialOpen:s=!1,buttonColor:o=rf(n),networkColor:a=sf(n),onFollow:l}=r,c=document.createElement("aside");c.className="side-panel",c.style.width=`${Cl*100}%`,c.style.maxWidth=`${Ll}px`;const h=document.createElement("button");h.className="side-panel-toggle",h.textContent="\u276E",h.setAttribute("title","F12 to toggle"),h.setAttribute("aria-label","Toggle models panel");const u=nf(t),d=document.createElement("div");d.className="follow-keys";const f=document.createElement("span");f.textContent="Follow",d.append(f);const g=new Map,m=(V,F)=>{const _=document.createElement("button");_.textContent=F,_.dataset.follow=String(V),V===0&&_.classList.add("follow-all"),_.title="Click to follow";const A=V===0?"#ffffff":o(V);A&&(_.style.setProperty("--btn-color",A),_.style.setProperty("--btn-text",Bd(A))),_.onclick=()=>D(V,"button"),d.append(_),g.set(_,{key:String(V)})};for(let V=1;V<=n;V++)m(V,`brain ${V}`);m(0,"all"),m("mixed","mixed");const p=document.createElement("div");p.style.aspectRatio="4 / 3",p.style.flex="0 0 auto",p.style.position="relative";const x=document.createElement("canvas");x.className="neural-canvas",x.style.position="absolute",x.style.left="0",x.style.top="0";const v=x.getContext("2d");p.append(x);const w=document.createElement("div");w.className="side-panel-content",w.append(d,u.el,p,$u(e)),c.append(h,w);let y=s;y&&(c.classList.add("open"),h.textContent="\u276F",u.setOpen(!0));const b=V=>{y=V,c.classList.toggle("open",y),h.textContent=y?"\u276F":"\u276E",u.setOpen(y)};h.onclick=()=>b(!y),Ju(()=>b(!y));let C=i;const R=V=>{g.forEach((F,_)=>{_.classList.toggle("active",F.key===String(V))}),x.style.setProperty("--network-color",a(V)),u.apply(V)},D=(V,F)=>{C=V,R(V),l==null||l(V,F)};return R(i),tf({digit:V=>D(V,"key"),all:()=>D(0,"key"),mixed:()=>D("mixed","key")}),{el:c,isOpen:()=>y,panelWidth:()=>Math.round(Math.min(window.innerWidth*Cl,Ll)),setFollow:V=>D(V,"program"),follow:()=>C,setRunning(V,F){g.forEach((_,A)=>{const j=_.key==="0"?F:V.has(_.key);j!==_.running&&(_.running=j,A.classList.toggle("running",j),A.classList.toggle("dead",!j))})},network:()=>(Yu(x,v,p.clientWidth,p.clientHeight),{canvas:x,ctx:v}),groupPanel:u}}function iy(r){let t=0;for(const i of Object.values(r.history))t+=i;const e=String(r.current);let n=Object.keys(r.history).length;return r.history[e]===void 0&&(n+=1,t+=r.seed),{globalScore:t,trackCount:n}}function ry(r,t){const e=`${r}_`;if(!t.startsWith(e))return null;const n=t.slice(e.length);if(!n)return null;let i=null;try{i=JSON.parse(localStorage.getItem(`${r}_score_${n}`)||"null")}catch{i=null}return!i||typeof i!="object"||typeof i.current!="number"||typeof i.seed!="number"||!i.history||typeof i.history!="object"?null:i}function sy(r){let t;try{t=JSON.parse(localStorage.getItem(r)||"null")}catch{return null}if(t&&!Array.isArray(t)&&(t=[t]),!Array.isArray(t)||!t.length)return null;let e=null;for(const n of t){const i=n&&typeof n=="object"?n.score:void 0;typeof i=="number"&&Number.isFinite(i)&&(e===null||i>e)&&(e=i)}return e}/**
 * @license
 * Copyright 2010-2022 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ga="139",of=0,Rl=1,af=2,Uh=1,lf=2,pr=3,br=0,Ve=1,ki=2,kh=1,En=0,Ri=1,Pl=2,Il=3,Dl=4,cf=5,bi=100,hf=101,uf=102,Nl=103,Fl=104,df=200,ff=201,pf=202,mf=203,Hh=204,Vh=205,gf=206,xf=207,_f=208,vf=209,yf=210,Mf=0,bf=1,wf=2,ba=3,Sf=4,Ef=5,Tf=6,Af=7,ao=0,Cf=1,Lf=2,fn=0,Rf=1,Pf=2,If=3,Df=4,Nf=5,Gh=300,Hi=301,Vi=302,wa=303,Sa=304,lo=306,Ea=1e3,ke=1001,Ta=1002,de=1003,Bl=1004,Ol=1005,Se=1006,Ff=1007,co=1008,Yn=1009,Bf=1010,Of=1011,wr=1012,zf=1013,As=1014,kn=1015,Pi=1016,Uf=1017,kf=1018,Ii=1020,Hf=1021,Vf=1022,He=1023,Gf=1024,Wf=1025,$n=1026,Gi=1027,Xf=1028,qf=1029,jf=1030,$f=1031,Jf=1033,Ro=33776,Po=33777,Io=33778,Do=33779,zl=35840,Ul=35841,kl=35842,Hl=35843,Yf=36196,Vl=37492,Gl=37496,Wl=37808,Xl=37809,ql=37810,jl=37811,$l=37812,Jl=37813,Yl=37814,Zl=37815,Kl=37816,Ql=37817,tc=37818,ec=37819,nc=37820,ic=37821,rc=36492,Zf=2200,Kf=2201,Qf=2202,Ds=2300,Ns=2301,No=2302,wi=2400,Si=2401,Fs=2402,Wa=2500,Wh=2501,tp=0,pn=3e3,te=3001,ep=3200,np=3201,ji=0,ip=1,un="srgb",Hn="srgb-linear",Fo=7680,rp=519,Sr=35044,Bs=35048,sc="300 es",Aa=1035;class Zn{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const s=i.indexOf(e);s!==-1&&i.splice(s,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let s=0,o=i.length;s<o;s++)i[s].call(this,t);t.target=null}}}const pe=[];for(let r=0;r<256;r++)pe[r]=(r<16?"0":"")+r.toString(16);const Bo=Math.PI/180,Ca=180/Math.PI;function tn(){const r=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(pe[r&255]+pe[r>>8&255]+pe[r>>16&255]+pe[r>>24&255]+"-"+pe[t&255]+pe[t>>8&255]+"-"+pe[t>>16&15|64]+pe[t>>24&255]+"-"+pe[e&63|128]+pe[e>>8&255]+"-"+pe[e>>16&255]+pe[e>>24&255]+pe[n&255]+pe[n>>8&255]+pe[n>>16&255]+pe[n>>24&255]).toLowerCase()}function ye(r,t,e){return Math.max(t,Math.min(e,r))}function sp(r,t){return(r%t+t)%t}function Oo(r,t,e){return(1-e)*r+e*t}function oc(r){return(r&r-1)===0&&r!==0}function La(r){return Math.pow(2,Math.floor(Math.log(r)/Math.LN2))}class et{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t,e){return e!==void 0?(console.warn("THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(t,e)):(this.x+=t.x,this.y+=t.y,this)}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t,e){return e!==void 0?(console.warn("THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(t,e)):(this.x-=t.x,this.y-=t.y,this)}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e,n){return n!==void 0&&console.warn("THREE.Vector2: offset has been removed from .fromBufferAttribute()."),this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),s=this.x-t.x,o=this.y-t.y;return this.x=s*n-o*i+t.x,this.y=s*i+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}et.prototype.isVector2=!0;class me{constructor(){this.elements=[1,0,0,0,1,0,0,0,1],arguments.length>0&&console.error("THREE.Matrix3: the constructor no longer reads arguments. use .set() instead.")}set(t,e,n,i,s,o,a,l,c){const h=this.elements;return h[0]=t,h[1]=i,h[2]=a,h[3]=e,h[4]=s,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],m=i[0],p=i[3],x=i[6],v=i[1],w=i[4],y=i[7],b=i[2],C=i[5],R=i[8];return s[0]=o*m+a*v+l*b,s[3]=o*p+a*w+l*C,s[6]=o*x+a*y+l*R,s[1]=c*m+h*v+u*b,s[4]=c*p+h*w+u*C,s[7]=c*x+h*y+u*R,s[2]=d*m+f*v+g*b,s[5]=d*p+f*w+g*C,s[8]=d*x+f*y+g*R,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*s*h+n*a*l+i*s*c-i*o*l}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*s,f=c*s-o*l,g=e*u+n*d+i*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const m=1/g;return t[0]=u*m,t[1]=(i*c-h*n)*m,t[2]=(a*n-i*o)*m,t[3]=d*m,t[4]=(h*e-i*l)*m,t[5]=(i*s-a*e)*m,t[6]=f*m,t[7]=(n*l-c*e)*m,t[8]=(o*e-n*s)*m,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-i*c,i*l,-i*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){const n=this.elements;return n[0]*=t,n[3]*=t,n[6]*=t,n[1]*=e,n[4]*=e,n[7]*=e,this}rotate(t){const e=Math.cos(t),n=Math.sin(t),i=this.elements,s=i[0],o=i[3],a=i[6],l=i[1],c=i[4],h=i[7];return i[0]=e*s+n*l,i[3]=e*o+n*c,i[6]=e*a+n*h,i[1]=-n*s+e*l,i[4]=-n*o+e*c,i[7]=-n*a+e*h,this}translate(t,e){const n=this.elements;return n[0]+=t*n[2],n[3]+=t*n[5],n[6]+=t*n[8],n[1]+=e*n[2],n[4]+=e*n[5],n[7]+=e*n[8],this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}me.prototype.isMatrix3=!0;function Xh(r){for(let t=r.length-1;t>=0;--t)if(r[t]>65535)return!0;return!1}function Er(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function Jn(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function Cs(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}const zo={[un]:{[Hn]:Jn},[Hn]:{[un]:Cs}},Fe={legacyMode:!0,get workingColorSpace(){return Hn},set workingColorSpace(r){console.warn("THREE.ColorManagement: .workingColorSpace is readonly.")},convert:function(r,t,e){if(this.legacyMode||t===e||!t||!e)return r;if(zo[t]&&zo[t][e]!==void 0){const n=zo[t][e];return r.r=n(r.r),r.g=n(r.g),r.b=n(r.b),r}throw new Error("Unsupported color space conversion.")},fromWorkingColorSpace:function(r,t){return this.convert(r,this.workingColorSpace,t)},toWorkingColorSpace:function(r,t){return this.convert(r,t,this.workingColorSpace)}},qh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},le={r:0,g:0,b:0},Be={h:0,s:0,l:0},qr={h:0,s:0,l:0};function Uo(r,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?r+(t-r)*6*e:e<1/2?t:e<2/3?r+(t-r)*6*(2/3-e):r}function jr(r,t){return t.r=r.r,t.g=r.g,t.b=r.b,t}class vt{constructor(t,e,n){return e===void 0&&n===void 0?this.set(t):this.setRGB(t,e,n)}set(t){return t&&t.isColor?this.copy(t):typeof t=="number"?this.setHex(t):typeof t=="string"&&this.setStyle(t),this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=un){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Fe.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=Hn){return this.r=t,this.g=e,this.b=n,Fe.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=Hn){if(t=sp(t,1),e=ye(e,0,1),n=ye(n,0,1),e===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+e):n+e-n*e,o=2*n-s;this.r=Uo(o,s,t+1/3),this.g=Uo(o,s,t),this.b=Uo(o,s,t-1/3)}return Fe.toWorkingColorSpace(this,i),this}setStyle(t,e=un){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^((?:rgb|hsl)a?)\(([^\)]*)\)/.exec(t)){let s;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return this.r=Math.min(255,parseInt(s[1],10))/255,this.g=Math.min(255,parseInt(s[2],10))/255,this.b=Math.min(255,parseInt(s[3],10))/255,Fe.toWorkingColorSpace(this,e),n(s[4]),this;if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return this.r=Math.min(100,parseInt(s[1],10))/100,this.g=Math.min(100,parseInt(s[2],10))/100,this.b=Math.min(100,parseInt(s[3],10))/100,Fe.toWorkingColorSpace(this,e),n(s[4]),this;break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)){const l=parseFloat(s[1])/360,c=parseInt(s[2],10)/100,h=parseInt(s[3],10)/100;return n(s[4]),this.setHSL(l,c,h,e)}break}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const s=i[1],o=s.length;if(o===3)return this.r=parseInt(s.charAt(0)+s.charAt(0),16)/255,this.g=parseInt(s.charAt(1)+s.charAt(1),16)/255,this.b=parseInt(s.charAt(2)+s.charAt(2),16)/255,Fe.toWorkingColorSpace(this,e),this;if(o===6)return this.r=parseInt(s.charAt(0)+s.charAt(1),16)/255,this.g=parseInt(s.charAt(2)+s.charAt(3),16)/255,this.b=parseInt(s.charAt(4)+s.charAt(5),16)/255,Fe.toWorkingColorSpace(this,e),this}return t&&t.length>0?this.setColorName(t,e):this}setColorName(t,e=un){const n=qh[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Jn(t.r),this.g=Jn(t.g),this.b=Jn(t.b),this}copyLinearToSRGB(t){return this.r=Cs(t.r),this.g=Cs(t.g),this.b=Cs(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=un){return Fe.fromWorkingColorSpace(jr(this,le),t),ye(le.r*255,0,255)<<16^ye(le.g*255,0,255)<<8^ye(le.b*255,0,255)<<0}getHexString(t=un){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Hn){Fe.fromWorkingColorSpace(jr(this,le),e);const n=le.r,i=le.g,s=le.b,o=Math.max(n,i,s),a=Math.min(n,i,s);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(i-s)/u+(i<s?6:0);break;case i:l=(s-n)/u+2;break;case s:l=(n-i)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Hn){return Fe.fromWorkingColorSpace(jr(this,le),e),t.r=le.r,t.g=le.g,t.b=le.b,t}getStyle(t=un){return Fe.fromWorkingColorSpace(jr(this,le),t),t!==un?`color(${t} ${le.r} ${le.g} ${le.b})`:`rgb(${le.r*255|0},${le.g*255|0},${le.b*255|0})`}offsetHSL(t,e,n){return this.getHSL(Be),Be.h+=t,Be.s+=e,Be.l+=n,this.setHSL(Be.h,Be.s,Be.l),this}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Be),t.getHSL(qr);const n=Oo(Be.h,qr.h,e),i=Oo(Be.s,qr.s,e),s=Oo(Be.l,qr.l,e);return this.setHSL(n,i,s),this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),t.normalized===!0&&(this.r/=255,this.g/=255,this.b/=255),this}toJSON(){return this.getHex()}}vt.NAMES=qh;vt.prototype.isColor=!0;vt.prototype.r=1;vt.prototype.g=1;vt.prototype.b=1;let ri;class Kn{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{ri===void 0&&(ri=Er("canvas")),ri.width=t.width,ri.height=t.height;const n=ri.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=ri}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Er("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),s=i.data;for(let o=0;o<s.length;o++)s[o]=Jn(s[o]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Jn(e[n]/255)*255):e[n]=Jn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}class jh{constructor(t=null){this.uuid=tn(),this.data=t,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?s.push(ko(i[o].image)):s.push(ko(i[o]))}else s=ko(i);n.url=s}return e||(t.images[this.uuid]=n),n}}function ko(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Kn.getDataURL(r):r.data?{data:Array.prototype.slice.call(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}jh.prototype.isSource=!0;let op=0;class fe extends Zn{constructor(t=fe.DEFAULT_IMAGE,e=fe.DEFAULT_MAPPING,n=ke,i=ke,s=Se,o=co,a=He,l=Yn,c=1,h=pn){super(),Object.defineProperty(this,"id",{value:op++}),this.uuid=tn(),this.name="",this.source=new jh(t),this.mipmaps=[],this.mapping=e,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new et(0,0),this.repeat=new et(1,1),this.center=new et(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new me,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.encoding=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.encoding=t.encoding,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.5,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,type:this.type,encoding:this.encoding,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return JSON.stringify(this.userData)!=="{}"&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Gh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Ea:t.x=t.x-Math.floor(t.x);break;case ke:t.x=t.x<0?0:1;break;case Ta:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Ea:t.y=t.y-Math.floor(t.y);break;case ke:t.y=t.y<0?0:1;break;case Ta:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}}fe.DEFAULT_IMAGE=null;fe.DEFAULT_MAPPING=Gh;fe.prototype.isTexture=!0;class Jt{constructor(t=0,e=0,n=0,i=1){this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t,e){return e!==void 0?(console.warn("THREE.Vector4: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(t,e)):(this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this)}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t,e){return e!==void 0?(console.warn("THREE.Vector4: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(t,e)):(this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this)}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,s=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i+o[12]*s,this.y=o[1]*e+o[5]*n+o[9]*i+o[13]*s,this.z=o[2]*e+o[6]*n+o[10]*i+o[14]*s,this.w=o[3]*e+o[7]*n+o[11]*i+o[15]*s,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,s;const l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],m=l[2],p=l[6],x=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-m)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+m)<.1&&Math.abs(g+p)<.1&&Math.abs(c+f+x-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const w=(c+1)/2,y=(f+1)/2,b=(x+1)/2,C=(h+d)/4,R=(u+m)/4,D=(g+p)/4;return w>y&&w>b?w<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(w),i=C/n,s=R/n):y>b?y<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(y),n=C/i,s=D/i):b<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(b),n=R/s,i=D/s),this.set(n,i,s,e),this}let v=Math.sqrt((p-g)*(p-g)+(u-m)*(u-m)+(d-h)*(d-h));return Math.abs(v)<.001&&(v=1),this.x=(p-g)/v,this.y=(u-m)/v,this.z=(d-h)/v,this.w=Math.acos((c+f+x-1)/2),this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this.w=this.w<0?Math.ceil(this.w):Math.floor(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e,n){return n!==void 0&&console.warn("THREE.Vector4: offset has been removed from .fromBufferAttribute()."),this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}Jt.prototype.isVector4=!0;class Pe extends Zn{constructor(t,e,n={}){super(),this.width=t,this.height=e,this.depth=1,this.scissor=new Jt(0,0,t,e),this.scissorTest=!1,this.viewport=new Jt(0,0,t,e);const i={width:t,height:e,depth:1};this.texture=new fe(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.encoding),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=n.generateMipmaps!==void 0?n.generateMipmaps:!1,this.texture.internalFormat=n.internalFormat!==void 0?n.internalFormat:null,this.texture.minFilter=n.minFilter!==void 0?n.minFilter:Se,this.depthBuffer=n.depthBuffer!==void 0?n.depthBuffer:!0,this.stencilBuffer=n.stencilBuffer!==void 0?n.stencilBuffer:!1,this.depthTexture=n.depthTexture!==void 0?n.depthTexture:null,this.samples=n.samples!==void 0?n.samples:0}setSize(t,e,n=1){(this.width!==t||this.height!==e||this.depth!==n)&&(this.width=t,this.height=e,this.depth=n,this.texture.image.width=t,this.texture.image.height=e,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.width=t.width,this.height=t.height,this.depth=t.depth,this.viewport.copy(t.viewport),this.texture=t.texture.clone(),this.texture.isRenderTargetTexture=!0,this.texture.image=Object.assign({},t.texture.image),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}Pe.prototype.isWebGLRenderTarget=!0;class ho extends fe{constructor(t=null,e=1,n=1,i=1){super(null),this.image={data:t,width:e,height:n,depth:i},this.magFilter=de,this.minFilter=de,this.wrapR=ke,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}ho.prototype.isDataArrayTexture=!0;class ap extends Pe{constructor(t,e,n){super(t,e),this.depth=n,this.texture=new ho(null,t,e,n),this.texture.isRenderTargetTexture=!0}}ap.prototype.isWebGLArrayRenderTarget=!0;class Xa extends fe{constructor(t=null,e=1,n=1,i=1){super(null),this.image={data:t,width:e,height:n,depth:i},this.magFilter=de,this.minFilter=de,this.wrapR=ke,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}Xa.prototype.isData3DTexture=!0;class lp extends Pe{constructor(t,e,n){super(t,e),this.depth=n,this.texture=new Xa(null,t,e,n),this.texture.isRenderTargetTexture=!0}}lp.prototype.isWebGL3DRenderTarget=!0;class cp extends Pe{constructor(t,e,n,i={}){super(t,e,i);const s=this.texture;this.texture=[];for(let o=0;o<n;o++)this.texture[o]=s.clone(),this.texture[o].isRenderTargetTexture=!0}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,s=this.texture.length;i<s;i++)this.texture[i].image.width=t,this.texture[i].image.height=e,this.texture[i].image.depth=n;this.dispose()}return this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e),this}copy(t){this.dispose(),this.width=t.width,this.height=t.height,this.depth=t.depth,this.viewport.set(0,0,this.width,this.height),this.scissor.set(0,0,this.width,this.height),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.depthTexture=t.depthTexture,this.texture.length=0;for(let e=0,n=t.texture.length;e<n;e++)this.texture[e]=t.texture[e].clone();return this}}cp.prototype.isWebGLMultipleRenderTargets=!0;class Ae{constructor(t=0,e=0,n=0,i=1){this._x=t,this._y=e,this._z=n,this._w=i}static slerp(t,e,n,i){return console.warn("THREE.Quaternion: Static .slerp() has been deprecated. Use qm.slerpQuaternions( qa, qb, t ) instead."),n.slerpQuaternions(t,e,i)}static slerpFlat(t,e,n,i,s,o,a){let l=n[i+0],c=n[i+1],h=n[i+2],u=n[i+3];const d=s[o+0],f=s[o+1],g=s[o+2],m=s[o+3];if(a===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u;return}if(a===1){t[e+0]=d,t[e+1]=f,t[e+2]=g,t[e+3]=m;return}if(u!==m||l!==d||c!==f||h!==g){let p=1-a;const x=l*d+c*f+h*g+u*m,v=x>=0?1:-1,w=1-x*x;if(w>Number.EPSILON){const b=Math.sqrt(w),C=Math.atan2(b,x*v);p=Math.sin(p*C)/b,a=Math.sin(a*C)/b}const y=a*v;if(l=l*p+d*y,c=c*p+f*y,h=h*p+g*y,u=u*p+m*y,p===1-a){const b=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=b,c*=b,h*=b,u*=b}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,i,s,o){const a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],u=s[o],d=s[o+1],f=s[o+2],g=s[o+3];return t[e]=a*g+h*u+l*f-c*d,t[e+1]=l*g+h*d+c*u-a*f,t[e+2]=c*g+h*f+a*d-l*u,t[e+3]=h*g-a*u-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e){if(!(t&&t.isEuler))throw new Error("THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.");const n=t._x,i=t._y,s=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),u=a(s/2),d=l(n/2),f=l(i/2),g=l(s/2);switch(o){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e!==!1&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],s=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=n+a+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(o-i)*f}else if(n>a&&n>u){const f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(i+o)/f,this._z=(s+c)/f}else if(a>u){const f=2*Math.sqrt(1+a-n-u);this._w=(s-c)/f,this._x=(i+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-a);this._w=(o-i)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ye(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t,e){return e!==void 0?(console.warn("THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead."),this.multiplyQuaternions(t,e)):this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,s=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+i*c-s*l,this._y=i*h+o*l+s*a-n*c,this._z=s*h+o*c+n*l-i*a,this._w=o*h-n*a-i*l-s*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,s=this._z,o=this._w;let a=o*t._w+n*t._x+i*t._y+s*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=n,this._y=i,this._z=s,this;const l=1-a*a;if(l<=Number.EPSILON){const f=1-e;return this._w=f*o+e*this._w,this._x=f*n+e*this._x,this._y=f*i+e*this._y,this._z=f*s+e*this._z,this.normalize(),this._onChangeCallback(),this}const c=Math.sqrt(l),h=Math.atan2(c,a),u=Math.sin((1-e)*h)/c,d=Math.sin(e*h)/c;return this._w=o*u+this._w*d,this._x=n*u+this._x*d,this._y=i*u+this._y*d,this._z=s*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=Math.random(),e=Math.sqrt(1-t),n=Math.sqrt(t),i=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(e*Math.cos(i),n*Math.sin(s),n*Math.cos(s),e*Math.sin(i))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}}Ae.prototype.isQuaternion=!0;class T{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t,e){return e!==void 0?(console.warn("THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(t,e)):(this.x+=t.x,this.y+=t.y,this.z+=t.z,this)}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t,e){return e!==void 0?(console.warn("THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(t,e)):(this.x-=t.x,this.y-=t.y,this.z-=t.z,this)}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t,e){return e!==void 0?(console.warn("THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead."),this.multiplyVectors(t,e)):(this.x*=t.x,this.y*=t.y,this.z*=t.z,this)}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return t&&t.isEuler||console.error("THREE.Vector3: .applyEuler() now expects an Euler rotation rather than a Vector3 and order."),this.applyQuaternion(ac.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(ac.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6]*i,this.y=s[1]*e+s[4]*n+s[7]*i,this.z=s[2]*e+s[5]*n+s[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,s=t.elements,o=1/(s[3]*e+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*e+s[4]*n+s[8]*i+s[12])*o,this.y=(s[1]*e+s[5]*n+s[9]*i+s[13])*o,this.z=(s[2]*e+s[6]*n+s[10]*i+s[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,s=t.x,o=t.y,a=t.z,l=t.w,c=l*e+o*i-a*n,h=l*n+a*e-s*i,u=l*i+s*n-o*e,d=-s*e-o*n-a*i;return this.x=c*l+d*-s+h*-a-u*-o,this.y=h*l+d*-o+u*-s-c*-a,this.z=u*l+d*-a+c*-o-h*-s,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,s=t.elements;return this.x=s[0]*e+s[4]*n+s[8]*i,this.y=s[1]*e+s[5]*n+s[9]*i,this.z=s[2]*e+s[6]*n+s[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t,e){return e!==void 0?(console.warn("THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead."),this.crossVectors(t,e)):this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,s=t.z,o=e.x,a=e.y,l=e.z;return this.x=i*l-s*a,this.y=s*o-n*l,this.z=n*a-i*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Ho.copy(this).projectOnVector(t),this.sub(Ho)}reflect(t){return this.sub(Ho.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ye(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e,n){return n!==void 0&&console.warn("THREE.Vector3: offset has been removed from .fromBufferAttribute()."),this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=(Math.random()-.5)*2,e=Math.random()*Math.PI*2,n=Math.sqrt(1-t**2);return this.x=n*Math.cos(e),this.y=n*Math.sin(e),this.z=t,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}T.prototype.isVector3=!0;const Ho=new T,ac=new Ae;class We{constructor(t=new T(1/0,1/0,1/0),e=new T(-1/0,-1/0,-1/0)){this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){let e=1/0,n=1/0,i=1/0,s=-1/0,o=-1/0,a=-1/0;for(let l=0,c=t.length;l<c;l+=3){const h=t[l],u=t[l+1],d=t[l+2];h<e&&(e=h),u<n&&(n=u),d<i&&(i=d),h>s&&(s=h),u>o&&(o=u),d>a&&(a=d)}return this.min.set(e,n,i),this.max.set(s,o,a),this}setFromBufferAttribute(t){let e=1/0,n=1/0,i=1/0,s=-1/0,o=-1/0,a=-1/0;for(let l=0,c=t.count;l<c;l++){const h=t.getX(l),u=t.getY(l),d=t.getZ(l);h<e&&(e=h),u<n&&(n=u),d<i&&(i=d),h>s&&(s=h),u>o&&(o=u),d>a&&(a=d)}return this.min.set(e,n,i),this.max.set(s,o,a),this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=Dn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0)if(e&&n.attributes!=null&&n.attributes.position!==void 0){const s=n.attributes.position;for(let o=0,a=s.count;o<a;o++)Dn.fromBufferAttribute(s,o).applyMatrix4(t.matrixWorld),this.expandByPoint(Dn)}else n.boundingBox===null&&n.computeBoundingBox(),Vo.copy(n.boundingBox),Vo.applyMatrix4(t.matrixWorld),this.union(Vo);const i=t.children;for(let s=0,o=i.length;s<o;s++)this.expandByObject(i[s],e);return this}containsPoint(t){return!(t.x<this.min.x||t.x>this.max.x||t.y<this.min.y||t.y>this.max.y||t.z<this.min.z||t.z>this.max.z)}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return!(t.max.x<this.min.x||t.min.x>this.max.x||t.max.y<this.min.y||t.min.y>this.max.y||t.max.z<this.min.z||t.min.z>this.max.z)}intersectsSphere(t){return this.clampPoint(t.center,Dn),Dn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(or),$r.subVectors(this.max,or),si.subVectors(t.a,or),oi.subVectors(t.b,or),ai.subVectors(t.c,or),gn.subVectors(oi,si),xn.subVectors(ai,oi),Nn.subVectors(si,ai);let e=[0,-gn.z,gn.y,0,-xn.z,xn.y,0,-Nn.z,Nn.y,gn.z,0,-gn.x,xn.z,0,-xn.x,Nn.z,0,-Nn.x,-gn.y,gn.x,0,-xn.y,xn.x,0,-Nn.y,Nn.x,0];return!Go(e,si,oi,ai,$r)||(e=[1,0,0,0,1,0,0,0,1],!Go(e,si,oi,ai,$r))?!1:(Jr.crossVectors(gn,xn),e=[Jr.x,Jr.y,Jr.z],Go(e,si,oi,ai,$r))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return Dn.copy(t).clamp(this.min,this.max).sub(t).length()}getBoundingSphere(t){return this.getCenter(t.center),t.radius=this.getSize(Dn).length()*.5,t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(sn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),sn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),sn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),sn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),sn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),sn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),sn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),sn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(sn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}We.prototype.isBox3=!0;const sn=[new T,new T,new T,new T,new T,new T,new T,new T],Dn=new T,Vo=new We,si=new T,oi=new T,ai=new T,gn=new T,xn=new T,Nn=new T,or=new T,$r=new T,Jr=new T,Fn=new T;function Go(r,t,e,n,i){for(let s=0,o=r.length-3;s<=o;s+=3){Fn.fromArray(r,s);const a=i.x*Math.abs(Fn.x)+i.y*Math.abs(Fn.y)+i.z*Math.abs(Fn.z),l=t.dot(Fn),c=e.dot(Fn),h=n.dot(Fn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const hp=new We,lc=new T,Yr=new T,Wo=new T;class $i{constructor(t=new T,e=-1){this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):hp.setFromPoints(t).getCenter(n);let i=0;for(let s=0,o=t.length;s<o;s++)i=Math.max(i,n.distanceToSquared(t[s]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){Wo.subVectors(t,this.center);const e=Wo.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.add(Wo.multiplyScalar(i/n)),this.radius+=i}return this}union(t){return this.center.equals(t.center)===!0?Yr.set(0,0,1).multiplyScalar(t.radius):Yr.subVectors(t.center,this.center).normalize().multiplyScalar(t.radius),this.expandByPoint(lc.copy(t.center).add(Yr)),this.expandByPoint(lc.copy(t.center).sub(Yr)),this}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const on=new T,Xo=new T,Zr=new T,_n=new T,qo=new T,Kr=new T,jo=new T;class Ji{constructor(t=new T,e=new T(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.direction).multiplyScalar(t).add(this.origin)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,on)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.direction).multiplyScalar(n).add(this.origin)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=on.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(on.copy(this.direction).multiplyScalar(e).add(this.origin),on.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){Xo.copy(t).add(e).multiplyScalar(.5),Zr.copy(e).sub(t).normalize(),_n.copy(this.origin).sub(Xo);const s=t.distanceTo(e)*.5,o=-this.direction.dot(Zr),a=_n.dot(this.direction),l=-_n.dot(Zr),c=_n.lengthSq(),h=Math.abs(1-o*o);let u,d,f,g;if(h>0)if(u=o*l-a,d=o*a-l,g=s*h,u>=0)if(d>=-g)if(d<=g){const m=1/h;u*=m,d*=m,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-o*s+a)),d=u>0?-s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(u=Math.max(0,-(o*s+a)),d=u>0?s:Math.min(Math.max(-s,-l),s),f=-u*u+d*(d+2*l)+c);else d=o>0?-s:s,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.direction).multiplyScalar(u).add(this.origin),i&&i.copy(Zr).multiplyScalar(d).add(Xo),f}intersectSphere(t,e){on.subVectors(t.center,this.origin);const n=on.dot(this.direction),i=on.dot(on)-n*n,s=t.radius*t.radius;if(i>s)return null;const o=Math.sqrt(s-i),a=n-o,l=n+o;return a<0&&l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,s,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,i=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,i=(t.min.x-d.x)*c),h>=0?(s=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(s=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),n>o||s>i||((s>n||n!==n)&&(n=s),(o<i||i!==i)&&(i=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,on)!==null}intersectTriangle(t,e,n,i,s){qo.subVectors(e,t),Kr.subVectors(n,t),jo.crossVectors(qo,Kr);let o=this.direction.dot(jo),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;_n.subVectors(this.origin,t);const l=a*this.direction.dot(Kr.crossVectors(_n,Kr));if(l<0)return null;const c=a*this.direction.dot(qo.cross(_n));if(c<0||l+c>o)return null;const h=-a*_n.dot(jo);return h<0?null:this.at(h/o,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Mt{constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],arguments.length>0&&console.error("THREE.Matrix4: the constructor no longer reads arguments. use .set() instead.")}set(t,e,n,i,s,o,a,l,c,h,u,d,f,g,m,p){const x=this.elements;return x[0]=t,x[4]=e,x[8]=n,x[12]=i,x[1]=s,x[5]=o,x[9]=a,x[13]=l,x[2]=c,x[6]=h,x[10]=u,x[14]=d,x[3]=f,x[7]=g,x[11]=m,x[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Mt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/li.setFromMatrixColumn(t,0).length(),s=1/li.setFromMatrixColumn(t,1).length(),o=1/li.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*s,e[5]=n[5]*s,e[6]=n[6]*s,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){t&&t.isEuler||console.error("THREE.Matrix4: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.");const e=this.elements,n=t.x,i=t.y,s=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(s),u=Math.sin(s);if(t.order==="XYZ"){const d=o*h,f=o*u,g=a*h,m=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=f+g*c,e[5]=d-m*c,e[9]=-a*l,e[2]=m-d*c,e[6]=g+f*c,e[10]=o*l}else if(t.order==="YXZ"){const d=l*h,f=l*u,g=c*h,m=c*u;e[0]=d+m*a,e[4]=g*a-f,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-g,e[6]=m+d*a,e[10]=o*l}else if(t.order==="ZXY"){const d=l*h,f=l*u,g=c*h,m=c*u;e[0]=d-m*a,e[4]=-o*u,e[8]=g+f*a,e[1]=f+g*a,e[5]=o*h,e[9]=m-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const d=o*h,f=o*u,g=a*h,m=a*u;e[0]=l*h,e[4]=g*c-f,e[8]=d*c+m,e[1]=l*u,e[5]=m*c+d,e[9]=f*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const d=o*l,f=o*c,g=a*l,m=a*c;e[0]=l*h,e[4]=m-d*u,e[8]=g*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*u+g,e[10]=d-m*u}else if(t.order==="XZY"){const d=o*l,f=o*c,g=a*l,m=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+m,e[5]=o*h,e[9]=f*u-g,e[2]=g*u-f,e[6]=a*h,e[10]=m*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(up,t,dp)}lookAt(t,e,n){const i=this.elements;return Le.subVectors(t,e),Le.lengthSq()===0&&(Le.z=1),Le.normalize(),vn.crossVectors(n,Le),vn.lengthSq()===0&&(Math.abs(n.z)===1?Le.x+=1e-4:Le.z+=1e-4,Le.normalize(),vn.crossVectors(n,Le)),vn.normalize(),Qr.crossVectors(Le,vn),i[0]=vn.x,i[4]=Qr.x,i[8]=Le.x,i[1]=vn.y,i[5]=Qr.y,i[9]=Le.y,i[2]=vn.z,i[6]=Qr.z,i[10]=Le.z,this}multiply(t,e){return e!==void 0?(console.warn("THREE.Matrix4: .multiply() now only accepts one argument. Use .multiplyMatrices( a, b ) instead."),this.multiplyMatrices(t,e)):this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],m=n[6],p=n[10],x=n[14],v=n[3],w=n[7],y=n[11],b=n[15],C=i[0],R=i[4],D=i[8],V=i[12],F=i[1],_=i[5],A=i[9],j=i[13],I=i[2],z=i[6],B=i[10],k=i[14],P=i[3],X=i[7],Y=i[11],Q=i[15];return s[0]=o*C+a*F+l*I+c*P,s[4]=o*R+a*_+l*z+c*X,s[8]=o*D+a*A+l*B+c*Y,s[12]=o*V+a*j+l*k+c*Q,s[1]=h*C+u*F+d*I+f*P,s[5]=h*R+u*_+d*z+f*X,s[9]=h*D+u*A+d*B+f*Y,s[13]=h*V+u*j+d*k+f*Q,s[2]=g*C+m*F+p*I+x*P,s[6]=g*R+m*_+p*z+x*X,s[10]=g*D+m*A+p*B+x*Y,s[14]=g*V+m*j+p*k+x*Q,s[3]=v*C+w*F+y*I+b*P,s[7]=v*R+w*_+y*z+b*X,s[11]=v*D+w*A+y*B+b*Y,s[15]=v*V+w*j+y*k+b*Q,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],s=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],f=t[14],g=t[3],m=t[7],p=t[11],x=t[15];return g*(+s*l*u-i*c*u-s*a*d+n*c*d+i*a*f-n*l*f)+m*(+e*l*f-e*c*d+s*o*d-i*o*f+i*c*h-s*l*h)+p*(+e*c*u-e*a*f-s*o*u+n*o*f+s*a*h-n*c*h)+x*(-i*a*h-e*l*u+e*a*d+i*o*u-n*o*d+n*l*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],f=t[11],g=t[12],m=t[13],p=t[14],x=t[15],v=u*p*c-m*d*c+m*l*f-a*p*f-u*l*x+a*d*x,w=g*d*c-h*p*c-g*l*f+o*p*f+h*l*x-o*d*x,y=h*m*c-g*u*c+g*a*f-o*m*f-h*a*x+o*u*x,b=g*u*l-h*m*l-g*a*d+o*m*d+h*a*p-o*u*p,C=e*v+n*w+i*y+s*b;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/C;return t[0]=v*R,t[1]=(m*d*s-u*p*s-m*i*f+n*p*f+u*i*x-n*d*x)*R,t[2]=(a*p*s-m*l*s+m*i*c-n*p*c-a*i*x+n*l*x)*R,t[3]=(u*l*s-a*d*s-u*i*c+n*d*c+a*i*f-n*l*f)*R,t[4]=w*R,t[5]=(h*p*s-g*d*s+g*i*f-e*p*f-h*i*x+e*d*x)*R,t[6]=(g*l*s-o*p*s-g*i*c+e*p*c+o*i*x-e*l*x)*R,t[7]=(o*d*s-h*l*s+h*i*c-e*d*c-o*i*f+e*l*f)*R,t[8]=y*R,t[9]=(g*u*s-h*m*s-g*n*f+e*m*f+h*n*x-e*u*x)*R,t[10]=(o*m*s-g*a*s+g*n*c-e*m*c-o*n*x+e*a*x)*R,t[11]=(h*a*s-o*u*s-h*n*c+e*u*c+o*n*f-e*a*f)*R,t[12]=b*R,t[13]=(h*m*i-g*u*i+g*n*d-e*m*d-h*n*p+e*u*p)*R,t[14]=(g*a*i-o*m*i-g*n*l+e*m*l+o*n*p-e*a*p)*R,t[15]=(o*u*i-h*a*i+h*n*l-e*u*l-o*n*d+e*a*d)*R,this}scale(t){const e=this.elements,n=t.x,i=t.y,s=t.z;return e[0]*=n,e[4]*=i,e[8]*=s,e[1]*=n,e[5]*=i,e[9]*=s,e[2]*=n,e[6]*=i,e[10]*=s,e[3]*=n,e[7]*=i,e[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),s=1-n,o=t.x,a=t.y,l=t.z,c=s*o,h=s*a;return this.set(c*o+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*o,0,c*l-i*a,h*l+i*o,s*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,s,o){return this.set(1,n,s,0,t,1,o,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,s=e._x,o=e._y,a=e._z,l=e._w,c=s+s,h=o+o,u=a+a,d=s*c,f=s*h,g=s*u,m=o*h,p=o*u,x=a*u,v=l*c,w=l*h,y=l*u,b=n.x,C=n.y,R=n.z;return i[0]=(1-(m+x))*b,i[1]=(f+y)*b,i[2]=(g-w)*b,i[3]=0,i[4]=(f-y)*C,i[5]=(1-(d+x))*C,i[6]=(p+v)*C,i[7]=0,i[8]=(g+w)*R,i[9]=(p-v)*R,i[10]=(1-(d+m))*R,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let s=li.set(i[0],i[1],i[2]).length();const o=li.set(i[4],i[5],i[6]).length(),a=li.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),t.x=i[12],t.y=i[13],t.z=i[14],Oe.copy(this);const c=1/s,h=1/o,u=1/a;return Oe.elements[0]*=c,Oe.elements[1]*=c,Oe.elements[2]*=c,Oe.elements[4]*=h,Oe.elements[5]*=h,Oe.elements[6]*=h,Oe.elements[8]*=u,Oe.elements[9]*=u,Oe.elements[10]*=u,e.setFromRotationMatrix(Oe),n.x=s,n.y=o,n.z=a,this}makePerspective(t,e,n,i,s,o){o===void 0&&console.warn("THREE.Matrix4: .makePerspective() has been redefined and has a new signature. Please check the docs.");const a=this.elements,l=2*s/(e-t),c=2*s/(n-i),h=(e+t)/(e-t),u=(n+i)/(n-i),d=-(o+s)/(o-s),f=-2*o*s/(o-s);return a[0]=l,a[4]=0,a[8]=h,a[12]=0,a[1]=0,a[5]=c,a[9]=u,a[13]=0,a[2]=0,a[6]=0,a[10]=d,a[14]=f,a[3]=0,a[7]=0,a[11]=-1,a[15]=0,this}makeOrthographic(t,e,n,i,s,o){const a=this.elements,l=1/(e-t),c=1/(n-i),h=1/(o-s),u=(e+t)*l,d=(n+i)*c,f=(o+s)*h;return a[0]=2*l,a[4]=0,a[8]=0,a[12]=-u,a[1]=0,a[5]=2*c,a[9]=0,a[13]=-d,a[2]=0,a[6]=0,a[10]=-2*h,a[14]=-f,a[3]=0,a[7]=0,a[11]=0,a[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}Mt.prototype.isMatrix4=!0;const li=new T,Oe=new Mt,up=new T(0,0,0),dp=new T(1,1,1),vn=new T,Qr=new T,Le=new T,cc=new Mt,hc=new Ae;class Qn{constructor(t=0,e=0,n=0,i=Qn.DefaultOrder){this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,s=i[0],o=i[4],a=i[8],l=i[1],c=i[5],h=i[9],u=i[2],d=i[6],f=i[10];switch(e){case"XYZ":this._y=Math.asin(ye(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ye(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,s),this._z=0);break;case"ZXY":this._x=Math.asin(ye(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-ye(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(ye(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-ye(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return cc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(cc,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return hc.setFromEuler(this),this.setFromQuaternion(hc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}}Qn.prototype.isEuler=!0;Qn.DefaultOrder="XYZ";Qn.RotationOrders=["XYZ","YZX","ZXY","XZY","YXZ","ZYX"];class $h{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let fp=0;const uc=new T,ci=new Ae,an=new Mt,ts=new T,ar=new T,pp=new T,mp=new Ae,dc=new T(1,0,0),fc=new T(0,1,0),pc=new T(0,0,1),gp={type:"added"},mc={type:"removed"};class $t extends Zn{constructor(){super(),Object.defineProperty(this,"id",{value:fp++}),this.uuid=tn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=$t.DefaultUp.clone();const t=new T,e=new Qn,n=new Ae,i=new T(1,1,1);function s(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Mt},normalMatrix:{value:new me}}),this.matrix=new Mt,this.matrixWorld=new Mt,this.matrixAutoUpdate=$t.DefaultMatrixAutoUpdate,this.matrixWorldNeedsUpdate=!1,this.layers=new $h,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return ci.setFromAxisAngle(t,e),this.quaternion.multiply(ci),this}rotateOnWorldAxis(t,e){return ci.setFromAxisAngle(t,e),this.quaternion.premultiply(ci),this}rotateX(t){return this.rotateOnAxis(dc,t)}rotateY(t){return this.rotateOnAxis(fc,t)}rotateZ(t){return this.rotateOnAxis(pc,t)}translateOnAxis(t,e){return uc.copy(t).applyQuaternion(this.quaternion),this.position.add(uc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(dc,t)}translateY(t){return this.translateOnAxis(fc,t)}translateZ(t){return this.translateOnAxis(pc,t)}localToWorld(t){return t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return t.applyMatrix4(an.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?ts.copy(t):ts.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),ar.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?an.lookAt(ar,ts,this.up):an.lookAt(ts,ar,this.up),this.quaternion.setFromRotationMatrix(an),i&&(an.extractRotation(i.matrixWorld),ci.setFromRotationMatrix(an),this.quaternion.premultiply(ci.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.parent!==null&&t.parent.remove(t),t.parent=this,this.children.push(t),t.dispatchEvent(gp)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(mc)),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){for(let t=0;t<this.children.length;t++){const e=this.children[t];e.parent=null,e.dispatchEvent(mc)}return this.children.length=0,this}attach(t){return this.updateWorldMatrix(!0,!1),an.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),an.multiply(t.parent.matrixWorld)),t.applyMatrix4(an),this.add(t),t.updateWorldMatrix(!1,!0),this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ar,t,pp),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ar,mp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),e===!0){const i=this.children;for(let s=0,o=i.length;s<o;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.5,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),JSON.stringify(this.userData)!=="{}"&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];s(t.shapes,u)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(t.materials,this.material[l]));i.material=a}else i.material=s(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(s(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=i,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}$t.DefaultUp=new T(0,1,0);$t.DefaultMatrixAutoUpdate=!0;$t.prototype.isObject3D=!0;const ze=new T,ln=new T,$o=new T,cn=new T,hi=new T,ui=new T,gc=new T,Jo=new T,Yo=new T,Zo=new T;class ae{constructor(t=new T,e=new T,n=new T){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),ze.subVectors(t,e),i.cross(ze);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(t,e,n,i,s){ze.subVectors(i,e),ln.subVectors(n,e),$o.subVectors(t,e);const o=ze.dot(ze),a=ze.dot(ln),l=ze.dot($o),c=ln.dot(ln),h=ln.dot($o),u=o*c-a*a;if(u===0)return s.set(-2,-1,-1);const d=1/u,f=(c*l-a*h)*d,g=(o*h-a*l)*d;return s.set(1-f-g,g,f)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,cn),cn.x>=0&&cn.y>=0&&cn.x+cn.y<=1}static getUV(t,e,n,i,s,o,a,l){return this.getBarycoord(t,e,n,i,cn),l.set(0,0),l.addScaledVector(s,cn.x),l.addScaledVector(o,cn.y),l.addScaledVector(a,cn.z),l}static isFrontFacing(t,e,n,i){return ze.subVectors(n,e),ln.subVectors(t,e),ze.cross(ln).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ze.subVectors(this.c,this.b),ln.subVectors(this.a,this.b),ze.cross(ln).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ae.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return ae.getBarycoord(t,this.a,this.b,this.c,e)}getUV(t,e,n,i,s){return ae.getUV(t,this.a,this.b,this.c,e,n,i,s)}containsPoint(t){return ae.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ae.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,s=this.c;let o,a;hi.subVectors(i,n),ui.subVectors(s,n),Jo.subVectors(t,n);const l=hi.dot(Jo),c=ui.dot(Jo);if(l<=0&&c<=0)return e.copy(n);Yo.subVectors(t,i);const h=hi.dot(Yo),u=ui.dot(Yo);if(h>=0&&u<=h)return e.copy(i);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),e.copy(n).addScaledVector(hi,o);Zo.subVectors(t,s);const f=hi.dot(Zo),g=ui.dot(Zo);if(g>=0&&f<=g)return e.copy(s);const m=f*c-l*g;if(m<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(n).addScaledVector(ui,a);const p=h*g-f*u;if(p<=0&&u-h>=0&&f-g>=0)return gc.subVectors(s,i),a=(u-h)/(u-h+(f-g)),e.copy(i).addScaledVector(gc,a);const x=1/(p+m+d);return o=m*x,a=d*x,e.copy(n).addScaledVector(hi,o).addScaledVector(ui,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}let xp=0;class he extends Zn{constructor(){super(),Object.defineProperty(this,"id",{value:xp++}),this.uuid=tn(),this.name="",this.type="Material",this.fog=!0,this.blending=Ri,this.side=br,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.blendSrc=Hh,this.blendDst=Vh,this.blendEquation=bi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.depthFunc=ba,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=rp,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Fo,this.stencilZFail=Fo,this.stencilZPass=Fo,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn("THREE.Material: '"+e+"' parameter is undefined.");continue}if(e==="shading"){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=n===kh;continue}const i=this[e];if(i===void 0){console.warn("THREE."+this.type+": '"+e+"' is not a property of this material.");continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.5,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ri&&(n.blending=this.blending),this.side!==br&&(n.side=this.side),this.vertexColors&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=this.transparent),n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.stencilWrite=this.stencilWrite,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaToCoverage===!0&&(n.alphaToCoverage=this.alphaToCoverage),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=this.premultipliedAlpha),this.wireframe===!0&&(n.wireframe=this.wireframe),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=this.flatShading),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),JSON.stringify(this.userData)!=="{}"&&(n.userData=this.userData);function i(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(e){const s=i(t.textures),o=i(t.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.fog=t.fog,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=e[s].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}he.prototype.isMaterial=!0;he.fromType=function(){return null};class uo extends he{constructor(t){super(),this.type="MeshBasicMaterial",this.color=new vt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=ao,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this}}uo.prototype.isMeshBasicMaterial=!0;const oe=new T,es=new et;class ce{constructor(t,e,n){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n===!0,this.usage=Sr,this.updateRange={offset:0,count:-1},this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}copyColorsArray(t){const e=this.array;let n=0;for(let i=0,s=t.length;i<s;i++){let o=t[i];o===void 0&&(console.warn("THREE.BufferAttribute.copyColorsArray(): color is undefined",i),o=new vt),e[n++]=o.r,e[n++]=o.g,e[n++]=o.b}return this}copyVector2sArray(t){const e=this.array;let n=0;for(let i=0,s=t.length;i<s;i++){let o=t[i];o===void 0&&(console.warn("THREE.BufferAttribute.copyVector2sArray(): vector is undefined",i),o=new et),e[n++]=o.x,e[n++]=o.y}return this}copyVector3sArray(t){const e=this.array;let n=0;for(let i=0,s=t.length;i<s;i++){let o=t[i];o===void 0&&(console.warn("THREE.BufferAttribute.copyVector3sArray(): vector is undefined",i),o=new T),e[n++]=o.x,e[n++]=o.y,e[n++]=o.z}return this}copyVector4sArray(t){const e=this.array;let n=0;for(let i=0,s=t.length;i<s;i++){let o=t[i];o===void 0&&(console.warn("THREE.BufferAttribute.copyVector4sArray(): vector is undefined",i),o=new Jt),e[n++]=o.x,e[n++]=o.y,e[n++]=o.z,e[n++]=o.w}return this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)es.fromBufferAttribute(this,e),es.applyMatrix3(t),this.setXY(e,es.x,es.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)oe.fromBufferAttribute(this,e),oe.applyMatrix3(t),this.setXYZ(e,oe.x,oe.y,oe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)oe.fromBufferAttribute(this,e),oe.applyMatrix4(t),this.setXYZ(e,oe.x,oe.y,oe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)oe.fromBufferAttribute(this,e),oe.applyNormalMatrix(t),this.setXYZ(e,oe.x,oe.y,oe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)oe.fromBufferAttribute(this,e),oe.transformDirection(t),this.setXYZ(e,oe.x,oe.y,oe.z);return this}set(t,e=0){return this.array.set(t,e),this}getX(t){return this.array[t*this.itemSize]}setX(t,e){return this.array[t*this.itemSize]=e,this}getY(t){return this.array[t*this.itemSize+1]}setY(t,e){return this.array[t*this.itemSize+1]=e,this}getZ(t){return this.array[t*this.itemSize+2]}setZ(t,e){return this.array[t*this.itemSize+2]=e,this}getW(t){return this.array[t*this.itemSize+3]}setW(t,e){return this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,s){return t*=this.itemSize,this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.prototype.slice.call(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Sr&&(t.usage=this.usage),(this.updateRange.offset!==0||this.updateRange.count!==-1)&&(t.updateRange=this.updateRange),t}}ce.prototype.isBufferAttribute=!0;class Jh extends ce{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class Yh extends ce{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class _p extends ce{constructor(t,e,n){super(new Uint16Array(t),e,n)}}_p.prototype.isFloat16BufferAttribute=!0;class Zt extends ce{constructor(t,e,n){super(new Float32Array(t),e,n)}}let vp=0;const Ie=new Mt,Ko=new $t,di=new T,Re=new We,lr=new We,ue=new T;class Kt extends Zn{constructor(){super(),Object.defineProperty(this,"id",{value:vp++}),this.uuid=tn(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Xh(t)?Yh:Jh)(t,1):this.index=t,this}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new me().getNormalMatrix(t);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Ie.makeRotationFromQuaternion(t),this.applyMatrix4(Ie),this}rotateX(t){return Ie.makeRotationX(t),this.applyMatrix4(Ie),this}rotateY(t){return Ie.makeRotationY(t),this.applyMatrix4(Ie),this}rotateZ(t){return Ie.makeRotationZ(t),this.applyMatrix4(Ie),this}translate(t,e,n){return Ie.makeTranslation(t,e,n),this.applyMatrix4(Ie),this}scale(t,e,n){return Ie.makeScale(t,e,n),this.applyMatrix4(Ie),this}lookAt(t){return Ko.lookAt(t),Ko.updateMatrix(),this.applyMatrix4(Ko.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(di).negate(),this.translate(di.x,di.y,di.z),this}setFromPoints(t){const e=[];for(let n=0,i=t.length;n<i;n++){const s=t[n];e.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new Zt(e,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new We);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new T(-1/0,-1/0,-1/0),new T(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const s=e[n];Re.setFromBufferAttribute(s),this.morphTargetsRelative?(ue.addVectors(this.boundingBox.min,Re.min),this.boundingBox.expandByPoint(ue),ue.addVectors(this.boundingBox.max,Re.max),this.boundingBox.expandByPoint(ue)):(this.boundingBox.expandByPoint(Re.min),this.boundingBox.expandByPoint(Re.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new $i);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new T,1/0);return}if(t){const n=this.boundingSphere.center;if(Re.setFromBufferAttribute(t),e)for(let s=0,o=e.length;s<o;s++){const a=e[s];lr.setFromBufferAttribute(a),this.morphTargetsRelative?(ue.addVectors(Re.min,lr.min),Re.expandByPoint(ue),ue.addVectors(Re.max,lr.max),Re.expandByPoint(ue)):(Re.expandByPoint(lr.min),Re.expandByPoint(lr.max))}Re.getCenter(n);let i=0;for(let s=0,o=t.count;s<o;s++)ue.fromBufferAttribute(t,s),i=Math.max(i,n.distanceToSquared(ue));if(e)for(let s=0,o=e.length;s<o;s++){const a=e[s],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)ue.fromBufferAttribute(a,c),l&&(di.fromBufferAttribute(t,c),ue.add(di)),i=Math.max(i,n.distanceToSquared(ue))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.array,i=e.position.array,s=e.normal.array,o=e.uv.array,a=i.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ce(new Float32Array(4*a),4));const l=this.getAttribute("tangent").array,c=[],h=[];for(let F=0;F<a;F++)c[F]=new T,h[F]=new T;const u=new T,d=new T,f=new T,g=new et,m=new et,p=new et,x=new T,v=new T;function w(F,_,A){u.fromArray(i,F*3),d.fromArray(i,_*3),f.fromArray(i,A*3),g.fromArray(o,F*2),m.fromArray(o,_*2),p.fromArray(o,A*2),d.sub(u),f.sub(u),m.sub(g),p.sub(g);const j=1/(m.x*p.y-p.x*m.y);!isFinite(j)||(x.copy(d).multiplyScalar(p.y).addScaledVector(f,-m.y).multiplyScalar(j),v.copy(f).multiplyScalar(m.x).addScaledVector(d,-p.x).multiplyScalar(j),c[F].add(x),c[_].add(x),c[A].add(x),h[F].add(v),h[_].add(v),h[A].add(v))}let y=this.groups;y.length===0&&(y=[{start:0,count:n.length}]);for(let F=0,_=y.length;F<_;++F){const A=y[F],j=A.start,I=A.count;for(let z=j,B=j+I;z<B;z+=3)w(n[z+0],n[z+1],n[z+2])}const b=new T,C=new T,R=new T,D=new T;function V(F){R.fromArray(s,F*3),D.copy(R);const _=c[F];b.copy(_),b.sub(R.multiplyScalar(R.dot(_))).normalize(),C.crossVectors(D,_);const j=C.dot(h[F])<0?-1:1;l[F*4]=b.x,l[F*4+1]=b.y,l[F*4+2]=b.z,l[F*4+3]=j}for(let F=0,_=y.length;F<_;++F){const A=y[F],j=A.start,I=A.count;for(let z=j,B=j+I;z<B;z+=3)V(n[z+0]),V(n[z+1]),V(n[z+2])}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new ce(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const i=new T,s=new T,o=new T,a=new T,l=new T,c=new T,h=new T,u=new T;if(t)for(let d=0,f=t.count;d<f;d+=3){const g=t.getX(d+0),m=t.getX(d+1),p=t.getX(d+2);i.fromBufferAttribute(e,g),s.fromBufferAttribute(e,m),o.fromBufferAttribute(e,p),h.subVectors(o,s),u.subVectors(i,s),h.cross(u),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,m),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(m,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)i.fromBufferAttribute(e,d+0),s.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,s),u.subVectors(i,s),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}merge(t,e){if(!(t&&t.isBufferGeometry)){console.error("THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.",t);return}e===void 0&&(e=0,console.warn("THREE.BufferGeometry.merge(): Overwriting original geometry, starting at offset=0. Use BufferGeometryUtils.mergeBufferGeometries() for lossless merge."));const n=this.attributes;for(const i in n){if(t.attributes[i]===void 0)continue;const o=n[i].array,a=t.attributes[i],l=a.array,c=a.itemSize*e,h=Math.min(l.length,o.length-c);for(let u=0,d=c;u<h;u++,d++)o[d]=l[u]}return this}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)ue.fromBufferAttribute(t,e),ue.normalize(),t.setXYZ(e,ue.x,ue.y,ue.z)}toNonIndexed(){function t(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let f=0,g=0;for(let m=0,p=l.length;m<p;m++){a.isInterleavedBufferAttribute?f=l[m]*a.data.stride+a.offset:f=l[m]*h;for(let x=0;x<h;x++)d[g++]=c[f++]}return new ce(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Kt,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=t(l,n);e.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=t(d,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.5,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(t.data))}h.length>0&&(i[l]=h,s=!0)}s&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(e))}const s=t.morphAttributes;for(const c in s){const h=[],u=s[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,t.parameters!==void 0&&(this.parameters=Object.assign({},t.parameters)),this}dispose(){this.dispatchEvent({type:"dispose"})}}Kt.prototype.isBufferGeometry=!0;const xc=new Mt,fi=new Ji,Qo=new $i,yn=new T,Mn=new T,bn=new T,ta=new T,ea=new T,na=new T,ns=new T,is=new T,rs=new T,ss=new et,os=new et,as=new et,ia=new T,ls=new T;class Te extends $t{constructor(t=new Kt,e=new uo){super(),this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t){return super.copy(t),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=t.material,this.geometry=t.geometry,this}updateMorphTargets(){const t=this.geometry;if(t.isBufferGeometry){const e=t.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}else{const e=t.morphTargets;e!==void 0&&e.length>0&&console.error("THREE.Mesh.updateMorphTargets() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}}raycast(t,e){const n=this.geometry,i=this.material,s=this.matrixWorld;if(i===void 0||(n.boundingSphere===null&&n.computeBoundingSphere(),Qo.copy(n.boundingSphere),Qo.applyMatrix4(s),t.ray.intersectsSphere(Qo)===!1)||(xc.copy(s).invert(),fi.copy(t.ray).applyMatrix4(xc),n.boundingBox!==null&&fi.intersectsBox(n.boundingBox)===!1))return;let o;if(n.isBufferGeometry){const a=n.index,l=n.attributes.position,c=n.morphAttributes.position,h=n.morphTargetsRelative,u=n.attributes.uv,d=n.attributes.uv2,f=n.groups,g=n.drawRange;if(a!==null)if(Array.isArray(i))for(let m=0,p=f.length;m<p;m++){const x=f[m],v=i[x.materialIndex],w=Math.max(x.start,g.start),y=Math.min(a.count,Math.min(x.start+x.count,g.start+g.count));for(let b=w,C=y;b<C;b+=3){const R=a.getX(b),D=a.getX(b+1),V=a.getX(b+2);o=cs(this,v,t,fi,l,c,h,u,d,R,D,V),o&&(o.faceIndex=Math.floor(b/3),o.face.materialIndex=x.materialIndex,e.push(o))}}else{const m=Math.max(0,g.start),p=Math.min(a.count,g.start+g.count);for(let x=m,v=p;x<v;x+=3){const w=a.getX(x),y=a.getX(x+1),b=a.getX(x+2);o=cs(this,i,t,fi,l,c,h,u,d,w,y,b),o&&(o.faceIndex=Math.floor(x/3),e.push(o))}}else if(l!==void 0)if(Array.isArray(i))for(let m=0,p=f.length;m<p;m++){const x=f[m],v=i[x.materialIndex],w=Math.max(x.start,g.start),y=Math.min(l.count,Math.min(x.start+x.count,g.start+g.count));for(let b=w,C=y;b<C;b+=3){const R=b,D=b+1,V=b+2;o=cs(this,v,t,fi,l,c,h,u,d,R,D,V),o&&(o.faceIndex=Math.floor(b/3),o.face.materialIndex=x.materialIndex,e.push(o))}}else{const m=Math.max(0,g.start),p=Math.min(l.count,g.start+g.count);for(let x=m,v=p;x<v;x+=3){const w=x,y=x+1,b=x+2;o=cs(this,i,t,fi,l,c,h,u,d,w,y,b),o&&(o.faceIndex=Math.floor(x/3),e.push(o))}}}else n.isGeometry&&console.error("THREE.Mesh.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}}Te.prototype.isMesh=!0;function yp(r,t,e,n,i,s,o,a){let l;if(t.side===Ve?l=n.intersectTriangle(o,s,i,!0,a):l=n.intersectTriangle(i,s,o,t.side!==ki,a),l===null)return null;ls.copy(a),ls.applyMatrix4(r.matrixWorld);const c=e.ray.origin.distanceTo(ls);return c<e.near||c>e.far?null:{distance:c,point:ls.clone(),object:r}}function cs(r,t,e,n,i,s,o,a,l,c,h,u){yn.fromBufferAttribute(i,c),Mn.fromBufferAttribute(i,h),bn.fromBufferAttribute(i,u);const d=r.morphTargetInfluences;if(s&&d){ns.set(0,0,0),is.set(0,0,0),rs.set(0,0,0);for(let g=0,m=s.length;g<m;g++){const p=d[g],x=s[g];p!==0&&(ta.fromBufferAttribute(x,c),ea.fromBufferAttribute(x,h),na.fromBufferAttribute(x,u),o?(ns.addScaledVector(ta,p),is.addScaledVector(ea,p),rs.addScaledVector(na,p)):(ns.addScaledVector(ta.sub(yn),p),is.addScaledVector(ea.sub(Mn),p),rs.addScaledVector(na.sub(bn),p)))}yn.add(ns),Mn.add(is),bn.add(rs)}r.isSkinnedMesh&&(r.boneTransform(c,yn),r.boneTransform(h,Mn),r.boneTransform(u,bn));const f=yp(r,t,e,n,yn,Mn,bn,ia);if(f){a&&(ss.fromBufferAttribute(a,c),os.fromBufferAttribute(a,h),as.fromBufferAttribute(a,u),f.uv=ae.getUV(ia,yn,Mn,bn,ss,os,as,new et)),l&&(ss.fromBufferAttribute(l,c),os.fromBufferAttribute(l,h),as.fromBufferAttribute(l,u),f.uv2=ae.getUV(ia,yn,Mn,bn,ss,os,as,new et));const g={a:c,b:h,c:u,normal:new T,materialIndex:0};ae.getNormal(yn,Mn,bn,g.normal),f.face=g}return f}class zr extends Kt{constructor(t=1,e=1,n=1,i=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:s,depthSegments:o};const a=this;i=Math.floor(i),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,f=0;g("z","y","x",-1,-1,n,e,t,o,s,0),g("z","y","x",1,-1,n,e,-t,o,s,1),g("x","z","y",1,1,t,n,e,i,o,2),g("x","z","y",1,-1,t,n,-e,i,o,3),g("x","y","z",1,-1,t,e,n,i,s,4),g("x","y","z",-1,-1,t,e,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Zt(c,3)),this.setAttribute("normal",new Zt(h,3)),this.setAttribute("uv",new Zt(u,2));function g(m,p,x,v,w,y,b,C,R,D,V){const F=y/R,_=b/D,A=y/2,j=b/2,I=C/2,z=R+1,B=D+1;let k=0,P=0;const X=new T;for(let Y=0;Y<B;Y++){const Q=Y*_-j;for(let K=0;K<z;K++){const at=K*F-A;X[m]=at*v,X[p]=Q*w,X[x]=I,c.push(X.x,X.y,X.z),X[m]=0,X[p]=0,X[x]=C>0?1:-1,h.push(X.x,X.y,X.z),u.push(K/R),u.push(1-Y/D),k+=1}}for(let Y=0;Y<D;Y++)for(let Q=0;Q<R;Q++){const K=d+Q+z*Y,at=d+Q+z*(Y+1),bt=d+(Q+1)+z*(Y+1),xt=d+(Q+1)+z*Y;l.push(K,at,xt),l.push(at,bt,xt),P+=6}a.addGroup(f,P,V),f+=P,d+=k}}static fromJSON(t){return new zr(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Wi(r){const t={};for(const e in r){t[e]={};for(const n in r[e]){const i=r[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function _e(r){const t={};for(let e=0;e<r.length;e++){const n=Wi(r[e]);for(const i in n)t[i]=n[i]}return t}const Mp={clone:Wi,merge:_e};var bp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,wp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ge extends he{constructor(t){super(),this.type="ShaderMaterial",this.defines={},this.uniforms={},this.vertexShader=bp,this.fragmentShader=wp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv2:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&(t.attributes!==void 0&&console.error("THREE.ShaderMaterial: attributes should now be defined in THREE.BufferGeometry instead."),this.setValues(t))}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Wi(t.uniforms),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?e.uniforms[i]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[i]={type:"m4",value:o.toArray()}:e.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}Ge.prototype.isShaderMaterial=!0;class qa extends $t{constructor(){super(),this.type="Camera",this.matrixWorldInverse=new Mt,this.projectionMatrix=new Mt,this.projectionMatrixInverse=new Mt}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(-e[8],-e[9],-e[10]).normalize()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}qa.prototype.isCamera=!0;class Ee extends qa{constructor(t=50,e=1,n=.1,i=2e3){super(),this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Ca*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Bo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Ca*2*Math.atan(Math.tan(Bo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(t,e,n,i,s,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Bo*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,s=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*i/l,e-=o.offsetY*n/c,i*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,e,e-n,t,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}Ee.prototype.isPerspectiveCamera=!0;const pi=90,mi=1;class ja extends $t{constructor(t,e,n){if(super(),this.type="CubeCamera",n.isWebGLCubeRenderTarget!==!0){console.error("THREE.CubeCamera: The constructor now expects an instance of WebGLCubeRenderTarget as third parameter.");return}this.renderTarget=n;const i=new Ee(pi,mi,t,e);i.layers=this.layers,i.up.set(0,-1,0),i.lookAt(new T(1,0,0)),this.add(i);const s=new Ee(pi,mi,t,e);s.layers=this.layers,s.up.set(0,-1,0),s.lookAt(new T(-1,0,0)),this.add(s);const o=new Ee(pi,mi,t,e);o.layers=this.layers,o.up.set(0,0,1),o.lookAt(new T(0,1,0)),this.add(o);const a=new Ee(pi,mi,t,e);a.layers=this.layers,a.up.set(0,0,-1),a.lookAt(new T(0,-1,0)),this.add(a);const l=new Ee(pi,mi,t,e);l.layers=this.layers,l.up.set(0,-1,0),l.lookAt(new T(0,0,1)),this.add(l);const c=new Ee(pi,mi,t,e);c.layers=this.layers,c.up.set(0,-1,0),c.lookAt(new T(0,0,-1)),this.add(c)}update(t,e){this.parent===null&&this.updateMatrixWorld();const n=this.renderTarget,[i,s,o,a,l,c]=this.children,h=t.getRenderTarget(),u=t.outputEncoding,d=t.toneMapping,f=t.xr.enabled;t.outputEncoding=pn,t.toneMapping=fn,t.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0),t.render(e,i),t.setRenderTarget(n,1),t.render(e,s),t.setRenderTarget(n,2),t.render(e,o),t.setRenderTarget(n,3),t.render(e,a),t.setRenderTarget(n,4),t.render(e,l),n.texture.generateMipmaps=g,t.setRenderTarget(n,5),t.render(e,c),t.setRenderTarget(h),t.outputEncoding=u,t.toneMapping=d,t.xr.enabled=f,n.texture.needsPMREMUpdate=!0}}class fo extends fe{constructor(t,e,n,i,s,o,a,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:Hi,super(t,e,n,i,s,o,a,l,c,h),this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}fo.prototype.isCubeTexture=!0;class Zh extends Pe{constructor(t,e={}){super(t,t,e);const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new fo(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.encoding),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:Se}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.encoding=e.encoding,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new zr(5,5,5),s=new Ge({name:"CubemapFromEquirect",uniforms:Wi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ve,blending:En});s.uniforms.tEquirect.value=e;const o=new Te(i,s),a=e.minFilter;return e.minFilter===co&&(e.minFilter=Se),new ja(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,n,i){const s=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,i);t.setRenderTarget(s)}}Zh.prototype.isWebGLCubeRenderTarget=!0;const ra=new T,Sp=new T,Ep=new me;class dn{constructor(t=new T(1,0,0),e=0){this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=ra.subVectors(n,e).cross(Sp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(this.normal).multiplyScalar(-this.distanceToPoint(t)).add(t)}intersectLine(t,e){const n=t.delta(ra),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const s=-(t.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:e.copy(n).multiplyScalar(s).add(t.start)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Ep.getNormalMatrix(t),i=this.coplanarPoint(ra).applyMatrix4(t),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}dn.prototype.isPlane=!0;const gi=new $i,hs=new T;class po{constructor(t=new dn,e=new dn,n=new dn,i=new dn,s=new dn,o=new dn){this.planes=[t,e,n,i,s,o]}set(t,e,n,i,s,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(s),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t){const e=this.planes,n=t.elements,i=n[0],s=n[1],o=n[2],a=n[3],l=n[4],c=n[5],h=n[6],u=n[7],d=n[8],f=n[9],g=n[10],m=n[11],p=n[12],x=n[13],v=n[14],w=n[15];return e[0].setComponents(a-i,u-l,m-d,w-p).normalize(),e[1].setComponents(a+i,u+l,m+d,w+p).normalize(),e[2].setComponents(a+s,u+c,m+f,w+x).normalize(),e[3].setComponents(a-s,u-c,m-f,w-x).normalize(),e[4].setComponents(a-o,u-h,m-g,w-v).normalize(),e[5].setComponents(a+o,u+h,m+g,w+v).normalize(),this}intersectsObject(t){const e=t.geometry;return e.boundingSphere===null&&e.computeBoundingSphere(),gi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld),this.intersectsSphere(gi)}intersectsSprite(t){return gi.center.set(0,0,0),gi.radius=.7071067811865476,gi.applyMatrix4(t.matrixWorld),this.intersectsSphere(gi)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(hs.x=i.normal.x>0?t.max.x:t.min.x,hs.y=i.normal.y>0?t.max.y:t.min.y,hs.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(hs)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Kh(){let r=null,t=!1,e=null,n=null;function i(s,o){e(s,o),n=r.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=r.requestAnimationFrame(i),t=!0)},stop:function(){r.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){r=s}}}function Tp(r,t){const e=t.isWebGL2,n=new WeakMap;function i(c,h){const u=c.array,d=c.usage,f=r.createBuffer();r.bindBuffer(h,f),r.bufferData(h,u,d),c.onUploadCallback();let g;if(u instanceof Float32Array)g=5126;else if(u instanceof Uint16Array)if(c.isFloat16BufferAttribute)if(e)g=5131;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else g=5123;else if(u instanceof Int16Array)g=5122;else if(u instanceof Uint32Array)g=5125;else if(u instanceof Int32Array)g=5124;else if(u instanceof Int8Array)g=5120;else if(u instanceof Uint8Array)g=5121;else if(u instanceof Uint8ClampedArray)g=5121;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:f,type:g,bytesPerElement:u.BYTES_PER_ELEMENT,version:c.version}}function s(c,h,u){const d=h.array,f=h.updateRange;r.bindBuffer(u,c),f.count===-1?r.bufferSubData(u,0,d):(e?r.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d,f.offset,f.count):r.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d.subarray(f.offset,f.offset+f.count)),f.count=-1)}function o(c){return c.isInterleavedBufferAttribute&&(c=c.data),n.get(c)}function a(c){c.isInterleavedBufferAttribute&&(c=c.data);const h=n.get(c);h&&(r.deleteBuffer(h.buffer),n.delete(c))}function l(c,h){if(c.isGLBufferAttribute){const d=n.get(c);(!d||d.version<c.version)&&n.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);const u=n.get(c);u===void 0?n.set(c,i(c,h)):u.version<c.version&&(s(u.buffer,c,h),u.version=c.version)}return{get:o,remove:a,update:l}}class $a extends Kt{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const s=t/2,o=e/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,u=t/a,d=e/l,f=[],g=[],m=[],p=[];for(let x=0;x<h;x++){const v=x*d-o;for(let w=0;w<c;w++){const y=w*u-s;g.push(y,-v,0),m.push(0,0,1),p.push(w/a),p.push(1-x/l)}}for(let x=0;x<l;x++)for(let v=0;v<a;v++){const w=v+c*x,y=v+c*(x+1),b=v+1+c*(x+1),C=v+1+c*x;f.push(w,y,C),f.push(y,b,C)}this.setIndex(f),this.setAttribute("position",new Zt(g,3)),this.setAttribute("normal",new Zt(m,3)),this.setAttribute("uv",new Zt(p,2))}static fromJSON(t){return new $a(t.width,t.height,t.widthSegments,t.heightSegments)}}var Ap=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vUv ).g;
#endif`,Cp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Lp=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,Rp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Pp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Ip=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Dp="vec3 transformed = vec3( position );",Np=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Fp=`vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 f0, const in float f90, const in float roughness ) {
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
	float D = D_GGX( alpha, dotNH );
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif`,Bp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vUv );
		vec2 dSTdy = dFdy( vUv );
		float Hll = bumpScale * texture2D( bumpMap, vUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
		vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Op=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,zp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Up=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,kp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Hp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Vp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Gp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,Wp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Xp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal;
#endif
};
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float linearToRelativeLuminance( const in vec3 color ) {
	vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
	return dot( weights, color.rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}`,qp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		vec2 uv = getUV( direction, face ) * ( faceSize - 1.0 ) + 0.5;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define r0 1.0
	#define v0 0.339
	#define m0 - 2.0
	#define r1 0.8
	#define v1 0.276
	#define m1 - 1.0
	#define r4 0.4
	#define v4 0.046
	#define m4 2.0
	#define r5 0.305
	#define v5 0.016
	#define m5 3.0
	#define r6 0.21
	#define v6 0.0038
	#define m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= r1 ) {
			mip = ( r0 - roughness ) * ( m1 - m0 ) / ( r0 - r1 ) + m0;
		} else if ( roughness >= r4 ) {
			mip = ( r1 - roughness ) * ( m4 - m1 ) / ( r1 - r4 ) + m1;
		} else if ( roughness >= r5 ) {
			mip = ( r4 - roughness ) * ( m5 - m4 ) / ( r4 - r5 ) + m4;
		} else if ( roughness >= r6 ) {
			mip = ( r5 - roughness ) * ( m6 - m5 ) / ( r5 - r6 ) + m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,jp=`vec3 transformedNormal = objectNormal;
#ifdef USE_INSTANCING
	mat3 m = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
	transformedNormal = m * transformedNormal;
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,$p=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Jp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
#endif`,Yp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Zp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Kp="gl_FragColor = linearToOutputTexel( gl_FragColor );",Qp=`vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,tm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 envColor = textureCubeUV( envMap, reflectVec, 0.0 );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,em=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,nm=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,im=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) ||defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,rm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,sm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,om=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,am=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,lm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,cm=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		return ( coord.x < 0.7 ) ? vec3( 0.7 ) : vec3( 1.0 );
	#endif
}`,hm=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vUv2 );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,um=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,dm=`vec3 diffuse = vec3( 1.0 );
GeometricContext geometry;
geometry.position = mvPosition.xyz;
geometry.normal = normalize( transformedNormal );
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( -mvPosition.xyz );
GeometricContext backGeometry;
backGeometry.position = geometry.position;
backGeometry.normal = -geometry.normal;
backGeometry.viewDir = geometry.viewDir;
vLightFront = vec3( 0.0 );
vIndirectFront = vec3( 0.0 );
#ifdef DOUBLE_SIDED
	vLightBack = vec3( 0.0 );
	vIndirectBack = vec3( 0.0 );
#endif
IncidentLight directLight;
float dotNL;
vec3 directLightColor_Diffuse;
vIndirectFront += getAmbientLightIrradiance( ambientLightColor );
vIndirectFront += getLightProbeIrradiance( lightProbe, geometry.normal );
#ifdef DOUBLE_SIDED
	vIndirectBack += getAmbientLightIrradiance( ambientLightColor );
	vIndirectBack += getLightProbeIrradiance( lightProbe, backGeometry.normal );
#endif
#if NUM_POINT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		getPointLightInfo( pointLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_SPOT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		getSpotLightInfo( spotLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_DIR_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		getDirectionalLightInfo( directionalLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( - dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_HEMI_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
		vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
		#ifdef DOUBLE_SIDED
			vIndirectBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry.normal );
		#endif
	}
	#pragma unroll_loop_end
#endif`,fm=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
uniform vec3 lightProbe[ 9 ];
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( PHYSICALLY_CORRECT_LIGHTS )
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#else
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometry.position;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometry.position;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,pm=`#if defined( USE_ENVMAP )
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#if defined( ENVMAP_TYPE_CUBE_UV )
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#if defined( ENVMAP_TYPE_CUBE_UV )
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
#endif`,mm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,gm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometry.normal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon
#define Material_LightProbeLOD( material )	(0)`,xm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,_m=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong
#define Material_LightProbeLOD( material )	(0)`,vm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	#ifdef SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULARINTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vUv ).a;
		#endif
		#ifdef USE_SPECULARCOLORMAP
			specularColorFactor *= texture2D( specularColorMap, vUv ).rgb;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEENCOLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEENROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vUv ).a;
	#endif
#endif`,ym=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
};
vec3 clearcoatSpecular = vec3( 0.0 );
vec3 sheenSpecular = vec3( 0.0 );
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	vec3 FssEss = specularColor * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = specularColor + ( 1.0 - specularColor ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometry.normal;
		vec3 viewDir = geometry.viewDir;
		vec3 position = geometry.position;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometry.clearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecular += ccIrradiance * BRDF_GGX( directLight.direction, geometry.viewDir, geometry.clearcoatNormal, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecular += irradiance * BRDF_Sheen( directLight.direction, geometry.viewDir, geometry.normal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometry.viewDir, geometry.normal, material.specularColor, material.specularF90, material.roughness );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecular += clearcoatRadiance * EnvironmentBRDF( geometry.clearcoatNormal, geometry.viewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecular += irradiance * material.sheenColor * IBLSheenBRDF( geometry.normal, geometry.viewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	computeMultiscattering( geometry.normal, geometry.viewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	vec3 diffuse = material.diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Mm=`
GeometricContext geometry;
geometry.position = - vViewPosition;
geometry.normal = normal;
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
#ifdef USE_CLEARCOAT
	geometry.clearcoatNormal = clearcoatNormal;
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,bm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vUv2 );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometry.normal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	radiance += getIBLRadiance( geometry.viewDir, geometry.normal, material.roughness );
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,wm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometry, material, reflectedLight );
#endif`,Sm=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Em=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Tm=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,Am=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Cm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Lm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Rm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Pm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	uniform mat3 uvTransform;
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Im=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Dm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Nm=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Fm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,Bm=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,Om=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,zm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );
	vec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	#ifdef USE_TANGENT
		vec3 tangent = normalize( vTangent );
		vec3 bitangent = normalize( vBitangent );
		#ifdef DOUBLE_SIDED
			tangent = tangent * faceDirection;
			bitangent = bitangent * faceDirection;
		#endif
		#if defined( TANGENTSPACE_NORMALMAP ) || defined( USE_CLEARCOAT_NORMALMAP )
			mat3 vTBN = mat3( tangent, bitangent, normal );
		#endif
	#endif
#endif
vec3 geometryNormal = normal;`,Um=`#ifdef OBJECTSPACE_NORMALMAP
	normal = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( TANGENTSPACE_NORMALMAP )
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	#ifdef USE_TANGENT
		normal = normalize( vTBN * mapN );
	#else
		normal = perturbNormal2Arb( - vViewPosition, normal, mapN, faceDirection );
	#endif
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,km=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Hm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Vm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Gm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef OBJECTSPACE_NORMALMAP
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( TANGENTSPACE_NORMALMAP ) || defined ( USE_CLEARCOAT_NORMALMAP ) )
	vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {
		vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
		vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
		vec2 st0 = dFdx( vUv.st );
		vec2 st1 = dFdy( vUv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );
		return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );
	}
#endif`,Wm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = geometryNormal;
#endif`,Xm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	#ifdef USE_TANGENT
		clearcoatNormal = normalize( vTBN * clearcoatMapN );
	#else
		clearcoatNormal = perturbNormal2Arb( - vViewPosition, clearcoatNormal, clearcoatMapN, faceDirection );
	#endif
#endif`,qm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif`,jm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= transmissionAlpha + 0.1;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,$m=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
	return linearClipZ * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}`,Jm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ym=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Zm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Km=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Qm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vUv );
	roughnessFactor *= texelRoughness.g;
#endif`,tg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,eg=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );
		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
		bool frustumTest = all( frustumTestVec );
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,ng=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform mat4 spotShadowMatrix[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,ig=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		vec4 shadowWorldPosition;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias, 0 );
		vSpotShadowCoord[ i ] = spotShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
		vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
#endif`,rg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,sg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,og=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	#ifdef BONE_TEXTURE
		uniform highp sampler2D boneTexture;
		uniform int boneTextureSize;
		mat4 getBoneMatrix( const in float i ) {
			float j = i * 4.0;
			float x = mod( j, float( boneTextureSize ) );
			float y = floor( j / float( boneTextureSize ) );
			float dx = 1.0 / float( boneTextureSize );
			float dy = 1.0 / float( boneTextureSize );
			y = dy * ( y + 0.5 );
			vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
			vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
			vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
			vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
			mat4 bone = mat4( v1, v2, v3, v4 );
			return bone;
		}
	#else
		uniform mat4 boneMatrices[ MAX_BONES ];
		mat4 getBoneMatrix( const in float i ) {
			mat4 bone = boneMatrices[ int(i) ];
			return bone;
		}
	#endif
#endif`,ag=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,lg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,cg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,hg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,ug=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,dg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return toneMappingExposure * color;
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,fg=`#ifdef USE_TRANSMISSION
	float transmissionAlpha = 1.0;
	float transmissionFactor = transmission;
	float thicknessFactor = thickness;
	#ifdef USE_TRANSMISSIONMAP
		transmissionFactor *= texture2D( transmissionMap, vUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		thicknessFactor *= texture2D( thicknessMap, vUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmission = getIBLVolumeRefraction(
		n, v, roughnessFactor, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, ior, thicknessFactor,
		attenuationColor, attenuationDistance );
	totalDiffuse = mix( totalDiffuse, transmission.rgb, transmissionFactor );
	transmissionAlpha = mix( transmissionAlpha, transmission.a, transmissionFactor );
#endif`,pg=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float framebufferLod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		#ifdef texture2DLodEXT
			return texture2DLodEXT( transmissionSamplerMap, fragCoord.xy, framebufferLod );
		#else
			return texture2D( transmissionSamplerMap, fragCoord.xy, framebufferLod );
		#endif
	}
	vec3 applyVolumeAttenuation( const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( attenuationDistance == 0.0 ) {
			return radiance;
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance * radiance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 attenuatedColor = applyVolumeAttenuation( transmittedLight.rgb, length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		return vec4( ( 1.0 - F ) * attenuatedColor * diffuseColor, transmittedLight.a );
	}
#endif`,mg=`#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
	varying vec2 vUv;
#endif`,gg=`#ifdef USE_UV
	#ifdef UVS_VERTEX_ONLY
		vec2 vUv;
	#else
		varying vec2 vUv;
	#endif
	uniform mat3 uvTransform;
#endif`,xg=`#ifdef USE_UV
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
#endif`,_g=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	varying vec2 vUv2;
#endif`,vg=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	attribute vec2 uv2;
	varying vec2 vUv2;
	uniform mat3 uv2Transform;
#endif`,yg=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
#endif`,Mg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION )
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const bg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,wg=`uniform sampler2D t2D;
varying vec2 vUv;
void main() {
	gl_FragColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		gl_FragColor = vec4( mix( pow( gl_FragColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), gl_FragColor.rgb * 0.0773993808, vec3( lessThanEqual( gl_FragColor.rgb, vec3( 0.04045 ) ) ) ), gl_FragColor.w );
	#endif
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,Sg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Eg=`#include <envmap_common_pars_fragment>
uniform float opacity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	vec3 vReflect = vWorldDirection;
	#include <envmap_fragment>
	gl_FragColor = envColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,Tg=`#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Ag=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Cg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Lg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Rg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Pg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,Ig=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Dg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ng=`#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Fg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vUv2 );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Bg=`#define LAMBERT
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Og=`uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <emissivemap_fragment>
	#ifdef DOUBLE_SIDED
		reflectedLight.indirectDiffuse += ( gl_FrontFacing ) ? vIndirectFront : vIndirectBack;
	#else
		reflectedLight.indirectDiffuse += vIndirectFront;
	#endif
	#include <lightmap_fragment>
	reflectedLight.indirectDiffuse *= BRDF_Lambert( diffuseColor.rgb );
	#ifdef DOUBLE_SIDED
		reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;
	#else
		reflectedLight.directDiffuse = vLightFront;
	#endif
	reflectedLight.directDiffuse *= BRDF_Lambert( diffuseColor.rgb ) * getShadowMask();
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,zg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Ug=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Hg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Vg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Gg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Wg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Xg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULARINTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
	#ifdef USE_SPECULARCOLORMAP
		uniform sampler2D specularColorMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEENCOLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEENROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecular;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometry.clearcoatNormal, geometry.viewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + clearcoatSpecular * material.clearcoat;
	#endif
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,jg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$g=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Jg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Yg=`#include <common>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Zg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,Kg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Qg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <output_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,Ut={alphamap_fragment:Ap,alphamap_pars_fragment:Cp,alphatest_fragment:Lp,alphatest_pars_fragment:Rp,aomap_fragment:Pp,aomap_pars_fragment:Ip,begin_vertex:Dp,beginnormal_vertex:Np,bsdfs:Fp,bumpmap_pars_fragment:Bp,clipping_planes_fragment:Op,clipping_planes_pars_fragment:zp,clipping_planes_pars_vertex:Up,clipping_planes_vertex:kp,color_fragment:Hp,color_pars_fragment:Vp,color_pars_vertex:Gp,color_vertex:Wp,common:Xp,cube_uv_reflection_fragment:qp,defaultnormal_vertex:jp,displacementmap_pars_vertex:$p,displacementmap_vertex:Jp,emissivemap_fragment:Yp,emissivemap_pars_fragment:Zp,encodings_fragment:Kp,encodings_pars_fragment:Qp,envmap_fragment:tm,envmap_common_pars_fragment:em,envmap_pars_fragment:nm,envmap_pars_vertex:im,envmap_physical_pars_fragment:pm,envmap_vertex:rm,fog_vertex:sm,fog_pars_vertex:om,fog_fragment:am,fog_pars_fragment:lm,gradientmap_pars_fragment:cm,lightmap_fragment:hm,lightmap_pars_fragment:um,lights_lambert_vertex:dm,lights_pars_begin:fm,lights_toon_fragment:mm,lights_toon_pars_fragment:gm,lights_phong_fragment:xm,lights_phong_pars_fragment:_m,lights_physical_fragment:vm,lights_physical_pars_fragment:ym,lights_fragment_begin:Mm,lights_fragment_maps:bm,lights_fragment_end:wm,logdepthbuf_fragment:Sm,logdepthbuf_pars_fragment:Em,logdepthbuf_pars_vertex:Tm,logdepthbuf_vertex:Am,map_fragment:Cm,map_pars_fragment:Lm,map_particle_fragment:Rm,map_particle_pars_fragment:Pm,metalnessmap_fragment:Im,metalnessmap_pars_fragment:Dm,morphcolor_vertex:Nm,morphnormal_vertex:Fm,morphtarget_pars_vertex:Bm,morphtarget_vertex:Om,normal_fragment_begin:zm,normal_fragment_maps:Um,normal_pars_fragment:km,normal_pars_vertex:Hm,normal_vertex:Vm,normalmap_pars_fragment:Gm,clearcoat_normal_fragment_begin:Wm,clearcoat_normal_fragment_maps:Xm,clearcoat_pars_fragment:qm,output_fragment:jm,packing:$m,premultiplied_alpha_fragment:Jm,project_vertex:Ym,dithering_fragment:Zm,dithering_pars_fragment:Km,roughnessmap_fragment:Qm,roughnessmap_pars_fragment:tg,shadowmap_pars_fragment:eg,shadowmap_pars_vertex:ng,shadowmap_vertex:ig,shadowmask_pars_fragment:rg,skinbase_vertex:sg,skinning_pars_vertex:og,skinning_vertex:ag,skinnormal_vertex:lg,specularmap_fragment:cg,specularmap_pars_fragment:hg,tonemapping_fragment:ug,tonemapping_pars_fragment:dg,transmission_fragment:fg,transmission_pars_fragment:pg,uv_pars_fragment:mg,uv_pars_vertex:gg,uv_vertex:xg,uv2_pars_fragment:_g,uv2_pars_vertex:vg,uv2_vertex:yg,worldpos_vertex:Mg,background_vert:bg,background_frag:wg,cube_vert:Sg,cube_frag:Eg,depth_vert:Tg,depth_frag:Ag,distanceRGBA_vert:Cg,distanceRGBA_frag:Lg,equirect_vert:Rg,equirect_frag:Pg,linedashed_vert:Ig,linedashed_frag:Dg,meshbasic_vert:Ng,meshbasic_frag:Fg,meshlambert_vert:Bg,meshlambert_frag:Og,meshmatcap_vert:zg,meshmatcap_frag:Ug,meshnormal_vert:kg,meshnormal_frag:Hg,meshphong_vert:Vg,meshphong_frag:Gg,meshphysical_vert:Wg,meshphysical_frag:Xg,meshtoon_vert:qg,meshtoon_frag:jg,points_vert:$g,points_frag:Jg,shadow_vert:Yg,shadow_frag:Zg,sprite_vert:Kg,sprite_frag:Qg},ht={common:{diffuse:{value:new vt(16777215)},opacity:{value:1},map:{value:null},uvTransform:{value:new me},uv2Transform:{value:new me},alphaMap:{value:null},alphaTest:{value:0}},specularmap:{specularMap:{value:null}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1}},emissivemap:{emissiveMap:{value:null}},bumpmap:{bumpMap:{value:null},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalScale:{value:new et(1,1)}},displacementmap:{displacementMap:{value:null},displacementScale:{value:1},displacementBias:{value:0}},roughnessmap:{roughnessMap:{value:null}},metalnessmap:{metalnessMap:{value:null}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new vt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotShadowMap:{value:[]},spotShadowMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new vt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaTest:{value:0},uvTransform:{value:new me}},sprite:{diffuse:{value:new vt(16777215)},opacity:{value:1},center:{value:new et(.5,.5)},rotation:{value:0},map:{value:null},alphaMap:{value:null},alphaTest:{value:0},uvTransform:{value:new me}}},Qe={basic:{uniforms:_e([ht.common,ht.specularmap,ht.envmap,ht.aomap,ht.lightmap,ht.fog]),vertexShader:Ut.meshbasic_vert,fragmentShader:Ut.meshbasic_frag},lambert:{uniforms:_e([ht.common,ht.specularmap,ht.envmap,ht.aomap,ht.lightmap,ht.emissivemap,ht.fog,ht.lights,{emissive:{value:new vt(0)}}]),vertexShader:Ut.meshlambert_vert,fragmentShader:Ut.meshlambert_frag},phong:{uniforms:_e([ht.common,ht.specularmap,ht.envmap,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.fog,ht.lights,{emissive:{value:new vt(0)},specular:{value:new vt(1118481)},shininess:{value:30}}]),vertexShader:Ut.meshphong_vert,fragmentShader:Ut.meshphong_frag},standard:{uniforms:_e([ht.common,ht.envmap,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.roughnessmap,ht.metalnessmap,ht.fog,ht.lights,{emissive:{value:new vt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ut.meshphysical_vert,fragmentShader:Ut.meshphysical_frag},toon:{uniforms:_e([ht.common,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.gradientmap,ht.fog,ht.lights,{emissive:{value:new vt(0)}}]),vertexShader:Ut.meshtoon_vert,fragmentShader:Ut.meshtoon_frag},matcap:{uniforms:_e([ht.common,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.fog,{matcap:{value:null}}]),vertexShader:Ut.meshmatcap_vert,fragmentShader:Ut.meshmatcap_frag},points:{uniforms:_e([ht.points,ht.fog]),vertexShader:Ut.points_vert,fragmentShader:Ut.points_frag},dashed:{uniforms:_e([ht.common,ht.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ut.linedashed_vert,fragmentShader:Ut.linedashed_frag},depth:{uniforms:_e([ht.common,ht.displacementmap]),vertexShader:Ut.depth_vert,fragmentShader:Ut.depth_frag},normal:{uniforms:_e([ht.common,ht.bumpmap,ht.normalmap,ht.displacementmap,{opacity:{value:1}}]),vertexShader:Ut.meshnormal_vert,fragmentShader:Ut.meshnormal_frag},sprite:{uniforms:_e([ht.sprite,ht.fog]),vertexShader:Ut.sprite_vert,fragmentShader:Ut.sprite_frag},background:{uniforms:{uvTransform:{value:new me},t2D:{value:null}},vertexShader:Ut.background_vert,fragmentShader:Ut.background_frag},cube:{uniforms:_e([ht.envmap,{opacity:{value:1}}]),vertexShader:Ut.cube_vert,fragmentShader:Ut.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ut.equirect_vert,fragmentShader:Ut.equirect_frag},distanceRGBA:{uniforms:_e([ht.common,ht.displacementmap,{referencePosition:{value:new T},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ut.distanceRGBA_vert,fragmentShader:Ut.distanceRGBA_frag},shadow:{uniforms:_e([ht.lights,ht.fog,{color:{value:new vt(0)},opacity:{value:1}}]),vertexShader:Ut.shadow_vert,fragmentShader:Ut.shadow_frag}};Qe.physical={uniforms:_e([Qe.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatNormalScale:{value:new et(1,1)},clearcoatNormalMap:{value:null},sheen:{value:0},sheenColor:{value:new vt(0)},sheenColorMap:{value:null},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},transmission:{value:0},transmissionMap:{value:null},transmissionSamplerSize:{value:new et},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},attenuationDistance:{value:0},attenuationColor:{value:new vt(0)},specularIntensity:{value:1},specularIntensityMap:{value:null},specularColor:{value:new vt(1,1,1)},specularColorMap:{value:null}}]),vertexShader:Ut.meshphysical_vert,fragmentShader:Ut.meshphysical_frag};function t0(r,t,e,n,i,s){const o=new vt(0);let a=i===!0?0:1,l,c,h=null,u=0,d=null;function f(m,p){let x=!1,v=p.isScene===!0?p.background:null;v&&v.isTexture&&(v=t.get(v));const w=r.xr,y=w.getSession&&w.getSession();y&&y.environmentBlendMode==="additive"&&(v=null),v===null?g(o,a):v&&v.isColor&&(g(v,1),x=!0),(r.autoClear||x)&&r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil),v&&(v.isCubeTexture||v.mapping===lo)?(c===void 0&&(c=new Te(new zr(1,1,1),new Ge({name:"BackgroundCubeMaterial",uniforms:Wi(Qe.cube.uniforms),vertexShader:Qe.cube.vertexShader,fragmentShader:Qe.cube.fragmentShader,side:Ve,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(b,C,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=v,c.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,(h!==v||u!==v.version||d!==r.toneMapping)&&(c.material.needsUpdate=!0,h=v,u=v.version,d=r.toneMapping),m.unshift(c,c.geometry,c.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new Te(new $a(2,2),new Ge({name:"BackgroundMaterial",uniforms:Wi(Qe.background.uniforms),vertexShader:Qe.background.vertexShader,fragmentShader:Qe.background.fragmentShader,side:br,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=v,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(h!==v||u!==v.version||d!==r.toneMapping)&&(l.material.needsUpdate=!0,h=v,u=v.version,d=r.toneMapping),m.unshift(l,l.geometry,l.material,0,0,null))}function g(m,p){e.buffers.color.setClear(m.r,m.g,m.b,p,s)}return{getClearColor:function(){return o},setClearColor:function(m,p=1){o.set(m),a=p,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(m){a=m,g(o,a)},render:f}}function e0(r,t,e,n){const i=r.getParameter(34921),s=n.isWebGL2?null:t.get("OES_vertex_array_object"),o=n.isWebGL2||s!==null,a={},l=p(null);let c=l,h=!1;function u(I,z,B,k,P){let X=!1;if(o){const Y=m(k,B,z);c!==Y&&(c=Y,f(c.object)),X=x(k,P),X&&v(k,P)}else{const Y=z.wireframe===!0;(c.geometry!==k.id||c.program!==B.id||c.wireframe!==Y)&&(c.geometry=k.id,c.program=B.id,c.wireframe=Y,X=!0)}I.isInstancedMesh===!0&&(X=!0),P!==null&&e.update(P,34963),(X||h)&&(h=!1,D(I,z,B,k),P!==null&&r.bindBuffer(34963,e.get(P).buffer))}function d(){return n.isWebGL2?r.createVertexArray():s.createVertexArrayOES()}function f(I){return n.isWebGL2?r.bindVertexArray(I):s.bindVertexArrayOES(I)}function g(I){return n.isWebGL2?r.deleteVertexArray(I):s.deleteVertexArrayOES(I)}function m(I,z,B){const k=B.wireframe===!0;let P=a[I.id];P===void 0&&(P={},a[I.id]=P);let X=P[z.id];X===void 0&&(X={},P[z.id]=X);let Y=X[k];return Y===void 0&&(Y=p(d()),X[k]=Y),Y}function p(I){const z=[],B=[],k=[];for(let P=0;P<i;P++)z[P]=0,B[P]=0,k[P]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:z,enabledAttributes:B,attributeDivisors:k,object:I,attributes:{},index:null}}function x(I,z){const B=c.attributes,k=I.attributes;let P=0;for(const X in k){const Y=B[X],Q=k[X];if(Y===void 0||Y.attribute!==Q||Y.data!==Q.data)return!0;P++}return c.attributesNum!==P||c.index!==z}function v(I,z){const B={},k=I.attributes;let P=0;for(const X in k){const Y=k[X],Q={};Q.attribute=Y,Y.data&&(Q.data=Y.data),B[X]=Q,P++}c.attributes=B,c.attributesNum=P,c.index=z}function w(){const I=c.newAttributes;for(let z=0,B=I.length;z<B;z++)I[z]=0}function y(I){b(I,0)}function b(I,z){const B=c.newAttributes,k=c.enabledAttributes,P=c.attributeDivisors;B[I]=1,k[I]===0&&(r.enableVertexAttribArray(I),k[I]=1),P[I]!==z&&((n.isWebGL2?r:t.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](I,z),P[I]=z)}function C(){const I=c.newAttributes,z=c.enabledAttributes;for(let B=0,k=z.length;B<k;B++)z[B]!==I[B]&&(r.disableVertexAttribArray(B),z[B]=0)}function R(I,z,B,k,P,X){n.isWebGL2===!0&&(B===5124||B===5125)?r.vertexAttribIPointer(I,z,B,P,X):r.vertexAttribPointer(I,z,B,k,P,X)}function D(I,z,B,k){if(n.isWebGL2===!1&&(I.isInstancedMesh||k.isInstancedBufferGeometry)&&t.get("ANGLE_instanced_arrays")===null)return;w();const P=k.attributes,X=B.getAttributes(),Y=z.defaultAttributeValues;for(const Q in X){const K=X[Q];if(K.location>=0){let at=P[Q];if(at===void 0&&(Q==="instanceMatrix"&&I.instanceMatrix&&(at=I.instanceMatrix),Q==="instanceColor"&&I.instanceColor&&(at=I.instanceColor)),at!==void 0){const bt=at.normalized,xt=at.itemSize,W=e.get(at);if(W===void 0)continue;const pt=W.buffer,yt=W.type,wt=W.bytesPerElement;if(at.isInterleavedBufferAttribute){const it=at.data,Ct=it.stride,G=at.offset;if(it.isInstancedInterleavedBuffer){for(let $=0;$<K.locationSize;$++)b(K.location+$,it.meshPerAttribute);I.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let $=0;$<K.locationSize;$++)y(K.location+$);r.bindBuffer(34962,pt);for(let $=0;$<K.locationSize;$++)R(K.location+$,xt/K.locationSize,yt,bt,Ct*wt,(G+xt/K.locationSize*$)*wt)}else{if(at.isInstancedBufferAttribute){for(let it=0;it<K.locationSize;it++)b(K.location+it,at.meshPerAttribute);I.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=at.meshPerAttribute*at.count)}else for(let it=0;it<K.locationSize;it++)y(K.location+it);r.bindBuffer(34962,pt);for(let it=0;it<K.locationSize;it++)R(K.location+it,xt/K.locationSize,yt,bt,xt*wt,xt/K.locationSize*it*wt)}}else if(Y!==void 0){const bt=Y[Q];if(bt!==void 0)switch(bt.length){case 2:r.vertexAttrib2fv(K.location,bt);break;case 3:r.vertexAttrib3fv(K.location,bt);break;case 4:r.vertexAttrib4fv(K.location,bt);break;default:r.vertexAttrib1fv(K.location,bt)}}}}C()}function V(){A();for(const I in a){const z=a[I];for(const B in z){const k=z[B];for(const P in k)g(k[P].object),delete k[P];delete z[B]}delete a[I]}}function F(I){if(a[I.id]===void 0)return;const z=a[I.id];for(const B in z){const k=z[B];for(const P in k)g(k[P].object),delete k[P];delete z[B]}delete a[I.id]}function _(I){for(const z in a){const B=a[z];if(B[I.id]===void 0)continue;const k=B[I.id];for(const P in k)g(k[P].object),delete k[P];delete B[I.id]}}function A(){j(),h=!0,c!==l&&(c=l,f(c.object))}function j(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:u,reset:A,resetDefaultState:j,dispose:V,releaseStatesOfGeometry:F,releaseStatesOfProgram:_,initAttributes:w,enableAttribute:y,disableUnusedAttributes:C}}function n0(r,t,e,n){const i=n.isWebGL2;let s;function o(c){s=c}function a(c,h){r.drawArrays(s,c,h),e.update(h,s,1)}function l(c,h,u){if(u===0)return;let d,f;if(i)d=r,f="drawArraysInstanced";else if(d=t.get("ANGLE_instanced_arrays"),f="drawArraysInstancedANGLE",d===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}d[f](s,c,h,u),e.update(h,s,u)}this.setMode=o,this.render=a,this.renderInstances=l}function i0(r,t,e){let n;function i(){if(n!==void 0)return n;if(t.has("EXT_texture_filter_anisotropic")===!0){const R=t.get("EXT_texture_filter_anisotropic");n=r.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function s(R){if(R==="highp"){if(r.getShaderPrecisionFormat(35633,36338).precision>0&&r.getShaderPrecisionFormat(35632,36338).precision>0)return"highp";R="mediump"}return R==="mediump"&&r.getShaderPrecisionFormat(35633,36337).precision>0&&r.getShaderPrecisionFormat(35632,36337).precision>0?"mediump":"lowp"}const o=typeof WebGL2RenderingContext<"u"&&r instanceof WebGL2RenderingContext||typeof WebGL2ComputeRenderingContext<"u"&&r instanceof WebGL2ComputeRenderingContext;let a=e.precision!==void 0?e.precision:"highp";const l=s(a);l!==a&&(console.warn("THREE.WebGLRenderer:",a,"not supported, using",l,"instead."),a=l);const c=o||t.has("WEBGL_draw_buffers"),h=e.logarithmicDepthBuffer===!0,u=r.getParameter(34930),d=r.getParameter(35660),f=r.getParameter(3379),g=r.getParameter(34076),m=r.getParameter(34921),p=r.getParameter(36347),x=r.getParameter(36348),v=r.getParameter(36349),w=d>0,y=o||t.has("OES_texture_float"),b=w&&y,C=o?r.getParameter(36183):0;return{isWebGL2:o,drawBuffers:c,getMaxAnisotropy:i,getMaxPrecision:s,precision:a,logarithmicDepthBuffer:h,maxTextures:u,maxVertexTextures:d,maxTextureSize:f,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:p,maxVaryings:x,maxFragmentUniforms:v,vertexTextures:w,floatFragmentTextures:y,floatVertexTextures:b,maxSamples:C}}function r0(r){const t=this;let e=null,n=0,i=!1,s=!1;const o=new dn,a=new me,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d,f){const g=u.length!==0||d||n!==0||i;return i=d,e=h(u,f,0),n=u.length,g},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1,c()},this.setState=function(u,d,f){const g=u.clippingPlanes,m=u.clipIntersection,p=u.clipShadows,x=r.get(u);if(!i||g===null||g.length===0||s&&!p)s?h(null):c();else{const v=s?0:n,w=v*4;let y=x.clippingState||null;l.value=y,y=h(g,d,w,f);for(let b=0;b!==w;++b)y[b]=e[b];x.clippingState=y,this.numIntersection=m?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,f,g){const m=u!==null?u.length:0;let p=null;if(m!==0){if(p=l.value,g!==!0||p===null){const x=f+m*4,v=d.matrixWorldInverse;a.getNormalMatrix(v),(p===null||p.length<x)&&(p=new Float32Array(x));for(let w=0,y=f;w!==m;++w,y+=4)o.copy(u[w]).applyMatrix4(v,a),o.normal.toArray(p,y),p[y+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=m,t.numIntersection=0,p}}function s0(r){let t=new WeakMap;function e(o,a){return a===wa?o.mapping=Hi:a===Sa&&(o.mapping=Vi),o}function n(o){if(o&&o.isTexture&&o.isRenderTargetTexture===!1){const a=o.mapping;if(a===wa||a===Sa)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new Zh(l.height/2);return c.fromEquirectangularTexture(r,o),t.set(o,c),o.addEventListener("dispose",i),e(c.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function s(){t=new WeakMap}return{get:n,dispose:s}}class Ja extends qa{constructor(t=-1,e=1,n=1,i=-1,s=.1,o=2e3){super(),this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-t,o=n+t,a=i+e,l=i-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}Ja.prototype.isOrthographicCamera=!0;const Ei=4,_c=[.125,.215,.35,.446,.526,.582],zn=20,sa=new Ja,vc=new vt;let oa=null;const Bn=(1+Math.sqrt(5))/2,xi=1/Bn,yc=[new T(1,1,1),new T(-1,1,1),new T(1,1,-1),new T(-1,1,-1),new T(0,Bn,xi),new T(0,Bn,-xi),new T(xi,0,Bn),new T(-xi,0,Bn),new T(Bn,xi,0),new T(-Bn,xi,0)];class Mc{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){oa=this._renderer.getRenderTarget(),this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(t,n,i,s),e>0&&this._blur(s,0,0,e),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Sc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=wc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(oa),t.scissorTest=!1,us(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Hi||t.mapping===Vi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),oa=this._renderer.getRenderTarget();const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize-32,n={magFilter:Se,minFilter:Se,generateMipmaps:!1,type:Pi,format:He,encoding:pn,depthBuffer:!1},i=bc(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=bc(t,e,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=o0(s)),this._blurMaterial=a0(s,t,e)}return i}_compileMaterial(t){const e=new Te(this._lodPlanes[0],t);this._renderer.compile(e,sa)}_sceneToCubeUV(t,e,n,i){const a=new Ee(90,1,e,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(vc),h.toneMapping=fn,h.autoClear=!1;const f=new uo({name:"PMREM.Background",side:Ve,depthWrite:!1,depthTest:!1}),g=new Te(new zr,f);let m=!1;const p=t.background;p?p.isColor&&(f.color.copy(p),t.background=null,m=!0):(f.color.copy(vc),m=!0);for(let x=0;x<6;x++){const v=x%3;v===0?(a.up.set(0,l[x],0),a.lookAt(c[x],0,0)):v===1?(a.up.set(0,0,l[x]),a.lookAt(0,c[x],0)):(a.up.set(0,l[x],0),a.lookAt(0,0,c[x]));const w=this._cubeSize;us(i,v*w,x>2?w:0,w,w),h.setRenderTarget(i),m&&h.render(g,a),h.render(t,a)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,t.background=p}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===Hi||t.mapping===Vi;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Sc()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=wc());const s=i?this._cubemapMaterial:this._equirectMaterial,o=new Te(this._lodPlanes[0],s),a=s.uniforms;a.envMap.value=t;const l=this._cubeSize;us(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(o,sa)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;for(let i=1;i<this._lodPlanes.length;i++){const s=Math.sqrt(this._sigmas[i]*this._sigmas[i]-this._sigmas[i-1]*this._sigmas[i-1]),o=yc[(i-1)%yc.length];this._blur(t,i-1,i,s,o)}e.autoClear=n}_blur(t,e,n,i,s){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,i,"latitudinal",s),this._halfBlur(o,t,n,n,i,"longitudinal",s)}_halfBlur(t,e,n,i,s,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new Te(this._lodPlanes[i],c),d=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*zn-1),m=s/g,p=isFinite(s)?1+Math.floor(h*m):zn;p>zn&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${zn}`);const x=[];let v=0;for(let R=0;R<zn;++R){const D=R/m,V=Math.exp(-D*D/2);x.push(V),R===0?v+=V:R<p&&(v+=2*V)}for(let R=0;R<x.length;R++)x[R]=x[R]/v;d.envMap.value=t.texture,d.samples.value=p,d.weights.value=x,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:w}=this;d.dTheta.value=g,d.mipInt.value=w-n;const y=this._sizeLods[i],b=3*y*(i>w-Ei?i-w+Ei:0),C=4*(this._cubeSize-y);us(e,b,C,3*y,2*y),l.setRenderTarget(e),l.render(u,sa)}}function o0(r){const t=[],e=[],n=[];let i=r;const s=r-Ei+1+_c.length;for(let o=0;o<s;o++){const a=Math.pow(2,i);e.push(a);let l=1/a;o>r-Ei?l=_c[o-r+Ei-1]:o===0&&(l=0),n.push(l);const c=1/(a-1),h=-c/2,u=1+c/2,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,m=3,p=2,x=1,v=new Float32Array(m*g*f),w=new Float32Array(p*g*f),y=new Float32Array(x*g*f);for(let C=0;C<f;C++){const R=C%3*2/3-1,D=C>2?0:-1,V=[R,D,0,R+2/3,D,0,R+2/3,D+1,0,R,D,0,R+2/3,D+1,0,R,D+1,0];v.set(V,m*g*C),w.set(d,p*g*C);const F=[C,C,C,C,C,C];y.set(F,x*g*C)}const b=new Kt;b.setAttribute("position",new ce(v,m)),b.setAttribute("uv",new ce(w,p)),b.setAttribute("faceIndex",new ce(y,x)),t.push(b),i>Ei&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function bc(r,t,e){const n=new Pe(r,t,e);return n.texture.mapping=lo,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function us(r,t,e,n,i){r.viewport.set(t,e,n,i),r.scissor.set(t,e,n,i)}function a0(r,t,e){const n=new Float32Array(zn),i=new T(0,1,0);return new Ge({name:"SphericalGaussianBlur",defines:{n:zn,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Ya(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function wc(){return new Ge({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ya(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function Sc(){return new Ge({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ya(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:En,depthTest:!1,depthWrite:!1})}function Ya(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function l0(r){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===wa||l===Sa,h=l===Hi||l===Vi;if(c||h)if(a.isRenderTargetTexture&&a.needsPMREMUpdate===!0){a.needsPMREMUpdate=!1;let u=t.get(a);return e===null&&(e=new Mc(r)),u=c?e.fromEquirectangular(a,u):e.fromCubemap(a,u),t.set(a,u),u.texture}else{if(t.has(a))return t.get(a).texture;{const u=a.image;if(c&&u&&u.height>0||h&&u&&i(u)){e===null&&(e=new Mc(r));const d=c?e.fromEquirectangular(a):e.fromCubemap(a);return t.set(a,d),a.addEventListener("dispose",s),d.texture}else return null}}}return a}function i(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function s(a){const l=a.target;l.removeEventListener("dispose",s);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function c0(r){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=r.getExtension("WEBGL_depth_texture")||r.getExtension("MOZ_WEBGL_depth_texture")||r.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=r.getExtension("EXT_texture_filter_anisotropic")||r.getExtension("MOZ_EXT_texture_filter_anisotropic")||r.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=r.getExtension("WEBGL_compressed_texture_s3tc")||r.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=r.getExtension("WEBGL_compressed_texture_pvrtc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=r.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(n){n.isWebGL2?e("EXT_color_buffer_float"):(e("WEBGL_depth_texture"),e("OES_texture_float"),e("OES_texture_half_float"),e("OES_texture_half_float_linear"),e("OES_standard_derivatives"),e("OES_element_index_uint"),e("OES_vertex_array_object"),e("ANGLE_instanced_arrays")),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture")},get:function(n){const i=e(n);return i===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function h0(r,t,e,n){const i={},s=new WeakMap;function o(u){const d=u.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete i[d.id];const f=s.get(d);f&&(t.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function a(u,d){return i[d.id]===!0||(d.addEventListener("dispose",o),i[d.id]=!0,e.memory.geometries++),d}function l(u){const d=u.attributes;for(const g in d)t.update(d[g],34962);const f=u.morphAttributes;for(const g in f){const m=f[g];for(let p=0,x=m.length;p<x;p++)t.update(m[p],34962)}}function c(u){const d=[],f=u.index,g=u.attributes.position;let m=0;if(f!==null){const v=f.array;m=f.version;for(let w=0,y=v.length;w<y;w+=3){const b=v[w+0],C=v[w+1],R=v[w+2];d.push(b,C,C,R,R,b)}}else{const v=g.array;m=g.version;for(let w=0,y=v.length/3-1;w<y;w+=3){const b=w+0,C=w+1,R=w+2;d.push(b,C,C,R,R,b)}}const p=new(Xh(d)?Yh:Jh)(d,1);p.version=m;const x=s.get(u);x&&t.remove(x),s.set(u,p)}function h(u){const d=s.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return s.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function u0(r,t,e,n){const i=n.isWebGL2;let s;function o(d){s=d}let a,l;function c(d){a=d.type,l=d.bytesPerElement}function h(d,f){r.drawElements(s,f,a,d*l),e.update(f,s,1)}function u(d,f,g){if(g===0)return;let m,p;if(i)m=r,p="drawElementsInstanced";else if(m=t.get("ANGLE_instanced_arrays"),p="drawElementsInstancedANGLE",m===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[p](s,f,a,d*l,g),e.update(f,s,g)}this.setMode=o,this.setIndex=c,this.render=h,this.renderInstances=u}function d0(r){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(e.calls++,o){case 4:e.triangles+=a*(s/3);break;case 1:e.lines+=a*(s/2);break;case 3:e.lines+=a*(s-1);break;case 2:e.lines+=a*s;break;case 0:e.points+=a*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function i(){e.frame++,e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function f0(r,t){return r[0]-t[0]}function p0(r,t){return Math.abs(t[1])-Math.abs(r[1])}function aa(r,t){let e=1;const n=t.isInterleavedBufferAttribute?t.data.array:t.array;n instanceof Int8Array?e=127:n instanceof Int16Array?e=32767:n instanceof Int32Array?e=2147483647:console.error("THREE.WebGLMorphtargets: Unsupported morph attribute data type: ",n),r.divideScalar(e)}function m0(r,t,e){const n={},i=new Float32Array(8),s=new WeakMap,o=new Jt,a=[];for(let c=0;c<8;c++)a[c]=[c,0];function l(c,h,u,d){const f=c.morphTargetInfluences;if(t.isWebGL2===!0){const g=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,m=g!==void 0?g.length:0;let p=s.get(h);if(p===void 0||p.count!==m){let z=function(){j.dispose(),s.delete(h),h.removeEventListener("dispose",z)};p!==void 0&&p.texture.dispose();const w=h.morphAttributes.position!==void 0,y=h.morphAttributes.normal!==void 0,b=h.morphAttributes.color!==void 0,C=h.morphAttributes.position||[],R=h.morphAttributes.normal||[],D=h.morphAttributes.color||[];let V=0;w===!0&&(V=1),y===!0&&(V=2),b===!0&&(V=3);let F=h.attributes.position.count*V,_=1;F>t.maxTextureSize&&(_=Math.ceil(F/t.maxTextureSize),F=t.maxTextureSize);const A=new Float32Array(F*_*4*m),j=new ho(A,F,_,m);j.type=kn,j.needsUpdate=!0;const I=V*4;for(let B=0;B<m;B++){const k=C[B],P=R[B],X=D[B],Y=F*_*4*B;for(let Q=0;Q<k.count;Q++){const K=Q*I;w===!0&&(o.fromBufferAttribute(k,Q),k.normalized===!0&&aa(o,k),A[Y+K+0]=o.x,A[Y+K+1]=o.y,A[Y+K+2]=o.z,A[Y+K+3]=0),y===!0&&(o.fromBufferAttribute(P,Q),P.normalized===!0&&aa(o,P),A[Y+K+4]=o.x,A[Y+K+5]=o.y,A[Y+K+6]=o.z,A[Y+K+7]=0),b===!0&&(o.fromBufferAttribute(X,Q),X.normalized===!0&&aa(o,X),A[Y+K+8]=o.x,A[Y+K+9]=o.y,A[Y+K+10]=o.z,A[Y+K+11]=X.itemSize===4?o.w:1)}}p={count:m,texture:j,size:new et(F,_)},s.set(h,p),h.addEventListener("dispose",z)}let x=0;for(let w=0;w<f.length;w++)x+=f[w];const v=h.morphTargetsRelative?1:1-x;d.getUniforms().setValue(r,"morphTargetBaseInfluence",v),d.getUniforms().setValue(r,"morphTargetInfluences",f),d.getUniforms().setValue(r,"morphTargetsTexture",p.texture,e),d.getUniforms().setValue(r,"morphTargetsTextureSize",p.size)}else{const g=f===void 0?0:f.length;let m=n[h.id];if(m===void 0||m.length!==g){m=[];for(let y=0;y<g;y++)m[y]=[y,0];n[h.id]=m}for(let y=0;y<g;y++){const b=m[y];b[0]=y,b[1]=f[y]}m.sort(p0);for(let y=0;y<8;y++)y<g&&m[y][1]?(a[y][0]=m[y][0],a[y][1]=m[y][1]):(a[y][0]=Number.MAX_SAFE_INTEGER,a[y][1]=0);a.sort(f0);const p=h.morphAttributes.position,x=h.morphAttributes.normal;let v=0;for(let y=0;y<8;y++){const b=a[y],C=b[0],R=b[1];C!==Number.MAX_SAFE_INTEGER&&R?(p&&h.getAttribute("morphTarget"+y)!==p[C]&&h.setAttribute("morphTarget"+y,p[C]),x&&h.getAttribute("morphNormal"+y)!==x[C]&&h.setAttribute("morphNormal"+y,x[C]),i[y]=R,v+=R):(p&&h.hasAttribute("morphTarget"+y)===!0&&h.deleteAttribute("morphTarget"+y),x&&h.hasAttribute("morphNormal"+y)===!0&&h.deleteAttribute("morphNormal"+y),i[y]=0)}const w=h.morphTargetsRelative?1:1-v;d.getUniforms().setValue(r,"morphTargetBaseInfluence",w),d.getUniforms().setValue(r,"morphTargetInfluences",i)}}return{update:l}}function g0(r,t,e,n){let i=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,u=t.get(l,h);return i.get(u)!==c&&(t.update(u),i.set(u,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),e.update(l.instanceMatrix,34962),l.instanceColor!==null&&e.update(l.instanceColor,34962)),u}function o(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:s,dispose:o}}const Qh=new fe,tu=new ho,eu=new Xa,nu=new fo,Ec=[],Tc=[],Ac=new Float32Array(16),Cc=new Float32Array(9),Lc=new Float32Array(4);function Yi(r,t,e){const n=r[0];if(n<=0||n>0)return r;const i=t*e;let s=Ec[i];if(s===void 0&&(s=new Float32Array(i),Ec[i]=s),t!==0){n.toArray(s,0);for(let o=1,a=0;o!==t;++o)a+=e,r[o].toArray(s,a)}return s}function we(r,t){if(r.length!==t.length)return!1;for(let e=0,n=r.length;e<n;e++)if(r[e]!==t[e])return!1;return!0}function Me(r,t){for(let e=0,n=t.length;e<n;e++)r[e]=t[e]}function mo(r,t){let e=Tc[t];e===void 0&&(e=new Int32Array(t),Tc[t]=e);for(let n=0;n!==t;++n)e[n]=r.allocateTextureUnit();return e}function x0(r,t){const e=this.cache;e[0]!==t&&(r.uniform1f(this.addr,t),e[0]=t)}function _0(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(r.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(we(e,t))return;r.uniform2fv(this.addr,t),Me(e,t)}}function v0(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(r.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(r.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(we(e,t))return;r.uniform3fv(this.addr,t),Me(e,t)}}function y0(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(r.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(we(e,t))return;r.uniform4fv(this.addr,t),Me(e,t)}}function M0(r,t){const e=this.cache,n=t.elements;if(n===void 0){if(we(e,t))return;r.uniformMatrix2fv(this.addr,!1,t),Me(e,t)}else{if(we(e,n))return;Lc.set(n),r.uniformMatrix2fv(this.addr,!1,Lc),Me(e,n)}}function b0(r,t){const e=this.cache,n=t.elements;if(n===void 0){if(we(e,t))return;r.uniformMatrix3fv(this.addr,!1,t),Me(e,t)}else{if(we(e,n))return;Cc.set(n),r.uniformMatrix3fv(this.addr,!1,Cc),Me(e,n)}}function w0(r,t){const e=this.cache,n=t.elements;if(n===void 0){if(we(e,t))return;r.uniformMatrix4fv(this.addr,!1,t),Me(e,t)}else{if(we(e,n))return;Ac.set(n),r.uniformMatrix4fv(this.addr,!1,Ac),Me(e,n)}}function S0(r,t){const e=this.cache;e[0]!==t&&(r.uniform1i(this.addr,t),e[0]=t)}function E0(r,t){const e=this.cache;we(e,t)||(r.uniform2iv(this.addr,t),Me(e,t))}function T0(r,t){const e=this.cache;we(e,t)||(r.uniform3iv(this.addr,t),Me(e,t))}function A0(r,t){const e=this.cache;we(e,t)||(r.uniform4iv(this.addr,t),Me(e,t))}function C0(r,t){const e=this.cache;e[0]!==t&&(r.uniform1ui(this.addr,t),e[0]=t)}function L0(r,t){const e=this.cache;we(e,t)||(r.uniform2uiv(this.addr,t),Me(e,t))}function R0(r,t){const e=this.cache;we(e,t)||(r.uniform3uiv(this.addr,t),Me(e,t))}function P0(r,t){const e=this.cache;we(e,t)||(r.uniform4uiv(this.addr,t),Me(e,t))}function I0(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTexture2D(t||Qh,i)}function D0(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||eu,i)}function N0(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||nu,i)}function F0(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||tu,i)}function B0(r){switch(r){case 5126:return x0;case 35664:return _0;case 35665:return v0;case 35666:return y0;case 35674:return M0;case 35675:return b0;case 35676:return w0;case 5124:case 35670:return S0;case 35667:case 35671:return E0;case 35668:case 35672:return T0;case 35669:case 35673:return A0;case 5125:return C0;case 36294:return L0;case 36295:return R0;case 36296:return P0;case 35678:case 36198:case 36298:case 36306:case 35682:return I0;case 35679:case 36299:case 36307:return D0;case 35680:case 36300:case 36308:case 36293:return N0;case 36289:case 36303:case 36311:case 36292:return F0}}function O0(r,t){r.uniform1fv(this.addr,t)}function z0(r,t){const e=Yi(t,this.size,2);r.uniform2fv(this.addr,e)}function U0(r,t){const e=Yi(t,this.size,3);r.uniform3fv(this.addr,e)}function k0(r,t){const e=Yi(t,this.size,4);r.uniform4fv(this.addr,e)}function H0(r,t){const e=Yi(t,this.size,4);r.uniformMatrix2fv(this.addr,!1,e)}function V0(r,t){const e=Yi(t,this.size,9);r.uniformMatrix3fv(this.addr,!1,e)}function G0(r,t){const e=Yi(t,this.size,16);r.uniformMatrix4fv(this.addr,!1,e)}function W0(r,t){r.uniform1iv(this.addr,t)}function X0(r,t){r.uniform2iv(this.addr,t)}function q0(r,t){r.uniform3iv(this.addr,t)}function j0(r,t){r.uniform4iv(this.addr,t)}function $0(r,t){r.uniform1uiv(this.addr,t)}function J0(r,t){r.uniform2uiv(this.addr,t)}function Y0(r,t){r.uniform3uiv(this.addr,t)}function Z0(r,t){r.uniform4uiv(this.addr,t)}function K0(r,t,e){const n=t.length,i=mo(e,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)e.setTexture2D(t[s]||Qh,i[s])}function Q0(r,t,e){const n=t.length,i=mo(e,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)e.setTexture3D(t[s]||eu,i[s])}function tx(r,t,e){const n=t.length,i=mo(e,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)e.setTextureCube(t[s]||nu,i[s])}function ex(r,t,e){const n=t.length,i=mo(e,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)e.setTexture2DArray(t[s]||tu,i[s])}function nx(r){switch(r){case 5126:return O0;case 35664:return z0;case 35665:return U0;case 35666:return k0;case 35674:return H0;case 35675:return V0;case 35676:return G0;case 5124:case 35670:return W0;case 35667:case 35671:return X0;case 35668:case 35672:return q0;case 35669:case 35673:return j0;case 5125:return $0;case 36294:return J0;case 36295:return Y0;case 36296:return Z0;case 35678:case 36198:case 36298:case 36306:case 35682:return K0;case 35679:case 36299:case 36307:return Q0;case 35680:case 36300:case 36308:case 36293:return tx;case 36289:case 36303:case 36311:case 36292:return ex}}function ix(r,t,e){this.id=r,this.addr=e,this.cache=[],this.setValue=B0(t.type)}function iu(r,t,e){this.id=r,this.addr=e,this.cache=[],this.size=t.size,this.setValue=nx(t.type)}iu.prototype.updateCache=function(r){const t=this.cache;r instanceof Float32Array&&t.length!==r.length&&(this.cache=new Float32Array(r.length)),Me(t,r)};function ru(r){this.id=r,this.seq=[],this.map={}}ru.prototype.setValue=function(r,t,e){const n=this.seq;for(let i=0,s=n.length;i!==s;++i){const o=n[i];o.setValue(r,t[o.id],e)}};const la=/(\w+)(\])?(\[|\.)?/g;function Rc(r,t){r.seq.push(t),r.map[t.id]=t}function rx(r,t,e){const n=r.name,i=n.length;for(la.lastIndex=0;;){const s=la.exec(n),o=la.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===i){Rc(e,c===void 0?new ix(a,r,t):new iu(a,r,t));break}else{let u=e.map[a];u===void 0&&(u=new ru(a),Rc(e,u)),e=u}}}function Tn(r,t){this.seq=[],this.map={};const e=r.getProgramParameter(t,35718);for(let n=0;n<e;++n){const i=r.getActiveUniform(t,n),s=r.getUniformLocation(t,i.name);rx(i,s,this)}}Tn.prototype.setValue=function(r,t,e,n){const i=this.map[t];i!==void 0&&i.setValue(r,e,n)};Tn.prototype.setOptional=function(r,t,e){const n=t[e];n!==void 0&&this.setValue(r,e,n)};Tn.upload=function(r,t,e,n){for(let i=0,s=t.length;i!==s;++i){const o=t[i],a=e[o.id];a.needsUpdate!==!1&&o.setValue(r,a.value,n)}};Tn.seqWithValue=function(r,t){const e=[];for(let n=0,i=r.length;n!==i;++n){const s=r[n];s.id in t&&e.push(s)}return e};function Pc(r,t,e){const n=r.createShader(t);return r.shaderSource(n,e),r.compileShader(n),n}let sx=0;function ox(r,t){const e=r.split(`
`),n=[],i=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let o=i;o<s;o++)n.push(o+1+": "+e[o]);return n.join(`
`)}function ax(r){switch(r){case pn:return["Linear","( value )"];case te:return["sRGB","( value )"];default:return console.warn("THREE.WebGLProgram: Unsupported encoding:",r),["Linear","( value )"]}}function Ic(r,t,e){const n=r.getShaderParameter(t,35713),i=r.getShaderInfoLog(t).trim();if(n&&i==="")return"";const s=parseInt(/ERROR: 0:(\d+)/.exec(i)[1]);return e.toUpperCase()+`

`+i+`

`+ox(r.getShaderSource(t),s)}function lx(r,t){const e=ax(t);return"vec4 "+r+"( vec4 value ) { return LinearTo"+e[0]+e[1]+"; }"}function cx(r,t){let e;switch(t){case Rf:e="Linear";break;case Pf:e="Reinhard";break;case If:e="OptimizedCineon";break;case Df:e="ACESFilmic";break;case Nf:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+r+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}function hx(r){return[r.extensionDerivatives||!!r.envMapCubeUVHeight||r.bumpMap||r.tangentSpaceNormalMap||r.clearcoatNormalMap||r.flatShading||r.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(r.extensionFragDepth||r.logarithmicDepthBuffer)&&r.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",r.extensionDrawBuffers&&r.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(r.extensionShaderTextureLOD||r.envMap||r.transmission)&&r.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(mr).join(`
`)}function ux(r){const t=[];for(const e in r){const n=r[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function dx(r,t){const e={},n=r.getProgramParameter(t,35721);for(let i=0;i<n;i++){const s=r.getActiveAttrib(t,i),o=s.name;let a=1;s.type===35674&&(a=2),s.type===35675&&(a=3),s.type===35676&&(a=4),e[o]={type:s.type,location:r.getAttribLocation(t,o),locationSize:a}}return e}function mr(r){return r!==""}function Dc(r,t){return r.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Nc(r,t){return r.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const fx=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ra(r){return r.replace(fx,px)}function px(r,t){const e=Ut[t];if(e===void 0)throw new Error("Can not resolve #include <"+t+">");return Ra(e)}const mx=/#pragma unroll_loop[\s]+?for \( int i \= (\d+)\; i < (\d+)\; i \+\+ \) \{([\s\S]+?)(?=\})\}/g,gx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Fc(r){return r.replace(gx,su).replace(mx,xx)}function xx(r,t,e,n){return console.warn("WebGLProgram: #pragma unroll_loop shader syntax is deprecated. Please use #pragma unroll_loop_start syntax instead."),su(r,t,e,n)}function su(r,t,e,n){let i="";for(let s=parseInt(t);s<parseInt(e);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function Bc(r){let t="precision "+r.precision+` float;
precision `+r.precision+" int;";return r.precision==="highp"?t+=`
#define HIGH_PRECISION`:r.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function _x(r){let t="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===Uh?t="SHADOWMAP_TYPE_PCF":r.shadowMapType===lf?t="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===pr&&(t="SHADOWMAP_TYPE_VSM"),t}function vx(r){let t="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case Hi:case Vi:t="ENVMAP_TYPE_CUBE";break;case lo:t="ENVMAP_TYPE_CUBE_UV";break}return t}function yx(r){let t="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case Vi:t="ENVMAP_MODE_REFRACTION";break}return t}function Mx(r){let t="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case ao:t="ENVMAP_BLENDING_MULTIPLY";break;case Cf:t="ENVMAP_BLENDING_MIX";break;case Lf:t="ENVMAP_BLENDING_ADD";break}return t}function bx(r){const t=r.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t/32+1)+3,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function wx(r,t,e,n){const i=r.getContext(),s=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=_x(e),c=vx(e),h=yx(e),u=Mx(e),d=bx(e),f=e.isWebGL2?"":hx(e),g=ux(s),m=i.createProgram();let p,x,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=[g].filter(mr).join(`
`),p.length>0&&(p+=`
`),x=[f,g].filter(mr).join(`
`),x.length>0&&(x+=`
`)):(p=[Bc(e),"#define SHADER_NAME "+e.shaderName,g,e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.supportsVertexTextures?"#define VERTEX_TEXTURES":"","#define MAX_BONES "+e.maxBones,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMap&&e.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",e.normalMap&&e.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.displacementMap&&e.supportsVertexTextures?"#define USE_DISPLACEMENTMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularIntensityMap?"#define USE_SPECULARINTENSITYMAP":"",e.specularColorMap?"#define USE_SPECULARCOLORMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEENCOLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEENROUGHNESSMAP":"",e.vertexTangents?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUvs?"#define USE_UV":"",e.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.useVertexTexture?"#define BONE_TEXTURE":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors&&e.isWebGL2?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.logarithmicDepthBuffer&&e.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(mr).join(`
`),x=[f,Bc(e),"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMap&&e.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",e.normalMap&&e.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularIntensityMap?"#define USE_SPECULARINTENSITYMAP":"",e.specularColorMap?"#define USE_SPECULARCOLORMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEENCOLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEENROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.vertexTangents?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUvs?"#define USE_UV":"",e.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.physicallyCorrectLights?"#define PHYSICALLY_CORRECT_LIGHTS":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.logarithmicDepthBuffer&&e.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==fn?"#define TONE_MAPPING":"",e.toneMapping!==fn?Ut.tonemapping_pars_fragment:"",e.toneMapping!==fn?cx("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Ut.encodings_pars_fragment,lx("linearToOutputTexel",e.outputEncoding),e.depthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(mr).join(`
`)),o=Ra(o),o=Dc(o,e),o=Nc(o,e),a=Ra(a),a=Dc(a,e),a=Nc(a,e),o=Fc(o),a=Fc(a),e.isWebGL2&&e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,p=["precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,x=["#define varying in",e.glslVersion===sc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===sc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+x);const w=v+p+o,y=v+x+a,b=Pc(i,35633,w),C=Pc(i,35632,y);if(i.attachShader(m,b),i.attachShader(m,C),e.index0AttributeName!==void 0?i.bindAttribLocation(m,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(m,0,"position"),i.linkProgram(m),r.debug.checkShaderErrors){const V=i.getProgramInfoLog(m).trim(),F=i.getShaderInfoLog(b).trim(),_=i.getShaderInfoLog(C).trim();let A=!0,j=!0;if(i.getProgramParameter(m,35714)===!1){A=!1;const I=Ic(i,b,"vertex"),z=Ic(i,C,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(m,35715)+`

Program Info Log: `+V+`
`+I+`
`+z)}else V!==""?console.warn("THREE.WebGLProgram: Program Info Log:",V):(F===""||_==="")&&(j=!1);j&&(this.diagnostics={runnable:A,programLog:V,vertexShader:{log:F,prefix:p},fragmentShader:{log:_,prefix:x}})}i.deleteShader(b),i.deleteShader(C);let R;this.getUniforms=function(){return R===void 0&&(R=new Tn(i,m)),R};let D;return this.getAttributes=function(){return D===void 0&&(D=dx(i,m)),D},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.name=e.shaderName,this.id=sx++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=C,this}let Sx=0;class Ex{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),s=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(s)===!1&&(o.add(s),s.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;return e.has(t)===!1&&e.set(t,new Set),e.get(t)}_getShaderStage(t){const e=this.shaderCache;if(e.has(t)===!1){const n=new Tx(t);e.set(t,n)}return e.get(t)}}class Tx{constructor(t){this.id=Sx++,this.code=t,this.usedTimes=0}}function Ax(r,t,e,n,i,s,o){const a=new $h,l=new Ex,c=[],h=i.isWebGL2,u=i.logarithmicDepthBuffer,d=i.floatVertexTextures,f=i.maxVertexUniforms,g=i.vertexTextures;let m=i.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){const j=_.skeleton.bones;if(d)return 1024;{const z=Math.floor((f-20)/4),B=Math.min(z,j.length);return B<j.length?(console.warn("THREE.WebGLRenderer: Skeleton has "+j.length+" bones. This GPU supports "+B+"."),0):B}}function v(_,A,j,I,z){const B=I.fog,k=z.geometry,P=_.isMeshStandardMaterial?I.environment:null,X=(_.isMeshStandardMaterial?e:t).get(_.envMap||P),Y=!!X&&X.mapping===lo?X.image.height:null,Q=p[_.type],K=z.isSkinnedMesh?x(z):0;_.precision!==null&&(m=i.getMaxPrecision(_.precision),m!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",m,"instead."));const at=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,bt=at!==void 0?at.length:0;let xt=0;k.morphAttributes.position!==void 0&&(xt=1),k.morphAttributes.normal!==void 0&&(xt=2),k.morphAttributes.color!==void 0&&(xt=3);let W,pt,yt,wt;if(Q){const rt=Qe[Q];W=rt.vertexShader,pt=rt.fragmentShader}else W=_.vertexShader,pt=_.fragmentShader,l.update(_),yt=l.getVertexShaderID(_),wt=l.getFragmentShaderID(_);const it=r.getRenderTarget(),Ct=_.alphaTest>0,G=_.clearcoat>0;return{isWebGL2:h,shaderID:Q,shaderName:_.type,vertexShader:W,fragmentShader:pt,defines:_.defines,customVertexShaderID:yt,customFragmentShaderID:wt,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:m,instancing:z.isInstancedMesh===!0,instancingColor:z.isInstancedMesh===!0&&z.instanceColor!==null,supportsVertexTextures:g,outputEncoding:it===null?r.outputEncoding:it.isXRRenderTarget===!0?it.texture.encoding:pn,map:!!_.map,matcap:!!_.matcap,envMap:!!X,envMapMode:X&&X.mapping,envMapCubeUVHeight:Y,lightMap:!!_.lightMap,aoMap:!!_.aoMap,emissiveMap:!!_.emissiveMap,bumpMap:!!_.bumpMap,normalMap:!!_.normalMap,objectSpaceNormalMap:_.normalMapType===ip,tangentSpaceNormalMap:_.normalMapType===ji,decodeVideoTexture:!!_.map&&_.map.isVideoTexture===!0&&_.map.encoding===te,clearcoat:G,clearcoatMap:G&&!!_.clearcoatMap,clearcoatRoughnessMap:G&&!!_.clearcoatRoughnessMap,clearcoatNormalMap:G&&!!_.clearcoatNormalMap,displacementMap:!!_.displacementMap,roughnessMap:!!_.roughnessMap,metalnessMap:!!_.metalnessMap,specularMap:!!_.specularMap,specularIntensityMap:!!_.specularIntensityMap,specularColorMap:!!_.specularColorMap,opaque:_.transparent===!1&&_.blending===Ri,alphaMap:!!_.alphaMap,alphaTest:Ct,gradientMap:!!_.gradientMap,sheen:_.sheen>0,sheenColorMap:!!_.sheenColorMap,sheenRoughnessMap:!!_.sheenRoughnessMap,transmission:_.transmission>0,transmissionMap:!!_.transmissionMap,thicknessMap:!!_.thicknessMap,combine:_.combine,vertexTangents:!!_.normalMap&&!!k.attributes.tangent,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,vertexUvs:!!_.map||!!_.bumpMap||!!_.normalMap||!!_.specularMap||!!_.alphaMap||!!_.emissiveMap||!!_.roughnessMap||!!_.metalnessMap||!!_.clearcoatMap||!!_.clearcoatRoughnessMap||!!_.clearcoatNormalMap||!!_.displacementMap||!!_.transmissionMap||!!_.thicknessMap||!!_.specularIntensityMap||!!_.specularColorMap||!!_.sheenColorMap||!!_.sheenRoughnessMap,uvsVertexOnly:!(!!_.map||!!_.bumpMap||!!_.normalMap||!!_.specularMap||!!_.alphaMap||!!_.emissiveMap||!!_.roughnessMap||!!_.metalnessMap||!!_.clearcoatNormalMap||_.transmission>0||!!_.transmissionMap||!!_.thicknessMap||!!_.specularIntensityMap||!!_.specularColorMap||_.sheen>0||!!_.sheenColorMap||!!_.sheenRoughnessMap)&&!!_.displacementMap,fog:!!B,useFog:_.fog,fogExp2:B&&B.isFogExp2,flatShading:!!_.flatShading,sizeAttenuation:_.sizeAttenuation,logarithmicDepthBuffer:u,skinning:z.isSkinnedMesh===!0&&K>0,maxBones:K,useVertexTexture:d,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:bt,morphTextureStride:xt,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:_.dithering,shadowMapEnabled:r.shadowMap.enabled&&j.length>0,shadowMapType:r.shadowMap.type,toneMapping:_.toneMapped?r.toneMapping:fn,physicallyCorrectLights:r.physicallyCorrectLights,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===ki,flipSided:_.side===Ve,depthPacking:_.depthPacking!==void 0?_.depthPacking:!1,index0AttributeName:_.index0AttributeName,extensionDerivatives:_.extensions&&_.extensions.derivatives,extensionFragDepth:_.extensions&&_.extensions.fragDepth,extensionDrawBuffers:_.extensions&&_.extensions.drawBuffers,extensionShaderTextureLOD:_.extensions&&_.extensions.shaderTextureLOD,rendererExtensionFragDepth:h||n.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||n.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||n.has("EXT_shader_texture_lod"),customProgramCacheKey:_.customProgramCacheKey()}}function w(_){const A=[];if(_.shaderID?A.push(_.shaderID):(A.push(_.customVertexShaderID),A.push(_.customFragmentShaderID)),_.defines!==void 0)for(const j in _.defines)A.push(j),A.push(_.defines[j]);return _.isRawShaderMaterial===!1&&(y(A,_),b(A,_),A.push(r.outputEncoding)),A.push(_.customProgramCacheKey),A.join()}function y(_,A){_.push(A.precision),_.push(A.outputEncoding),_.push(A.envMapMode),_.push(A.envMapCubeUVHeight),_.push(A.combine),_.push(A.vertexUvs),_.push(A.fogExp2),_.push(A.sizeAttenuation),_.push(A.maxBones),_.push(A.morphTargetsCount),_.push(A.morphAttributeCount),_.push(A.numDirLights),_.push(A.numPointLights),_.push(A.numSpotLights),_.push(A.numHemiLights),_.push(A.numRectAreaLights),_.push(A.numDirLightShadows),_.push(A.numPointLightShadows),_.push(A.numSpotLightShadows),_.push(A.shadowMapType),_.push(A.toneMapping),_.push(A.numClippingPlanes),_.push(A.numClipIntersection)}function b(_,A){a.disableAll(),A.isWebGL2&&a.enable(0),A.supportsVertexTextures&&a.enable(1),A.instancing&&a.enable(2),A.instancingColor&&a.enable(3),A.map&&a.enable(4),A.matcap&&a.enable(5),A.envMap&&a.enable(6),A.lightMap&&a.enable(7),A.aoMap&&a.enable(8),A.emissiveMap&&a.enable(9),A.bumpMap&&a.enable(10),A.normalMap&&a.enable(11),A.objectSpaceNormalMap&&a.enable(12),A.tangentSpaceNormalMap&&a.enable(13),A.clearcoat&&a.enable(14),A.clearcoatMap&&a.enable(15),A.clearcoatRoughnessMap&&a.enable(16),A.clearcoatNormalMap&&a.enable(17),A.displacementMap&&a.enable(18),A.specularMap&&a.enable(19),A.roughnessMap&&a.enable(20),A.metalnessMap&&a.enable(21),A.gradientMap&&a.enable(22),A.alphaMap&&a.enable(23),A.alphaTest&&a.enable(24),A.vertexColors&&a.enable(25),A.vertexAlphas&&a.enable(26),A.vertexUvs&&a.enable(27),A.vertexTangents&&a.enable(28),A.uvsVertexOnly&&a.enable(29),A.fog&&a.enable(30),_.push(a.mask),a.disableAll(),A.useFog&&a.enable(0),A.flatShading&&a.enable(1),A.logarithmicDepthBuffer&&a.enable(2),A.skinning&&a.enable(3),A.useVertexTexture&&a.enable(4),A.morphTargets&&a.enable(5),A.morphNormals&&a.enable(6),A.morphColors&&a.enable(7),A.premultipliedAlpha&&a.enable(8),A.shadowMapEnabled&&a.enable(9),A.physicallyCorrectLights&&a.enable(10),A.doubleSided&&a.enable(11),A.flipSided&&a.enable(12),A.depthPacking&&a.enable(13),A.dithering&&a.enable(14),A.specularIntensityMap&&a.enable(15),A.specularColorMap&&a.enable(16),A.transmission&&a.enable(17),A.transmissionMap&&a.enable(18),A.thicknessMap&&a.enable(19),A.sheen&&a.enable(20),A.sheenColorMap&&a.enable(21),A.sheenRoughnessMap&&a.enable(22),A.decodeVideoTexture&&a.enable(23),A.opaque&&a.enable(24),_.push(a.mask)}function C(_){const A=p[_.type];let j;if(A){const I=Qe[A];j=Mp.clone(I.uniforms)}else j=_.uniforms;return j}function R(_,A){let j;for(let I=0,z=c.length;I<z;I++){const B=c[I];if(B.cacheKey===A){j=B,++j.usedTimes;break}}return j===void 0&&(j=new wx(r,A,_,s),c.push(j)),j}function D(_){if(--_.usedTimes===0){const A=c.indexOf(_);c[A]=c[c.length-1],c.pop(),_.destroy()}}function V(_){l.remove(_)}function F(){l.dispose()}return{getParameters:v,getProgramCacheKey:w,getUniforms:C,acquireProgram:R,releaseProgram:D,releaseShaderCache:V,programs:c,dispose:F}}function Cx(){let r=new WeakMap;function t(s){let o=r.get(s);return o===void 0&&(o={},r.set(s,o)),o}function e(s){r.delete(s)}function n(s,o,a){r.get(s)[o]=a}function i(){r=new WeakMap}return{get:t,remove:e,update:n,dispose:i}}function Lx(r,t){return r.groupOrder!==t.groupOrder?r.groupOrder-t.groupOrder:r.renderOrder!==t.renderOrder?r.renderOrder-t.renderOrder:r.material.id!==t.material.id?r.material.id-t.material.id:r.z!==t.z?r.z-t.z:r.id-t.id}function Oc(r,t){return r.groupOrder!==t.groupOrder?r.groupOrder-t.groupOrder:r.renderOrder!==t.renderOrder?r.renderOrder-t.renderOrder:r.z!==t.z?t.z-r.z:r.id-t.id}function zc(){const r=[];let t=0;const e=[],n=[],i=[];function s(){t=0,e.length=0,n.length=0,i.length=0}function o(u,d,f,g,m,p){let x=r[t];return x===void 0?(x={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:m,group:p},r[t]=x):(x.id=u.id,x.object=u,x.geometry=d,x.material=f,x.groupOrder=g,x.renderOrder=u.renderOrder,x.z=m,x.group=p),t++,x}function a(u,d,f,g,m,p){const x=o(u,d,f,g,m,p);f.transmission>0?n.push(x):f.transparent===!0?i.push(x):e.push(x)}function l(u,d,f,g,m,p){const x=o(u,d,f,g,m,p);f.transmission>0?n.unshift(x):f.transparent===!0?i.unshift(x):e.unshift(x)}function c(u,d){e.length>1&&e.sort(u||Lx),n.length>1&&n.sort(d||Oc),i.length>1&&i.sort(d||Oc)}function h(){for(let u=t,d=r.length;u<d;u++){const f=r[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:i,init:s,push:a,unshift:l,finish:h,sort:c}}function Rx(){let r=new WeakMap;function t(n,i){let s;return r.has(n)===!1?(s=new zc,r.set(n,[s])):i>=r.get(n).length?(s=new zc,r.get(n).push(s)):s=r.get(n)[i],s}function e(){r=new WeakMap}return{get:t,dispose:e}}function Px(){const r={};return{get:function(t){if(r[t.id]!==void 0)return r[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new T,color:new vt};break;case"SpotLight":e={position:new T,direction:new T,color:new vt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new T,color:new vt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new T,skyColor:new vt,groundColor:new vt};break;case"RectAreaLight":e={color:new vt,position:new T,halfWidth:new T,halfHeight:new T};break}return r[t.id]=e,e}}}function Ix(){const r={};return{get:function(t){if(r[t.id]!==void 0)return r[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"SpotLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et};break;case"PointLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new et,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[t.id]=e,e}}}let Dx=0;function Nx(r,t){return(t.castShadow?1:0)-(r.castShadow?1:0)}function Fx(r,t){const e=new Px,n=Ix(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotShadow:[],spotShadowMap:[],spotShadowMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[]};for(let h=0;h<9;h++)i.probe.push(new T);const s=new T,o=new Mt,a=new Mt;function l(h,u){let d=0,f=0,g=0;for(let V=0;V<9;V++)i.probe[V].set(0,0,0);let m=0,p=0,x=0,v=0,w=0,y=0,b=0,C=0;h.sort(Nx);const R=u!==!0?Math.PI:1;for(let V=0,F=h.length;V<F;V++){const _=h[V],A=_.color,j=_.intensity,I=_.distance,z=_.shadow&&_.shadow.map?_.shadow.map.texture:null;if(_.isAmbientLight)d+=A.r*j*R,f+=A.g*j*R,g+=A.b*j*R;else if(_.isLightProbe)for(let B=0;B<9;B++)i.probe[B].addScaledVector(_.sh.coefficients[B],j);else if(_.isDirectionalLight){const B=e.get(_);if(B.color.copy(_.color).multiplyScalar(_.intensity*R),_.castShadow){const k=_.shadow,P=n.get(_);P.shadowBias=k.bias,P.shadowNormalBias=k.normalBias,P.shadowRadius=k.radius,P.shadowMapSize=k.mapSize,i.directionalShadow[m]=P,i.directionalShadowMap[m]=z,i.directionalShadowMatrix[m]=_.shadow.matrix,y++}i.directional[m]=B,m++}else if(_.isSpotLight){const B=e.get(_);if(B.position.setFromMatrixPosition(_.matrixWorld),B.color.copy(A).multiplyScalar(j*R),B.distance=I,B.coneCos=Math.cos(_.angle),B.penumbraCos=Math.cos(_.angle*(1-_.penumbra)),B.decay=_.decay,_.castShadow){const k=_.shadow,P=n.get(_);P.shadowBias=k.bias,P.shadowNormalBias=k.normalBias,P.shadowRadius=k.radius,P.shadowMapSize=k.mapSize,i.spotShadow[x]=P,i.spotShadowMap[x]=z,i.spotShadowMatrix[x]=_.shadow.matrix,C++}i.spot[x]=B,x++}else if(_.isRectAreaLight){const B=e.get(_);B.color.copy(A).multiplyScalar(j),B.halfWidth.set(_.width*.5,0,0),B.halfHeight.set(0,_.height*.5,0),i.rectArea[v]=B,v++}else if(_.isPointLight){const B=e.get(_);if(B.color.copy(_.color).multiplyScalar(_.intensity*R),B.distance=_.distance,B.decay=_.decay,_.castShadow){const k=_.shadow,P=n.get(_);P.shadowBias=k.bias,P.shadowNormalBias=k.normalBias,P.shadowRadius=k.radius,P.shadowMapSize=k.mapSize,P.shadowCameraNear=k.camera.near,P.shadowCameraFar=k.camera.far,i.pointShadow[p]=P,i.pointShadowMap[p]=z,i.pointShadowMatrix[p]=_.shadow.matrix,b++}i.point[p]=B,p++}else if(_.isHemisphereLight){const B=e.get(_);B.skyColor.copy(_.color).multiplyScalar(j*R),B.groundColor.copy(_.groundColor).multiplyScalar(j*R),i.hemi[w]=B,w++}}v>0&&(t.isWebGL2||r.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ht.LTC_FLOAT_1,i.rectAreaLTC2=ht.LTC_FLOAT_2):r.has("OES_texture_half_float_linear")===!0?(i.rectAreaLTC1=ht.LTC_HALF_1,i.rectAreaLTC2=ht.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),i.ambient[0]=d,i.ambient[1]=f,i.ambient[2]=g;const D=i.hash;(D.directionalLength!==m||D.pointLength!==p||D.spotLength!==x||D.rectAreaLength!==v||D.hemiLength!==w||D.numDirectionalShadows!==y||D.numPointShadows!==b||D.numSpotShadows!==C)&&(i.directional.length=m,i.spot.length=x,i.rectArea.length=v,i.point.length=p,i.hemi.length=w,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=b,i.pointShadowMap.length=b,i.spotShadow.length=C,i.spotShadowMap.length=C,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=b,i.spotShadowMatrix.length=C,D.directionalLength=m,D.pointLength=p,D.spotLength=x,D.rectAreaLength=v,D.hemiLength=w,D.numDirectionalShadows=y,D.numPointShadows=b,D.numSpotShadows=C,i.version=Dx++)}function c(h,u){let d=0,f=0,g=0,m=0,p=0;const x=u.matrixWorldInverse;for(let v=0,w=h.length;v<w;v++){const y=h[v];if(y.isDirectionalLight){const b=i.directional[d];b.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(x),d++}else if(y.isSpotLight){const b=i.spot[g];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(x),b.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(x),g++}else if(y.isRectAreaLight){const b=i.rectArea[m];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(x),a.identity(),o.copy(y.matrixWorld),o.premultiply(x),a.extractRotation(o),b.halfWidth.set(y.width*.5,0,0),b.halfHeight.set(0,y.height*.5,0),b.halfWidth.applyMatrix4(a),b.halfHeight.applyMatrix4(a),m++}else if(y.isPointLight){const b=i.point[f];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(x),f++}else if(y.isHemisphereLight){const b=i.hemi[p];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(x),b.direction.normalize(),p++}}}return{setup:l,setupView:c,state:i}}function Uc(r,t){const e=new Fx(r,t),n=[],i=[];function s(){n.length=0,i.length=0}function o(u){n.push(u)}function a(u){i.push(u)}function l(u){e.setup(n,u)}function c(u){e.setupView(n,u)}return{init:s,state:{lightsArray:n,shadowsArray:i,lights:e},setupLights:l,setupLightsView:c,pushLight:o,pushShadow:a}}function Bx(r,t){let e=new WeakMap;function n(s,o=0){let a;return e.has(s)===!1?(a=new Uc(r,t),e.set(s,[a])):o>=e.get(s).length?(a=new Uc(r,t),e.get(s).push(a)):a=e.get(s)[o],a}function i(){e=new WeakMap}return{get:n,dispose:i}}class Za extends he{constructor(t){super(),this.type="MeshDepthMaterial",this.depthPacking=ep,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}Za.prototype.isMeshDepthMaterial=!0;class Ka extends he{constructor(t){super(),this.type="MeshDistanceMaterial",this.referencePosition=new T,this.nearDistance=1,this.farDistance=1e3,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.fog=!1,this.setValues(t)}copy(t){return super.copy(t),this.referencePosition.copy(t.referencePosition),this.nearDistance=t.nearDistance,this.farDistance=t.farDistance,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}Ka.prototype.isMeshDistanceMaterial=!0;const Ox=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,zx=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function ou(r,t,e){let n=new po;const i=new et,s=new et,o=new Jt,a=new Za({depthPacking:np}),l=new Ka,c={},h=e.maxTextureSize,u={0:Ve,1:br,2:ki},d=new Ge({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new et},radius:{value:4}},vertexShader:Ox,fragmentShader:zx}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new Kt;g.setAttribute("position",new ce(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const m=new Te(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Uh,this.render=function(y,b,C){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||y.length===0)return;const R=r.getRenderTarget(),D=r.getActiveCubeFace(),V=r.getActiveMipmapLevel(),F=r.state;F.setBlending(En),F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);for(let _=0,A=y.length;_<A;_++){const j=y[_],I=j.shadow;if(I===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(I.autoUpdate===!1&&I.needsUpdate===!1)continue;i.copy(I.mapSize);const z=I.getFrameExtents();if(i.multiply(z),s.copy(I.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(s.x=Math.floor(h/z.x),i.x=s.x*z.x,I.mapSize.x=s.x),i.y>h&&(s.y=Math.floor(h/z.y),i.y=s.y*z.y,I.mapSize.y=s.y)),I.map===null&&!I.isPointLightShadow&&this.type===pr&&(I.map=new Pe(i.x,i.y),I.map.texture.name=j.name+".shadowMap",I.mapPass=new Pe(i.x,i.y),I.camera.updateProjectionMatrix()),I.map===null){const k={minFilter:de,magFilter:de,format:He};I.map=new Pe(i.x,i.y,k),I.map.texture.name=j.name+".shadowMap",I.camera.updateProjectionMatrix()}r.setRenderTarget(I.map),r.clear();const B=I.getViewportCount();for(let k=0;k<B;k++){const P=I.getViewport(k);o.set(s.x*P.x,s.y*P.y,s.x*P.z,s.y*P.w),F.viewport(o),I.updateMatrices(j,k),n=I.getFrustum(),w(b,C,I.camera,j,this.type)}!I.isPointLightShadow&&this.type===pr&&x(I,C),I.needsUpdate=!1}p.needsUpdate=!1,r.setRenderTarget(R,D,V)};function x(y,b){const C=t.update(m);d.defines.VSM_SAMPLES!==y.blurSamples&&(d.defines.VSM_SAMPLES=y.blurSamples,f.defines.VSM_SAMPLES=y.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),d.uniforms.shadow_pass.value=y.map.texture,d.uniforms.resolution.value=y.mapSize,d.uniforms.radius.value=y.radius,r.setRenderTarget(y.mapPass),r.clear(),r.renderBufferDirect(b,null,C,d,m,null),f.uniforms.shadow_pass.value=y.mapPass.texture,f.uniforms.resolution.value=y.mapSize,f.uniforms.radius.value=y.radius,r.setRenderTarget(y.map),r.clear(),r.renderBufferDirect(b,null,C,f,m,null)}function v(y,b,C,R,D,V){let F=null;const _=C.isPointLight===!0?y.customDistanceMaterial:y.customDepthMaterial;if(_!==void 0?F=_:F=C.isPointLight===!0?l:a,r.localClippingEnabled&&b.clipShadows===!0&&b.clippingPlanes.length!==0||b.displacementMap&&b.displacementScale!==0||b.alphaMap&&b.alphaTest>0){const A=F.uuid,j=b.uuid;let I=c[A];I===void 0&&(I={},c[A]=I);let z=I[j];z===void 0&&(z=F.clone(),I[j]=z),F=z}return F.visible=b.visible,F.wireframe=b.wireframe,V===pr?F.side=b.shadowSide!==null?b.shadowSide:b.side:F.side=b.shadowSide!==null?b.shadowSide:u[b.side],F.alphaMap=b.alphaMap,F.alphaTest=b.alphaTest,F.clipShadows=b.clipShadows,F.clippingPlanes=b.clippingPlanes,F.clipIntersection=b.clipIntersection,F.displacementMap=b.displacementMap,F.displacementScale=b.displacementScale,F.displacementBias=b.displacementBias,F.wireframeLinewidth=b.wireframeLinewidth,F.linewidth=b.linewidth,C.isPointLight===!0&&F.isMeshDistanceMaterial===!0&&(F.referencePosition.setFromMatrixPosition(C.matrixWorld),F.nearDistance=R,F.farDistance=D),F}function w(y,b,C,R,D){if(y.visible===!1)return;if(y.layers.test(b.layers)&&(y.isMesh||y.isLine||y.isPoints)&&(y.castShadow||y.receiveShadow&&D===pr)&&(!y.frustumCulled||n.intersectsObject(y))){y.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,y.matrixWorld);const _=t.update(y),A=y.material;if(Array.isArray(A)){const j=_.groups;for(let I=0,z=j.length;I<z;I++){const B=j[I],k=A[B.materialIndex];if(k&&k.visible){const P=v(y,k,R,C.near,C.far,D);r.renderBufferDirect(C,null,_,P,y,B)}}}else if(A.visible){const j=v(y,A,R,C.near,C.far,D);r.renderBufferDirect(C,null,_,j,y,null)}}const F=y.children;for(let _=0,A=F.length;_<A;_++)w(F[_],b,C,R,D)}}function Ux(r,t,e){const n=e.isWebGL2;function i(){let L=!1;const dt=new Jt;let ct=null;const Et=new Jt(0,0,0,0);return{setMask:function(mt){ct!==mt&&!L&&(r.colorMask(mt,mt,mt,mt),ct=mt)},setLocked:function(mt){L=mt},setClear:function(mt,Tt,lt,Lt,Qt){Qt===!0&&(mt*=Lt,Tt*=Lt,lt*=Lt),dt.set(mt,Tt,lt,Lt),Et.equals(dt)===!1&&(r.clearColor(mt,Tt,lt,Lt),Et.copy(dt))},reset:function(){L=!1,ct=null,Et.set(-1,0,0,0)}}}function s(){let L=!1,dt=null,ct=null,Et=null;return{setTest:function(mt){mt?xt(2929):W(2929)},setMask:function(mt){dt!==mt&&!L&&(r.depthMask(mt),dt=mt)},setFunc:function(mt){if(ct!==mt){if(mt)switch(mt){case Mf:r.depthFunc(512);break;case bf:r.depthFunc(519);break;case wf:r.depthFunc(513);break;case ba:r.depthFunc(515);break;case Sf:r.depthFunc(514);break;case Ef:r.depthFunc(518);break;case Tf:r.depthFunc(516);break;case Af:r.depthFunc(517);break;default:r.depthFunc(515)}else r.depthFunc(515);ct=mt}},setLocked:function(mt){L=mt},setClear:function(mt){Et!==mt&&(r.clearDepth(mt),Et=mt)},reset:function(){L=!1,dt=null,ct=null,Et=null}}}function o(){let L=!1,dt=null,ct=null,Et=null,mt=null,Tt=null,lt=null,Lt=null,Qt=null;return{setTest:function(kt){L||(kt?xt(2960):W(2960))},setMask:function(kt){dt!==kt&&!L&&(r.stencilMask(kt),dt=kt)},setFunc:function(kt,Xe,qe){(ct!==kt||Et!==Xe||mt!==qe)&&(r.stencilFunc(kt,Xe,qe),ct=kt,Et=Xe,mt=qe)},setOp:function(kt,Xe,qe){(Tt!==kt||lt!==Xe||Lt!==qe)&&(r.stencilOp(kt,Xe,qe),Tt=kt,lt=Xe,Lt=qe)},setLocked:function(kt){L=kt},setClear:function(kt){Qt!==kt&&(r.clearStencil(kt),Qt=kt)},reset:function(){L=!1,dt=null,ct=null,Et=null,mt=null,Tt=null,lt=null,Lt=null,Qt=null}}}const a=new i,l=new s,c=new o;let h={},u={},d=new WeakMap,f=[],g=null,m=!1,p=null,x=null,v=null,w=null,y=null,b=null,C=null,R=!1,D=null,V=null,F=null,_=null,A=null;const j=r.getParameter(35661);let I=!1,z=0;const B=r.getParameter(7938);B.indexOf("WebGL")!==-1?(z=parseFloat(/^WebGL (\d)/.exec(B)[1]),I=z>=1):B.indexOf("OpenGL ES")!==-1&&(z=parseFloat(/^OpenGL ES (\d)/.exec(B)[1]),I=z>=2);let k=null,P={};const X=r.getParameter(3088),Y=r.getParameter(2978),Q=new Jt().fromArray(X),K=new Jt().fromArray(Y);function at(L,dt,ct){const Et=new Uint8Array(4),mt=r.createTexture();r.bindTexture(L,mt),r.texParameteri(L,10241,9728),r.texParameteri(L,10240,9728);for(let Tt=0;Tt<ct;Tt++)r.texImage2D(dt+Tt,0,6408,1,1,0,6408,5121,Et);return mt}const bt={};bt[3553]=at(3553,3553,1),bt[34067]=at(34067,34069,6),a.setClear(0,0,0,1),l.setClear(1),c.setClear(0),xt(2929),l.setFunc(ba),rt(!1),gt(Rl),xt(2884),G(En);function xt(L){h[L]!==!0&&(r.enable(L),h[L]=!0)}function W(L){h[L]!==!1&&(r.disable(L),h[L]=!1)}function pt(L,dt){return u[L]!==dt?(r.bindFramebuffer(L,dt),u[L]=dt,n&&(L===36009&&(u[36160]=dt),L===36160&&(u[36009]=dt)),!0):!1}function yt(L,dt){let ct=f,Et=!1;if(L)if(ct=d.get(dt),ct===void 0&&(ct=[],d.set(dt,ct)),L.isWebGLMultipleRenderTargets){const mt=L.texture;if(ct.length!==mt.length||ct[0]!==36064){for(let Tt=0,lt=mt.length;Tt<lt;Tt++)ct[Tt]=36064+Tt;ct.length=mt.length,Et=!0}}else ct[0]!==36064&&(ct[0]=36064,Et=!0);else ct[0]!==1029&&(ct[0]=1029,Et=!0);Et&&(e.isWebGL2?r.drawBuffers(ct):t.get("WEBGL_draw_buffers").drawBuffersWEBGL(ct))}function wt(L){return g!==L?(r.useProgram(L),g=L,!0):!1}const it={[bi]:32774,[hf]:32778,[uf]:32779};if(n)it[Nl]=32775,it[Fl]=32776;else{const L=t.get("EXT_blend_minmax");L!==null&&(it[Nl]=L.MIN_EXT,it[Fl]=L.MAX_EXT)}const Ct={[df]:0,[ff]:1,[pf]:768,[Hh]:770,[yf]:776,[_f]:774,[gf]:772,[mf]:769,[Vh]:771,[vf]:775,[xf]:773};function G(L,dt,ct,Et,mt,Tt,lt,Lt){if(L===En){m===!0&&(W(3042),m=!1);return}if(m===!1&&(xt(3042),m=!0),L!==cf){if(L!==p||Lt!==R){if((x!==bi||y!==bi)&&(r.blendEquation(32774),x=bi,y=bi),Lt)switch(L){case Ri:r.blendFuncSeparate(1,771,1,771);break;case Pl:r.blendFunc(1,1);break;case Il:r.blendFuncSeparate(0,769,0,1);break;case Dl:r.blendFuncSeparate(0,768,0,770);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}else switch(L){case Ri:r.blendFuncSeparate(770,771,1,771);break;case Pl:r.blendFunc(770,1);break;case Il:r.blendFuncSeparate(0,769,0,1);break;case Dl:r.blendFunc(0,768);break;default:console.error("THREE.WebGLState: Invalid blending: ",L);break}v=null,w=null,b=null,C=null,p=L,R=Lt}return}mt=mt||dt,Tt=Tt||ct,lt=lt||Et,(dt!==x||mt!==y)&&(r.blendEquationSeparate(it[dt],it[mt]),x=dt,y=mt),(ct!==v||Et!==w||Tt!==b||lt!==C)&&(r.blendFuncSeparate(Ct[ct],Ct[Et],Ct[Tt],Ct[lt]),v=ct,w=Et,b=Tt,C=lt),p=L,R=null}function $(L,dt){L.side===ki?W(2884):xt(2884);let ct=L.side===Ve;dt&&(ct=!ct),rt(ct),L.blending===Ri&&L.transparent===!1?G(En):G(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.premultipliedAlpha),l.setFunc(L.depthFunc),l.setTest(L.depthTest),l.setMask(L.depthWrite),a.setMask(L.colorWrite);const Et=L.stencilWrite;c.setTest(Et),Et&&(c.setMask(L.stencilWriteMask),c.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),c.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),nt(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?xt(32926):W(32926)}function rt(L){D!==L&&(L?r.frontFace(2304):r.frontFace(2305),D=L)}function gt(L){L!==of?(xt(2884),L!==V&&(L===Rl?r.cullFace(1029):L===af?r.cullFace(1028):r.cullFace(1032))):W(2884),V=L}function Z(L){L!==F&&(I&&r.lineWidth(L),F=L)}function nt(L,dt,ct){L?(xt(32823),(_!==dt||A!==ct)&&(r.polygonOffset(dt,ct),_=dt,A=ct)):W(32823)}function st(L){L?xt(3089):W(3089)}function ot(L){L===void 0&&(L=33984+j-1),k!==L&&(r.activeTexture(L),k=L)}function It(L,dt){k===null&&ot();let ct=P[k];ct===void 0&&(ct={type:void 0,texture:void 0},P[k]=ct),(ct.type!==L||ct.texture!==dt)&&(r.bindTexture(L,dt||bt[L]),ct.type=L,ct.texture=dt)}function zt(){const L=P[k];L!==void 0&&L.type!==void 0&&(r.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function E(){try{r.compressedTexImage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function M(){try{r.texSubImage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function U(){try{r.texSubImage3D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function tt(){try{r.compressedTexSubImage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ut(){try{r.texStorage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function ft(){try{r.texStorage3D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function St(){try{r.texImage2D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function q(){try{r.texImage3D.apply(r,arguments)}catch(L){console.error("THREE.WebGLState:",L)}}function Dt(L){Q.equals(L)===!1&&(r.scissor(L.x,L.y,L.z,L.w),Q.copy(L))}function Bt(L){K.equals(L)===!1&&(r.viewport(L.x,L.y,L.z,L.w),K.copy(L))}function _t(){r.disable(3042),r.disable(2884),r.disable(2929),r.disable(32823),r.disable(3089),r.disable(2960),r.disable(32926),r.blendEquation(32774),r.blendFunc(1,0),r.blendFuncSeparate(1,0,1,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(513),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(519,0,4294967295),r.stencilOp(7680,7680,7680),r.clearStencil(0),r.cullFace(1029),r.frontFace(2305),r.polygonOffset(0,0),r.activeTexture(33984),r.bindFramebuffer(36160,null),n===!0&&(r.bindFramebuffer(36009,null),r.bindFramebuffer(36008,null)),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),h={},k=null,P={},u={},d=new WeakMap,f=[],g=null,m=!1,p=null,x=null,v=null,w=null,y=null,b=null,C=null,R=!1,D=null,V=null,F=null,_=null,A=null,Q.set(0,0,r.canvas.width,r.canvas.height),K.set(0,0,r.canvas.width,r.canvas.height),a.reset(),l.reset(),c.reset()}return{buffers:{color:a,depth:l,stencil:c},enable:xt,disable:W,bindFramebuffer:pt,drawBuffers:yt,useProgram:wt,setBlending:G,setMaterial:$,setFlipSided:rt,setCullFace:gt,setLineWidth:Z,setPolygonOffset:nt,setScissorTest:st,activeTexture:ot,bindTexture:It,unbindTexture:zt,compressedTexImage2D:E,texImage2D:St,texImage3D:q,texStorage2D:ut,texStorage3D:ft,texSubImage2D:M,texSubImage3D:U,compressedTexSubImage2D:tt,scissor:Dt,viewport:Bt,reset:_t}}function kx(r,t,e,n,i,s,o){const a=i.isWebGL2,l=i.maxTextures,c=i.maxCubemapSize,h=i.maxTextureSize,u=i.maxSamples,d=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,f=/OculusBrowser/g.test(navigator.userAgent),g=new WeakMap;let m;const p=new WeakMap;let x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(E,M){return x?new OffscreenCanvas(E,M):Er("canvas")}function w(E,M,U,tt){let ut=1;if((E.width>tt||E.height>tt)&&(ut=tt/Math.max(E.width,E.height)),ut<1||M===!0)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap){const ft=M?La:Math.floor,St=ft(ut*E.width),q=ft(ut*E.height);m===void 0&&(m=v(St,q));const Dt=U?v(St,q):m;return Dt.width=St,Dt.height=q,Dt.getContext("2d").drawImage(E,0,0,St,q),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+E.width+"x"+E.height+") to ("+St+"x"+q+")."),Dt}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+E.width+"x"+E.height+")."),E;return E}function y(E){return oc(E.width)&&oc(E.height)}function b(E){return a?!1:E.wrapS!==ke||E.wrapT!==ke||E.minFilter!==de&&E.minFilter!==Se}function C(E,M){return E.generateMipmaps&&M&&E.minFilter!==de&&E.minFilter!==Se}function R(E){r.generateMipmap(E)}function D(E,M,U,tt,ut=!1){if(a===!1)return M;if(E!==null){if(r[E]!==void 0)return r[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let ft=M;return M===6403&&(U===5126&&(ft=33326),U===5131&&(ft=33325),U===5121&&(ft=33321)),M===33319&&(U===5126&&(ft=33328),U===5131&&(ft=33327),U===5121&&(ft=33323)),M===6408&&(U===5126&&(ft=34836),U===5131&&(ft=34842),U===5121&&(ft=tt===te&&ut===!1?35907:32856),U===32819&&(ft=32854),U===32820&&(ft=32855)),(ft===33325||ft===33326||ft===33327||ft===33328||ft===34842||ft===34836)&&t.get("EXT_color_buffer_float"),ft}function V(E,M,U){return C(E,U)===!0||E.isFramebufferTexture&&E.minFilter!==de&&E.minFilter!==Se?Math.log2(Math.max(M.width,M.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?M.mipmaps.length:1}function F(E){return E===de||E===Bl||E===Ol?9728:9729}function _(E){const M=E.target;M.removeEventListener("dispose",_),j(M),M.isVideoTexture&&g.delete(M)}function A(E){const M=E.target;M.removeEventListener("dispose",A),z(M)}function j(E){const M=n.get(E);if(M.__webglInit===void 0)return;const U=E.source,tt=p.get(U);if(tt){const ut=tt[M.__cacheKey];ut.usedTimes--,ut.usedTimes===0&&I(E),Object.keys(tt).length===0&&p.delete(U)}n.remove(E)}function I(E){const M=n.get(E);r.deleteTexture(M.__webglTexture);const U=E.source,tt=p.get(U);delete tt[M.__cacheKey],o.memory.textures--}function z(E){const M=E.texture,U=n.get(E),tt=n.get(M);if(tt.__webglTexture!==void 0&&(r.deleteTexture(tt.__webglTexture),o.memory.textures--),E.depthTexture&&E.depthTexture.dispose(),E.isWebGLCubeRenderTarget)for(let ut=0;ut<6;ut++)r.deleteFramebuffer(U.__webglFramebuffer[ut]),U.__webglDepthbuffer&&r.deleteRenderbuffer(U.__webglDepthbuffer[ut]);else r.deleteFramebuffer(U.__webglFramebuffer),U.__webglDepthbuffer&&r.deleteRenderbuffer(U.__webglDepthbuffer),U.__webglMultisampledFramebuffer&&r.deleteFramebuffer(U.__webglMultisampledFramebuffer),U.__webglColorRenderbuffer&&r.deleteRenderbuffer(U.__webglColorRenderbuffer),U.__webglDepthRenderbuffer&&r.deleteRenderbuffer(U.__webglDepthRenderbuffer);if(E.isWebGLMultipleRenderTargets)for(let ut=0,ft=M.length;ut<ft;ut++){const St=n.get(M[ut]);St.__webglTexture&&(r.deleteTexture(St.__webglTexture),o.memory.textures--),n.remove(M[ut])}n.remove(M),n.remove(E)}let B=0;function k(){B=0}function P(){const E=B;return E>=l&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+l),B+=1,E}function X(E){const M=[];return M.push(E.wrapS),M.push(E.wrapT),M.push(E.magFilter),M.push(E.minFilter),M.push(E.anisotropy),M.push(E.internalFormat),M.push(E.format),M.push(E.type),M.push(E.generateMipmaps),M.push(E.premultiplyAlpha),M.push(E.flipY),M.push(E.unpackAlignment),M.push(E.encoding),M.join()}function Y(E,M){const U=n.get(E);if(E.isVideoTexture&&It(E),E.isRenderTargetTexture===!1&&E.version>0&&U.__version!==E.version){const tt=E.image;if(tt===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(tt.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{yt(U,E,M);return}}e.activeTexture(33984+M),e.bindTexture(3553,U.__webglTexture)}function Q(E,M){const U=n.get(E);if(E.version>0&&U.__version!==E.version){yt(U,E,M);return}e.activeTexture(33984+M),e.bindTexture(35866,U.__webglTexture)}function K(E,M){const U=n.get(E);if(E.version>0&&U.__version!==E.version){yt(U,E,M);return}e.activeTexture(33984+M),e.bindTexture(32879,U.__webglTexture)}function at(E,M){const U=n.get(E);if(E.version>0&&U.__version!==E.version){wt(U,E,M);return}e.activeTexture(33984+M),e.bindTexture(34067,U.__webglTexture)}const bt={[Ea]:10497,[ke]:33071,[Ta]:33648},xt={[de]:9728,[Bl]:9984,[Ol]:9986,[Se]:9729,[Ff]:9985,[co]:9987};function W(E,M,U){if(U?(r.texParameteri(E,10242,bt[M.wrapS]),r.texParameteri(E,10243,bt[M.wrapT]),(E===32879||E===35866)&&r.texParameteri(E,32882,bt[M.wrapR]),r.texParameteri(E,10240,xt[M.magFilter]),r.texParameteri(E,10241,xt[M.minFilter])):(r.texParameteri(E,10242,33071),r.texParameteri(E,10243,33071),(E===32879||E===35866)&&r.texParameteri(E,32882,33071),(M.wrapS!==ke||M.wrapT!==ke)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),r.texParameteri(E,10240,F(M.magFilter)),r.texParameteri(E,10241,F(M.minFilter)),M.minFilter!==de&&M.minFilter!==Se&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),t.has("EXT_texture_filter_anisotropic")===!0){const tt=t.get("EXT_texture_filter_anisotropic");if(M.type===kn&&t.has("OES_texture_float_linear")===!1||a===!1&&M.type===Pi&&t.has("OES_texture_half_float_linear")===!1)return;(M.anisotropy>1||n.get(M).__currentAnisotropy)&&(r.texParameterf(E,tt.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,i.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy)}}function pt(E,M){let U=!1;E.__webglInit===void 0&&(E.__webglInit=!0,M.addEventListener("dispose",_));const tt=M.source;let ut=p.get(tt);ut===void 0&&(ut={},p.set(tt,ut));const ft=X(M);if(ft!==E.__cacheKey){ut[ft]===void 0&&(ut[ft]={texture:r.createTexture(),usedTimes:0},o.memory.textures++,U=!0),ut[ft].usedTimes++;const St=ut[E.__cacheKey];St!==void 0&&(ut[E.__cacheKey].usedTimes--,St.usedTimes===0&&I(M)),E.__cacheKey=ft,E.__webglTexture=ut[ft].texture}return U}function yt(E,M,U){let tt=3553;M.isDataArrayTexture&&(tt=35866),M.isData3DTexture&&(tt=32879);const ut=pt(E,M),ft=M.source;if(e.activeTexture(33984+U),e.bindTexture(tt,E.__webglTexture),ft.version!==ft.__currentVersion||ut===!0){r.pixelStorei(37440,M.flipY),r.pixelStorei(37441,M.premultiplyAlpha),r.pixelStorei(3317,M.unpackAlignment),r.pixelStorei(37443,0);const St=b(M)&&y(M.image)===!1;let q=w(M.image,St,!1,h);q=zt(M,q);const Dt=y(q)||a,Bt=s.convert(M.format,M.encoding);let _t=s.convert(M.type),L=D(M.internalFormat,Bt,_t,M.encoding,M.isVideoTexture);W(tt,M,Dt);let dt;const ct=M.mipmaps,Et=a&&M.isVideoTexture!==!0,mt=E.__version===void 0,Tt=V(M,q,Dt);if(M.isDepthTexture)L=6402,a?M.type===kn?L=36012:M.type===As?L=33190:M.type===Ii?L=35056:L=33189:M.type===kn&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),M.format===$n&&L===6402&&M.type!==wr&&M.type!==As&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),M.type=wr,_t=s.convert(M.type)),M.format===Gi&&L===6402&&(L=34041,M.type!==Ii&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),M.type=Ii,_t=s.convert(M.type))),Et&&mt?e.texStorage2D(3553,1,L,q.width,q.height):e.texImage2D(3553,0,L,q.width,q.height,0,Bt,_t,null);else if(M.isDataTexture)if(ct.length>0&&Dt){Et&&mt&&e.texStorage2D(3553,Tt,L,ct[0].width,ct[0].height);for(let lt=0,Lt=ct.length;lt<Lt;lt++)dt=ct[lt],Et?e.texSubImage2D(3553,lt,0,0,dt.width,dt.height,Bt,_t,dt.data):e.texImage2D(3553,lt,L,dt.width,dt.height,0,Bt,_t,dt.data);M.generateMipmaps=!1}else Et?(mt&&e.texStorage2D(3553,Tt,L,q.width,q.height),e.texSubImage2D(3553,0,0,0,q.width,q.height,Bt,_t,q.data)):e.texImage2D(3553,0,L,q.width,q.height,0,Bt,_t,q.data);else if(M.isCompressedTexture){Et&&mt&&e.texStorage2D(3553,Tt,L,ct[0].width,ct[0].height);for(let lt=0,Lt=ct.length;lt<Lt;lt++)dt=ct[lt],M.format!==He?Bt!==null?Et?e.compressedTexSubImage2D(3553,lt,0,0,dt.width,dt.height,Bt,dt.data):e.compressedTexImage2D(3553,lt,L,dt.width,dt.height,0,dt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Et?e.texSubImage2D(3553,lt,0,0,dt.width,dt.height,Bt,_t,dt.data):e.texImage2D(3553,lt,L,dt.width,dt.height,0,Bt,_t,dt.data)}else if(M.isDataArrayTexture)Et?(mt&&e.texStorage3D(35866,Tt,L,q.width,q.height,q.depth),e.texSubImage3D(35866,0,0,0,0,q.width,q.height,q.depth,Bt,_t,q.data)):e.texImage3D(35866,0,L,q.width,q.height,q.depth,0,Bt,_t,q.data);else if(M.isData3DTexture)Et?(mt&&e.texStorage3D(32879,Tt,L,q.width,q.height,q.depth),e.texSubImage3D(32879,0,0,0,0,q.width,q.height,q.depth,Bt,_t,q.data)):e.texImage3D(32879,0,L,q.width,q.height,q.depth,0,Bt,_t,q.data);else if(M.isFramebufferTexture)Et&&mt?e.texStorage2D(3553,Tt,L,q.width,q.height):e.texImage2D(3553,0,L,q.width,q.height,0,Bt,_t,null);else if(ct.length>0&&Dt){Et&&mt&&e.texStorage2D(3553,Tt,L,ct[0].width,ct[0].height);for(let lt=0,Lt=ct.length;lt<Lt;lt++)dt=ct[lt],Et?e.texSubImage2D(3553,lt,0,0,Bt,_t,dt):e.texImage2D(3553,lt,L,Bt,_t,dt);M.generateMipmaps=!1}else Et?(mt&&e.texStorage2D(3553,Tt,L,q.width,q.height),e.texSubImage2D(3553,0,0,0,Bt,_t,q)):e.texImage2D(3553,0,L,Bt,_t,q);C(M,Dt)&&R(tt),ft.__currentVersion=ft.version,M.onUpdate&&M.onUpdate(M)}E.__version=M.version}function wt(E,M,U){if(M.image.length!==6)return;const tt=pt(E,M),ut=M.source;if(e.activeTexture(33984+U),e.bindTexture(34067,E.__webglTexture),ut.version!==ut.__currentVersion||tt===!0){r.pixelStorei(37440,M.flipY),r.pixelStorei(37441,M.premultiplyAlpha),r.pixelStorei(3317,M.unpackAlignment),r.pixelStorei(37443,0);const ft=M.isCompressedTexture||M.image[0].isCompressedTexture,St=M.image[0]&&M.image[0].isDataTexture,q=[];for(let lt=0;lt<6;lt++)!ft&&!St?q[lt]=w(M.image[lt],!1,!0,c):q[lt]=St?M.image[lt].image:M.image[lt],q[lt]=zt(M,q[lt]);const Dt=q[0],Bt=y(Dt)||a,_t=s.convert(M.format,M.encoding),L=s.convert(M.type),dt=D(M.internalFormat,_t,L,M.encoding),ct=a&&M.isVideoTexture!==!0,Et=E.__version===void 0;let mt=V(M,Dt,Bt);W(34067,M,Bt);let Tt;if(ft){ct&&Et&&e.texStorage2D(34067,mt,dt,Dt.width,Dt.height);for(let lt=0;lt<6;lt++){Tt=q[lt].mipmaps;for(let Lt=0;Lt<Tt.length;Lt++){const Qt=Tt[Lt];M.format!==He?_t!==null?ct?e.compressedTexSubImage2D(34069+lt,Lt,0,0,Qt.width,Qt.height,_t,Qt.data):e.compressedTexImage2D(34069+lt,Lt,dt,Qt.width,Qt.height,0,Qt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):ct?e.texSubImage2D(34069+lt,Lt,0,0,Qt.width,Qt.height,_t,L,Qt.data):e.texImage2D(34069+lt,Lt,dt,Qt.width,Qt.height,0,_t,L,Qt.data)}}}else{Tt=M.mipmaps,ct&&Et&&(Tt.length>0&&mt++,e.texStorage2D(34067,mt,dt,q[0].width,q[0].height));for(let lt=0;lt<6;lt++)if(St){ct?e.texSubImage2D(34069+lt,0,0,0,q[lt].width,q[lt].height,_t,L,q[lt].data):e.texImage2D(34069+lt,0,dt,q[lt].width,q[lt].height,0,_t,L,q[lt].data);for(let Lt=0;Lt<Tt.length;Lt++){const kt=Tt[Lt].image[lt].image;ct?e.texSubImage2D(34069+lt,Lt+1,0,0,kt.width,kt.height,_t,L,kt.data):e.texImage2D(34069+lt,Lt+1,dt,kt.width,kt.height,0,_t,L,kt.data)}}else{ct?e.texSubImage2D(34069+lt,0,0,0,_t,L,q[lt]):e.texImage2D(34069+lt,0,dt,_t,L,q[lt]);for(let Lt=0;Lt<Tt.length;Lt++){const Qt=Tt[Lt];ct?e.texSubImage2D(34069+lt,Lt+1,0,0,_t,L,Qt.image[lt]):e.texImage2D(34069+lt,Lt+1,dt,_t,L,Qt.image[lt])}}}C(M,Bt)&&R(34067),ut.__currentVersion=ut.version,M.onUpdate&&M.onUpdate(M)}E.__version=M.version}function it(E,M,U,tt,ut){const ft=s.convert(U.format,U.encoding),St=s.convert(U.type),q=D(U.internalFormat,ft,St,U.encoding);n.get(M).__hasExternalTextures||(ut===32879||ut===35866?e.texImage3D(ut,0,q,M.width,M.height,M.depth,0,ft,St,null):e.texImage2D(ut,0,q,M.width,M.height,0,ft,St,null)),e.bindFramebuffer(36160,E),ot(M)?d.framebufferTexture2DMultisampleEXT(36160,tt,ut,n.get(U).__webglTexture,0,st(M)):r.framebufferTexture2D(36160,tt,ut,n.get(U).__webglTexture,0),e.bindFramebuffer(36160,null)}function Ct(E,M,U){if(r.bindRenderbuffer(36161,E),M.depthBuffer&&!M.stencilBuffer){let tt=33189;if(U||ot(M)){const ut=M.depthTexture;ut&&ut.isDepthTexture&&(ut.type===kn?tt=36012:ut.type===As&&(tt=33190));const ft=st(M);ot(M)?d.renderbufferStorageMultisampleEXT(36161,ft,tt,M.width,M.height):r.renderbufferStorageMultisample(36161,ft,tt,M.width,M.height)}else r.renderbufferStorage(36161,tt,M.width,M.height);r.framebufferRenderbuffer(36160,36096,36161,E)}else if(M.depthBuffer&&M.stencilBuffer){const tt=st(M);U&&ot(M)===!1?r.renderbufferStorageMultisample(36161,tt,35056,M.width,M.height):ot(M)?d.renderbufferStorageMultisampleEXT(36161,tt,35056,M.width,M.height):r.renderbufferStorage(36161,34041,M.width,M.height),r.framebufferRenderbuffer(36160,33306,36161,E)}else{const tt=M.isWebGLMultipleRenderTargets===!0?M.texture[0]:M.texture,ut=s.convert(tt.format,tt.encoding),ft=s.convert(tt.type),St=D(tt.internalFormat,ut,ft,tt.encoding),q=st(M);U&&ot(M)===!1?r.renderbufferStorageMultisample(36161,q,St,M.width,M.height):ot(M)?d.renderbufferStorageMultisampleEXT(36161,q,St,M.width,M.height):r.renderbufferStorage(36161,St,M.width,M.height)}r.bindRenderbuffer(36161,null)}function G(E,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(36160,E),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(M.depthTexture).__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),Y(M.depthTexture,0);const tt=n.get(M.depthTexture).__webglTexture,ut=st(M);if(M.depthTexture.format===$n)ot(M)?d.framebufferTexture2DMultisampleEXT(36160,36096,3553,tt,0,ut):r.framebufferTexture2D(36160,36096,3553,tt,0);else if(M.depthTexture.format===Gi)ot(M)?d.framebufferTexture2DMultisampleEXT(36160,33306,3553,tt,0,ut):r.framebufferTexture2D(36160,33306,3553,tt,0);else throw new Error("Unknown depthTexture format")}function $(E){const M=n.get(E),U=E.isWebGLCubeRenderTarget===!0;if(E.depthTexture&&!M.__autoAllocateDepthBuffer){if(U)throw new Error("target.depthTexture not supported in Cube render targets");G(M.__webglFramebuffer,E)}else if(U){M.__webglDepthbuffer=[];for(let tt=0;tt<6;tt++)e.bindFramebuffer(36160,M.__webglFramebuffer[tt]),M.__webglDepthbuffer[tt]=r.createRenderbuffer(),Ct(M.__webglDepthbuffer[tt],E,!1)}else e.bindFramebuffer(36160,M.__webglFramebuffer),M.__webglDepthbuffer=r.createRenderbuffer(),Ct(M.__webglDepthbuffer,E,!1);e.bindFramebuffer(36160,null)}function rt(E,M,U){const tt=n.get(E);M!==void 0&&it(tt.__webglFramebuffer,E,E.texture,36064,3553),U!==void 0&&$(E)}function gt(E){const M=E.texture,U=n.get(E),tt=n.get(M);E.addEventListener("dispose",A),E.isWebGLMultipleRenderTargets!==!0&&(tt.__webglTexture===void 0&&(tt.__webglTexture=r.createTexture()),tt.__version=M.version,o.memory.textures++);const ut=E.isWebGLCubeRenderTarget===!0,ft=E.isWebGLMultipleRenderTargets===!0,St=y(E)||a;if(ut){U.__webglFramebuffer=[];for(let q=0;q<6;q++)U.__webglFramebuffer[q]=r.createFramebuffer()}else if(U.__webglFramebuffer=r.createFramebuffer(),ft)if(i.drawBuffers){const q=E.texture;for(let Dt=0,Bt=q.length;Dt<Bt;Dt++){const _t=n.get(q[Dt]);_t.__webglTexture===void 0&&(_t.__webglTexture=r.createTexture(),o.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");else if(a&&E.samples>0&&ot(E)===!1){U.__webglMultisampledFramebuffer=r.createFramebuffer(),U.__webglColorRenderbuffer=r.createRenderbuffer(),r.bindRenderbuffer(36161,U.__webglColorRenderbuffer);const q=s.convert(M.format,M.encoding),Dt=s.convert(M.type),Bt=D(M.internalFormat,q,Dt,M.encoding),_t=st(E);r.renderbufferStorageMultisample(36161,_t,Bt,E.width,E.height),e.bindFramebuffer(36160,U.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(36160,36064,36161,U.__webglColorRenderbuffer),r.bindRenderbuffer(36161,null),E.depthBuffer&&(U.__webglDepthRenderbuffer=r.createRenderbuffer(),Ct(U.__webglDepthRenderbuffer,E,!0)),e.bindFramebuffer(36160,null)}if(ut){e.bindTexture(34067,tt.__webglTexture),W(34067,M,St);for(let q=0;q<6;q++)it(U.__webglFramebuffer[q],E,M,36064,34069+q);C(M,St)&&R(34067),e.unbindTexture()}else if(ft){const q=E.texture;for(let Dt=0,Bt=q.length;Dt<Bt;Dt++){const _t=q[Dt],L=n.get(_t);e.bindTexture(3553,L.__webglTexture),W(3553,_t,St),it(U.__webglFramebuffer,E,_t,36064+Dt,3553),C(_t,St)&&R(3553)}e.unbindTexture()}else{let q=3553;(E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(a?q=E.isWebGL3DRenderTarget?32879:35866:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),e.bindTexture(q,tt.__webglTexture),W(q,M,St),it(U.__webglFramebuffer,E,M,36064,q),C(M,St)&&R(q),e.unbindTexture()}E.depthBuffer&&$(E)}function Z(E){const M=y(E)||a,U=E.isWebGLMultipleRenderTargets===!0?E.texture:[E.texture];for(let tt=0,ut=U.length;tt<ut;tt++){const ft=U[tt];if(C(ft,M)){const St=E.isWebGLCubeRenderTarget?34067:3553,q=n.get(ft).__webglTexture;e.bindTexture(St,q),R(St),e.unbindTexture()}}}function nt(E){if(a&&E.samples>0&&ot(E)===!1){const M=E.width,U=E.height;let tt=16384;const ut=[36064],ft=E.stencilBuffer?33306:36096;E.depthBuffer&&ut.push(ft);const St=n.get(E),q=St.__ignoreDepthValues!==void 0?St.__ignoreDepthValues:!1;q===!1&&(E.depthBuffer&&(tt|=256),E.stencilBuffer&&(tt|=1024)),e.bindFramebuffer(36008,St.__webglMultisampledFramebuffer),e.bindFramebuffer(36009,St.__webglFramebuffer),q===!0&&(r.invalidateFramebuffer(36008,[ft]),r.invalidateFramebuffer(36009,[ft])),r.blitFramebuffer(0,0,M,U,0,0,M,U,tt,9728),f&&r.invalidateFramebuffer(36008,ut),e.bindFramebuffer(36008,null),e.bindFramebuffer(36009,St.__webglMultisampledFramebuffer)}}function st(E){return Math.min(u,E.samples)}function ot(E){const M=n.get(E);return a&&E.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function It(E){const M=o.render.frame;g.get(E)!==M&&(g.set(E,M),E.update())}function zt(E,M){const U=E.encoding,tt=E.format,ut=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||E.format===Aa||U!==pn&&(U===te?a===!1?t.has("EXT_sRGB")===!0&&tt===He?(E.format=Aa,E.minFilter=Se,E.generateMipmaps=!1):M=Kn.sRGBToLinear(M):(tt!==He||ut!==Yn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture encoding:",U)),M}this.allocateTextureUnit=P,this.resetTextureUnits=k,this.setTexture2D=Y,this.setTexture2DArray=Q,this.setTexture3D=K,this.setTextureCube=at,this.rebindTextures=rt,this.setupRenderTarget=gt,this.updateRenderTargetMipmap=Z,this.updateMultisampleRenderTarget=nt,this.setupDepthRenderbuffer=$,this.setupFrameBufferTexture=it,this.useMultisampledRTT=ot}function Hx(r,t,e){const n=e.isWebGL2;function i(s,o=null){let a;if(s===Yn)return 5121;if(s===Uf)return 32819;if(s===kf)return 32820;if(s===Bf)return 5120;if(s===Of)return 5122;if(s===wr)return 5123;if(s===zf)return 5124;if(s===As)return 5125;if(s===kn)return 5126;if(s===Pi)return n?5131:(a=t.get("OES_texture_half_float"),a!==null?a.HALF_FLOAT_OES:null);if(s===Hf)return 6406;if(s===He)return 6408;if(s===Gf)return 6409;if(s===Wf)return 6410;if(s===$n)return 6402;if(s===Gi)return 34041;if(s===Xf)return 6403;if(s===Vf)return console.warn("THREE.WebGLRenderer: THREE.RGBFormat has been removed. Use THREE.RGBAFormat instead. https://github.com/mrdoob/three.js/pull/23228"),6408;if(s===Aa)return a=t.get("EXT_sRGB"),a!==null?a.SRGB_ALPHA_EXT:null;if(s===qf)return 36244;if(s===jf)return 33319;if(s===$f)return 33320;if(s===Jf)return 36249;if(s===Ro||s===Po||s===Io||s===Do)if(o===te)if(a=t.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(s===Ro)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===Po)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===Io)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===Do)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=t.get("WEBGL_compressed_texture_s3tc"),a!==null){if(s===Ro)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Po)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===Io)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===Do)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===zl||s===Ul||s===kl||s===Hl)if(a=t.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(s===zl)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===Ul)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===kl)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===Hl)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===Yf)return a=t.get("WEBGL_compressed_texture_etc1"),a!==null?a.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===Vl||s===Gl)if(a=t.get("WEBGL_compressed_texture_etc"),a!==null){if(s===Vl)return o===te?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(s===Gl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===Wl||s===Xl||s===ql||s===jl||s===$l||s===Jl||s===Yl||s===Zl||s===Kl||s===Ql||s===tc||s===ec||s===nc||s===ic)if(a=t.get("WEBGL_compressed_texture_astc"),a!==null){if(s===Wl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===Xl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===ql)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===jl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===$l)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===Jl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===Yl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===Zl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===Kl)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===Ql)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===tc)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===ec)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===nc)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===ic)return o===te?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===rc)if(a=t.get("EXT_texture_compression_bptc"),a!==null){if(s===rc)return o===te?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT}else return null;if(s===Ii)return n?34042:(a=t.get("WEBGL_depth_texture"),a!==null?a.UNSIGNED_INT_24_8_WEBGL:null)}return{convert:i}}class au extends Ee{constructor(t=[]){super(),this.cameras=t}}au.prototype.isArrayCamera=!0;class gr extends $t{constructor(){super(),this.type="Group"}}gr.prototype.isGroup=!0;const Vx={type:"move"};class ca{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new gr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new gr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new T,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new T),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new gr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new T,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new T),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred")if(a!==null&&(i=e.getPose(t.targetRaySpace,n),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Vx))),c&&t.hand){o=!0;for(const m of t.hand.values()){const p=e.getJointPose(m,n);if(c.joints[m.jointName]===void 0){const v=new gr;v.matrixAutoUpdate=!1,v.visible=!1,c.joints[m.jointName]=v,c.add(v)}const x=c.joints[m.jointName];p!==null&&(x.matrix.fromArray(p.transform.matrix),x.matrix.decompose(x.position,x.rotation,x.scale),x.jointRadius=p.radius),x.visible=p!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}}class lu extends fe{constructor(t,e,n,i,s,o,a,l,c,h){if(h=h!==void 0?h:$n,h!==$n&&h!==Gi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===$n&&(n=wr),n===void 0&&h===Gi&&(n=Ii),super(null,i,s,o,a,l,h,n,c),this.image={width:t,height:e},this.magFilter=a!==void 0?a:de,this.minFilter=l!==void 0?l:de,this.flipY=!1,this.generateMipmaps=!1}}lu.prototype.isDepthTexture=!0;class Gx extends Zn{constructor(t,e){super();const n=this;let i=null,s=1,o=null,a="local-floor",l=null,c=null,h=null,u=null,d=null;const f=e.getContextAttributes();let g=null,m=null;const p=[],x=new Map,v=new Ee;v.layers.enable(1),v.viewport=new Jt;const w=new Ee;w.layers.enable(2),w.viewport=new Jt;const y=[v,w],b=new au;b.layers.enable(1),b.layers.enable(2);let C=null,R=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(P){let X=p[P];return X===void 0&&(X=new ca,p[P]=X),X.getTargetRaySpace()},this.getControllerGrip=function(P){let X=p[P];return X===void 0&&(X=new ca,p[P]=X),X.getGripSpace()},this.getHand=function(P){let X=p[P];return X===void 0&&(X=new ca,p[P]=X),X.getHandSpace()};function D(P){const X=x.get(P.inputSource);X&&X.dispatchEvent({type:P.type,data:P.inputSource})}function V(){x.forEach(function(P,X){P.disconnect(X)}),x.clear(),C=null,R=null,t.setRenderTarget(g),u=null,h=null,c=null,i=null,m=null,k.stop(),n.isPresenting=!1,n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(P){s=P,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(P){a=P,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return o},this.getBaseLayer=function(){return h!==null?h:u},this.getBinding=function(){return c},this.getFrame=function(){return d},this.getSession=function(){return i},this.setSession=async function(P){if(i=P,i!==null){if(g=t.getRenderTarget(),i.addEventListener("select",D),i.addEventListener("selectstart",D),i.addEventListener("selectend",D),i.addEventListener("squeeze",D),i.addEventListener("squeezestart",D),i.addEventListener("squeezeend",D),i.addEventListener("end",V),i.addEventListener("inputsourceschange",F),f.xrCompatible!==!0&&await e.makeXRCompatible(),i.renderState.layers===void 0||t.capabilities.isWebGL2===!1){const X={antialias:i.renderState.layers===void 0?f.antialias:!0,alpha:f.alpha,depth:f.depth,stencil:f.stencil,framebufferScaleFactor:s};u=new XRWebGLLayer(i,e,X),i.updateRenderState({baseLayer:u}),m=new Pe(u.framebufferWidth,u.framebufferHeight,{format:He,type:Yn,encoding:t.outputEncoding})}else{let X=null,Y=null,Q=null;f.depth&&(Q=f.stencil?35056:33190,X=f.stencil?Gi:$n,Y=f.stencil?Ii:wr);const K={colorFormat:t.outputEncoding===te?35907:32856,depthFormat:Q,scaleFactor:s};c=new XRWebGLBinding(i,e),h=c.createProjectionLayer(K),i.updateRenderState({layers:[h]}),m=new Pe(h.textureWidth,h.textureHeight,{format:He,type:Yn,depthTexture:new lu(h.textureWidth,h.textureHeight,Y,void 0,void 0,void 0,void 0,void 0,void 0,X),stencilBuffer:f.stencil,encoding:t.outputEncoding,samples:f.antialias?4:0});const at=t.properties.get(m);at.__ignoreDepthValues=h.ignoreDepthValues}m.isXRRenderTarget=!0,this.setFoveation(1),o=await i.requestReferenceSpace(a),k.setContext(i),k.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}};function F(P){const X=i.inputSources;for(let Y=0;Y<p.length;Y++)x.set(X[Y],p[Y]);for(let Y=0;Y<P.removed.length;Y++){const Q=P.removed[Y],K=x.get(Q);K&&(K.dispatchEvent({type:"disconnected",data:Q}),x.delete(Q))}for(let Y=0;Y<P.added.length;Y++){const Q=P.added[Y],K=x.get(Q);K&&K.dispatchEvent({type:"connected",data:Q})}}const _=new T,A=new T;function j(P,X,Y){_.setFromMatrixPosition(X.matrixWorld),A.setFromMatrixPosition(Y.matrixWorld);const Q=_.distanceTo(A),K=X.projectionMatrix.elements,at=Y.projectionMatrix.elements,bt=K[14]/(K[10]-1),xt=K[14]/(K[10]+1),W=(K[9]+1)/K[5],pt=(K[9]-1)/K[5],yt=(K[8]-1)/K[0],wt=(at[8]+1)/at[0],it=bt*yt,Ct=bt*wt,G=Q/(-yt+wt),$=G*-yt;X.matrixWorld.decompose(P.position,P.quaternion,P.scale),P.translateX($),P.translateZ(G),P.matrixWorld.compose(P.position,P.quaternion,P.scale),P.matrixWorldInverse.copy(P.matrixWorld).invert();const rt=bt+G,gt=xt+G,Z=it-$,nt=Ct+(Q-$),st=W*xt/gt*rt,ot=pt*xt/gt*rt;P.projectionMatrix.makePerspective(Z,nt,st,ot,rt,gt)}function I(P,X){X===null?P.matrixWorld.copy(P.matrix):P.matrixWorld.multiplyMatrices(X.matrixWorld,P.matrix),P.matrixWorldInverse.copy(P.matrixWorld).invert()}this.updateCamera=function(P){if(i===null)return;b.near=w.near=v.near=P.near,b.far=w.far=v.far=P.far,(C!==b.near||R!==b.far)&&(i.updateRenderState({depthNear:b.near,depthFar:b.far}),C=b.near,R=b.far);const X=P.parent,Y=b.cameras;I(b,X);for(let K=0;K<Y.length;K++)I(Y[K],X);b.matrixWorld.decompose(b.position,b.quaternion,b.scale),P.position.copy(b.position),P.quaternion.copy(b.quaternion),P.scale.copy(b.scale),P.matrix.copy(b.matrix),P.matrixWorld.copy(b.matrixWorld);const Q=P.children;for(let K=0,at=Q.length;K<at;K++)Q[K].updateMatrixWorld(!0);Y.length===2?j(b,v,w):b.projectionMatrix.copy(v.projectionMatrix)},this.getCamera=function(){return b},this.getFoveation=function(){if(h!==null)return h.fixedFoveation;if(u!==null)return u.fixedFoveation},this.setFoveation=function(P){h!==null&&(h.fixedFoveation=P),u!==null&&u.fixedFoveation!==void 0&&(u.fixedFoveation=P)};let z=null;function B(P,X){if(l=X.getViewerPose(o),d=X,l!==null){const Q=l.views;u!==null&&(t.setRenderTargetFramebuffer(m,u.framebuffer),t.setRenderTarget(m));let K=!1;Q.length!==b.cameras.length&&(b.cameras.length=0,K=!0);for(let at=0;at<Q.length;at++){const bt=Q[at];let xt=null;if(u!==null)xt=u.getViewport(bt);else{const pt=c.getViewSubImage(h,bt);xt=pt.viewport,at===0&&(t.setRenderTargetTextures(m,pt.colorTexture,h.ignoreDepthValues?void 0:pt.depthStencilTexture),t.setRenderTarget(m))}const W=y[at];W.matrix.fromArray(bt.transform.matrix),W.projectionMatrix.fromArray(bt.projectionMatrix),W.viewport.set(xt.x,xt.y,xt.width,xt.height),at===0&&b.matrix.copy(W.matrix),K===!0&&b.cameras.push(W)}}const Y=i.inputSources;for(let Q=0;Q<p.length;Q++){const K=p[Q],at=Y[Q];K.update(at,X,o)}z&&z(P,X),d=null}const k=new Kh;k.setAnimationLoop(B),this.setAnimationLoop=function(P){z=P},this.dispose=function(){}}}function Wx(r,t){function e(m,p){m.fogColor.value.copy(p.color),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function n(m,p,x,v,w){p.isMeshBasicMaterial||p.isMeshLambertMaterial?i(m,p):p.isMeshToonMaterial?(i(m,p),h(m,p)):p.isMeshPhongMaterial?(i(m,p),c(m,p)):p.isMeshStandardMaterial?(i(m,p),u(m,p),p.isMeshPhysicalMaterial&&d(m,p,w)):p.isMeshMatcapMaterial?(i(m,p),f(m,p)):p.isMeshDepthMaterial?i(m,p):p.isMeshDistanceMaterial?(i(m,p),g(m,p)):p.isMeshNormalMaterial?i(m,p):p.isLineBasicMaterial?(s(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?a(m,p,x,v):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function i(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map),p.alphaMap&&(m.alphaMap.value=p.alphaMap),p.bumpMap&&(m.bumpMap.value=p.bumpMap,m.bumpScale.value=p.bumpScale,p.side===Ve&&(m.bumpScale.value*=-1)),p.displacementMap&&(m.displacementMap.value=p.displacementMap,m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap),p.normalMap&&(m.normalMap.value=p.normalMap,m.normalScale.value.copy(p.normalScale),p.side===Ve&&m.normalScale.value.negate()),p.specularMap&&(m.specularMap.value=p.specularMap),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const x=t.get(p).envMap;if(x&&(m.envMap.value=x,m.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap){m.lightMap.value=p.lightMap;const y=r.physicallyCorrectLights!==!0?Math.PI:1;m.lightMapIntensity.value=p.lightMapIntensity*y}p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity);let v;p.map?v=p.map:p.specularMap?v=p.specularMap:p.displacementMap?v=p.displacementMap:p.normalMap?v=p.normalMap:p.bumpMap?v=p.bumpMap:p.roughnessMap?v=p.roughnessMap:p.metalnessMap?v=p.metalnessMap:p.alphaMap?v=p.alphaMap:p.emissiveMap?v=p.emissiveMap:p.clearcoatMap?v=p.clearcoatMap:p.clearcoatNormalMap?v=p.clearcoatNormalMap:p.clearcoatRoughnessMap?v=p.clearcoatRoughnessMap:p.specularIntensityMap?v=p.specularIntensityMap:p.specularColorMap?v=p.specularColorMap:p.transmissionMap?v=p.transmissionMap:p.thicknessMap?v=p.thicknessMap:p.sheenColorMap?v=p.sheenColorMap:p.sheenRoughnessMap&&(v=p.sheenRoughnessMap),v!==void 0&&(v.isWebGLRenderTarget&&(v=v.texture),v.matrixAutoUpdate===!0&&v.updateMatrix(),m.uvTransform.value.copy(v.matrix));let w;p.aoMap?w=p.aoMap:p.lightMap&&(w=p.lightMap),w!==void 0&&(w.isWebGLRenderTarget&&(w=w.texture),w.matrixAutoUpdate===!0&&w.updateMatrix(),m.uv2Transform.value.copy(w.matrix))}function s(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function a(m,p,x,v){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*x,m.scale.value=v*.5,p.map&&(m.map.value=p.map),p.alphaMap&&(m.alphaMap.value=p.alphaMap),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let w;p.map?w=p.map:p.alphaMap&&(w=p.alphaMap),w!==void 0&&(w.matrixAutoUpdate===!0&&w.updateMatrix(),m.uvTransform.value.copy(w.matrix))}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map),p.alphaMap&&(m.alphaMap.value=p.alphaMap),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let x;p.map?x=p.map:p.alphaMap&&(x=p.alphaMap),x!==void 0&&(x.matrixAutoUpdate===!0&&x.updateMatrix(),m.uvTransform.value.copy(x.matrix))}function c(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.roughness.value=p.roughness,m.metalness.value=p.metalness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap),p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap),t.get(p).envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,x){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap)),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap),p.clearcoatNormalMap&&(m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),m.clearcoatNormalMap.value=p.clearcoatNormalMap,p.side===Ve&&m.clearcoatNormalScale.value.negate())),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=x.texture,m.transmissionSamplerSize.value.set(x.width,x.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap)}function f(m,p){p.matcap&&(m.matcap.value=p.matcap)}function g(m,p){m.referencePosition.value.copy(p.referencePosition),m.nearDistance.value=p.nearDistance,m.farDistance.value=p.farDistance}return{refreshFogUniforms:e,refreshMaterialUniforms:n}}function Xx(){const r=Er("canvas");return r.style.display="block",r}function Yt(r={}){const t=r.canvas!==void 0?r.canvas:Xx(),e=r.context!==void 0?r.context:null,n=r.depth!==void 0?r.depth:!0,i=r.stencil!==void 0?r.stencil:!0,s=r.antialias!==void 0?r.antialias:!1,o=r.premultipliedAlpha!==void 0?r.premultipliedAlpha:!0,a=r.preserveDrawingBuffer!==void 0?r.preserveDrawingBuffer:!1,l=r.powerPreference!==void 0?r.powerPreference:"default",c=r.failIfMajorPerformanceCaveat!==void 0?r.failIfMajorPerformanceCaveat:!1;let h;r.context!==void 0?h=e.getContextAttributes().alpha:h=r.alpha!==void 0?r.alpha:!1;let u=null,d=null;const f=[],g=[];this.domElement=t,this.debug={checkShaderErrors:!0},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.outputEncoding=pn,this.physicallyCorrectLights=!1,this.toneMapping=fn,this.toneMappingExposure=1;const m=this;let p=!1,x=0,v=0,w=null,y=-1,b=null;const C=new Jt,R=new Jt;let D=null,V=t.width,F=t.height,_=1,A=null,j=null;const I=new Jt(0,0,V,F),z=new Jt(0,0,V,F);let B=!1;const k=new po;let P=!1,X=!1,Y=null;const Q=new Mt,K=new et,at=new T,bt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function xt(){return w===null?_:1}let W=e;function pt(S,N){for(let H=0;H<S.length;H++){const O=S[H],J=t.getContext(O,N);if(J!==null)return J}return null}try{const S={alpha:!0,depth:n,stencil:i,antialias:s,premultipliedAlpha:o,preserveDrawingBuffer:a,powerPreference:l,failIfMajorPerformanceCaveat:c};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ga}`),t.addEventListener("webglcontextlost",L,!1),t.addEventListener("webglcontextrestored",dt,!1),W===null){const N=["webgl2","webgl","experimental-webgl"];if(m.isWebGL1Renderer===!0&&N.shift(),W=pt(N,S),W===null)throw pt(N)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}W.getShaderPrecisionFormat===void 0&&(W.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let yt,wt,it,Ct,G,$,rt,gt,Z,nt,st,ot,It,zt,E,M,U,tt,ut,ft,St,q,Dt;function Bt(){yt=new c0(W),wt=new i0(W,yt,r),yt.init(wt),q=new Hx(W,yt,wt),it=new Ux(W,yt,wt),Ct=new d0,G=new Cx,$=new kx(W,yt,it,G,wt,q,Ct),rt=new s0(m),gt=new l0(m),Z=new Tp(W,wt),Dt=new e0(W,yt,Z,wt),nt=new h0(W,Z,Ct,Dt),st=new g0(W,nt,Z,Ct),ut=new m0(W,wt,$),M=new r0(G),ot=new Ax(m,rt,gt,yt,wt,Dt,M),It=new Wx(m,G),zt=new Rx,E=new Bx(yt,wt),tt=new t0(m,rt,it,st,h,o),U=new ou(m,st,wt),ft=new n0(W,yt,Ct,wt),St=new u0(W,yt,Ct,wt),Ct.programs=ot.programs,m.capabilities=wt,m.extensions=yt,m.properties=G,m.renderLists=zt,m.shadowMap=U,m.state=it,m.info=Ct}Bt();const _t=new Gx(m,W);this.xr=_t,this.getContext=function(){return W},this.getContextAttributes=function(){return W.getContextAttributes()},this.forceContextLoss=function(){const S=yt.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=yt.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return _},this.setPixelRatio=function(S){S!==void 0&&(_=S,this.setSize(V,F,!1))},this.getSize=function(S){return S.set(V,F)},this.setSize=function(S,N,H){if(_t.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=S,F=N,t.width=Math.floor(S*_),t.height=Math.floor(N*_),H!==!1&&(t.style.width=S+"px",t.style.height=N+"px"),this.setViewport(0,0,S,N)},this.getDrawingBufferSize=function(S){return S.set(V*_,F*_).floor()},this.setDrawingBufferSize=function(S,N,H){V=S,F=N,_=H,t.width=Math.floor(S*H),t.height=Math.floor(N*H),this.setViewport(0,0,S,N)},this.getCurrentViewport=function(S){return S.copy(C)},this.getViewport=function(S){return S.copy(I)},this.setViewport=function(S,N,H,O){S.isVector4?I.set(S.x,S.y,S.z,S.w):I.set(S,N,H,O),it.viewport(C.copy(I).multiplyScalar(_).floor())},this.getScissor=function(S){return S.copy(z)},this.setScissor=function(S,N,H,O){S.isVector4?z.set(S.x,S.y,S.z,S.w):z.set(S,N,H,O),it.scissor(R.copy(z).multiplyScalar(_).floor())},this.getScissorTest=function(){return B},this.setScissorTest=function(S){it.setScissorTest(B=S)},this.setOpaqueSort=function(S){A=S},this.setTransparentSort=function(S){j=S},this.getClearColor=function(S){return S.copy(tt.getClearColor())},this.setClearColor=function(){tt.setClearColor.apply(tt,arguments)},this.getClearAlpha=function(){return tt.getClearAlpha()},this.setClearAlpha=function(){tt.setClearAlpha.apply(tt,arguments)},this.clear=function(S=!0,N=!0,H=!0){let O=0;S&&(O|=16384),N&&(O|=256),H&&(O|=1024),W.clear(O)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",L,!1),t.removeEventListener("webglcontextrestored",dt,!1),zt.dispose(),E.dispose(),G.dispose(),rt.dispose(),gt.dispose(),st.dispose(),Dt.dispose(),ot.dispose(),_t.dispose(),_t.removeEventListener("sessionstart",Lt),_t.removeEventListener("sessionend",Qt),Y&&(Y.dispose(),Y=null),kt.stop()};function L(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),p=!0}function dt(){console.log("THREE.WebGLRenderer: Context Restored."),p=!1;const S=Ct.autoReset,N=U.enabled,H=U.autoUpdate,O=U.needsUpdate,J=U.type;Bt(),Ct.autoReset=S,U.enabled=N,U.autoUpdate=H,U.needsUpdate=O,U.type=J}function ct(S){const N=S.target;N.removeEventListener("dispose",ct),Et(N)}function Et(S){mt(S),G.remove(S)}function mt(S){const N=G.get(S).programs;N!==void 0&&(N.forEach(function(H){ot.releaseProgram(H)}),S.isShaderMaterial&&ot.releaseShaderCache(S))}this.renderBufferDirect=function(S,N,H,O,J,At){N===null&&(N=bt);const Pt=J.isMesh&&J.matrixWorld.determinant()<0,Ot=Gu(S,N,H,O,J);it.setMaterial(O,Pt);let Nt=H.index;const qt=H.attributes.position;if(Nt===null){if(qt===void 0||qt.count===0)return}else if(Nt.count===0)return;let Ht=1;O.wireframe===!0&&(Nt=nt.getWireframeAttribute(H),Ht=2),Dt.setup(J,O,Ot,H,Nt);let Vt,ie=ft;Nt!==null&&(Vt=Z.get(Nt),ie=St,ie.setIndex(Vt));const Pn=Nt!==null?Nt.count:qt.count,ti=H.drawRange.start*Ht,ei=H.drawRange.count*Ht,je=At!==null?At.start*Ht:0,Xt=At!==null?At.count*Ht:1/0,ni=Math.max(ti,je),re=Math.min(Pn,ti+ei,je+Xt)-1,$e=Math.max(0,re-ni+1);if($e!==0){if(J.isMesh)O.wireframe===!0?(it.setLineWidth(O.wireframeLinewidth*xt()),ie.setMode(1)):ie.setMode(4);else if(J.isLine){let mn=O.linewidth;mn===void 0&&(mn=1),it.setLineWidth(mn*xt()),J.isLineSegments?ie.setMode(1):J.isLineLoop?ie.setMode(2):ie.setMode(3)}else J.isPoints?ie.setMode(0):J.isSprite&&ie.setMode(4);if(J.isInstancedMesh)ie.renderInstances(ni,$e,J.count);else if(H.isInstancedBufferGeometry){const mn=Math.min(H.instanceCount,H._maxInstanceCount);ie.renderInstances(ni,$e,mn)}else ie.render(ni,$e)}},this.compile=function(S,N){d=E.get(S),d.init(),g.push(d),S.traverseVisible(function(H){H.isLight&&H.layers.test(N.layers)&&(d.pushLight(H),H.castShadow&&d.pushShadow(H))}),d.setupLights(m.physicallyCorrectLights),S.traverse(function(H){const O=H.material;if(O)if(Array.isArray(O))for(let J=0;J<O.length;J++){const At=O[J];vo(At,S,H)}else vo(O,S,H)}),g.pop(),d=null};let Tt=null;function lt(S){Tt&&Tt(S)}function Lt(){kt.stop()}function Qt(){kt.start()}const kt=new Kh;kt.setAnimationLoop(lt),typeof self<"u"&&kt.setContext(self),this.setAnimationLoop=function(S){Tt=S,_t.setAnimationLoop(S),S===null?kt.stop():kt.start()},_t.addEventListener("sessionstart",Lt),_t.addEventListener("sessionend",Qt),this.render=function(S,N){if(N!==void 0&&N.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(p===!0)return;S.autoUpdate===!0&&S.updateMatrixWorld(),N.parent===null&&N.updateMatrixWorld(),_t.enabled===!0&&_t.isPresenting===!0&&(_t.cameraAutoUpdate===!0&&_t.updateCamera(N),N=_t.getCamera()),S.isScene===!0&&S.onBeforeRender(m,S,N,w),d=E.get(S,g.length),d.init(),g.push(d),Q.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),k.setFromProjectionMatrix(Q),X=this.localClippingEnabled,P=M.init(this.clippingPlanes,X,N),u=zt.get(S,f.length),u.init(),f.push(u),Xe(S,N,0,m.sortObjects),u.finish(),m.sortObjects===!0&&u.sort(A,j),P===!0&&M.beginShadows();const H=d.state.shadowsArray;if(U.render(H,S,N),P===!0&&M.endShadows(),this.info.autoReset===!0&&this.info.reset(),tt.render(u,S),d.setupLights(m.physicallyCorrectLights),N.isArrayCamera){const O=N.cameras;for(let J=0,At=O.length;J<At;J++){const Pt=O[J];qe(u,S,Pt,Pt.viewport)}}else qe(u,S,N);w!==null&&($.updateMultisampleRenderTarget(w),$.updateRenderTargetMipmap(w)),S.isScene===!0&&S.onAfterRender(m,S,N),Dt.resetDefaultState(),y=-1,b=null,g.pop(),g.length>0?d=g[g.length-1]:d=null,f.pop(),f.length>0?u=f[f.length-1]:u=null};function Xe(S,N,H,O){if(S.visible===!1)return;if(S.layers.test(N.layers)){if(S.isGroup)H=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(N);else if(S.isLight)d.pushLight(S),S.castShadow&&d.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||k.intersectsSprite(S)){O&&at.setFromMatrixPosition(S.matrixWorld).applyMatrix4(Q);const Pt=st.update(S),Ot=S.material;Ot.visible&&u.push(S,Pt,Ot,H,at.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(S.isSkinnedMesh&&S.skeleton.frame!==Ct.render.frame&&(S.skeleton.update(),S.skeleton.frame=Ct.render.frame),!S.frustumCulled||k.intersectsObject(S))){O&&at.setFromMatrixPosition(S.matrixWorld).applyMatrix4(Q);const Pt=st.update(S),Ot=S.material;if(Array.isArray(Ot)){const Nt=Pt.groups;for(let qt=0,Ht=Nt.length;qt<Ht;qt++){const Vt=Nt[qt],ie=Ot[Vt.materialIndex];ie&&ie.visible&&u.push(S,Pt,ie,H,at.z,Vt)}}else Ot.visible&&u.push(S,Pt,Ot,H,at.z,null)}}const At=S.children;for(let Pt=0,Ot=At.length;Pt<Ot;Pt++)Xe(At[Pt],N,H,O)}function qe(S,N,H,O){const J=S.opaque,At=S.transmissive,Pt=S.transparent;d.setupLightsView(H),At.length>0&&Hu(J,N,H),O&&it.viewport(C.copy(O)),J.length>0&&Gr(J,N,H),At.length>0&&Gr(At,N,H),Pt.length>0&&Gr(Pt,N,H),it.buffers.depth.setTest(!0),it.buffers.depth.setMask(!0),it.buffers.color.setMask(!0),it.setPolygonOffset(!1)}function Hu(S,N,H){const O=wt.isWebGL2;Y===null&&(Y=new Pe(1,1,{generateMipmaps:!0,type:q.convert(Pi)!==null?Pi:Yn,minFilter:co,samples:O&&s===!0?4:0})),m.getDrawingBufferSize(K),O?Y.setSize(K.x,K.y):Y.setSize(La(K.x),La(K.y));const J=m.getRenderTarget();m.setRenderTarget(Y),m.clear();const At=m.toneMapping;m.toneMapping=fn,Gr(S,N,H),m.toneMapping=At,$.updateMultisampleRenderTarget(Y),$.updateRenderTargetMipmap(Y),m.setRenderTarget(J)}function Gr(S,N,H){const O=N.isScene===!0?N.overrideMaterial:null;for(let J=0,At=S.length;J<At;J++){const Pt=S[J],Ot=Pt.object,Nt=Pt.geometry,qt=O===null?Pt.material:O,Ht=Pt.group;Ot.layers.test(H.layers)&&Vu(Ot,N,H,Nt,qt,Ht)}}function Vu(S,N,H,O,J,At){S.onBeforeRender(m,N,H,O,J,At),S.modelViewMatrix.multiplyMatrices(H.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),J.onBeforeRender(m,N,H,O,S,At),J.transparent===!0&&J.side===ki?(J.side=Ve,J.needsUpdate=!0,m.renderBufferDirect(H,N,O,J,S,At),J.side=br,J.needsUpdate=!0,m.renderBufferDirect(H,N,O,J,S,At),J.side=ki):m.renderBufferDirect(H,N,O,J,S,At),S.onAfterRender(m,N,H,O,J,At)}function vo(S,N,H){N.isScene!==!0&&(N=bt);const O=G.get(S),J=d.state.lights,At=d.state.shadowsArray,Pt=J.state.version,Ot=ot.getParameters(S,J.state,At,N,H),Nt=ot.getProgramCacheKey(Ot);let qt=O.programs;O.environment=S.isMeshStandardMaterial?N.environment:null,O.fog=N.fog,O.envMap=(S.isMeshStandardMaterial?gt:rt).get(S.envMap||O.environment),qt===void 0&&(S.addEventListener("dispose",ct),qt=new Map,O.programs=qt);let Ht=qt.get(Nt);if(Ht!==void 0){if(O.currentProgram===Ht&&O.lightsStateVersion===Pt)return xl(S,Ot),Ht}else Ot.uniforms=ot.getUniforms(S),S.onBuild(H,Ot,m),S.onBeforeCompile(Ot,m),Ht=ot.acquireProgram(Ot,Nt),qt.set(Nt,Ht),O.uniforms=Ot.uniforms;const Vt=O.uniforms;(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Vt.clippingPlanes=M.uniform),xl(S,Ot),O.needsLights=Xu(S),O.lightsStateVersion=Pt,O.needsLights&&(Vt.ambientLightColor.value=J.state.ambient,Vt.lightProbe.value=J.state.probe,Vt.directionalLights.value=J.state.directional,Vt.directionalLightShadows.value=J.state.directionalShadow,Vt.spotLights.value=J.state.spot,Vt.spotLightShadows.value=J.state.spotShadow,Vt.rectAreaLights.value=J.state.rectArea,Vt.ltc_1.value=J.state.rectAreaLTC1,Vt.ltc_2.value=J.state.rectAreaLTC2,Vt.pointLights.value=J.state.point,Vt.pointLightShadows.value=J.state.pointShadow,Vt.hemisphereLights.value=J.state.hemi,Vt.directionalShadowMap.value=J.state.directionalShadowMap,Vt.directionalShadowMatrix.value=J.state.directionalShadowMatrix,Vt.spotShadowMap.value=J.state.spotShadowMap,Vt.spotShadowMatrix.value=J.state.spotShadowMatrix,Vt.pointShadowMap.value=J.state.pointShadowMap,Vt.pointShadowMatrix.value=J.state.pointShadowMatrix);const ie=Ht.getUniforms(),Pn=Tn.seqWithValue(ie.seq,Vt);return O.currentProgram=Ht,O.uniformsList=Pn,Ht}function xl(S,N){const H=G.get(S);H.outputEncoding=N.outputEncoding,H.instancing=N.instancing,H.skinning=N.skinning,H.morphTargets=N.morphTargets,H.morphNormals=N.morphNormals,H.morphColors=N.morphColors,H.morphTargetsCount=N.morphTargetsCount,H.numClippingPlanes=N.numClippingPlanes,H.numIntersection=N.numClipIntersection,H.vertexAlphas=N.vertexAlphas,H.vertexTangents=N.vertexTangents,H.toneMapping=N.toneMapping}function Gu(S,N,H,O,J){N.isScene!==!0&&(N=bt),$.resetTextureUnits();const At=N.fog,Pt=O.isMeshStandardMaterial?N.environment:null,Ot=w===null?m.outputEncoding:w.isXRRenderTarget===!0?w.texture.encoding:pn,Nt=(O.isMeshStandardMaterial?gt:rt).get(O.envMap||Pt),qt=O.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,Ht=!!O.normalMap&&!!H.attributes.tangent,Vt=!!H.morphAttributes.position,ie=!!H.morphAttributes.normal,Pn=!!H.morphAttributes.color,ti=O.toneMapped?m.toneMapping:fn,ei=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,je=ei!==void 0?ei.length:0,Xt=G.get(O),ni=d.state.lights;if(P===!0&&(X===!0||S!==b)){const Ne=S===b&&O.id===y;M.setState(O,S,Ne)}let re=!1;O.version===Xt.__version?(Xt.needsLights&&Xt.lightsStateVersion!==ni.state.version||Xt.outputEncoding!==Ot||J.isInstancedMesh&&Xt.instancing===!1||!J.isInstancedMesh&&Xt.instancing===!0||J.isSkinnedMesh&&Xt.skinning===!1||!J.isSkinnedMesh&&Xt.skinning===!0||Xt.envMap!==Nt||O.fog&&Xt.fog!==At||Xt.numClippingPlanes!==void 0&&(Xt.numClippingPlanes!==M.numPlanes||Xt.numIntersection!==M.numIntersection)||Xt.vertexAlphas!==qt||Xt.vertexTangents!==Ht||Xt.morphTargets!==Vt||Xt.morphNormals!==ie||Xt.morphColors!==Pn||Xt.toneMapping!==ti||wt.isWebGL2===!0&&Xt.morphTargetsCount!==je)&&(re=!0):(re=!0,Xt.__version=O.version);let $e=Xt.currentProgram;re===!0&&($e=vo(O,N,J));let mn=!1,er=!1,yo=!1;const xe=$e.getUniforms(),nr=Xt.uniforms;if(it.useProgram($e.program)&&(mn=!0,er=!0,yo=!0),O.id!==y&&(y=O.id,er=!0),mn||b!==S){if(xe.setValue(W,"projectionMatrix",S.projectionMatrix),wt.logarithmicDepthBuffer&&xe.setValue(W,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),b!==S&&(b=S,er=!0,yo=!0),O.isShaderMaterial||O.isMeshPhongMaterial||O.isMeshToonMaterial||O.isMeshStandardMaterial||O.envMap){const Ne=xe.map.cameraPosition;Ne!==void 0&&Ne.setValue(W,at.setFromMatrixPosition(S.matrixWorld))}(O.isMeshPhongMaterial||O.isMeshToonMaterial||O.isMeshLambertMaterial||O.isMeshBasicMaterial||O.isMeshStandardMaterial||O.isShaderMaterial)&&xe.setValue(W,"isOrthographic",S.isOrthographicCamera===!0),(O.isMeshPhongMaterial||O.isMeshToonMaterial||O.isMeshLambertMaterial||O.isMeshBasicMaterial||O.isMeshStandardMaterial||O.isShaderMaterial||O.isShadowMaterial||J.isSkinnedMesh)&&xe.setValue(W,"viewMatrix",S.matrixWorldInverse)}if(J.isSkinnedMesh){xe.setOptional(W,J,"bindMatrix"),xe.setOptional(W,J,"bindMatrixInverse");const Ne=J.skeleton;Ne&&(wt.floatVertexTextures?(Ne.boneTexture===null&&Ne.computeBoneTexture(),xe.setValue(W,"boneTexture",Ne.boneTexture,$),xe.setValue(W,"boneTextureSize",Ne.boneTextureSize)):xe.setOptional(W,Ne,"boneMatrices"))}const Mo=H.morphAttributes;return(Mo.position!==void 0||Mo.normal!==void 0||Mo.color!==void 0&&wt.isWebGL2===!0)&&ut.update(J,H,O,$e),(er||Xt.receiveShadow!==J.receiveShadow)&&(Xt.receiveShadow=J.receiveShadow,xe.setValue(W,"receiveShadow",J.receiveShadow)),er&&(xe.setValue(W,"toneMappingExposure",m.toneMappingExposure),Xt.needsLights&&Wu(nr,yo),At&&O.fog&&It.refreshFogUniforms(nr,At),It.refreshMaterialUniforms(nr,O,_,F,Y),Tn.upload(W,Xt.uniformsList,nr,$)),O.isShaderMaterial&&O.uniformsNeedUpdate===!0&&(Tn.upload(W,Xt.uniformsList,nr,$),O.uniformsNeedUpdate=!1),O.isSpriteMaterial&&xe.setValue(W,"center",J.center),xe.setValue(W,"modelViewMatrix",J.modelViewMatrix),xe.setValue(W,"normalMatrix",J.normalMatrix),xe.setValue(W,"modelMatrix",J.matrixWorld),$e}function Wu(S,N){S.ambientLightColor.needsUpdate=N,S.lightProbe.needsUpdate=N,S.directionalLights.needsUpdate=N,S.directionalLightShadows.needsUpdate=N,S.pointLights.needsUpdate=N,S.pointLightShadows.needsUpdate=N,S.spotLights.needsUpdate=N,S.spotLightShadows.needsUpdate=N,S.rectAreaLights.needsUpdate=N,S.hemisphereLights.needsUpdate=N}function Xu(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return x},this.getActiveMipmapLevel=function(){return v},this.getRenderTarget=function(){return w},this.setRenderTargetTextures=function(S,N,H){G.get(S.texture).__webglTexture=N,G.get(S.depthTexture).__webglTexture=H;const O=G.get(S);O.__hasExternalTextures=!0,O.__hasExternalTextures&&(O.__autoAllocateDepthBuffer=H===void 0,O.__autoAllocateDepthBuffer||yt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),O.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(S,N){const H=G.get(S);H.__webglFramebuffer=N,H.__useDefaultFramebuffer=N===void 0},this.setRenderTarget=function(S,N=0,H=0){w=S,x=N,v=H;let O=!0;if(S){const Nt=G.get(S);Nt.__useDefaultFramebuffer!==void 0?(it.bindFramebuffer(36160,null),O=!1):Nt.__webglFramebuffer===void 0?$.setupRenderTarget(S):Nt.__hasExternalTextures&&$.rebindTextures(S,G.get(S.texture).__webglTexture,G.get(S.depthTexture).__webglTexture)}let J=null,At=!1,Pt=!1;if(S){const Nt=S.texture;(Nt.isData3DTexture||Nt.isDataArrayTexture)&&(Pt=!0);const qt=G.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(J=qt[N],At=!0):wt.isWebGL2&&S.samples>0&&$.useMultisampledRTT(S)===!1?J=G.get(S).__webglMultisampledFramebuffer:J=qt,C.copy(S.viewport),R.copy(S.scissor),D=S.scissorTest}else C.copy(I).multiplyScalar(_).floor(),R.copy(z).multiplyScalar(_).floor(),D=B;if(it.bindFramebuffer(36160,J)&&wt.drawBuffers&&O&&it.drawBuffers(S,J),it.viewport(C),it.scissor(R),it.setScissorTest(D),At){const Nt=G.get(S.texture);W.framebufferTexture2D(36160,36064,34069+N,Nt.__webglTexture,H)}else if(Pt){const Nt=G.get(S.texture),qt=N||0;W.framebufferTextureLayer(36160,36064,Nt.__webglTexture,H||0,qt)}y=-1},this.readRenderTargetPixels=function(S,N,H,O,J,At,Pt){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ot=G.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Pt!==void 0&&(Ot=Ot[Pt]),Ot){it.bindFramebuffer(36160,Ot);try{const Nt=S.texture,qt=Nt.format,Ht=Nt.type;if(qt!==He&&q.convert(qt)!==W.getParameter(35739)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const Vt=Ht===Pi&&(yt.has("EXT_color_buffer_half_float")||wt.isWebGL2&&yt.has("EXT_color_buffer_float"));if(Ht!==Yn&&q.convert(Ht)!==W.getParameter(35738)&&!(Ht===kn&&(wt.isWebGL2||yt.has("OES_texture_float")||yt.has("WEBGL_color_buffer_float")))&&!Vt){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}N>=0&&N<=S.width-O&&H>=0&&H<=S.height-J&&W.readPixels(N,H,O,J,q.convert(qt),q.convert(Ht),At)}finally{const Nt=w!==null?G.get(w).__webglFramebuffer:null;it.bindFramebuffer(36160,Nt)}}},this.copyFramebufferToTexture=function(S,N,H=0){if(N.isFramebufferTexture!==!0){console.error("THREE.WebGLRenderer: copyFramebufferToTexture() can only be used with FramebufferTexture.");return}const O=Math.pow(2,-H),J=Math.floor(N.image.width*O),At=Math.floor(N.image.height*O);$.setTexture2D(N,0),W.copyTexSubImage2D(3553,H,0,0,S.x,S.y,J,At),it.unbindTexture()},this.copyTextureToTexture=function(S,N,H,O=0){const J=N.image.width,At=N.image.height,Pt=q.convert(H.format),Ot=q.convert(H.type);$.setTexture2D(H,0),W.pixelStorei(37440,H.flipY),W.pixelStorei(37441,H.premultiplyAlpha),W.pixelStorei(3317,H.unpackAlignment),N.isDataTexture?W.texSubImage2D(3553,O,S.x,S.y,J,At,Pt,Ot,N.image.data):N.isCompressedTexture?W.compressedTexSubImage2D(3553,O,S.x,S.y,N.mipmaps[0].width,N.mipmaps[0].height,Pt,N.mipmaps[0].data):W.texSubImage2D(3553,O,S.x,S.y,Pt,Ot,N.image),O===0&&H.generateMipmaps&&W.generateMipmap(3553),it.unbindTexture()},this.copyTextureToTexture3D=function(S,N,H,O,J=0){if(m.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const At=S.max.x-S.min.x+1,Pt=S.max.y-S.min.y+1,Ot=S.max.z-S.min.z+1,Nt=q.convert(O.format),qt=q.convert(O.type);let Ht;if(O.isData3DTexture)$.setTexture3D(O,0),Ht=32879;else if(O.isDataArrayTexture)$.setTexture2DArray(O,0),Ht=35866;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}W.pixelStorei(37440,O.flipY),W.pixelStorei(37441,O.premultiplyAlpha),W.pixelStorei(3317,O.unpackAlignment);const Vt=W.getParameter(3314),ie=W.getParameter(32878),Pn=W.getParameter(3316),ti=W.getParameter(3315),ei=W.getParameter(32877),je=H.isCompressedTexture?H.mipmaps[0]:H.image;W.pixelStorei(3314,je.width),W.pixelStorei(32878,je.height),W.pixelStorei(3316,S.min.x),W.pixelStorei(3315,S.min.y),W.pixelStorei(32877,S.min.z),H.isDataTexture||H.isData3DTexture?W.texSubImage3D(Ht,J,N.x,N.y,N.z,At,Pt,Ot,Nt,qt,je.data):H.isCompressedTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),W.compressedTexSubImage3D(Ht,J,N.x,N.y,N.z,At,Pt,Ot,Nt,je.data)):W.texSubImage3D(Ht,J,N.x,N.y,N.z,At,Pt,Ot,Nt,qt,je),W.pixelStorei(3314,Vt),W.pixelStorei(32878,ie),W.pixelStorei(3316,Pn),W.pixelStorei(3315,ti),W.pixelStorei(32877,ei),J===0&&O.generateMipmaps&&W.generateMipmap(Ht),it.unbindTexture()},this.initTexture=function(S){$.setTexture2D(S,0),it.unbindTexture()},this.resetState=function(){x=0,v=0,w=null,it.reset(),Dt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}Yt.prototype.isWebGLRenderer=!0;class qx extends Yt{}qx.prototype.isWebGL1Renderer=!0;class Qa{constructor(t,e=25e-5){this.name="",this.color=new vt(t),this.density=e}clone(){return new Qa(this.color,this.density)}toJSON(){return{type:"FogExp2",color:this.color.getHex(),density:this.density}}}Qa.prototype.isFogExp2=!0;class cu extends $t{constructor(){super(),this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.overrideMaterial=null,this.autoUpdate=!0,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.autoUpdate=t.autoUpdate,this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e}}cu.prototype.isScene=!0;class Ur{constructor(t,e){this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=Sr,this.updateRange={offset:0,count:-1},this.version=0,this.uuid=tn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let i=0,s=this.stride;i<s;i++)this.array[t+i]=e.array[n+i];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=tn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){return t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=tn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.prototype.slice.call(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}Ur.prototype.isInterleavedBuffer=!0;const be=new T;class Tr{constructor(t,e,n,i=!1){this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=i===!0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)be.fromBufferAttribute(this,e),be.applyMatrix4(t),this.setXYZ(e,be.x,be.y,be.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)be.fromBufferAttribute(this,e),be.applyNormalMatrix(t),this.setXYZ(e,be.x,be.y,be.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)be.fromBufferAttribute(this,e),be.transformDirection(t),this.setXYZ(e,be.x,be.y,be.z);return this}setX(t,e){return this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){return this.data.array[t*this.data.stride+this.offset]}getY(t){return this.data.array[t*this.data.stride+this.offset+1]}getZ(t){return this.data.array[t*this.data.stride+this.offset+2]}getW(t){return this.data.array[t*this.data.stride+this.offset+3]}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,i){return t=t*this.data.stride+this.offset,this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this}setXYZW(t,e,n,i,s){return t=t*this.data.stride+this.offset,this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=i,this.data.array[t+3]=s,this}clone(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interlaved buffer attribute will deinterleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)e.push(this.data.array[i+s])}return new ce(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new Tr(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interlaved buffer attribute will deinterleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)e.push(this.data.array[i+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}Tr.prototype.isInterleavedBufferAttribute=!0;class tl extends he{constructor(t){super(),this.type="SpriteMaterial",this.color=new vt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this}}tl.prototype.isSpriteMaterial=!0;let _i;const cr=new T,vi=new T,yi=new T,Mi=new et,hr=new et,hu=new Mt,ds=new T,ur=new T,fs=new T,kc=new et,ha=new et,Hc=new et;class jx extends $t{constructor(t){if(super(),this.type="Sprite",_i===void 0){_i=new Kt;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Ur(e,5);_i.setIndex([0,1,2,0,2,3]),_i.setAttribute("position",new Tr(n,3,0,!1)),_i.setAttribute("uv",new Tr(n,2,3,!1))}this.geometry=_i,this.material=t!==void 0?t:new tl,this.center=new et(.5,.5)}raycast(t,e){t.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),vi.setFromMatrixScale(this.matrixWorld),hu.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),yi.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&vi.multiplyScalar(-yi.z);const n=this.material.rotation;let i,s;n!==0&&(s=Math.cos(n),i=Math.sin(n));const o=this.center;ps(ds.set(-.5,-.5,0),yi,o,vi,i,s),ps(ur.set(.5,-.5,0),yi,o,vi,i,s),ps(fs.set(.5,.5,0),yi,o,vi,i,s),kc.set(0,0),ha.set(1,0),Hc.set(1,1);let a=t.ray.intersectTriangle(ds,ur,fs,!1,cr);if(a===null&&(ps(ur.set(-.5,.5,0),yi,o,vi,i,s),ha.set(0,1),a=t.ray.intersectTriangle(ds,fs,ur,!1,cr),a===null))return;const l=t.ray.origin.distanceTo(cr);l<t.near||l>t.far||e.push({distance:l,point:cr.clone(),uv:ae.getUV(cr,ds,ur,fs,kc,ha,Hc,new et),face:null,object:this})}copy(t){return super.copy(t),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}}jx.prototype.isSprite=!0;function ps(r,t,e,n,i,s){Mi.subVectors(r,e).addScalar(.5).multiply(n),i!==void 0?(hr.x=s*Mi.x-i*Mi.y,hr.y=i*Mi.x+s*Mi.y):hr.copy(Mi),r.copy(t),r.x+=hr.x,r.y+=hr.y,r.applyMatrix4(hu)}const Vc=new T,Gc=new Jt,Wc=new Jt,$x=new T,Xc=new Mt;class uu extends Te{constructor(t,e){super(t,e),this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new Mt,this.bindMatrixInverse=new Mt}copy(t){return super.copy(t),this.bindMode=t.bindMode,this.bindMatrix.copy(t.bindMatrix),this.bindMatrixInverse.copy(t.bindMatrixInverse),this.skeleton=t.skeleton,this}bind(t,e){this.skeleton=t,e===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),e=this.matrixWorld),this.bindMatrix.copy(e),this.bindMatrixInverse.copy(e).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const t=new Jt,e=this.geometry.attributes.skinWeight;for(let n=0,i=e.count;n<i;n++){t.fromBufferAttribute(e,n);const s=1/t.manhattanLength();s!==1/0?t.multiplyScalar(s):t.set(1,0,0,0),e.setXYZW(n,t.x,t.y,t.z,t.w)}}updateMatrixWorld(t){super.updateMatrixWorld(t),this.bindMode==="attached"?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode==="detached"?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}boneTransform(t,e){const n=this.skeleton,i=this.geometry;Gc.fromBufferAttribute(i.attributes.skinIndex,t),Wc.fromBufferAttribute(i.attributes.skinWeight,t),Vc.copy(e).applyMatrix4(this.bindMatrix),e.set(0,0,0);for(let s=0;s<4;s++){const o=Wc.getComponent(s);if(o!==0){const a=Gc.getComponent(s);Xc.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),e.addScaledVector($x.copy(Vc).applyMatrix4(Xc),o)}}return e.applyMatrix4(this.bindMatrixInverse)}}uu.prototype.isSkinnedMesh=!0;class Jx extends $t{constructor(){super(),this.type="Bone"}}Jx.prototype.isBone=!0;class Yx extends fe{constructor(t=null,e=1,n=1,i,s,o,a,l,c=de,h=de,u,d){super(null,o,a,l,c,h,i,s,u,d),this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}Yx.prototype.isDataTexture=!0;class Pa extends ce{constructor(t,e,n,i=1){typeof n=="number"&&(i=n,n=!1,console.error("THREE.InstancedBufferAttribute: The constructor now expects normalized as the third argument.")),super(t,e,n),this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}Pa.prototype.isInstancedBufferAttribute=!0;const qc=new Mt,jc=new Mt,ms=[],dr=new Te;class Zx extends Te{constructor(t,e,n){super(t,e),this.instanceMatrix=new Pa(new Float32Array(n*16),16),this.instanceColor=null,this.count=n,this.frustumCulled=!1}copy(t){return super.copy(t),this.instanceMatrix.copy(t.instanceMatrix),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}raycast(t,e){const n=this.matrixWorld,i=this.count;if(dr.geometry=this.geometry,dr.material=this.material,dr.material!==void 0)for(let s=0;s<i;s++){this.getMatrixAt(s,qc),jc.multiplyMatrices(n,qc),dr.matrixWorld=jc,dr.raycast(t,ms);for(let o=0,a=ms.length;o<a;o++){const l=ms[o];l.instanceId=s,l.object=this,e.push(l)}ms.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new Pa(new Float32Array(this.instanceMatrix.count*3),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"})}}Zx.prototype.isInstancedMesh=!0;class Zi extends he{constructor(t){super(),this.type="LineBasicMaterial",this.color=new vt(16777215),this.linewidth=1,this.linecap="round",this.linejoin="round",this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this}}Zi.prototype.isLineBasicMaterial=!0;const $c=new T,Jc=new T,Yc=new Mt,ua=new Ji,gs=new $i;class el extends $t{constructor(t=new Kt,e=new Zi){super(),this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t){return super.copy(t),this.material=t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.isBufferGeometry)if(t.index===null){const e=t.attributes.position,n=[0];for(let i=1,s=e.count;i<s;i++)$c.fromBufferAttribute(e,i-1),Jc.fromBufferAttribute(e,i),n[i]=n[i-1],n[i]+=$c.distanceTo(Jc);t.setAttribute("lineDistance",new Zt(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else t.isGeometry&&console.error("THREE.Line.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.");return this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,s=t.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),gs.copy(n.boundingSphere),gs.applyMatrix4(i),gs.radius+=s,t.ray.intersectsSphere(gs)===!1)return;Yc.copy(i).invert(),ua.copy(t.ray).applyMatrix4(Yc);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=new T,h=new T,u=new T,d=new T,f=this.isLineSegments?2:1;if(n.isBufferGeometry){const g=n.index,p=n.attributes.position;if(g!==null){const x=Math.max(0,o.start),v=Math.min(g.count,o.start+o.count);for(let w=x,y=v-1;w<y;w+=f){const b=g.getX(w),C=g.getX(w+1);if(c.fromBufferAttribute(p,b),h.fromBufferAttribute(p,C),ua.distanceSqToSegment(c,h,d,u)>l)continue;d.applyMatrix4(this.matrixWorld);const D=t.ray.origin.distanceTo(d);D<t.near||D>t.far||e.push({distance:D,point:u.clone().applyMatrix4(this.matrixWorld),index:w,face:null,faceIndex:null,object:this})}}else{const x=Math.max(0,o.start),v=Math.min(p.count,o.start+o.count);for(let w=x,y=v-1;w<y;w+=f){if(c.fromBufferAttribute(p,w),h.fromBufferAttribute(p,w+1),ua.distanceSqToSegment(c,h,d,u)>l)continue;d.applyMatrix4(this.matrixWorld);const C=t.ray.origin.distanceTo(d);C<t.near||C>t.far||e.push({distance:C,point:u.clone().applyMatrix4(this.matrixWorld),index:w,face:null,faceIndex:null,object:this})}}}else n.isGeometry&&console.error("THREE.Line.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}updateMorphTargets(){const t=this.geometry;if(t.isBufferGeometry){const e=t.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}else{const e=t.morphTargets;e!==void 0&&e.length>0&&console.error("THREE.Line.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.")}}}el.prototype.isLine=!0;const Zc=new T,Kc=new T;class nl extends el{constructor(t,e){super(t,e),this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.isBufferGeometry)if(t.index===null){const e=t.attributes.position,n=[];for(let i=0,s=e.count;i<s;i+=2)Zc.fromBufferAttribute(e,i),Kc.fromBufferAttribute(e,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Zc.distanceTo(Kc);t.setAttribute("lineDistance",new Zt(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else t.isGeometry&&console.error("THREE.LineSegments.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.");return this}}nl.prototype.isLineSegments=!0;class Kx extends el{constructor(t,e){super(t,e),this.type="LineLoop"}}Kx.prototype.isLineLoop=!0;class il extends he{constructor(t){super(),this.type="PointsMaterial",this.color=new vt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this}}il.prototype.isPointsMaterial=!0;const Qc=new Mt,Ia=new Ji,xs=new $i,_s=new T;class Qx extends $t{constructor(t=new Kt,e=new il){super(),this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t){return super.copy(t),this.material=t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,s=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),xs.copy(n.boundingSphere),xs.applyMatrix4(i),xs.radius+=s,t.ray.intersectsSphere(xs)===!1)return;Qc.copy(i).invert(),Ia.copy(t.ray).applyMatrix4(Qc);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a;if(n.isBufferGeometry){const c=n.index,u=n.attributes.position;if(c!==null){const d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let g=d,m=f;g<m;g++){const p=c.getX(g);_s.fromBufferAttribute(u,p),th(_s,p,l,i,t,e,this)}}else{const d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let g=d,m=f;g<m;g++)_s.fromBufferAttribute(u,g),th(_s,g,l,i,t,e,this)}}else console.error("THREE.Points.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}updateMorphTargets(){const t=this.geometry;if(t.isBufferGeometry){const e=t.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=i.length;s<o;s++){const a=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}else{const e=t.morphTargets;e!==void 0&&e.length>0&&console.error("THREE.Points.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.")}}}Qx.prototype.isPoints=!0;function th(r,t,e,n,i,s,o){const a=Ia.distanceSqToPoint(r);if(a<e){const l=new T;Ia.closestPointToPoint(r,l),l.applyMatrix4(n);const c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,object:o})}}class t_ extends fe{constructor(t,e,n,i,s,o,a,l,c){super(t,e,n,i,s,o,a,l,c),this.minFilter=o!==void 0?o:Se,this.magFilter=s!==void 0?s:Se,this.generateMipmaps=!1;const h=this;function u(){h.needsUpdate=!0,t.requestVideoFrameCallback(u)}"requestVideoFrameCallback"in t&&t.requestVideoFrameCallback(u)}clone(){return new this.constructor(this.image).copy(this)}update(){const t=this.image;"requestVideoFrameCallback"in t===!1&&t.readyState>=t.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}}t_.prototype.isVideoTexture=!0;class e_ extends fe{constructor(t,e,n){super({width:t,height:e}),this.format=n,this.magFilter=de,this.minFilter=de,this.generateMipmaps=!1,this.needsUpdate=!0}}e_.prototype.isFramebufferTexture=!0;class n_ extends fe{constructor(t,e,n,i,s,o,a,l,c,h,u,d){super(null,o,a,l,c,h,i,s,u,d),this.image={width:e,height:n},this.mipmaps=t,this.flipY=!1,this.generateMipmaps=!1}}n_.prototype.isCompressedTexture=!0;class i_ extends fe{constructor(t,e,n,i,s,o,a,l,c){super(t,e,n,i,s,o,a,l,c),this.needsUpdate=!0}}i_.prototype.isCanvasTexture=!0;class De{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),s=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),s+=n.distanceTo(i),e.push(s),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const s=n.length;let o;e?o=e:o=t*n[s-1];let a=0,l=s-1,c;for(;a<=l;)if(i=Math.floor(a+(l-a)/2),c=n[i]-o,c<0)a=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===o)return i/(s-1);const h=n[i],d=n[i+1]-h,f=(o-h)/d;return(i+f)/(s-1)}getTangent(t,e){let i=t-1e-4,s=t+1e-4;i<0&&(i=0),s>1&&(s=1);const o=this.getPoint(i),a=this.getPoint(s),l=e||(o.isVector2?new et:new T);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new T,i=[],s=[],o=[],a=new T,l=new Mt;for(let f=0;f<=t;f++){const g=f/t;i[f]=this.getTangentAt(g,new T)}s[0]=new T,o[0]=new T;let c=Number.MAX_VALUE;const h=Math.abs(i[0].x),u=Math.abs(i[0].y),d=Math.abs(i[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],a),o[0].crossVectors(i[0],s[0]);for(let f=1;f<=t;f++){if(s[f]=s[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(i[f-1],i[f]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(ye(i[f-1].dot(i[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(a,g))}o[f].crossVectors(i[f],s[f])}if(e===!0){let f=Math.acos(ye(s[0].dot(s[t]),-1,1));f/=t,i[0].dot(a.crossVectors(s[0],s[t]))>0&&(f=-f);for(let g=1;g<=t;g++)s[g].applyMatrix4(l.makeRotationAxis(i[g],f*g)),o[g].crossVectors(i[g],s[g])}return{tangents:i,normals:s,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.5,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class go extends De{constructor(t=0,e=0,n=1,i=1,s=0,o=Math.PI*2,a=!1,l=0){super(),this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e){const n=e||new et,i=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const o=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(o?s=0:s=i),this.aClockwise===!0&&!o&&(s===i?s=-i:s=s-i);const a=this.aStartAngle+t*s;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}go.prototype.isEllipseCurve=!0;class du extends go{constructor(t,e,n,i,s,o){super(t,e,n,n,i,s,o),this.type="ArcCurve"}}du.prototype.isArcCurve=!0;function rl(){let r=0,t=0,e=0,n=0;function i(s,o,a,l){r=s,t=a,e=-3*s+3*o-2*a-l,n=2*s-2*o+a+l}return{initCatmullRom:function(s,o,a,l,c){i(o,a,c*(a-s),c*(l-o))},initNonuniformCatmullRom:function(s,o,a,l,c,h,u){let d=(o-s)/c-(a-s)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+u)+(l-a)/u;d*=h,f*=h,i(o,a,d,f)},calc:function(s){const o=s*s,a=o*s;return r+t*s+e*o+n*a}}}const vs=new T,da=new rl,fa=new rl,pa=new rl;class fu extends De{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new T){const n=e,i=this.points,s=i.length,o=(s-(this.closed?0:1))*t;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/s)+1)*s:l===0&&a===s-1&&(a=s-2,l=1);let c,h;this.closed||a>0?c=i[(a-1)%s]:(vs.subVectors(i[0],i[1]).add(i[0]),c=vs);const u=i[a%s],d=i[(a+1)%s];if(this.closed||a+2<s?h=i[(a+2)%s]:(vs.subVectors(i[s-1],i[s-2]).add(i[s-1]),h=vs),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(u),f),m=Math.pow(u.distanceToSquared(d),f),p=Math.pow(d.distanceToSquared(h),f);m<1e-4&&(m=1),g<1e-4&&(g=m),p<1e-4&&(p=m),da.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,g,m,p),fa.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,g,m,p),pa.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,g,m,p)}else this.curveType==="catmullrom"&&(da.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),fa.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),pa.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(da.calc(l),fa.calc(l),pa.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new T().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}fu.prototype.isCatmullRomCurve3=!0;function eh(r,t,e,n,i){const s=(n-t)*.5,o=(i-e)*.5,a=r*r,l=r*a;return(2*e-2*n+s+o)*l+(-3*e+3*n-2*s-o)*a+s*r+e}function r_(r,t){const e=1-r;return e*e*t}function s_(r,t){return 2*(1-r)*r*t}function o_(r,t){return r*r*t}function _r(r,t,e,n){return r_(r,t)+s_(r,e)+o_(r,n)}function a_(r,t){const e=1-r;return e*e*e*t}function l_(r,t){const e=1-r;return 3*e*e*r*t}function c_(r,t){return 3*(1-r)*r*r*t}function h_(r,t){return r*r*r*t}function vr(r,t,e,n,i){return a_(r,t)+l_(r,e)+c_(r,n)+h_(r,i)}class sl extends De{constructor(t=new et,e=new et,n=new et,i=new et){super(),this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new et){const n=e,i=this.v0,s=this.v1,o=this.v2,a=this.v3;return n.set(vr(t,i.x,s.x,o.x,a.x),vr(t,i.y,s.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}sl.prototype.isCubicBezierCurve=!0;class pu extends De{constructor(t=new T,e=new T,n=new T,i=new T){super(),this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new T){const n=e,i=this.v0,s=this.v1,o=this.v2,a=this.v3;return n.set(vr(t,i.x,s.x,o.x,a.x),vr(t,i.y,s.y,o.y,a.y),vr(t,i.z,s.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}pu.prototype.isCubicBezierCurve3=!0;class xo extends De{constructor(t=new et,e=new et){super(),this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new et){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e){const n=e||new et;return n.copy(this.v2).sub(this.v1).normalize(),n}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}xo.prototype.isLineCurve=!0;class u_ extends De{constructor(t=new T,e=new T){super(),this.type="LineCurve3",this.isLineCurve3=!0,this.v1=t,this.v2=e}getPoint(t,e=new T){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class ol extends De{constructor(t=new et,e=new et,n=new et){super(),this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new et){const n=e,i=this.v0,s=this.v1,o=this.v2;return n.set(_r(t,i.x,s.x,o.x),_r(t,i.y,s.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}ol.prototype.isQuadraticBezierCurve=!0;class mu extends De{constructor(t=new T,e=new T,n=new T){super(),this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new T){const n=e,i=this.v0,s=this.v1,o=this.v2;return n.set(_r(t,i.x,s.x,o.x),_r(t,i.y,s.y,o.y),_r(t,i.z,s.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}mu.prototype.isQuadraticBezierCurve3=!0;class al extends De{constructor(t=[]){super(),this.type="SplineCurve",this.points=t}getPoint(t,e=new et){const n=e,i=this.points,s=(i.length-1)*t,o=Math.floor(s),a=s-o,l=i[o===0?o:o-1],c=i[o],h=i[o>i.length-2?i.length-1:o+1],u=i[o>i.length-3?i.length-1:o+2];return n.set(eh(a,l.x,c.x,h.x,u.x),eh(a,l.y,c.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new et().fromArray(i))}return this}}al.prototype.isSplineCurve=!0;var gu=Object.freeze({__proto__:null,ArcCurve:du,CatmullRomCurve3:fu,CubicBezierCurve:sl,CubicBezierCurve3:pu,EllipseCurve:go,LineCurve:xo,LineCurve3:u_,QuadraticBezierCurve:ol,QuadraticBezierCurve3:mu,SplineCurve:al});class d_ extends De{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);t.equals(e)||this.curves.push(new xo(e,t))}getPoint(t,e){const n=t*this.getLength(),i=this.getCurveLengths();let s=0;for(;s<i.length;){if(i[s]>=n){const o=i[s]-n,a=this.curves[s],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}s++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let i=0,s=this.curves;i<s.length;i++){const o=s[i],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(new gu[i.type]().fromJSON(i))}return this}}class Da extends d_{constructor(t){super(),this.type="Path",this.currentPoint=new et,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new xo(this.currentPoint.clone(),new et(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){const s=new ol(this.currentPoint.clone(),new et(t,e),new et(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,s,o){const a=new sl(this.currentPoint.clone(),new et(t,e),new et(n,i),new et(s,o));return this.curves.push(a),this.currentPoint.set(s,o),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new al(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,s,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,i,s,o),this}absarc(t,e,n,i,s,o){return this.absellipse(t,e,n,n,i,s,o),this}ellipse(t,e,n,i,s,o,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,i,s,o,a,l),this}absellipse(t,e,n,i,s,o,a,l){const c=new go(t,e,n,i,s,o,a,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class xu extends Kt{constructor(t=1,e=1,n=1,i=8,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),s=Math.floor(s);const h=[],u=[],d=[],f=[];let g=0;const m=[],p=n/2;let x=0;v(),o===!1&&(t>0&&w(!0),e>0&&w(!1)),this.setIndex(h),this.setAttribute("position",new Zt(u,3)),this.setAttribute("normal",new Zt(d,3)),this.setAttribute("uv",new Zt(f,2));function v(){const y=new T,b=new T;let C=0;const R=(e-t)/n;for(let D=0;D<=s;D++){const V=[],F=D/s,_=F*(e-t)+t;for(let A=0;A<=i;A++){const j=A/i,I=j*l+a,z=Math.sin(I),B=Math.cos(I);b.x=_*z,b.y=-F*n+p,b.z=_*B,u.push(b.x,b.y,b.z),y.set(z,R,B).normalize(),d.push(y.x,y.y,y.z),f.push(j,1-F),V.push(g++)}m.push(V)}for(let D=0;D<i;D++)for(let V=0;V<s;V++){const F=m[V][D],_=m[V+1][D],A=m[V+1][D+1],j=m[V][D+1];h.push(F,_,j),h.push(_,A,j),C+=6}c.addGroup(x,C,0),x+=C}function w(y){const b=g,C=new et,R=new T;let D=0;const V=y===!0?t:e,F=y===!0?1:-1;for(let A=1;A<=i;A++)u.push(0,p*F,0),d.push(0,F,0),f.push(.5,.5),g++;const _=g;for(let A=0;A<=i;A++){const I=A/i*l+a,z=Math.cos(I),B=Math.sin(I);R.x=V*B,R.y=p*F,R.z=V*z,u.push(R.x,R.y,R.z),d.push(0,F,0),C.x=z*.5+.5,C.y=B*.5*F+.5,f.push(C.x,C.y),g++}for(let A=0;A<i;A++){const j=b+A,I=_+A;y===!0?h.push(I,I+1,j):h.push(I+1,I,j),D+=3}c.addGroup(x,D,y===!0?1:2),x+=D}}static fromJSON(t){return new xu(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}new T;new T;new T;new ae;class kr extends Da{constructor(t){super(t),this.uuid=tn(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,i=this.holes.length;n<i;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const i=t.holes[e];this.holes.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const i=this.holes[e];t.holes.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const i=t.holes[e];this.holes.push(new Da().fromJSON(i))}return this}}const f_={triangulate:function(r,t,e=2){const n=t&&t.length,i=n?t[0]*e:r.length;let s=_u(r,0,i,e,!0);const o=[];if(!s||s.next===s.prev)return o;let a,l,c,h,u,d,f;if(n&&(s=__(r,t,s,e)),r.length>80*e){a=c=r[0],l=h=r[1];for(let g=e;g<i;g+=e)u=r[g],d=r[g+1],u<a&&(a=u),d<l&&(l=d),u>c&&(c=u),d>h&&(h=d);f=Math.max(c-a,h-l),f=f!==0?1/f:0}return Ar(s,o,e,a,l,f),o}};function _u(r,t,e,n,i){let s,o;if(i===L_(r,t,e,n)>0)for(s=t;s<e;s+=n)o=nh(s,r[s],r[s+1],o);else for(s=e-n;s>=t;s-=n)o=nh(s,r[s],r[s+1],o);return o&&_o(o,o.next)&&(Lr(o),o=o.next),o}function Cn(r,t){if(!r)return r;t||(t=r);let e=r,n;do if(n=!1,!e.steiner&&(_o(e,e.next)||ne(e.prev,e,e.next)===0)){if(Lr(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Ar(r,t,e,n,i,s,o){if(!r)return;!o&&s&&w_(r,n,i,s);let a=r,l,c;for(;r.prev!==r.next;){if(l=r.prev,c=r.next,s?m_(r,n,i,s):p_(r)){t.push(l.i/e),t.push(r.i/e),t.push(c.i/e),Lr(r),r=c.next,a=c.next;continue}if(r=c,r===a){o?o===1?(r=g_(Cn(r),t,e),Ar(r,t,e,n,i,s,2)):o===2&&x_(r,t,e,n,i,s):Ar(Cn(r),t,e,n,i,s,1);break}}}function p_(r){const t=r.prev,e=r,n=r.next;if(ne(t,e,n)>=0)return!1;let i=r.next.next;for(;i!==r.prev;){if(Ti(t.x,t.y,e.x,e.y,n.x,n.y,i.x,i.y)&&ne(i.prev,i,i.next)>=0)return!1;i=i.next}return!0}function m_(r,t,e,n){const i=r.prev,s=r,o=r.next;if(ne(i,s,o)>=0)return!1;const a=i.x<s.x?i.x<o.x?i.x:o.x:s.x<o.x?s.x:o.x,l=i.y<s.y?i.y<o.y?i.y:o.y:s.y<o.y?s.y:o.y,c=i.x>s.x?i.x>o.x?i.x:o.x:s.x>o.x?s.x:o.x,h=i.y>s.y?i.y>o.y?i.y:o.y:s.y>o.y?s.y:o.y,u=Na(a,l,t,e,n),d=Na(c,h,t,e,n);let f=r.prevZ,g=r.nextZ;for(;f&&f.z>=u&&g&&g.z<=d;){if(f!==r.prev&&f!==r.next&&Ti(i.x,i.y,s.x,s.y,o.x,o.y,f.x,f.y)&&ne(f.prev,f,f.next)>=0||(f=f.prevZ,g!==r.prev&&g!==r.next&&Ti(i.x,i.y,s.x,s.y,o.x,o.y,g.x,g.y)&&ne(g.prev,g,g.next)>=0))return!1;g=g.nextZ}for(;f&&f.z>=u;){if(f!==r.prev&&f!==r.next&&Ti(i.x,i.y,s.x,s.y,o.x,o.y,f.x,f.y)&&ne(f.prev,f,f.next)>=0)return!1;f=f.prevZ}for(;g&&g.z<=d;){if(g!==r.prev&&g!==r.next&&Ti(i.x,i.y,s.x,s.y,o.x,o.y,g.x,g.y)&&ne(g.prev,g,g.next)>=0)return!1;g=g.nextZ}return!0}function g_(r,t,e){let n=r;do{const i=n.prev,s=n.next.next;!_o(i,s)&&vu(i,n,n.next,s)&&Cr(i,s)&&Cr(s,i)&&(t.push(i.i/e),t.push(n.i/e),t.push(s.i/e),Lr(n),Lr(n.next),n=r=s),n=n.next}while(n!==r);return Cn(n)}function x_(r,t,e,n,i,s){let o=r;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&T_(o,a)){let l=yu(o,a);o=Cn(o,o.next),l=Cn(l,l.next),Ar(o,t,e,n,i,s),Ar(l,t,e,n,i,s);return}a=a.next}o=o.next}while(o!==r)}function __(r,t,e,n){const i=[];let s,o,a,l,c;for(s=0,o=t.length;s<o;s++)a=t[s]*n,l=s<o-1?t[s+1]*n:r.length,c=_u(r,a,l,n,!1),c===c.next&&(c.steiner=!0),i.push(E_(c));for(i.sort(v_),s=0;s<i.length;s++)y_(i[s],e),e=Cn(e,e.next);return e}function v_(r,t){return r.x-t.x}function y_(r,t){if(t=M_(r,t),t){const e=yu(t,r);Cn(t,t.next),Cn(e,e.next)}}function M_(r,t){let e=t;const n=r.x,i=r.y;let s=-1/0,o;do{if(i<=e.y&&i>=e.next.y&&e.next.y!==e.y){const d=e.x+(i-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(d<=n&&d>s){if(s=d,d===n){if(i===e.y)return e;if(i===e.next.y)return e.next}o=e.x<e.next.x?e:e.next}}e=e.next}while(e!==t);if(!o)return null;if(n===s)return o;const a=o,l=o.x,c=o.y;let h=1/0,u;e=o;do n>=e.x&&e.x>=l&&n!==e.x&&Ti(i<c?n:s,i,l,c,i<c?s:n,i,e.x,e.y)&&(u=Math.abs(i-e.y)/(n-e.x),Cr(e,r)&&(u<h||u===h&&(e.x>o.x||e.x===o.x&&b_(o,e)))&&(o=e,h=u)),e=e.next;while(e!==a);return o}function b_(r,t){return ne(r.prev,r,t.prev)<0&&ne(t.next,r,r.next)<0}function w_(r,t,e,n){let i=r;do i.z===null&&(i.z=Na(i.x,i.y,t,e,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,S_(i)}function S_(r){let t,e,n,i,s,o,a,l,c=1;do{for(e=r,r=null,s=null,o=0;e;){for(o++,n=e,a=0,t=0;t<c&&(a++,n=n.nextZ,!!n);t++);for(l=c;a>0||l>0&&n;)a!==0&&(l===0||!n||e.z<=n.z)?(i=e,e=e.nextZ,a--):(i=n,n=n.nextZ,l--),s?s.nextZ=i:r=i,i.prevZ=s,s=i;e=n}s.nextZ=null,c*=2}while(o>1);return r}function Na(r,t,e,n,i){return r=32767*(r-e)*i,t=32767*(t-n)*i,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,r|t<<1}function E_(r){let t=r,e=r;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==r);return e}function Ti(r,t,e,n,i,s,o,a){return(i-o)*(t-a)-(r-o)*(s-a)>=0&&(r-o)*(n-a)-(e-o)*(t-a)>=0&&(e-o)*(s-a)-(i-o)*(n-a)>=0}function T_(r,t){return r.next.i!==t.i&&r.prev.i!==t.i&&!A_(r,t)&&(Cr(r,t)&&Cr(t,r)&&C_(r,t)&&(ne(r.prev,r,t.prev)||ne(r,t.prev,t))||_o(r,t)&&ne(r.prev,r,r.next)>0&&ne(t.prev,t,t.next)>0)}function ne(r,t,e){return(t.y-r.y)*(e.x-t.x)-(t.x-r.x)*(e.y-t.y)}function _o(r,t){return r.x===t.x&&r.y===t.y}function vu(r,t,e,n){const i=Ms(ne(r,t,e)),s=Ms(ne(r,t,n)),o=Ms(ne(e,n,r)),a=Ms(ne(e,n,t));return!!(i!==s&&o!==a||i===0&&ys(r,e,t)||s===0&&ys(r,n,t)||o===0&&ys(e,r,n)||a===0&&ys(e,t,n))}function ys(r,t,e){return t.x<=Math.max(r.x,e.x)&&t.x>=Math.min(r.x,e.x)&&t.y<=Math.max(r.y,e.y)&&t.y>=Math.min(r.y,e.y)}function Ms(r){return r>0?1:r<0?-1:0}function A_(r,t){let e=r;do{if(e.i!==r.i&&e.next.i!==r.i&&e.i!==t.i&&e.next.i!==t.i&&vu(e,e.next,r,t))return!0;e=e.next}while(e!==r);return!1}function Cr(r,t){return ne(r.prev,r,r.next)<0?ne(r,t,r.next)>=0&&ne(r,r.prev,t)>=0:ne(r,t,r.prev)<0||ne(r,r.next,t)<0}function C_(r,t){let e=r,n=!1;const i=(r.x+t.x)/2,s=(r.y+t.y)/2;do e.y>s!=e.next.y>s&&e.next.y!==e.y&&i<(e.next.x-e.x)*(s-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==r);return n}function yu(r,t){const e=new Fa(r.i,r.x,r.y),n=new Fa(t.i,t.x,t.y),i=r.next,s=t.prev;return r.next=t,t.prev=r,e.next=i,i.prev=e,n.next=e,e.prev=n,s.next=n,n.prev=s,n}function nh(r,t,e,n){const i=new Fa(r,t,e);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Lr(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function Fa(r,t,e){this.i=r,this.x=t,this.y=e,this.prev=null,this.next=null,this.z=null,this.prevZ=null,this.nextZ=null,this.steiner=!1}function L_(r,t,e,n){let i=0;for(let s=t,o=e-n;s<e;s+=n)i+=(r[o]-r[s])*(r[s+1]+r[o+1]),o=s;return i}class An{static area(t){const e=t.length;let n=0;for(let i=e-1,s=0;s<e;i=s++)n+=t[i].x*t[s].y-t[s].x*t[i].y;return n*.5}static isClockWise(t){return An.area(t)<0}static triangulateShape(t,e){const n=[],i=[],s=[];ih(t),rh(n,t);let o=t.length;e.forEach(ih);for(let l=0;l<e.length;l++)i.push(o),o+=e[l].length,rh(n,e[l]);const a=f_.triangulate(n,i);for(let l=0;l<a.length;l+=3)s.push(a.slice(l,l+3));return s}}function ih(r){const t=r.length;t>2&&r[t-1].equals(r[0])&&r.pop()}function rh(r,t){for(let e=0;e<t.length;e++)r.push(t[e].x),r.push(t[e].y)}class Ki extends Kt{constructor(t=new kr([new et(.5,.5),new et(-.5,.5),new et(-.5,-.5),new et(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];const n=this,i=[],s=[];for(let a=0,l=t.length;a<l;a++){const c=t[a];o(c)}this.setAttribute("position",new Zt(i,3)),this.setAttribute("uv",new Zt(s,2)),this.computeVertexNormals();function o(a){const l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1;let u=e.depth!==void 0?e.depth:1,d=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,g=e.bevelSize!==void 0?e.bevelSize:f-.1,m=e.bevelOffset!==void 0?e.bevelOffset:0,p=e.bevelSegments!==void 0?e.bevelSegments:3;const x=e.extrudePath,v=e.UVGenerator!==void 0?e.UVGenerator:R_;e.amount!==void 0&&(console.warn("THREE.ExtrudeBufferGeometry: amount has been renamed to depth."),u=e.amount);let w,y=!1,b,C,R,D;x&&(w=x.getSpacedPoints(h),y=!0,d=!1,b=x.computeFrenetFrames(h,!1),C=new T,R=new T,D=new T),d||(p=0,f=0,g=0,m=0);const V=a.extractPoints(c);let F=V.shape;const _=V.holes;if(!An.isClockWise(F)){F=F.reverse();for(let G=0,$=_.length;G<$;G++){const rt=_[G];An.isClockWise(rt)&&(_[G]=rt.reverse())}}const j=An.triangulateShape(F,_),I=F;for(let G=0,$=_.length;G<$;G++){const rt=_[G];F=F.concat(rt)}function z(G,$,rt){return $||console.error("THREE.ExtrudeGeometry: vec does not exist"),$.clone().multiplyScalar(rt).add(G)}const B=F.length,k=j.length;function P(G,$,rt){let gt,Z,nt;const st=G.x-$.x,ot=G.y-$.y,It=rt.x-G.x,zt=rt.y-G.y,E=st*st+ot*ot,M=st*zt-ot*It;if(Math.abs(M)>Number.EPSILON){const U=Math.sqrt(E),tt=Math.sqrt(It*It+zt*zt),ut=$.x-ot/U,ft=$.y+st/U,St=rt.x-zt/tt,q=rt.y+It/tt,Dt=((St-ut)*zt-(q-ft)*It)/(st*zt-ot*It);gt=ut+st*Dt-G.x,Z=ft+ot*Dt-G.y;const Bt=gt*gt+Z*Z;if(Bt<=2)return new et(gt,Z);nt=Math.sqrt(Bt/2)}else{let U=!1;st>Number.EPSILON?It>Number.EPSILON&&(U=!0):st<-Number.EPSILON?It<-Number.EPSILON&&(U=!0):Math.sign(ot)===Math.sign(zt)&&(U=!0),U?(gt=-ot,Z=st,nt=Math.sqrt(E)):(gt=st,Z=ot,nt=Math.sqrt(E/2))}return new et(gt/nt,Z/nt)}const X=[];for(let G=0,$=I.length,rt=$-1,gt=G+1;G<$;G++,rt++,gt++)rt===$&&(rt=0),gt===$&&(gt=0),X[G]=P(I[G],I[rt],I[gt]);const Y=[];let Q,K=X.concat();for(let G=0,$=_.length;G<$;G++){const rt=_[G];Q=[];for(let gt=0,Z=rt.length,nt=Z-1,st=gt+1;gt<Z;gt++,nt++,st++)nt===Z&&(nt=0),st===Z&&(st=0),Q[gt]=P(rt[gt],rt[nt],rt[st]);Y.push(Q),K=K.concat(Q)}for(let G=0;G<p;G++){const $=G/p,rt=f*Math.cos($*Math.PI/2),gt=g*Math.sin($*Math.PI/2)+m;for(let Z=0,nt=I.length;Z<nt;Z++){const st=z(I[Z],X[Z],gt);pt(st.x,st.y,-rt)}for(let Z=0,nt=_.length;Z<nt;Z++){const st=_[Z];Q=Y[Z];for(let ot=0,It=st.length;ot<It;ot++){const zt=z(st[ot],Q[ot],gt);pt(zt.x,zt.y,-rt)}}}const at=g+m;for(let G=0;G<B;G++){const $=d?z(F[G],K[G],at):F[G];y?(R.copy(b.normals[0]).multiplyScalar($.x),C.copy(b.binormals[0]).multiplyScalar($.y),D.copy(w[0]).add(R).add(C),pt(D.x,D.y,D.z)):pt($.x,$.y,0)}for(let G=1;G<=h;G++)for(let $=0;$<B;$++){const rt=d?z(F[$],K[$],at):F[$];y?(R.copy(b.normals[G]).multiplyScalar(rt.x),C.copy(b.binormals[G]).multiplyScalar(rt.y),D.copy(w[G]).add(R).add(C),pt(D.x,D.y,D.z)):pt(rt.x,rt.y,u/h*G)}for(let G=p-1;G>=0;G--){const $=G/p,rt=f*Math.cos($*Math.PI/2),gt=g*Math.sin($*Math.PI/2)+m;for(let Z=0,nt=I.length;Z<nt;Z++){const st=z(I[Z],X[Z],gt);pt(st.x,st.y,u+rt)}for(let Z=0,nt=_.length;Z<nt;Z++){const st=_[Z];Q=Y[Z];for(let ot=0,It=st.length;ot<It;ot++){const zt=z(st[ot],Q[ot],gt);y?pt(zt.x,zt.y+w[h-1].y,w[h-1].x+rt):pt(zt.x,zt.y,u+rt)}}}bt(),xt();function bt(){const G=i.length/3;if(d){let $=0,rt=B*$;for(let gt=0;gt<k;gt++){const Z=j[gt];yt(Z[2]+rt,Z[1]+rt,Z[0]+rt)}$=h+p*2,rt=B*$;for(let gt=0;gt<k;gt++){const Z=j[gt];yt(Z[0]+rt,Z[1]+rt,Z[2]+rt)}}else{for(let $=0;$<k;$++){const rt=j[$];yt(rt[2],rt[1],rt[0])}for(let $=0;$<k;$++){const rt=j[$];yt(rt[0]+B*h,rt[1]+B*h,rt[2]+B*h)}}n.addGroup(G,i.length/3-G,0)}function xt(){const G=i.length/3;let $=0;W(I,$),$+=I.length;for(let rt=0,gt=_.length;rt<gt;rt++){const Z=_[rt];W(Z,$),$+=Z.length}n.addGroup(G,i.length/3-G,1)}function W(G,$){let rt=G.length;for(;--rt>=0;){const gt=rt;let Z=rt-1;Z<0&&(Z=G.length-1);for(let nt=0,st=h+p*2;nt<st;nt++){const ot=B*nt,It=B*(nt+1),zt=$+gt+ot,E=$+Z+ot,M=$+Z+It,U=$+gt+It;wt(zt,E,M,U)}}}function pt(G,$,rt){l.push(G),l.push($),l.push(rt)}function yt(G,$,rt){it(G),it($),it(rt);const gt=i.length/3,Z=v.generateTopUV(n,i,gt-3,gt-2,gt-1);Ct(Z[0]),Ct(Z[1]),Ct(Z[2])}function wt(G,$,rt,gt){it(G),it($),it(gt),it($),it(rt),it(gt);const Z=i.length/3,nt=v.generateSideWallUV(n,i,Z-6,Z-3,Z-2,Z-1);Ct(nt[0]),Ct(nt[1]),Ct(nt[3]),Ct(nt[1]),Ct(nt[2]),Ct(nt[3])}function it(G){i.push(l[G*3+0]),i.push(l[G*3+1]),i.push(l[G*3+2])}function Ct(G){s.push(G.x),s.push(G.y)}}}toJSON(){const t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return P_(e,n,t)}static fromJSON(t,e){const n=[];for(let s=0,o=t.shapes.length;s<o;s++){const a=e[t.shapes[s]];n.push(a)}const i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new gu[i.type]().fromJSON(i)),new Ki(n,t.options)}}const R_={generateTopUV:function(r,t,e,n,i){const s=t[e*3],o=t[e*3+1],a=t[n*3],l=t[n*3+1],c=t[i*3],h=t[i*3+1];return[new et(s,o),new et(a,l),new et(c,h)]},generateSideWallUV:function(r,t,e,n,i,s){const o=t[e*3],a=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],u=t[n*3+2],d=t[i*3],f=t[i*3+1],g=t[i*3+2],m=t[s*3],p=t[s*3+1],x=t[s*3+2];return Math.abs(a-h)<Math.abs(o-c)?[new et(o,1-l),new et(c,1-u),new et(d,1-g),new et(m,1-x)]:[new et(a,1-l),new et(h,1-u),new et(f,1-g),new et(p,1-x)]}};function P_(r,t,e){if(e.shapes=[],Array.isArray(r))for(let n=0,i=r.length;n<i;n++){const s=r[n];e.shapes.push(s.uuid)}else e.shapes.push(r.uuid);return t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}class ll extends Kt{constructor(t=new kr([new et(0,.5),new et(-.5,-.5),new et(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};const n=[],i=[],s=[],o=[];let a=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(a,l,h),a+=l,l=0;this.setIndex(n),this.setAttribute("position",new Zt(i,3)),this.setAttribute("normal",new Zt(s,3)),this.setAttribute("uv",new Zt(o,2));function c(h){const u=i.length/3,d=h.extractPoints(e);let f=d.shape;const g=d.holes;An.isClockWise(f)===!1&&(f=f.reverse());for(let p=0,x=g.length;p<x;p++){const v=g[p];An.isClockWise(v)===!0&&(g[p]=v.reverse())}const m=An.triangulateShape(f,g);for(let p=0,x=g.length;p<x;p++){const v=g[p];f=f.concat(v)}for(let p=0,x=f.length;p<x;p++){const v=f[p];i.push(v.x,v.y,0),s.push(0,0,1),o.push(v.x,v.y)}for(let p=0,x=m.length;p<x;p++){const v=m[p],w=v[0]+u,y=v[1]+u,b=v[2]+u;n.push(w,y,b),l+=3}}}toJSON(){const t=super.toJSON(),e=this.parameters.shapes;return I_(e,t)}static fromJSON(t,e){const n=[];for(let i=0,s=t.shapes.length;i<s;i++){const o=e[t.shapes[i]];n.push(o)}return new ll(n,t.curveSegments)}}function I_(r,t){if(t.shapes=[],Array.isArray(r))for(let e=0,n=r.length;e<n;e++){const i=r[e];t.shapes.push(i.uuid)}else t.shapes.push(r.uuid);return t}class Mu extends Kt{constructor(t=1,e=32,n=16,i=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:s,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],u=new T,d=new T,f=[],g=[],m=[],p=[];for(let x=0;x<=n;x++){const v=[],w=x/n;let y=0;x==0&&o==0?y=.5/e:x==n&&l==Math.PI&&(y=-.5/e);for(let b=0;b<=e;b++){const C=b/e;u.x=-t*Math.cos(i+C*s)*Math.sin(o+w*a),u.y=t*Math.cos(o+w*a),u.z=t*Math.sin(i+C*s)*Math.sin(o+w*a),g.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),p.push(C+y,1-w),v.push(c++)}h.push(v)}for(let x=0;x<n;x++)for(let v=0;v<e;v++){const w=h[x][v+1],y=h[x][v],b=h[x+1][v],C=h[x+1][v+1];(x!==0||o>0)&&f.push(w,y,C),(x!==n-1||l<Math.PI)&&f.push(y,b,C)}this.setIndex(f),this.setAttribute("position",new Zt(g,3)),this.setAttribute("normal",new Zt(m,3)),this.setAttribute("uv",new Zt(p,2))}static fromJSON(t){return new Mu(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class bu extends Kt{constructor(t=1,e=.4,n=8,i=6,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:s},n=Math.floor(n),i=Math.floor(i);const o=[],a=[],l=[],c=[],h=new T,u=new T,d=new T;for(let f=0;f<=n;f++)for(let g=0;g<=i;g++){const m=g/i*s,p=f/n*Math.PI*2;u.x=(t+e*Math.cos(p))*Math.cos(m),u.y=(t+e*Math.cos(p))*Math.sin(m),u.z=e*Math.sin(p),a.push(u.x,u.y,u.z),h.x=t*Math.cos(m),h.y=t*Math.sin(m),d.subVectors(u,h).normalize(),l.push(d.x,d.y,d.z),c.push(g/i),c.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=i;g++){const m=(i+1)*f+g-1,p=(i+1)*(f-1)+g-1,x=(i+1)*(f-1)+g,v=(i+1)*f+g;o.push(m,p,v),o.push(p,x,v)}this.setIndex(o),this.setAttribute("position",new Zt(a,3)),this.setAttribute("normal",new Zt(l,3)),this.setAttribute("uv",new Zt(c,2))}static fromJSON(t){return new bu(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class wu extends he{constructor(t){super(),this.type="ShadowMaterial",this.color=new vt(0),this.transparent=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this}}wu.prototype.isShadowMaterial=!0;class Su extends Ge{constructor(t){super(t),this.type="RawShaderMaterial"}}Su.prototype.isRawShaderMaterial=!0;class cl extends he{constructor(t){super(),this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new vt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ji,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this}}cl.prototype.isMeshStandardMaterial=!0;class Eu extends cl{constructor(t){super(),this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new et(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return ye(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.sheenColor=new vt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=0,this.attenuationColor=new vt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new vt(1,1,1),this.specularColorMap=null,this._sheen=0,this._clearcoat=0,this._transmission=0,this.setValues(t)}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.ior=t.ior,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}Eu.prototype.isMeshPhysicalMaterial=!0;class Tu extends he{constructor(t){super(),this.type="MeshPhongMaterial",this.color=new vt(16777215),this.specular=new vt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ji,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=ao,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this}}Tu.prototype.isMeshPhongMaterial=!0;class Au extends he{constructor(t){super(),this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new vt(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ji,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.gradientMap=t.gradientMap,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.alphaMap=t.alphaMap,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this}}Au.prototype.isMeshToonMaterial=!0;class Cu extends he{constructor(t){super(),this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ji,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.flatShading=t.flatShading,this}}Cu.prototype.isMeshNormalMaterial=!0;class Lu extends he{constructor(t){super(),this.type="MeshLambertMaterial",this.color=new vt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=ao,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this}}Lu.prototype.isMeshLambertMaterial=!0;class Ru extends he{constructor(t){super(),this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new vt(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ji,this.normalScale=new et(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.flatShading=!1,this.setValues(t)}copy(t){return super.copy(t),this.defines={MATCAP:""},this.color.copy(t.color),this.matcap=t.matcap,this.map=t.map,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.alphaMap=t.alphaMap,this.flatShading=t.flatShading,this}}Ru.prototype.isMeshMatcapMaterial=!0;class Pu extends Zi{constructor(t){super(),this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(t)}copy(t){return super.copy(t),this.scale=t.scale,this.dashSize=t.dashSize,this.gapSize=t.gapSize,this}}Pu.prototype.isLineDashedMaterial=!0;const D_={ShadowMaterial:wu,SpriteMaterial:tl,RawShaderMaterial:Su,ShaderMaterial:Ge,PointsMaterial:il,MeshPhysicalMaterial:Eu,MeshStandardMaterial:cl,MeshPhongMaterial:Tu,MeshToonMaterial:Au,MeshNormalMaterial:Cu,MeshLambertMaterial:Lu,MeshDepthMaterial:Za,MeshDistanceMaterial:Ka,MeshBasicMaterial:uo,MeshMatcapMaterial:Ru,LineDashedMaterial:Pu,LineBasicMaterial:Zi,Material:he};he.fromType=function(r){return new D_[r]};const ee={arraySlice:function(r,t,e){return ee.isTypedArray(r)?new r.constructor(r.subarray(t,e!==void 0?e:r.length)):r.slice(t,e)},convertArray:function(r,t,e){return!r||!e&&r.constructor===t?r:typeof t.BYTES_PER_ELEMENT=="number"?new t(r):Array.prototype.slice.call(r)},isTypedArray:function(r){return ArrayBuffer.isView(r)&&!(r instanceof DataView)},getKeyframeOrder:function(r){function t(i,s){return r[i]-r[s]}const e=r.length,n=new Array(e);for(let i=0;i!==e;++i)n[i]=i;return n.sort(t),n},sortedArray:function(r,t,e){const n=r.length,i=new r.constructor(n);for(let s=0,o=0;o!==n;++s){const a=e[s]*t;for(let l=0;l!==t;++l)i[o++]=r[a+l]}return i},flattenJSON:function(r,t,e,n){let i=1,s=r[0];for(;s!==void 0&&s[n]===void 0;)s=r[i++];if(s===void 0)return;let o=s[n];if(o!==void 0)if(Array.isArray(o))do o=s[n],o!==void 0&&(t.push(s.time),e.push.apply(e,o)),s=r[i++];while(s!==void 0);else if(o.toArray!==void 0)do o=s[n],o!==void 0&&(t.push(s.time),o.toArray(e,e.length)),s=r[i++];while(s!==void 0);else do o=s[n],o!==void 0&&(t.push(s.time),e.push(o)),s=r[i++];while(s!==void 0)},subclip:function(r,t,e,n,i=30){const s=r.clone();s.name=t;const o=[];for(let l=0;l<s.tracks.length;++l){const c=s.tracks[l],h=c.getValueSize(),u=[],d=[];for(let f=0;f<c.times.length;++f){const g=c.times[f]*i;if(!(g<e||g>=n)){u.push(c.times[f]);for(let m=0;m<h;++m)d.push(c.values[f*h+m])}}u.length!==0&&(c.times=ee.convertArray(u,c.times.constructor),c.values=ee.convertArray(d,c.values.constructor),o.push(c))}s.tracks=o;let a=1/0;for(let l=0;l<s.tracks.length;++l)a>s.tracks[l].times[0]&&(a=s.tracks[l].times[0]);for(let l=0;l<s.tracks.length;++l)s.tracks[l].shift(-1*a);return s.resetDuration(),s},makeClipAdditive:function(r,t=0,e=r,n=30){n<=0&&(n=30);const i=e.tracks.length,s=t/n;for(let o=0;o<i;++o){const a=e.tracks[o],l=a.ValueTypeName;if(l==="bool"||l==="string")continue;const c=r.tracks.find(function(x){return x.name===a.name&&x.ValueTypeName===l});if(c===void 0)continue;let h=0;const u=a.getValueSize();a.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(h=u/3);let d=0;const f=c.getValueSize();c.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(d=f/3);const g=a.times.length-1;let m;if(s<=a.times[0]){const x=h,v=u-h;m=ee.arraySlice(a.values,x,v)}else if(s>=a.times[g]){const x=g*u+h,v=x+u-h;m=ee.arraySlice(a.values,x,v)}else{const x=a.createInterpolant(),v=h,w=u-h;x.evaluate(s),m=ee.arraySlice(x.resultBuffer,v,w)}l==="quaternion"&&new Ae().fromArray(m).normalize().conjugate().toArray(m);const p=c.times.length;for(let x=0;x<p;++x){const v=x*f+d;if(l==="quaternion")Ae.multiplyQuaternionsFlat(c.values,v,m,0,c.values,v);else{const w=f-d*2;for(let y=0;y<w;++y)c.values[v+y]-=m[y]}}}return r.blendMode=Wh,r}};class Ln{constructor(t,e,n,i){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){const e=this.parameterPositions;let n=this._cachedIndex,i=e[n],s=e[n-1];t:{e:{let o;n:{i:if(!(t<i)){for(let a=n+2;;){if(i===void 0){if(t<s)break i;return n=e.length,this._cachedIndex=n,this.afterEnd_(n-1,t,s)}if(n===a)break;if(s=i,i=e[++n],t<i)break e}o=e.length;break n}if(!(t>=s)){const a=e[1];t<a&&(n=2,s=a);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.beforeStart_(0,t,i);if(n===l)break;if(i=s,s=e[--n-1],t>=s)break e}o=n,n=0;break n}break t}for(;n<o;){const a=n+o>>>1;t<e[a]?o=a:n=a+1}if(i=e[n],s=e[n-1],s===void 0)return this._cachedIndex=0,this.beforeStart_(0,t,i);if(i===void 0)return n=e.length,this._cachedIndex=n,this.afterEnd_(n-1,s,t)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,t,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){const e=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=t*i;for(let o=0;o!==i;++o)e[o]=n[s+o];return e}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}Ln.prototype.beforeStart_=Ln.prototype.copySampleValue_;Ln.prototype.afterEnd_=Ln.prototype.copySampleValue_;class N_ extends Ln{constructor(t,e,n,i){super(t,e,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:wi,endingEnd:wi}}intervalChanged_(t,e,n){const i=this.parameterPositions;let s=t-2,o=t+1,a=i[s],l=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case Si:s=t,a=2*e-n;break;case Fs:s=i.length-2,a=e+i[s]-i[s+1];break;default:s=t,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Si:o=t,l=2*n-e;break;case Fs:o=1,l=n+i[1]-i[0];break;default:o=t-1,l=e}const c=(n-e)*.5,h=this.valueSize;this._weightPrev=c/(e-a),this._weightNext=c/(l-n),this._offsetPrev=s*h,this._offsetNext=o*h}interpolate_(t,e,n,i){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-e)/(i-e),m=g*g,p=m*g,x=-d*p+2*d*m-d*g,v=(1+d)*p+(-1.5-2*d)*m+(-.5+d)*g+1,w=(-1-f)*p+(1.5+f)*m+.5*g,y=f*p-f*m;for(let b=0;b!==a;++b)s[b]=x*o[h+b]+v*o[c+b]+w*o[l+b]+y*o[u+b];return s}}class Iu extends Ln{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=t*a,c=l-a,h=(n-e)/(i-e),u=1-h;for(let d=0;d!==a;++d)s[d]=o[c+d]*u+o[l+d]*h;return s}}class F_ extends Ln{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t){return this.copySampleValue_(t-1)}}class rn{constructor(t,e,n,i){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=ee.convertArray(e,this.TimeBufferType),this.values=ee.convertArray(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(t){const e=t.constructor;let n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:ee.convertArray(t.times,Array),values:ee.convertArray(t.values,Array)};const i=t.getInterpolation();i!==t.DefaultInterpolation&&(n.interpolation=i)}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new F_(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Iu(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new N_(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let e;switch(t){case Ds:e=this.InterpolantFactoryMethodDiscrete;break;case Ns:e=this.InterpolantFactoryMethodLinear;break;case No:e=this.InterpolantFactoryMethodSmooth;break}if(e===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ds;case this.InterpolantFactoryMethodLinear:return Ns;case this.InterpolantFactoryMethodSmooth:return No}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){const e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]+=t}return this}scale(t){if(t!==1){const e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]*=t}return this}trim(t,e){const n=this.times,i=n.length;let s=0,o=i-1;for(;s!==i&&n[s]<t;)++s;for(;o!==-1&&n[o]>e;)--o;if(++o,s!==0||o!==i){s>=o&&(o=Math.max(o,1),s=o-1);const a=this.getValueSize();this.times=ee.arraySlice(n,s,o),this.values=ee.arraySlice(this.values,s*a,o*a)}return this}validate(){let t=!0;const e=this.getValueSize();e-Math.floor(e)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);const n=this.times,i=this.values,s=n.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==s;a++){const l=n[a];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,l),t=!1;break}if(o!==null&&o>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,l,o),t=!1;break}o=l}if(i!==void 0&&ee.isTypedArray(i))for(let a=0,l=i.length;a!==l;++a){const c=i[a];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,c),t=!1;break}}return t}optimize(){const t=ee.arraySlice(this.times),e=ee.arraySlice(this.values),n=this.getValueSize(),i=this.getInterpolation()===No,s=t.length-1;let o=1;for(let a=1;a<s;++a){let l=!1;const c=t[a],h=t[a+1];if(c!==h&&(a!==1||c!==t[0]))if(i)l=!0;else{const u=a*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){const m=e[u+g];if(m!==e[d+g]||m!==e[f+g]){l=!0;break}}}if(l){if(a!==o){t[o]=t[a];const u=a*n,d=o*n;for(let f=0;f!==n;++f)e[d+f]=e[u+f]}++o}}if(s>0){t[o]=t[s];for(let a=s*n,l=o*n,c=0;c!==n;++c)e[l+c]=e[a+c];++o}return o!==t.length?(this.times=ee.arraySlice(t,0,o),this.values=ee.arraySlice(e,0,o*n)):(this.times=t,this.values=e),this}clone(){const t=ee.arraySlice(this.times,0),e=ee.arraySlice(this.values,0),n=this.constructor,i=new n(this.name,t,e);return i.createInterpolant=this.createInterpolant,i}}rn.prototype.TimeBufferType=Float32Array;rn.prototype.ValueBufferType=Float32Array;rn.prototype.DefaultInterpolation=Ns;class Qi extends rn{}Qi.prototype.ValueTypeName="bool";Qi.prototype.ValueBufferType=Array;Qi.prototype.DefaultInterpolation=Ds;Qi.prototype.InterpolantFactoryMethodLinear=void 0;Qi.prototype.InterpolantFactoryMethodSmooth=void 0;class Du extends rn{}Du.prototype.ValueTypeName="color";class Os extends rn{}Os.prototype.ValueTypeName="number";class B_ extends Ln{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-e)/(i-e);let c=t*a;for(let h=c+a;c!==h;c+=4)Ae.slerpFlat(s,0,o,c-a,o,c,l);return s}}class Hr extends rn{InterpolantFactoryMethodLinear(t){return new B_(this.times,this.values,this.getValueSize(),t)}}Hr.prototype.ValueTypeName="quaternion";Hr.prototype.DefaultInterpolation=Ns;Hr.prototype.InterpolantFactoryMethodSmooth=void 0;class tr extends rn{}tr.prototype.ValueTypeName="string";tr.prototype.ValueBufferType=Array;tr.prototype.DefaultInterpolation=Ds;tr.prototype.InterpolantFactoryMethodLinear=void 0;tr.prototype.InterpolantFactoryMethodSmooth=void 0;class zs extends rn{}zs.prototype.ValueTypeName="vector";class sh{constructor(t,e=-1,n,i=Wa){this.name=t,this.tracks=n,this.duration=e,this.blendMode=i,this.uuid=tn(),this.duration<0&&this.resetDuration()}static parse(t){const e=[],n=t.tracks,i=1/(t.fps||1);for(let o=0,a=n.length;o!==a;++o)e.push(z_(n[o]).scale(i));const s=new this(t.name,t.duration,e,t.blendMode);return s.uuid=t.uuid,s}static toJSON(t){const e=[],n=t.tracks,i={name:t.name,duration:t.duration,tracks:e,uuid:t.uuid,blendMode:t.blendMode};for(let s=0,o=n.length;s!==o;++s)e.push(rn.toJSON(n[s]));return i}static CreateFromMorphTargetSequence(t,e,n,i){const s=e.length,o=[];for(let a=0;a<s;a++){let l=[],c=[];l.push((a+s-1)%s,a,(a+1)%s),c.push(0,1,0);const h=ee.getKeyframeOrder(l);l=ee.sortedArray(l,1,h),c=ee.sortedArray(c,1,h),!i&&l[0]===0&&(l.push(s),c.push(c[0])),o.push(new Os(".morphTargetInfluences["+e[a].name+"]",l,c).scale(1/n))}return new this(t,-1,o)}static findByName(t,e){let n=t;if(!Array.isArray(t)){const i=t;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===e)return n[i];return null}static CreateClipsFromMorphTargetSequences(t,e,n){const i={},s=/^([\w-]*?)([\d]+)$/;for(let a=0,l=t.length;a<l;a++){const c=t[a],h=c.name.match(s);if(h&&h.length>1){const u=h[1];let d=i[u];d||(i[u]=d=[]),d.push(c)}}const o=[];for(const a in i)o.push(this.CreateFromMorphTargetSequence(a,i[a],e,n));return o}static parseAnimation(t,e){if(!t)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(u,d,f,g,m){if(f.length!==0){const p=[],x=[];ee.flattenJSON(f,p,x,g),p.length!==0&&m.push(new u(d,p,x))}},i=[],s=t.name||"default",o=t.fps||30,a=t.blendMode;let l=t.length||-1;const c=t.hierarchy||[];for(let u=0;u<c.length;u++){const d=c[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){const f={};let g;for(g=0;g<d.length;g++)if(d[g].morphTargets)for(let m=0;m<d[g].morphTargets.length;m++)f[d[g].morphTargets[m]]=-1;for(const m in f){const p=[],x=[];for(let v=0;v!==d[g].morphTargets.length;++v){const w=d[g];p.push(w.time),x.push(w.morphTarget===m?1:0)}i.push(new Os(".morphTargetInfluence["+m+"]",p,x))}l=f.length*o}else{const f=".bones["+e[u].name+"]";n(zs,f+".position",d,"pos",i),n(Hr,f+".quaternion",d,"rot",i),n(zs,f+".scale",d,"scl",i)}}return i.length===0?null:new this(s,l,i,a)}resetDuration(){const t=this.tracks;let e=0;for(let n=0,i=t.length;n!==i;++n){const s=this.tracks[n];e=Math.max(e,s.times[s.times.length-1])}return this.duration=e,this}trim(){for(let t=0;t<this.tracks.length;t++)this.tracks[t].trim(0,this.duration);return this}validate(){let t=!0;for(let e=0;e<this.tracks.length;e++)t=t&&this.tracks[e].validate();return t}optimize(){for(let t=0;t<this.tracks.length;t++)this.tracks[t].optimize();return this}clone(){const t=[];for(let e=0;e<this.tracks.length;e++)t.push(this.tracks[e].clone());return new this.constructor(this.name,this.duration,t,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}}function O_(r){switch(r.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Os;case"vector":case"vector2":case"vector3":case"vector4":return zs;case"color":return Du;case"quaternion":return Hr;case"bool":case"boolean":return Qi;case"string":return tr}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+r)}function z_(r){if(r.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const t=O_(r.type);if(r.times===void 0){const e=[],n=[];ee.flattenJSON(r.keys,e,n,"value"),r.times=e,r.values=n}return t.parse!==void 0?t.parse(r):new t(r.name,r.times,r.values,r.interpolation)}const Xi={enabled:!1,files:{},add:function(r,t){this.enabled!==!1&&(this.files[r]=t)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};class U_{constructor(t,e,n){const i=this;let s=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this.itemStart=function(h){a++,s===!1&&i.onStart!==void 0&&i.onStart(h,o,a),s=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null}}}const k_=new U_;class Rn{constructor(t){this.manager=t!==void 0?t:k_,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){const n=this;return new Promise(function(i,s){n.load(t,i,e,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}}const hn={};class H_ extends Rn{constructor(t){super(t)}load(t,e,n,i){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const s=Xi.get(t);if(s!==void 0)return this.manager.itemStart(t),setTimeout(()=>{e&&e(s),this.manager.itemEnd(t)},0),s;if(hn[t]!==void 0){hn[t].push({onLoad:e,onProgress:n,onError:i});return}hn[t]=[],hn[t].push({onLoad:e,onProgress:n,onError:i});const o=new Request(t,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin"}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=hn[t],u=c.body.getReader(),d=c.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0;let m=0;const p=new ReadableStream({start(x){v();function v(){u.read().then(({done:w,value:y})=>{if(w)x.close();else{m+=y.byteLength;const b=new ProgressEvent("progress",{lengthComputable:g,loaded:m,total:f});for(let C=0,R=h.length;C<R;C++){const D=h[C];D.onProgress&&D.onProgress(b)}x.enqueue(y),v()}})}}});return new Response(p)}else throw Error(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return c.json();default:if(a===void 0)return c.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{Xi.add(t,c);const h=hn[t];delete hn[t];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=hn[t];if(h===void 0)throw this.manager.itemError(t),c;delete hn[t];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onError&&f.onError(c)}this.manager.itemError(t)}).finally(()=>{this.manager.itemEnd(t)}),this.manager.itemStart(t)}setResponseType(t){return this.responseType=t,this}setMimeType(t){return this.mimeType=t,this}}class Nu extends Rn{constructor(t){super(t)}load(t,e,n,i){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const s=this,o=Xi.get(t);if(o!==void 0)return s.manager.itemStart(t),setTimeout(function(){e&&e(o),s.manager.itemEnd(t)},0),o;const a=Er("img");function l(){h(),Xi.add(t,this),e&&e(this),s.manager.itemEnd(t)}function c(u){h(),i&&i(u),s.manager.itemError(t),s.manager.itemEnd(t)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),s.manager.itemStart(t),a.src=t,a}}class V_ extends Rn{constructor(t){super(t)}load(t,e,n,i){const s=new fo,o=new Nu(this.manager);o.setCrossOrigin(this.crossOrigin),o.setPath(this.path);let a=0;function l(c){o.load(t[c],function(h){s.images[c]=h,a++,a===6&&(s.needsUpdate=!0,e&&e(s))},void 0,i)}for(let c=0;c<t.length;++c)l(c);return s}}class G_ extends Rn{constructor(t){super(t)}load(t,e,n,i){const s=new fe,o=new Nu(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(t,function(a){s.image=a,s.needsUpdate=!0,e!==void 0&&e(s)},n,i),s}}class nn extends $t{constructor(t,e=1){super(),this.type="Light",this.color=new vt(t),this.intensity=e}dispose(){}copy(t){return super.copy(t),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),e}}nn.prototype.isLight=!0;class W_ extends nn{constructor(t,e,n){super(t,n),this.type="HemisphereLight",this.position.copy($t.DefaultUp),this.updateMatrix(),this.groundColor=new vt(e)}copy(t){return nn.prototype.copy.call(this,t),this.groundColor.copy(t.groundColor),this}}W_.prototype.isHemisphereLight=!0;const oh=new Mt,ah=new T,lh=new T;class hl{constructor(t){this.camera=t,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new et(512,512),this.map=null,this.mapPass=null,this.matrix=new Mt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new po,this._frameExtents=new et(1,1),this._viewportCount=1,this._viewports=[new Jt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;ah.setFromMatrixPosition(t.matrixWorld),e.position.copy(ah),lh.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(lh),e.updateMatrixWorld(),oh.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(oh),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(e.projectionMatrix),n.multiply(e.matrixWorldInverse)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Fu extends hl{constructor(){super(new Ee(50,1,.5,500)),this.focus=1}updateMatrices(t){const e=this.camera,n=Ca*2*t.angle*this.focus,i=this.mapSize.width/this.mapSize.height,s=t.distance||e.far;(n!==e.fov||i!==e.aspect||s!==e.far)&&(e.fov=n,e.aspect=i,e.far=s,e.updateProjectionMatrix()),super.updateMatrices(t)}copy(t){return super.copy(t),this.focus=t.focus,this}}Fu.prototype.isSpotLightShadow=!0;class X_ extends nn{constructor(t,e,n=0,i=Math.PI/3,s=0,o=1){super(t,e),this.type="SpotLight",this.position.copy($t.DefaultUp),this.updateMatrix(),this.target=new $t,this.distance=n,this.angle=i,this.penumbra=s,this.decay=o,this.shadow=new Fu}get power(){return this.intensity*Math.PI}set power(t){this.intensity=t/Math.PI}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.distance=t.distance,this.angle=t.angle,this.penumbra=t.penumbra,this.decay=t.decay,this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}X_.prototype.isSpotLight=!0;const ch=new Mt,fr=new T,ma=new T;class Bu extends hl{constructor(){super(new Ee(90,1,.5,500)),this._frameExtents=new et(4,2),this._viewportCount=6,this._viewports=[new Jt(2,1,1,1),new Jt(0,1,1,1),new Jt(3,1,1,1),new Jt(1,1,1,1),new Jt(3,0,1,1),new Jt(1,0,1,1)],this._cubeDirections=[new T(1,0,0),new T(-1,0,0),new T(0,0,1),new T(0,0,-1),new T(0,1,0),new T(0,-1,0)],this._cubeUps=[new T(0,1,0),new T(0,1,0),new T(0,1,0),new T(0,1,0),new T(0,0,1),new T(0,0,-1)]}updateMatrices(t,e=0){const n=this.camera,i=this.matrix,s=t.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),fr.setFromMatrixPosition(t.matrixWorld),n.position.copy(fr),ma.copy(n.position),ma.add(this._cubeDirections[e]),n.up.copy(this._cubeUps[e]),n.lookAt(ma),n.updateMatrixWorld(),i.makeTranslation(-fr.x,-fr.y,-fr.z),ch.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ch)}}Bu.prototype.isPointLightShadow=!0;class q_ extends nn{constructor(t,e,n=0,i=1){super(t,e),this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Bu}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}}q_.prototype.isPointLight=!0;class Ou extends hl{constructor(){super(new Ja(-5,5,5,-5,.5,500))}}Ou.prototype.isDirectionalLightShadow=!0;class j_ extends nn{constructor(t,e){super(t,e),this.type="DirectionalLight",this.position.copy($t.DefaultUp),this.updateMatrix(),this.target=new $t,this.shadow=new Ou}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}j_.prototype.isDirectionalLight=!0;class $_ extends nn{constructor(t,e){super(t,e),this.type="AmbientLight"}}$_.prototype.isAmbientLight=!0;class J_ extends nn{constructor(t,e,n=10,i=10){super(t,e),this.type="RectAreaLight",this.width=n,this.height=i}get power(){return this.intensity*this.width*this.height*Math.PI}set power(t){this.intensity=t/(this.width*this.height*Math.PI)}copy(t){return super.copy(t),this.width=t.width,this.height=t.height,this}toJSON(t){const e=super.toJSON(t);return e.object.width=this.width,e.object.height=this.height,e}}J_.prototype.isRectAreaLight=!0;class zu{constructor(){this.coefficients=[];for(let t=0;t<9;t++)this.coefficients.push(new T)}set(t){for(let e=0;e<9;e++)this.coefficients[e].copy(t[e]);return this}zero(){for(let t=0;t<9;t++)this.coefficients[t].set(0,0,0);return this}getAt(t,e){const n=t.x,i=t.y,s=t.z,o=this.coefficients;return e.copy(o[0]).multiplyScalar(.282095),e.addScaledVector(o[1],.488603*i),e.addScaledVector(o[2],.488603*s),e.addScaledVector(o[3],.488603*n),e.addScaledVector(o[4],1.092548*(n*i)),e.addScaledVector(o[5],1.092548*(i*s)),e.addScaledVector(o[6],.315392*(3*s*s-1)),e.addScaledVector(o[7],1.092548*(n*s)),e.addScaledVector(o[8],.546274*(n*n-i*i)),e}getIrradianceAt(t,e){const n=t.x,i=t.y,s=t.z,o=this.coefficients;return e.copy(o[0]).multiplyScalar(.886227),e.addScaledVector(o[1],2*.511664*i),e.addScaledVector(o[2],2*.511664*s),e.addScaledVector(o[3],2*.511664*n),e.addScaledVector(o[4],2*.429043*n*i),e.addScaledVector(o[5],2*.429043*i*s),e.addScaledVector(o[6],.743125*s*s-.247708),e.addScaledVector(o[7],2*.429043*n*s),e.addScaledVector(o[8],.429043*(n*n-i*i)),e}add(t){for(let e=0;e<9;e++)this.coefficients[e].add(t.coefficients[e]);return this}addScaledSH(t,e){for(let n=0;n<9;n++)this.coefficients[n].addScaledVector(t.coefficients[n],e);return this}scale(t){for(let e=0;e<9;e++)this.coefficients[e].multiplyScalar(t);return this}lerp(t,e){for(let n=0;n<9;n++)this.coefficients[n].lerp(t.coefficients[n],e);return this}equals(t){for(let e=0;e<9;e++)if(!this.coefficients[e].equals(t.coefficients[e]))return!1;return!0}copy(t){return this.set(t.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(t,e=0){const n=this.coefficients;for(let i=0;i<9;i++)n[i].fromArray(t,e+i*3);return this}toArray(t=[],e=0){const n=this.coefficients;for(let i=0;i<9;i++)n[i].toArray(t,e+i*3);return t}static getBasisAt(t,e){const n=t.x,i=t.y,s=t.z;e[0]=.282095,e[1]=.488603*i,e[2]=.488603*s,e[3]=.488603*n,e[4]=1.092548*n*i,e[5]=1.092548*i*s,e[6]=.315392*(3*s*s-1),e[7]=1.092548*n*s,e[8]=.546274*(n*n-i*i)}}zu.prototype.isSphericalHarmonics3=!0;class ul extends nn{constructor(t=new zu,e=1){super(void 0,e),this.sh=t}copy(t){return super.copy(t),this.sh.copy(t.sh),this}fromJSON(t){return this.intensity=t.intensity,this.sh.fromArray(t.sh),this}toJSON(t){const e=super.toJSON(t);return e.object.sh=this.sh.toArray(),e}}ul.prototype.isLightProbe=!0;class Y_{static decodeText(t){if(typeof TextDecoder<"u")return new TextDecoder().decode(t);let e="";for(let n=0,i=t.length;n<i;n++)e+=String.fromCharCode(t[n]);try{return decodeURIComponent(escape(e))}catch{return e}}static extractUrlBase(t){const e=t.lastIndexOf("/");return e===-1?"./":t.slice(0,e+1)}static resolveURL(t,e){return typeof t!="string"||t===""?"":(/^https?:\/\//i.test(e)&&/^\//.test(t)&&(e=e.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(t)||/^data:.*,.*$/i.test(t)||/^blob:.*$/i.test(t)?t:e+t)}}class Z_ extends Kt{constructor(){super(),this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(t){return super.copy(t),this.instanceCount=t.instanceCount,this}clone(){return new this.constructor().copy(this)}toJSON(){const t=super.toJSON(this);return t.instanceCount=this.instanceCount,t.isInstancedBufferGeometry=!0,t}}Z_.prototype.isInstancedBufferGeometry=!0;class K_ extends Rn{constructor(t){super(t),typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"}}setOptions(t){return this.options=t,this}load(t,e,n,i){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const s=this,o=Xi.get(t);if(o!==void 0)return s.manager.itemStart(t),setTimeout(function(){e&&e(o),s.manager.itemEnd(t)},0),o;const a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,fetch(t,a).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(s.options,{colorSpaceConversion:"none"}))}).then(function(l){Xi.add(t,l),e&&e(l),s.manager.itemEnd(t)}).catch(function(l){i&&i(l),s.manager.itemError(t),s.manager.itemEnd(t)}),s.manager.itemStart(t)}}K_.prototype.isImageBitmapLoader=!0;let bs;const Q_={getContext:function(){return bs===void 0&&(bs=new(window.AudioContext||window.webkitAudioContext)),bs},setContext:function(r){bs=r}};class tv extends Rn{constructor(t){super(t)}load(t,e,n,i){const s=this,o=new H_(this.manager);o.setResponseType("arraybuffer"),o.setPath(this.path),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(t,function(a){try{const l=a.slice(0);Q_.getContext().decodeAudioData(l,function(h){e(h)})}catch(l){i?i(l):console.error(l),s.manager.itemError(t)}},n,i)}}class ev extends ul{constructor(t,e,n=1){super(void 0,n);const i=new vt().set(t),s=new vt().set(e),o=new T(i.r,i.g,i.b),a=new T(s.r,s.g,s.b),l=Math.sqrt(Math.PI),c=l*Math.sqrt(.75);this.sh.coefficients[0].copy(o).add(a).multiplyScalar(l),this.sh.coefficients[1].copy(o).sub(a).multiplyScalar(c)}}ev.prototype.isHemisphereLightProbe=!0;class nv extends ul{constructor(t,e=1){super(void 0,e);const n=new vt().set(t);this.sh.coefficients[0].set(n.r,n.g,n.b).multiplyScalar(2*Math.sqrt(Math.PI))}}nv.prototype.isAmbientLightProbe=!0;class iv{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=hh(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=hh();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}function hh(){return(typeof performance>"u"?Date:performance).now()}class rv extends $t{constructor(t){super(),this.type="Audio",this.listener=t,this.context=t.context,this.gain=this.context.createGain(),this.gain.connect(t.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(t){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=t,this.connect(),this}setMediaElementSource(t){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(t),this.connect(),this}setMediaStreamSource(t){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(t),this.connect(),this}setBuffer(t){return this.buffer=t,this.sourceType="buffer",this.autoplay&&this.play(),this}play(t=0){if(this.isPlaying===!0){console.warn("THREE.Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+t;const e=this.context.createBufferSource();return e.buffer=this.buffer,e.loop=this.loop,e.loopStart=this.loopStart,e.loopEnd=this.loopEnd,e.onended=this.onEnded.bind(this),e.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=e,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.isPlaying===!0&&(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0&&(this._progress=this._progress%(this.duration||this.buffer.duration)),this.source.stop(),this.source.onended=null,this.isPlaying=!1),this}stop(){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this._progress=0,this.source.stop(),this.source.onended=null,this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let t=1,e=this.filters.length;t<e;t++)this.filters[t-1].connect(this.filters[t]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let t=1,e=this.filters.length;t<e;t++)this.filters[t-1].disconnect(this.filters[t]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(t){return t||(t=[]),this._connected===!0?(this.disconnect(),this.filters=t.slice(),this.connect()):this.filters=t.slice(),this}setDetune(t){if(this.detune=t,this.source.detune!==void 0)return this.isPlaying===!0&&this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,.01),this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(t){return this.setFilters(t?[t]:[])}setPlaybackRate(t){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.playbackRate=t,this.isPlaying===!0&&this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,.01),this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1}getLoop(){return this.hasPlaybackControl===!1?(console.warn("THREE.Audio: this Audio has no playback control."),!1):this.loop}setLoop(t){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.loop=t,this.isPlaying===!0&&(this.source.loop=this.loop),this}setLoopStart(t){return this.loopStart=t,this}setLoopEnd(t){return this.loopEnd=t,this}getVolume(){return this.gain.gain.value}setVolume(t){return this.gain.gain.setTargetAtTime(t,this.context.currentTime,.01),this}}class sv{constructor(t,e,n){this.binding=t,this.valueSize=n;let i,s,o;switch(e){case"quaternion":i=this._slerp,s=this._slerpAdditive,o=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":i=this._select,s=this._select,o=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:i=this._lerp,s=this._lerpAdditive,o=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=i,this._mixBufferRegionAdditive=s,this._setIdentity=o,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(t,e){const n=this.buffer,i=this.valueSize,s=t*i+i;let o=this.cumulativeWeight;if(o===0){for(let a=0;a!==i;++a)n[s+a]=n[a];o=e}else{o+=e;const a=e/o;this._mixBufferRegion(n,s,0,a,i)}this.cumulativeWeight=o}accumulateAdditive(t){const e=this.buffer,n=this.valueSize,i=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(e,i,0,t,n),this.cumulativeWeightAdditive+=t}apply(t){const e=this.valueSize,n=this.buffer,i=t*e+e,s=this.cumulativeWeight,o=this.cumulativeWeightAdditive,a=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,s<1){const l=e*this._origIndex;this._mixBufferRegion(n,i,l,1-s,e)}o>0&&this._mixBufferRegionAdditive(n,i,this._addIndex*e,1,e);for(let l=e,c=e+e;l!==c;++l)if(n[l]!==n[l+e]){a.setValue(n,i);break}}saveOriginalState(){const t=this.binding,e=this.buffer,n=this.valueSize,i=n*this._origIndex;t.getValue(e,i);for(let s=n,o=i;s!==o;++s)e[s]=e[i+s%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){const t=this.valueSize*3;this.binding.setValue(this.buffer,t)}_setAdditiveIdentityNumeric(){const t=this._addIndex*this.valueSize,e=t+this.valueSize;for(let n=t;n<e;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){const t=this._origIndex*this.valueSize,e=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[e+n]=this.buffer[t+n]}_select(t,e,n,i,s){if(i>=.5)for(let o=0;o!==s;++o)t[e+o]=t[n+o]}_slerp(t,e,n,i){Ae.slerpFlat(t,e,t,e,t,n,i)}_slerpAdditive(t,e,n,i,s){const o=this._workIndex*s;Ae.multiplyQuaternionsFlat(t,o,t,e,t,n),Ae.slerpFlat(t,e,t,e,t,o,i)}_lerp(t,e,n,i,s){const o=1-i;for(let a=0;a!==s;++a){const l=e+a;t[l]=t[l]*o+t[n+a]*i}}_lerpAdditive(t,e,n,i,s){for(let o=0;o!==s;++o){const a=e+o;t[a]=t[a]+t[n+o]*i}}}const dl="\\[\\]\\.:\\/",ov=new RegExp("["+dl+"]","g"),fl="[^"+dl+"]",av="[^"+dl.replace("\\.","")+"]",lv=/((?:WC+[\/:])*)/.source.replace("WC",fl),cv=/(WCOD+)?/.source.replace("WCOD",av),hv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",fl),uv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",fl),dv=new RegExp("^"+lv+cv+hv+uv+"$"),fv=["material","materials","bones"];class pv{constructor(t,e,n){const i=n||jt.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,i)}getValue(t,e){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(t,e)}setValue(t,e){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(t,e)}bind(){const t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){const t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}}class jt{constructor(t,e,n){this.path=e,this.parsedPath=n||jt.parseTrackName(e),this.node=jt.findNode(t,this.parsedPath.nodeName)||t,this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new jt.Composite(t,e,n):new jt(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(ov,"")}static parseTrackName(t){const e=dv.exec(t);if(e===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);const n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const s=n.nodeName.substring(i+1);fv.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){const n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){const n=function(s){for(let o=0;o<s.length;o++){const a=s[o];if(a.name===e||a.uuid===e)return a;const l=n(a.children);if(l)return l}return null},i=n(t.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)t[e++]=n[i]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=t[e++]}_setValue_array_setNeedsUpdate(t,e){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){const n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node;const e=this.parsedPath,n=e.objectName,i=e.propertyName;let s=e.propertyIndex;if(t||(t=jt.findNode(this.rootNode,e.nodeName)||this.rootNode,this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.error("THREE.PropertyBinding: Trying to update node for track: "+this.path+" but it wasn't found.");return}if(n){let c=e.objectIndex;switch(n){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;default:if(t[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(c!==void 0){if(t[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}const o=t[i];if(o===void 0){const c=e.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.needsUpdate!==void 0?a=this.Versioning.NeedsUpdate:t.matrixWorldNeedsUpdate!==void 0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(t.geometry.isBufferGeometry){if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[s]!==void 0&&(s=t.morphTargetDictionary[s])}else{console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences on THREE.Geometry. Use THREE.BufferGeometry instead.",this);return}}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}jt.Composite=pv;jt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};jt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};jt.prototype.GetterByBindingType=[jt.prototype._getValue_direct,jt.prototype._getValue_array,jt.prototype._getValue_arrayElement,jt.prototype._getValue_toArray];jt.prototype.SetterByBindingTypeAndVersioning=[[jt.prototype._setValue_direct,jt.prototype._setValue_direct_setNeedsUpdate,jt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[jt.prototype._setValue_array,jt.prototype._setValue_array_setNeedsUpdate,jt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[jt.prototype._setValue_arrayElement,jt.prototype._setValue_arrayElement_setNeedsUpdate,jt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[jt.prototype._setValue_fromArray,jt.prototype._setValue_fromArray_setNeedsUpdate,jt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class mv{constructor(t,e,n=null,i=e.blendMode){this._mixer=t,this._clip=e,this._localRoot=n,this.blendMode=i;const s=e.tracks,o=s.length,a=new Array(o),l={endingStart:wi,endingEnd:wi};for(let c=0;c!==o;++c){const h=s[c].createInterpolant(null);a[c]=h,h.settings=l}this._interpolantSettings=l,this._interpolants=a,this._propertyBindings=new Array(o),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=Kf,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(t){return this._startTime=t,this}setLoop(t,e){return this.loop=t,this.repetitions=e,this}setEffectiveWeight(t){return this.weight=t,this._effectiveWeight=this.enabled?t:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(t){return this._scheduleFading(t,0,1)}fadeOut(t){return this._scheduleFading(t,1,0)}crossFadeFrom(t,e,n){if(t.fadeOut(e),this.fadeIn(e),n){const i=this._clip.duration,s=t._clip.duration,o=s/i,a=i/s;t.warp(1,o,e),this.warp(a,1,e)}return this}crossFadeTo(t,e,n){return t.crossFadeFrom(this,e,n)}stopFading(){const t=this._weightInterpolant;return t!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(t)),this}setEffectiveTimeScale(t){return this.timeScale=t,this._effectiveTimeScale=this.paused?0:t,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(t){return this.timeScale=this._clip.duration/t,this.stopWarping()}syncWith(t){return this.time=t.time,this.timeScale=t.timeScale,this.stopWarping()}halt(t){return this.warp(this._effectiveTimeScale,0,t)}warp(t,e,n){const i=this._mixer,s=i.time,o=this.timeScale;let a=this._timeScaleInterpolant;a===null&&(a=i._lendControlInterpolant(),this._timeScaleInterpolant=a);const l=a.parameterPositions,c=a.sampleValues;return l[0]=s,l[1]=s+n,c[0]=t/o,c[1]=e/o,this}stopWarping(){const t=this._timeScaleInterpolant;return t!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(t)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(t,e,n,i){if(!this.enabled){this._updateWeight(t);return}const s=this._startTime;if(s!==null){const l=(t-s)*n;if(l<0||n===0)return;this._startTime=null,e=n*l}e*=this._updateTimeScale(t);const o=this._updateTime(e),a=this._updateWeight(t);if(a>0){const l=this._interpolants,c=this._propertyBindings;switch(this.blendMode){case Wh:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(o),c[h].accumulateAdditive(a);break;case Wa:default:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(o),c[h].accumulate(i,a)}}}_updateWeight(t){let e=0;if(this.enabled){e=this.weight;const n=this._weightInterpolant;if(n!==null){const i=n.evaluate(t)[0];e*=i,t>n.parameterPositions[1]&&(this.stopFading(),i===0&&(this.enabled=!1))}}return this._effectiveWeight=e,e}_updateTimeScale(t){let e=0;if(!this.paused){e=this.timeScale;const n=this._timeScaleInterpolant;if(n!==null){const i=n.evaluate(t)[0];e*=i,t>n.parameterPositions[1]&&(this.stopWarping(),e===0?this.paused=!0:this.timeScale=e)}}return this._effectiveTimeScale=e,e}_updateTime(t){const e=this._clip.duration,n=this.loop;let i=this.time+t,s=this._loopCount;const o=n===Qf;if(t===0)return s===-1?i:o&&(s&1)===1?e-i:i;if(n===Zf){s===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));t:{if(i>=e)i=e;else if(i<0)i=0;else{this.time=i;break t}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:t<0?-1:1})}}else{if(s===-1&&(t>=0?(s=0,this._setEndings(!0,this.repetitions===0,o)):this._setEndings(this.repetitions===0,!0,o)),i>=e||i<0){const a=Math.floor(i/e);i-=e*a,s+=Math.abs(a);const l=this.repetitions-s;if(l<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,i=t>0?e:0,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:t>0?1:-1});else{if(l===1){const c=t<0;this._setEndings(c,!c,o)}else this._setEndings(!1,!1,o);this._loopCount=s,this.time=i,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:a})}}else this.time=i;if(o&&(s&1)===1)return e-i}return i}_setEndings(t,e,n){const i=this._interpolantSettings;n?(i.endingStart=Si,i.endingEnd=Si):(t?i.endingStart=this.zeroSlopeAtStart?Si:wi:i.endingStart=Fs,e?i.endingEnd=this.zeroSlopeAtEnd?Si:wi:i.endingEnd=Fs)}_scheduleFading(t,e,n){const i=this._mixer,s=i.time;let o=this._weightInterpolant;o===null&&(o=i._lendControlInterpolant(),this._weightInterpolant=o);const a=o.parameterPositions,l=o.sampleValues;return a[0]=s,l[0]=e,a[1]=s+t,l[1]=n,this}}class gv extends Zn{constructor(t){super(),this._root=t,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(t,e){const n=t._localRoot||this._root,i=t._clip.tracks,s=i.length,o=t._propertyBindings,a=t._interpolants,l=n.uuid,c=this._bindingsByRootAndName;let h=c[l];h===void 0&&(h={},c[l]=h);for(let u=0;u!==s;++u){const d=i[u],f=d.name;let g=h[f];if(g!==void 0)++g.referenceCount,o[u]=g;else{if(g=o[u],g!==void 0){g._cacheIndex===null&&(++g.referenceCount,this._addInactiveBinding(g,l,f));continue}const m=e&&e._propertyBindings[u].binding.parsedPath;g=new sv(jt.create(n,f,m),d.ValueTypeName,d.getValueSize()),++g.referenceCount,this._addInactiveBinding(g,l,f),o[u]=g}a[u].resultBuffer=g.buffer}}_activateAction(t){if(!this._isActiveAction(t)){if(t._cacheIndex===null){const n=(t._localRoot||this._root).uuid,i=t._clip.uuid,s=this._actionsByClip[i];this._bindAction(t,s&&s.knownActions[0]),this._addInactiveAction(t,i,n)}const e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){const s=e[n];s.useCount++===0&&(this._lendBinding(s),s.saveOriginalState())}this._lendAction(t)}}_deactivateAction(t){if(this._isActiveAction(t)){const e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){const s=e[n];--s.useCount===0&&(s.restoreOriginalState(),this._takeBackBinding(s))}this._takeBackAction(t)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;const t=this;this.stats={actions:{get total(){return t._actions.length},get inUse(){return t._nActiveActions}},bindings:{get total(){return t._bindings.length},get inUse(){return t._nActiveBindings}},controlInterpolants:{get total(){return t._controlInterpolants.length},get inUse(){return t._nActiveControlInterpolants}}}}_isActiveAction(t){const e=t._cacheIndex;return e!==null&&e<this._nActiveActions}_addInactiveAction(t,e,n){const i=this._actions,s=this._actionsByClip;let o=s[e];if(o===void 0)o={knownActions:[t],actionByRoot:{}},t._byClipCacheIndex=0,s[e]=o;else{const a=o.knownActions;t._byClipCacheIndex=a.length,a.push(t)}t._cacheIndex=i.length,i.push(t),o.actionByRoot[n]=t}_removeInactiveAction(t){const e=this._actions,n=e[e.length-1],i=t._cacheIndex;n._cacheIndex=i,e[i]=n,e.pop(),t._cacheIndex=null;const s=t._clip.uuid,o=this._actionsByClip,a=o[s],l=a.knownActions,c=l[l.length-1],h=t._byClipCacheIndex;c._byClipCacheIndex=h,l[h]=c,l.pop(),t._byClipCacheIndex=null;const u=a.actionByRoot,d=(t._localRoot||this._root).uuid;delete u[d],l.length===0&&delete o[s],this._removeInactiveBindingsForAction(t)}_removeInactiveBindingsForAction(t){const e=t._propertyBindings;for(let n=0,i=e.length;n!==i;++n){const s=e[n];--s.referenceCount===0&&this._removeInactiveBinding(s)}}_lendAction(t){const e=this._actions,n=t._cacheIndex,i=this._nActiveActions++,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_takeBackAction(t){const e=this._actions,n=t._cacheIndex,i=--this._nActiveActions,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_addInactiveBinding(t,e,n){const i=this._bindingsByRootAndName,s=this._bindings;let o=i[e];o===void 0&&(o={},i[e]=o),o[n]=t,t._cacheIndex=s.length,s.push(t)}_removeInactiveBinding(t){const e=this._bindings,n=t.binding,i=n.rootNode.uuid,s=n.path,o=this._bindingsByRootAndName,a=o[i],l=e[e.length-1],c=t._cacheIndex;l._cacheIndex=c,e[c]=l,e.pop(),delete a[s],Object.keys(a).length===0&&delete o[i]}_lendBinding(t){const e=this._bindings,n=t._cacheIndex,i=this._nActiveBindings++,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_takeBackBinding(t){const e=this._bindings,n=t._cacheIndex,i=--this._nActiveBindings,s=e[i];t._cacheIndex=i,e[i]=t,s._cacheIndex=n,e[n]=s}_lendControlInterpolant(){const t=this._controlInterpolants,e=this._nActiveControlInterpolants++;let n=t[e];return n===void 0&&(n=new Iu(new Float32Array(2),new Float32Array(2),1,this._controlInterpolantsResultBuffer),n.__cacheIndex=e,t[e]=n),n}_takeBackControlInterpolant(t){const e=this._controlInterpolants,n=t.__cacheIndex,i=--this._nActiveControlInterpolants,s=e[i];t.__cacheIndex=i,e[i]=t,s.__cacheIndex=n,e[n]=s}clipAction(t,e,n){const i=e||this._root,s=i.uuid;let o=typeof t=="string"?sh.findByName(i,t):t;const a=o!==null?o.uuid:t,l=this._actionsByClip[a];let c=null;if(n===void 0&&(o!==null?n=o.blendMode:n=Wa),l!==void 0){const u=l.actionByRoot[s];if(u!==void 0&&u.blendMode===n)return u;c=l.knownActions[0],o===null&&(o=c._clip)}if(o===null)return null;const h=new mv(this,o,e,n);return this._bindAction(h,c),this._addInactiveAction(h,a,s),h}existingAction(t,e){const n=e||this._root,i=n.uuid,s=typeof t=="string"?sh.findByName(n,t):t,o=s?s.uuid:t,a=this._actionsByClip[o];return a!==void 0&&a.actionByRoot[i]||null}stopAllAction(){const t=this._actions,e=this._nActiveActions;for(let n=e-1;n>=0;--n)t[n].stop();return this}update(t){t*=this.timeScale;const e=this._actions,n=this._nActiveActions,i=this.time+=t,s=Math.sign(t),o=this._accuIndex^=1;for(let c=0;c!==n;++c)e[c]._update(i,t,s,o);const a=this._bindings,l=this._nActiveBindings;for(let c=0;c!==l;++c)a[c].apply(o);return this}setTime(t){this.time=0;for(let e=0;e<this._actions.length;e++)this._actions[e].time=0;return this.update(t)}getRoot(){return this._root}uncacheClip(t){const e=this._actions,n=t.uuid,i=this._actionsByClip,s=i[n];if(s!==void 0){const o=s.knownActions;for(let a=0,l=o.length;a!==l;++a){const c=o[a];this._deactivateAction(c);const h=c._cacheIndex,u=e[e.length-1];c._cacheIndex=null,c._byClipCacheIndex=null,u._cacheIndex=h,e[h]=u,e.pop(),this._removeInactiveBindingsForAction(c)}delete i[n]}}uncacheRoot(t){const e=t.uuid,n=this._actionsByClip;for(const o in n){const a=n[o].actionByRoot,l=a[e];l!==void 0&&(this._deactivateAction(l),this._removeInactiveAction(l))}const i=this._bindingsByRootAndName,s=i[e];if(s!==void 0)for(const o in s){const a=s[o];a.restoreOriginalState(),this._removeInactiveBinding(a)}}uncacheAction(t,e){const n=this.existingAction(t,e);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}}gv.prototype._controlInterpolantsResultBuffer=new Float32Array(1);class xv extends Ur{constructor(t,e,n=1){super(t,e),this.meshPerAttribute=n}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}clone(t){const e=super.clone(t);return e.meshPerAttribute=this.meshPerAttribute,e}toJSON(t){const e=super.toJSON(t);return e.isInstancedInterleavedBuffer=!0,e.meshPerAttribute=this.meshPerAttribute,e}}xv.prototype.isInstancedInterleavedBuffer=!0;const wn=new T,ws=new Mt,ga=new Mt;class _v extends nl{constructor(t){const e=Uu(t),n=new Kt,i=[],s=[],o=new vt(0,0,1),a=new vt(0,1,0);for(let c=0;c<e.length;c++){const h=e[c];h.parent&&h.parent.isBone&&(i.push(0,0,0),i.push(0,0,0),s.push(o.r,o.g,o.b),s.push(a.r,a.g,a.b))}n.setAttribute("position",new Zt(i,3)),n.setAttribute("color",new Zt(s,3));const l=new Zi({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,l),this.type="SkeletonHelper",this.isSkeletonHelper=!0,this.root=t,this.bones=e,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1}updateMatrixWorld(t){const e=this.bones,n=this.geometry,i=n.getAttribute("position");ga.copy(this.root.matrixWorld).invert();for(let s=0,o=0;s<e.length;s++){const a=e[s];a.parent&&a.parent.isBone&&(ws.multiplyMatrices(ga,a.matrixWorld),wn.setFromMatrixPosition(ws),i.setXYZ(o,wn.x,wn.y,wn.z),ws.multiplyMatrices(ga,a.parent.matrixWorld),wn.setFromMatrixPosition(ws),i.setXYZ(o+1,wn.x,wn.y,wn.z),o+=2)}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(t)}}function Uu(r){const t=[];r.isBone===!0&&t.push(r);for(let e=0;e<r.children.length;e++)t.push.apply(t,Uu(r.children[e]));return t}class vv extends nl{constructor(t=10,e=10,n=4473924,i=8947848){n=new vt(n),i=new vt(i);const s=e/2,o=t/e,a=t/2,l=[],c=[];for(let d=0,f=0,g=-a;d<=e;d++,g+=o){l.push(-a,0,g,a,0,g),l.push(g,0,-a,g,0,a);const m=d===s?n:i;m.toArray(c,f),f+=3,m.toArray(c,f),f+=3,m.toArray(c,f),f+=3,m.toArray(c,f),f+=3}const h=new Kt;h.setAttribute("position",new Zt(l,3)),h.setAttribute("color",new Zt(c,3));const u=new Zi({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}}const Je=new Uint32Array(512),Ye=new Uint32Array(512);for(let r=0;r<256;++r){const t=r-127;t<-27?(Je[r]=0,Je[r|256]=32768,Ye[r]=24,Ye[r|256]=24):t<-14?(Je[r]=1024>>-t-14,Je[r|256]=1024>>-t-14|32768,Ye[r]=-t-1,Ye[r|256]=-t-1):t<=15?(Je[r]=t+15<<10,Je[r|256]=t+15<<10|32768,Ye[r]=13,Ye[r|256]=13):t<128?(Je[r]=31744,Je[r|256]=64512,Ye[r]=24,Ye[r|256]=24):(Je[r]=31744,Je[r|256]=64512,Ye[r]=13,Ye[r|256]=13)}const ku=new Uint32Array(2048),Vr=new Uint32Array(64),yv=new Uint32Array(64);for(let r=1;r<1024;++r){let t=r<<13,e=0;for(;(t&8388608)===0;)t<<=1,e-=8388608;t&=-8388609,e+=947912704,ku[r]=t|e}for(let r=1024;r<2048;++r)ku[r]=939524096+(r-1024<<13);for(let r=1;r<31;++r)Vr[r]=r<<23;Vr[31]=1199570944;Vr[32]=2147483648;for(let r=33;r<63;++r)Vr[r]=2147483648+(r-32<<23);Vr[63]=3347054592;for(let r=1;r<64;++r)r!==32&&(yv[r]=1024);De.create=function(r,t){return console.log("THREE.Curve.create() has been deprecated"),r.prototype=Object.create(De.prototype),r.prototype.constructor=r,r.prototype.getPoint=t,r};Da.prototype.fromPoints=function(r){return console.warn("THREE.Path: .fromPoints() has been renamed to .setFromPoints()."),this.setFromPoints(r)};vv.prototype.setColors=function(){console.error("THREE.GridHelper: setColors() has been deprecated, pass them in the constructor instead.")};_v.prototype.update=function(){console.error("THREE.SkeletonHelper: update() no longer needs to be called.")};Rn.prototype.extractUrlBase=function(r){return console.warn("THREE.Loader: .extractUrlBase() has been deprecated. Use THREE.LoaderUtils.extractUrlBase() instead."),Y_.extractUrlBase(r)};Rn.Handlers={add:function(){console.error("THREE.Loader: Handlers.add() has been removed. Use LoadingManager.addHandler() instead.")},get:function(){console.error("THREE.Loader: Handlers.get() has been removed. Use LoadingManager.getHandler() instead.")}};We.prototype.center=function(r){return console.warn("THREE.Box3: .center() has been renamed to .getCenter()."),this.getCenter(r)};We.prototype.empty=function(){return console.warn("THREE.Box3: .empty() has been renamed to .isEmpty()."),this.isEmpty()};We.prototype.isIntersectionBox=function(r){return console.warn("THREE.Box3: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};We.prototype.isIntersectionSphere=function(r){return console.warn("THREE.Box3: .isIntersectionSphere() has been renamed to .intersectsSphere()."),this.intersectsSphere(r)};We.prototype.size=function(r){return console.warn("THREE.Box3: .size() has been renamed to .getSize()."),this.getSize(r)};Qn.prototype.toVector3=function(){console.error("THREE.Euler: .toVector3() has been removed. Use Vector3.setFromEuler() instead")};$i.prototype.empty=function(){return console.warn("THREE.Sphere: .empty() has been renamed to .isEmpty()."),this.isEmpty()};po.prototype.setFromMatrix=function(r){return console.warn("THREE.Frustum: .setFromMatrix() has been renamed to .setFromProjectionMatrix()."),this.setFromProjectionMatrix(r)};me.prototype.flattenToArrayOffset=function(r,t){return console.warn("THREE.Matrix3: .flattenToArrayOffset() has been deprecated. Use .toArray() instead."),this.toArray(r,t)};me.prototype.multiplyVector3=function(r){return console.warn("THREE.Matrix3: .multiplyVector3() has been removed. Use vector.applyMatrix3( matrix ) instead."),r.applyMatrix3(this)};me.prototype.multiplyVector3Array=function(){console.error("THREE.Matrix3: .multiplyVector3Array() has been removed.")};me.prototype.applyToBufferAttribute=function(r){return console.warn("THREE.Matrix3: .applyToBufferAttribute() has been removed. Use attribute.applyMatrix3( matrix ) instead."),r.applyMatrix3(this)};me.prototype.applyToVector3Array=function(){console.error("THREE.Matrix3: .applyToVector3Array() has been removed.")};me.prototype.getInverse=function(r){return console.warn("THREE.Matrix3: .getInverse() has been removed. Use matrixInv.copy( matrix ).invert(); instead."),this.copy(r).invert()};Mt.prototype.extractPosition=function(r){return console.warn("THREE.Matrix4: .extractPosition() has been renamed to .copyPosition()."),this.copyPosition(r)};Mt.prototype.flattenToArrayOffset=function(r,t){return console.warn("THREE.Matrix4: .flattenToArrayOffset() has been deprecated. Use .toArray() instead."),this.toArray(r,t)};Mt.prototype.getPosition=function(){return console.warn("THREE.Matrix4: .getPosition() has been removed. Use Vector3.setFromMatrixPosition( matrix ) instead."),new T().setFromMatrixColumn(this,3)};Mt.prototype.setRotationFromQuaternion=function(r){return console.warn("THREE.Matrix4: .setRotationFromQuaternion() has been renamed to .makeRotationFromQuaternion()."),this.makeRotationFromQuaternion(r)};Mt.prototype.multiplyToArray=function(){console.warn("THREE.Matrix4: .multiplyToArray() has been removed.")};Mt.prototype.multiplyVector3=function(r){return console.warn("THREE.Matrix4: .multiplyVector3() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Mt.prototype.multiplyVector4=function(r){return console.warn("THREE.Matrix4: .multiplyVector4() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Mt.prototype.multiplyVector3Array=function(){console.error("THREE.Matrix4: .multiplyVector3Array() has been removed.")};Mt.prototype.rotateAxis=function(r){console.warn("THREE.Matrix4: .rotateAxis() has been removed. Use Vector3.transformDirection( matrix ) instead."),r.transformDirection(this)};Mt.prototype.crossVector=function(r){return console.warn("THREE.Matrix4: .crossVector() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Mt.prototype.translate=function(){console.error("THREE.Matrix4: .translate() has been removed.")};Mt.prototype.rotateX=function(){console.error("THREE.Matrix4: .rotateX() has been removed.")};Mt.prototype.rotateY=function(){console.error("THREE.Matrix4: .rotateY() has been removed.")};Mt.prototype.rotateZ=function(){console.error("THREE.Matrix4: .rotateZ() has been removed.")};Mt.prototype.rotateByAxis=function(){console.error("THREE.Matrix4: .rotateByAxis() has been removed.")};Mt.prototype.applyToBufferAttribute=function(r){return console.warn("THREE.Matrix4: .applyToBufferAttribute() has been removed. Use attribute.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};Mt.prototype.applyToVector3Array=function(){console.error("THREE.Matrix4: .applyToVector3Array() has been removed.")};Mt.prototype.makeFrustum=function(r,t,e,n,i,s){return console.warn("THREE.Matrix4: .makeFrustum() has been removed. Use .makePerspective( left, right, top, bottom, near, far ) instead."),this.makePerspective(r,t,n,e,i,s)};Mt.prototype.getInverse=function(r){return console.warn("THREE.Matrix4: .getInverse() has been removed. Use matrixInv.copy( matrix ).invert(); instead."),this.copy(r).invert()};dn.prototype.isIntersectionLine=function(r){return console.warn("THREE.Plane: .isIntersectionLine() has been renamed to .intersectsLine()."),this.intersectsLine(r)};Ae.prototype.multiplyVector3=function(r){return console.warn("THREE.Quaternion: .multiplyVector3() has been removed. Use is now vector.applyQuaternion( quaternion ) instead."),r.applyQuaternion(this)};Ae.prototype.inverse=function(){return console.warn("THREE.Quaternion: .inverse() has been renamed to invert()."),this.invert()};Ji.prototype.isIntersectionBox=function(r){return console.warn("THREE.Ray: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};Ji.prototype.isIntersectionPlane=function(r){return console.warn("THREE.Ray: .isIntersectionPlane() has been renamed to .intersectsPlane()."),this.intersectsPlane(r)};Ji.prototype.isIntersectionSphere=function(r){return console.warn("THREE.Ray: .isIntersectionSphere() has been renamed to .intersectsSphere()."),this.intersectsSphere(r)};ae.prototype.area=function(){return console.warn("THREE.Triangle: .area() has been renamed to .getArea()."),this.getArea()};ae.prototype.barycoordFromPoint=function(r,t){return console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord()."),this.getBarycoord(r,t)};ae.prototype.midpoint=function(r){return console.warn("THREE.Triangle: .midpoint() has been renamed to .getMidpoint()."),this.getMidpoint(r)};ae.prototypenormal=function(r){return console.warn("THREE.Triangle: .normal() has been renamed to .getNormal()."),this.getNormal(r)};ae.prototype.plane=function(r){return console.warn("THREE.Triangle: .plane() has been renamed to .getPlane()."),this.getPlane(r)};ae.barycoordFromPoint=function(r,t,e,n,i){return console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord()."),ae.getBarycoord(r,t,e,n,i)};ae.normal=function(r,t,e,n){return console.warn("THREE.Triangle: .normal() has been renamed to .getNormal()."),ae.getNormal(r,t,e,n)};kr.prototype.extractAllPoints=function(r){return console.warn("THREE.Shape: .extractAllPoints() has been removed. Use .extractPoints() instead."),this.extractPoints(r)};kr.prototype.extrude=function(r){return console.warn("THREE.Shape: .extrude() has been removed. Use ExtrudeGeometry() instead."),new Ki(this,r)};kr.prototype.makeGeometry=function(r){return console.warn("THREE.Shape: .makeGeometry() has been removed. Use ShapeGeometry() instead."),new ll(this,r)};et.prototype.fromAttribute=function(r,t,e){return console.warn("THREE.Vector2: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,t,e)};et.prototype.distanceToManhattan=function(r){return console.warn("THREE.Vector2: .distanceToManhattan() has been renamed to .manhattanDistanceTo()."),this.manhattanDistanceTo(r)};et.prototype.lengthManhattan=function(){return console.warn("THREE.Vector2: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};T.prototype.setEulerFromRotationMatrix=function(){console.error("THREE.Vector3: .setEulerFromRotationMatrix() has been removed. Use Euler.setFromRotationMatrix() instead.")};T.prototype.setEulerFromQuaternion=function(){console.error("THREE.Vector3: .setEulerFromQuaternion() has been removed. Use Euler.setFromQuaternion() instead.")};T.prototype.getPositionFromMatrix=function(r){return console.warn("THREE.Vector3: .getPositionFromMatrix() has been renamed to .setFromMatrixPosition()."),this.setFromMatrixPosition(r)};T.prototype.getScaleFromMatrix=function(r){return console.warn("THREE.Vector3: .getScaleFromMatrix() has been renamed to .setFromMatrixScale()."),this.setFromMatrixScale(r)};T.prototype.getColumnFromMatrix=function(r,t){return console.warn("THREE.Vector3: .getColumnFromMatrix() has been renamed to .setFromMatrixColumn()."),this.setFromMatrixColumn(t,r)};T.prototype.applyProjection=function(r){return console.warn("THREE.Vector3: .applyProjection() has been removed. Use .applyMatrix4( m ) instead."),this.applyMatrix4(r)};T.prototype.fromAttribute=function(r,t,e){return console.warn("THREE.Vector3: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,t,e)};T.prototype.distanceToManhattan=function(r){return console.warn("THREE.Vector3: .distanceToManhattan() has been renamed to .manhattanDistanceTo()."),this.manhattanDistanceTo(r)};T.prototype.lengthManhattan=function(){return console.warn("THREE.Vector3: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};Jt.prototype.fromAttribute=function(r,t,e){return console.warn("THREE.Vector4: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,t,e)};Jt.prototype.lengthManhattan=function(){return console.warn("THREE.Vector4: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};$t.prototype.getChildByName=function(r){return console.warn("THREE.Object3D: .getChildByName() has been renamed to .getObjectByName()."),this.getObjectByName(r)};$t.prototype.renderDepth=function(){console.warn("THREE.Object3D: .renderDepth has been removed. Use .renderOrder, instead.")};$t.prototype.translate=function(r,t){return console.warn("THREE.Object3D: .translate() has been removed. Use .translateOnAxis( axis, distance ) instead."),this.translateOnAxis(t,r)};$t.prototype.getWorldRotation=function(){console.error("THREE.Object3D: .getWorldRotation() has been removed. Use THREE.Object3D.getWorldQuaternion( target ) instead.")};$t.prototype.applyMatrix=function(r){return console.warn("THREE.Object3D: .applyMatrix() has been renamed to .applyMatrix4()."),this.applyMatrix4(r)};Object.defineProperties($t.prototype,{eulerOrder:{get:function(){return console.warn("THREE.Object3D: .eulerOrder is now .rotation.order."),this.rotation.order},set:function(r){console.warn("THREE.Object3D: .eulerOrder is now .rotation.order."),this.rotation.order=r}},useQuaternion:{get:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")},set:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")}}});Te.prototype.setDrawMode=function(){console.error("THREE.Mesh: .setDrawMode() has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary.")};Object.defineProperties(Te.prototype,{drawMode:{get:function(){return console.error("THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode."),tp},set:function(){console.error("THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary.")}}});uu.prototype.initBones=function(){console.error("THREE.SkinnedMesh: initBones() has been removed.")};Ee.prototype.setLens=function(r,t){console.warn("THREE.PerspectiveCamera.setLens is deprecated. Use .setFocalLength and .filmGauge for a photographic setup."),t!==void 0&&(this.filmGauge=t),this.setFocalLength(r)};Object.defineProperties(nn.prototype,{onlyShadow:{set:function(){console.warn("THREE.Light: .onlyShadow has been removed.")}},shadowCameraFov:{set:function(r){console.warn("THREE.Light: .shadowCameraFov is now .shadow.camera.fov."),this.shadow.camera.fov=r}},shadowCameraLeft:{set:function(r){console.warn("THREE.Light: .shadowCameraLeft is now .shadow.camera.left."),this.shadow.camera.left=r}},shadowCameraRight:{set:function(r){console.warn("THREE.Light: .shadowCameraRight is now .shadow.camera.right."),this.shadow.camera.right=r}},shadowCameraTop:{set:function(r){console.warn("THREE.Light: .shadowCameraTop is now .shadow.camera.top."),this.shadow.camera.top=r}},shadowCameraBottom:{set:function(r){console.warn("THREE.Light: .shadowCameraBottom is now .shadow.camera.bottom."),this.shadow.camera.bottom=r}},shadowCameraNear:{set:function(r){console.warn("THREE.Light: .shadowCameraNear is now .shadow.camera.near."),this.shadow.camera.near=r}},shadowCameraFar:{set:function(r){console.warn("THREE.Light: .shadowCameraFar is now .shadow.camera.far."),this.shadow.camera.far=r}},shadowCameraVisible:{set:function(){console.warn("THREE.Light: .shadowCameraVisible has been removed. Use new THREE.CameraHelper( light.shadow.camera ) instead.")}},shadowBias:{set:function(r){console.warn("THREE.Light: .shadowBias is now .shadow.bias."),this.shadow.bias=r}},shadowDarkness:{set:function(){console.warn("THREE.Light: .shadowDarkness has been removed.")}},shadowMapWidth:{set:function(r){console.warn("THREE.Light: .shadowMapWidth is now .shadow.mapSize.width."),this.shadow.mapSize.width=r}},shadowMapHeight:{set:function(r){console.warn("THREE.Light: .shadowMapHeight is now .shadow.mapSize.height."),this.shadow.mapSize.height=r}}});Object.defineProperties(ce.prototype,{length:{get:function(){return console.warn("THREE.BufferAttribute: .length has been deprecated. Use .count instead."),this.array.length}},dynamic:{get:function(){return console.warn("THREE.BufferAttribute: .dynamic has been deprecated. Use .usage instead."),this.usage===Bs},set:function(){console.warn("THREE.BufferAttribute: .dynamic has been deprecated. Use .usage instead."),this.setUsage(Bs)}}});ce.prototype.setDynamic=function(r){return console.warn("THREE.BufferAttribute: .setDynamic() has been deprecated. Use .setUsage() instead."),this.setUsage(r===!0?Bs:Sr),this};ce.prototype.copyIndicesArray=function(){console.error("THREE.BufferAttribute: .copyIndicesArray() has been removed.")},ce.prototype.setArray=function(){console.error("THREE.BufferAttribute: .setArray has been removed. Use BufferGeometry .setAttribute to replace/resize attribute buffers")};Kt.prototype.addIndex=function(r){console.warn("THREE.BufferGeometry: .addIndex() has been renamed to .setIndex()."),this.setIndex(r)};Kt.prototype.addAttribute=function(r,t){return console.warn("THREE.BufferGeometry: .addAttribute() has been renamed to .setAttribute()."),!(t&&t.isBufferAttribute)&&!(t&&t.isInterleavedBufferAttribute)?(console.warn("THREE.BufferGeometry: .addAttribute() now expects ( name, attribute )."),this.setAttribute(r,new ce(arguments[1],arguments[2]))):r==="index"?(console.warn("THREE.BufferGeometry.addAttribute: Use .setIndex() for index attribute."),this.setIndex(t),this):this.setAttribute(r,t)};Kt.prototype.addDrawCall=function(r,t,e){e!==void 0&&console.warn("THREE.BufferGeometry: .addDrawCall() no longer supports indexOffset."),console.warn("THREE.BufferGeometry: .addDrawCall() is now .addGroup()."),this.addGroup(r,t)};Kt.prototype.clearDrawCalls=function(){console.warn("THREE.BufferGeometry: .clearDrawCalls() is now .clearGroups()."),this.clearGroups()};Kt.prototype.computeOffsets=function(){console.warn("THREE.BufferGeometry: .computeOffsets() has been removed.")};Kt.prototype.removeAttribute=function(r){return console.warn("THREE.BufferGeometry: .removeAttribute() has been renamed to .deleteAttribute()."),this.deleteAttribute(r)};Kt.prototype.applyMatrix=function(r){return console.warn("THREE.BufferGeometry: .applyMatrix() has been renamed to .applyMatrix4()."),this.applyMatrix4(r)};Object.defineProperties(Kt.prototype,{drawcalls:{get:function(){return console.error("THREE.BufferGeometry: .drawcalls has been renamed to .groups."),this.groups}},offsets:{get:function(){return console.warn("THREE.BufferGeometry: .offsets has been renamed to .groups."),this.groups}}});Ur.prototype.setDynamic=function(r){return console.warn("THREE.InterleavedBuffer: .setDynamic() has been deprecated. Use .setUsage() instead."),this.setUsage(r===!0?Bs:Sr),this};Ur.prototype.setArray=function(){console.error("THREE.InterleavedBuffer: .setArray has been removed. Use BufferGeometry .setAttribute to replace/resize attribute buffers")};Ki.prototype.getArrays=function(){console.error("THREE.ExtrudeGeometry: .getArrays() has been removed.")};Ki.prototype.addShapeList=function(){console.error("THREE.ExtrudeGeometry: .addShapeList() has been removed.")};Ki.prototype.addShape=function(){console.error("THREE.ExtrudeGeometry: .addShape() has been removed.")};cu.prototype.dispose=function(){console.error("THREE.Scene: .dispose() has been removed.")};Object.defineProperties(he.prototype,{wrapAround:{get:function(){console.warn("THREE.Material: .wrapAround has been removed.")},set:function(){console.warn("THREE.Material: .wrapAround has been removed.")}},overdraw:{get:function(){console.warn("THREE.Material: .overdraw has been removed.")},set:function(){console.warn("THREE.Material: .overdraw has been removed.")}},wrapRGB:{get:function(){return console.warn("THREE.Material: .wrapRGB has been removed."),new vt}},shading:{get:function(){console.error("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead.")},set:function(r){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=r===kh}},stencilMask:{get:function(){return console.warn("THREE."+this.type+": .stencilMask has been removed. Use .stencilFuncMask instead."),this.stencilFuncMask},set:function(r){console.warn("THREE."+this.type+": .stencilMask has been removed. Use .stencilFuncMask instead."),this.stencilFuncMask=r}},vertexTangents:{get:function(){console.warn("THREE."+this.type+": .vertexTangents has been removed.")},set:function(){console.warn("THREE."+this.type+": .vertexTangents has been removed.")}}});Object.defineProperties(Ge.prototype,{derivatives:{get:function(){return console.warn("THREE.ShaderMaterial: .derivatives has been moved to .extensions.derivatives."),this.extensions.derivatives},set:function(r){console.warn("THREE. ShaderMaterial: .derivatives has been moved to .extensions.derivatives."),this.extensions.derivatives=r}}});Yt.prototype.clearTarget=function(r,t,e,n){console.warn("THREE.WebGLRenderer: .clearTarget() has been deprecated. Use .setRenderTarget() and .clear() instead."),this.setRenderTarget(r),this.clear(t,e,n)};Yt.prototype.animate=function(r){console.warn("THREE.WebGLRenderer: .animate() is now .setAnimationLoop()."),this.setAnimationLoop(r)};Yt.prototype.getCurrentRenderTarget=function(){return console.warn("THREE.WebGLRenderer: .getCurrentRenderTarget() is now .getRenderTarget()."),this.getRenderTarget()};Yt.prototype.getMaxAnisotropy=function(){return console.warn("THREE.WebGLRenderer: .getMaxAnisotropy() is now .capabilities.getMaxAnisotropy()."),this.capabilities.getMaxAnisotropy()};Yt.prototype.getPrecision=function(){return console.warn("THREE.WebGLRenderer: .getPrecision() is now .capabilities.precision."),this.capabilities.precision};Yt.prototype.resetGLState=function(){return console.warn("THREE.WebGLRenderer: .resetGLState() is now .state.reset()."),this.state.reset()};Yt.prototype.supportsFloatTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsFloatTextures() is now .extensions.get( 'OES_texture_float' )."),this.extensions.get("OES_texture_float")};Yt.prototype.supportsHalfFloatTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsHalfFloatTextures() is now .extensions.get( 'OES_texture_half_float' )."),this.extensions.get("OES_texture_half_float")};Yt.prototype.supportsStandardDerivatives=function(){return console.warn("THREE.WebGLRenderer: .supportsStandardDerivatives() is now .extensions.get( 'OES_standard_derivatives' )."),this.extensions.get("OES_standard_derivatives")};Yt.prototype.supportsCompressedTextureS3TC=function(){return console.warn("THREE.WebGLRenderer: .supportsCompressedTextureS3TC() is now .extensions.get( 'WEBGL_compressed_texture_s3tc' )."),this.extensions.get("WEBGL_compressed_texture_s3tc")};Yt.prototype.supportsCompressedTexturePVRTC=function(){return console.warn("THREE.WebGLRenderer: .supportsCompressedTexturePVRTC() is now .extensions.get( 'WEBGL_compressed_texture_pvrtc' )."),this.extensions.get("WEBGL_compressed_texture_pvrtc")};Yt.prototype.supportsBlendMinMax=function(){return console.warn("THREE.WebGLRenderer: .supportsBlendMinMax() is now .extensions.get( 'EXT_blend_minmax' )."),this.extensions.get("EXT_blend_minmax")};Yt.prototype.supportsVertexTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsVertexTextures() is now .capabilities.vertexTextures."),this.capabilities.vertexTextures};Yt.prototype.supportsInstancedArrays=function(){return console.warn("THREE.WebGLRenderer: .supportsInstancedArrays() is now .extensions.get( 'ANGLE_instanced_arrays' )."),this.extensions.get("ANGLE_instanced_arrays")};Yt.prototype.enableScissorTest=function(r){console.warn("THREE.WebGLRenderer: .enableScissorTest() is now .setScissorTest()."),this.setScissorTest(r)};Yt.prototype.initMaterial=function(){console.warn("THREE.WebGLRenderer: .initMaterial() has been removed.")};Yt.prototype.addPrePlugin=function(){console.warn("THREE.WebGLRenderer: .addPrePlugin() has been removed.")};Yt.prototype.addPostPlugin=function(){console.warn("THREE.WebGLRenderer: .addPostPlugin() has been removed.")};Yt.prototype.updateShadowMap=function(){console.warn("THREE.WebGLRenderer: .updateShadowMap() has been removed.")};Yt.prototype.setFaceCulling=function(){console.warn("THREE.WebGLRenderer: .setFaceCulling() has been removed.")};Yt.prototype.allocTextureUnit=function(){console.warn("THREE.WebGLRenderer: .allocTextureUnit() has been removed.")};Yt.prototype.setTexture=function(){console.warn("THREE.WebGLRenderer: .setTexture() has been removed.")};Yt.prototype.setTexture2D=function(){console.warn("THREE.WebGLRenderer: .setTexture2D() has been removed.")};Yt.prototype.setTextureCube=function(){console.warn("THREE.WebGLRenderer: .setTextureCube() has been removed.")};Yt.prototype.getActiveMipMapLevel=function(){return console.warn("THREE.WebGLRenderer: .getActiveMipMapLevel() is now .getActiveMipmapLevel()."),this.getActiveMipmapLevel()};Object.defineProperties(Yt.prototype,{shadowMapEnabled:{get:function(){return this.shadowMap.enabled},set:function(r){console.warn("THREE.WebGLRenderer: .shadowMapEnabled is now .shadowMap.enabled."),this.shadowMap.enabled=r}},shadowMapType:{get:function(){return this.shadowMap.type},set:function(r){console.warn("THREE.WebGLRenderer: .shadowMapType is now .shadowMap.type."),this.shadowMap.type=r}},shadowMapCullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")}},context:{get:function(){return console.warn("THREE.WebGLRenderer: .context has been removed. Use .getContext() instead."),this.getContext()}},vr:{get:function(){return console.warn("THREE.WebGLRenderer: .vr has been renamed to .xr"),this.xr}},gammaInput:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaInput has been removed. Set the encoding for textures via Texture.encoding instead."),!1},set:function(){console.warn("THREE.WebGLRenderer: .gammaInput has been removed. Set the encoding for textures via Texture.encoding instead.")}},gammaOutput:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaOutput has been removed. Set WebGLRenderer.outputEncoding instead."),!1},set:function(r){console.warn("THREE.WebGLRenderer: .gammaOutput has been removed. Set WebGLRenderer.outputEncoding instead."),this.outputEncoding=r===!0?te:pn}},toneMappingWhitePoint:{get:function(){return console.warn("THREE.WebGLRenderer: .toneMappingWhitePoint has been removed."),1},set:function(){console.warn("THREE.WebGLRenderer: .toneMappingWhitePoint has been removed.")}},gammaFactor:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaFactor has been removed."),2},set:function(){console.warn("THREE.WebGLRenderer: .gammaFactor has been removed.")}}});Object.defineProperties(ou.prototype,{cullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")}},renderReverseSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")}},renderSingleSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")}}});Object.defineProperties(Pe.prototype,{wrapS:{get:function(){return console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS."),this.texture.wrapS},set:function(r){console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS."),this.texture.wrapS=r}},wrapT:{get:function(){return console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT."),this.texture.wrapT},set:function(r){console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT."),this.texture.wrapT=r}},magFilter:{get:function(){return console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter."),this.texture.magFilter},set:function(r){console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter."),this.texture.magFilter=r}},minFilter:{get:function(){return console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter."),this.texture.minFilter},set:function(r){console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter."),this.texture.minFilter=r}},anisotropy:{get:function(){return console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy."),this.texture.anisotropy},set:function(r){console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy."),this.texture.anisotropy=r}},offset:{get:function(){return console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset."),this.texture.offset},set:function(r){console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset."),this.texture.offset=r}},repeat:{get:function(){return console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat."),this.texture.repeat},set:function(r){console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat."),this.texture.repeat=r}},format:{get:function(){return console.warn("THREE.WebGLRenderTarget: .format is now .texture.format."),this.texture.format},set:function(r){console.warn("THREE.WebGLRenderTarget: .format is now .texture.format."),this.texture.format=r}},type:{get:function(){return console.warn("THREE.WebGLRenderTarget: .type is now .texture.type."),this.texture.type},set:function(r){console.warn("THREE.WebGLRenderTarget: .type is now .texture.type."),this.texture.type=r}},generateMipmaps:{get:function(){return console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps."),this.texture.generateMipmaps},set:function(r){console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps."),this.texture.generateMipmaps=r}}});rv.prototype.load=function(r){console.warn("THREE.Audio: .load has been deprecated. Use THREE.AudioLoader instead.");const t=this;return new tv().load(r,function(n){t.setBuffer(n)}),this};ja.prototype.updateCubeMap=function(r,t){return console.warn("THREE.CubeCamera: .updateCubeMap() is now .update()."),this.update(r,t)};ja.prototype.clear=function(r,t,e,n){return console.warn("THREE.CubeCamera: .clear() is now .renderTarget.clear()."),this.renderTarget.clear(r,t,e,n)};Kn.crossOrigin=void 0;Kn.loadTexture=function(r,t,e,n){console.warn("THREE.ImageUtils.loadTexture has been deprecated. Use THREE.TextureLoader() instead.");const i=new G_;i.setCrossOrigin(this.crossOrigin);const s=i.load(r,e,void 0,n);return t&&(s.mapping=t),s};Kn.loadTextureCube=function(r,t,e,n){console.warn("THREE.ImageUtils.loadTextureCube has been deprecated. Use THREE.CubeTextureLoader() instead.");const i=new V_;i.setCrossOrigin(this.crossOrigin);const s=i.load(r,e,void 0,n);return t&&(s.mapping=t),s};Kn.loadCompressedTexture=function(){console.error("THREE.ImageUtils.loadCompressedTexture has been removed. Use THREE.DDSLoader instead.")};Kn.loadCompressedTextureCube=function(){console.error("THREE.ImageUtils.loadCompressedTextureCube has been removed. Use THREE.DDSLoader instead.")};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ga}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ga);class oy{constructor(){Gt(this,"clock",new iv)}play(t,e={}){const n=e.maxFps?1e3/e.maxFps:0;let i=performance.now();const s=o=>{var c;if(requestAnimationFrame(s),n>0&&((c=e.shouldCap)==null?void 0:c.call(e))&&o-i<n)return;if(i=o,Zu()){this.clock.getDelta();return}const a=this.clock.getDelta(),l=this.clock.getElapsedTime();t(l,a)};s(performance.now())}}export{Qv as $,On as A,Fd as B,Id as C,ty as D,Xv as E,Av as F,Rd as G,nd as H,rd as I,Dv as J,Nv as K,qv as L,en as M,jn as N,Rv as O,Cv as P,Lv as Q,Iv as R,Ku as S,Ev as T,jv as U,Yv as V,ry as W,iy as X,Tv as Y,Wv as Z,Kv as _,Hv as a,Ae as a0,T as a1,We as a2,Ji as a3,Kt as a4,ce as a5,ae as a6,Lu as a7,vt as a8,ki as a9,uo as aa,xu as ab,cl as ac,fe as ad,G_ as ae,Ea as af,te as ag,Zt as ah,el as ai,Zi as aj,nl as ak,gr as al,Te as am,bu as an,Mt as ao,Bs as ap,Pl as aq,Yt as ar,lf as as,cu as at,Qa as au,W_ as av,q_ as aw,Ee as ax,Mu as ay,zv as b,Ls as c,Pv as d,kv as e,Ov as f,$v as g,Uv as h,Ed as i,Fv as j,Vv as k,qn as l,Bv as m,Gv as n,kd as o,Sv as p,Jv as q,oo as r,wv as s,Ad as t,sy as u,bl as v,ny as w,ey as x,Zv as y,oy as z};
