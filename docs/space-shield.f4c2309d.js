function e(e,t,s,i){Object.defineProperty(e,t,{get:s,set:i,enumerable:!0,configurable:!0})}var t=("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequire4d03;t.register("9YC4X",(function(s,i){var o;o=s.exports,Object.defineProperty(o,"__esModule",{value:!0,configurable:!0}),e(s.exports,"default",(()=>r));var n=t("9COFO"),a=t("axbXC"),r=async()=>{const{THREE:e}=await Promise.resolve(t("V3qFZ")),{Cameraman:s}=await t("lXaJF"),{GameLoop:i}=await t("6d43c"),{Central:o}=await t("gyInm"),{GamePad:r}=await t("if65o"),h=new e.Scene,p=new s(h,0,10,0),l=new Map;l.set("KeyW","KeyUp"),l.set("KeyW","KeyUp"),l.set("KeyW","KeyUp");for(let e=0;e<10;e++)l.set(`spawn${e}`,`Digit${e}`);const c=new r(l),d=new o;h.add(d.mesh);const f=[];(new i).play(((e,t)=>{d.update(t),p.update(t),function(e=0,t=0){for(let e=0;e<10;e++){c.once(`spawn${e}`);{const t=6,s=n.random(2*Math.PI,0,!0),i=Math.cos(s)*t,o=Math.sin(s)*t,r=e*Math.PI*.2/10,p=new a.Mob(i,o);p.hp=3*e,p.speed=.011-.001*(e+1),f.push(p),p.target=d,p.material.color.setHSL(r,1,.5),h.add(p.mesh)}}}(e,t);let s=0;for(;s<f.length;){const t=f[s];t.update(e),t.hp<=0?(h.remove(t.mesh),f.splice(s,1)):s++}}))}})),t.register("axbXC",(function(s,i){e(s.exports,"Mob",(()=>r));var o=t("V3qFZ");const n=new o.THREE.BoxGeometry,a=o.THREE.Vector3;class r{constructor(e=0,t=0){this.x=e,this.z=t,this.targetIndex=0,this.speed=.01,this.target=null,this.v=new a(0,0,0),this.hp=100,this.material=new o.THREE.MeshBasicMaterial,this.mesh=new o.THREE.Mesh(n,this.material),this.mesh.scale.set(.3,.3,.3),this.mesh.position.set(this.x,0,this.z)}update(e){if(this.target){const t=this.mesh.position.distanceTo(this.target.mesh.position);t>1?(this.mesh.lookAt(this.target.mesh.position),this.mesh.translateZ(Math.min(t/1e4*e,this.speed*e))):this.hp-=1}}}})),t.register("lXaJF",(function(e,s){e.exports=import("./"+t("27Lyk").resolve("dSnCt")).then((()=>t("dXE66")))})),t.register("6d43c",(function(e,s){e.exports=import("./"+t("27Lyk").resolve("BFxin")).then((()=>t("eEoiV")))})),t.register("gyInm",(function(e,s){e.exports=import("./"+t("27Lyk").resolve("kHfYY")).then((()=>t("eQDoK")))})),t.register("if65o",(function(e,s){e.exports=import("./"+t("27Lyk").resolve("3tNgy")).then((()=>t("5yHw8")))}));
//# sourceMappingURL=space-shield.f4c2309d.js.map
