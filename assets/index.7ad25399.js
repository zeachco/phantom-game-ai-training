(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))c(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const l of t.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&c(l)}).observe(document,{childList:!0,subtree:!0});function o(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerpolicy&&(t.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?t.credentials="include":e.crossorigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function c(e){if(e.ep)return;e.ep=!0;const t=o(e);fetch(e.href,t)}})();const p="modulepreload",h=function(s){return"/phantom-game-ai-training/"+s},u={},i=function(r,o,c){return!o||o.length===0?r():Promise.all(o.map(e=>{if(e=h(e),e in u)return;u[e]=!0;const t=e.endsWith(".css"),l=t?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${l}`))return;const n=document.createElement("link");if(n.rel=t?"stylesheet":p,t||(n.as="script",n.crossOrigin=""),n.href=e,document.head.appendChild(n),t)return new Promise((f,_)=>{n.addEventListener("load",f),n.addEventListener("error",()=>_(new Error(`Unable to preload CSS for ${e}`)))})})).then(()=>r())},g=window.location.search,E=new URLSearchParams(g),a=new Map([["highway",()=>i(()=>import("./main.c45106a7.js"),["assets/main.c45106a7.js","assets/math.9c77be8d.js","assets/dom.be162d4e.js","assets/GameLoop.ae440459.js","assets/three.module.13bf8b03.js"])],["phatom-race",()=>i(()=>import("./index.3b2acce9.js"),[])],["ping-pong",()=>i(()=>import("./index.057ab3e8.js"),["assets/index.057ab3e8.js","assets/dom.be162d4e.js"])],["space-shield",()=>i(()=>import("./index.3c266879.js"),["assets/index.3c266879.js","assets/three.module.13bf8b03.js","assets/math.9c77be8d.js"])],["waypoints",()=>i(()=>import("./main.a14b7e7e.js"),["assets/main.a14b7e7e.js","assets/three.module.13bf8b03.js","assets/math.9c77be8d.js"])],["cells",()=>i(()=>import("./main.161d7bad.js"),["assets/main.161d7bad.js","assets/math.9c77be8d.js","assets/dom.be162d4e.js","assets/Gamepad.cc834c92.js","assets/GameLoop.ae440459.js","assets/three.module.13bf8b03.js"])],["number",()=>i(()=>import("./main.7def3b03.js"),["assets/main.7def3b03.js","assets/dom.be162d4e.js","assets/Gamepad.cc834c92.js","assets/GameLoop.ae440459.js","assets/three.module.13bf8b03.js"])]]),m=document.createElement("ul");document.body.appendChild(m);a.forEach((s,r)=>{const o=document.createElement("li");o.innerHTML=`<a href="?game=${r}">${r}</a>`,m.appendChild(o)});const y=E.get("game")||"",d=a.get(y);if(d){const s=window.state={};d().then(r=>r.default(s))}else console.log(a);export{i as _};
