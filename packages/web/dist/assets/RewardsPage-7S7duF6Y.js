import{o as O}from"./rolldown-runtime-MddlTo9B.js";import{An as R,Bn as E,Dn as M,Dr as g,Fn as $,Hn as _,Hr as U,Jn as I,Mr as L,Nn as G,Pn as j,Rn as T,Un as W,Vn as J,_r as b,kn as S,nr as y,or as Y,ou as X,qn as H,ur as C,vr as F,xu as Z,yu as K}from"./vendor-PMpPQw2V.js";import{t as r}from"./proxy-Bbp7pKkD.js";import{t as V}from"./AnimatePresence-MOlCFjyM.js";import{n as Q}from"./AuthContext-BkAcRAGd.js";import{n as ee}from"./ThemeContext-DigPrXo-.js";import{t as ae}from"./LandingLayout-bBC9H9cK.js";import{t as se}from"./navigation-BjAQwCbH.js";var t=O(Z(),1),e=X();function re({campaignId:n,title:f="Leaderboard",showPoints:A=!0,refreshInterval:o=3e4}){const[u,p]=(0,t.useState)([]),[h,N]=(0,t.useState)(!0),[w,c]=(0,t.useState)(null),[v,m]=(0,t.useState)(null),x=async()=>{try{const s=await fetch(`/api/torque/leaderboard/${n}`);if(!s.ok){m((await s.json().catch(()=>({}))).error||"Failed to fetch leaderboard"),N(!1);return}p((await s.json()).entries||[]),c(new Date),m(null)}catch(s){m("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",s)}finally{N(!1)}};(0,t.useEffect)(()=>{x();const s=setInterval(x,o);return()=>clearInterval(s)},[n,o]);const l=s=>s?`${s.slice(0,6)}...${s.slice(-4)}`:"Unknown",k=s=>{switch(s){case 1:return(0,e.jsx)(g,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(y,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(y,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:s})}},a=()=>{switch(n){case"sybil-hunter":return"Sybils Found";case"top-analyzer":return"Wallets Analyzed";case"streak":return"Day Streak";default:return"Points"}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(j,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:f})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:x,disabled:h,children:(0,e.jsx)(I,{className:h?"spinning":"",size:16})})]}),w&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",w.toLocaleTimeString()]}),(0,e.jsx)(V,{mode:"wait",children:h?(0,e.jsxs)(r.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)(I,{className:"spinning",size:24}),(0,e.jsx)("span",{children:"Loading leaderboard..."})]}):v?(0,e.jsxs)(r.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:v}),(0,e.jsx)("button",{onClick:x,children:"Retry"})]}):u.length===0?(0,e.jsx)(r.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("p",{children:"No data yet. Be the first to analyze!"})}):(0,e.jsx)(r.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:u.map((s,i)=>(0,e.jsxs)(r.div,{className:`leaderboard-entry ${s.isCurrentUser?"current-user":""} rank-${s.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:i*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:k(s.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:s.displayName||l(s.userId)}),s.change!==0&&(0,e.jsxs)("span",{className:`change ${s.change>0?"up":"down"}`,children:[(0,e.jsx)($,{size:12}),Math.abs(s.change)]})]}),A&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:s.score.toLocaleString()}),(0,e.jsx)("span",{className:"label",children:a()})]})]},s.userId))})}),(0,e.jsx)("style",{children:`
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
      `})]})}var ie=se.map(n=>n.href==="/rewards"?{...n,active:!0}:n),z=[{id:"top-analyzer",title:"Top Analyzer Championship",description:"Most wallets analyzed wins the biggest equity share",icon:T,color:"#f59e0b",reward:"2.7%",type:"leaderboard",participants:847,endsIn:null,prize:[{place:"1st",amount:"1.5%",icon:g},{place:"2nd",amount:"0.75%",icon:y},{place:"3rd",amount:"0.35%",icon:y}]},{id:"sybil-hunter",title:"Sybil Hunter League",description:"Detect the most sybil attacks and earn equity",icon:_,color:"#ef4444",reward:"1.75%",type:"leaderboard",participants:523,endsIn:"Weekly",prize:[{place:"1st",amount:"1.0%",icon:g},{place:"2nd",amount:"0.5%",icon:y},{place:"3rd",amount:"0.25%",icon:y}]},{id:"early-adopter",title:"Early Adopter Rewards",description:"First 50 users to analyze wallets get equity rewards",icon:H,color:"#8b5cf6",reward:"0.5%",type:"raffle",participants:42,endsIn:"Open",prize:[{place:"Winners",amount:"0.01% each",icon:E}]},{id:"streak",title:"Active Analyst Streak",description:"Maintain a 7-day analysis streak for weekly rewards",icon:F,color:"#f97316",reward:"0.5%",type:"streak",participants:189,endsIn:"Weekly",prize:[{place:"5 winners",amount:"0.1% each",icon:U}]},{id:"viral",title:"Viral Share Bonus",description:"Share your analysis on X and earn equity",icon:W,color:"#06b6d4",reward:"0.25%",type:"instant",participants:76,endsIn:"Always",prize:[{place:"Per share",amount:"0.05%",icon:b}]},{id:"referral",title:"Referral Program",description:"Invite friends and earn equity for both of you",icon:R,color:"#10b981",reward:"0.3%",type:"referral",participants:134,endsIn:"Always",prize:[{place:"Referrer",amount:"0.15%",icon:b},{place:"Referee",amount:"0.10%",icon:b}]}],te=[{label:"Total Equity Pool",value:"5%",icon:C},{label:"Active Participants",value:"—",icon:S},{label:"Events Tracked",value:"—",icon:M},{label:"Rewards Claimed",value:"0%",icon:U}],P=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:T,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:J,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:$,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:Y,gradient:"from-blue-500 to-cyan-500"}];function xe(){const n=K(),{user:f}=Q(),{theme:A}=ee(),[o,u]=(0,t.useState)("campaigns"),[p,h]=(0,t.useState)(null),[N,w]=(0,t.useState)(!1),[c,v]=(0,t.useState)({totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"}),[m,x]=(0,t.useState)({}),[l,k]=(0,t.useState)(null);return(0,t.useEffect)(()=>{(async()=>{const s=localStorage.getItem("fundtracer_token");try{const i=await fetch("/api/torque/overall-stats");i.ok&&v(await i.json());for(const d of["top-analyzer","sybil-hunter","early-adopter","streak","viral","referral"]){const q=await fetch(`/api/torque/campaign-stats/${d}`);if(q.ok){const D=await q.json();x(B=>({...B,[d]:D}))}}if(s){const d=await fetch("/api/torque/stats",{headers:s?{Authorization:`Bearer ${s}`}:{}});d.ok&&k((await d.json()).stats)}}catch(i){console.error("[RewardsPage] Failed to fetch stats:",i)}})()},[]),(0,e.jsx)(ae,{navItems:ie,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,s)=>(0,e.jsx)(r.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:C,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},s))})]}),(0,e.jsxs)(r.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(r.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(E,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(r.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(r.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(r.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(r.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/app-evm"),children:[(0,e.jsx)(M,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(r.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>u("leaderboard"),children:[(0,e.jsx)(j,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(r.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:te.map((a,s)=>{let i=a.value;return a.label==="Active Participants"&&c.activeParticipants>0?i=c.activeParticipants.toLocaleString():a.label==="Events Tracked"&&c.eventsTracked>0?i=c.eventsTracked.toLocaleString():a.label==="Rewards Claimed"&&(i=c.rewardsClaimed),(0,e.jsxs)(r.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+s*.1},children:[(0,e.jsx)("div",{className:"stat-icon",children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:i}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label)})})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:P.map((a,s)=>(0,e.jsxs)(r.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:s*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),s<P.length-1&&(0,e.jsx)(r.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:C,duration:1.5},children:(0,e.jsx)(L,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsx)("div",{className:"campaigns-tabs",children:["campaigns","leaderboard","my-stats"].map(a=>(0,e.jsxs)(r.button,{className:`tab-btn ${o===a?"active":""}`,onClick:()=>u(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(b,{size:16}),a==="leaderboard"&&(0,e.jsx)(j,{size:16}),a==="my-stats"&&(0,e.jsx)(S,{size:16}),a.replace("-"," ").replace(/\b\w/g,s=>s.toUpperCase())]},a))}),(0,e.jsxs)(V,{mode:"wait",children:[o==="campaigns"&&(0,e.jsx)(r.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:z.map((a,s)=>(0,e.jsxs)(r.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:s*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(S,{size:14}),(0,e.jsxs)("span",{children:[m[a.id]?.participants||"—"," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((i,d)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(i.icon,{size:14}),(0,e.jsx)("span",{children:i.place}),(0,e.jsx)("strong",{children:i.amount})]},d))}),(0,e.jsxs)(r.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>h(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(L,{size:16})]})]},a.id))}),o==="leaderboard"&&(0,e.jsxs)(r.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards"}),(0,e.jsx)("div",{className:"leaderboard-list",children:z.filter(a=>a.type==="leaderboard").map((a,s)=>(0,e.jsxs)(r.div,{className:`leaderboard-card ${p===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:s*.1},onClick:()=>h(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(j,{size:20,style:{color:s===0?"#f59e0b":s===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[m[a.id]?.participants||"—"," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:p?(0,e.jsx)(re,{campaignId:p,title:z.find(a=>a.id===p)?.title||"Leaderboard",showPoints:!0}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(j,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]}),o==="my-stats"&&(0,e.jsx)(r.div,{className:"my-stats-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:f&&l?(0,e.jsxs)("div",{className:"user-stats-grid",children:[(0,e.jsxs)("div",{className:"user-stat-card highlight",children:[(0,e.jsxs)("div",{className:"stat-header",children:[(0,e.jsx)(g,{size:24}),(0,e.jsx)("h3",{children:"Your Progress"})]}),(0,e.jsxs)("div",{className:"stat-main",children:[(0,e.jsx)("span",{className:"big-number",children:l.points}),(0,e.jsx)("span",{className:"stat-unit",children:"points"})]}),(0,e.jsxs)("div",{className:"stat-rank",children:[(0,e.jsxs)("span",{children:["#",l.rank||"—"]}),(0,e.jsx)("span",{children:"global rank"})]})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(F,{size:24}),(0,e.jsx)("h3",{children:"Current Streak"}),(0,e.jsxs)("div",{className:"streak-display",children:[(0,e.jsx)("span",{className:"streak-days",children:l.streak}),(0,e.jsx)("span",{className:"streak-label",children:"days"})]})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(T,{size:24}),(0,e.jsx)("h3",{children:"Wallets Analyzed"}),(0,e.jsx)("span",{className:"stat-value",children:Math.floor(l.points/10)})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(_,{size:24}),(0,e.jsx)("h3",{children:"Sybils Detected"}),(0,e.jsx)("span",{className:"stat-value",children:Math.floor(l.points/50)})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(W,{size:24}),(0,e.jsx)("h3",{children:"Social Shares"}),(0,e.jsx)("span",{className:"stat-value",children:"—"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(R,{size:24}),(0,e.jsx)("h3",{children:"Referrals"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]})]}):(0,e.jsxs)("div",{className:"login-prompt",children:[(0,e.jsx)(G,{size:48}),(0,e.jsx)("h3",{children:"Sign In to Track Progress"}),(0,e.jsx)("p",{children:"Connect your wallet to track your rewards and climb the leaderboards"}),(0,e.jsx)(r.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/auth"),children:"Sign In"})]})})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(r.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(r.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/app-evm"),children:[(0,e.jsx)(H,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{xe as default};
