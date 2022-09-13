var tt=(i,t,e)=>{if(!t.has(i))throw TypeError("Cannot "+e)};var m=(i,t,e)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,e)};var y=(i,t,e)=>(tt(i,t,"access private method"),e);import{l as v,r as Y,g as J,p as K}from"./three.module.e2623146.js";import{c as H}from"./dom.be162d4e.js";import{GameLoop as et}from"./GameLoop.08ec9c71.js";function st(i=""){return{loadModel:()=>B(i),saveModel:t=>ht(t,i),discardModel:()=>nt(i)}}function B(i){try{const t=localStorage.getItem(`${i}_model`),e=JSON.parse(t);return e?(console.log(`loaded generation #${e.generation}`),e):void 0}catch(t){return console.log(t),null}}function it(i,t){if(!i||!t)return!1;const e=(s,h)=>s==="generation"?0:h;return JSON.stringify(i,e)===JSON.stringify(t,e)}function ht(i,t){const e=`${t}_model`,s=B(e);if(it(i,s))console.error("model is identical");else{const h=JSON.stringify(i);console.log(`saving ${e} (generation #${i.generation})`),localStorage.setItem(e,h)}}function nt(i){localStorage.removeItem(`${i}_model`)}function L(i){const t=Math.abs(i),e=i>0?0:255,s=i>0?0:255,h=i<0?0:255;return`rgba(${e}, ${s}, ${h}, ${t})`}function rt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}const M=12,P=Math.max(M,10);var D,A;const k=class{static drawNetwork(t,e){const s=P,h=P,n=t.canvas.width-P*2,r=t.canvas.height-P*2,l=r/e.levels.length;for(let o=e.levels.length-1;o>=0;o--){const b=h+v(r-l,0,e.levels.length==1?.5:o/(e.levels.length-1));t.setLineDash([7,3]),k.drawLevel(t,e.levels[o],s,b,n,l,o==e.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,e,s,h,n,r,l){var a,C,G,N;const o=s+n,b=h+r,{inputs:S,outputs:u,weights:d,biases:p}=e;for(let f=0;f<S.length;f++)for(let w=0;w<u.length;w++)t.beginPath(),t.moveTo(y(a=k,D,A).call(a,S,f,s,o),b),t.lineTo(y(C=k,D,A).call(C,u,w,s,o),h),t.lineWidth=2,t.strokeStyle=L(d[f][w]),t.stroke();for(let f=0;f<S.length;f++){const w=y(G=k,D,A).call(G,S,f,s,o);t.beginPath(),t.arc(w,b,M,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(w,b,M*.8,0,Math.PI*2),t.fillStyle=L(S[f]),t.fill()}for(let f=0;f<u.length;f++){const w=y(N=k,D,A).call(N,u,f,s,o);t.beginPath(),t.arc(w,h,M,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(w,h,M*.6,0,Math.PI*2),t.fillStyle=L(u[f]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(w,h,M*.8,0,Math.PI*2),t.strokeStyle=L(p[f]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),l[f]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=M*1.5+"px Arial",t.fillText(l[f],w,h+M*.1),t.lineWidth=.5,t.strokeText(l[f],w,h+M*.1))}}};let U=k;D=new WeakSet,A=function(t,e,s,h){return v(s,h,t.length==1?.5:e/(t.length-1))},m(U,D);var g=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(g||{}),$,X;class at{constructor(t){m(this,$);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case g.KEYS:y(this,$,X).call(this);break;case g.DUMMY:this.forward=!0;break}}}$=new WeakSet,X=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class q{constructor(t,e,s=Math.ceil(t/4)){if(this.generation=0,t<e)throw new Error("requires more inputs than outputs");this.levels=[];for(let h=0;h<s;h++){const n=Math.floor(v(t,e,h/s)),r=Math.floor(v(t,e,(h+1)/s));this.levels.push(new I(n,r))}}static feedForward(t,e){let s=I.feedForward(t,e.levels[0]);for(let h=1;h<e.levels.length;h++)s=I.feedForward(s,e.levels[h]);return s}mutate(t,e=.01){const s=e;if(this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}this.generation=t.generation+1;for(let h=0;h<t.levels.length;h++){for(let n=0;n<this.levels[h].biases.length;n++)this.levels[h].biases[n]=v(t.levels[h].biases[n],Y(),s);for(let n=0;n<this.levels[h].weights.length;n++)for(let r=0;r<this.levels[h].weights[n].length;r++)this.levels[h].weights[n][r]=v(t.levels[h].weights[n][r],Y(),s)}}}var R,z;const F=class{constructor(t=1,e=1){var s;this.inputs=new Array(t),this.outputs=new Array(e),this.biases=new Array(e),this.weights=[];for(let h=0;h<t;h++)this.weights[h]=new Array(e);y(s=F,R,z).call(s,this)}static feedForward(t,e){for(let s=0;s<e.inputs.length;s++)e.inputs[s]=t[s];for(let s=0;s<e.outputs.length;s++){let h=0;for(let n=0;n<e.inputs.length;n++)h+=e.inputs[n]*e.weights[n][s];h>e.biases[s]?e.outputs[s]=1:e.outputs[s]=0}return e.outputs}};let I=F;R=new WeakSet,z=function(t){for(let e=0;e<t.inputs.length;e++)for(let s=0;s<t.outputs.length;s++)t.weights[e][s]=Y();for(let e=0;e<t.biases.length;e++)t.biases[e]=Y()},m(I,R);var O,Q,T,Z;class ot{constructor(t){m(this,O);m(this,T);this.car=t,this.rayCount=15,this.rayLength=250,this.raySpread=Math.PI/2*3.6,this.rays=[],this.readings=[]}update(t,e){y(this,T,Z).call(this),this.readings=[];for(let s=0;s<this.rays.length;s++)this.readings.push(y(this,O,Q).call(this,this.rays[s],t,e))}draw(t){for(let e=0;e<this.rays.length;e++){let s=this.rays[e][1];this.readings[e]&&(s=this.readings[e]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[e][0].x,this.rays[e][0].y),t.lineTo(s.x,s.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[e][1].x,this.rays[e][1].y),t.lineTo(s.x,s.y),t.stroke()}}}O=new WeakSet,Q=function(t,e,s){let h=[];for(let n=0;n<e.length;n++){const r=J(t[0],t[1],e[n][0],e[n][1]);r&&h.push(r)}for(let n=0;n<s.length;n++){const r=s[n].polygon;for(let l=0;l<r.length;l++){const o=J(t[0],t[1],r[l],r[(l+1)%r.length]);o&&h.push(o)}}if(h.length==0)return null;{const n=h.map(l=>l.offset),r=Math.min(...n);return h.find(l=>l.offset==r)}},T=new WeakSet,Z=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const e=v(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,s={x:this.car.x,y:this.car.y},h={x:this.car.x-Math.sin(e)*this.rayLength,y:this.car.y-Math.cos(e)*this.rayLength};this.rays.push([s,h])}};const lt="/phantom-game-ai-training/assets/car.3e3d3a26.png";var j,V,W,_,E,x;class c{constructor(t=0,e=0,s=50,h=50,n=g.DUMMY,r=2.8,l=rt()){m(this,j);m(this,W);m(this,E);this.x=t,this.y=e,this.width=s,this.height=h,this.maxSpeed=r,this.polygon=[],this.distance=0,this.x=t,this.y=e,this.width=s,this.height=h,this.speed=0,this.acceleration=.3,this.maxSpeed=r,this.friction=.05,this.angle=0,this.damaged=!1,this.useAI=n==g.AI,this.controls=new at(n),n!=g.DUMMY&&(this.sensor=new ot(this),this.neural=new q(this.sensor.rayCount,Object.keys(this.controls).length,2)),this.img=new Image,this.img.src=lt,this.mask=document.createElement("canvas"),this.mask.width=s,this.mask.height=h;const o=this.mask.getContext("2d");this.img.onload=()=>{o.fillStyle=l,o.rect(0,0,this.width,this.height),o.fill(),o.globalCompositeOperation="destination-atop",o.drawImage(this.img,0,0,this.width,this.height)}}update(t,e){if(!this.damaged&&(y(this,E,x).call(this),this.polygon=y(this,W,_).call(this),this.damaged=y(this,j,V).call(this,t,e),this.sensor)){this.sensor.update(t,e);const s=this.sensor.readings.map(n=>n==null?0:1-n.offset),h=q.feedForward(s,this.neural);this.useAI&&(this.controls.forward=h[0],this.controls.left=h[1],this.controls.right=h[2],this.controls.reverse=h[3])}}draw(t,e=!1,s=0){this.sensor&&e&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),t.textAlign="center",t.textBaseline="middle",t.fillStyle="rgba(255,255,255, 1)",t.strokeStyle="rgba(0,0,0, .5)",t.fillText(`${s}`,0,this.height*-.5+9),t.strokeText(`${s}`,0,this.height*-.5+9),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.restore()}}j=new WeakSet,V=function(t,e){for(let s=0;s<t.length;s++)if(K(this.polygon,t[s]))return!0;for(let s=0;s<e.length;s++)if(K(this.polygon,e[s].polygon))return!0;return!1},W=new WeakSet,_=function(){const t=[],e=Math.hypot(this.width,this.height)/2,s=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-s)*e,y:this.y-Math.cos(this.angle-s)*e}),t.push({x:this.x-Math.sin(this.angle+s)*e,y:this.y-Math.cos(this.angle+s)*e}),t.push({x:this.x-Math.sin(Math.PI+this.angle-s)*e,y:this.y-Math.cos(Math.PI+this.angle-s)*e}),t.push({x:this.x-Math.sin(Math.PI+this.angle+s)*e,y:this.y-Math.cos(Math.PI+this.angle+s)*e}),t},E=new WeakSet,x=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.distance+=this.speed,this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class gt{constructor(t,e,s=3){this.x=t,this.width=e,this.laneCount=s,this.borders=[],this.x=t,this.width=e,this.laneCount=s,this.left=t-e/2,this.right=t+e/2;const h=1e6;this.top=-h,this.bottom=h;const n={x:this.left,y:this.top},r={x:this.right,y:this.top},l={x:this.left,y:this.bottom},o={x:this.right,y:this.bottom};this.borders=[[n,l],[r,o]]}getLaneCenter(t){const e=this.width/this.laneCount;return this.left+e/2+Math.min(t,this.laneCount-1)*e}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let e=1;e<=this.laneCount-1;e++){const s=v(this.left,this.right,e/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(s,this.top),t.lineTo(s,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(e=>{t.beginPath(),t.moveTo(e[0].x,e[0].y),t.lineTo(e[1].x,e[1].y),t.stroke()})}}const ft={cars:[],traffic:[],bestCar:void 0,...st("highway")},yt=async i=>{const t=H();t.style.cssText="max-width: 50%";const e=H();e.style.cssText="max-width: 50%";const s=t.getContext("2d"),h=e.getContext("2d");t.width=200,e.width=400;const n=Math.round(t.width/75),r=new gt(t.width/2,t.width*.9,n),l=200,o=new et;function b(){Object.assign(i,ft),i.cars=S(l),i.traffic=[],i.bestCar=i.cars[0];const u=i.loadModel();if(u){console.log("Branch of generation "+u.generation);for(let d=0;d<i.cars.length;d++){const p=i.cars[d];p.neural.mutate(u,0),p.neural.mutate(u,d/i.cars.length/2)}}else console.log("Fresh model start");i.traffic.push(new c(r.getLaneCenter(0),-300,30,50,g.DUMMY,.1),new c(r.getLaneCenter(1),-600,30,50,g.DUMMY,.2),new c(r.getLaneCenter(2),-300,30,50,g.DUMMY,.3),new c(r.getLaneCenter(0),-400,30,50,g.DUMMY,2),new c(r.getLaneCenter(0),-600,30,50,g.DUMMY,2),new c(r.getLaneCenter(2),-300,30,50,g.DUMMY,2),new c(r.getLaneCenter(1),-500,30,50,g.DUMMY,2),new c(r.getLaneCenter(1),-900,30,50,g.DUMMY,2),new c(r.getLaneCenter(2),-700,30,50,g.DUMMY,2),new c(r.getLaneCenter(0),400,30,50,g.DUMMY,2.6),new c(r.getLaneCenter(1),375,30,50,g.DUMMY,2.6),new c(r.getLaneCenter(2),400,30,50,g.DUMMY,2.6));for(let d=3;d<n;d++)i.traffic.push(new c(r.getLaneCenter(d),300,30,50,g.DUMMY,2.5))}function S(u=1){const d=[];for(let p=1;p<=u;p++)d.push(new c(r.getLaneCenter(1),100,30,50,g.AI,3,"blue"));return d}b(),o.play((u,d)=>{for(let a=0;a<i.traffic.length;a++)i.traffic[a].update(r.borders,[]);for(let a=0;a<i.cars.length;a++)i.cars[a].update(r.borders,i.traffic);const p=i.cars.sort((a,C)=>a.y*1-a.distance/1-(C.y*1-C.distance/1));i.bestCar=p[0],p.filter(a=>!a.damaged).length||(i.bestCar.y<i.traffic[6].y&&i.saveModel(i.bestCar.neural),b()),t.height=window.innerHeight,e.height=window.innerHeight,s.save(),s.translate(0,-i.bestCar.y+t.height*.7),r.draw(s);for(let a=0;a<i.traffic.length;a++)i.traffic[a].draw(s);for(let a=0;a<i.cars.length;a++){const C=i.cars[a]===i.bestCar;s.globalAlpha=C?1:.2,i.cars[a].draw(s,C,a)}s.restore(),h.lineDashOffset=-d/50,U.drawNetwork(h,i.bestCar.neural)})};export{yt as default};
