import{C as e}from"./three.module.62571882.js";class n{constructor(){this.clock=new e}play(o){const t=()=>{requestAnimationFrame(t);const c=this.clock.getDelta(),s=this.clock.getElapsedTime();o(s,c)};t()}}export{n as GameLoop};