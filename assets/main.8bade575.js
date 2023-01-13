import{B as w,r as x,M as p,a as g,b as y,R as M,C as l,S as E,P as I,W as P}from"./three.module.62571882.js";const S=new w,b=.05,m=.1;class W{constructor(e,t=0,a=0){this.path=e,this.x=t,this.y=a,this.speed=x(b,m),this.targetIndex=0;const s=Math.round(this.speed/m*255),r=Math.round(255-s/2),c=new p({color:`rgba(${s}, ${r}, 0)`,opacity:.2});this.mesh=new g(S,c),this.mesh.scale.set(.3,.3,.3),this.mesh.position.set(this.x,this.y,0)}update(){if(this.target||(this.targetIndex=0,this.changeTarget()),this.target){const{x:e,y:t}=this.target;e<this.x&&(this.x-=this.speed),e>this.x&&(this.x+=this.speed),t<this.y&&(this.y-=this.speed),t>this.y&&(this.y+=this.speed),this.target.isInRange(this.mesh,this.speed*1.5)&&this.changeTarget()}this.mesh.position.set(this.x,this.y,0),this.mesh.rotation.x+=this.speed,this.mesh.rotation.y+=this.speed}changeTarget(){this.target=this.path.getNext(this.targetIndex++),this.target||(this.targetIndex=0,this.target=this.path.getNext(this.targetIndex++))}}class R{constructor(e=[]){this.segments=e}getNext(e){const t=this.segments[e];return t?t[y(0,t.length-1)]:null}forEach(e){this.segments.forEach(t=>t.forEach(e))}update(){this.forEach(e=>e.update())}}const T=new M,k=new p({color:35071,opacity:.5});class A{constructor(e,t){this.x=e,this.y=t,this.clock=new l,this.mesh=new g(T,k),this.mesh.scale.set(.2,.2,.02),this.mesh.position.x=e,this.mesh.position.y=t}isInRange(e,t=.1){return e!=null&&e.position?e.position.distanceTo(this.mesh.position)<t:!1}update(){this.mesh.rotateZ(2),this.mesh.scale.y=.2+Math.sin(this.clock.getElapsedTime()*10)*.02}}const B={paths:[{spawns:["monsterA","monsterB"],segments:[[[-4,0]],[[-3,-2],[-2,2],[-1,-2]],[[-1,-2]],[[0,1],[0,0]],[[3,2]],[[7,3]],[[3,4]],[[8,5]],[[3,6]]]},{spawns:["monsterA","monsterB"],segments:[[[-14,0]],[[-13,-2],[-12,2],[-11,-2]],[[-11,-2]],[[10,11],[10,10]],[[13,12]],[[17,13]],[[13,14]],[[18,15]],[[13,16]]]}]},C=()=>{const h=new E,e=B.paths.map(i=>new R(i.segments.map(o=>o.map(([f,u])=>new A(f,u))))),t=new I(75,window.innerWidth/window.innerHeight,.1,1e3);t.position.z=25,t.position.y=-8,t.rotation.x=Math.PI*.2;const a=new P;a.setSize(window.innerWidth,window.innerHeight);const s=a.domElement;document.body.appendChild(s);const r=[];e.forEach(i=>{for(var n=0;n<1e3;n++){const o=new W(i);h.add(o.mesh),r.push(o)}i.forEach(o=>h.add(o.mesh))});const c=new l;function d(){requestAnimationFrame(d),(s.width!==s.clientWidth||s.height!==s.clientHeight)&&(a.setSize(s.clientWidth,s.clientHeight,!1),t.aspect=s.clientWidth/s.clientHeight,t.updateProjectionMatrix());const i=c.getElapsedTime()*.1*Math.PI;t.position.set(5+Math.cos(i)*10,15+Math.sin(i)*10,20),t.lookAt(0,0,0),a.render(h,t),e.forEach(n=>n.update()),r.forEach(n=>n.update())}d()};export{C as default};