import{o as X}from"./rolldown-runtime-MddlTo9B.js";import{Dt as Y,Ec as K,Et as U,Nt as H,Ot as ee,Pt as ae,Ut as j,Zt as A,_t as re,an as te,bt as g,gc as se,gt as I,in as L,kn as V,mn as R,mt as z,qt as ie,wc as ne,wt as D,xt as O,yn as W}from"./vendor-DItE0IDC.js";import{t as r}from"./proxy-C8eordF7.js";import{t as B}from"./AnimatePresence-Bh1byuWF.js";import{n as oe}from"./AuthContext-QFg6vdJb.js";import{n as le}from"./ThemeContext-CEA5xMHp.js";import{t as ce}from"./LandingLayout-DEo0Ucq3.js";import{t as de}from"./navigation-CWP0Yn1z.js";var n=X(K(),1),e=se();function pe({campaignId:c,title:q="Leaderboard",showPoints:P=!0,refreshInterval:y=3e4}){const[h,d]=(0,n.useState)([]),[p,S]=(0,n.useState)(!0),[C,m]=(0,n.useState)(null),[w,u]=(0,n.useState)(null),b=async()=>{try{const t=await fetch(`/api/torque/leaderboard/${c}`);if(!t.ok){u((await t.json().catch(()=>({}))).error||"Failed to fetch leaderboard"),S(!1);return}d((await t.json()).entries||[]),m(new Date),u(null)}catch(t){u("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",t)}finally{S(!1)}};(0,n.useEffect)(()=>{b();const t=setInterval(b,y);return()=>clearInterval(t)},[c,y]);const E=t=>t?`${t.slice(0,6)}...${t.slice(-4)}`:"Unknown",T=t=>{switch(t){case 1:return(0,e.jsx)(R,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(j,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(j,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:t})}},_=()=>{switch(c){case"sybil-hunter":return"Sybils Found";case"top-analyzer":return"Wallets Analyzed";case"streak":return"Day Streak";default:return"Points"}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(g,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:q})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:b,disabled:p,children:(0,e.jsx)(ae,{className:p?"spinning":"",size:16})})]}),C&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",C.toLocaleTimeString()]}),(0,e.jsx)(B,{mode:"wait",children:p?(0,e.jsx)(r.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("div",{className:"skeleton-container",children:[...Array(5)].map((t,v)=>(0,e.jsxs)(r.div,{className:"skeleton-row",initial:{opacity:.3},animate:{opacity:[.3,.6,.3]},transition:{duration:1.2,repeat:1/0,delay:v*.15},children:[(0,e.jsx)("div",{className:"skeleton-rank"}),(0,e.jsx)("div",{className:"skeleton-name",children:(0,e.jsx)("div",{className:"skeleton-name-bar"})}),(0,e.jsx)("div",{className:"skeleton-score",children:(0,e.jsx)("div",{className:"skeleton-score-bar"})})]},v))})}):w?(0,e.jsxs)(r.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:w}),(0,e.jsx)("button",{onClick:b,children:"Retry"})]}):h.length===0?(0,e.jsx)(r.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsxs)("div",{className:"empty-content",children:[(0,e.jsx)(g,{className:"empty-icon",size:32}),(0,e.jsx)("p",{className:"empty-title",children:"No rankings yet"}),(0,e.jsx)("p",{className:"empty-subtitle",children:"Be the first to analyze wallets and claim the top spot!"}),(0,e.jsx)("button",{className:"empty-cta",onClick:()=>window.location.href="/app",children:"Start Analyzing"})]})}):(0,e.jsx)(r.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:h.map((t,v)=>(0,e.jsxs)(r.div,{className:`leaderboard-entry ${t.isCurrentUser?"current-user":""} rank-${t.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:v*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:T(t.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:t.displayName||E(t.userId)}),t.change!==0&&(0,e.jsxs)("span",{className:`change ${t.change>0?"up":"down"}`,children:[(0,e.jsx)(O,{size:12}),Math.abs(t.change)]})]}),P&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:t.score.toLocaleString()}),(0,e.jsx)("span",{className:"label",children:_()})]})]},t.userId))})}),(0,e.jsxs)("div",{className:"leaderboard-footer",children:[(0,e.jsx)("span",{className:"powered-by",children:"Powered by"}),(0,e.jsx)("strong",{children:"Torque"}),(0,e.jsx)(z,{size:12})]}),(0,e.jsx)("style",{children:`
        .torque-leaderboard {
          background: var(--color-bg-elevated);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--color-border);
        }

        .leaderboard-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .leaderboard-footer strong {
          color: var(--color-accent);
        }

        .leaderboard-footer svg {
          color: var(--color-warning);
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
      `})]})}var he=de.map(c=>c.href==="/rewards"?{...c,active:!0}:c),k=[{id:"top-analyzer",title:"Top Analyzer Championship",description:"Most wallets analyzed wins the biggest equity share",icon:D,color:"#f59e0b",reward:"2.7%",type:"leaderboard",participants:847,endsIn:null,prize:[{place:"1st",amount:"1.5%",icon:R},{place:"2nd",amount:"0.75%",icon:j},{place:"3rd",amount:"0.35%",icon:j}]},{id:"sybil-hunter",title:"Sybil Hunter League",description:"Detect the most sybil attacks and earn equity",icon:ee,color:"#ef4444",reward:"1.75%",type:"leaderboard",participants:523,endsIn:"Weekly",prize:[{place:"1st",amount:"1.0%",icon:R},{place:"2nd",amount:"0.5%",icon:j},{place:"3rd",amount:"0.25%",icon:j}]},{id:"early-adopter",title:"Early Adopter Rewards",description:"First 50 users to analyze wallets get equity rewards",icon:H,color:"#8b5cf6",reward:"0.5%",type:"raffle",participants:42,endsIn:"Open",prize:[{place:"Winners",amount:"0.01% each",icon:U}]},{id:"streak",title:"Active Analyst Streak",description:"Maintain a 7-day analysis streak for weekly rewards",icon:te,color:"#f97316",reward:"0.5%",type:"streak",participants:189,endsIn:"Weekly",prize:[{place:"5 winners",amount:"0.1% each",icon:V}]},{id:"referral",title:"Referral Program",description:"Invite friends and earn equity for both of you",icon:re,color:"#10b981",reward:"0.3%",type:"referral",participants:134,endsIn:"Always",prize:[{place:"Referrer",amount:"0.15%",icon:L},{place:"Referee",amount:"0.10%",icon:L}]}],me=[{label:"Total Equity Pool",value:"5%",icon:A},{label:"Active Participants",value:"—",icon:I},{label:"Events Tracked",value:"—",icon:z},{label:"Rewards Claimed",value:"0%",icon:V}],F=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:D,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:Y,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:O,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:ie,gradient:"from-blue-500 to-cyan-500"}],xe=[{action:"Analyze a wallet",event:"wallet_analyzed",points:10,description:"Per wallet analyzed"},{action:"First analysis",event:"first_analysis",points:100,description:"One-time bonus"},{action:"Detect sybil attack",event:"sybil_detected",points:50,description:"Per sybil cluster identified"},{action:"Compare wallets",event:"compare_wallets",points:20,description:"Per comparison"},{action:"Analyze contract",event:"contract_analyzed",points:15,description:"Per contract analyzed"},{action:"Share on X",event:"share_on_twitter",points:25,description:"One-time bonus"},{action:"Refer a friend",event:"invite_friend",points:30,description:"Per successful referral"}];function Ne(){const c=ne(),{user:q}=oe(),{theme:P}=le(),[y,h]=(0,n.useState)("campaigns"),[d,p]=(0,n.useState)("top-analyzer"),[S,C]=(0,n.useState)(!1),[m,w]=(0,n.useState)({totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"}),[u,b]=(0,n.useState)({}),[E,T]=(0,n.useState)(null),[_,t]=(0,n.useState)(""),[v,N]=(0,n.useState)([]),[G,$]=(0,n.useState)(!1),M=(0,n.useRef)(null),Q=async a=>{if(t(a),!a.trim()){N([]);return}$(!0);try{const s=k.filter(i=>i.title.toLowerCase().includes(a.toLowerCase())||i.description.toLowerCase().includes(a.toLowerCase())).map(i=>({type:"campaign",id:i.id,title:i.title,subtitle:i.description}));let o=[];if(d)try{const i=await fetch(`/api/torque/leaderboard/${d}`);if(i.ok){const x=await i.json(),f=a.toLowerCase();o=(x.entries||[]).filter(l=>l.userId.toLowerCase().includes(f)||l.displayName&&l.displayName.toLowerCase().includes(f)).slice(0,5).map(l=>({type:"user",id:l.userId,title:l.displayName||l.userId,subtitle:`Rank #${l.rank} - ${l.score} points`}))}}catch{}N([...s,...o])}catch{N([])}finally{$(!1)}},Z=a=>{t(""),N([]),a.type==="campaign"?(p(a.id),h("leaderboard")):(d||p("top-analyzer"),h("leaderboard")),setTimeout(()=>{M.current?.scrollIntoView({behavior:"smooth",block:"start"})},100)};return(0,n.useEffect)(()=>{const a=async()=>{const o=localStorage.getItem("fundtracer_token");try{const i=await fetch("/api/torque/overall-stats");i.ok&&w(await i.json());for(const x of["top-analyzer","sybil-hunter","early-adopter","streak","referral"]){const f=await fetch(`/api/torque/campaign-stats/${x}`);if(f.ok){const l=await f.json();b(J=>({...J,[x]:l}))}}if(o){const x=await fetch("/api/torque/stats",{headers:o?{Authorization:`Bearer ${o}`}:{}});x.ok&&T((await x.json()).stats)}}catch(i){console.error("[RewardsPage] Failed to fetch stats:",i)}};a();const s=setInterval(a,1e4);return()=>clearInterval(s)},[]),(0,e.jsx)(ce,{navItems:he,onSearch:Q,onSearchSelect:Z,searchResults:v,searchLoading:G,showSearch:!0,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,s)=>(0,e.jsx)(r.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:A,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},s))})]}),(0,e.jsxs)(r.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(r.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(U,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(r.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(r.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(r.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(r.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>c("/app-evm"),children:[(0,e.jsx)(z,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(r.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>h("leaderboard"),children:[(0,e.jsx)(g,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(r.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:me.map((a,s)=>{let o=a.value;return a.label==="Active Participants"&&m.activeParticipants>0?o=m.activeParticipants.toLocaleString():a.label==="Events Tracked"&&m.eventsTracked>0?o=m.eventsTracked.toLocaleString():a.label==="Rewards Claimed"&&(o=m.rewardsClaimed),(0,e.jsxs)(r.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+s*.1},children:[(0,e.jsx)("div",{className:"stat-icon",children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:o}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label)})})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:F.map((a,s)=>(0,e.jsxs)(r.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:s*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),s<F.length-1&&(0,e.jsx)(r.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:A,duration:1.5},children:(0,e.jsx)(W,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"rewards-table-section",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How Rewards Are Calculated"}),(0,e.jsx)("p",{className:"rewards-intro",children:"Earn points for every action on FundTracer. Points determine your rank on leaderboards."}),(0,e.jsx)("div",{className:"rewards-table-wrapper",children:(0,e.jsxs)("table",{className:"rewards-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Action"}),(0,e.jsx)("th",{children:"Points"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsx)("tbody",{children:xe.map((a,s)=>(0,e.jsxs)(r.tr,{initial:{opacity:0,x:-20},whileInView:{opacity:1,x:0},viewport:{once:!0},transition:{delay:s*.05},children:[(0,e.jsx)("td",{children:a.action}),(0,e.jsx)("td",{className:"points-cell",children:(0,e.jsxs)("span",{className:"points-badge",children:["+",a.points]})}),(0,e.jsx)("td",{children:a.description})]},a.event))})]})}),(0,e.jsxs)("div",{className:"torque-badge",children:[(0,e.jsx)("span",{children:"Powered by"}),(0,e.jsx)("strong",{children:"Torque"}),(0,e.jsx)(z,{size:14})]})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsxs)("div",{className:"campaigns-tabs",children:[["campaigns","leaderboard"].map(a=>(0,e.jsxs)(r.button,{className:`tab-btn ${y===a?"active":""}`,onClick:()=>h(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(L,{size:16}),a==="leaderboard"&&(0,e.jsx)(g,{size:16}),a.replace("-"," ").replace(/\b\w/g,s=>s.toUpperCase())]},a)),(0,e.jsxs)(r.button,{className:"tab-btn",onClick:()=>window.open("/app-evm?tab=settings#torque-stats","_blank"),whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,e.jsx)(I,{size:16}),"My Stats"]})]}),(0,e.jsxs)(B,{mode:"wait",children:[y==="campaigns"&&(0,e.jsx)(r.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:k.map((a,s)=>(0,e.jsxs)(r.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:s*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(I,{size:14}),(0,e.jsxs)("span",{children:[u[a.id]?.participants||"—"," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((o,i)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(o.icon,{size:14}),(0,e.jsx)("span",{children:o.place}),(0,e.jsx)("strong",{children:o.amount})]},i))}),(0,e.jsxs)(r.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>p(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(W,{size:16})]})]},a.id))}),y==="leaderboard"&&(0,e.jsxs)(r.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},ref:M,children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards & Campaigns"}),(0,e.jsx)("div",{className:"leaderboard-list",children:k.map((a,s)=>(0,e.jsxs)(r.div,{className:`leaderboard-card ${d===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:s*.1},onClick:()=>p(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(g,{size:20,style:{color:s===0?"#f59e0b":s===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[u[a.id]?.participants||"—"," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:d?(0,e.jsx)(pe,{campaignId:d,title:k.find(a=>a.id===d)?.title||"Leaderboard",showPoints:!0,refreshInterval:1e4}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(g,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(r.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(r.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>c("/app-evm"),children:[(0,e.jsx)(H,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{Ne as default};
