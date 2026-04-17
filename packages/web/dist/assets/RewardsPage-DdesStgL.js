import{o as V}from"./rolldown-runtime-MddlTo9B.js";import{An as L,Bn as P,Dn as E,Dr as b,Fn as R,Hn as M,Hr as $,Jn as A,Mr as q,Nn as D,Pn as u,Rn as C,Un as W,Vn as B,_r as v,kn as z,nr as x,or as O,ou as G,qn as _,ur as S,vr as H,xu as J,yu as Y}from"./vendor-PMpPQw2V.js";import{t as r}from"./proxy-Bbp7pKkD.js";import{t as U}from"./AnimatePresence-MOlCFjyM.js";import{n as X}from"./AuthContext-BkAcRAGd.js";import{n as Z}from"./ThemeContext-DigPrXo-.js";import{t as K}from"./LandingLayout-bBC9H9cK.js";import{t as Q}from"./navigation-BjAQwCbH.js";var l=V(J(),1),e=G();function ee({campaignId:n,title:g="Leaderboard",showPoints:T=!0,refreshInterval:o=3e4}){const[y,d]=(0,l.useState)([]),[p,f]=(0,l.useState)(!0),[N,c]=(0,l.useState)(null),[j,h]=(0,l.useState)(null),m=async()=>{try{const s=await fetch(`/api/torque/leaderboard/${n}`);if(!s.ok){h((await s.json().catch(()=>({}))).error||"Failed to fetch leaderboard"),f(!1);return}d((await s.json()).entries||[]),c(new Date),h(null)}catch(s){h("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",s)}finally{f(!1)}};(0,l.useEffect)(()=>{m();const s=setInterval(m,o);return()=>clearInterval(s)},[n,o]);const a=s=>s?`${s.slice(0,6)}...${s.slice(-4)}`:"Unknown",i=s=>{switch(s){case 1:return(0,e.jsx)(b,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(x,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(x,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:s})}},t=()=>{switch(n){case"sybil-hunter":return"Sybils Found";case"top-analyzer":return"Wallets Analyzed";case"streak":return"Day Streak";default:return"Points"}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(u,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:g})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:m,disabled:p,children:(0,e.jsx)(A,{className:p?"spinning":"",size:16})})]}),N&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",N.toLocaleTimeString()]}),(0,e.jsx)(U,{mode:"wait",children:p?(0,e.jsxs)(r.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)(A,{className:"spinning",size:24}),(0,e.jsx)("span",{children:"Loading leaderboard..."})]}):j?(0,e.jsxs)(r.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:j}),(0,e.jsx)("button",{onClick:m,children:"Retry"})]}):y.length===0?(0,e.jsx)(r.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("p",{children:"No data yet. Be the first to analyze!"})}):(0,e.jsx)(r.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:y.map((s,w)=>(0,e.jsxs)(r.div,{className:`leaderboard-entry ${s.isCurrentUser?"current-user":""} rank-${s.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:w*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:i(s.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:a(s.userId)}),s.change!==0&&(0,e.jsxs)("span",{className:`change ${s.change>0?"up":"down"}`,children:[(0,e.jsx)(R,{size:12}),Math.abs(s.change)]})]}),T&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:s.score.toLocaleString()}),(0,e.jsx)("span",{className:"label",children:t()})]})]},s.userId))})}),(0,e.jsx)("style",{children:`
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
      `})]})}var ae=Q.map(n=>n.href==="/rewards"?{...n,active:!0}:n),k=[{id:"top-analyzer",title:"Top Analyzer Championship",description:"Most wallets analyzed wins the biggest equity share",icon:C,color:"#f59e0b",reward:"2.7%",type:"leaderboard",participants:847,endsIn:null,prize:[{place:"1st",amount:"1.5%",icon:b},{place:"2nd",amount:"0.75%",icon:x},{place:"3rd",amount:"0.35%",icon:x}]},{id:"sybil-hunter",title:"Sybil Hunter League",description:"Detect the most sybil attacks and earn equity",icon:M,color:"#ef4444",reward:"1.75%",type:"leaderboard",participants:523,endsIn:"Weekly",prize:[{place:"1st",amount:"1.0%",icon:b},{place:"2nd",amount:"0.5%",icon:x},{place:"3rd",amount:"0.25%",icon:x}]},{id:"early-adopter",title:"Early Adopter Rewards",description:"First 50 users to analyze wallets get equity rewards",icon:_,color:"#8b5cf6",reward:"0.5%",type:"raffle",participants:42,endsIn:"Open",prize:[{place:"Winners",amount:"0.01% each",icon:P}]},{id:"streak",title:"Active Analyst Streak",description:"Maintain a 7-day analysis streak for weekly rewards",icon:H,color:"#f97316",reward:"0.5%",type:"streak",participants:189,endsIn:"Weekly",prize:[{place:"5 winners",amount:"0.1% each",icon:$}]},{id:"viral",title:"Viral Share Bonus",description:"Share your analysis on X and earn equity",icon:W,color:"#06b6d4",reward:"0.25%",type:"instant",participants:76,endsIn:"Always",prize:[{place:"Per share",amount:"0.05%",icon:v}]},{id:"referral",title:"Referral Program",description:"Invite friends and earn equity for both of you",icon:L,color:"#10b981",reward:"0.3%",type:"referral",participants:134,endsIn:"Always",prize:[{place:"Referrer",amount:"0.15%",icon:v},{place:"Referee",amount:"0.10%",icon:v}]}],se=[{label:"Total Equity Pool",value:"5%",icon:S},{label:"Active Participants",value:"—",icon:z},{label:"Events Tracked",value:"—",icon:E},{label:"Rewards Claimed",value:"0%",icon:$}],I=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:C,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:B,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:R,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:O,gradient:"from-blue-500 to-cyan-500"}];function pe(){const n=Y(),{user:g}=X(),{theme:T}=Z(),[o,y]=(0,l.useState)("campaigns"),[d,p]=(0,l.useState)(null),[f,N]=(0,l.useState)(!1),[c,j]=(0,l.useState)({totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"}),[h,m]=(0,l.useState)({});return(0,l.useEffect)(()=>{(async()=>{try{const i=await fetch("/api/torque/overall-stats");i.ok&&j(await i.json());for(const t of["top-analyzer","sybil-hunter","early-adopter","streak","viral","referral"]){const s=await fetch(`/api/torque/campaign-stats/${t}`);if(s.ok){const w=await s.json();m(F=>({...F,[t]:w}))}}}catch(i){console.error("[RewardsPage] Failed to fetch stats:",i)}})()},[]),(0,e.jsx)(K,{navItems:ae,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,i)=>(0,e.jsx)(r.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:S,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},i))})]}),(0,e.jsxs)(r.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(r.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(P,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(r.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(r.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(r.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(r.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/app-evm"),children:[(0,e.jsx)(E,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(r.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>y("leaderboard"),children:[(0,e.jsx)(u,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(r.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:se.map((a,i)=>{let t=a.value;return a.label==="Active Participants"&&c.activeParticipants>0?t=c.activeParticipants.toLocaleString():a.label==="Events Tracked"&&c.eventsTracked>0?t=c.eventsTracked.toLocaleString():a.label==="Rewards Claimed"&&(t=c.rewardsClaimed),(0,e.jsxs)(r.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+i*.1},children:[(0,e.jsx)("div",{className:"stat-icon",children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:t}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label)})})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:I.map((a,i)=>(0,e.jsxs)(r.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:i*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),i<I.length-1&&(0,e.jsx)(r.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:S,duration:1.5},children:(0,e.jsx)(q,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(r.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsx)("div",{className:"campaigns-tabs",children:["campaigns","leaderboard","my-stats"].map(a=>(0,e.jsxs)(r.button,{className:`tab-btn ${o===a?"active":""}`,onClick:()=>y(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(v,{size:16}),a==="leaderboard"&&(0,e.jsx)(u,{size:16}),a==="my-stats"&&(0,e.jsx)(z,{size:16}),a.replace("-"," ").replace(/\b\w/g,i=>i.toUpperCase())]},a))}),(0,e.jsxs)(U,{mode:"wait",children:[o==="campaigns"&&(0,e.jsx)(r.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:k.map((a,i)=>(0,e.jsxs)(r.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:i*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(z,{size:14}),(0,e.jsxs)("span",{children:[h[a.id]?.participants||"—"," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((t,s)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(t.icon,{size:14}),(0,e.jsx)("span",{children:t.place}),(0,e.jsx)("strong",{children:t.amount})]},s))}),(0,e.jsxs)(r.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>p(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(q,{size:16})]})]},a.id))}),o==="leaderboard"&&(0,e.jsxs)(r.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards"}),(0,e.jsx)("div",{className:"leaderboard-list",children:k.filter(a=>a.type==="leaderboard").map((a,i)=>(0,e.jsxs)(r.div,{className:`leaderboard-card ${d===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:i*.1},onClick:()=>p(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(u,{size:20,style:{color:i===0?"#f59e0b":i===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[h[a.id]?.participants||"—"," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:d?(0,e.jsx)(ee,{campaignId:d,title:k.find(a=>a.id===d)?.title||"Leaderboard",showPoints:!0}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(u,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]}),o==="my-stats"&&(0,e.jsx)(r.div,{className:"my-stats-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:g?(0,e.jsxs)("div",{className:"user-stats-grid",children:[(0,e.jsxs)("div",{className:"user-stat-card highlight",children:[(0,e.jsxs)("div",{className:"stat-header",children:[(0,e.jsx)(b,{size:24}),(0,e.jsx)("h3",{children:"Your Progress"})]}),(0,e.jsxs)("div",{className:"stat-main",children:[(0,e.jsx)("span",{className:"big-number",children:"0"}),(0,e.jsx)("span",{className:"stat-unit",children:"points"})]}),(0,e.jsxs)("div",{className:"stat-rank",children:[(0,e.jsx)("span",{children:"#--"}),(0,e.jsx)("span",{children:"global rank"})]})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(H,{size:24}),(0,e.jsx)("h3",{children:"Current Streak"}),(0,e.jsxs)("div",{className:"streak-display",children:[(0,e.jsx)("span",{className:"streak-days",children:"0"}),(0,e.jsx)("span",{className:"streak-label",children:"days"})]})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(C,{size:24}),(0,e.jsx)("h3",{children:"Wallets Analyzed"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(M,{size:24}),(0,e.jsx)("h3",{children:"Sybils Detected"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(W,{size:24}),(0,e.jsx)("h3",{children:"Social Shares"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(L,{size:24}),(0,e.jsx)("h3",{children:"Referrals"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]})]}):(0,e.jsxs)("div",{className:"login-prompt",children:[(0,e.jsx)(D,{size:48}),(0,e.jsx)("h3",{children:"Sign In to Track Progress"}),(0,e.jsx)("p",{children:"Connect your wallet to track your rewards and climb the leaderboards"}),(0,e.jsx)(r.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/auth"),children:"Sign In"})]})})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(r.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(r.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/app-evm"),children:[(0,e.jsx)(_,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{pe as default};
