(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))l(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const s of t.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&l(s)}).observe(document,{childList:!0,subtree:!0});function o(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerpolicy&&(t.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?t.credentials="include":e.crossorigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function l(e){if(e.ep)return;e.ep=!0;const t=o(e);fetch(e.href,t)}})();const _="modulepreload",h=function(i){return"/"+i},u={},c=function(r,o,l){return!o||o.length===0?r():Promise.all(o.map(e=>{if(e=h(e),e in u)return;u[e]=!0;const t=e.endsWith(".css"),s=t?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${s}`))return;const n=document.createElement("link");if(n.rel=t?"stylesheet":_,t||(n.as="script",n.crossOrigin=""),n.href=e,document.head.appendChild(n),t)return new Promise((m,p)=>{n.addEventListener("load",m),n.addEventListener("error",()=>p(new Error(`Unable to preload CSS for ${e}`)))})})).then(()=>r())},g=window.location.search,E=new URLSearchParams(g),a=new Map([["highway",()=>c(()=>import("./index.b4e0bb98.js"),["assets/index.b4e0bb98.js","assets/three.module.c530657f.js","assets/dom.be162d4e.js","assets/GameLoop.40d4a0a8.js"])],["phatom-race",()=>c(()=>import("./index.3b2acce9.js"),[])],["ping-pong",()=>c(()=>import("./index.057ab3e8.js"),["assets/index.057ab3e8.js","assets/dom.be162d4e.js"])],["space-shield",()=>c(()=>import("./index.e26dfab8.js"),["assets/index.e26dfab8.js","assets/three.module.c530657f.js"])],["tower-def",()=>c(()=>import("./index.217e4136.js"),["assets/index.217e4136.js","assets/three.module.c530657f.js"])]]),f=document.createElement("ul");a.forEach((i,r)=>{const o=document.createElement("li");o.innerHTML=`<a href="?game=${r}">${r}</a>`,f.appendChild(o)});document.body.appendChild(f);const y=E.get("game")||"",d=a.get(y);if(d){const i=window.state={};d().then(r=>r.default(i))}else console.log(a);export{c as _};
