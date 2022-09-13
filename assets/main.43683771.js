var tt=(i,t,e)=>{if(!t.has(i))throw TypeError("Cannot "+e)};var y=(i,t,e)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,e)};var w=(i,t,e)=>(tt(i,t,"access private method"),e);import{l as C,r as R,g as J,p as K}from"./three.module.e2623146.js";import{c as H}from"./dom.be162d4e.js";import{GameLoop as et}from"./GameLoop.08ec9c71.js";function st(i=""){return{loadModel:()=>B(i),saveModel:t=>ht(t,i),discardModel:()=>nt(i)}}function B(i){try{const t=localStorage.getItem(`${i}_model`),e=JSON.parse(t);return e?(console.log(`loaded generation #${e.generation}`),e):void 0}catch(t){return console.log(t),null}}function it(i,t){if(!i||!t)return!1;const e=(s,h)=>s==="generation"?0:h;return JSON.stringify(i,e)===JSON.stringify(t,e)}function ht(i,t){const e=`${t}_model`,s=B(e);if(it(i,s))console.error("model is identical");else{const h=JSON.stringify(i);console.log(`saving ${e} (generation #${i.generation})`),localStorage.setItem(e,h)}}function nt(i){localStorage.removeItem(`${i}_model`)}function U(i){const t=Math.abs(i),e=i>0?0:255,s=i>0?0:255,h=i<0?0:255;return`rgba(${e}, ${s}, ${h}, ${t})`}function rt(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}const m=12,Y=Math.max(m,10);var I,P;const D=class{static drawNetwork(t,e){const s=Y,h=Y,r=t.canvas.width-Y*2,n=t.canvas.height-Y*2,l=n/e.levels.length;for(let o=e.levels.length-1;o>=0;o--){const M=h+C(n-l,0,e.levels.length==1?.5:o/(e.levels.length-1));t.setLineDash([7,3]),D.drawLevel(t,e.levels[o],s,M,r,l,o==e.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,e,s,h,r,n,l){var p,a,k,L;const o=s+r,M=h+n,{inputs:S,outputs:v,weights:b,biases:c}=e;for(let g=0;g<S.length;g++)for(let d=0;d<v.length;d++)t.beginPath(),t.moveTo(w(p=D,I,P).call(p,S,g,s,o),M),t.lineTo(w(a=D,I,P).call(a,v,d,s,o),h),t.lineWidth=2,t.strokeStyle=U(b[g][d]),t.stroke();for(let g=0;g<S.length;g++){const d=w(k=D,I,P).call(k,S,g,s,o);t.beginPath(),t.arc(d,M,m,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(d,M,m*.8,0,Math.PI*2),t.fillStyle=U(S[g]),t.fill()}for(let g=0;g<v.length;g++){const d=w(L=D,I,P).call(L,v,g,s,o);t.beginPath(),t.arc(d,h,m,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(d,h,m*.6,0,Math.PI*2),t.fillStyle=U(v[g]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(d,h,m*.8,0,Math.PI*2),t.strokeStyle=U(c[g]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),l[g]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=m*1.5+"px Arial",t.fillText(l[g],d,h+m*.1),t.lineWidth=.5,t.strokeText(l[g],d,h+m*.1))}}};let $=D;I=new WeakSet,P=function(t,e,s,h){return C(s,h,t.length==1?.5:e/(t.length-1))},y($,I);var f=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(f||{}),O,X;class at{constructor(t){y(this,O);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case f.KEYS:w(this,O,X).call(this);break;case f.DUMMY:this.forward=!0;break}}}O=new WeakSet,X=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class q{constructor(t,e,s=Math.ceil(t/4)){if(this.generation=0,t<e)throw new Error("requires more inputs than outputs");this.levels=[];for(let h=0;h<s;h++){const r=Math.floor(C(t,e,h/s)),n=Math.floor(C(t,e,(h+1)/s));this.levels.push(new A(r,n))}}static feedForward(t,e){let s=A.feedForward(t,e.levels[0]);for(let h=1;h<e.levels.length;h++)s=A.feedForward(s,e.levels[h]);return s}mutate(t,e=.01){if(this.levels.length!==t.levels.length){console.warn(`Neural mismatch ${this.levels.length}>${t.levels.length}`);return}this.generation=t.generation+1;for(let s=0;s<t.levels.length;s++){for(let h=0;h<this.levels[s].biases.length;h++)this.levels[s].biases[h]=C(t.levels[s].biases[h],R(),e);for(let h=0;h<this.levels[s].weights.length;h++)for(let r=0;r<this.levels[s].weights[h].length;r++)this.levels[s].weights[h][r]=C(t.levels[s].weights[h][r],R(),e)}}}var T,z;const N=class{constructor(t=1,e=1){var s;this.inputs=new Array(t),this.outputs=new Array(e),this.biases=new Array(e),this.weights=[];for(let h=0;h<t;h++)this.weights[h]=new Array(e);w(s=N,T,z).call(s,this)}static feedForward(t,e){for(let s=0;s<e.inputs.length;s++)e.inputs[s]=t[s];for(let s=0;s<e.outputs.length;s++){let h=0;for(let r=0;r<e.inputs.length;r++)h+=e.inputs[r]*e.weights[r][s];h>e.biases[s]?e.outputs[s]=1:e.outputs[s]=0}return e.outputs}};let A=N;T=new WeakSet,z=function(t){for(let e=0;e<t.inputs.length;e++)for(let s=0;s<t.outputs.length;s++)t.weights[e][s]=R();for(let e=0;e<t.biases.length;e++)t.biases[e]=R()},y(A,T);var W,Q,j,Z;class ot{constructor(t){y(this,W);y(this,j);this.car=t,this.rayCount=9,this.rayLength=250,this.raySpread=Math.PI/2*3.6,this.rays=[],this.readings=[]}update(t,e){w(this,j,Z).call(this),this.readings=[];for(let s=0;s<this.rays.length;s++)this.readings.push(w(this,W,Q).call(this,this.rays[s],t,e))}draw(t){for(let e=0;e<this.rays.length;e++){let s=this.rays[e][1];this.readings[e]&&(s=this.readings[e]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[e][0].x,this.rays[e][0].y),t.lineTo(s.x,s.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[e][1].x,this.rays[e][1].y),t.lineTo(s.x,s.y),t.stroke()}}}W=new WeakSet,Q=function(t,e,s){let h=[];for(let r=0;r<e.length;r++){const n=J(t[0],t[1],e[r][0],e[r][1]);n&&h.push(n)}for(let r=0;r<s.length;r++){const n=s[r].polygon;for(let l=0;l<n.length;l++){const o=J(t[0],t[1],n[l],n[(l+1)%n.length]);o&&h.push(o)}}if(h.length==0)return null;{const r=h.map(l=>l.offset),n=Math.min(...r);return h.find(l=>l.offset==n)}},j=new WeakSet,Z=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const e=C(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,s={x:this.car.x,y:this.car.y},h={x:this.car.x-Math.sin(e)*this.rayLength,y:this.car.y-Math.cos(e)*this.rayLength};this.rays.push([s,h])}};const lt="/phantom-game-ai-training/assets/car.3e3d3a26.png";var E,V,F,_,G,x;class u{constructor(t=0,e=0,s=50,h=50,r=f.DUMMY,n=2.8,l=rt()){y(this,E);y(this,F);y(this,G);this.x=t,this.y=e,this.width=s,this.height=h,this.maxSpeed=n,this.polygon=[],this.distance=0,this.x=t,this.y=e,this.width=s,this.height=h,this.speed=0,this.acceleration=.3,this.maxSpeed=n,this.friction=.05,this.angle=0,this.damaged=!1,this.useAI=r==f.AI,this.controls=new at(r),r!=f.DUMMY&&(this.sensor=new ot(this),this.neural=new q(this.sensor.rayCount,Object.keys(this.controls).length,2)),this.img=new Image,this.img.src=lt,this.mask=document.createElement("canvas"),this.mask.width=s,this.mask.height=h;const o=this.mask.getContext("2d");this.img.onload=()=>{o.fillStyle=l,o.rect(0,0,this.width,this.height),o.fill(),o.globalCompositeOperation="destination-atop",o.drawImage(this.img,0,0,this.width,this.height)}}update(t,e){if(!this.damaged&&(w(this,G,x).call(this),this.polygon=w(this,F,_).call(this),this.damaged=w(this,E,V).call(this,t,e),this.sensor)){this.sensor.update(t,e);const s=this.sensor.readings.map(r=>r==null?0:1-r.offset),h=q.feedForward(s,this.neural);this.useAI&&(this.controls.forward=h[0],this.controls.left=h[1],this.controls.right=h[2],this.controls.reverse=h[3])}}draw(t,e=!1,s=0){this.sensor&&e&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),t.textAlign="center",t.textBaseline="middle",t.fillStyle="rgba(255,255,255, 1)",t.strokeStyle="rgba(0,0,0, .5)",t.fillText(`${s}`,0,this.height*-.5+9),t.strokeText(`${s}`,0,this.height*-.5+9),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.restore()}}E=new WeakSet,V=function(t,e){for(let s=0;s<t.length;s++)if(K(this.polygon,t[s]))return!0;for(let s=0;s<e.length;s++)if(K(this.polygon,e[s].polygon))return!0;return!1},F=new WeakSet,_=function(){const t=[],e=Math.hypot(this.width,this.height)/2,s=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-s)*e,y:this.y-Math.cos(this.angle-s)*e}),t.push({x:this.x-Math.sin(this.angle+s)*e,y:this.y-Math.cos(this.angle+s)*e}),t.push({x:this.x-Math.sin(Math.PI+this.angle-s)*e,y:this.y-Math.cos(Math.PI+this.angle-s)*e}),t.push({x:this.x-Math.sin(Math.PI+this.angle+s)*e,y:this.y-Math.cos(Math.PI+this.angle+s)*e}),t},G=new WeakSet,x=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.distance+=this.speed,this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class gt{constructor(t,e,s=3){this.x=t,this.width=e,this.laneCount=s,this.borders=[],this.x=t,this.width=e,this.laneCount=s,this.left=t-e/2,this.right=t+e/2;const h=1e6;this.top=-h,this.bottom=h;const r={x:this.left,y:this.top},n={x:this.right,y:this.top},l={x:this.left,y:this.bottom},o={x:this.right,y:this.bottom};this.borders=[[r,l],[n,o]]}getLaneCenter(t){const e=this.width/this.laneCount;return this.left+e/2+Math.min(t,this.laneCount-1)*e}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let e=1;e<=this.laneCount-1;e++){const s=C(this.left,this.right,e/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(s,this.top),t.lineTo(s,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(e=>{t.beginPath(),t.moveTo(e[0].x,e[0].y),t.lineTo(e[1].x,e[1].y),t.stroke()})}}const ft={cars:[],traffic:[],bestCar:void 0,...st("highway")},pt=async i=>{const t=H();t.style.cssText="max-width: 50%";const e=H();e.style.cssText="max-width: 50%";const s=t.getContext("2d"),h=e.getContext("2d");t.width=200,e.width=400;const r=Math.round(t.width/75),n=new gt(t.width/2,t.width*.9,r),l=200,o=new et;function M(){Object.assign(i,ft),i.cars=S(l),i.traffic=[],i.bestCar=i.cars[0];const b=i.loadModel();if(b){console.log("Branch of generation "+b.generation);for(let c=0;c<i.cars.length;c++)i.cars[c].neural.mutate(b,c/i.cars.length/10)}else console.log("Fresh model start");i.traffic.push(new u(n.getLaneCenter(0),-300,30,50,f.DUMMY,.1),new u(n.getLaneCenter(1),-600,30,50,f.DUMMY,.2),new u(n.getLaneCenter(2),-300,30,50,f.DUMMY,.3),new u(n.getLaneCenter(0),-400,30,50,f.DUMMY,2),new u(n.getLaneCenter(0),-600,30,50,f.DUMMY,2),new u(n.getLaneCenter(2),-300,30,50,f.DUMMY,2),new u(n.getLaneCenter(1),-500,30,50,f.DUMMY,2),new u(n.getLaneCenter(1),-900,30,50,f.DUMMY,2),new u(n.getLaneCenter(2),-700,30,50,f.DUMMY,2),new u(n.getLaneCenter(0),400,30,50,f.DUMMY,2.6),new u(n.getLaneCenter(1),375,30,50,f.DUMMY,2.6),new u(n.getLaneCenter(2),400,30,50,f.DUMMY,2.6));for(let c=3;c<r;c++)i.traffic.push(new u(n.getLaneCenter(c),300,30,50,f.DUMMY,2.5))}function S(b=1){const c=[];for(let p=1;p<=b;p++)c.push(new u(n.getLaneCenter(1),100,30,50,f.AI,3,"blue"));return c}M();const v=new Map([["y",1],["distance",-2]]);o.play((b,c)=>{for(let a=0;a<i.traffic.length;a++)i.traffic[a].update(n.borders,[]);for(let a=0;a<i.cars.length;a++)i.cars[a].update(n.borders,i.traffic);const p=i.cars.sort((a,k)=>{let L=0;return v.forEach((g,d)=>{L+=a[d]*g-k[d]*g}),L});i.bestCar=p[0],p.filter(a=>!a.damaged).length||(i.bestCar.y<i.traffic[6].y&&i.saveModel(i.bestCar.neural),M()),t.height=window.innerHeight,e.height=window.innerHeight,s.save(),s.translate(0,-i.bestCar.y+t.height*.7),n.draw(s);for(let a=0;a<i.traffic.length;a++)i.traffic[a].draw(s);for(let a=0;a<i.cars.length;a++){const k=i.cars[a]===i.bestCar;s.globalAlpha=k?1:.2,i.cars[a].draw(s,k,a)}s.restore(),h.lineDashOffset=-c/50,$.drawNetwork(h,i.bestCar.neural)})};export{pt as default};
