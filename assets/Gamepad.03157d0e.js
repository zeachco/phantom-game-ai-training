class o{constructor(e=new Map,t=!1,s=document,i=!1){this.aliases=e,this.debug=t,this.container=s,this.useMouse=i,this.inputs=new Map,this.strokes=new Map,this.register=this.register.bind(this),this.unregister=this.unregister.bind(this),this.onkey=this.onkey.bind(this),this.handleMouveMovement=this.handleMouveMovement.bind(this),this.cancel=this.cancel.bind(this),this.inputs.set("MouseX",0),this.inputs.set("MouseY",0),this.inputs.set("MouseZ",0),s.addEventListener("keydown",this.register),s.addEventListener("keyup",this.unregister),s.addEventListener("keypress",this.onkey),this.useMouse&&(s.addEventListener("mousedown",this.register),s.addEventListener("mouseup",this.unregister),s.addEventListener("mouseclick",this.onkey),s.addEventListener("contextmenu",this.cancel),s.addEventListener("mousemove",this.handleMouveMovement),s.addEventListener("wheel",this.handleMouveMovement))}remove(){this.container.addEventListener("keydown",this.register),this.container.addEventListener("keyup",this.unregister),this.container.addEventListener("keypress",this.onkey),this.useMouse&&(this.container.addEventListener("mousedown",this.register),this.container.addEventListener("mouseup",this.unregister),this.container.addEventListener("mouseclick",this.onkey),this.container.addEventListener("contextmenu",this.cancel),this.container.addEventListener("mousemove",this.handleMouveMovement),this.container.addEventListener("wheel",this.handleMouveMovement))}get(e){const t=this.aliases.get(e)||e;return this.inputs.get(t)||0}set(e,t,s=!1){const i=this.aliases.get(e)||e;s&&this.strokes.set(i,t),this.debug&&console.log(i,t),this.inputs.set(i,t)}once(e){const t=this.aliases.get(e)||e,s=this.inputs.get(t);return s&&this.inputs.delete(t),Boolean(s)}register(e){e.preventDefault();const t=e instanceof MouseEvent?`Mouse${e.button}`:e.code;this.set(t,1)}unregister(e){e.preventDefault();const t=e instanceof MouseEvent?`Mouse${e.button}`:e.code;this.set(t,0)}onkey(e){e.preventDefault();const t=e instanceof MouseEvent?`Mouse${e.button}`:e.code;this.set(t,1,!0)}handleMouveMovement(e){e instanceof WheelEvent?(this.set("MouseOZ",this.get("MouseZ")),this.set("MouseZ",e.wheelDelta)):(this.set("MouseOX",this.get("MouseX")),this.set("MouseOY",this.get("MouseY")),this.set("MouseX",e.offsetX),this.set("MouseY",e.offsetY))}cancel(e){e.preventDefault()}}export{o as GamePad};
