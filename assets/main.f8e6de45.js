var tt=(i,t,e)=>{if(!t.has(i))throw TypeError("Cannot "+e)};var m=(i,t,e)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,e)};var y=(i,t,e)=>(tt(i,t,"access private method"),e);import{l as S,r as J,g as K,p as N}from"./three.module.9013c9a7.js";import{c as H}from"./dom.be162d4e.js";import{GameLoop as et}from"./GameLoop.e9974046.js";function st(i=""){return{loadModel:()=>B(i),saveModel:t=>ht(t,i),discardModel:()=>nt(i)}}function B(i){try{const t=localStorage.getItem(`${i}_model`),e=JSON.parse(t);return e?(console.log(`loaded generation #${e.generation}`),e):void 0}catch(t){return console.log(t),null}}function it(i,t){if(!i||!t)return!1;const e=(s,h)=>s==="generation"?0:h;return JSON.stringify(i,e)===JSON.stringify(t,e)}function ht(i,t){const e=`${t}_model`,s=B(e);if(it(i,s))console.error("model is identical");else{const h=JSON.stringify(i);console.log(`saving ${e} (generation #${i.generation})`),localStorage.setItem(e,h)}}function nt(i){localStorage.removeItem(`${i}_model`)}function P(i){const t=Math.abs(i),e=i>0?0:255,s=i>0?0:255,h=i<0?0:255;return`rgba(${e}, ${s}, ${h}, ${t})`}function at(){const i=290+Math.random()*260;return"hsl("+i+", 100%, 60%)"}const p=12,U=Math.max(p,10);var I,L;const D=class{static drawNetwork(t,e){const s=U,h=U,a=t.canvas.width-U*2,n=t.canvas.height-U*2,l=n/e.levels.length;for(let o=e.levels.length-1;o>=0;o--){const M=h+S(n-l,0,e.levels.length==1?.5:o/(e.levels.length-1));t.setLineDash([7,3]),D.drawLevel(t,e.levels[o],s,M,a,l,o==e.levels.length-1?["\u2191","\u2190","\u2192","\u2193"]:[])}}static drawLevel(t,e,s,h,a,n,l){var C,r,v,G;const o=s+a,M=h+n,{inputs:k,outputs:w,weights:d,biases:b}=e;for(let f=0;f<k.length;f++)for(let u=0;u<w.length;u++)t.beginPath(),t.moveTo(y(C=D,I,L).call(C,k,f,s,o),M),t.lineTo(y(r=D,I,L).call(r,w,u,s,o),h),t.lineWidth=2,t.strokeStyle=P(d[f][u]),t.stroke();for(let f=0;f<k.length;f++){const u=y(v=D,I,L).call(v,k,f,s,o);t.beginPath(),t.arc(u,M,p,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(u,M,p*.8,0,Math.PI*2),t.fillStyle=P(k[f]),t.fill()}for(let f=0;f<w.length;f++){const u=y(G=D,I,L).call(G,w,f,s,o);t.beginPath(),t.arc(u,h,p,0,Math.PI*2),t.fillStyle="black",t.fill(),t.beginPath(),t.arc(u,h,p*.6,0,Math.PI*2),t.fillStyle=P(w[f]),t.fill(),t.beginPath(),t.lineWidth=2,t.arc(u,h,p*.8,0,Math.PI*2),t.strokeStyle=P(b[f]),t.setLineDash([3,3]),t.stroke(),t.setLineDash([]),l[f]&&(t.beginPath(),t.textAlign="center",t.textBaseline="middle",t.fillStyle="black",t.strokeStyle="white",t.font=p*1.5+"px Arial",t.fillText(l[f],u,h+p*.1),t.lineWidth=.5,t.strokeText(l[f],u,h+p*.1))}}};let Y=D;I=new WeakSet,L=function(t,e,s,h){return S(s,h,t.length==1?.5:e/(t.length-1))},m(Y,I);var g=(i=>(i[i.KEYS=0]="KEYS",i[i.DUMMY=1]="DUMMY",i[i.AI=2]="AI",i))(g||{}),R,X;class rt{constructor(t){m(this,R);switch(this.forward=!1,this.left=!1,this.right=!1,this.reverse=!1,t){case g.KEYS:y(this,R,X).call(this);break;case g.DUMMY:this.forward=!0;break}}}R=new WeakSet,X=function(){document.onkeydown=t=>{switch(t.key){case"ArrowLeft":this.left=!0;break;case"ArrowRight":this.right=!0;break;case"ArrowUp":this.forward=!0;break;case"ArrowDown":this.reverse=!0;break}},document.onkeyup=t=>{switch(t.key){case"ArrowLeft":this.left=!1;break;case"ArrowRight":this.right=!1;break;case"ArrowUp":this.forward=!1;break;case"ArrowDown":this.reverse=!1;break}}};class q{constructor(t,e,s=Math.ceil(t/4)){if(this.generation=0,t<e)throw new Error("requires more inputs than outputs");this.levels=[];for(let h=0;h<s;h++){const a=Math.floor(S(t,e,h/s)),n=Math.floor(S(t,e,(h+1)/s));this.levels.push(new A(a,n))}}static feedForward(t,e){let s=A.feedForward(t,e.levels[0]);for(let h=1;h<e.levels.length;h++)s=A.feedForward(s,e.levels[h]);return s}fork(t,e=.9){this.generation=t.generation+1;for(let h=0;h<t.levels.length;h++){for(let a=0;a<this.levels[h].biases.length;a++)this.levels[h].biases=S(t.levels[h].biases[a],Math.random()*2-1,0);for(let a=0;a<this.levels[h].weights.length;a++)for(let n=0;n<this.levels[h].weights[a].length;n++)this.levels[h].weights[a][n]=S(t.levels[h].weights[a][n],Math.random()*2-1,0)}}}var $,z;const F=class{constructor(t=1,e=1){var s;this.inputs=new Array(t),this.outputs=new Array(e),this.biases=new Array(e),this.weights=[];for(let h=0;h<t;h++)this.weights[h]=new Array(e);y(s=F,$,z).call(s,this)}static feedForward(t,e){for(let s=0;s<e.inputs.length;s++)e.inputs[s]=t[s];for(let s=0;s<e.outputs.length;s++){let h=0;for(let a=0;a<e.inputs.length;a++)h+=e.inputs[a]*e.weights[a][s];h>e.biases[s]?e.outputs[s]=1:e.outputs[s]=0}return e.outputs}};let A=F;$=new WeakSet,z=function(t){for(let e=0;e<t.inputs.length;e++)for(let s=0;s<t.outputs.length;s++)t.weights[e][s]=J(-1,1);for(let e=0;e<t.biases.length;e++)t.biases[e]=J(-1,1)},m(A,$);var T,Q,O,Z;class ot{constructor(t){m(this,T);m(this,O);this.car=t,this.rayCount=15,this.rayLength=250,this.raySpread=Math.PI/2*3.6,this.rays=[],this.readings=[]}update(t,e){y(this,O,Z).call(this),this.readings=[];for(let s=0;s<this.rays.length;s++)this.readings.push(y(this,T,Q).call(this,this.rays[s],t,e))}draw(t){for(let e=0;e<this.rayCount;e++){let s=this.rays[e][1];this.readings[e]&&(s=this.readings[e]),t.beginPath(),t.lineWidth=2,t.strokeStyle="yellow",t.moveTo(this.rays[e][0].x,this.rays[e][0].y),t.lineTo(s.x,s.y),t.stroke(),t.beginPath(),t.lineWidth=2,t.strokeStyle="black",t.moveTo(this.rays[e][1].x,this.rays[e][1].y),t.lineTo(s.x,s.y),t.stroke()}}}T=new WeakSet,Q=function(t,e,s){let h=[];for(let a=0;a<e.length;a++){const n=K(t[0],t[1],e[a][0],e[a][1]);n&&h.push(n)}for(let a=0;a<s.length;a++){const n=s[a].polygon;for(let l=0;l<n.length;l++){const o=K(t[0],t[1],n[l],n[(l+1)%n.length]);o&&h.push(o)}}if(h.length==0)return null;{const a=h.map(l=>l.offset),n=Math.min(...a);return h.find(l=>l.offset==n)}},O=new WeakSet,Z=function(){this.rays=[];for(let t=0;t<this.rayCount;t++){const e=S(this.raySpread/2,-this.raySpread/2,this.rayCount==1?.5:t/(this.rayCount-1))+this.car.angle,s={x:this.car.x,y:this.car.y},h={x:this.car.x-Math.sin(e)*this.rayLength,y:this.car.y-Math.cos(e)*this.rayLength};this.rays.push([s,h])}};const lt="/phantom-game-ai-training/assets/car.3e3d3a26.png";var W,V,j,_,E,x;class c{constructor(t=0,e=0,s=50,h=50,a=g.DUMMY,n=2.8,l=at()){m(this,W);m(this,j);m(this,E);this.x=t,this.y=e,this.width=s,this.height=h,this.maxSpeed=n,this.polygon=[],this.distance=0,this.x=t,this.y=e,this.width=s,this.height=h,this.speed=0,this.acceleration=.3,this.maxSpeed=n,this.friction=.05,this.angle=0,this.damaged=!1,this.useAI=a==g.AI,a!=g.DUMMY&&(this.sensor=new ot(this),this.neural=new q(this.sensor.rayCount,4)),this.controls=new rt(a),this.img=new Image,this.img.src=lt,this.mask=document.createElement("canvas"),this.mask.width=s,this.mask.height=h;const o=this.mask.getContext("2d");this.img.onload=()=>{o.fillStyle=l,o.rect(0,0,this.width,this.height),o.fill(),o.globalCompositeOperation="destination-atop",o.drawImage(this.img,0,0,this.width,this.height)}}update(t,e){if(!this.damaged&&(y(this,E,x).call(this),this.polygon=y(this,j,_).call(this),this.damaged=y(this,W,V).call(this,t,e),this.sensor)){this.sensor.update(t,e);const s=this.sensor.readings.map(a=>a==null?0:1-a.offset),h=q.feedForward(s,this.neural);this.useAI&&(this.controls.forward=h[0],this.controls.left=h[1],this.controls.right=h[2],this.controls.reverse=h[3])}}draw(t,e=!1,s=0){this.sensor&&e&&this.sensor.draw(t),t.save(),t.translate(this.x,this.y),t.rotate(-this.angle),t.textAlign="center",t.textBaseline="middle",t.fillStyle="rgba(255,255,255, 1)",t.strokeStyle="rgba(0,0,0, .5)",t.fillText(`${s}`,0,this.height*-.5+9),t.strokeText(`${s}`,0,this.height*-.5+9),this.damaged||(t.drawImage(this.mask,-this.width*.5,-this.height*.5,this.width,this.height),t.globalCompositeOperation="multiply"),t.drawImage(this.img,-this.width*.5,-this.height*.5,this.width,this.height),t.restore()}}W=new WeakSet,V=function(t,e){for(let s=0;s<t.length;s++)if(N(this.polygon,t[s]))return!0;for(let s=0;s<e.length;s++)if(N(this.polygon,e[s].polygon))return!0;return!1},j=new WeakSet,_=function(){const t=[],e=Math.hypot(this.width,this.height)/2,s=Math.atan2(this.width,this.height);return t.push({x:this.x-Math.sin(this.angle-s)*e,y:this.y-Math.cos(this.angle-s)*e}),t.push({x:this.x-Math.sin(this.angle+s)*e,y:this.y-Math.cos(this.angle+s)*e}),t.push({x:this.x-Math.sin(Math.PI+this.angle-s)*e,y:this.y-Math.cos(Math.PI+this.angle-s)*e}),t.push({x:this.x-Math.sin(Math.PI+this.angle+s)*e,y:this.y-Math.cos(Math.PI+this.angle+s)*e}),t},E=new WeakSet,x=function(){if(this.controls.forward&&(this.speed+=this.acceleration),this.controls.reverse&&(this.speed-=this.acceleration),this.speed>this.maxSpeed&&(this.speed=this.maxSpeed),this.speed<-this.maxSpeed/2&&(this.speed=-this.maxSpeed/2),this.speed>0&&(this.speed-=this.friction),this.speed<0&&(this.speed+=this.friction),Math.abs(this.speed)<this.friction&&(this.speed=0),this.speed!=0){const t=this.speed>0?1:-1;this.controls.left&&(this.angle+=.03*t),this.controls.right&&(this.angle-=.03*t)}this.distance+=this.speed,this.x-=Math.sin(this.angle)*this.speed,this.y-=Math.cos(this.angle)*this.speed};class gt{constructor(t,e,s=3){this.x=t,this.width=e,this.laneCount=s,this.borders=[],this.x=t,this.width=e,this.laneCount=s,this.left=t-e/2,this.right=t+e/2;const h=1e6;this.top=-h,this.bottom=h;const a={x:this.left,y:this.top},n={x:this.right,y:this.top},l={x:this.left,y:this.bottom},o={x:this.right,y:this.bottom};this.borders=[[a,l],[n,o]]}getLaneCenter(t){const e=this.width/this.laneCount;return this.left+e/2+Math.min(t,this.laneCount-1)*e}draw(t){t.lineWidth=5,t.strokeStyle="white";for(let e=1;e<=this.laneCount-1;e++){const s=S(this.left,this.right,e/this.laneCount);t.setLineDash([20,20]),t.beginPath(),t.moveTo(s,this.top),t.lineTo(s,this.bottom),t.stroke()}t.setLineDash([]),this.borders.forEach(e=>{t.beginPath(),t.moveTo(e[0].x,e[0].y),t.lineTo(e[1].x,e[1].y),t.stroke()})}}const ft={cars:[],traffic:[],bestCar:void 0,...st("highway")},yt=async i=>{const t=H();t.style.cssText="max-width: 50%";const e=H();e.style.cssText="max-width: 50%";const s=t.getContext("2d"),h=e.getContext("2d");t.width=200,e.width=400;const a=Math.round(t.width/75),n=new gt(t.width/2,t.width*.9,a),l=100,o=new et;function M(){Object.assign(i,ft),i.cars=k(l),i.traffic=[],i.bestCar=i.cars[0];const w=i.loadModel();if(w){console.log("Branch of generation "+w.generation);for(let d=0;d<i.cars.length;d++)i.cars[d].neural.fork(w,d/i.cars.length/2)}else console.log("Fresh model start");i.traffic.push(new c(n.getLaneCenter(0),-300,30,50,g.DUMMY,.1),new c(n.getLaneCenter(1),-600,30,50,g.DUMMY,.2),new c(n.getLaneCenter(2),-300,30,50,g.DUMMY,.3),new c(n.getLaneCenter(0),-400,30,50,g.DUMMY,2),new c(n.getLaneCenter(0),-600,30,50,g.DUMMY,2),new c(n.getLaneCenter(2),-300,30,50,g.DUMMY,2),new c(n.getLaneCenter(1),-500,30,50,g.DUMMY,2),new c(n.getLaneCenter(1),-900,30,50,g.DUMMY,2),new c(n.getLaneCenter(2),-700,30,50,g.DUMMY,2),new c(n.getLaneCenter(0),400,30,50,g.DUMMY,2.6),new c(n.getLaneCenter(1),375,30,50,g.DUMMY,2.6),new c(n.getLaneCenter(2),400,30,50,g.DUMMY,2.6));for(let d=3;d<a;d++)i.traffic.push(new c(n.getLaneCenter(d),300,30,50,g.DUMMY,2.5))}function k(w=1){const d=[];for(let b=1;b<=w;b++)d.push(new c(n.getLaneCenter(1),100,30,50,g.AI,3,"blue"));return d}M(),o.play((w,d)=>{for(let r=0;r<i.traffic.length;r++)i.traffic[r].update(n.borders,[]);for(let r=0;r<i.cars.length;r++)i.cars[r].update(n.borders,i.traffic);const b=i.cars.sort((r,v)=>r.y-v.y),C=b[0];b.filter(r=>!r.damaged).length||(C.y<i.traffic[6].y&&i.saveModel(C.neural),M()),t.height=window.innerHeight,e.height=window.innerHeight,s.save(),s.translate(0,-C.y+t.height*.7),n.draw(s);for(let r=0;r<i.traffic.length;r++)i.traffic[r].draw(s);for(let r=0;r<i.cars.length;r++){const v=i.cars[r]===C;s.globalAlpha=v?1:.2,i.cars[r].draw(s,v,r)}s.restore(),h.lineDashOffset=-d/50,Y.drawNetwork(h,C.neural)})};export{yt as default};
