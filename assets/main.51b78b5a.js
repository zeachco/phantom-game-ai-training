var ht=(i,t,s)=>{if(!t.has(i))throw TypeError("Cannot "+s)};var A=(i,t,s)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,s)};var M=(i,t,s)=>(ht(i,t,"access private method"),s);import{l as C,r as N,g as q,p as J}from"./three.module.e2623146.js";import{c as V}from"./dom.be162d4e.js";import{GameLoop as ot}from"./GameLoop.08ec9c71.js";function nt(i,t,s=[]){if(!i||!t)return!1;const e=(r,h)=>s.includes(r)?void 0:h;return JSON.stringify(i,e)===JSON.stringify(t,e)}function at(i=""){const t=n=>`${i}_${n}`;return{saveBestModels:r,loadAllModelLayers:h,discardModels:l};function s(n,o,d=t(n),u=!1){var f;const p=e(n),g=["id","version","mutationIndex","mutationFactor","score"];if(p[0]&&p[0].score>o[0].score)console.debug(`skipping save based on score ${p[0].score} > ${o[0].score}`);else if(!nt(o,p,g)){const w=JSON.stringify(o);return console.debug(`saving ${o.length} gen-${(f=o[0])==null?void 0:f.version} ${i} models (${n} layers).`),localStorage.setItem(d,w),1}return 0}function e(n,o=t(n)){let d=[];try{const u=localStorage.getItem(o);if(!u)throw new Error("not found");d=JSON.parse(u),console.debug(`Retreived ${d.length} gen-${d[0].version} for layer ${n}`)}catch{console.debug(`Nothing for layer ${n}`)}return d}function r(n,o=1){const d=new Array;n.forEach(p=>{const g=p.levels.length,f=d[g]||[];f.length>=o||(d[g]=[...f,p].sort((w,a)=>a.score-w.score))});let u=0;d.forEach((p,g)=>u+=s(g,p)),console.debug(`Written ${u} models`)}function h(n=1){const o=new Array;try{for(let d=1;d<=n;d++){const u=e(d);u&&(o[d]=u)}}catch(d){console.error(d)}return o}function l(){localStorage.clear()}}function lt(i,t,s,e,r,h=5,l=!1,n=!0){const o={tl:h,tr:h,br:h,bl:h};typeof h!="number"&&Object.assign(o,{tl:0,tr:0,br:0,bl:0},h),i.beginPath(),i.moveTo(t+o.tl,s),i.lineTo(t+e-o.tr,s),i.quadraticCurveTo(t+e,s,t+e,s+o.tr),i.lineTo(t+e,s+r-o.br),i.quadraticCurveTo(t+e,s+r,t+e-o.br,s+r),i.lineTo(t+o.bl,s+r),i.quadraticCurveTo(t,s+r,t,s+r-o.bl),i.lineTo(t,s+o.tl),i.quadraticCurveTo(t,s,t+o.tl,s),i.closePath(),l&&i.fill(),n&&i.stroke()}function $(i){const t=Math.abs(i),s=i>0?0:255,e=i>0?0:255,r=i<0?0:255;return`rgba(${s}, ${e}, ${r}, ${t})`}function dt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}const v=12,L=Math.max(v,10);var R,P;const E=class{static drawStats(t,s){t.save(),t.translate(t.canvas.width*.5+L,t.canvas.height*.5-18*2),t.font=18+"px Arial",t.strokeStyle="orange",t.fillStyle="rgba(32, 32, 32, .76)",lt(t,150*-.5,0,150,18*3+8*2,8,!0),t.fillStyle="orange",t.textBaseline="hanging",t.textAlign="center",t.translate(0,8),t.fillText(`Network ${s.id}`,0,0,142),t.translate(0,18),t.fillText(`Mutation ${Math.round(s.mutationFactor*100)}%`,0,0,142),t.translate(0,18),t.fillText(`Score ${Math.round(s.score)}`,0,0,142),t.restore()}static drawNetwork(t,s){const e=L,r=L,h=t.canvas.width-L*2,l=t.canvas.height-L*2,n=l/s.levels.length;for(let o=s.levels.length-1;o>=0;o--){const d=r+C(l-n,0,s.levels.length==1?.5:o/(s.levels.length-1));t.setLineDash([7,3]),E.drawLevel(t,s.levels[o],e,d,h,n,o==s.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,s,e,r,h,l,n){var w,a,m,H;const o=e+h,d=r+l,{inputs:u,outputs:p,weights:g,biases:f}=s;for(let c=0;c<u.length;c++)for(let S=0;S<p.length;S++)t.beginPath(),t.moveTo(M(w=E,R,P).call(w,u,c,e,o),d),t.lineTo(M(a=E,R,P).call(a,p,S,e,o),r),t.lineWidth=2,t.strokeStyle=$(g[c][S]),t.stroke();for(let c=0;c<u.length;c++){const S=M(m=E,R,P).call(m,u,c,e,o);t.beginPath(),t.arc(S,d,v,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(S,d,v*.8,0,Math.PI*2),t.fillStyle=$(u[c]),t.fill()}for(let c=0;c<p.length;c++){const S=M(H=E,R,P).call(H,p,c,e,o);t.beginPath(),t.arc(S,r,v,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(S,r,v*.6,0,Math.PI*2),t.fillStyle=$(p[c]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(S,r,v*.8,0,Math.PI*2),t.strokeStyle=$(f[c]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),n[c]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=v*1.5+"px Arial",t.fillText(n[c],S,r+v*.1),t.lineWidth=.5,t.strokeText(n[c],S,r+v*.1))}}};let O=E;R=new WeakSet,P=function(t,s,e,r){return C(e,r,t.length==1?.5:s/(t.length-1))},A(O,R);var b=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(b||{}),W,Q;class ft{constructor(t){A(this,W);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case b.KEYS:M(this,W,Q).call(this);break;case b.DUMMY:this.forward=!0;break}}}W=new WeakSet,Q=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class gt{constructor(){this.MAX_NETWORK_LAYERS=9,this.CAR_PER_LEVELS=200/this.MAX_NETWORK_LAYERS,this.MUTATION_LVL=.3,this.NETWORK_LAYERS=3,this.SENSORS=11,this.SENSOR_ANGLE=Math.PI/2*3.7,this.TOP_AI_NB=this.MAX_NETWORK_LAYERS*2,this.DEATH_SPEED=.005,this.CAR_ACCELERATION=.03,this.CAR_FRICTION=.005,this.CAR_MAX_SPEED=5,this.CLEAR_STORAGE=!1,this.trafficConfig=[[0,-300,.1,"A"],[1,-500,.2,"B"],[2,-300,.3,"C"],[0,-400,2,"LA"],[0,-600,2.2,"LB"],[2,-300,2,"RA"],[1,-600,2,"MA"],[2,-700,2.1,"RC"],[0,-900,2.2],[1,-900,2.3],[2,-900,2.1],[2,-950,2.4,"S"]]}}const y=new gt;class z{constructor(t,s,e=Math.ceil(t/4)){if(this.version=0,this.score=0,this.mutationFactor=.5,this.mutationIndex=.5,t<s)throw new Error("requires more inputs than outputs");this.levels=[];for(let r=0;r<e;r++){const h=Math.floor(C(t,s,r/e)),l=Math.floor(C(t,s,(r+1)/e));this.levels.push(new T(h,l))}}static feedForward(t,s){let e=T.feedForward(t,s.levels[0]);for(let r=1;r<s.levels.length;r++)e=T.feedForward(e,s.levels[r]);return e}get id(){return[this.levels.length,this.version,this.mutationIndex].join("-")}mutate(t){if(this.mutationFactor=this.mutationIndex/Math.max(1,this.score)*y.MUTATION_LVL,this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}this.version=t.version+1;for(let s=0;s<this.levels.length;s++){for(let e=0;e<this.levels[s].biases.length;e++)this.levels[s].biases[e]=C(t.levels[s].biases[e],N(),this.mutationFactor);for(let e=0;e<this.levels[s].weights.length;e++)for(let r=0;r<this.levels[s].weights[e].length;r++)this.levels[s].weights[e][r]=C(t.levels[s].weights[e][r],N(),this.mutationFactor)}}}var D,Z;const X=class{constructor(t=1,s=1){var e;this.inputs=new Array(t),this.outputs=new Array(s),this.biases=new Array(s),this.weights=[];for(let r=0;r<t;r++)this.weights[r]=new Array(s);M(e=X,D,Z).call(e,this)}static feedForward(t,s){for(let e=0;e<s.inputs.length;e++)s.inputs[e]=t[e];for(let e=0;e<s.outputs.length;e++){let r=0;for(let h=0;h<s.inputs.length;h++)r+=s.inputs[h]*s.weights[h][e];r>s.biases[e]?s.outputs[e]=1:s.outputs[e]=0}return s.outputs}};let T=X;D=new WeakSet,Z=function(t){for(let s=0;s<t.inputs.length;s++)for(let e=0;e<t.outputs.length;e++)t.weights[s][e]=N();for(let s=0;s<t.biases.length;s++)t.biases[s]=N()},A(T,D);var Y,x,F,tt;class ct{constructor(t){A(this,Y);A(this,F);this.car=t,this.rayCount=y.SENSORS,this.rayLength=250,this.raySpread=y.SENSOR_ANGLE,this.rays=[],this.readings=[]}update(t,s){M(this,F,tt).call(this),this.readings=[];for(let e=0;e<this.rays.length;e++)this.readings.push(M(this,Y,x).call(this,this.rays[e],t,s))}draw(t){for(let s=0;s<this.rays.length;s++){let e=this.rays[s][1];this.readings[s]&&(e=this.readings[s]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[s][0].x,this.rays[s][0].y),t.lineTo(e.x,e.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[s][1].x,this.rays[s][1].y),t.lineTo(e.x,e.y),t.stroke()}}}Y=new WeakSet,x=function(t,s,e){let r=[];for(let h=0;h<s.length;h++){const l=q(t[0],t[1],s[h][0],s[h][1]);l&&r.push(l)}for(let h=0;h<e.length;h++){const l=e[h].polygon;for(let n=0;n<l.length;n++){const o=q(t[0],t[1],l[n],l[(n+1)%l.length]);o&&r.push(o)}}if(r.length==0)return null;{const h=r.map(n=>n.offset),l=Math.min(...h);return r.find(n=>n.offset==l)}},F=new WeakSet,tt=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const s=C(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,e={x:this.car.x,y:this.car.y},r={x:this.car.x-Math.sin(s)*this.rayLength,y:this.car.y-Math.cos(s)*this.rayLength};this.rays.push([e,r])}};const ut="/phantom-game-ai-training/assets/car.3e3d3a26.png";let pt=0;var K,st,B,et,U,it,j,rt;class I{constructor(t=0,s=0,e=50,r=50,h=b.DUMMY,l=y.CAR_MAX_SPEED,n=`${pt++}`,o=dt()){A(this,K);A(this,B);A(this,U);A(this,j);this.x=t,this.y=s,this.width=e,this.height=r,this.maxSpeed=l,this.label=n,this.color=o,this.polygon=[],this.x=t,this.y=s,this.width=e,this.height=r,this.speed=0,this.acceleration=y.CAR_ACCELERATION,this.maxSpeed=l,this.friction=y.CAR_FRICTION,this.angle=0,this.damaged=!1,this.useAI=h==b.AI,this.controls=new ft(h),h!==b.DUMMY&&(this.sensor=new ct(this),this.neural=new z(this.sensor.rayCount,Object.keys(this.controls).length+1,h==b.KEYS?1:y.NETWORK_LAYERS)),this.img=new Image,this.img.src=ut,this.mask=document.createElement("canvas"),this.mask.width=e,this.mask.height=r;const d=this.mask.getContext("2d");this.img.onload=()=>{d.fillStyle=o,d.rect(0,0,this.width,this.height),d.fill(),d.globalCompositeOperation="destination-atop",d.drawImage(this.img,0,0,this.width,this.height)}}update(t,s){if(!this.damaged&&(M(this,j,rt).call(this),this.neural&&M(this,K,st).call(this),this.polygon=M(this,U,it).call(this),this.damaged=M(this,B,et).call(this,t,s),this.sensor)){this.sensor.update(t,s);const e=this.sensor.readings.map(h=>h==null?0:1-h.offset);e.push(this.speed/this.maxSpeed);const r=z.feedForward(e,this.neural);this.useAI&&(this.controls.forward=r[0],this.controls.left=r[1],this.controls.right=r[2],this.controls.reverse=r[3])}}draw(t,s=!1,e=0){this.sensor&&s&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.textAlign="center",t.font="bold 11px serif",t.textBaseline="middle",t.fillStyle="rgba(0,0,0, 1)",t.fillText(`${this.label}`,0,this.height-22),t.restore()}}K=new WeakSet,st=function(){this.neural.score+=Math.cos(this.angle)*this.speed,this.neural.score+=this.speed},B=new WeakSet,et=function(t,s){for(let e=0;e<t.length;e++)if(J(this.polygon,t[e]))return!0;for(let e=0;e<s.length;e++)if(J(this.polygon,s[e].polygon))return!0;return!1},U=new WeakSet,it=function(){const t=[],s=Math.hypot(this.width,this.height)/2,e=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-e)*s,y:this.y-Math.cos(this.angle-e)*s}),t.push({x:this.x-Math.sin(this.angle+e)*s,y:this.y-Math.cos(this.angle+e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle-e)*s,y:this.y-Math.cos(Math.PI+this.angle-e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle+e)*s,y:this.y-Math.cos(Math.PI+this.angle+e)*s}),t},j=new WeakSet,rt=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class mt{constructor(t,s,e=3){this.x=t,this.width=s,this.laneCount=e,this.borders=[],this.x=t,this.width=s,this.laneCount=e,this.left=t-s/2,this.right=t+s/2;const r=1e6;this.top=-r,this.bottom=r;const h={x:this.left,y:this.top},l={x:this.right,y:this.top},n={x:this.left,y:this.bottom},o={x:this.right,y:this.bottom};this.borders=[[h,n],[l,o]]}getLane(t){const s=this.width/this.laneCount;return this.left+s/2+Math.min(t,this.laneCount-1)*s}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let s=1;s<=this.laneCount-1;s++){const e=C(this.left,this.right,s/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(e,this.top),t.lineTo(e,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(s=>{t.beginPath(),t.moveTo(s[0].x,s[0].y),t.lineTo(s[1].x,s[1].y),t.stroke()})}}class yt{constructor(){this.speed=0,this.y=300}update(){this.speed+=y.DEATH_SPEED,this.y-=this.speed}draw(t){t.beginPath(),t.lineWidth=4,t.strokeStyle="red",t.moveTo(0,this.y),t.lineTo(t.canvas.width,this.y),t.stroke()}}const _=at("highway");y.CLEAR_STORAGE||_.discardModels();const wt={cars:[],sortedCars:[],livingCars:[],traffic:[],player:new I,sortedModels:[]},Ct=async i=>{const t=V(),s=V(),e=t.getContext("2d"),r=s.getContext("2d");t.width=200;const h=Math.round(t.width/75),l=new mt(t.width/2,t.width*.9,h),n=new ot;let o;function d(){Object.assign(i,wt),i.traffic=y.trafficConfig.map(([g,f,w,a],m)=>new I(l.getLane(g),f,30,50,b.DUMMY,w,a||m+"")),o=new yt,i.sortedModels=_.loadAllModelLayers(),i.cars=p(),i.player=new I(l.getLane(1),0,30,50,b.KEYS,3.5,"You"),i.cars.push(i.player)}function u(){const g=i.sortedCars.filter(f=>f.useAI);_.saveBestModels(g.map(f=>f.neural),y.TOP_AI_NB),d()}function p(){const g=[];for(let f=1;f<=y.MAX_NETWORK_LAYERS;f++){let w;i.sortedModels[f]&&i.sortedModels[f].length&&(w=i.sortedModels[f][0]);for(let a=1;a<=y.CAR_PER_LEVELS;a++){y.NETWORK_LAYERS=f;const m=new I(l.getLane(1),100,30,50,b.AI,3,`#${a}`);w&&m.neural&&(m.neural.mutationIndex=a,m.neural.mutate(w),m.label=m.neural.id),g.push(m)}}return g}try{d()}catch(g){throw _.discardModels(),g}n.play((g,f)=>{o.update();for(let a=0;a<i.traffic.length;a++)i.traffic[a].update(l.borders,[]);for(let a=0;a<i.cars.length;a++)i.cars[a].update(l.borders,i.traffic),i.cars[a].y>o.y&&(i.cars[a].damaged=!0);i.sortedCars=i.cars.sort((a,m)=>m.neural.score-a.neural.score),i.livingCars=i.cars.filter(a=>!a.damaged),t.height=window.innerHeight,s.height=window.innerHeight,s.width=window.innerWidth-t.width,e.save(),i.player.neural.score>0&&!i.player.damaged?e.translate(0,-i.player.y+t.height*.7):e.translate(0,-i.sortedCars[0].y+t.height*.7),l.draw(e),o.draw(e);for(let a=0;a<i.traffic.length;a++)i.traffic[a].draw(e);for(let a=0;a<i.sortedCars.length;a++){const m=a===0||!i.cars[a].useAI;e.globalAlpha=m?1:.2,i.cars[a].draw(e,a===0,a)}e.restore(),St(i,e),r.lineDashOffset=-f/50,O.drawNetwork(r,i.sortedCars[0].neural),O.drawStats(r,i.sortedCars[0].neural);const[w]=i.livingCars;w||u()})},k=16,G=0;function St(i,t){t.fillStyle="black",t.font="bold 14px serif",t.fillText(`${i.livingCars.length}/${i.sortedCars.length} cars`,G,k*3),[...i.sortedModels.map(e=>e[0]).filter(Boolean),...i.sortedCars.filter((e,r)=>r<y.TOP_AI_NB||e===i.player)].sort((e,r)=>{const h=e instanceof I?e.neural.score:e.score;return(r instanceof I?r.neural.score:r.score)-h}).forEach((e,r)=>{if(e instanceof I){const h=e.damaged?"\u{1F480}":"\u2764\uFE0F";t.fillStyle=e.damaged?"#def":e.color,t.fillText(`${h} ${e.label} ${Math.round(e.neural.score)}`,G,k*5+r*k)}else t.fillStyle="white",t.fillText(`\u{1F47B} ${e.levels.length}-${e.version}-${e.mutationIndex} ${Math.round(e.score)}`,G,k*5+r*k)})}export{Ct as default};
