import{W as a,P as n}from"./three.module.e2623146.js";class c{constructor(e,i=0,t=10,s=0){this.scene=e,this.renderer=new a,this.renderer.setSize(window.innerWidth,window.innerHeight),this.canvas=this.renderer.domElement,document.body.appendChild(this.canvas),this.camera=new n(75,window.innerWidth/window.innerHeight,.1,1e3),this.camera.position.x=i,this.camera.position.y=t,this.camera.rotation.z=s,this.camera.lookAt(0,0,0),document.addEventListener("resize",()=>{console.log("resize")})}update(e){(this.canvas.width!==this.canvas.clientWidth||this.canvas.height!==this.canvas.clientHeight)&&(this.renderer.setSize(this.canvas.clientWidth,this.canvas.clientHeight,!1),this.camera.aspect=this.canvas.clientWidth/this.canvas.clientHeight,this.camera.updateProjectionMatrix()),this.renderer.render(this.scene,this.camera)}}export{c as Cameraman};