var ot=(i,t,s)=>{if(!t.has(i))throw TypeError("Cannot "+s)};var M=(i,t,s)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,s)};var S=(i,t,s)=>(ot(i,t,"access private method"),s);import{l as E,r as W,g as q,p as J}from"./three.module.e2623146.js";import{c as V}from"./dom.be162d4e.js";import{GameLoop as nt}from"./GameLoop.08ec9c71.js";function at(i,t,s=[]){if(!i||!t)return!1;const e=(r,o)=>s.includes(r)?void 0:o;return JSON.stringify(i,e)===JSON.stringify(t,e)}function lt(i=""){const t=n=>`${i}_${n}`;return{saveBestModels:r,loadAllModelLayers:o,discardModels:l};function s(n,h,d=t(n),f=!1){var c;const p=e(n),g=["id","version","mutationIndex","mutationFactor","score"];if(p[0]&&p[0].score>h[0].score)console.debug(`skipping save based on score ${p[0].score} > ${h[0].score}`);else if(!at(h,p,g)){const m=JSON.stringify(h);return console.debug(`saving ${h.length} gen-${(c=h[0])==null?void 0:c.version} ${i} models (${n} layers).`),localStorage.setItem(d,m),1}return 0}function e(n,h=t(n)){let d=[];try{const f=localStorage.getItem(h);if(!f)throw new Error("not found");d=JSON.parse(f),console.debug(`Retreived ${d.length} gen-${d[0].version} for layer ${n}`)}catch{console.debug(`Nothing for layer ${n}`)}return d}function r(n,h=1){const d=new Array;n.forEach(p=>{const g=p.levels.length,c=d[g]||[];c.length>=h||(d[g]=[...c,p].sort((m,a)=>a.score-m.score))});let f=0;d.forEach((p,g)=>f+=s(g,p)),console.debug(`Written ${f} models`)}function o(n=1){const h=new Array;try{for(let d=1;d<=n;d++){const f=e(d);f&&(h[d]=f)}}catch(d){console.error(d)}return h}function l(){localStorage.clear()}}class dt{constructor(){this.CAR_NB=100,this.MAX_NETWORK_LAYERS=9,this.MUTATION_LVL=3e-4,this.SCORES_NB=this.MAX_NETWORK_LAYERS*2,this.SENSORS=11,this.SENSOR_ANGLE=Math.PI/2*3.7,this.DEATH_SPEED=.0025,this.CAR_ACCELERATION=.03,this.CAR_FRICTION=.005,this.CAR_MAX_SPEED=5,this.CLEAR_STORAGE=!1,this.trafficConfig=[[0,-300,.1,"A"],[1,-500,.2,"B"],[2,-300,.3,"C"],[0,-400,2,"LA"],[0,-600,2.2,"LB"],[2,-300,2,"RA"],[1,-600,2,"MA"],[2,-700,2.1,"RC"],[0,-900,2.2],[1,-900,2.3],[2,-900,2.1],[2,-950,2.4,"S"]]}get CAR_PER_LEVELS(){return this.CAR_NB/this.MAX_NETWORK_LAYERS}}const y=new dt;function ft(i,t,s,e,r,o=5,l=!1,n=!0){const h={tl:o,tr:o,br:o,bl:o};typeof o!="number"&&Object.assign(h,{tl:0,tr:0,br:0,bl:0},o),i.beginPath(),i.moveTo(t+h.tl,s),i.lineTo(t+e-h.tr,s),i.quadraticCurveTo(t+e,s,t+e,s+h.tr),i.lineTo(t+e,s+r-h.br),i.quadraticCurveTo(t+e,s+r,t+e-h.br,s+r),i.lineTo(t+h.bl,s+r),i.quadraticCurveTo(t,s+r,t,s+r-h.bl),i.lineTo(t,s+h.tl),i.quadraticCurveTo(t,s,t+h.tl,s),i.closePath(),l&&i.fill(),n&&i.stroke()}function N(i){const t=Math.abs(i),s=i>0?0:255,e=i>0?0:255,r=i<0?0:255;return`rgba(${s}, ${e}, ${r}, ${t})`}function gt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}function Q(i,t=1,s=.5,e=1){return`hsla(${Math.round(i*360)}, ${t*100}%, ${s*100}%, ${e})`}const v=12,$=Math.max(v,10);var T,_;const R=class{static drawStats(t,s){const n=Q(s.levels.length/y.MAX_NETWORK_LAYERS);t.save(),t.translate(t.canvas.width*.5+$,t.canvas.height*.5-18*2),t.font=18+"px Arial",t.strokeStyle=n,t.fillStyle="rgba(32, 32, 32, .76)",ft(t,150*-.5,0,150,18*3+8*2,8,!0),t.fillStyle=n,t.textBaseline="hanging",t.textAlign="center",t.translate(0,8),t.fillText(`Network ${s.id}`,0,0,142),t.translate(0,18),t.fillText(`Mutation ${Math.round(s.mutationFactor*100)}%`,0,0,142),t.translate(0,18),t.fillText(`Score ${Math.round(s.score)}`,0,0,142),t.restore()}static drawNetwork(t,s){const e=$,r=$,o=t.canvas.width-$*2,l=t.canvas.height-$*2,n=l/s.levels.length;for(let h=s.levels.length-1;h>=0;h--){const d=r+E(l-n,0,s.levels.length==1?.5:h/(s.levels.length-1));t.setLineDash([7,3]),R.drawLevel(t,s.levels[h],e,d,o,n,h==s.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,s,e,r,o,l,n){var m,a,w,A;const h=e+o,d=r+l,{inputs:f,outputs:p,weights:g,biases:c}=s;for(let u=0;u<f.length;u++)for(let b=0;b<p.length;b++)t.beginPath(),t.moveTo(S(m=R,T,_).call(m,f,u,e,h),d),t.lineTo(S(a=R,T,_).call(a,p,b,e,h),r),t.lineWidth=2,t.strokeStyle=N(g[u][b]),t.stroke();for(let u=0;u<f.length;u++){const b=S(w=R,T,_).call(w,f,u,e,h);t.beginPath(),t.arc(b,d,v,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(b,d,v*.8,0,Math.PI*2),t.fillStyle=N(f[u]),t.fill()}for(let u=0;u<p.length;u++){const b=S(A=R,T,_).call(A,p,u,e,h);t.beginPath(),t.arc(b,r,v,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(b,r,v*.6,0,Math.PI*2),t.fillStyle=N(p[u]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(b,r,v*.8,0,Math.PI*2),t.strokeStyle=N(c[u]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),n[u]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=v*1.5+"px Arial",t.fillText(n[u],b,r+v*.1),t.lineWidth=.5,t.strokeText(n[u],b,r+v*.1))}}};let O=R;T=new WeakSet,_=function(t,s,e,r){return E(e,r,t.length==1?.5:s/(t.length-1))},M(O,T);var C=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(C||{}),D,Z;class ct{constructor(t){M(this,D);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case C.KEYS:S(this,D,Z).call(this);break;case C.DUMMY:this.forward=!0;break}}}D=new WeakSet,Z=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class z{constructor(t,s,e=Math.ceil(t/4)){if(this.version=0,this.score=0,this.mutationFactor=.5,this.mutationIndex=.5,t<s)throw new Error("requires more inputs than outputs");this.levels=[];for(let r=0;r<e;r++){const o=Math.floor(E(t,s,r/e)),l=Math.floor(E(t,s,(r+1)/e));this.levels.push(new L(o,l))}}static feedForward(t,s){let e=L.feedForward(t,s.levels[0]);for(let r=1;r<s.levels.length;r++)e=L.feedForward(e,s.levels[r]);return e}get id(){return[this.levels.length,this.version,this.mutationIndex].join("-")}mutate(t){if(this.version=t.version+1,this.mutationFactor=y.MUTATION_LVL,this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}for(let s=0;s<this.levels.length;s++){for(let e=0;e<this.levels[s].biases.length;e++)this.levels[s].biases[e]=E(t.levels[s].biases[e],W(),this.mutationFactor);for(let e=0;e<this.levels[s].weights.length;e++)for(let r=0;r<this.levels[s].weights[e].length;r++)this.levels[s].weights[e][r]=E(t.levels[s].weights[e][r],W(),this.mutationFactor)}}}var F,x;const H=class{constructor(t=1,s=1){var e;this.inputs=new Array(t),this.outputs=new Array(s),this.biases=new Array(s),this.weights=[];for(let r=0;r<t;r++)this.weights[r]=new Array(s);S(e=H,F,x).call(e,this)}static feedForward(t,s){for(let e=0;e<s.inputs.length;e++)s.inputs[e]=t[e];for(let e=0;e<s.outputs.length;e++){let r=0;for(let o=0;o<s.inputs.length;o++)r+=s.inputs[o]*s.weights[o][e];r>s.biases[e]?s.outputs[e]=1:s.outputs[e]=0}return s.outputs}};let L=H;F=new WeakSet,x=function(t){for(let s=0;s<t.inputs.length;s++)for(let e=0;e<t.outputs.length;e++)t.weights[s][e]=W();for(let s=0;s<t.biases.length;s++)t.biases[s]=W()},M(L,F);var Y,tt,B,st;class ut{constructor(t){M(this,Y);M(this,B);this.car=t,this.rayCount=y.SENSORS,this.rayLength=250,this.raySpread=y.SENSOR_ANGLE,this.rays=[],this.readings=[]}update(t,s){S(this,B,st).call(this),this.readings=[];for(let e=0;e<this.rays.length;e++)this.readings.push(S(this,Y,tt).call(this,this.rays[e],t,s))}draw(t){for(let s=0;s<this.rays.length;s++){let e=this.rays[s][1];this.readings[s]&&(e=this.readings[s]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[s][0].x,this.rays[s][0].y),t.lineTo(e.x,e.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[s][1].x,this.rays[s][1].y),t.lineTo(e.x,e.y),t.stroke()}}}Y=new WeakSet,tt=function(t,s,e){let r=[];for(let o=0;o<s.length;o++){const l=q(t[0],t[1],s[o][0],s[o][1]);l&&r.push(l)}for(let o=0;o<e.length;o++){const l=e[o].polygon;for(let n=0;n<l.length;n++){const h=q(t[0],t[1],l[n],l[(n+1)%l.length]);h&&r.push(h)}}if(r.length==0)return null;{const o=r.map(n=>n.offset),l=Math.min(...o);return r.find(n=>n.offset==l)}},B=new WeakSet,st=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const s=E(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,e={x:this.car.x,y:this.car.y},r={x:this.car.x-Math.sin(s)*this.rayLength,y:this.car.y-Math.cos(s)*this.rayLength};this.rays.push([e,r])}};const pt="/phantom-game-ai-training/assets/car.3e3d3a26.png";var K,et,U,it,j,rt,X,ht;class I{constructor(t=0,s=0,e=C.DUMMY,r=y.CAR_MAX_SPEED,o="",l=gt(),n=1){M(this,K);M(this,U);M(this,j);M(this,X);this.x=t,this.y=s,this.maxSpeed=r,this.label=o,this.color=l,this.brainLayers=n,this.polygon=[],this.width=30,this.height=50,this.x=t,this.y=s,this.speed=0,this.acceleration=y.CAR_ACCELERATION,this.maxSpeed=r,this.friction=y.CAR_FRICTION,this.angle=0,this.damaged=!1,this.useAI=e==C.AI,this.controls=new ct(e),e!==C.DUMMY&&(this.sensor=new ut(this),this.brain=new z(this.sensor.rayCount,Object.keys(this.controls).length+1,n)),this.img=new Image,this.img.src=pt,this.mask=document.createElement("canvas"),this.mask.width=this.width,this.mask.height=this.height;const h=this.mask.getContext("2d");this.img.onload=()=>{h.fillStyle=l,h.rect(0,0,this.width,this.height),h.fill(),h.globalCompositeOperation="destination-atop",h.drawImage(this.img,0,0,this.width,this.height)}}update(t,s){if(!this.damaged&&(S(this,X,ht).call(this),this.brain&&S(this,K,et).call(this),this.polygon=S(this,j,rt).call(this),this.damaged=S(this,U,it).call(this,t,s),this.sensor)){this.sensor.update(t,s);const e=this.sensor.readings.map(o=>o==null?0:1-o.offset);e.push(this.speed/this.maxSpeed);const r=z.feedForward(e,this.brain);this.useAI&&(this.controls.forward=r[0],this.controls.left=r[1],this.controls.right=r[2],this.controls.reverse=r[3])}}draw(t,s=!1,e=0){this.sensor&&s&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.textAlign="center",t.font="bold 11px serif",t.textBaseline="middle",t.fillStyle="rgba(0,0,0, 1)",t.fillText(`${this.label}`,0,this.height-22),t.restore()}}K=new WeakSet,et=function(){this.brain.score+=Math.cos(this.angle)*this.speed,this.brain.score+=this.speed},U=new WeakSet,it=function(t,s){for(let e=0;e<t.length;e++)if(J(this.polygon,t[e]))return!0;for(let e=0;e<s.length;e++)if(J(this.polygon,s[e].polygon))return!0;return!1},j=new WeakSet,rt=function(){const t=[],s=Math.hypot(this.width,this.height)/2,e=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-e)*s,y:this.y-Math.cos(this.angle-e)*s}),t.push({x:this.x-Math.sin(this.angle+e)*s,y:this.y-Math.cos(this.angle+e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle-e)*s,y:this.y-Math.cos(Math.PI+this.angle-e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle+e)*s,y:this.y-Math.cos(Math.PI+this.angle+e)*s}),t},X=new WeakSet,ht=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class mt{constructor(t,s,e=3){this.x=t,this.width=s,this.laneCount=e,this.borders=[],this.x=t,this.width=s,this.laneCount=e,this.left=t-s/2,this.right=t+s/2;const r=1e6;this.top=-r,this.bottom=r;const o={x:this.left,y:this.top},l={x:this.right,y:this.top},n={x:this.left,y:this.bottom},h={x:this.right,y:this.bottom};this.borders=[[o,n],[l,h]]}getLane(t){const s=this.width/this.laneCount;return this.left+s/2+Math.min(t,this.laneCount-1)*s}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let s=1;s<=this.laneCount-1;s++){const e=E(this.left,this.right,s/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(e,this.top),t.lineTo(e,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(s=>{t.beginPath(),t.moveTo(s[0].x,s[0].y),t.lineTo(s[1].x,s[1].y),t.stroke()})}}class yt{constructor(){this.speed=0,this.y=300}update(){this.speed+=y.DEATH_SPEED,this.y-=this.speed}draw(t){t.beginPath(),t.lineWidth=4,t.strokeStyle="red",t.moveTo(0,this.y),t.lineTo(t.canvas.width,this.y),t.stroke()}}const wt={cars:[],sortedCars:[],livingCars:[],traffic:[],player:new I,sortedModels:[]},k=16,G=0;function bt(i,t){t.fillStyle="black",t.font="bold 14px serif",t.fillText(`${i.livingCars.length}/${i.sortedCars.length} cars`,G,k*3),[...i.sortedModels.map(e=>e[0]).filter(Boolean),...i.sortedCars.filter((e,r)=>r<y.SCORES_NB||e===i.player)].sort((e,r)=>{const o=e instanceof I?e.brain.score:e.score;return(r instanceof I?r.brain.score:r.score)-o}).forEach((e,r)=>{if(e instanceof I){const o=e.damaged?"\u{1F480}":"\u2764\uFE0F";t.fillStyle=e.damaged?"#def":e.color,t.fillText(`${o} ${e.label} ${Math.round(e.brain.score)}`,G,k*5+r*k)}else t.fillStyle="white",t.fillText(`\u{1F47B} ${e.levels.length}-${e.version}-${e.mutationIndex} ${Math.round(e.score)}`,G,k*5+r*k)})}const P=lt("highway");y.CLEAR_STORAGE&&P.discardModels();const Ct=async i=>{const t=V(),s=V(),e=t.getContext("2d"),r=s.getContext("2d");t.width=200;const o=Math.round(t.width/75),l=new mt(t.width/2,t.width*.9,o),n=new nt;let h;function d(){var c;const g=[];for(let m=1;m<=y.MAX_NETWORK_LAYERS;m++){let a=(c=i.sortedModels[m]&&i.sortedModels[m][0])!=null?c:void 0;for(let w=1;w<=y.CAR_PER_LEVELS;w++){const A=new I(l.getLane(1),100,C.AI,3,`#${w}`,Q(m/y.MAX_NETWORK_LAYERS),m);a&&A.brain&&(A.brain.mutationIndex=w,A.brain.mutate(a),A.label=A.brain.id),g.push(A)}}return g}try{f()}catch(g){throw P.discardModels(),g}n.play((g,c)=>{h.update();for(let a=0;a<i.traffic.length;a++)i.traffic[a].update(l.borders,[]);for(let a=0;a<i.cars.length;a++)i.cars[a].update(l.borders,i.traffic),i.cars[a].y>h.y&&(i.cars[a].damaged=!0);i.sortedCars=i.cars.sort((a,w)=>w.brain.score-a.brain.score),i.livingCars=i.cars.filter(a=>!a.damaged),t.height=window.innerHeight,s.height=window.innerHeight,s.width=window.innerWidth-t.width,e.save(),i.player.brain.score>0&&!i.player.damaged?e.translate(0,-i.player.y+t.height*.7):e.translate(0,-i.sortedCars[0].y+t.height*.7),l.draw(e),h.draw(e);for(let a=0;a<i.traffic.length;a++)i.traffic[a].draw(e);for(let a=0;a<i.sortedCars.length;a++){const w=a===0||!i.cars[a].useAI;e.globalAlpha=w?1:.2,i.cars[a].draw(e,a===0,a)}e.restore(),bt(i,e),r.lineDashOffset=-c/50,O.drawNetwork(r,i.sortedCars[0].brain),O.drawStats(r,i.sortedCars[0].brain);const[m]=i.livingCars;m||p()});function f(){Object.assign(i,wt),i.sortedModels=P.loadAllModelLayers(y.MAX_NETWORK_LAYERS),h=new yt,i.traffic=y.trafficConfig.map(([g,c,m,a],w)=>new I(l.getLane(g),c,C.DUMMY,m,a||w+"")),i.cars=d(),i.player=new I(l.getLane(1),0,C.KEYS,3.5,"You"),i.cars.push(i.player)}function p(){const g=i.sortedCars.filter(c=>c.useAI);P.saveBestModels(g.map(c=>c.brain),y.SCORES_NB),f()}};export{Ct as default};
