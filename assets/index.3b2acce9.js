const T=y=>{const h=document.createElement("canvas"),e=h.getContext("2d");document.body.appendChild(h);const l=`
|0.0  00  0 |
|     0   0 |
|  0  0  0 0|
|  0  0    0|
| 0.  0 0  0|
| 000   0   |
|   0 0  0 0|
|0  .  .0   |
|  000  0.0 |
|    .  0   |
|.   0   0  |
|0 0  0     |
|  0  0  0 0|
`.trim().split(`
`).map(o=>o.split("")),w=640,k=480;h.width=w,h.height=k;const s=l[0].length,f=Math.min(l.length,s),i=w/s,t=k/f;let n=0,c=0,d=+localStorage.getItem("highScore")||0,g=Date.now(),p=1e3,m=t;v();function u(){requestAnimationFrame(u),Date.now()-g>p&&b(),e.clearRect(0,0,w,k);for(var a=0;a<f;a++)for(var r=0;r<s;r++)switch(l[a][r]){case"0":if(f-a<m)break;e.fillStyle="#330000",e.fillRect(r*i,a*t,i,t);break;case"|":e.fillStyle="#000000",e.fillRect(r*i,a*t,i,t);break;case".":e.fillStyle="#00ff0088",e.fillRect(r*i,a*t,i,t);break}e.fillStyle="#FF0000",e.fillRect(n*i,(f-1)*t,i,t),e.strokeStyle="yellow",e.strokeText(`score: ${c}`,0,t),e.strokeText(`score: ${Math.max(d,c)}`,0,t*2)}function S(o){n+=o,n<0&&(n=0),n>s-1&&(n=s-1),R()}function b(){l.unshift(l.pop()),m--,R(),p=250-c/5,g=Date.now()}function R(){switch(l[f-1][n]){case"0":m<=0&&v();break;case".":c+=10;break;case" ":c+=1;break}}function v(){c>d&&(d=c,localStorage.setItem("highScore",d+"")),c=0,m=t,n=Math.round(s/2)}u(),document.body.addEventListener("keydown",o=>{o.key==="ArrowLeft"&&S(-1),o.key==="ArrowRight"&&S(1),o.key==="ArrowUp"&&b()})};export{T as default};
