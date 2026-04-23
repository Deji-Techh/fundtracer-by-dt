import{o as Q}from"./rolldown-runtime-MddlTo9B.js";import{At as Y,Ct as W,Dn as K,Et as X,Ht as C,Kt as Z,Mt as ee,Nn as ae,Nt as se,Sc as te,Tt as re,Xt as q,_n as F,_t as H,bt as D,fn as R,gt as P,mc as ie,mt as T,rn as ne,wc as oe,yt as w}from"./vendor-3fpDGbiB.js";import{t as s}from"./proxy-D88Wry_G.js";import{t as M}from"./AnimatePresence-BpVYm51g.js";import{n as le}from"./AuthContext-DMtbOg9P.js";import{n as ce}from"./ThemeContext-DvK6oc0T.js";import{t as de}from"./LandingLayout-FQBKUUsu.js";import{t as pe}from"./navigation-CWP0Yn1z.js";var n=Q(oe(),1),e=ie();function me({campaignId:m,title:j="Leaderboard",showPoints:A=!0,refreshInterval:h=3e4}){const[x,u]=(0,n.useState)([]),[d,g]=(0,n.useState)(!0),[b,N]=(0,n.useState)(null),[f,r]=(0,n.useState)(null),l=async()=>{try{const t=await fetch("/api/torque/v2/leaderboard");if(!t.ok){r((await t.json().catch(()=>({}))).error||"Failed to fetch leaderboard"),g(!1);return}u((await t.json()).entries||[]),N(new Date),r(null)}catch(t){r("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",t)}finally{g(!1)}},k=()=>"Wallets Scanned";(0,n.useEffect)(()=>{l();const t=setInterval(l,h);return()=>clearInterval(t)},[h]);const v=t=>t?`${t.slice(0,6)}...${t.slice(-4)}`:"Unknown",L=t=>{switch(t){case 1:return(0,e.jsx)(R,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(C,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(C,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:t})}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(w,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:j})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:l,disabled:d,children:(0,e.jsx)(se,{className:d?"spinning":"",size:16})})]}),b&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",b.toLocaleTimeString()]}),(0,e.jsx)(M,{mode:"wait",children:d?(0,e.jsx)(s.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("div",{className:"skeleton-container",children:[...Array(5)].map((t,z)=>(0,e.jsxs)(s.div,{className:"skeleton-row",initial:{opacity:.3},animate:{opacity:[.3,.6,.3]},transition:{duration:1.2,repeat:1/0,delay:z*.15},children:[(0,e.jsx)("div",{className:"skeleton-rank"}),(0,e.jsx)("div",{className:"skeleton-name",children:(0,e.jsx)("div",{className:"skeleton-name-bar"})}),(0,e.jsx)("div",{className:"skeleton-score",children:(0,e.jsx)("div",{className:"skeleton-score-bar"})})]},z))})}):f?(0,e.jsxs)(s.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:f}),(0,e.jsx)("button",{onClick:l,children:"Retry"})]}):x.length===0?(0,e.jsx)(s.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsxs)("div",{className:"empty-content",children:[(0,e.jsx)(w,{className:"empty-icon",size:32}),(0,e.jsx)("p",{className:"empty-title",children:"No rankings yet"}),(0,e.jsx)("p",{className:"empty-subtitle",children:"Be the first to analyze wallets and claim the top spot!"}),(0,e.jsx)("button",{className:"empty-cta",onClick:()=>window.location.href="/app",children:"Start Analyzing"})]})}):(0,e.jsx)(s.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:x.map((t,z)=>(0,e.jsxs)(s.div,{className:`leaderboard-entry ${t.isCurrentUser?"current-user":""} rank-${t.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:z*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:L(t.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:t.displayName||v(t.userId)}),t.change!==0&&(0,e.jsxs)("span",{className:`change ${t.change>0?"up":"down"}`,children:[(0,e.jsx)(D,{size:12}),Math.abs(t.change)]})]}),A&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:(t.score??0).toLocaleString()}),(0,e.jsx)("span",{className:"label",children:k()})]})]},t.userId))})}),(0,e.jsxs)("div",{className:"leaderboard-footer",children:[(0,e.jsx)("span",{className:"powered-by",children:"Powered by"}),(0,e.jsx)("strong",{children:"Torque"}),(0,e.jsx)(T,{size:12})]}),(0,e.jsx)("style",{children:`
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
      `})]})}function he({refreshInterval:m=2e4}){const[j,A]=(0,n.useState)([]),[h,x]=(0,n.useState)(!0),[u,d]=(0,n.useState)(null),g=(0,n.useRef)([]),b=async()=>{try{const r=await fetch("/api/torque/v2/activity?limit=10");if(!r.ok){d("Failed to load activity"),x(!1);return}const l=await r.json(),k=(l.activities||[]).map(v=>v.id);k.some(v=>!g.current.includes(v))&&(A(l.activities||[]),g.current=k),d(null)}catch{d("Unable to load activity")}finally{x(!1)}};(0,n.useEffect)(()=>{b();const r=setInterval(b,m);return()=>clearInterval(r)},[m]);const N=r=>{const l=Date.now()-r;return l<6e4?"Just now":l<36e5?`${Math.floor(l/6e4)}m ago`:l<864e5?`${Math.floor(l/36e5)}h ago`:new Date(r).toLocaleDateString()},f=r=>r?r.slice(0,8)+"..."+r.slice(-4):"Unknown";return h?(0,e.jsx)("div",{className:"activity-feed loading",children:(0,e.jsx)("div",{className:"activity-spinner"})}):u&&j.length===0?(0,e.jsx)("div",{className:"activity-feed error",children:(0,e.jsx)("p",{children:"Activity unavailable"})}):j.length===0?(0,e.jsxs)("div",{className:"activity-feed empty",children:[(0,e.jsx)(T,{size:24}),(0,e.jsx)("p",{children:"No recent scans yet"}),(0,e.jsx)("small",{children:"Be the first to scan!"})]}):(0,e.jsx)("div",{className:"activity-feed",children:(0,e.jsx)(M,{mode:"popLayout",children:j.slice(0,8).map((r,l)=>(0,e.jsxs)(s.div,{className:"activity-item",initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:l*.05},children:[(0,e.jsx)("div",{className:"activity-icon",children:(0,e.jsx)(Y,{size:14})}),(0,e.jsxs)("div",{className:"activity-content",children:[(0,e.jsx)("span",{className:"activity-user",children:r.displayName}),(0,e.jsx)("span",{className:"activity-wallet",children:f(r.walletAddress)}),(0,e.jsx)("span",{className:"activity-chain",children:r.chain?.toUpperCase()})]}),(0,e.jsxs)("div",{className:"activity-meta",children:[(0,e.jsxs)("span",{className:"activity-points",children:["+",r.points," pts"]}),(0,e.jsx)("span",{className:"activity-time",children:N(r.timestamp)})]})]},r.id))})})}var xe=pe.map(m=>m.href==="/rewards"?{...m,active:!0}:m),E=[{id:"wallet-analyzer",title:"Wallet Analyzer",description:"Analyze wallets to earn equity",icon:W,color:"#f59e0b",reward:"5%",type:"leaderboard",participants:0,endsIn:null,prize:[{place:"1st",amount:"2.5%",icon:R},{place:"2nd",amount:"1.5%",icon:C},{place:"3rd",amount:"1.0%",icon:C}],active:!0}],ue=[{label:"Total Equity Pool",value:"5%",icon:q},{label:"Active Participants",value:"—",icon:P},{label:"Events Tracked",value:"—",icon:T},{label:"Rewards Claimed",value:"0%",icon:K}],V=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:W,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:X,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:D,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:Z,gradient:"from-blue-500 to-cyan-500"}],ye=[{action:"Analyze a wallet",points:10,description:"Per wallet analyzed"}];function ze(){const m=te(),{user:j}=le(),{theme:A}=ce(),[h,x]=(0,n.useState)("campaigns"),[u,d]=(0,n.useState)("top-analyzer"),[g,b]=(0,n.useState)(!1),[N,f]=(0,n.useState)({totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"}),[r,l]=(0,n.useState)({}),[k,v]=(0,n.useState)(null),[L,t]=(0,n.useState)([]),[z,$]=(0,n.useState)(""),[G,I]=(0,n.useState)([]),[B,_]=(0,n.useState)(!1),U=(0,n.useRef)(null),J=async a=>{if($(a),!a.trim()){I([]);return}_(!0);try{const i=E.filter(o=>o.title.toLowerCase().includes(a.toLowerCase())||o.description.toLowerCase().includes(a.toLowerCase())).map(o=>({type:"campaign",id:o.id,title:o.title,subtitle:o.description}));let c=[];if(u)try{const o=await fetch("/api/torque/v2/leaderboard");if(o.ok){const p=await o.json(),S=a.toLowerCase();c=(p.entries||[]).filter(y=>y.userId.toLowerCase().includes(S)||y.displayName&&y.displayName.toLowerCase().includes(S)).slice(0,5).map(y=>({type:"user",id:y.userId,title:y.displayName||y.userId,subtitle:`Rank #${y.rank} - ${y.score} points`}))}}catch{}I([...i,...c])}catch{I([])}finally{_(!1)}},O=a=>{$(""),I([]),a.type==="campaign"?(d(a.id),x("leaderboard")):(u||d("top-analyzer"),x("leaderboard")),setTimeout(()=>{U.current?.scrollIntoView({behavior:"smooth",block:"start"})},100)};return(0,n.useEffect)(()=>{const a=async()=>{const c=localStorage.getItem("fundtracer_token");try{const o=await fetch("/api/torque/v2/leaderboard");if(o.ok){const p=await o.json();f({totalEquityPool:"5%",activeParticipants:p.totalScanned||0,eventsTracked:p.totalScanned||0,rewardsClaimed:"0%"})}if(c){const p=await fetch("/api/torque/v2/mystats",{headers:{Authorization:`Bearer ${c}`}});if(p.ok){const S=await p.json();v({points:S.stats?.totalPoints||0,rank:S.stats?.rank||0,streak:0})}}try{const p=await fetch("/api/torque/v2/groups");p.ok&&t((await p.json()).groups||[])}catch(p){console.error("[RewardsPage] Failed to fetch groups:",p)}}catch(o){console.error("[RewardsPage] Failed to fetch stats:",o)}};a();const i=setInterval(a,6e4);return()=>clearInterval(i)},[]),(0,e.jsx)(de,{navItems:xe,onSearch:J,onSearchSelect:O,searchResults:G,searchLoading:B,showSearch:!0,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,i)=>(0,e.jsx)(s.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:q,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},i))})]}),(0,e.jsxs)(s.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(s.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(re,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(s.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(s.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(s.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(s.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>m("/app-evm"),children:[(0,e.jsx)(T,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(s.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>x("leaderboard"),children:[(0,e.jsx)(w,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(s.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:ue.map((a,i)=>{let c=a.value;const o=N||{totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"};return a.label==="Active Participants"?c=(o?.activeParticipants??0).toLocaleString():a.label==="Events Tracked"?c=(o?.eventsTracked??0).toLocaleString():a.label==="Total Equity Pool"?c=o.totalEquityPool||"5%":a.label==="Rewards Claimed"&&(c=o.rewardsClaimed||"0%"),(0,e.jsxs)(s.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+i*.1},children:[(0,e.jsx)("div",{className:"stat-icon",children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:c}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label)})})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:V.map((a,i)=>(0,e.jsxs)(s.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:i*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),i<V.length-1&&(0,e.jsx)(s.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:q,duration:1.5},children:(0,e.jsx)(F,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"rewards-table-section",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How Rewards Are Calculated"}),(0,e.jsx)("p",{className:"rewards-intro",children:"Earn points for every action on FundTracer. Points determine your rank on leaderboards."}),(0,e.jsx)("div",{className:"rewards-table-wrapper",children:(0,e.jsxs)("table",{className:"rewards-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Action"}),(0,e.jsx)("th",{children:"Points"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsx)("tbody",{children:ye.map((a,i)=>(0,e.jsxs)(s.tr,{initial:{opacity:0,x:-20},whileInView:{opacity:1,x:0},viewport:{once:!0},transition:{delay:i*.05},children:[(0,e.jsx)("td",{children:a.action}),(0,e.jsx)("td",{className:"points-cell",children:(0,e.jsxs)("span",{className:"points-badge",children:["+",a.points]})}),(0,e.jsx)("td",{children:a.description})]},a.action))})]})}),(0,e.jsxs)("div",{className:"torque-badge",children:[(0,e.jsx)("span",{children:"Powered by"}),(0,e.jsx)("strong",{children:"Torque"}),(0,e.jsx)(T,{size:14})]})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsxs)("div",{className:"campaigns-tabs",children:[["campaigns","leaderboard","activity","groups"].map(a=>(0,e.jsxs)(s.button,{className:`tab-btn ${h===a?"active":""}`,onClick:()=>x(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(ne,{size:16}),a==="leaderboard"&&(0,e.jsx)(w,{size:16}),a==="activity"&&(0,e.jsx)(ae,{size:16}),a==="groups"&&(0,e.jsx)(H,{size:16}),a.replace("-"," ").replace(/\b\w/g,i=>i.toUpperCase())]},a)),(0,e.jsxs)(s.button,{className:"tab-btn",onClick:()=>window.open("/app-evm?tab=settings#torque-stats","_blank"),whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,e.jsx)(P,{size:16}),"My Stats"]})]}),(0,e.jsxs)(M,{mode:"wait",children:[h==="campaigns"&&(0,e.jsx)(s.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:E.map((a,i)=>(0,e.jsxs)(s.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:i*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(P,{size:14}),(0,e.jsxs)("span",{children:[r[a.id]?.participants||"—"," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((c,o)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(c.icon,{size:14}),(0,e.jsx)("span",{children:c.place}),(0,e.jsx)("strong",{children:c.amount})]},o))}),(0,e.jsxs)(s.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>d(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(F,{size:16})]})]},a.id))}),h==="leaderboard"&&(0,e.jsxs)(s.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},ref:U,children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards & Campaigns"}),(0,e.jsx)("div",{className:"leaderboard-list",children:E.map((a,i)=>(0,e.jsxs)(s.div,{className:`leaderboard-card ${u===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:i*.1},onClick:()=>d(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(w,{size:20,style:{color:i===0?"#f59e0b":i===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[r[a.id]?.participants||"—"," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:u?(0,e.jsx)(me,{campaignId:u,title:E.find(a=>a.id===u)?.title||"Leaderboard",showPoints:!0,refreshInterval:1e4}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(w,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]}),h==="groups"&&(0,e.jsxs)(s.div,{className:"groups-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("h3",{children:"Group Leaderboards"}),(0,e.jsx)("p",{className:"groups-subtitle",children:"Compete with your Telegram group!"}),L.length===0?(0,e.jsxs)("div",{className:"groups-empty",children:[(0,e.jsx)(H,{size:48}),(0,e.jsx)("h3",{children:"No Groups Yet"}),(0,e.jsx)("p",{children:"Use /registergroup in Telegram to start a group leaderboard"})]}):(0,e.jsx)("div",{className:"groups-list",children:L.map((a,i)=>(0,e.jsxs)(s.div,{className:"group-card",initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:i*.1},children:[(0,e.jsx)("div",{className:"group-rank",children:i===0?(0,e.jsx)(R,{size:24}):i===1?(0,e.jsx)(C,{size:24}):(0,e.jsxs)("span",{children:["#",i+1]})}),(0,e.jsxs)("div",{className:"group-info",children:[(0,e.jsx)("h4",{children:a.groupName}),(0,e.jsxs)("span",{children:[a.memberCount||0," members"]})]}),(0,e.jsxs)("div",{className:"group-stats",children:[(0,e.jsx)("span",{className:"group-points",children:(a.totalPoints||0).toLocaleString()}),(0,e.jsx)("small",{children:"points"})]})]},a.groupId))})]}),h==="activity"&&(0,e.jsxs)(s.div,{className:"activity-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("h3",{children:"Live Activity"}),(0,e.jsx)("p",{className:"activity-subtitle",children:"Real-time scans across all groups"}),(0,e.jsx)(he,{refreshInterval:2e4})]})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(s.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(s.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>m("/app-evm"),children:[(0,e.jsx)(ee,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{ze as default};
