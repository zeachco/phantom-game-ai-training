var ot=(i,t,s)=>{if(!t.has(i))throw TypeError("Cannot "+s)};var A=(i,t,s)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,s)};var M=(i,t,s)=>(ot(i,t,"access private method"),s);import{l as C,r as D,g as q,p as J}from"./three.module.e2623146.js";import{c as V}from"./dom.be162d4e.js";import{GameLoop as nt}from"./GameLoop.08ec9c71.js";function at(i,t,s=[]){if(!i||!t)return!1;const e=(r,o)=>s.includes(r)?void 0:o;return JSON.stringify(i,e)===JSON.stringify(t,e)}function lt(i=""){const t=n=>`${i}_${n}`;return{saveBestModels:r,loadAllModelLayers:o,discardModels:l};function s(n,h,d=t(n)){var u;const f=e(n),y=["id","version","mutationIndex","mutationFactor","score"],c=`${h.length}x ${n}-${(u=h[0])==null?void 0:u.version}`,g=Math.round(f[0]?h[0].score-f[0].score:h[0].score);if(g<0){console.info(`\u{1F63F} ${c} performed ${g} points under previous version`);const a=f.map(b=>({...b,diff:g,date:new Date})),p=JSON.stringify(a);localStorage.setItem(d,p)}else if(at(h,f,y))console.info(`\u{1F62C} ${c} is identical to previous version`);else{const a=h.map(b=>({...b,diff:g,date:new Date})),p=JSON.stringify(a);console.info(`\u{1F44D} ${c} increment by ${g} points`),localStorage.setItem(d,p)}}function e(n,h=t(n)){let d=[];try{const f=localStorage.getItem(h);if(!f)throw new Error("not found");d=JSON.parse(f),console.debug(`Retreived ${d.length} gen-${d[0].version} for layer ${n}`)}catch{console.debug(`Nothing for layer ${n}`)}return d}function r(n,h=1){const d=new Array;n.forEach(f=>{const y=f.levels.length,c=d[y]||[];c.length>=h||(d[y]=[...c,f].sort((g,u)=>u.score-g.score))}),console.info(`\u{1F4BE} Saving best ${h} models...`),d.forEach((f,y)=>s(y,f))}function o(n=1){const h=new Array;try{for(let d=1;d<=n;d++){const f=e(d);f&&(h[d]=f)}}catch(d){console.error(d)}return h}function l(){localStorage.clear()}}class dt{constructor(){this.CAR_NB=1500,this.MAX_NETWORK_LAYERS=5,this.MUTATION_LVL=.25,this.SCORES_NB=this.MAX_NETWORK_LAYERS*2,this.SENSORS=9,this.SENSOR_ANGLE=Math.PI/2*2.2,this.DEATH_SPEED=.002,this.CAR_ACCELERATION=.03,this.CAR_FRICTION=.005,this.CAR_MAX_SPEED=5,this.CLEAR_STORAGE=!1,this.trafficConfig=[[0,-300,.2,"A"],[1,-500,.4,"B"],[2,-300,.6,"C"],[0,-400,2,"LA"],[0,-600,2.2,"LB"],[2,-300,2,"RA"],[1,-600,2,"MA"],[2,-700,2.1,"RC"],[0,-900,2.2],[1,-900,2.3],[2,-900,2.1],[2,-950,2.4,"SP"],[1,-1400,2.5,"M0"],[0,-1550,2.3,"EL"],[2,-1550,2.4,"ER"],[0,-1950,2.2,"E2L"],[2,-1950,2.2,"E2R"]]}get CAR_PER_LEVELS(){return this.CAR_NB/this.MAX_NETWORK_LAYERS}}const w=new dt;function ft(i,t,s,e,r,o=5,l=!1,n=!0){const h={tl:o,tr:o,br:o,bl:o};typeof o!="number"&&Object.assign(h,{tl:0,tr:0,br:0,bl:0},o),i.beginPath(),i.moveTo(t+h.tl,s),i.lineTo(t+e-h.tr,s),i.quadraticCurveTo(t+e,s,t+e,s+h.tr),i.lineTo(t+e,s+r-h.br),i.quadraticCurveTo(t+e,s+r,t+e-h.br,s+r),i.lineTo(t+h.bl,s+r),i.quadraticCurveTo(t,s+r,t,s+r-h.bl),i.lineTo(t,s+h.tl),i.quadraticCurveTo(t,s,t+h.tl,s),i.closePath(),l&&i.fill(),n&&i.stroke()}function N(i){const t=Math.abs(i),s=i>0?0:255,e=i>0?0:255,r=i<0?0:255;return`rgba(${s}, ${e}, ${r}, ${t})`}function gt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}function Q(i,t=1,s=.5,e=1){return`hsla(${Math.round(i*360)}, ${t*100}%, ${s*100}%, ${e})`}const v=12,_=Math.max(v,10);var L,k;const R=class{static drawStats(t,s){const n=Q(s.levels.length/w.MAX_NETWORK_LAYERS);t.save(),t.translate(t.canvas.width*.5+_,t.canvas.height*.5-18*2),t.font=18+"px Arial",t.strokeStyle=n,t.fillStyle="rgba(32, 32, 32, .76)",ft(t,150*-.5,0,150,18*3+8*2,8,!0),t.fillStyle=n,t.textBaseline="hanging",t.textAlign="center",t.translate(0,8),t.fillText(`Network ${s.id}`,0,0,142),t.translate(0,18),t.fillText(`Mutation ${Math.round(s.mutationFactor*100)}%`,0,0,142),t.translate(0,18),t.fillText(`Score ${Math.round(s.score)}`,0,0,142),t.restore()}static drawNetwork(t,s){const e=_,r=_,o=t.canvas.width-_*2,l=t.canvas.height-_*2,n=l/s.levels.length;for(let h=s.levels.length-1;h>=0;h--){const d=r+C(l-n,0,s.levels.length==1?.5:h/(s.levels.length-1));t.setLineDash([7,3]),R.drawLevel(t,s.levels[h],e,d,o,n,h==s.levels.length-1?["F","L","R","B"]:[])}}static drawLevel(t,s,e,r,o,l,n){var u,a,p,b;const h=e+o,d=r+l,{inputs:f,outputs:y,weights:c,biases:g}=s;for(let m=0;m<f.length;m++)for(let S=0;S<y.length;S++)t.beginPath(),t.moveTo(M(u=R,L,k).call(u,f,m,e,h),d),t.lineTo(M(a=R,L,k).call(a,y,S,e,h),r),t.lineWidth=2,t.strokeStyle=N(c[m][S]),t.stroke();for(let m=0;m<f.length;m++){const S=M(p=R,L,k).call(p,f,m,e,h);t.beginPath(),t.arc(S,d,v,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(S,d,v*.8,0,Math.PI*2),t.fillStyle=N(f[m]),t.fill()}for(let m=0;m<y.length;m++){const S=M(b=R,L,k).call(b,y,m,e,h);t.beginPath(),t.arc(S,r,v,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(S,r,v*.6,0,Math.PI*2),t.fillStyle=N(y[m]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(S,r,v*.8,0,Math.PI*2),t.strokeStyle=N(g[m]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),n[m]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=v*1.5+"px Arial",t.fillText(n[m],S,r+v*.1),t.lineWidth=.5,t.strokeText(n[m],S,r+v*.1))}}};let O=R;L=new WeakSet,k=function(t,s,e,r){return C(e,r,t.length==1?.5:s/(t.length-1))},A(O,L);var E=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(E||{}),F,Z;class ct{constructor(t){A(this,F);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case E.KEYS:M(this,F,Z).call(this);break;case E.DUMMY:this.forward=!0;break}}}F=new WeakSet,Z=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class z{constructor(t,s,e=Math.ceil(t/4)){if(this.version=0,this.score=0,this.mutationFactor=.5,this.mutationIndex=.5,t<s)throw new Error("requires more inputs than outputs");this.levels=[];for(let r=0;r<e;r++){const o=Math.floor(C(t,s,r/e)),l=Math.floor(C(t,s,(r+1)/e));this.levels.push(new $(o,l))}}static feedForward(t,s){let e=$.feedForward(t,s.levels[0]);for(let r=1;r<s.levels.length;r++)e=$.feedForward(e,s.levels[r]);return e}get id(){return[this.levels.length,this.version,this.mutationIndex].join("-")}mutate(t){if(this.version=t.version+1,this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}for(let s=0;s<this.levels.length;s++){for(let e=0;e<this.levels[s].biases.length;e++)this.levels[s].biases[e]=C(t.levels[s].biases[e],D(),this.mutationFactor);for(let e=0;e<this.levels[s].weights.length;e++)for(let r=0;r<this.levels[s].weights[e].length;r++)this.levels[s].weights[e][r]=C(t.levels[s].weights[e][r],D(),this.mutationFactor)}}}var W,x;const H=class{constructor(t=1,s=1){var e;this.inputs=new Array(t),this.outputs=new Array(s),this.biases=new Array(s),this.weights=[];for(let r=0;r<t;r++)this.weights[r]=new Array(s);M(e=H,W,x).call(e,this)}static feedForward(t,s){for(let e=0;e<s.inputs.length;e++)s.inputs[e]=t[e];for(let e=0;e<s.outputs.length;e++){let r=0;for(let o=0;o<s.inputs.length;o++)r+=s.inputs[o]*s.weights[o][e];r>s.biases[e]?s.outputs[e]=1:s.outputs[e]=0}return s.outputs}};let $=H;W=new WeakSet,x=function(t){for(let s=0;s<t.inputs.length;s++)for(let e=0;e<t.outputs.length;e++)t.weights[s][e]=D();for(let s=0;s<t.biases.length;s++)t.biases[s]=D()},A($,W);var Y,tt,B,st;class ut{constructor(t){A(this,Y);A(this,B);this.car=t,this.rayCount=w.SENSORS,this.rayLength=200,this.raySpread=w.SENSOR_ANGLE,this.rays=[],this.readings=[]}update(t,s){M(this,B,st).call(this),this.readings=[];for(let e=0;e<this.rays.length;e++)this.readings.push(M(this,Y,tt).call(this,this.rays[e],t,s))}draw(t){for(let s=0;s<this.rays.length;s++){let e=this.rays[s][1];this.readings[s]&&(e=this.readings[s]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[s][0].x,this.rays[s][0].y),t.lineTo(e.x,e.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[s][1].x,this.rays[s][1].y),t.lineTo(e.x,e.y),t.stroke()}}}Y=new WeakSet,tt=function(t,s,e){let r=[];for(let o=0;o<s.length;o++){const l=q(t[0],t[1],s[o][0],s[o][1]);l&&r.push(l)}for(let o=0;o<e.length;o++){const l=e[o].polygon;for(let n=0;n<l.length;n++){const h=q(t[0],t[1],l[n],l[(n+1)%l.length]);h&&r.push(h)}}if(r.length==0)return null;{const o=r.map(n=>n.offset),l=Math.min(...o);return r.find(n=>n.offset==l)}},B=new WeakSet,st=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const s=C(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,e={x:this.car.x,y:this.car.y},r={x:this.car.x-Math.sin(s)*this.rayLength,y:this.car.y-Math.cos(s)*this.rayLength};this.rays.push([e,r])}};const pt="/phantom-game-ai-training/assets/car.3e3d3a26.png";var K,et,U,it,j,rt,X,ht;class I{constructor(t=0,s=0,e=E.DUMMY,r=w.CAR_MAX_SPEED,o="",l=gt(),n=1){A(this,K);A(this,U);A(this,j);A(this,X);this.x=t,this.y=s,this.maxSpeed=r,this.label=o,this.color=l,this.brainLayers=n,this.polygon=[],this.width=30,this.height=50,this.va=0,this.x=t,this.y=s,this.speed=0,this.acceleration=w.CAR_ACCELERATION,this.maxSpeed=r,this.friction=w.CAR_FRICTION,this.angle=0,this.damaged=!1,this.useAI=e==E.AI,this.controls=new ct(e),e!==E.DUMMY&&(this.sensor=new ut(this),this.brain=new z(this.sensor.rayCount+1,Object.keys(this.controls).length,n)),this.img=new Image,this.img.src=pt,this.mask=document.createElement("canvas"),this.mask.width=this.width,this.mask.height=this.height;const h=this.mask.getContext("2d");this.img.onload=()=>{h.fillStyle=l,h.rect(0,0,this.width,this.height),h.fill(),h.globalCompositeOperation="destination-atop",h.drawImage(this.img,0,0,this.width,this.height)}}update(t,s){if(!this.damaged&&(M(this,X,ht).call(this),this.brain&&M(this,K,et).call(this),this.polygon=M(this,j,rt).call(this),this.damaged=M(this,U,it).call(this,t,s),this.sensor)){this.sensor.update(t,s);const e=this.sensor.readings.map(o=>o==null?0:1-o.offset);e.push(this.speed/this.maxSpeed);const r=z.feedForward(e,this.brain);this.useAI&&(this.controls.forward=r[0],this.controls.left=r[1],this.controls.right=r[2],this.controls.reverse=r[3])}}draw(t,s=!1,e=0){this.sensor&&s&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.textAlign="center",t.font="bold 11px serif",t.textBaseline="middle",t.fillStyle="rgba(0,0,0, 1)",t.fillText(`${this.label}`,0,this.height-22),t.restore()}}K=new WeakSet,et=function(){this.brain.score+=Math.cos(this.angle)*this.speed,this.brain.score+=this.speed/2;const{forward:t,left:s,right:e}=this.controls;(s||e)&&(this.brain.score-=.01),t||(this.brain.score-=.1)},U=new WeakSet,it=function(t,s){for(let e=0;e<t.length;e++)if(J(this.polygon,t[e]))return!0;for(let e=0;e<s.length;e++)if(J(this.polygon,s[e].polygon))return!0;return!1},j=new WeakSet,rt=function(){const t=[],s=Math.hypot(this.width,this.height)/2,e=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-e)*s,y:this.y-Math.cos(this.angle-e)*s}),t.push({x:this.x-Math.sin(this.angle+e)*s,y:this.y-Math.cos(this.angle+e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle-e)*s,y:this.y-Math.cos(Math.PI+this.angle-e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle+e)*s,y:this.y-Math.cos(Math.PI+this.angle+e)*s}),t},X=new WeakSet,ht=function(){this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.controls.left&&(this.va+=this.speed/300),this.controls.right&&(this.va-=this.speed/300),this.va*=.6,this.angle+=this.va,this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class mt{constructor(t,s,e=3){this.x=t,this.width=s,this.laneCount=e,this.borders=[],this.x=t,this.width=s,this.laneCount=e,this.left=t-s/2,this.right=t+s/2;const r=1e6;this.top=-r,this.bottom=r;const o={x:this.left,y:this.top},l={x:this.right,y:this.top},n={x:this.left,y:this.bottom},h={x:this.right,y:this.bottom};this.borders=[[o,n],[l,h]]}getLane(t){const s=this.width/this.laneCount;return this.left+s/2+Math.min(t,this.laneCount-1)*s}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let s=1;s<=this.laneCount-1;s++){const e=C(this.left,this.right,s/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(e,this.top),t.lineTo(e,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(s=>{t.beginPath(),t.moveTo(s[0].x,s[0].y),t.lineTo(s[1].x,s[1].y),t.stroke()})}}class wt{constructor(){this.speed=0,this.y=300}update(){this.speed+=w.DEATH_SPEED,this.y-=this.speed}draw(t){t.beginPath(),t.lineWidth=4,t.strokeStyle="red",t.moveTo(0,this.y),t.lineTo(t.canvas.width,this.y),t.stroke()}}const yt={cars:[],sortedCars:[],livingCars:[],traffic:[],player:new I,sortedModels:[]},T=12,G=0;function bt(i,t){t.fillStyle="black",t.font=`bold ${T}px serif`,t.fillText(`${i.livingCars.length}/${i.sortedCars.length} cars`,G,T*3),[...i.sortedModels.map(e=>e[0]).filter(Boolean),...i.sortedCars.filter((e,r)=>r<w.SCORES_NB||e===i.player)].sort((e,r)=>{const o=e instanceof I?e.brain.score:e.score;return(r instanceof I?r.brain.score:r.score)-o}).forEach((e,r)=>{if(e instanceof I){const o=e.damaged?"\u{1F480}":"\u2764\uFE0F";t.fillStyle=e.damaged?"#def":e.color,t.fillText(`${o} ${e.label} ${Math.round(e.brain.score)}`,G,T*5+r*T)}else{t.fillStyle="white";let o="";e.diff>0&&(o=` +${e.diff}`),e.diff<0&&(o=` ${e.diff}`),t.fillText(`\u{1F47B} ${e.levels.length}-${e.version}-${e.mutationIndex} ${Math.round(e.score)} ${o}`,G,T*5+r*T)}})}const P=lt("highway");w.CLEAR_STORAGE&&P.discardModels();const Et=async i=>{const t=V(),s=V(),e=t.getContext("2d"),r=s.getContext("2d");t.width=200;const o=Math.round(t.width/75),l=new mt(t.width/2,t.width*.9,o),n=new nt;let h;function d(){var g;const c=[];for(let u=1;u<=w.MAX_NETWORK_LAYERS;u++){let a=(g=i.sortedModels[u]&&i.sortedModels[u][0])!=null?g:void 0;for(let p=0;p<=w.CAR_PER_LEVELS;p++){const b=new I(l.getLane(1),100,E.AI,3,`#${p}`,Q(u/w.MAX_NETWORK_LAYERS),u);a&&b.brain&&(b.brain.mutationIndex=p,b.brain.mutationFactor=p/w.CAR_PER_LEVELS*w.MUTATION_LVL,b.brain.mutate(a),b.label=b.brain.id),c.push(b)}}return c}try{f()}catch(c){throw P.discardModels(),c}n.play((c,g)=>{h.update();for(let a=0;a<i.traffic.length;a++)i.traffic[a].update(l.borders,[]);for(let a=0;a<i.cars.length;a++)i.cars[a].update(l.borders,i.traffic),i.cars[a].y>h.y&&(i.cars[a].damaged=!0);i.sortedCars=i.cars.sort((a,p)=>p.brain.score-a.brain.score),i.livingCars=i.cars.filter(a=>!a.damaged),t.height=window.innerHeight,s.height=window.innerHeight,s.width=window.innerWidth-t.width,e.save(),i.player.brain.score>0&&!i.player.damaged?e.translate(0,-i.player.y+t.height*.7):e.translate(0,-i.sortedCars[0].y+t.height*.7),l.draw(e),h.draw(e);for(let a=0;a<i.traffic.length;a++)i.traffic[a].draw(e);for(let a=0;a<i.sortedCars.length;a++){const p=a===0||!i.cars[a].useAI;e.globalAlpha=p?1:.2,i.cars[a].draw(e,a===0,a)}e.restore(),bt(i,e),r.lineDashOffset=-g/50,O.drawNetwork(r,i.sortedCars[0].brain),O.drawStats(r,i.sortedCars[0].brain);const[u]=i.livingCars;u||y()});function f(){Object.assign(i,yt),i.sortedModels=P.loadAllModelLayers(w.MAX_NETWORK_LAYERS),h=new wt,i.traffic=w.trafficConfig.map(([c,g,u,a],p)=>new I(l.getLane(c),g,E.DUMMY,u,a||p+"")),i.cars=d(),i.player=new I(l.getLane(1),200,E.KEYS,3.5,"You"),i.cars.push(i.player)}function y(){const c=i.sortedCars.filter(g=>g.useAI);P.saveBestModels(c.map(g=>g.brain),w.SCORES_NB),f()}};export{Et as default};