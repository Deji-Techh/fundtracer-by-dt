import{o as _}from"./rolldown-runtime-MddlTo9B.js";import{An as C,Bn as q,Dn as I,Dr as b,Fn as T,Hn as L,Hr as R,Jn as z,Mr as S,Nn as V,Pn as h,Rn as w,Un as E,Vn as D,_r as j,kn as f,nr as d,or as B,ou as J,qn as P,ur as N,vr as $,xu as O,yu as Y}from"./vendor-PMpPQw2V.js";import{t as s}from"./proxy-Bbp7pKkD.js";import{t as M}from"./AnimatePresence-MOlCFjyM.js";import{n as G}from"./AuthContext-BkAcRAGd.js";import{t as K}from"./LandingLayout-bBC9H9cK.js";var t=_(O(),1),e=J();function Q({campaignId:n,title:v="Leaderboard",showPoints:o=!0,refreshInterval:p=3e4}){const[l,m]=(0,t.useState)([]),[x,k]=(0,t.useState)(!0),[a,i]=(0,t.useState)(null),[c,y]=(0,t.useState)(null),u=async()=>{try{const r=await fetch(`/api/torque/leaderboard/${n}`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!r.ok)throw new Error("Failed to fetch leaderboard");m((await r.json()).entries||[]),i(new Date),y(null)}catch(r){y("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",r)}finally{k(!1)}};(0,t.useEffect)(()=>{u();const r=setInterval(u,p);return()=>clearInterval(r)},[n,p]);const W=r=>r?`${r.slice(0,6)}...${r.slice(-4)}`:"Unknown",H=r=>{switch(r){case 1:return(0,e.jsx)(b,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(d,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(d,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:r})}},F=()=>{switch(n){case"sybil-hunter":return"Sybils Found";case"top-analyzer":return"Wallets Analyzed";case"streak":return"Day Streak";default:return"Points"}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(h,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:v})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:u,disabled:x,children:(0,e.jsx)(z,{className:x?"spinning":"",size:16})})]}),a&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",a.toLocaleTimeString()]}),(0,e.jsx)(M,{mode:"wait",children:x?(0,e.jsxs)(s.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)(z,{className:"spinning",size:24}),(0,e.jsx)("span",{children:"Loading leaderboard..."})]}):c?(0,e.jsxs)(s.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:c}),(0,e.jsx)("button",{onClick:u,children:"Retry"})]}):l.length===0?(0,e.jsx)(s.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("p",{children:"No data yet. Be the first to analyze!"})}):(0,e.jsx)(s.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:l.map((r,U)=>(0,e.jsxs)(s.div,{className:`leaderboard-entry ${r.isCurrentUser?"current-user":""} rank-${r.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:U*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:H(r.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:W(r.userId)}),r.change!==0&&(0,e.jsxs)("span",{className:`change ${r.change>0?"up":"down"}`,children:[(0,e.jsx)(T,{size:12}),Math.abs(r.change)]})]}),o&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:r.score.toLocaleString()}),(0,e.jsx)("span",{className:"label",children:F()})]})]},r.userId))})}),(0,e.jsx)("style",{children:`
        .torque-leaderboard {
          background: var(--color-bg-elevated, #1a1a2e);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--color-surface-border, #333);
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
        }

        .trophy-icon {
          color: #fbbf24;
        }

        .refresh-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: var(--color-bg-tertiary, #2a2a3e);
          color: var(--color-text-primary, #fff);
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
          color: var(--color-text-muted, #666);
          margin-bottom: 12px;
        }

        .leaderboard-loading,
        .leaderboard-error,
        .leaderboard-empty {
          text-align: center;
          padding: 24px;
          color: var(--color-text-muted, #666);
        }

        .leaderboard-error button {
          margin-top: 8px;
          padding: 8px 16px;
          background: var(--color-primary, #3b82f6);
          color: white;
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
          background: var(--color-bg-tertiary, #252538);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .leaderboard-entry:hover {
          background: var(--color-bg-quaternary, #2d2d44);
        }

        .leaderboard-entry.current-user {
          border: 1px solid var(--color-primary, #3b82f6);
        }

        .leaderboard-entry.rank-1 {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
        }

        .leaderboard-entry.rank-2 {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, rgba(192, 192, 192, 0.02) 100%);
        }

        .leaderboard-entry.rank-3 {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, rgba(205, 127, 50, 0.02) 100%);
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
          color: var(--color-text-muted, #666);
        }

        .entry-address {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .entry-address .address {
          font-family: var(--font-mono, monospace);
          font-size: 13px;
          color: var(--color-text-primary, #fff);
        }

        .entry-address .change {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
        }

        .entry-address .change.up {
          color: var(--color-success, #10b981);
        }

        .entry-address .change.down {
          color: var(--color-danger, #ef4444);
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
          color: var(--color-text-primary, #fff);
        }

        .entry-score .label {
          font-size: 10px;
          color: var(--color-text-muted, #666);
          text-transform: uppercase;
        }
      `})]})}var X=[{label:"About",href:"/about"},{label:"Features",href:"/features"},{label:"Pricing",href:"/pricing"},{label:"Rewards",href:"/rewards",active:!0},{label:"How It Works",href:"/how-it-works"},{label:"FAQ",href:"/faq"},{label:"API",href:"/api-docs"}],g=[{id:"top-analyzer",title:"Top Analyzer Championship",description:"Most wallets analyzed wins the biggest equity share",icon:w,color:"#f59e0b",reward:"2.7%",type:"leaderboard",participants:847,endsIn:null,prize:[{place:"1st",amount:"1.5%",icon:b},{place:"2nd",amount:"0.75%",icon:d},{place:"3rd",amount:"0.35%",icon:d}]},{id:"sybil-hunter",title:"Sybil Hunter League",description:"Detect the most sybil attacks and earn equity",icon:L,color:"#ef4444",reward:"1.75%",type:"leaderboard",participants:523,endsIn:"Weekly",prize:[{place:"1st",amount:"1.0%",icon:b},{place:"2nd",amount:"0.5%",icon:d},{place:"3rd",amount:"0.25%",icon:d}]},{id:"early-adopter",title:"Early Adopter Rewards",description:"First 50 users to analyze wallets get equity rewards",icon:P,color:"#8b5cf6",reward:"0.5%",type:"raffle",participants:42,endsIn:"Open",prize:[{place:"Winners",amount:"0.01% each",icon:q}]},{id:"streak",title:"Active Analyst Streak",description:"Maintain a 7-day analysis streak for weekly rewards",icon:$,color:"#f97316",reward:"0.5%",type:"streak",participants:189,endsIn:"Weekly",prize:[{place:"5 winners",amount:"0.1% each",icon:R}]},{id:"viral",title:"Viral Share Bonus",description:"Share your analysis on X and earn equity",icon:E,color:"#06b6d4",reward:"0.25%",type:"instant",participants:76,endsIn:"Always",prize:[{place:"Per share",amount:"0.05%",icon:j}]},{id:"referral",title:"Referral Program",description:"Invite friends and earn equity for both of you",icon:C,color:"#10b981",reward:"0.3%",type:"referral",participants:134,endsIn:"Always",prize:[{place:"Referrer",amount:"0.15%",icon:j},{place:"Referee",amount:"0.10%",icon:j}]}],Z=[{label:"Total Equity Pool",value:"5%",icon:N,color:"#f59e0b"},{label:"Active Participants",value:"1,247",icon:f,color:"#8b5cf6"},{label:"Events Tracked",value:"48.2K",icon:I,color:"#06b6d4"},{label:"Rewards Claimed",value:"0.3%",icon:R,color:"#10b981"}],A=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:w,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:D,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:T,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:B,gradient:"from-blue-500 to-cyan-500"}];function ne(){const n=Y(),{user:v}=G(),[o,p]=(0,t.useState)("campaigns"),[l,m]=(0,t.useState)(null),[x,k]=(0,t.useState)(!1);return(0,e.jsx)(K,{navItems:X,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,i)=>(0,e.jsx)(s.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:N,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},i))})]}),(0,e.jsxs)(s.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(s.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(q,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(s.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(s.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(s.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(s.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/app-evm"),children:[(0,e.jsx)(I,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(s.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>p("leaderboard"),children:[(0,e.jsx)(h,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(s.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:Z.map((a,i)=>(0,e.jsxs)(s.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+i*.1},children:[(0,e.jsx)("div",{className:"stat-icon",style:{background:a.color},children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:a.value}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label))})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:A.map((a,i)=>(0,e.jsxs)(s.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:i*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),i<A.length-1&&(0,e.jsx)(s.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:N,duration:1.5},children:(0,e.jsx)(S,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsx)("div",{className:"campaigns-tabs",children:["campaigns","leaderboard","my-stats"].map(a=>(0,e.jsxs)(s.button,{className:`tab-btn ${o===a?"active":""}`,onClick:()=>p(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(j,{size:16}),a==="leaderboard"&&(0,e.jsx)(h,{size:16}),a==="my-stats"&&(0,e.jsx)(f,{size:16}),a.replace("-"," ").replace(/\b\w/g,i=>i.toUpperCase())]},a))}),(0,e.jsxs)(M,{mode:"wait",children:[o==="campaigns"&&(0,e.jsx)(s.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:g.map((a,i)=>(0,e.jsxs)(s.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:i*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(f,{size:14}),(0,e.jsxs)("span",{children:[a.participants," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((c,y)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(c.icon,{size:14}),(0,e.jsx)("span",{children:c.place}),(0,e.jsx)("strong",{children:c.amount})]},y))}),(0,e.jsxs)(s.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>m(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(S,{size:16})]})]},a.id))}),o==="leaderboard"&&(0,e.jsxs)(s.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards"}),(0,e.jsx)("div",{className:"leaderboard-list",children:g.filter(a=>a.type==="leaderboard").map((a,i)=>(0,e.jsxs)(s.div,{className:`leaderboard-card ${l===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:i*.1},onClick:()=>m(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(h,{size:20,style:{color:i===0?"#f59e0b":i===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[a.participants," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:l?(0,e.jsx)(Q,{campaignId:l,title:g.find(a=>a.id===l)?.title||"Leaderboard",showPoints:!0}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(h,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]}),o==="my-stats"&&(0,e.jsx)(s.div,{className:"my-stats-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:v?(0,e.jsxs)("div",{className:"user-stats-grid",children:[(0,e.jsxs)("div",{className:"user-stat-card highlight",children:[(0,e.jsxs)("div",{className:"stat-header",children:[(0,e.jsx)(b,{size:24}),(0,e.jsx)("h3",{children:"Your Progress"})]}),(0,e.jsxs)("div",{className:"stat-main",children:[(0,e.jsx)("span",{className:"big-number",children:"0"}),(0,e.jsx)("span",{className:"stat-unit",children:"points"})]}),(0,e.jsxs)("div",{className:"stat-rank",children:[(0,e.jsx)("span",{children:"#--"}),(0,e.jsx)("span",{children:"global rank"})]})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)($,{size:24}),(0,e.jsx)("h3",{children:"Current Streak"}),(0,e.jsxs)("div",{className:"streak-display",children:[(0,e.jsx)("span",{className:"streak-days",children:"0"}),(0,e.jsx)("span",{className:"streak-label",children:"days"})]})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(w,{size:24}),(0,e.jsx)("h3",{children:"Wallets Analyzed"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(L,{size:24}),(0,e.jsx)("h3",{children:"Sybils Detected"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(E,{size:24}),(0,e.jsx)("h3",{children:"Social Shares"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]}),(0,e.jsxs)("div",{className:"user-stat-card",children:[(0,e.jsx)(C,{size:24}),(0,e.jsx)("h3",{children:"Referrals"}),(0,e.jsx)("span",{className:"stat-value",children:"0"})]})]}):(0,e.jsxs)("div",{className:"login-prompt",children:[(0,e.jsx)(V,{size:48}),(0,e.jsx)("h3",{children:"Sign In to Track Progress"}),(0,e.jsx)("p",{children:"Connect your wallet to track your rewards and climb the leaderboards"}),(0,e.jsx)(s.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/auth"),children:"Sign In"})]})})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(s.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(s.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n("/app-evm"),children:[(0,e.jsx)(P,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{ne as default};
