var it=(i,t,s)=>{if(!t.has(i))throw TypeError("Cannot "+s)};var w=(i,t,s)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,s)};var p=(i,t,s)=>(it(i,t,"access private method"),s);import{l as S,r as O,g as _,p as H}from"./three.module.e2623146.js";import{c as J}from"./dom.be162d4e.js";import{GameLoop as ht}from"./GameLoop.08ec9c71.js";function rt(i=""){return{loadModel:()=>X(i),saveModel:t=>nt(t,i),discardModel:()=>at(i)}}function X(i){try{const t=localStorage.getItem(`${i}_model`);return JSON.parse(t)}catch(t){console.log(t);return}}function ot(i,t){if(!i||!t)return!1;const s=(e,h)=>e==="generation"?0:h;return JSON.stringify(i,s)===JSON.stringify(t,s)}function nt(i,t){const s=`${t}_model`,e=X(t);if(ot(i,e))console.error("model is identical");else{const h=JSON.stringify(i);console.log(`saving ${s} (generation #${i.generation})`),localStorage.setItem(s,h)}}function at(i){localStorage.removeItem(`${i}_model`)}function P(i){const t=Math.abs(i),s=i>0?0:255,e=i>0?0:255,h=i<0?0:255;return`rgba(${s}, ${e}, ${h}, ${t})`}function lt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}const M=12,T=Math.max(M,10);var A,R;const v=class{static drawNetwork(t,s){const e=T,h=T,r=t.canvas.width-T*2,n=t.canvas.height-T*2,a=n/s.levels.length;for(let l=s.levels.length-1;l>=0;l--){const c=h+S(n-a,0,s.levels.length==1?.5:l/(s.levels.length-1));t.setLineDash([7,3]),v.drawLevel(t,s.levels[l],e,c,r,a,l==s.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,s,e,h,r,n,a){var C,o,m,B;const l=e+r,c=h+n,{inputs:f,outputs:d,weights:y,biases:L}=s;for(let g=0;g<f.length;g++)for(let u=0;u<d.length;u++)t.beginPath(),t.moveTo(p(C=v,A,R).call(C,f,g,e,l),c),t.lineTo(p(o=v,A,R).call(o,d,u,e,l),h),t.lineWidth=2,t.strokeStyle=P(y[g][u]),t.stroke();for(let g=0;g<f.length;g++){const u=p(m=v,A,R).call(m,f,g,e,l);t.beginPath(),t.arc(u,c,M,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(u,c,M*.8,0,Math.PI*2),t.fillStyle=P(f[g]),t.fill()}for(let g=0;g<d.length;g++){const u=p(B=v,A,R).call(B,d,g,e,l);t.beginPath(),t.arc(u,h,M,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(u,h,M*.6,0,Math.PI*2),t.fillStyle=P(d[g]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(u,h,M*.8,0,Math.PI*2),t.strokeStyle=P(L[g]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),a[g]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=M*1.5+"px Arial",t.fillText(a[g],u,h+M*.1),t.lineWidth=.5,t.strokeText(a[g],u,h+M*.1))}}};let $=v;A=new WeakSet,R=function(t,s,e,h){return S(e,h,t.length==1?.5:s/(t.length-1))},w($,A);var b=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(b||{}),D,z;class gt{constructor(t){w(this,D);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case b.KEYS:p(this,D,z).call(this);break;case b.DUMMY:this.forward=!0;break}}}D=new WeakSet,z=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class q{constructor(t,s,e=Math.ceil(t/4)){if(this.generation=0,t<s)throw new Error("requires more inputs than outputs");this.levels=[];for(let h=0;h<e;h++){const r=Math.floor(S(t,s,h/e)),n=Math.floor(S(t,s,(h+1)/e));this.levels.push(new I(r,n))}}static feedForward(t,s){let e=I.feedForward(t,s.levels[0]);for(let h=1;h<s.levels.length;h++)e=I.feedForward(e,s.levels[h]);return e}mutate(t,s=.01){if(this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}this.generation=t.generation+1;for(let e=0;e<this.levels.length;e++){for(let h=0;h<this.levels[e].biases.length;h++)this.levels[e].biases[h]=S(t.levels[e].biases[h],O(),s);for(let h=0;h<this.levels[e].weights.length;h++)for(let r=0;r<this.levels[e].weights[h].length;r++)this.levels[e].weights[h][r]=S(t.levels[e].weights[h][r],O(),s)}}}var N,Q;const K=class{constructor(t=1,s=1){var e;this.inputs=new Array(t),this.outputs=new Array(s),this.biases=new Array(s),this.weights=[];for(let h=0;h<t;h++)this.weights[h]=new Array(s);p(e=K,N,Q).call(e,this)}static feedForward(t,s){for(let e=0;e<s.inputs.length;e++)s.inputs[e]=t[e];for(let e=0;e<s.outputs.length;e++){let h=0;for(let r=0;r<s.inputs.length;r++)h+=s.inputs[r]*s.weights[r][e];h>s.biases[e]?s.outputs[e]=1:s.outputs[e]=0}return s.outputs}};let I=K;N=new WeakSet,Q=function(t){for(let s=0;s<t.inputs.length;s++)for(let e=0;e<t.outputs.length;e++)t.weights[s][e]=O();for(let s=0;s<t.biases.length;s++)t.biases[s]=O()},w(I,N);class ft{constructor(){this.CAR_NB=100,this.MUTATION_LVL=.1,this.NETWORK_LAYERS=3,this.SENSORS=11,this.SENSOR_ANGLE=Math.PI/2*3.7,this.trafficConfig=[[0,-300,.1,"A"],[1,-500,.2,"B"],[2,-300,.3,"C"],[0,-400,2,"LA"],[0,-600,2.2,"LB"],[2,-300,2,"RA"],[1,-600,2,"MA"],[2,-700,2.1,"RC"],[0,-900,2.2],[1,-900,2.3],[2,-900,2.1],[2,-950,2.4,"S"],[0,400,2.6],[1,375,2.6],[2,400,2.6]]}}const k=new ft;var Y,V,U,Z;class dt{constructor(t){w(this,Y);w(this,U);this.car=t,this.rayCount=k.SENSORS,this.rayLength=250,this.raySpread=k.SENSOR_ANGLE,this.rays=[],this.readings=[]}update(t,s){p(this,U,Z).call(this),this.readings=[];for(let e=0;e<this.rays.length;e++)this.readings.push(p(this,Y,V).call(this,this.rays[e],t,s))}draw(t){for(let s=0;s<this.rays.length;s++){let e=this.rays[s][1];this.readings[s]&&(e=this.readings[s]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[s][0].x,this.rays[s][0].y),t.lineTo(e.x,e.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[s][1].x,this.rays[s][1].y),t.lineTo(e.x,e.y),t.stroke()}}}Y=new WeakSet,V=function(t,s,e){let h=[];for(let r=0;r<s.length;r++){const n=_(t[0],t[1],s[r][0],s[r][1]);n&&h.push(n)}for(let r=0;r<e.length;r++){const n=e[r].polygon;for(let a=0;a<n.length;a++){const l=_(t[0],t[1],n[a],n[(a+1)%n.length]);l&&h.push(l)}}if(h.length==0)return null;{const r=h.map(a=>a.offset),n=Math.min(...r);return h.find(a=>a.offset==n)}},U=new WeakSet,Z=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const s=S(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,e={x:this.car.x,y:this.car.y},h={x:this.car.x-Math.sin(s)*this.rayLength,y:this.car.y-Math.cos(s)*this.rayLength};this.rays.push([e,h])}};const ct="/phantom-game-ai-training/assets/car.3e3d3a26.png";let ut=0;var W,x,G,tt,j,st,F,et;class E{constructor(t=0,s=0,e=50,h=50,r=b.DUMMY,n=2.8,a=`${ut++}`,l=lt()){w(this,W);w(this,G);w(this,j);w(this,F);this.x=t,this.y=s,this.width=e,this.height=h,this.maxSpeed=n,this.label=a,this.polygon=[],this.distance=0,this.score=0,this.x=t,this.y=s,this.width=e,this.height=h,this.speed=0,this.acceleration=.3,this.maxSpeed=n,this.friction=.05,this.angle=0,this.damaged=!1,this.useAI=r==b.AI,this.controls=new gt(r),r!=b.DUMMY&&(this.sensor=new dt(this),this.neural=new q(this.sensor.rayCount,Object.keys(this.controls).length,k.NETWORK_LAYERS)),this.img=new Image,this.img.src=ct,this.mask=document.createElement("canvas"),this.mask.width=e,this.mask.height=h;const c=this.mask.getContext("2d");this.img.onload=()=>{c.fillStyle=l,c.rect(0,0,this.width,this.height),c.fill(),c.globalCompositeOperation="destination-atop",c.drawImage(this.img,0,0,this.width,this.height)}}update(t,s){if(!this.damaged&&(p(this,F,et).call(this),p(this,W,x).call(this),this.polygon=p(this,j,st).call(this),this.damaged=p(this,G,tt).call(this,t,s),this.sensor)){this.sensor.update(t,s);const e=this.sensor.readings.map(r=>r==null?0:1-r.offset),h=q.feedForward(e,this.neural);this.useAI&&(this.controls.forward=h[0],this.controls.left=h[1],this.controls.right=h[2],this.controls.reverse=h[3])}}draw(t,s=!1,e=0){this.sensor&&s&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.textAlign="center",t.font="bold 11px serif",t.textBaseline="middle",t.fillStyle="rgba(0,0,0, 1)",t.fillText(`${this.label}`,0,this.height*-.5+10),t.restore()}}W=new WeakSet,x=function(){this.score+=Math.cos(this.angle)*this.speed,this.score+=this.speed,this.score+=this.controls.left&&this.controls.right?-1:0,this.score+=this.controls.reverse?-1:0},G=new WeakSet,tt=function(t,s){for(let e=0;e<t.length;e++)if(H(this.polygon,t[e]))return!0;for(let e=0;e<s.length;e++)if(H(this.polygon,s[e].polygon))return!0;return!1},j=new WeakSet,st=function(){const t=[],s=Math.hypot(this.width,this.height)/2,e=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-e)*s,y:this.y-Math.cos(this.angle-e)*s}),t.push({x:this.x-Math.sin(this.angle+e)*s,y:this.y-Math.cos(this.angle+e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle-e)*s,y:this.y-Math.cos(Math.PI+this.angle-e)*s}),t.push({x:this.x-Math.sin(Math.PI+this.angle+e)*s,y:this.y-Math.cos(Math.PI+this.angle+e)*s}),t},F=new WeakSet,et=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.distance+=this.speed,this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class pt{constructor(t,s,e=3){this.x=t,this.width=s,this.laneCount=e,this.borders=[],this.x=t,this.width=s,this.laneCount=e,this.left=t-s/2,this.right=t+s/2;const h=1e6;this.top=-h,this.bottom=h;const r={x:this.left,y:this.top},n={x:this.right,y:this.top},a={x:this.left,y:this.bottom},l={x:this.right,y:this.bottom};this.borders=[[r,a],[n,l]]}getLane(t){const s=this.width/this.laneCount;return this.left+s/2+Math.min(t,this.laneCount-1)*s}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let s=1;s<=this.laneCount-1;s++){const e=S(this.left,this.right,s/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(e,this.top),t.lineTo(e,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(s=>{t.beginPath(),t.moveTo(s[0].x,s[0].y),t.lineTo(s[1].x,s[1].y),t.stroke()})}}const yt={cars:[],sortedCars:[],livingCars:[],traffic:[],player:new E,to:0,model:void 0,...rt("highway")},St=async i=>{const t=J();t.style.cssText="max-width: 50%";const s=J();s.style.cssText="max-width: 50%";const e=t.getContext("2d"),h=s.getContext("2d");t.width=200,s.width=400;const r=Math.round(t.width/75),n=new pt(t.width/2,t.width*.9,r),a=new ht;function l(){if(Object.assign(i,yt),i.cars=c(k.CAR_NB),i.traffic=[],i.model=i.loadModel(),i.player=new E(n.getLane(1),0,30,50,b.KEYS,3.5,"You"),i.cars.push(i.player),i.model){console.log("Branch of generation "+i.model.generation);for(let f=0;f<i.cars.length;f++)i.cars[f].neural.mutate(i.model,f/i.cars.length*k.MUTATION_LVL)}else console.log("Fresh model start");i.traffic.push(...k.trafficConfig.map(([f,d,y,L],C)=>new E(n.getLane(f),d,30,50,b.DUMMY,y,L||C+"")))}function c(f=1){const d=[];for(let y=0;y<=f;y++)d.push(new E(n.getLane(1),100,30,50,b.AI,3,`${y}`));return d}i.to=setTimeout(()=>{console.warn("timeout experiment, saving model...");const[f]=i.sortedCars.filter(d=>d.useAI);i.saveModel(f.neural),l()},1e3*60*30),l(),a.play((f,d)=>{for(let o=0;o<i.traffic.length;o++)i.traffic[o].update(n.borders,[]);for(let o=0;o<i.cars.length;o++)i.cars[o].update(n.borders,i.traffic);i.sortedCars=i.cars.sort((o,m)=>m.score-o.score),i.livingCars=i.cars.filter(o=>!o.damaged),t.height=window.innerHeight,s.height=window.innerHeight,e.save(),i.player.score>0&&!i.player.damaged?e.translate(0,-i.player.y+t.height*.7):e.translate(0,-i.sortedCars[0].y+t.height*.7),n.draw(e);for(let o=0;o<i.traffic.length;o++)i.traffic[o].draw(e);for(let o=0;o<i.sortedCars.length;o++){const m=o===0||!i.cars[o].useAI;e.globalAlpha=m?1:.2,i.cars[o].draw(e,o===0,o)}e.restore(),h.lineDashOffset=-d/50,$.drawNetwork(h,i.sortedCars[0].neural);const y=20,L=i.sortedCars.filter((o,m)=>m<10||o===i.player);e.fillStyle="black",e.font="bold 18px serif",e.fillText(`Generation ${i.model.generation}`,0,y),e.fillText(`${i.livingCars.length}/${i.sortedCars.length} cars`,0,y*2),L.forEach((o,m)=>{e.fillStyle=o.damaged?"darkgray":"#246",e.fillText(`${o.label} ${Math.round(o.score)} `,0,y*3+m*y)});const[C]=i.livingCars;if(!C){const[o]=i.sortedCars.filter(m=>m.useAI);i.saveModel(o.neural),l()}})};export{St as default};
