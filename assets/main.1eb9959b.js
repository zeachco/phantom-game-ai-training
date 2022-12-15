import{c as p}from"./dom.be162d4e.js";import{GamePad as w}from"./Gamepad.8a108b30.js";import{l as M,r as f}from"./three.module.e2623146.js";import{GameLoop as P}from"./GameLoop.08ec9c71.js";const g=class{constructor(t){this.x=0,this.y=0,this.a=0,this.va=0,this.s=0,this.score=0,this.focused=!1,this.dead=!1,this.enemies=[],this.energy=100,this.atk=0,this.vatk=0,Object.assign(this,t)}attack(){this.dead||this.atk>5||(this.vatk=10)}forward(){this.s+=.1}turnLeft(){this.va-=.01}turnRight(){this.va+=.01}update(){this.s*=.99,this.va*=.9,this.vatk*=.99,this.atk=(this.atk+this.vatk)*.7,!this.dead&&(this.energy-=this.s/100,this.x+=Math.cos(this.a)*this.s,this.y+=Math.sin(this.a)*this.s,this.a+=this.va/(1+this.atk/2),this.a>Math.PI&&(this.a-=Math.PI*2),this.a<-Math.PI&&(this.a+=Math.PI*2))}updateEnemies(t){if(this.enemies=[],!this.dead){for(let i=0;i<t.length;i++){const s=t[i];if(s===this||s.dead)continue;const[h,n]=this.relativePosition(s),r=Math.sqrt(h*h+n*n);r<this.mouthSize+s.radius&&this.eat(s),this.enemies.push({ref:s,distance:r})}this.enemies.sort((i,s)=>i.distance-s.distance)}}draw(t){this.focused&&this.drawRelations(t);const i=Math.PI*M(.15,.4,this.atk/10);t.strokeStyle="rgba(255, 255, 255, .8)",t.fillStyle=this.focused?"rgba(255, 128, 128, .8)":"rgba(0, 128, 128, .8)",t.save(),t.translate(this.x,this.y),t.rotate(this.a),t.beginPath(),t.moveTo(0,0),t.arc(0,0,this.radius,i,Math.PI*2-i),t.lineTo(0,0),t.arc(this.attkRange,0,this.mouthSize,0,Math.PI*2),this.dead&&(t.fillStyle="rgba(255, 255, 255, .05)",t.strokeStyle="rgba(255, 255, 255, .25)"),t.stroke(),t.fill(),t.restore(),t.fillText(`${this.energy.toFixed(0)}`,this.x-5,this.y-this.radius)}get radius(){return g.RADIUS+this.energy/100}get mouthSize(){return this.attkRange/4}get attkRange(){return this.radius+this.atk}drawRelations(t){t.setLineDash([7,3]),t.lineWidth=2,this.enemies.slice(0,g.TRACK_NB).forEach(i=>{t.beginPath();const[s,h]=this.projectedPosition();t.moveTo(s,h),t.strokeStyle="rgba(0, 128, 0, .5)",t.lineTo(i.ref.x,i.ref.y),t.stroke(),t.beginPath();const[n,r]=i.ref.projectedPosition();t.moveTo(n,r),t.strokeStyle="rgba(255, 128, 0, .5)",t.lineTo(this.x,this.y),t.stroke()}),t.setLineDash([])}projectedPosition(t=this.attkRange){const i=this.x+Math.cos(this.a)*t,s=this.y+Math.sin(this.a)*t;return[i,s]}relativePosition(t){const[i,s]=this.projectedPosition(),h=i-t.x,n=s-t.y;return[h,n]}eat(t){const i=Math.max(this.attkRange,this.atk);t.energy-=i,this.energy+=i,this.score+=1,t.energy<5&&(t.dead=!0)}};let d=g;d.TRACK_NB=10;d.RADIUS=10;d.MAX_NB=50;const b=async()=>{const t=new w,i=p(),s=i.getContext("2d");if(!s)throw new Error("no 2d context");const h=i.width=window.innerWidth,n=i.height=window.innerHeight,r=new P,o=[];let u=0;for(let a=0;a<d.MAX_NB;a++)o.push(new d({a:f(-Math.PI,Math.PI),x:f(0,h),y:f(0,n),energy:f(100,150)}));r.play((a,v)=>{i.width=window.innerWidth,i.height=window.innerHeight,o.forEach((e,k)=>{e.focused=k===u,e.focused?y(e):m(e),e.x>h&&(e.x=0),e.x<0&&(e.x=h),e.y>n&&(e.y=0),e.y<0&&(e.y=n),e.update()}),o.forEach(e=>e.updateEnemies(o)),o.forEach(e=>e.draw(s))});function y(a){t.get("ArrowUp")&&a.forward(),t.get("ArrowLeft")&&a.turnLeft(),t.get("ArrowRight")&&a.turnRight(),t.get("Space")&&a.attack()}function m(a){Math.random()>.75&&a.forward(),Math.random()>.25&&a.turnLeft(),Math.random()>.25&&a.turnRight(),Math.random()>.85&&a.attack()}};export{b as default};
