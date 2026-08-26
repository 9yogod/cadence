/* Inline SVG accuracy-trend chart for the History screen's 진척(progress) tab.
   Single series → no legend needed (title/tab already names it). 2px line, 10%
   area wash, labeled end-point, hairline y-gridlines at 0/50/100, hover
   crosshair + tooltip. No chart library — see the `dataviz` skill's mark specs. */
const W=600,H=160,PAD={l:30,r:14,t:14,b:14};
const TYPE_LABEL={dictation:'받아쓰기',pronunciation:'발음체크'};

function xAt(i,n){return n<=1?W-PAD.r:PAD.l+(i/(n-1))*(W-PAD.l-PAD.r);}
function yAt(acc){return H-PAD.b-(acc/100)*(H-PAD.t-PAD.b);}

export function scoreChartHTML(scores){
  const n=scores.length;
  const pts=scores.map((s,i)=>({x:xAt(i,n),y:yAt(s.acc),acc:s.acc}));
  const line=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area=`${PAD.l},${yAt(0)} ${line} ${pts[n-1].x.toFixed(1)},${yAt(0)}`;
  const last=pts[n-1];
  const grid=[0,50,100].map(v=>`
    <line x1="${PAD.l}" y1="${yAt(v)}" x2="${W-PAD.r}" y2="${yAt(v)}" stroke="var(--line)" stroke-width="1"/>
    <text x="${PAD.l-6}" y="${yAt(v)+3}" text-anchor="end" font-size="9" fill="var(--muted)">${v}</text>`).join('');
  return `
  <div class="scorechart" style="position:relative;margin:4px 0 6px">
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" role="img" aria-label="정확도 추이 차트, 최근 ${n}개 기록">
      ${grid}
      ${n>1?`<path d="M${area}Z" fill="var(--accent)" fill-opacity="0.1" stroke="none"/>
      <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`:''}
      <circle cx="${last.x}" cy="${last.y}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
      <text x="${last.x-8}" y="${Math.max(12,last.y-10)}" text-anchor="end" font-size="11" font-weight="600" fill="var(--ink)">${last.acc}%</text>
      <line class="sc-cross" x1="0" y1="${PAD.t}" x2="0" y2="${H-PAD.b}" stroke="var(--muted)" stroke-width="1" opacity="0" pointer-events="none"/>
      <rect class="sc-hit" x="${PAD.l}" y="0" width="${W-PAD.l-PAD.r}" height="${H}" fill="transparent"/>
    </svg>
    <div class="sc-tip" style="position:absolute;top:4px;left:0;transform:translateX(-50%);
      background:var(--ink);color:var(--surface);font-size:11.5px;padding:4px 8px;border-radius:7px;
      white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .1s"></div>
  </div>`;
}

export function wireScoreChart(container,scores){
  const svg=container.querySelector('svg');if(!svg)return;
  const n=scores.length;
  const pts=scores.map((s,i)=>({x:xAt(i,n),acc:s.acc,date:s.date,type:s.type}));
  const cross=svg.querySelector('.sc-cross');
  const hit=svg.querySelector('.sc-hit');
  const tip=container.querySelector('.sc-tip');
  function nearest(clientX){
    const r=svg.getBoundingClientRect();
    const xIn=((clientX-r.left)/Math.max(1,r.width))*W;
    let bi=0,bd=Infinity;
    pts.forEach((p,i)=>{const d=Math.abs(p.x-xIn);if(d<bd){bd=d;bi=i;}});
    return bi;
  }
  function show(clientX){
    const p=pts[nearest(clientX)];
    cross.setAttribute('x1',p.x);cross.setAttribute('x2',p.x);cross.setAttribute('opacity','1');
    tip.style.left=(p.x/W*100)+'%';
    tip.textContent=`${p.date} · ${TYPE_LABEL[p.type]||p.type} · ${p.acc}%`;
    tip.style.opacity='1';
  }
  function hide(){cross.setAttribute('opacity','0');tip.style.opacity='0';}
  hit.addEventListener('pointermove',e=>show(e.clientX));
  hit.addEventListener('pointerleave',hide);
  hit.addEventListener('touchstart',e=>{if(e.touches[0])show(e.touches[0].clientX);},{passive:true});
}
