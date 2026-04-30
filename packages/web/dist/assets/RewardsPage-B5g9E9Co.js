import{o as K}from"./rolldown-runtime-MddlTo9B.js";import{An as X,At as ee,Bt as L,Ct as M,Et as Y,Jt as U,Mt as ae,Nt as se,Sc as te,Tn as ie,Tt as re,Wt as ne,_n as le,_t as oe,bc as ce,bt as G,fc as de,gt as I,jn as pe,ln as V,mn as D,mt as R,tn as J,vn as me,yt as q}from"./vendor-D_xBkKtE.js";import{t as s}from"./proxy-BKJiN5xa.js";import{t as W}from"./AnimatePresence-CVrijo-h.js";import{n as he}from"./AuthContext-B3MkJbf9.js";import{n as xe}from"./ThemeContext-B6q-it7I.js";import{t as ue}from"./LandingLayout-CPh1ev4t.js";import{t as ye}from"./navigation-ITqPXr4N.js";var i=K(te(),1),e=de();function je({campaignId:o,title:N="Leaderboard",showPoints:A=!0,refreshInterval:h=3e4}){const[p,x]=(0,i.useState)([]),[c,w]=(0,i.useState)(!0),[u,S]=(0,i.useState)(null),[g,r]=(0,i.useState)(null),d=async()=>{try{const t=await fetch("/api/torque-v2/leaderboard");if(!t.ok){r((await t.json().catch(()=>({}))).error||"Failed to fetch leaderboard"),w(!1);return}x((await t.json()).entries||[]),S(new Date),r(null)}catch(t){r("Unable to load leaderboard"),console.error("[Leaderboard] Fetch error:",t)}finally{w(!1)}},z=()=>"Wallets Scanned";(0,i.useEffect)(()=>{d();const t=setInterval(d,h);return()=>clearInterval(t)},[h]);const v=t=>t?`${t.slice(0,6)}...${t.slice(-4)}`:"Unknown",k=t=>{switch(t){case 1:return(0,e.jsx)(V,{className:"rank-icon gold",size:20});case 2:return(0,e.jsx)(L,{className:"rank-icon silver",size:18});case 3:return(0,e.jsx)(L,{className:"rank-icon bronze",size:18});default:return(0,e.jsx)("span",{className:"rank-number",children:t})}};return(0,e.jsxs)("div",{className:"torque-leaderboard",children:[(0,e.jsxs)("div",{className:"leaderboard-header",children:[(0,e.jsxs)("div",{className:"header-left",children:[(0,e.jsx)(q,{className:"trophy-icon",size:24}),(0,e.jsx)("h3",{children:N})]}),(0,e.jsx)("button",{className:"refresh-btn",onClick:d,disabled:c,children:(0,e.jsx)(se,{className:c?"spinning":"",size:16})})]}),u&&(0,e.jsxs)("div",{className:"last-updated",children:["Updated ",u.toLocaleTimeString()]}),(0,e.jsx)(W,{mode:"wait",children:c?(0,e.jsx)(s.div,{className:"leaderboard-loading",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)("div",{className:"skeleton-container",children:[...Array(5)].map((t,C)=>(0,e.jsxs)(s.div,{className:"skeleton-row",initial:{opacity:.3},animate:{opacity:[.3,.6,.3]},transition:{duration:1.2,repeat:1/0,delay:C*.15},children:[(0,e.jsx)("div",{className:"skeleton-rank"}),(0,e.jsx)("div",{className:"skeleton-name",children:(0,e.jsx)("div",{className:"skeleton-name-bar"})}),(0,e.jsx)("div",{className:"skeleton-score",children:(0,e.jsx)("div",{className:"skeleton-score-bar"})})]},C))})}):g?(0,e.jsxs)(s.div,{className:"leaderboard-error",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("p",{children:g}),(0,e.jsx)("button",{onClick:d,children:"Retry"})]}):p.length===0?(0,e.jsx)(s.div,{className:"leaderboard-empty",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsxs)("div",{className:"empty-content",children:[(0,e.jsx)(q,{className:"empty-icon",size:32}),(0,e.jsx)("p",{className:"empty-title",children:"No rankings yet"}),(0,e.jsx)("p",{className:"empty-subtitle",children:"Be the first to analyze wallets and claim the top spot!"}),(0,e.jsx)("button",{className:"empty-cta",onClick:()=>window.location.href="/app",children:"Start Analyzing"})]})}):(0,e.jsx)(s.div,{className:"leaderboard-entries",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:p.map((t,C)=>(0,e.jsxs)(s.div,{className:`leaderboard-entry ${t.isCurrentUser?"current-user":""} rank-${t.rank}`,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{delay:C*.05},children:[(0,e.jsx)("div",{className:"entry-rank",children:k(t.rank)}),(0,e.jsxs)("div",{className:"entry-address",children:[(0,e.jsx)("span",{className:"address",children:t.displayName||v(t.userId)}),t.change!==0&&(0,e.jsxs)("span",{className:`change ${t.change>0?"up":"down"}`,children:[(0,e.jsx)(G,{size:12}),Math.abs(t.change)]})]}),A&&(0,e.jsxs)("div",{className:"entry-score",children:[(0,e.jsx)("span",{className:"score",children:(t.score??0).toLocaleString()}),(0,e.jsx)("span",{className:"label",children:z()})]})]},t.userId))})}),(0,e.jsxs)("div",{className:"leaderboard-footer",children:[(0,e.jsx)("span",{className:"powered-by",children:"Powered by"}),(0,e.jsx)("strong",{children:"Torque"}),(0,e.jsx)(R,{size:12})]}),(0,e.jsx)("style",{children:`
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
      `})]})}function ve({refreshInterval:o=2e4}){const[N,A]=(0,i.useState)([]),[h,p]=(0,i.useState)(!0),[x,c]=(0,i.useState)(null),w=(0,i.useRef)([]),u=async()=>{try{const r=await fetch("/api/torque-v2/activity?limit=10");if(!r.ok){c("Failed to load activity"),p(!1);return}const d=await r.json(),z=(d.activities||[]).map(v=>v.id);z.some(v=>!w.current.includes(v))&&(A(d.activities||[]),w.current=z),c(null)}catch{c("Unable to load activity")}finally{p(!1)}};(0,i.useEffect)(()=>{u();const r=setInterval(u,o);return()=>clearInterval(r)},[o]);const S=r=>{const d=Date.now()-r;return d<6e4?"Just now":d<36e5?`${Math.floor(d/6e4)}m ago`:d<864e5?`${Math.floor(d/36e5)}h ago`:new Date(r).toLocaleDateString()},g=r=>r?r.slice(0,8)+"..."+r.slice(-4):"Unknown";return h?(0,e.jsx)("div",{className:"activity-feed loading",children:(0,e.jsx)("div",{className:"activity-spinner"})}):x&&N.length===0?(0,e.jsx)("div",{className:"activity-feed error",children:(0,e.jsx)("p",{children:"Activity unavailable"})}):N.length===0?(0,e.jsxs)("div",{className:"activity-feed empty",children:[(0,e.jsx)(R,{size:24}),(0,e.jsx)("p",{children:"No recent scans yet"}),(0,e.jsx)("small",{children:"Be the first to scan!"})]}):(0,e.jsx)("div",{className:"activity-feed",children:(0,e.jsx)(W,{mode:"popLayout",children:N.slice(0,8).map((r,d)=>(0,e.jsxs)(s.div,{className:"activity-item",initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:d*.05},children:[(0,e.jsx)("div",{className:"activity-icon",children:(0,e.jsx)(ee,{size:14})}),(0,e.jsxs)("div",{className:"activity-content",children:[(0,e.jsx)("span",{className:"activity-user",children:r.displayName}),(0,e.jsx)("span",{className:"activity-wallet",children:g(r.walletAddress)}),(0,e.jsx)("span",{className:"activity-chain",children:r.chain?.toUpperCase()})]}),(0,e.jsxs)("div",{className:"activity-meta",children:[(0,e.jsxs)("span",{className:"activity-points",children:["+",r.points," pts"]}),(0,e.jsx)("span",{className:"activity-time",children:S(r.timestamp)})]})]},r.id))})})}var H=5e5,O=5;function ge({user:o,onClaim:N}){const[A,h]=(0,i.useState)(!0),[p,x]=(0,i.useState)(null),[c,w]=(0,i.useState)(null),[u,S]=(0,i.useState)(null),[g,r]=(0,i.useState)(!1),[d,z]=(0,i.useState)(!1),[v,k]=(0,i.useState)(null),t=f=>(f/H*O).toFixed(5);(0,i.useEffect)(()=>{(async()=>{if(!o?.uid){h(!1);return}try{const j=localStorage.getItem("fundtracer_token");x(await(await fetch("/api/torque-v2/claim/status",{headers:{Authorization:`Bearer ${j}`}})).json()),w(await(await fetch("/api/torque-v2/pool-stats")).json()),S((await(await fetch("/api/torque-v2/mystats",{headers:{Authorization:`Bearer ${j}`}})).json()).stats)}catch(j){console.error("Failed to fetch stats:",j)}finally{h(!1)}})()},[o]);const C=async()=>{if(!(!o?.uid||!u?.points||p?.claimed)){r(!0),k(null);try{const f=localStorage.getItem("fundtracer_token"),j=await(await fetch("/api/torque-v2/claim",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${f}`},body:JSON.stringify({email:o.email})})).json();j.success?(z(!0),x({claimed:!0,points:u.points,equityPercent:parseFloat(j.equityPercent),claimedAt:Date.now()})):k(j.error||"Failed to claim")}catch(f){k(f.message||"Something went wrong")}finally{r(!1)}}},T=u?.points||0,_=t(T),E=c?.remainingEquityPool||"5%",F=(c?.claimCount||0)+(o?.uid&&!p?.claimed?1:0);return o?A?(0,e.jsxs)("div",{className:"my-stats-loading",children:[(0,e.jsx)("div",{className:"loading-spinner"}),(0,e.jsx)("p",{children:"Loading your stats..."})]}):p?.claimed?(0,e.jsx)(s.div,{className:"my-stats-claimed",initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},children:(0,e.jsxs)("div",{className:"claimed-success",children:[(0,e.jsx)(le,{size:64}),(0,e.jsx)("h2",{children:"Equity Claimed!"}),(0,e.jsxs)("div",{className:"claimed-details",children:[(0,e.jsxs)("div",{className:"detail-row",children:[(0,e.jsx)("span",{children:"Points Claimed"}),(0,e.jsxs)("strong",{children:[p.points," pts"]})]}),(0,e.jsxs)("div",{className:"detail-row highlight",children:[(0,e.jsx)("span",{children:"Equity Received"}),(0,e.jsxs)("strong",{children:[p.equityPercent.toFixed(5),"%"]})]})]}),(0,e.jsx)("p",{className:"claimed-note",children:"You're on the list! Equity will be distributed per our terms."})]})}):(0,e.jsxs)(s.div,{className:"my-stats-container",initial:{opacity:0},animate:{opacity:1},children:[(0,e.jsxs)("div",{className:"stats-card user-stats",children:[(0,e.jsxs)("div",{className:"card-header",children:[(0,e.jsx)(I,{size:24}),(0,e.jsx)("h3",{children:"Your Statistics"})]}),(0,e.jsxs)("div",{className:"stats-grid",children:[(0,e.jsxs)("div",{className:"stat-item",children:[(0,e.jsx)(M,{size:20}),(0,e.jsx)("span",{className:"stat-label",children:"Wallets Analyzed"}),(0,e.jsx)("span",{className:"stat-value",children:T})]}),(0,e.jsxs)("div",{className:"stat-item",children:[(0,e.jsx)(q,{size:20}),(0,e.jsx)("span",{className:"stat-label",children:"Current Rank"}),(0,e.jsxs)("span",{className:"stat-value",children:["#",u?.rank||"—"]})]})]})]}),(0,e.jsxs)("div",{className:"stats-card equity-calculation",children:[(0,e.jsxs)("div",{className:"card-header",children:[(0,e.jsx)(me,{size:24}),(0,e.jsx)("h3",{children:"Equity Calculation"})]}),(0,e.jsxs)("div",{className:"calculation-formula",children:[(0,e.jsxs)("div",{className:"formula-line",children:[(0,e.jsx)("span",{className:"formula-label",children:"Total Pool"}),(0,e.jsxs)("span",{className:"formula-value",children:[H.toLocaleString()," pts = ",O,"%"]})]}),(0,e.jsx)("div",{className:"formula-divider",children:(0,e.jsx)("span",{children:"÷"})}),(0,e.jsxs)("div",{className:"formula-line your-points",children:[(0,e.jsx)("span",{className:"formula-label",children:"Your Points"}),(0,e.jsxs)("span",{className:"formula-value",children:[T," pts × 0.00001%"]})]}),(0,e.jsx)("div",{className:"formula-divider",children:(0,e.jsx)("span",{children:"="})}),(0,e.jsxs)("div",{className:"formula-line result",children:[(0,e.jsx)("span",{className:"formula-label",children:"Your Equity"}),(0,e.jsxs)("span",{className:"formula-value highlight",children:[_,"%"]})]})]}),(0,e.jsxs)("div",{className:"calculation-note",children:[(0,e.jsx)(Y,{size:14}),(0,e.jsx)("span",{children:"1 point = 0.00001% equity"})]})]}),(0,e.jsxs)("div",{className:"claim-section",children:[v&&(0,e.jsxs)(s.div,{className:"claim-error",initial:{opacity:0},animate:{opacity:1},children:[(0,e.jsx)(X,{size:16}),(0,e.jsx)("span",{children:v})]}),T>0?(0,e.jsx)(s.button,{className:"claim-btn",onClick:C,disabled:g,whileHover:{scale:1.02},whileTap:{scale:.98},children:g?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)("div",{className:"btn-spinner"}),(0,e.jsx)("span",{children:"Claiming..."})]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(J,{size:20}),(0,e.jsxs)("span",{children:["Claim ",_,"% Equity"]})]})}):(0,e.jsxs)("div",{className:"no-points",children:[(0,e.jsx)(M,{size:24}),(0,e.jsx)("p",{children:"Analyze wallets to earn points and claim equity!"})]})]}),(0,e.jsxs)("div",{className:"pool-stats",children:[(0,e.jsx)("h4",{children:"Pool Status"}),(0,e.jsxs)("div",{className:"pool-grid",children:[(0,e.jsxs)("div",{className:"pool-item",children:[(0,e.jsx)("span",{children:"Total Equity Pool"}),(0,e.jsx)("strong",{children:c?.totalEquityPool||"5%"})]}),(0,e.jsxs)("div",{className:"pool-item",children:[(0,e.jsx)("span",{children:"Remaining"}),(0,e.jsx)("strong",{children:E})]}),(0,e.jsxs)("div",{className:"pool-item",children:[(0,e.jsx)("span",{children:"Participants"}),(0,e.jsx)("strong",{children:F})]}),(0,e.jsxs)("div",{className:"pool-item",children:[(0,e.jsx)("span",{children:"Claimed"}),(0,e.jsx)("strong",{children:c?.claimCount||0})]})]})]})]}):(0,e.jsxs)("div",{className:"my-stats-empty",children:[(0,e.jsx)("div",{className:"empty-icon",children:(0,e.jsx)(I,{size:48})}),(0,e.jsx)("h3",{children:"Sign In to View Your Stats"}),(0,e.jsx)("p",{children:"Connect your wallet to see your points and claim equity"})]})}var fe=ye.map(o=>o.href==="/rewards"?{...o,active:!0}:o),$=[{id:"wallet-analyzer",title:"Wallet Analyzer",description:"Analyze wallets to earn equity",icon:M,color:"#f59e0b",reward:"5%",type:"leaderboard",participants:0,endsIn:null,prize:[{place:"1st",amount:"2.5%",icon:V},{place:"2nd",amount:"1.5%",icon:L},{place:"3rd",amount:"1.0%",icon:L}],active:!0}],be=[{label:"Total Equity Pool",value:"5%",icon:U},{label:"Active Participants",value:"—",icon:I},{label:"Events Tracked",value:"—",icon:R},{label:"Rewards Claimed",value:"0%",icon:ie}],B=[{step:1,title:"Analyze Wallets",description:"Use FundTracer to analyze any wallet on any supported chain",icon:M,gradient:"from-amber-500 to-orange-500"},{step:2,title:"Earn Points",description:"Every analysis earns you points towards leaderboards and raffles",icon:Y,gradient:"from-purple-500 to-pink-500"},{step:3,title:"Climb Ranks",description:"Top performers on leaderboards win equity rewards",icon:G,gradient:"from-green-500 to-emerald-500"},{step:4,title:"Claim Equity",description:"Rewards vest over 12-24 months with cliff periods",icon:ne,gradient:"from-blue-500 to-cyan-500"}],Ne=[{action:"Analyze a wallet",points:10,description:"Per wallet analyzed"}];function Ee(){const o=ce(),{user:N}=he(),{theme:A}=xe(),[h,p]=(0,i.useState)("campaigns"),[x,c]=(0,i.useState)("top-analyzer"),[w,u]=(0,i.useState)(!1),[S,g]=(0,i.useState)({totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"}),[r,d]=(0,i.useState)({}),[z,v]=(0,i.useState)(null),[k,t]=(0,i.useState)([]),[C,T]=(0,i.useState)(""),[_,E]=(0,i.useState)([]),[F,f]=(0,i.useState)(!1),j=(0,i.useRef)(null),Q=async a=>{if(T(a),!a.trim()){E([]);return}f(!0);try{const n=$.filter(l=>l.title.toLowerCase().includes(a.toLowerCase())||l.description.toLowerCase().includes(a.toLowerCase())).map(l=>({type:"campaign",id:l.id,title:l.title,subtitle:l.description}));let m=[];if(x)try{const l=await fetch("/api/torque-v2/leaderboard");if(l.ok){const y=await l.json(),P=a.toLowerCase();m=(y.entries||[]).filter(b=>b.userId.toLowerCase().includes(P)||b.displayName&&b.displayName.toLowerCase().includes(P)).slice(0,5).map(b=>({type:"user",id:b.userId,title:b.displayName||b.userId,subtitle:`Rank #${b.rank} - ${b.score} points`}))}}catch{}E([...n,...m])}catch{E([])}finally{f(!1)}},Z=a=>{T(""),E([]),a.type==="campaign"?(c(a.id),p("leaderboard")):(x||c("top-analyzer"),p("leaderboard")),setTimeout(()=>{j.current?.scrollIntoView({behavior:"smooth",block:"start"})},100)};return(0,i.useEffect)(()=>{const a=async()=>{const m=localStorage.getItem("fundtracer_token");try{const l=await fetch("/api/torque-v2/leaderboard");if(l.ok){const y=await l.json();g({totalEquityPool:"5%",activeParticipants:y.totalScanned||0,eventsTracked:y.totalScanned||0,rewardsClaimed:"0%"})}if(m){const y=await fetch("/api/torque-v2/mystats",{headers:{Authorization:`Bearer ${m}`}});if(y.ok){const P=await y.json();v({points:P.stats?.totalPoints||0,rank:P.stats?.rank||0,streak:0})}}try{const y=await fetch("/api/torque-v2/groups");y.ok&&t((await y.json()).groups||[])}catch(y){console.error("[RewardsPage] Failed to fetch groups:",y)}}catch(l){console.error("[RewardsPage] Failed to fetch stats:",l)}};a();const n=setInterval(a,6e4);return()=>clearInterval(n)},[]),(0,e.jsx)(ue,{navItems:fe,onSearch:Q,onSearchSelect:Z,searchResults:_,searchLoading:F,showSearch:!0,children:(0,e.jsxs)("div",{className:"rewards-page",children:[(0,e.jsxs)("section",{className:"rewards-hero",children:[(0,e.jsxs)("div",{className:"hero-background",children:[(0,e.jsx)("div",{className:"hero-grid"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-1"}),(0,e.jsx)("div",{className:"hero-glow hero-glow-2"}),(0,e.jsx)("div",{className:"hero-particles",children:[...Array(20)].map((a,n)=>(0,e.jsx)(s.div,{className:"particle",initial:{x:Math.random()*100+"%",y:Math.random()*100+"%",opacity:Math.random()*.5+.2},animate:{y:[null,Math.random()*-200-100],opacity:[null,0]},transition:{duration:Math.random()*10+10,repeat:U,ease:"linear"},style:{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`}},n))})]}),(0,e.jsxs)(s.div,{className:"hero-content",initial:{opacity:0,y:50},animate:{opacity:1,y:0},transition:{duration:.8,ease:"easeOut"},children:[(0,e.jsxs)(s.div,{className:"hero-badge",initial:{scale:0},animate:{scale:1},transition:{delay:.2,type:"spring"},children:[(0,e.jsx)(re,{size:14}),(0,e.jsx)("span",{children:"5% Equity Pool"})]}),(0,e.jsxs)(s.h1,{className:"hero-title",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:.3},children:["Earn Equity for",(0,e.jsx)("span",{className:"gradient-text",children:" Analyzing Wallets"})]}),(0,e.jsx)(s.p,{className:"hero-description",initial:{opacity:0},animate:{opacity:1},transition:{delay:.4},children:"The more you analyze, the more equity you earn. Top performers win life-changing shares in FundTracer. No capture required."}),(0,e.jsxs)(s.div,{className:"hero-actions",initial:{opacity:0},animate:{opacity:1},transition:{delay:.5},children:[(0,e.jsxs)(s.button,{className:"btn-primary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>o("/app-evm"),children:[(0,e.jsx)(R,{size:18}),"Start Analyzing"]}),(0,e.jsxs)(s.button,{className:"btn-secondary",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>p("leaderboard"),children:[(0,e.jsx)(q,{size:18}),"View Leaderboards"]})]}),(0,e.jsx)(s.div,{className:"hero-stats",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.6},children:be.map((a,n)=>{let m=a.value;const l=S||{totalEquityPool:"5%",activeParticipants:0,eventsTracked:0,rewardsClaimed:"0%"};return a.label==="Active Participants"?m=(l?.activeParticipants??0).toLocaleString():a.label==="Events Tracked"?m=(l?.eventsTracked??0).toLocaleString():a.label==="Total Equity Pool"?m=l.totalEquityPool||"5%":a.label==="Rewards Claimed"&&(m=l.rewardsClaimed||"0%"),(0,e.jsxs)(s.div,{className:"stat-card",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.7+n*.1},children:[(0,e.jsx)("div",{className:"stat-icon",children:(0,e.jsx)(a.icon,{size:20})}),(0,e.jsxs)("div",{className:"stat-content",children:[(0,e.jsx)("span",{className:"stat-value",children:m}),(0,e.jsx)("span",{className:"stat-label",children:a.label})]})]},a.label)})})]})]}),(0,e.jsxs)("section",{className:"how-it-works",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How It Works"}),(0,e.jsx)("div",{className:"steps-grid",children:B.map((a,n)=>(0,e.jsxs)(s.div,{className:"step-card",initial:{opacity:0,y:30},whileInView:{opacity:1,y:0},viewport:{once:!0},transition:{delay:n*.15},children:[(0,e.jsx)("div",{className:`step-icon-wrapper ${a.gradient}`,children:(0,e.jsx)(a.icon,{size:28})}),(0,e.jsx)("div",{className:"step-number",children:String(a.step).padStart(2,"0")}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),n<B.length-1&&(0,e.jsx)(s.div,{className:"step-arrow",animate:{x:[0,5,0]},transition:{repeat:U,duration:1.5},children:(0,e.jsx)(D,{size:20})})]},a.step))})]}),(0,e.jsxs)("section",{className:"rewards-table-section",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"How Rewards Are Calculated"}),(0,e.jsx)("p",{className:"rewards-intro",children:"Earn points for every action on FundTracer. Points determine your rank on leaderboards."}),(0,e.jsx)("div",{className:"rewards-table-wrapper",children:(0,e.jsxs)("table",{className:"rewards-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Action"}),(0,e.jsx)("th",{children:"Points"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsx)("tbody",{children:Ne.map((a,n)=>(0,e.jsxs)(s.tr,{initial:{opacity:0,x:-20},whileInView:{opacity:1,x:0},viewport:{once:!0},transition:{delay:n*.05},children:[(0,e.jsx)("td",{children:a.action}),(0,e.jsx)("td",{className:"points-cell",children:(0,e.jsxs)("span",{className:"points-badge",children:["+",a.points]})}),(0,e.jsx)("td",{children:a.description})]},a.action))})]})}),(0,e.jsxs)("div",{className:"torque-badge",children:[(0,e.jsx)("span",{children:"Powered by"}),(0,e.jsx)("strong",{children:"Torque"}),(0,e.jsx)(R,{size:14})]})]}),(0,e.jsxs)("section",{className:"campaigns-section",children:[(0,e.jsx)(s.h2,{className:"section-title",initial:{opacity:0,y:20},whileInView:{opacity:1,y:0},viewport:{once:!0},children:"Active Campaigns"}),(0,e.jsx)("div",{className:"campaigns-tabs",children:["campaigns","leaderboard","activity","my-stats"].map(a=>(0,e.jsxs)(s.button,{className:`tab-btn ${h===a?"active":""}`,onClick:()=>p(a),whileHover:{scale:1.02},whileTap:{scale:.98},children:[a==="campaigns"&&(0,e.jsx)(J,{size:16}),a==="leaderboard"&&(0,e.jsx)(q,{size:16}),a==="activity"&&(0,e.jsx)(pe,{size:16}),a==="my-stats"&&(0,e.jsx)(I,{size:16}),a==="my-stats"?"My Stats":a.replace("-"," ").replace(/\b\w/g,n=>n.toUpperCase())]},a))}),(0,e.jsxs)(W,{mode:"wait",children:[h==="campaigns"&&(0,e.jsx)(s.div,{className:"campaigns-grid",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:$.map((a,n)=>(0,e.jsxs)(s.div,{className:"campaign-card",initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{delay:n*.1},whileHover:{y:-5},children:[(0,e.jsxs)("div",{className:"campaign-header",children:[(0,e.jsx)("div",{className:"campaign-icon",style:{background:`linear-gradient(135deg, ${a.color}40, ${a.color}20)`},children:(0,e.jsx)(a.icon,{size:24,style:{color:a.color}})}),(0,e.jsx)("div",{className:"campaign-type",children:(0,e.jsx)("span",{className:`type-badge ${a.type}`,children:a.type})})]}),(0,e.jsx)("h3",{children:a.title}),(0,e.jsx)("p",{children:a.description}),(0,e.jsxs)("div",{className:"campaign-prize",children:[(0,e.jsx)("span",{className:"prize-label",children:"Total Pool"}),(0,e.jsx)("span",{className:"prize-value",children:a.reward})]}),(0,e.jsxs)("div",{className:"campaign-participants",children:[(0,e.jsx)(I,{size:14}),(0,e.jsxs)("span",{children:[r[a.id]?.participants||"—"," analyzing"]})]}),(0,e.jsx)("div",{className:"campaign-prizes",children:a.prize.map((m,l)=>(0,e.jsxs)("div",{className:"prize-item",children:[(0,e.jsx)(m.icon,{size:14}),(0,e.jsx)("span",{children:m.place}),(0,e.jsx)("strong",{children:m.amount})]},l))}),(0,e.jsxs)(s.button,{className:"campaign-join",style:{"--accent-color":a.color},whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>c(a.id),children:[a.type==="leaderboard"?"View Rankings":"Join Campaign",(0,e.jsx)(D,{size:16})]})]},a.id))}),h==="leaderboard"&&(0,e.jsxs)(s.div,{className:"leaderboard-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},ref:j,children:[(0,e.jsxs)("div",{className:"leaderboard-tabs",children:[(0,e.jsx)("h3",{children:"Active Leaderboards & Campaigns"}),(0,e.jsx)("div",{className:"leaderboard-list",children:$.map((a,n)=>(0,e.jsxs)(s.div,{className:`leaderboard-card ${x===a.id?"selected":""}`,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:n*.1},onClick:()=>c(a.id),children:[(0,e.jsx)("div",{className:"lb-rank",children:(0,e.jsx)(q,{size:20,style:{color:n===0?"#f59e0b":n===1?"#c0c0c0":"#cd7f32"}})}),(0,e.jsxs)("div",{className:"lb-info",children:[(0,e.jsx)("h4",{children:a.title}),(0,e.jsxs)("span",{children:[r[a.id]?.participants||"—"," competitors"]})]}),(0,e.jsxs)("div",{className:"lb-prize",children:[(0,e.jsx)("span",{children:a.reward}),(0,e.jsx)("small",{children:"pool"})]})]},a.id))})]}),(0,e.jsx)("div",{className:"leaderboard-display",children:x?(0,e.jsx)(je,{campaignId:x,title:$.find(a=>a.id===x)?.title||"Leaderboard",showPoints:!0,refreshInterval:1e4}):(0,e.jsxs)("div",{className:"leaderboard-empty",children:[(0,e.jsx)(q,{size:48}),(0,e.jsx)("h3",{children:"Select a Leaderboard"}),(0,e.jsx)("p",{children:"Choose a competition from the list to see rankings"})]})})]}),h==="groups"&&(0,e.jsxs)(s.div,{className:"groups-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("h3",{children:"Group Leaderboards"}),(0,e.jsx)("p",{className:"groups-subtitle",children:"Compete with your Telegram group!"}),k.length===0?(0,e.jsxs)("div",{className:"groups-empty",children:[(0,e.jsx)(oe,{size:48}),(0,e.jsx)("h3",{children:"No Groups Yet"}),(0,e.jsx)("p",{children:"Use /registergroup in Telegram to start a group leaderboard"})]}):(0,e.jsx)("div",{className:"groups-list",children:k.map((a,n)=>(0,e.jsxs)(s.div,{className:"group-card",initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:n*.1},children:[(0,e.jsx)("div",{className:"group-rank",children:n===0?(0,e.jsx)(V,{size:24}):n===1?(0,e.jsx)(L,{size:24}):(0,e.jsxs)("span",{children:["#",n+1]})}),(0,e.jsxs)("div",{className:"group-info",children:[(0,e.jsx)("h4",{children:a.groupName}),(0,e.jsxs)("span",{children:[a.memberCount||0," members"]})]}),(0,e.jsxs)("div",{className:"group-stats",children:[(0,e.jsx)("span",{className:"group-points",children:(a.totalPoints||0).toLocaleString()}),(0,e.jsx)("small",{children:"points"})]})]},a.groupId))})]}),h==="activity"&&(0,e.jsxs)(s.div,{className:"activity-view",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,e.jsx)("h3",{children:"Live Activity"}),(0,e.jsx)("p",{className:"activity-subtitle",children:"Real-time scans across all groups"}),(0,e.jsx)(ve,{refreshInterval:2e4})]}),h==="my-stats"&&(0,e.jsx)(s.div,{className:"my-stats-content",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,e.jsx)(ge,{user:N,onClaim:()=>u(!0)})})]})]}),(0,e.jsx)("section",{className:"cta-section",children:(0,e.jsxs)(s.div,{className:"cta-content",initial:{opacity:0,scale:.9},whileInView:{opacity:1,scale:1},viewport:{once:!0},children:[(0,e.jsx)("h2",{children:"Ready to Start Earning?"}),(0,e.jsx)("p",{children:"Every wallet analysis brings you closer to equity rewards"}),(0,e.jsxs)(s.button,{className:"btn-primary large",whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>o("/app-evm"),children:[(0,e.jsx)(ae,{size:20}),"Analyze Your First Wallet"]})]})}),(0,e.jsx)("footer",{className:"rewards-footer",children:(0,e.jsxs)("div",{className:"footer-content",children:[(0,e.jsx)("p",{children:"5% equity pool • 12-24 month vesting • 3-12 month cliffs"}),(0,e.jsx)("p",{className:"disclaimer",children:"All rewards subject to terms and conditions. Equity vests over time."})]})})]})})}export{Ee as default};
