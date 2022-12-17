import{l as k,r as M,b as E,v as P,c as B}from"./three.module.62571882.js";import{c as C}from"./dom.be162d4e.js";import{GamePad as G}from"./Gamepad.8a108b30.js";import{GameLoop as z}from"./GameLoop.699b6383.js";class D{constructor(t){this.ctx=t}render(){const{ctx:t,gw:e,gh:n}=this;t.fillStyle="rgba(0, 0, 0, .5)",t.fillRect(0,0,e,n),this.renderNetwork()}renderNetwork(){const{ctx:t,gw:e,gh:n,network:s}=this;if(!s)return;let r=n;s.layers.forEach((c,h)=>{let a=10;r-=40,c.forEach((f,d)=>{const u=this.getHue(f.bias),_=this.getHue(f.weight);t.strokeStyle=`hsla(${u}, 100%, 50%, 1)`,t.fillStyle=`hsla(${_}, 100%, 50%, 1)`,t.fillRect(a,r,25,25),t.strokeRect(a,r,25,25),a+=40,a>e-115&&(a=10,r-=40)})})}get gw(){return this.ctx.canvas.width}get gh(){return this.ctx.canvas.height}getHue(t){return Math.round(k(270,180,(t+1)/2))}}const b=3,N=Array(b).fill(0).map((i,t)=>k(0,360,(t+1)/b));function S(i,t){const e=i+t;return e>b-1?0:e<0?b-1:e}class H{constructor(t){this.weight=0,this.bias=0,Object.assign(this,t)}}class x{constructor(t,e=1,n=[5],s=0,r=0){this.inputs=t,this.outputs=e,this.hiddenLayers=n,this.generation=s,this.mutationAmount=r,this.layers=[],this.score=0,this.layers=[t,...n,e].map(c=>new Array(c).fill(0).map(()=>new H({bias:0,weight:0}))),this.randomize(1)}loadFromFile(t){const e=localStorage.getItem(t),n=JSON.parse(e);return this.fromObject(n),n}saveToFile(t){localStorage.setItem(t,this.toJSON())}fromObject(t){Object.assign(this,t)}toJSON(){const t={score:this.score,generation:this.generation,layers:this.layers};return JSON.stringify(t,null,2)}train(t,e=1e3){const n=[];for(let s=1;s<=e;s++){const[r,c]=t(),h=this.clone(s/e),a=this.feedForward(r),f=c.reduce((d,u)=>d+Math.abs(c[u]-a[u]),0);console.log({inputs:r,expected:c,results:a,distance:f}),n.push({network:h,mutation:h.mutationAmount,distance:f})}return n.sort((s,r)=>s.distance-r.distance),console.table(n.map(s=>s.distance)),n}clone(t=this.mutationAmount){return new x(this.inputs,this.outputs,this.hiddenLayers,this.generation+1,t)}feedForward(t,e=0){const n=this.layers[e];if(!n)return t;const s=n.map(r=>t.reduce((c,h)=>{const a=r.weight*h;return a>r.bias?a:c},0));return this.feedForward(s,e+1)}randomize(t=this.mutationAmount){for(let e=0;e<this.layers.length;e++){const n=this.layers[e];for(let s=0;s<n.length;s++){const r=n[s];r.bias=k(r.bias,M(-1,1),t),r.weight=k(r.weight,M(-1,1),t)}}}}const l=class{constructor(i={}){this.faction=E(0,b-1),this.label=this.faction+"",this.x=0,this.y=0,this.vx=0,this.vy=0,this.a=0,this.va=0,this.s=0,this.focused=!1,this.dead=!1,this.others=[],this.energy=100,this.atk=0,this.vatk=0,this.age=0,this.brain=new x(l.MAX_NB*2,3,[l.MAX_NB,5]),Object.assign(this,i)}forward(){this.vx+=Math.cos(this.a)*.2,this.vy+=Math.sin(this.a)*.2,this.brain.score-=.01}turnLeft(){this.va-=.02}turnRight(){this.va+=.02}get radius(){return l.RADIUS+this.energy/20}kill(){this.dead=!0}update(){this.s*=.99,this.va*=.8,this.vx*=.9,this.vy*=.9,this.vatk*=.9,this.atk=(this.atk+this.vatk)*.7,!this.dead&&(this.energy-=this.s/50,this.energy-=this.va/100,this.x+=this.vx,this.y+=this.vy,this.a+=this.va,this.a>Math.PI&&(this.a-=Math.PI*2),this.a<-Math.PI&&(this.a+=Math.PI*2),this.brain.score<-25&&this.kill(),this.age+=.01,this.age>100&&(this.brain.score-=1))}updateTargets(i,t,e){if(this.others=[],!this.dead){for(let n=0;n<i.length;n++){const s=i[n];if(s.dead||s.faction===this.faction)continue;const r=P(this.x-s.x,this.y-s.y);let c=0;const h=S(this.faction,1)===s.faction,a=S(this.faction,-1)===s.faction;h&&c--,a&&c++;let f=s.x,d=s.y;f-this.x>t/2&&(f-=t),f-this.x<t/-2&&(f+=t),this.y-d<e/-2&&(d-=e),this.y-d>e/2&&(d+=e),this.others.push({x:f,y:d,distance:r,opportunity:c}),!(this.age<l.MIN_AGE_TO_INTERACT||s.age<l.MIN_AGE_TO_INTERACT)&&r<this.radius+s.radius&&(S(this.faction,1)===s.faction&&(this.brain.score-=10),S(this.faction,-1)===s.faction&&(s.kill(),this.brain.score+=10))}this.others.sort((n,s)=>n.distance-s.distance)}}draw(i){this.focused&&this.drawSensors(i),this.drawBody(i),this.drawScore(i)}drawBody(i){const t=this.focused?1:.51,e=S(this.faction,-1),n=Math.PI*.1,s=this.age>l.SENIOR_AGE?"80%":"50%";i.lineWidth=3,i.strokeStyle=`hsla(${N[this.faction]}, 100%, 70%, ${t})`,i.fillStyle=`hsla(${N[this.faction]}, 100%,${s}, ${t})`,i.save(),i.translate(this.x,this.y),i.rotate(this.a),i.beginPath(),i.moveTo(this.radius*.5,0),i.arc(0,0,this.radius,n,Math.PI*2-n),i.lineTo(this.radius*.5,0),i.stroke(),this.age>l.MIN_AGE_TO_INTERACT&&i.fill(),i.beginPath(),i.strokeStyle=`hsla(${N[e]}, 100%, 80%, ${t})`,i.fillStyle=`hsla(${N[e]}, 100%, 20%, ${t})`,i.lineTo(0,0),i.lineTo(this.radius+5,0),i.stroke(),i.fill(),i.restore()}drawSensors(i){i.setLineDash([3,3]),i.lineWidth=2,this.others.slice(0,l.TRACK_NB).forEach((t,e)=>{const n=1/(1+e);i.beginPath(),i.strokeStyle=t.opportunity>0?`rgba(0, 255, 0, ${n})`:`rgba(255, 128, 0, ${n})`,i.moveTo(this.x,this.y),i.lineTo(t.x,t.y),i.stroke();const s=B(this.x-t.x,this.y-t.y);i.fillStyle="black",i.fillText(s.toFixed(1),t.x,t.y)}),i.setLineDash([])}drawScore(i){i.fillStyle="white",i.textAlign="center",i.textBaseline="middle";const t=this.y>l.RADIUS*5?this.y-l.RADIUS*2:this.y+l.RADIUS*2;this.focused&&i.fillText(`${this.brain.score.toFixed(0)}`,this.x,t)}};let g=l;g.TRACK_NB=3;g.RADIUS=10;g.MAX_NB=2;g.MIN_AGE_TO_INTERACT=1;g.SENIOR_AGE=100;const W=async()=>{const i=new G,t=C(),e=t.getContext("2d"),n=new D(e);if(!e)throw new Error("no 2d context");const s=t.width=window.innerWidth,r=t.height=window.innerHeight,c=new z;let h=[],a=h[0],f=!0;const d=new g;d.brain.loadFromFile("top");let u=d.brain.score||0;c.play((w,I)=>{var T;t.width=window.innerWidth,t.height=window.innerHeight;const v=new Array(b).fill(0);h.forEach((o,m)=>{v[o.faction]++,_(o),o.update(),o.x>s&&(o.x=0),o.x<0&&(o.x=s),o.y>r&&(o.y=0),o.y<0&&(o.y=r)}),v.forEach((o,m)=>{if(o<g.MAX_NB){const y=h.find($=>$.faction===m),F=(y==null?void 0:y.x)||E(0,s),O=(y==null?void 0:y.y)||E(0,r),R=(y==null?void 0:y.a)||M(-Math.PI,Math.PI),A=new g({x:F,y:O,a:R,energy:100,faction:m});A.brain.loadFromFile("top"),A.brain.mutationAmount=o/g.MAX_NB/(1+u),A.brain.randomize(),A.brain.score=0,h.push(A)}}),h.forEach(o=>o.updateTargets(h,s,r));const p=h.concat().sort((o,m)=>m.brain.score-o.brain.score);if(window.scores=p,h.forEach(o=>{o.focused=o===p[0],o.draw(e)}),h=h.filter(o=>!o.dead),a=p[0],n.network=(T=h[0])==null?void 0:T.brain,a&&a.brain.score>u){const o=a.brain.score;n.network=a.brain,console.log(`New score: ${u} > ${o.toFixed()} (+${(o-u).toFixed(3)})`),u=o,a.brain.saveToFile("top")}i.once("KeyV")&&(f=!f),f?n.render():(e.fillStyle="rgba(255, 255, 255, .6)",e.font="24px Arial",e.textAlign="left",e.textBaseline="bottom",e.fillText("Press V for neural network visuals",0,r))});function _(w){const I=[];w.others.forEach(o=>{I.push(o.distance),I.push(o.opportunity)});const[v,p,T]=w.brain.feedForward(I);v&&w.forward(),p&&w.turnLeft(),T&&w.turnRight()}};export{W as default};
