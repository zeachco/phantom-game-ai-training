var it=(i,t,s)=>{if(!t.has(i))throw TypeError("Cannot "+s)};var m=(i,t,s)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,s)};var p=(i,t,s)=>(it(i,t,"access private method"),s);import{l as S,r as D,g as H,p as J}from"./three.module.e2623146.js";import{c as _}from"./dom.be162d4e.js";import{GameLoop as ht}from"./GameLoop.08ec9c71.js";function rt(i=""){return{loadModel:()=>X(i),saveModel:t=>ot(t,i),discardModel:()=>at(i)}}function X(i){try{const t=localStorage.getItem(`${i}_model`),s=JSON.parse(t);return s?(console.log(`loaded generation #${s.generation}`),s):void 0}catch(t){return console.log(t),null}}function nt(i,t){if(!i||!t)return!1;const s=(e,h)=>e==="generation"?0:h;return JSON.stringify(i,s)===JSON.stringify(t,s)}function ot(i,t){const s=`${t}_model`,e=X(t);if(nt(i,e))console.error("model is identical");else{const h=JSON.stringify(i);console.log(`saving ${s} (generation #${i.generation})`),localStorage.setItem(s,h)}}function at(i){localStorage.removeItem(`${i}_model`)}function P(i){const t=Math.abs(i),s=i>0?0:255,e=i>0?0:255,h=i<0?0:255;return`rgba(${s}, ${e}, ${h}, ${t})`}function lt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}const M=12,L=Math.max(M,10);var A,k;const v=class{static drawNetwork(t,s){const e=L,h=L,r=t.canvas.width-L*2,o=t.canvas.height-L*2,a=o/s.levels.length;for(let l=s.levels.length-1;l>=0;l--){const c=h+S(o-a,0,s.levels.length==1?.5:l/(s.levels.length-1));t.setLineDash([7,3]),v.drawLevel(t,s.levels[l],e,c,r,a,l==s.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,s,e,h,r,o,a){var n,d,G,B;const l=e+r,c=h+o,{inputs:y,outputs:f,weights:w,biases:C}=s;for(let g=0;g<y.length;g++)for(let u=0;u<f.length;u++)t.beginPath(),t.moveTo(p(n=v,A,k).call(n,y,g,e,l),c),t.lineTo(p(d=v,A,k).call(d,f,u,e,l),h),t.lineWidth=2,t.strokeStyle=P(w[g][u]),t.stroke();for(let g=0;g<y.length;g++){const u=p(G=v,A,k).call(G,y,g,e,l);t.beginPath(),t.arc(u,c,M,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(u,c,M*.8,0,Math.PI*2),t.fillStyle=P(y[g]),t.fill()}for(let g=0;g<f.length;g++){const u=p(B=v,A,k).call(B,f,g,e,l);t.beginPath(),t.arc(u,h,M,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(u,h,M*.6,0,Math.PI*2),t.fillStyle=P(f[g]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(u,h,M*.8,0,Math.PI*2),t.strokeStyle=P(C[g]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),a[g]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=M*1.5+"px Arial",t.fillText(a[g],u,h+M*.1),t.lineWidth=.5,t.strokeText(a[g],u,h+M*.1))}}};let R=v;A=new WeakSet,k=function(t,s,e,h){return S(e,h,t.length==1?.5:s/(t.length-1))},m(R,A);var b=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(b||{}),T,z;class gt{constructor(t){m(this,T);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case b.KEYS:p(this,T,z).call(this);break;case b.DUMMY:this.forward=!0;break}}}T=new WeakSet,z=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class q{constructor(t,s,e=Math.ceil(t/4)){if(this.generation=0,t<s)throw new Error("requires more inputs than outputs");this.levels=[];for(let h=0;h<e;h++){const r=Math.floor(S(t,s,h/e)),o=Math.floor(S(t,s,(h+1)/e));this.levels.push(new I(r,o))}}static feedForward(t,s){let e=I.feedForward(t,s.levels[0]);for(let h=1;h<s.levels.length;h++)e=I.feedForward(e,s.levels[h]);return e}mutate(t,s=.01){if(this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}this.generation=t.generation+1;for(let e=0;e<this.levels.length;e++){for(let h=0;h<this.levels[e].biases.length;h++)this.levels[e].biases[h]=S(t.levels[e].biases[h],D(),s);for(let h=0;h<this.levels[e].weights.length;h++)for(let r=0;r<this.levels[e].weights[h].length;r++)this.levels[e].weights[h][r]=S(t.levels[e].weights[h][r],D(),s)}}}var E,Q;const K=class{constructor(t=1,s=1){var e;this.inputs=new Array(t),this.outputs=new Array(s),this.biases=new Array(s),this.weights=[];for(let h=0;h<t;h++)this.weights[h]=new Array(s);p(e=K,E,Q).call(e,this)}static feedForward(t,s){for(let e=0;e<s.inputs.length;e++)s.inputs[e]=t[e];for(let e=0;e<s.outputs.length;e++){let h=0;for(let r=0;r<s.inputs.length;r++)h+=s.inputs[r]*s.weights[r][e];h>s.biases[e]?s.outputs[e]=1:s.outputs[e]=0}return s.outputs}};let I=K;E=new WeakSet,Q=function(t){for(let s=0;s<t.inputs.length;s++)for(let e=0;e<t.outputs.length;e++)t.weights[s][e]=D();for(let s=0;s<t.biases.length;s++)t.biases[s]=D()},m(I,E);class ft{constructor(){this.CAR_NB=200,this.MUTATION_LVL=.62,this.NETWORK_LAYERS=5,this.SENSORS=12}}const O=new ft;var Y,V,N,Z;class dt{constructor(t){m(this,Y);m(this,N);this.car=t,this.rayCount=O.SENSORS,this.rayLength=250,this.raySpread=Math.PI/2*3.6,this.rays=[],this.readings=[]}update(t,s){p(this,N,Z).call(this),this.readings=[];for(let e=0;e<this.rays.length;e++)this.readings.push(p(this,Y,V).call(this,this.rays[e],t,s))}draw(t){for(let s=0;s<this.rays.length;s++){let e=this.rays[s][1];this.readings[s]&&(e=this.readings[s]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[s][0].x,this.rays[s][0].y),t.lineTo(e.x,e.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[s][1].x,this.rays[s][1].y),t.lineTo(e.x,e.y),t.stroke()}}}Y=new WeakSet,V=function(t,s,e){let h=[];for(let r=0;r<s.length;r++){const o=H(t[0],t[1],s[r][0],s[r][1]);o&&h.push(o)}for(let r=0;r<e.length;r++){const o=e[r].polygon;for(let a=0;a<o.length;a++){const l=H(t[0],t[1],o[a],o[(a+1)%o.length]);l&&h.push(l)}}if(h.length==0)return null;{const r=h.map(a=>a.offset),o=Math.min(...r);return h.find(a=>a.offset==o)}},N=new WeakSet,Z=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const s=S(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,e={x:this.car.x,y:this.car.y},h={x:this.car.x-Math.sin(s)*this.rayLength,y:this.car.y-Math.cos(s)*this.rayLength};this.rays.push([e,h])}};const ct="/phantom-game-ai-training/assets/car.3e3d3a26.png";let ut=0;var U,x,W,tt,j,st,F,et;class ${constructor(t=0,s=0,e=50,h=50,r=b.DUMMY,o=2.8,a=`${ut++}`,l=lt()){m(this,U);m(this,W);m(this,j);m(this,F);this.x=t,this.y=s,this.width=e,this.height=h,this.maxSpeed=o,this.label=a,this.polygon=[],this.distance=0,this.score=0,this.x=t,this.y=s,this.width=e,this.height=h,this.speed=0,this.acceleration=.3,this.maxSpeed=o,this.friction=.05,this.angle=0,this.damaged=!1,this.useAI=r==b.AI,this.controls=new gt(r),r!=b.DUMMY&&(this.sensor=new dt(this),this.neural=new q(this.sensor.rayCount,Object.keys(this.controls).length,O.NETWORK_LAYERS)),this.img=new Image,this.img.src=ct,this.mask=document.createElement("canvas"),this.mask.width=e,this.mask.height=h;const c=this.mask.getContext("2d");this.img.onload=()=>{c.fillStyle=l,c.rect(0,0,this.width,this.height),c.fill(),c.globalCompositeOperation="destination-atop",c.drawImage(this.img,0,0,this.width,this.height)}}update(t,s){if(!this.damaged&&(p(this,F,et).call(this),p(this,U,x).call(this),this.polygon=p(this,j,st).call(this),this.damaged=p(this,W,tt).call(this,t,s),this.sensor)){this.sensor.update(t,s);const e=this.sensor.readings.map(r=>r==null?0:1-r.offset),h=q.feedForward(e,this.neural);this.useAI&&(this.controls.forward=h[0],this.controls.left=h[1],this.controls.right=h[2],this.controls.reverse=h[3])}}draw(t,s=!1,e=0){this.sensor&&s&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.textAlign="center",t.font="bold 11px serif",t.textBaseline="middle",t.fillStyle="rgba(0,0,0, 1)",t.fillText(`${this.label}`,0,this.height*-.5+10),t.restore()}}U=new WeakSet,x=function(){this.score+=Math.cos(this.angle)*this.speed,this.score+=this.speed,this.score+=this.controls.left&&this.controls.right?-1:0,this.score+=this.controls.reverse?-1:0},W=new WeakSet,tt=function(t,s){for(let e=0;e<t.length;e++)if(J(this.polygon,t[e]))return!0;for(let e=0;e<s.length;e++)if(J(this.polygon,s[e].polygon))return!0;return!1},j=new WeakSet,st=function(){const t=[],s=Math.hypot(this.width,this.height)/2,e=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-e)*s,y:this.y-Math.cos(this.angle-e)*s}),t.push({x:this.x-Math.sin(this.angle+e)*s,y:this.y-Math.cos(this.angle+e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle-e)*s,y:this.y-Math.cos(Math.PI+this.angle-e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle+e)*s,y:this.y-Math.cos(Math.PI+this.angle+e)*s}),t},F=new WeakSet,et=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.distance+=this.speed,this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class pt{constructor(t,s,e=3){this.x=t,this.width=s,this.laneCount=e,this.borders=[],this.x=t,this.width=s,this.laneCount=e,this.left=t-s/2,this.right=t+s/2;const h=1e6;this.top=-h,this.bottom=h;const r={x:this.left,y:this.top},o={x:this.right,y:this.top},a={x:this.left,y:this.bottom},l={x:this.right,y:this.bottom};this.borders=[[r,a],[o,l]]}getLane(t){const s=this.width/this.laneCount;return this.left+s/2+Math.min(t,this.laneCount-1)*s}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let s=1;s<=this.laneCount-1;s++){const e=S(this.left,this.right,s/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(e,this.top),t.lineTo(e,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(s=>{t.beginPath(),t.moveTo(s[0].x,s[0].y),t.lineTo(s[1].x,s[1].y),t.stroke()})}}const yt={cars:[],sortedCars:[],traffic:[],player:new $,...rt("highway")},wt=[[0,-300,.1,"A"],[1,-600,.2,"B"],[2,-300,.3,"C"],[0,-400,2],[0,-600,2.2],[1,-900,2.4,"S"],[2,-300,2],[1,-500,2],[1,-900,2],[2,-700,2],[2,-900,2.1],[1,-900,2.3],[0,-900,2.2],[0,400,2.6],[1,375,2.6],[2,400,2.6]],vt=async i=>{const t=_();t.style.cssText="max-width: 50%";const s=_();s.style.cssText="max-width: 50%";const e=t.getContext("2d"),h=s.getContext("2d");t.width=200,s.width=400;const r=Math.round(t.width/75),o=new pt(t.width/2,t.width*.9,r),a=new ht;function l(){Object.assign(i,yt),i.cars=c(O.CAR_NB),i.traffic=[];const y=i.loadModel();if(i.player=new $(o.getLane(1),0,30,50,b.KEYS,3.5,"You"),i.cars.push(i.player),y){console.log("Branch of generation "+y.generation);for(let f=0;f<i.cars.length;f++)i.cars[f].neural.mutate(y,f/i.cars.length*O.MUTATION_LVL)}else console.log("Fresh model start");i.traffic.push(...wt.map(([f,w,C,n],d)=>new $(o.getLane(f),w,30,50,b.DUMMY,C,n||d+"")))}function c(y=1){const f=[];for(let w=0;w<=y;w++)f.push(new $(o.getLane(1),100,30,50,b.AI,3,`${w}`));return f}l(),a.play((y,f)=>{for(let n=0;n<i.traffic.length;n++)i.traffic[n].update(o.borders,[]);for(let n=0;n<i.cars.length;n++)i.cars[n].update(o.borders,i.traffic);i.sortedCars=i.cars.sort((n,d)=>d.score-n.score),t.height=window.innerHeight,s.height=window.innerHeight,e.save(),i.player.score>0&&!i.player.damaged?e.translate(0,-i.player.y+t.height*.7):e.translate(0,-i.sortedCars[0].y+t.height*.7),o.draw(e);for(let n=0;n<i.traffic.length;n++)i.traffic[n].draw(e);for(let n=0;n<i.sortedCars.length;n++){const d=n===0||!i.cars[n].useAI;e.globalAlpha=d?1:.2,i.cars[n].draw(e,n===0,n)}e.restore(),h.lineDashOffset=-f/50,R.drawNetwork(h,i.sortedCars[0].neural);const w=16;if(i.sortedCars.filter((n,d)=>d<5||n===i.player).forEach((n,d)=>{e.fillStyle=n.damaged?"darkgray":"blue",e.fillText(`${n.label} ${Math.round(n.score)} `,0,w+d*w)}),i.sortedCars.filter(n=>!n.damaged).length<1){const[n]=i.sortedCars.filter(d=>d.useAI);i.saveModel(n.neural),l()}})};export{vt as default};
