function e(e,r,n,t){Object.defineProperty(e,r,{get:n,set:t,enumerable:!0,configurable:!0})}var r="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},n={},t={},o=r.parcelRequire4d03;null==o&&((o=function(e){if(e in n)return n[e].exports;if(e in t){var r=t[e];delete t[e];var o={id:e,exports:{}};return n[e]=o,r.call(o.exports,o,o.exports),o.exports}var i=new Error("Cannot find module '"+e+"'");throw i.code="MODULE_NOT_FOUND",i}).register=function(e,r){t[e]=r},r.parcelRequire4d03=o),o.register("27Lyk",(function(r,n){var t,o;e(r.exports,"register",(()=>t),(e=>t=e)),e(r.exports,"resolve",(()=>o),(e=>o=e));var i={};t=function(e){for(var r=Object.keys(e),n=0;n<r.length;n++)i[r[n]]=e[r[n]]},o=function(e){var r=i[e];if(null==r)throw new Error("Could not resolve bundle with id "+e);return r}})),o.register("b9G7W",(function(e,r){e.exports=import("./"+o("27Lyk").resolve("fsAsh")).then((()=>o("c8688")))})),o.register("3U5KD",(function(e,r){e.exports=import("./"+o("27Lyk").resolve("amLNC")).then((()=>o("Hl6aF")))})),o.register("eFR4C",(function(e,r){e.exports=import("./"+o("27Lyk").resolve("fRyhx")).then((()=>o("sxyxR")))})),o("27Lyk").register(JSON.parse('{"fZ29l":"index.5d1fa5dd.js","fsAsh":"tower-def.a5721094.js","amLNC":"phantom-race.99b1bbda.js","fRyhx":"ping-pong.bfbdb4d6.js"}'));const i=window.location.search,a=new URLSearchParams(i),s={"tower-def":o("b9G7W"),"phatom-race":o("3U5KD"),"ping-pong":o("eFR4C")},f=Object.keys(s),l=document.createElement("ul");l.innerHTML=f.map((e=>`<li><a href="?game=${e}">${e}</a></li>`)).join(""),document.body.appendChild(l);const d=a.get("game");~f.indexOf(d)&&s[d].then((e=>e.default()));
//# sourceMappingURL=index.5d1fa5dd.js.map
