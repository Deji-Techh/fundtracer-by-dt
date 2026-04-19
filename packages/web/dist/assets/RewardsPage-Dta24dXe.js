import{o as X}from"./rolldown-runtime-MddlTo9B.js";import{Cc as Y,Dt as Z,Et as H,Ht as g,Kt as ee,Nt as U,On as F,Ot as ae,Pt as re,Tc as se,Xt as T,_t as te,bt as f,gt as L,hc as ie,in as ne,mt as V,pn as I,rn as A,vn as _,wt as D,xt as O}from"./vendor-ZFsBW_sc.js";import{t as s}from"./proxy-DXb4yVD7.js";import{t as B}from"./AnimatePresence-uboSkCke.js";import{n as oe}from"./AuthContext-CyePupkw.js";import{n as le}from"./ThemeContext-DvVO8Q-G.js";import{t as ce}from"./LandingLayout-jU2Yr3Qa.js";import{t as de}from"./navigation-CWP0Yn1z.js";var n=X(se(),1),e=ie();function pe({campaignId:c,title:R="Leaderboard",showPoints:q=!0,refreshInterval:y=3e4}){const[m,d]=(0,n.useState)([]),[p,z]=(0,n.useState)(!0),[S,h]=(0,n.useState)(null),[w,u]=(0,n.useState)(null),b=async()=>{try{const r=await fetch(`/api/torque/leaderboard/${c}`);if(!r.ok){u((await r.json().catch(()=>({}))).error||"Failed to fetch leaderboard"),z(!1);return}d((await r.json()).entries||[]),h(new Date),u(null)}catch(r){u("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",r)}finally{z(!1)}};(0,n.useEffect)(()=>{b();const r=setInterval(b,y);return()=>clearInterval(r)},[c,y]);const E=r=>r?`${r.slice(0,6)}...${r.slice(-4)}`:"Unknown",C=r=>{switch(r){case 1:return(0,e.jsx)(I,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(g,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(g,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:r})}},$=()=>{switch(c){case"sybil-hunter":return"Sybils Found";case"top-analyzer":return"Wallets Analyzed";case"streak":return"Day Streak";default:return"Points"}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(f,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:R})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:b,disabled:p,children:(0,e.jsx)(re,{className:p?"spinning":"",size:16})})]}),S&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",S.toLocaleTimeString()]}),(0,e.jsx)(B,{mode:"wait",children:p?(0,e.jsx)(s.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("div",{className:"skeleton-container",children:[...Array(5)].map((r,v)=>(0,e.jsxs)(s.div,{className:"skeleton-row",initial:{opacity:.3},animate:{opacity:[.3,.6,.3]},transition:{duration:1.2,repeat:1/0,delay:v*.15},children:[(0,e.jsx)("div",{className:"skeleton-rank"}),(0,e.jsx)("div",{className:"skeleton-name",children:(0,e.jsx)("div",{className:"skeleton-name-bar"})}),(0,e.jsx)("div",{className:"skeleton-score",children:(0,e.jsx)("div",{className:"skeleton-score-bar"})})]},v))})}):w?(0,e.jsxs)(s.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:w}),(0,e.jsx)("button",{onClick:b,children:"Retry"})]}):m.length===0?(0,e.jsx)(s.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsxs)("div",{className:"empty-content",children:[(0,e.jsx)(f,{className:"empty-icon",size:32}),(0,e.jsx)("p",{className:"empty-title",children:"No rankings yet"}),(0,e.jsx)("p",{className:"empty-subtitle",children:"Be the first to analyze wallets and claim the top spot!"}),(0,e.jsx)("button",{className:"empty-cta",onClick:()=>window.location.href="/app",children:"Start Analyzing"})]})}):(0,e.jsx)(s.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:m.map((r,v)=>(0,e.jsxs)(s.div,{className:`leaderboard-entry ${r.isCurrentUser?"current-user":""} rank-${r.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:v*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:C(r.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:r.displayName||E(r.userId)}),r.change!==0&&(0,e.jsxs)("span",{className:`change ${r.change>0?"up":"down"}`,children:[(0,e.jsx)(O,{size:12}),Math.abs(r.change)]})]}),q&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:r.score.toLocaleString()}),(0,e.jsx)("span",{className:"label",children:$()})]})]},r.userId))})}),(0,e.jsx)("style",{children:`
        .torque-leaderboard {
          background: var(--color-bg-elevated);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--color-border);
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-left h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .trophy-icon {
          color: var(--color-warning);
        }

        .refresh-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .refresh-btn .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .last-updated {
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 12px;
        }

        .leaderboard-loading,
        .leaderboard-error,
        .leaderboard-empty {
          text-align: center;
          padding: 24px;
          color: var(--color-text-muted);
        }

        .empty-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px;
        }

        .empty-icon {
          color: var(--color-text-muted);
          opacity: 0.5;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .empty-subtitle {
          font-size: 14px;
          color: var(--color-text-muted);
          margin: 0;
        }

        .empty-cta {
          margin-top: 8px;
          padding: 10px 20px;
          background: var(--color-accent);
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .empty-cta:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skeleton-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }

        .skeleton-rank {
          width: 28px;
          height: 20px;
          background: var(--color-bg);
          border-radius: 4px;
        }

        .skeleton-name {
          flex: 1;
        }

        .skeleton-name-bar {
          height: 16px;
          width: 60%;
          background: var(--color-bg);
          border-radius: 4px;
        }

        .skeleton-score {
          width: 60px;
        }

        .skeleton-score-bar {
          height: 16px;
          width: 100%;
          background: var(--color-bg);
          border-radius: 4px;
        }

        .leaderboard-error button {
          margin-top: 8px;
          padding: 8px 16px;
          background: var(--color-accent);
          color: #000;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .leaderboard-entries {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leaderboard-entry {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--color-bg);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .leaderboard-entry:hover {
          background: var(--color-bg-hover);
        }

        .leaderboard-entry.current-user {
          border: 1px solid var(--color-accent);
        }

        .leaderboard-entry.rank-1 {
          background: linear-gradient(135deg, var(--color-warning-muted) 0%, transparent 100%);
        }

        .leaderboard-entry.rank-2 {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, transparent 100%);
        }

        .leaderboard-entry.rank-3 {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, transparent 100%);
        }

        .entry-rank {
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rank-icon.gold {
          color: #fbbf24;
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
        }

        .rank-icon.silver {
          color: #c0c0c0;
        }

        .rank-icon.bronze {
          color: #cd7f32;
        }

        .rank-number {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-muted);
        }

        .entry-address {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .entry-address .address {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--color-text-primary);
        }

        .entry-address .change {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
        }

        .entry-address .change.up {
          color: var(--color-success);
        }

        .entry-address .change.down {
          color: var(--color-danger);
        }

        .entry-score {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .entry-score .score {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .entry-score .label {
          font-size: 10px;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
      `})]})}var me=de.map(c=>c.href==="/rewards"?{...c,active:!0}:c),k=[{id:"top-analyzer",title:"Top Analyzer Championship",description:"Most wallets analyzed wins the biggest equity share",icon:D,color:"#f59e0b",reward:"2.7%",type:"leaderboard",participants:847,endsIn:null,prize:[{place:"1st",amount:"1.5%",icon:I},{place:"2nd",amount:"0.75%",icon:g},{place:"3rd",amount:"0.35%",icon:g}]},{id:"sybil-hunter",title:"Sybil Hunter League",description:"Detect the most sybil attacks and earn equity",icon:ae,color:"#ef4444",reward:"1.75%",type:"leaderboard",participants:523,endsIn:"Weekly",prize:[{place:"1st",amount:"1.0%",icon:I},{place:"2nd",amount:"0.5%",icon:g},{place:"3rd",amount:"0.25%",icon:g}]},{id:"early-adopter",title:"Early Adopter Rewards",description:"First 50 users to analyze wallets get equity rewards",icon:U,color:"#8b5cf6",reward:"0.5%",type:"raffle",participants:42,endsIn:"Open",prize:[{place:"Winners",amount:"0.01% each",icon:H}]},{id:"streak",title:"Active Analyst Streak",description:"Maintain a 7-day analysis streak for weekly rewards",icon:ne,color:"#f97316",reward:"0.5%",type:"streak",participants:189,endsIn:"Weekly",prize:[{place:"5 winners",amount:"0.1% each",icon:F}]},{id:"referral",title:"Referral Program",description:"Invite friends and earn equity for both of you",icon:te,color:"#10b981",reward:"0.3%",type:"referral",participants:134,endsIn:"Always",prize:[{place:"Referrer",amount:"0.15%",icon:A},{place:"Referee",amount:"0.10%",icon:A}]}],he=[{label:"Total Equity Pool",value:"5%",icon:T},{label:"Active Participants",value:"—",icon:L},{label:"Events Tracked",value:"—",icon:V},{label:"Rewards Claimed",value:"0%",icon:F}],W=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:D,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:Z,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:O,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:ee,gradient:"from-blue-500 to-cyan-500"}];function we(){const c=Y(),{user:R}=oe(),{theme:q}=le(),[y,m]=(0,n.useState)("campaigns"),[d,p]=(0,n.useState)("top-analyzer"),[z,S]=(0,n.useState)(!1),[h,w]=(0,n.useState)({totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"}),[u,b]=(0,n.useState)({}),[E,C]=(0,n.useState)(null),[$,r]=(0,n.useState)(""),[v,N]=(0,n.useState)([]),[G,M]=(0,n.useState)(!1),P=(0,n.useRef)(null),Q=async a=>{if(r(a),!a.trim()){N([]);return}M(!0);try{const t=k.filter(i=>i.title.toLowerCase().includes(a.toLowerCase())||i.description.toLowerCase().includes(a.toLowerCase())).map(i=>({type:"campaign",id:i.id,title:i.title,subtitle:i.description}));let o=[];if(d)try{const i=await fetch(`/api/torque/leaderboard/${d}`);if(i.ok){const x=await i.json(),j=a.toLowerCase();o=(x.entries||[]).filter(l=>l.userId.toLowerCase().includes(j)||l.displayName&&l.displayName.toLowerCase().includes(j)).slice(0,5).map(l=>({type:"user",id:l.userId,title:l.displayName||l.userId,subtitle:`Rank #${l.rank} - ${l.score} points`}))}}catch{}N([...t,...o])}catch{N([])}finally{M(!1)}},J=a=>{r(""),N([]),a.type==="campaign"?(p(a.id),m("leaderboard")):(d||p("top-analyzer"),m("leaderboard")),setTimeout(()=>{P.current?.scrollIntoView({behavior:"smooth",block:"start"})},100)};return(0,n.useEffect)(()=>{const a=async()=>{const o=localStorage.getItem("fundtracer_token");try{const i=await fetch("/api/torque/overall-stats");i.ok&&w(await i.json());for(const x of["top-analyzer","sybil-hunter","early-adopter","streak","referral"]){const j=await fetch(`/api/torque/campaign-stats/${x}`);if(j.ok){const l=await j.json();b(K=>({...K,[x]:l}))}}if(o){const x=await fetch("/api/torque/stats",{headers:o?{Authorization:`Bearer ${o}`}:{}});x.ok&&C((await x.json()).stats)}}catch(i){console.error("[RewardsPage] Failed to fetch stats:",i)}};a();const t=setInterval(a,1e4);return()=>clearInterval(t)},[]),(0,e.jsx)(ce,{navItems:me,onSearch:Q,onSearchSelect:J,searchResults:v,searchLoading:G,showSearch:!0,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,t)=>(0,e.jsx)(s.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:T,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},t))})]}),(0,e.jsxs)(s.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(s.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(H,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(s.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(s.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(s.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(s.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>c("/app-evm"),children:[(0,e.jsx)(V,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(s.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>m("leaderboard"),children:[(0,e.jsx)(f,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(s.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:he.map((a,t)=>{let o=a.value;return a.label==="Active Participants"&&h.activeParticipants>0?o=h.activeParticipants.toLocaleString():a.label==="Events Tracked"&&h.eventsTracked>0?o=h.eventsTracked.toLocaleString():a.label==="Rewards Claimed"&&(o=h.rewardsClaimed),(0,e.jsxs)(s.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+t*.1},children:[(0,e.jsx)("div",{className:"stat-icon",children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:o}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label)})})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:W.map((a,t)=>(0,e.jsxs)(s.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:t*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),t<W.length-1&&(0,e.jsx)(s.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:T,duration:1.5},children:(0,e.jsx)(_,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsxs)("div",{className:"campaigns-tabs",children:[["campaigns","leaderboard"].map(a=>(0,e.jsxs)(s.button,{className:`tab-btn ${y===a?"active":""}`,onClick:()=>m(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(A,{size:16}),a==="leaderboard"&&(0,e.jsx)(f,{size:16}),a.replace("-"," ").replace(/\b\w/g,t=>t.toUpperCase())]},a)),(0,e.jsxs)(s.button,{className:"tab-btn",onClick:()=>window.open("/app-evm?tab=settings#torque-stats","_blank"),whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,e.jsx)(L,{size:16}),"My Stats"]})]}),(0,e.jsxs)(B,{mode:"wait",children:[y==="campaigns"&&(0,e.jsx)(s.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:k.map((a,t)=>(0,e.jsxs)(s.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:t*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(L,{size:14}),(0,e.jsxs)("span",{children:[u[a.id]?.participants||"—"," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((o,i)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(o.icon,{size:14}),(0,e.jsx)("span",{children:o.place}),(0,e.jsx)("strong",{children:o.amount})]},i))}),(0,e.jsxs)(s.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>p(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(_,{size:16})]})]},a.id))}),y==="leaderboard"&&(0,e.jsxs)(s.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},ref:P,children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards & Campaigns"}),(0,e.jsx)("div",{className:"leaderboard-list",children:k.map((a,t)=>(0,e.jsxs)(s.div,{className:`leaderboard-card ${d===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:t*.1},onClick:()=>p(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(f,{size:20,style:{color:t===0?"#f59e0b":t===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[u[a.id]?.participants||"—"," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:d?(0,e.jsx)(pe,{campaignId:d,title:k.find(a=>a.id===d)?.title||"Leaderboard",showPoints:!0,refreshInterval:1e4}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(f,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(s.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(s.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>c("/app-evm"),children:[(0,e.jsx)(U,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{we as default};
