("undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{}).parcelRequire4d03.register("5yHw8",(function(e,t){var s,i,n,o;s=e.exports,i="GamePad",n=()=>d,Object.defineProperty(s,i,{get:n,set:o,enumerable:!0,configurable:!0});class d{constructor(e=new Map){this.aliases=e,this.inputs=new Map,this.strokes=new Map;document.addEventListener("keydown",(e=>this.set(e.code,1)).bind(this)),document.addEventListener("keyup",(e=>this.set(e.code,0)).bind(this)),document.addEventListener("keypress",(e=>this.set(e.code,1,!0)).bind(this))}get(e){const t=this.aliases.get(e)||e;return this.inputs.get(t)||0}set(e,t,s=!1){const i=this.aliases.get(e)||e;s&&this.strokes.set(i,t),this.inputs.set(i,t)}once(e){const t=this.aliases.get(e)||e,s=this.inputs.get(t);return s&&this.inputs.delete(t),Boolean(s)}}}));
//# sourceMappingURL=Gamepad.0708ea14.js.map
