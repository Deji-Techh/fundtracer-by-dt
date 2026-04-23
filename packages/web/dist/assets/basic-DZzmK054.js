import{o as Gt,t as M}from"./rolldown-runtime-MddlTo9B.js";import{dt as Jt,i as It,n as u,t as R}from"./vendor-3fpDGbiB.js";import{D as Yt,E as B,O as At,R as Wt,S as kt,U as Fe,b as me,d as J,f as ct,g as H,m as Bt,n as ge,o as P,p as k,t as L,w as V,x as $t,y as Me}from"./ApiController-zS96WaDr.js";import{_ as Ne,d as z,f as Ct,g as Qt,h as d,i as pe,l as U,n as N,o as Y,r as de}from"./ConstantsUtil-Bhvl2gyf.js";import{i as D,n as Xt,r as Zt,t as ei}from"./wui-ux-by-reown-DXsVx4p8.js";import{i as ti,n as dt,r as ii,t as ve}from"./ConnectorUtil-D_pDo9ZK.js";var Pe=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},ye=class extends z{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=J.state.connectors,this.count=L.state.count,this.filteredCount=L.state.filteredWallets.length,this.isFetchingRecommendedWallets=L.state.isFetchingRecommendedWallets,this.unsubscribe.push(J.subscribeKey("connectors",t=>this.connectors=t),L.subscribeKey("count",t=>this.count=t),L.subscribeKey("filteredWallets",t=>this.filteredCount=t.length),L.subscribeKey("isFetchingRecommendedWallets",t=>this.isFetchingRecommendedWallets=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){const t=this.connectors.find(c=>c.id==="walletConnect"),{allWallets:o}=V.state;if(!t||o==="HIDE"||o==="ONLY_MOBILE"&&!B.isMobile())return null;const r=L.state.featured.length,n=this.count+r,i=n<10?n:Math.floor(n/10)*10,a=this.filteredCount>0?this.filteredCount:i;let s=`${a}`;this.filteredCount>0?s=`${this.filteredCount}`:a<n&&(s=`${a}+`);const l=P.hasAnyConnection(Fe.CONNECTOR_ID.WALLET_CONNECT);return d`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${s}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${D(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${l}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){H.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),k.push("AllWallets",{redirectView:k.state.data?.redirectView})}};Pe([u()],ye.prototype,"tabIdx",void 0);Pe([R()],ye.prototype,"connectors",void 0);Pe([R()],ye.prototype,"count",void 0);Pe([R()],ye.prototype,"filteredCount",void 0);Pe([R()],ye.prototype,"isFetchingRecommendedWallets",void 0);ye=Pe([N("w3m-all-wallets-widget")],ye);var ni=U`
  :host {
    margin-top: ${({spacing:e})=>e[1]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e[3]} calc(${({spacing:e})=>e[3]} * -1)
      ${({spacing:e})=>e[2]} calc(${({spacing:e})=>e[3]} * -1);
    width: calc(100% + ${({spacing:e})=>e[3]} * 2);
  }
`,fe=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},te=class extends z{constructor(){super(),this.unsubscribe=[],this.connectors=J.state.connectors,this.recommended=L.state.recommended,this.featured=L.state.featured,this.explorerWallets=L.state.explorerWallets,this.connections=P.state.connections,this.connectorImages=$t.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(J.subscribeKey("connectors",t=>this.connectors=t),P.subscribeKey("connections",t=>this.connections=t),$t.subscribeKey("connectorImages",t=>this.connectorImages=t),L.subscribeKey("recommended",t=>this.recommended=t),L.subscribeKey("featured",t=>this.featured=t),L.subscribeKey("explorerFilteredWallets",t=>{this.explorerWallets=t?.length?t:L.state.explorerWallets}),L.subscribeKey("explorerWallets",t=>{this.explorerWallets?.length||(this.explorerWallets=t)})),B.isTelegram()&&B.isIos()&&(this.loadingTelegram=!P.state.wcUri,this.unsubscribe.push(P.subscribeKey("wcUri",t=>this.loadingTelegram=!t)))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return d`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}mapConnectorsToExplorerWallets(t,o){return t.map(r=>{if(r.type==="MULTI_CHAIN"&&r.connectors){const n=r.connectors.map(s=>s.id),i=r.connectors.map(s=>s.name),a=r.connectors.map(s=>s.info?.rdns);return r.explorerWallet=o?.find(s=>n.includes(s.id)||i.includes(s.name)||s.rdns&&(a.includes(s.rdns)||n.includes(s.rdns)))??r.explorerWallet,r}return r.explorerWallet=o?.find(n=>n.id===r.id||n.rdns===r.info?.rdns||n.name===r.name)??r.explorerWallet,r})}processConnectorsByType(t,o=!0){const r=ve.sortConnectorsByExplorerWallet([...t]);return o?r.filter(ve.showConnector):r}connectorListTemplate(){const t=this.mapConnectorsToExplorerWallets(this.connectors,this.explorerWallets??[]),o=ve.getConnectorsByType(t,this.recommended,this.featured),r=this.processConnectorsByType(o.announced.filter(p=>p.id!=="walletConnect")),n=this.processConnectorsByType(o.injected),i=this.processConnectorsByType(o.multiChain.filter(p=>p.name!=="WalletConnect"),!1),a=o.custom,s=o.recent,l=this.processConnectorsByType(o.external.filter(p=>p.id!==Fe.CONNECTOR_ID.COINBASE_SDK)),c=o.recommended,h=o.featured,W=ve.getConnectorTypeOrder({custom:a,recent:s,announced:r,injected:n,multiChain:i,recommended:c,featured:h,external:l}),m=this.connectors.find(p=>p.id==="walletConnect"),w=B.isMobile(),v=[];for(const p of W)switch(p){case"walletConnect":!w&&m&&v.push({kind:"connector",subtype:"walletConnect",connector:m});break;case"recent":ve.getFilteredRecentWallets().forEach(f=>v.push({kind:"wallet",subtype:"recent",wallet:f}));break;case"injected":i.forEach(f=>v.push({kind:"connector",subtype:"multiChain",connector:f})),r.forEach(f=>v.push({kind:"connector",subtype:"announced",connector:f})),n.forEach(f=>v.push({kind:"connector",subtype:"injected",connector:f}));break;case"featured":h.forEach(f=>v.push({kind:"wallet",subtype:"featured",wallet:f}));break;case"custom":ve.getFilteredCustomWallets(a??[]).forEach(f=>v.push({kind:"wallet",subtype:"custom",wallet:f}));break;case"external":l.forEach(f=>v.push({kind:"connector",subtype:"external",connector:f}));break;case"recommended":ve.getCappedRecommendedWallets(c).forEach(f=>v.push({kind:"wallet",subtype:"recommended",wallet:f}));break;default:console.warn(`Unknown connector type: ${p}`)}return v.map((p,f)=>p.kind==="connector"?this.renderConnector(p,f):this.renderWallet(p,f))}renderConnector(t,o){const r=t.connector,n=me.getConnectorImage(r)||this.connectorImages[r?.imageId??""],i=(this.connections.get(r.chain)??[]).some(h=>ti.isLowerCaseMatch(h.connectorId,r.id));let a,s;t.subtype==="multiChain"?(a="multichain",s="info"):t.subtype==="walletConnect"?(a="qr code",s="accent"):t.subtype==="injected"||t.subtype==="announced"?(a=i?"connected":"installed",s=i?"info":"success"):(a=void 0,s=void 0);const l=P.hasAnyConnection(Fe.CONNECTOR_ID.WALLET_CONNECT),c=t.subtype==="walletConnect"||t.subtype==="external"?l:!1;return d`
      <w3m-list-wallet
        displayIndex=${o}
        imageSrc=${D(n)}
        .installed=${!0}
        name=${r.name??"Unknown"}
        .tagVariant=${s}
        tagLabel=${D(a)}
        data-testid=${`wallet-selector-${r.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(t)}
        tabIdx=${D(this.tabIdx)}
        ?disabled=${c}
        rdnsId=${D(r.explorerWallet?.rdns||void 0)}
        walletRank=${D(r.explorerWallet?.order)}
      >
      </w3m-list-wallet>
    `}onClickConnector(t){const o=k.state.data?.redirectView;if(t.subtype==="walletConnect"){J.setActiveConnector(t.connector),B.isMobile()?k.push("AllWallets"):k.push("ConnectingWalletConnect",{redirectView:o});return}if(t.subtype==="multiChain"){J.setActiveConnector(t.connector),k.push("ConnectingMultiChain",{redirectView:o});return}if(t.subtype==="injected"){J.setActiveConnector(t.connector),k.push("ConnectingExternal",{connector:t.connector,redirectView:o,wallet:t.connector.explorerWallet});return}if(t.subtype==="announced"){if(t.connector.id==="walletConnect"){B.isMobile()?k.push("AllWallets"):k.push("ConnectingWalletConnect",{redirectView:o});return}k.push("ConnectingExternal",{connector:t.connector,redirectView:o,wallet:t.connector.explorerWallet});return}k.push("ConnectingExternal",{connector:t.connector,redirectView:o})}renderWallet(t,o){const r=t.wallet,n=me.getWalletImage(r),i=P.hasAnyConnection(Fe.CONNECTOR_ID.WALLET_CONNECT),a=this.loadingTelegram,s=t.subtype==="recent"?"recent":void 0,l=t.subtype==="recent"?"info":void 0;return d`
      <w3m-list-wallet
        displayIndex=${o}
        imageSrc=${D(n)}
        name=${r.name??"Unknown"}
        @click=${()=>this.onClickWallet(t)}
        size="sm"
        data-testid=${`wallet-selector-${r.id}`}
        tabIdx=${D(this.tabIdx)}
        ?loading=${a}
        ?disabled=${i}
        rdnsId=${D(r.rdns||void 0)}
        walletRank=${D(r.order)}
        tagLabel=${D(s)}
        .tagVariant=${l}
      >
      </w3m-list-wallet>
    `}onClickWallet(t){const o=k.state.data?.redirectView;if(t.subtype==="featured"){J.selectWalletConnector(t.wallet);return}if(t.subtype==="recent"){if(this.loadingTelegram)return;J.selectWalletConnector(t.wallet);return}if(t.subtype==="custom"){if(this.loadingTelegram)return;k.push("ConnectingWalletConnect",{wallet:t.wallet,redirectView:o});return}if(this.loadingTelegram)return;const r=J.getConnector({id:t.wallet.id,rdns:t.wallet.rdns});r?k.push("ConnectingExternal",{connector:r,redirectView:o}):k.push("ConnectingWalletConnect",{wallet:t.wallet,redirectView:o})}};te.styles=ni;fe([u({type:Number})],te.prototype,"tabIdx",void 0);fe([R()],te.prototype,"connectors",void 0);fe([R()],te.prototype,"recommended",void 0);fe([R()],te.prototype,"featured",void 0);fe([R()],te.prototype,"explorerWallets",void 0);fe([R()],te.prototype,"connections",void 0);fe([R()],te.prototype,"connectorImages",void 0);fe([R()],te.prototype,"loadingTelegram",void 0);te=fe([N("w3m-connector-list")],te);var ri=U`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`,ze=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},oi={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},ai={lg:"md",md:"sm",sm:"sm"},$e=class extends z{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return d`
      <button data-active=${this.active}>
        ${this.icon?d`<wui-icon size=${ai[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${oi[this.size]}> ${this.label} </wui-text>
      </button>
    `}};$e.styles=[Y,pe,ri];ze([u()],$e.prototype,"icon",void 0);ze([u()],$e.prototype,"size",void 0);ze([u()],$e.prototype,"label",void 0);ze([u({type:Boolean})],$e.prototype,"active",void 0);$e=ze([N("wui-tab-item")],$e);var si=U`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`,je=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Ce=class extends z{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((t,o)=>{const r=o===this.activeTab;return d`
        <wui-tab-item
          @click=${()=>this.onTabClick(o)}
          icon=${t.icon}
          size=${this.size}
          label=${t.label}
          ?active=${r}
          data-active=${r}
          data-testid="tab-${t.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(t){this.activeTab=t,this.onTabChange(t)}};Ce.styles=[Y,pe,si];je([u({type:Array})],Ce.prototype,"tabs",void 0);je([u()],Ce.prototype,"onTabChange",void 0);je([u()],Ce.prototype,"size",void 0);je([R()],Ce.prototype,"activeTab",void 0);Ce=je([N("wui-tabs")],Ce);var ht=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Ve=class extends z{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(t=>t())}render(){return d`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${this.generateTabs()} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){const t=this.platforms.map(o=>o==="browser"?{label:"Browser",icon:"extension",platform:"browser"}:o==="mobile"?{label:"Mobile",icon:"mobile",platform:"mobile"}:o==="qrcode"?{label:"Mobile",icon:"mobile",platform:"qrcode"}:o==="web"?{label:"Webapp",icon:"browser",platform:"web"}:o==="desktop"?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=t.map(({platform:o})=>o),t}onTabChange(t){const o=this.platformTabs[t];o&&this.onSelectPlatfrom?.(o)}};ht([u({type:Array})],Ve.prototype,"platforms",void 0);ht([u()],Ve.prototype,"onSelectPlatfrom",void 0);Ve=ht([N("w3m-connecting-header")],Ve);var li=U`
  :host {
    width: var(--local-width);
  }

  button {
    width: var(--local-width);
    white-space: nowrap;
    column-gap: ${({spacing:e})=>e[2]};
    transition:
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: scale, background-color, border-radius;
    cursor: pointer;
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[2]};
    padding: 0 ${({spacing:e})=>e[2]};
    height: 28px;
  }

  button[data-size='md'] {
    border-radius: ${({borderRadius:e})=>e[3]};
    padding: 0 ${({spacing:e})=>e[4]};
    height: 38px;
  }

  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: 0 ${({spacing:e})=>e[5]};
    height: 48px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-variant='accent-primary'] {
    background-color: ${({tokens:e})=>e.core.backgroundAccentPrimary};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='accent-secondary'] {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button[data-variant='neutral-primary'] {
    background-color: ${({tokens:e})=>e.theme.backgroundInvert};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='neutral-secondary'] {
    background-color: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button[data-variant='neutral-tertiary'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button[data-variant='error-primary'] {
    background-color: ${({tokens:e})=>e.core.textError};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='error-secondary'] {
    background-color: ${({tokens:e})=>e.core.backgroundError};
    color: ${({tokens:e})=>e.core.textError};
  }

  button[data-variant='shade'] {
    background: var(--wui-color-gray-glass-002);
    color: var(--wui-color-fg-200);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  /* -- Focus states --------------------------------------------------- */
  button[data-size='sm']:focus-visible:enabled {
    border-radius: 28px;
  }

  button[data-size='md']:focus-visible:enabled {
    border-radius: 38px;
  }

  button[data-size='lg']:focus-visible:enabled {
    border-radius: 48px;
  }
  button[data-variant='shade']:focus-visible:enabled {
    background: var(--wui-color-gray-glass-005);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-gray-glass-002);
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button[data-size='sm']:hover:enabled {
      border-radius: 28px;
    }

    button[data-size='md']:hover:enabled {
      border-radius: 38px;
    }

    button[data-size='lg']:hover:enabled {
      border-radius: 48px;
    }

    button[data-variant='shade']:hover:enabled {
      background: var(--wui-color-gray-glass-002);
    }

    button[data-variant='shade']:active:enabled {
      background: var(--wui-color-gray-glass-005);
    }
  }

  button[data-size='sm']:active:enabled {
    border-radius: 28px;
  }

  button[data-size='md']:active:enabled {
    border-radius: 38px;
  }

  button[data-size='lg']:active:enabled {
    border-radius: 48px;
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    opacity: 0.3;
  }
`,Re=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},ci={lg:"lg-regular-mono",md:"md-regular-mono",sm:"sm-regular-mono"},di={lg:"md",md:"md",sm:"sm"},ue=class extends z{constructor(){super(...arguments),this.size="lg",this.disabled=!1,this.fullWidth=!1,this.loading=!1,this.variant="accent-primary"}render(){this.style.cssText=`
    --local-width: ${this.fullWidth?"100%":"auto"};
     `;const t=this.textVariant??ci[this.size];return d`
      <button data-variant=${this.variant} data-size=${this.size} ?disabled=${this.disabled}>
        ${this.loadingTemplate()}
        <slot name="iconLeft"></slot>
        <wui-text variant=${t} color="inherit">
          <slot></slot>
        </wui-text>
        <slot name="iconRight"></slot>
      </button>
    `}loadingTemplate(){if(this.loading){const t=di[this.size];return d`<wui-loading-spinner color=${this.variant==="neutral-primary"||this.variant==="accent-primary"?"invert":"primary"} size=${t}></wui-loading-spinner>`}return null}};ue.styles=[Y,pe,li];Re([u()],ue.prototype,"size",void 0);Re([u({type:Boolean})],ue.prototype,"disabled",void 0);Re([u({type:Boolean})],ue.prototype,"fullWidth",void 0);Re([u({type:Boolean})],ue.prototype,"loading",void 0);Re([u()],ue.prototype,"variant",void 0);Re([u()],ue.prototype,"textVariant",void 0);ue=Re([N("wui-button")],ue);var ui=U`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${e=>e.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`,Pt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},He=class extends z{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){const t=this.radius>50?50:this.radius,o=36-t;return d`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${t}
          stroke-dasharray="${116+o} ${245+o}"
          stroke-dashoffset=${360+o*1.75}
        />
      </svg>
    `}};He.styles=[Y,ui];Pt([u({type:Number})],He.prototype,"radius",void 0);He=Pt([N("wui-loading-thumbnail")],He);var hi=U`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`,tt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},ke=class extends z{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return d`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};ke.styles=[Y,pe,hi];tt([u({type:Boolean})],ke.prototype,"disabled",void 0);tt([u()],ke.prototype,"label",void 0);tt([u()],ke.prototype,"buttonLabel",void 0);ke=tt([N("wui-cta-button")],ke);var pi=U`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e[5]} ${({spacing:e})=>e[5]};
  }
`,Lt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Ke=class extends z{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;const{name:t,app_store:o,play_store:r,chrome_store:n,homepage:i}=this.wallet,a=B.isMobile(),s=B.isIos(),l=B.isAndroid(),c=[o,r,i,n].filter(Boolean).length>1,h=de.getTruncateString({string:t,charsStart:12,charsEnd:0,truncate:"end"});return c&&!a?d`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${()=>k.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!c&&i?d`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:o&&s?d`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:r&&l?d`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&B.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&B.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&B.openHref(this.wallet.homepage,"_blank")}};Ke.styles=[pi];Lt([u({type:Object})],Ke.prototype,"wallet",void 0);Ke=Lt([N("w3m-mobile-download-links")],Ke);var fi=U`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e[1]} * -1);
    bottom: calc(${({spacing:e})=>e[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`,ie=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},F=class extends z{constructor(){super(),this.wallet=k.state.data?.wallet,this.connector=k.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=me.getConnectorImage(this.connector)??me.getWalletImage(this.wallet),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=P.state.wcUri,this.error=P.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(P.subscribeKey("wcUri",e=>{this.uri=e,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),P.subscribeKey("wcError",e=>this.error=e)),(B.isTelegram()||B.isSafari())&&B.isIos()&&P.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),P.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();const e=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel;let t="";return this.label?t=this.label:(t=`Continue in ${this.name}`,this.error&&(t="Connection declined")),d`
      <wui-flex
        data-error=${D(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${D(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","0","0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?"error":"primary"}>
            ${t}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?d`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?d`
              <wui-flex .padding=${["0","5","5","5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){this.error&&!this.showRetry&&(this.showRetry=!0,this.shadowRoot?.querySelector("wui-button")?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"}))}onTryAgain(){P.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){const e=ct.state.themeVariables["--w3m-border-radius-master"];return d`<wui-loading-thumbnail radius=${(e?parseInt(e.replace("px",""),10):4)*9}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(B.copyToClopboard(this.uri),Me.showSuccess("Link copied"))}catch{Me.showError("Failed to copy")}}};F.styles=fi;ie([R()],F.prototype,"isRetrying",void 0);ie([R()],F.prototype,"uri",void 0);ie([R()],F.prototype,"error",void 0);ie([R()],F.prototype,"ready",void 0);ie([R()],F.prototype,"showRetry",void 0);ie([R()],F.prototype,"label",void 0);ie([R()],F.prototype,"secondaryBtnLabel",void 0);ie([R()],F.prototype,"secondaryLabel",void 0);ie([R()],F.prototype,"isLoading",void 0);ie([u({type:Boolean})],F.prototype,"isMobile",void 0);ie([u()],F.prototype,"onRetry",void 0);var gi=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},xt=class extends F{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:k.state.view}})}async onConnectProxy(){try{this.error=!1;const{connectors:t}=J.state,o=t.find(r=>r.type==="ANNOUNCED"&&r.info?.rdns===this.wallet?.rdns||r.type==="INJECTED"||r.name===this.wallet?.name);if(o)await P.connectExternal(o,o.chain);else throw new Error("w3m-connecting-wc-browser: No connector found");Bt.close(),H.sendEvent({type:"track",event:"CONNECT_SUCCESS",properties:{method:"browser",name:this.wallet?.name||"Unknown",view:k.state.view,walletRank:this.wallet?.order}})}catch(t){t instanceof kt&&t.originalName===Wt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?H.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:t.message}}):H.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:t?.message??"Unknown"}}),this.error=!0}}};xt=gi([N("w3m-connecting-wc-browser")],xt);var mi=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},_t=class extends F{constructor(){if(super(),!this.wallet)throw new Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:k.state.view}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;const{desktop_link:t,name:o}=this.wallet,{redirect:r,href:n}=B.formatNativeUrl(t,this.uri);P.setWcLinking({name:o,href:n}),P.setRecentWallet(this.wallet),B.openHref(r,"_blank")}catch{this.error=!0}}};_t=mi([N("w3m-connecting-wc-desktop")],_t);var Le=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},xe=class extends F{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=V.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{if(this.wallet?.mobile_link&&this.uri)try{this.error=!1;const{mobile_link:t,link_mode:o,name:r}=this.wallet,{redirect:n,redirectUniversalLink:i,href:a}=B.formatNativeUrl(t,this.uri,o);this.redirectDeeplink=n,this.redirectUniversalLink=i,this.target=B.isIframe()?"_top":"_self",P.setWcLinking({name:r,href:a}),P.setRecentWallet(this.wallet),this.preferUniversalLinks&&this.redirectUniversalLink?B.openHref(this.redirectUniversalLink,this.target):B.openHref(this.redirectDeeplink,this.target)}catch(t){H.sendEvent({type:"track",event:"CONNECT_PROXY_ERROR",properties:{message:t instanceof Error?t.message:"Error parsing the deeplink",uri:this.uri,mobile_link:this.wallet.mobile_link,name:this.wallet.name}}),this.error=!0}},!this.wallet)throw new Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=At.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(P.subscribeKey("wcUri",()=>{this.onHandleURI()})),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:k.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){P.setWcError(!1),this.onConnect?.()}};Le([R()],xe.prototype,"redirectDeeplink",void 0);Le([R()],xe.prototype,"redirectUniversalLink",void 0);Le([R()],xe.prototype,"target",void 0);Le([R()],xe.prototype,"preferUniversalLinks",void 0);Le([R()],xe.prototype,"isLoading",void 0);xe=Le([N("w3m-connecting-wc-mobile")],xe);var wi=M((e,t)=>{t.exports=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}}),Te=M(e=>{var t,o=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];e.getSymbolSize=function(n){if(!n)throw new Error('"version" cannot be null or undefined');if(n<1||n>40)throw new Error('"version" should be in range from 1 to 40');return n*4+17},e.getSymbolTotalCodewords=function(n){return o[n]},e.getBCHDigit=function(r){let n=0;for(;r!==0;)n++,r>>>=1;return n},e.setToSJISFunction=function(n){if(typeof n!="function")throw new Error('"toSJISFunc" is not a valid function.');t=n},e.isKanjiModeEnabled=function(){return typeof t<"u"},e.toSJIS=function(n){return t(n)}}),pt=M(e=>{e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(o){if(typeof o!="string")throw new Error("Param is not a string");switch(o.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+o)}}e.isValid=function(r){return r&&typeof r.bit<"u"&&r.bit>=0&&r.bit<4},e.from=function(r,n){if(e.isValid(r))return r;try{return t(r)}catch{return n}}}),bi=M((e,t)=>{function o(){this.buffer=[],this.length=0}o.prototype={get:function(r){const n=Math.floor(r/8);return(this.buffer[n]>>>7-r%8&1)===1},put:function(r,n){for(let i=0;i<n;i++)this.putBit((r>>>n-i-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(r){const n=Math.floor(this.length/8);this.buffer.length<=n&&this.buffer.push(0),r&&(this.buffer[n]|=128>>>this.length%8),this.length++}},t.exports=o}),vi=M((e,t)=>{function o(r){if(!r||r<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=r,this.data=new Uint8Array(r*r),this.reservedBit=new Uint8Array(r*r)}o.prototype.set=function(r,n,i,a){const s=r*this.size+n;this.data[s]=i,a&&(this.reservedBit[s]=!0)},o.prototype.get=function(r,n){return this.data[r*this.size+n]},o.prototype.xor=function(r,n,i){this.data[r*this.size+n]^=i},o.prototype.isReserved=function(r,n){return this.reservedBit[r*this.size+n]},t.exports=o}),yi=M(e=>{var t=Te().getSymbolSize;e.getRowColCoords=function(r){if(r===1)return[];const n=Math.floor(r/7)+2,i=t(r),a=i===145?26:Math.ceil((i-13)/(2*n-2))*2,s=[i-7];for(let l=1;l<n-1;l++)s[l]=s[l-1]-a;return s.push(6),s.reverse()},e.getPositions=function(r){const n=[],i=e.getRowColCoords(r),a=i.length;for(let s=0;s<a;s++)for(let l=0;l<a;l++)s===0&&l===0||s===0&&l===a-1||s===a-1&&l===0||n.push([i[s],i[l]]);return n}}),$i=M(e=>{var t=Te().getSymbolSize,o=7;e.getPositions=function(n){const i=t(n);return[[0,0],[i-o,0],[0,i-o]]}}),Ci=M(e=>{e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(n){return n!=null&&n!==""&&!isNaN(n)&&n>=0&&n<=7},e.from=function(n){return e.isValid(n)?parseInt(n,10):void 0},e.getPenaltyN1=function(n){const i=n.size;let a=0,s=0,l=0,c=null,h=null;for(let W=0;W<i;W++){s=l=0,c=h=null;for(let m=0;m<i;m++){let w=n.get(W,m);w===c?s++:(s>=5&&(a+=t.N1+(s-5)),c=w,s=1),w=n.get(m,W),w===h?l++:(l>=5&&(a+=t.N1+(l-5)),h=w,l=1)}s>=5&&(a+=t.N1+(s-5)),l>=5&&(a+=t.N1+(l-5))}return a},e.getPenaltyN2=function(n){const i=n.size;let a=0;for(let s=0;s<i-1;s++)for(let l=0;l<i-1;l++){const c=n.get(s,l)+n.get(s,l+1)+n.get(s+1,l)+n.get(s+1,l+1);(c===4||c===0)&&a++}return a*t.N2},e.getPenaltyN3=function(n){const i=n.size;let a=0,s=0,l=0;for(let c=0;c<i;c++){s=l=0;for(let h=0;h<i;h++)s=s<<1&2047|n.get(c,h),h>=10&&(s===1488||s===93)&&a++,l=l<<1&2047|n.get(h,c),h>=10&&(l===1488||l===93)&&a++}return a*t.N3},e.getPenaltyN4=function(n){let i=0;const a=n.data.length;for(let s=0;s<a;s++)i+=n.data[s];return Math.abs(Math.ceil(i*100/a/5)-10)*t.N4};function o(r,n,i){switch(r){case e.Patterns.PATTERN000:return(n+i)%2===0;case e.Patterns.PATTERN001:return n%2===0;case e.Patterns.PATTERN010:return i%3===0;case e.Patterns.PATTERN011:return(n+i)%3===0;case e.Patterns.PATTERN100:return(Math.floor(n/2)+Math.floor(i/3))%2===0;case e.Patterns.PATTERN101:return n*i%2+n*i%3===0;case e.Patterns.PATTERN110:return(n*i%2+n*i%3)%2===0;case e.Patterns.PATTERN111:return(n*i%3+(n+i)%2)%2===0;default:throw new Error("bad maskPattern:"+r)}}e.applyMask=function(n,i){const a=i.size;for(let s=0;s<a;s++)for(let l=0;l<a;l++)i.isReserved(l,s)||i.xor(l,s,o(n,l,s))},e.getBestMask=function(n,i){const a=Object.keys(e.Patterns).length;let s=0,l=1/0;for(let c=0;c<a;c++){i(c),e.applyMask(c,n);const h=e.getPenaltyN1(n)+e.getPenaltyN2(n)+e.getPenaltyN3(n)+e.getPenaltyN4(n);e.applyMask(c,n),h<l&&(l=h,s=c)}return s}}),Nt=M(e=>{var t=pt(),o=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],r=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];e.getBlocksCount=function(i,a){switch(a){case t.L:return o[(i-1)*4+0];case t.M:return o[(i-1)*4+1];case t.Q:return o[(i-1)*4+2];case t.H:return o[(i-1)*4+3];default:return}},e.getTotalCodewordsCount=function(i,a){switch(a){case t.L:return r[(i-1)*4+0];case t.M:return r[(i-1)*4+1];case t.Q:return r[(i-1)*4+2];case t.H:return r[(i-1)*4+3];default:return}}}),xi=M(e=>{var t=new Uint8Array(512),o=new Uint8Array(256);(function(){let n=1;for(let i=0;i<255;i++)t[i]=n,o[n]=i,n<<=1,n&256&&(n^=285);for(let i=255;i<512;i++)t[i]=t[i-255]})(),e.log=function(n){if(n<1)throw new Error("log("+n+")");return o[n]},e.exp=function(n){return t[n]},e.mul=function(n,i){return n===0||i===0?0:t[o[n]+o[i]]}}),_i=M(e=>{var t=xi();e.mul=function(r,n){const i=new Uint8Array(r.length+n.length-1);for(let a=0;a<r.length;a++)for(let s=0;s<n.length;s++)i[a+s]^=t.mul(r[a],n[s]);return i},e.mod=function(r,n){let i=new Uint8Array(r);for(;i.length-n.length>=0;){const a=i[0];for(let l=0;l<n.length;l++)i[l]^=t.mul(n[l],a);let s=0;for(;s<i.length&&i[s]===0;)s++;i=i.slice(s)}return i},e.generateECPolynomial=function(r){let n=new Uint8Array([1]);for(let i=0;i<r;i++)n=e.mul(n,new Uint8Array([1,t.exp(i)]));return n}}),Ei=M((e,t)=>{var o=_i();function r(n){this.genPoly=void 0,this.degree=n,this.degree&&this.initialize(this.degree)}r.prototype.initialize=function(i){this.degree=i,this.genPoly=o.generateECPolynomial(this.degree)},r.prototype.encode=function(i){if(!this.genPoly)throw new Error("Encoder not initialized");const a=new Uint8Array(i.length+this.degree);a.set(i);const s=o.mod(a,this.genPoly),l=this.degree-s.length;if(l>0){const c=new Uint8Array(this.degree);return c.set(s,l),c}return s},t.exports=r}),Ot=M(e=>{e.isValid=function(o){return!isNaN(o)&&o>=1&&o<=40}}),Mt=M(e=>{var t="[0-9]+",o="[A-Z $%*+\\-./:]+",r="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";r=r.replace(/u/g,"\\u");var n="(?:(?![A-Z0-9 $%*+\\-./:]|"+r+`)(?:.|[\r
]))+`;e.KANJI=new RegExp(r,"g"),e.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),e.BYTE=new RegExp(n,"g"),e.NUMERIC=new RegExp(t,"g"),e.ALPHANUMERIC=new RegExp(o,"g");var i=new RegExp("^"+r+"$"),a=new RegExp("^"+t+"$"),s=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");e.testKanji=function(c){return i.test(c)},e.testNumeric=function(c){return a.test(c)},e.testAlphanumeric=function(c){return s.test(c)}}),Se=M(e=>{var t=Ot(),o=Mt();e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(i,a){if(!i.ccBits)throw new Error("Invalid mode: "+i);if(!t.isValid(a))throw new Error("Invalid version: "+a);return a>=1&&a<10?i.ccBits[0]:a<27?i.ccBits[1]:i.ccBits[2]},e.getBestModeForData=function(i){return o.testNumeric(i)?e.NUMERIC:o.testAlphanumeric(i)?e.ALPHANUMERIC:o.testKanji(i)?e.KANJI:e.BYTE},e.toString=function(i){if(i&&i.id)return i.id;throw new Error("Invalid mode")},e.isValid=function(i){return i&&i.bit&&i.ccBits};function r(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+n)}}e.from=function(i,a){if(e.isValid(i))return i;try{return r(i)}catch{return a}}}),Ri=M(e=>{var t=Te(),o=Nt(),r=pt(),n=Se(),i=Ot(),a=7973,s=t.getBCHDigit(a);function l(m,w,v){for(let p=1;p<=40;p++)if(w<=e.getCapacity(p,v,m))return p}function c(m,w){return n.getCharCountIndicator(m,w)+4}function h(m,w){let v=0;return m.forEach(function(p){const f=c(p.mode,w);v+=f+p.getBitsLength()}),v}function W(m,w){for(let v=1;v<=40;v++)if(h(m,v)<=e.getCapacity(v,w,n.MIXED))return v}e.from=function(w,v){return i.isValid(w)?parseInt(w,10):v},e.getCapacity=function(w,v,p){if(!i.isValid(w))throw new Error("Invalid QR Code version");typeof p>"u"&&(p=n.BYTE);const f=(t.getSymbolTotalCodewords(w)-o.getTotalCodewordsCount(w,v))*8;if(p===n.MIXED)return f;const $=f-c(p,w);switch(p){case n.NUMERIC:return Math.floor($/10*3);case n.ALPHANUMERIC:return Math.floor($/11*2);case n.KANJI:return Math.floor($/13);case n.BYTE:default:return Math.floor($/8)}},e.getBestVersionForData=function(w,v){let p;const f=r.from(v,r.M);if(Array.isArray(w)){if(w.length>1)return W(w,f);if(w.length===0)return 1;p=w[0]}else p=w;return l(p.mode,p.getLength(),f)},e.getEncodedBits=function(w){if(!i.isValid(w)||w<7)throw new Error("Invalid QR Code version");let v=w<<12;for(;t.getBCHDigit(v)-s>=0;)v^=a<<t.getBCHDigit(v)-s;return w<<12|v}}),Ti=M(e=>{var t=Te(),o=1335,r=21522,n=t.getBCHDigit(o);e.getEncodedBits=function(a,s){const l=a.bit<<3|s;let c=l<<10;for(;t.getBCHDigit(c)-n>=0;)c^=o<<t.getBCHDigit(c)-n;return(l<<10|c)^r}}),Si=M((e,t)=>{var o=Se();function r(n){this.mode=o.NUMERIC,this.data=n.toString()}r.getBitsLength=function(i){return 10*Math.floor(i/3)+(i%3?i%3*3+1:0)},r.prototype.getLength=function(){return this.data.length},r.prototype.getBitsLength=function(){return r.getBitsLength(this.data.length)},r.prototype.write=function(i){let a,s,l;for(a=0;a+3<=this.data.length;a+=3)s=this.data.substr(a,3),l=parseInt(s,10),i.put(l,10);const c=this.data.length-a;c>0&&(s=this.data.substr(a),l=parseInt(s,10),i.put(l,c*3+1))},t.exports=r}),Ii=M((e,t)=>{var o=Se(),r=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(i){this.mode=o.ALPHANUMERIC,this.data=i}n.getBitsLength=function(a){return 11*Math.floor(a/2)+6*(a%2)},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(a){let s;for(s=0;s+2<=this.data.length;s+=2){let l=r.indexOf(this.data[s])*45;l+=r.indexOf(this.data[s+1]),a.put(l,11)}this.data.length%2&&a.put(r.indexOf(this.data[s]),6)},t.exports=n}),Ai=M((e,t)=>{t.exports=function(r){for(var n=[],i=r.length,a=0;a<i;a++){var s=r.charCodeAt(a);if(s>=55296&&s<=56319&&i>a+1){var l=r.charCodeAt(a+1);l>=56320&&l<=57343&&(s=(s-55296)*1024+l-56320+65536,a+=1)}if(s<128){n.push(s);continue}if(s<2048){n.push(s>>6|192),n.push(s&63|128);continue}if(s<55296||s>=57344&&s<65536){n.push(s>>12|224),n.push(s>>6&63|128),n.push(s&63|128);continue}if(s>=65536&&s<=1114111){n.push(s>>18|240),n.push(s>>12&63|128),n.push(s>>6&63|128),n.push(s&63|128);continue}n.push(239,191,189)}return new Uint8Array(n).buffer}}),Wi=M((e,t)=>{var o=Ai(),r=Se();function n(i){this.mode=r.BYTE,typeof i=="string"&&(i=o(i)),this.data=new Uint8Array(i)}n.getBitsLength=function(a){return a*8},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(i){for(let a=0,s=this.data.length;a<s;a++)i.put(this.data[a],8)},t.exports=n}),ki=M((e,t)=>{var o=Se(),r=Te();function n(i){this.mode=o.KANJI,this.data=i}n.getBitsLength=function(a){return a*13},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(i){let a;for(a=0;a<this.data.length;a++){let s=r.toSJIS(this.data[a]);if(s>=33088&&s<=40956)s-=33088;else if(s>=57408&&s<=60351)s-=49472;else throw new Error("Invalid SJIS character: "+this.data[a]+`
Make sure your charset is UTF-8`);s=(s>>>8&255)*192+(s&255),i.put(s,13)}},t.exports=n}),Bi=M(e=>{var t=Se(),o=Si(),r=Ii(),n=Wi(),i=ki(),a=Mt(),s=Te(),l=Jt();function c($){return unescape(encodeURIComponent($)).length}function h($,b,x){const g=[];let O;for(;(O=$.exec(x))!==null;)g.push({data:O[0],index:O.index,mode:b,length:O[0].length});return g}function W($){const b=h(a.NUMERIC,t.NUMERIC,$),x=h(a.ALPHANUMERIC,t.ALPHANUMERIC,$);let g,O;return s.isKanjiModeEnabled()?(g=h(a.BYTE,t.BYTE,$),O=h(a.KANJI,t.KANJI,$)):(g=h(a.BYTE_KANJI,t.BYTE,$),O=[]),b.concat(x,g,O).sort(function(q,E){return q.index-E.index}).map(function(q){return{data:q.data,mode:q.mode,length:q.length}})}function m($,b){switch(b){case t.NUMERIC:return o.getBitsLength($);case t.ALPHANUMERIC:return r.getBitsLength($);case t.KANJI:return i.getBitsLength($);case t.BYTE:return n.getBitsLength($)}}function w($){return $.reduce(function(b,x){const g=b.length-1>=0?b[b.length-1]:null;return g&&g.mode===x.mode?(b[b.length-1].data+=x.data,b):(b.push(x),b)},[])}function v($){const b=[];for(let x=0;x<$.length;x++){const g=$[x];switch(g.mode){case t.NUMERIC:b.push([g,{data:g.data,mode:t.ALPHANUMERIC,length:g.length},{data:g.data,mode:t.BYTE,length:g.length}]);break;case t.ALPHANUMERIC:b.push([g,{data:g.data,mode:t.BYTE,length:g.length}]);break;case t.KANJI:b.push([g,{data:g.data,mode:t.BYTE,length:c(g.data)}]);break;case t.BYTE:b.push([{data:g.data,mode:t.BYTE,length:c(g.data)}])}}return b}function p($,b){const x={},g={start:{}};let O=["start"];for(let q=0;q<$.length;q++){const E=$[q],A=[];for(let S=0;S<E.length;S++){const y=E[S],I=""+q+S;A.push(I),x[I]={node:y,lastCount:0},g[I]={};for(let C=0;C<O.length;C++){const _=O[C];x[_]&&x[_].node.mode===y.mode?(g[_][I]=m(x[_].lastCount+y.length,y.mode)-m(x[_].lastCount,y.mode),x[_].lastCount+=y.length):(x[_]&&(x[_].lastCount=y.length),g[_][I]=m(y.length,y.mode)+4+t.getCharCountIndicator(y.mode,b))}}O=A}for(let q=0;q<O.length;q++)g[O[q]].end=0;return{map:g,table:x}}function f($,b){let x;const g=t.getBestModeForData($);if(x=t.from(b,g),x!==t.BYTE&&x.bit<g.bit)throw new Error('"'+$+'" cannot be encoded with mode '+t.toString(x)+`.
 Suggested mode is: `+t.toString(g));switch(x===t.KANJI&&!s.isKanjiModeEnabled()&&(x=t.BYTE),x){case t.NUMERIC:return new o($);case t.ALPHANUMERIC:return new r($);case t.KANJI:return new i($);case t.BYTE:return new n($)}}e.fromArray=function(b){return b.reduce(function(x,g){return typeof g=="string"?x.push(f(g,null)):g.data&&x.push(f(g.data,g.mode)),x},[])},e.fromString=function(b,x){const g=p(v(W(b,s.isKanjiModeEnabled())),x),O=l.find_path(g.map,"start","end"),q=[];for(let E=1;E<O.length-1;E++)q.push(g.table[O[E]].node);return e.fromArray(w(q))},e.rawSplit=function(b){return e.fromArray(W(b,s.isKanjiModeEnabled()))}}),Pi=M(e=>{var t=Te(),o=pt(),r=bi(),n=vi(),i=yi(),a=$i(),s=Ci(),l=Nt(),c=Ei(),h=Ri(),W=Ti(),m=Se(),w=Bi();function v(E,A){const S=E.size,y=a.getPositions(A);for(let I=0;I<y.length;I++){const C=y[I][0],_=y[I][1];for(let T=-1;T<=7;T++)if(!(C+T<=-1||S<=C+T))for(let j=-1;j<=7;j++)_+j<=-1||S<=_+j||(T>=0&&T<=6&&(j===0||j===6)||j>=0&&j<=6&&(T===0||T===6)||T>=2&&T<=4&&j>=2&&j<=4?E.set(C+T,_+j,!0,!0):E.set(C+T,_+j,!1,!0))}}function p(E){const A=E.size;for(let S=8;S<A-8;S++){const y=S%2===0;E.set(S,6,y,!0),E.set(6,S,y,!0)}}function f(E,A){const S=i.getPositions(A);for(let y=0;y<S.length;y++){const I=S[y][0],C=S[y][1];for(let _=-2;_<=2;_++)for(let T=-2;T<=2;T++)_===-2||_===2||T===-2||T===2||_===0&&T===0?E.set(I+_,C+T,!0,!0):E.set(I+_,C+T,!1,!0)}}function $(E,A){const S=E.size,y=h.getEncodedBits(A);let I,C,_;for(let T=0;T<18;T++)I=Math.floor(T/3),C=T%3+S-8-3,_=(y>>T&1)===1,E.set(I,C,_,!0),E.set(C,I,_,!0)}function b(E,A,S){const y=E.size,I=W.getEncodedBits(A,S);let C,_;for(C=0;C<15;C++)_=(I>>C&1)===1,C<6?E.set(C,8,_,!0):C<8?E.set(C+1,8,_,!0):E.set(y-15+C,8,_,!0),C<8?E.set(8,y-C-1,_,!0):C<9?E.set(8,15-C-1+1,_,!0):E.set(8,15-C-1,_,!0);E.set(y-8,8,1,!0)}function x(E,A){const S=E.size;let y=-1,I=S-1,C=7,_=0;for(let T=S-1;T>0;T-=2)for(T===6&&T--;;){for(let j=0;j<2;j++)if(!E.isReserved(I,T-j)){let Ae=!1;_<A.length&&(Ae=(A[_]>>>C&1)===1),E.set(I,T-j,Ae),C--,C===-1&&(_++,C=7)}if(I+=y,I<0||S<=I){I-=y,y=-y;break}}}function g(E,A,S){const y=new r;S.forEach(function(_){y.put(_.mode.bit,4),y.put(_.getLength(),m.getCharCountIndicator(_.mode,E)),_.write(y)});const I=(t.getSymbolTotalCodewords(E)-l.getTotalCodewordsCount(E,A))*8;for(y.getLengthInBits()+4<=I&&y.put(0,4);y.getLengthInBits()%8!==0;)y.putBit(0);const C=(I-y.getLengthInBits())/8;for(let _=0;_<C;_++)y.put(_%2?17:236,8);return O(y,E,A)}function O(E,A,S){const y=t.getSymbolTotalCodewords(A),I=y-l.getTotalCodewordsCount(A,S),C=l.getBlocksCount(A,S),_=C-y%C,T=Math.floor(y/C),j=Math.floor(I/C),Ae=j+1,bt=T-j,Ht=new c(bt);let nt=0;const qe=new Array(C),vt=new Array(C);let rt=0;const Kt=new Uint8Array(E.buffer);for(let We=0;We<C;We++){const at=We<_?j:Ae;qe[We]=Kt.slice(nt,nt+at),vt[We]=Ht.encode(qe[We]),nt+=at,rt=Math.max(rt,at)}const ot=new Uint8Array(y);let yt=0,se,le;for(se=0;se<rt;se++)for(le=0;le<C;le++)se<qe[le].length&&(ot[yt++]=qe[le][se]);for(se=0;se<bt;se++)for(le=0;le<C;le++)ot[yt++]=vt[le][se];return ot}function q(E,A,S,y){let I;if(Array.isArray(E))I=w.fromArray(E);else if(typeof E=="string"){let j=A;if(!j){const Ae=w.rawSplit(E);j=h.getBestVersionForData(Ae,S)}I=w.fromString(E,j||40)}else throw new Error("Invalid data");const C=h.getBestVersionForData(I,S);if(!C)throw new Error("The amount of data is too big to be stored in a QR Code");if(!A)A=C;else if(A<C)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+C+`.
`);const _=g(A,S,I),T=new n(t.getSymbolSize(A));return v(T,A),p(T),f(T,A),b(T,S,0),A>=7&&$(T,A),x(T,_),isNaN(y)&&(y=s.getBestMask(T,b.bind(null,T,S))),s.applyMask(y,T),b(T,S,y),{modules:T,version:A,errorCorrectionLevel:S,maskPattern:y,segments:I}}e.create=function(A,S){if(typeof A>"u"||A==="")throw new Error("No input text");let y=o.M,I,C;return typeof S<"u"&&(y=o.from(S.errorCorrectionLevel,o.M),I=h.from(S.version),C=s.from(S.maskPattern),S.toSJISFunc&&t.setToSJISFunction(S.toSJISFunc)),q(A,I,y,C)}}),zt=M(e=>{function t(o){if(typeof o=="number"&&(o=o.toString()),typeof o!="string")throw new Error("Color should be defined as hex string");let r=o.slice().replace("#","").split("");if(r.length<3||r.length===5||r.length>8)throw new Error("Invalid hex color: "+o);(r.length===3||r.length===4)&&(r=Array.prototype.concat.apply([],r.map(function(i){return[i,i]}))),r.length===6&&r.push("F","F");const n=parseInt(r.join(""),16);return{r:n>>24&255,g:n>>16&255,b:n>>8&255,a:n&255,hex:"#"+r.slice(0,6).join("")}}e.getOptions=function(r){r||(r={}),r.color||(r.color={});const n=typeof r.margin>"u"||r.margin===null||r.margin<0?4:r.margin,i=r.width&&r.width>=21?r.width:void 0,a=r.scale||4;return{width:i,scale:i?4:a,margin:n,color:{dark:t(r.color.dark||"#000000ff"),light:t(r.color.light||"#ffffffff")},type:r.type,rendererOpts:r.rendererOpts||{}}},e.getScale=function(r,n){return n.width&&n.width>=r+n.margin*2?n.width/(r+n.margin*2):n.scale},e.getImageWidth=function(r,n){const i=e.getScale(r,n);return Math.floor((r+n.margin*2)*i)},e.qrToImageData=function(r,n,i){const a=n.modules.size,s=n.modules.data,l=e.getScale(a,i),c=Math.floor((a+i.margin*2)*l),h=i.margin*l,W=[i.color.light,i.color.dark];for(let m=0;m<c;m++)for(let w=0;w<c;w++){let v=(m*c+w)*4,p=i.color.light;if(m>=h&&w>=h&&m<c-h&&w<c-h){const f=Math.floor((m-h)/l),$=Math.floor((w-h)/l);p=W[s[f*a+$]?1:0]}r[v++]=p.r,r[v++]=p.g,r[v++]=p.b,r[v]=p.a}}}),Li=M(e=>{var t=zt();function o(n,i,a){n.clearRect(0,0,i.width,i.height),i.style||(i.style={}),i.height=a,i.width=a,i.style.height=a+"px",i.style.width=a+"px"}function r(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(i,a,s){let l=s,c=a;typeof l>"u"&&(!a||!a.getContext)&&(l=a,a=void 0),a||(c=r()),l=t.getOptions(l);const h=t.getImageWidth(i.modules.size,l),W=c.getContext("2d"),m=W.createImageData(h,h);return t.qrToImageData(m.data,i,l),o(W,c,h),W.putImageData(m,0,0),c},e.renderToDataURL=function(i,a,s){let l=s;typeof l>"u"&&(!a||!a.getContext)&&(l=a,a=void 0),l||(l={});const c=e.render(i,a,l),h=l.type||"image/png",W=l.rendererOpts||{};return c.toDataURL(h,W.quality)}}),Ni=M(e=>{var t=zt();function o(i,a){const s=i.a/255,l=a+'="'+i.hex+'"';return s<1?l+" "+a+'-opacity="'+s.toFixed(2).slice(1)+'"':l}function r(i,a,s){let l=i+a;return typeof s<"u"&&(l+=" "+s),l}function n(i,a,s){let l="",c=0,h=!1,W=0;for(let m=0;m<i.length;m++){const w=Math.floor(m%a),v=Math.floor(m/a);!w&&!h&&(h=!0),i[m]?(W++,m>0&&w>0&&i[m-1]||(l+=h?r("M",w+s,.5+v+s):r("m",c,0),c=0,h=!1),w+1<a&&i[m+1]||(l+=r("h",W),W=0)):c++}return l}e.render=function(a,s,l){const c=t.getOptions(s),h=a.modules.size,W=a.modules.data,m=h+c.margin*2,w=c.color.light.a?"<path "+o(c.color.light,"fill")+' d="M0 0h'+m+"v"+m+'H0z"/>':"",v="<path "+o(c.color.dark,"stroke")+' d="'+n(W,h,c.margin)+'"/>',p='viewBox="0 0 '+m+" "+m+'"',f='<svg xmlns="http://www.w3.org/2000/svg" '+(c.width?'width="'+c.width+'" height="'+c.width+'" ':"")+p+' shape-rendering="crispEdges">'+w+v+`</svg>
`;return typeof l=="function"&&l(null,f),f}}),Oi=M(e=>{var t=wi(),o=Pi(),r=Li(),n=Ni();function i(a,s,l,c,h){const W=[].slice.call(arguments,1),m=W.length,w=typeof W[m-1]=="function";if(!w&&!t())throw new Error("Callback required as last argument");if(w){if(m<2)throw new Error("Too few arguments provided");m===2?(h=l,l=s,s=c=void 0):m===3&&(s.getContext&&typeof h>"u"?(h=c,c=void 0):(h=c,c=l,l=s,s=void 0))}else{if(m<1)throw new Error("Too few arguments provided");return m===1?(l=s,s=c=void 0):m===2&&!s.getContext&&(c=l,l=s,s=void 0),new Promise(function(v,p){try{v(a(o.create(l,c),s,c))}catch(f){p(f)}})}try{const v=o.create(l,c);h(null,a(v,s,c))}catch(v){h(v)}}e.create=o.create,e.toCanvas=i.bind(null,r.render),e.toDataURL=i.bind(null,r.renderToDataURL),e.toString=i.bind(null,function(a,s,l){return n.render(a,l)})}),Mi=Gt(Oi(),1),zi=.1,Et=2.5,ce=7;function st(e,t,o){return e===t?!1:(e-t<0?t-e:e-t)<=o+zi}function ji(e,t){const o=Array.prototype.slice.call(Mi.create(e,{errorCorrectionLevel:t}).modules.data,0),r=Math.sqrt(o.length);return o.reduce((n,i,a)=>(a%r===0?n.push([i]):n[n.length-1].push(i))&&n,[])}var Di={generate({uri:e,size:t,logoSize:o,padding:r=8,dotColor:n="var(--apkt-colors-black)"}){const a=[],s=ji(e,"Q"),l=(t-2*r)/s.length,c=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];c.forEach(({x:p,y:f})=>{const $=(s.length-ce)*l*p+r,b=(s.length-ce)*l*f+r,x=.45;for(let g=0;g<c.length;g+=1){const O=l*(ce-g*2);a.push(Ne`
            <rect
              fill=${g===2?"var(--apkt-colors-black)":"var(--apkt-colors-white)"}
              width=${g===0?O-10:O}
              rx= ${g===0?(O-10)*x:O*x}
              ry= ${g===0?(O-10)*x:O*x}
              stroke=${n}
              stroke-width=${g===0?10:0}
              height=${g===0?O-10:O}
              x= ${g===0?b+l*g+10/2:b+l*g}
              y= ${g===0?$+l*g+10/2:$+l*g}
            />
          `)}});const h=Math.floor((o+25)/l),W=s.length/2-h/2,m=s.length/2+h/2-1,w=[];s.forEach((p,f)=>{p.forEach(($,b)=>{if(s[f][b]&&!(f<ce&&b<ce||f>s.length-(ce+1)&&b<ce||f<ce&&b>s.length-(ce+1))&&!(f>W&&f<m&&b>W&&b<m)){const x=f*l+l/2+r,g=b*l+l/2+r;w.push([x,g])}})});const v={};return w.forEach(([p,f])=>{v[p]?v[p]?.push(f):v[p]=[f]}),Object.entries(v).map(([p,f])=>{const $=f.filter(b=>f.every(x=>!st(b,x,l)));return[Number(p),$]}).forEach(([p,f])=>{f.forEach($=>{a.push(Ne`<circle cx=${p} cy=${$} fill=${n} r=${l/Et} />`)})}),Object.entries(v).filter(([p,f])=>f.length>1).map(([p,f])=>{const $=f.filter(b=>f.some(x=>st(b,x,l)));return[Number(p),$]}).map(([p,f])=>{f.sort((b,x)=>b<x?-1:1);const $=[];for(const b of f){const x=$.find(g=>g.some(O=>st(b,O,l)));x?x.push(b):$.push([b])}return[p,$.map(b=>[b[0],b[b.length-1]])]}).forEach(([p,f])=>{f.forEach(([$,b])=>{a.push(Ne`
              <line
                x1=${p}
                x2=${p}
                y1=${$}
                y2=${b}
                stroke=${n}
                stroke-width=${l/(Et/2)}
                stroke-linecap="round"
              />
            `)})}),a}},Ui=U`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({colors:e})=>e.white};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  :host {
    border-radius: ${({borderRadius:e})=>e[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`,we=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},ne=class extends z{constructor(){super(...arguments),this.uri="",this.size=0,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),this.style.cssText=`--local-size: ${this.size}px`,d`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return Ne`
      <svg height=${this.size} width=${this.size}>
        ${Di.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){return this.imageSrc?d`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?d`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:d`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};ne.styles=[Y,Ui];we([u()],ne.prototype,"uri",void 0);we([u({type:Number})],ne.prototype,"size",void 0);we([u()],ne.prototype,"theme",void 0);we([u()],ne.prototype,"imageSrc",void 0);we([u()],ne.prototype,"alt",void 0);we([u({type:Boolean})],ne.prototype,"arenaClear",void 0);we([u({type:Boolean})],ne.prototype,"farcaster",void 0);ne=we([N("wui-qr-code")],ne);var qi=U`
  :host {
    display: block;
    background: linear-gradient(
      90deg,
      ${({tokens:e})=>e.theme.foregroundSecondary} 0%,
      ${({tokens:e})=>e.theme.foregroundTertiary} 50%,
      ${({tokens:e})=>e.theme.foregroundSecondary} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1s ease-in-out infinite;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-rounded='true']) {
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`,De=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},_e=class extends z{constructor(){super(...arguments),this.width="",this.height="",this.variant="default",this.rounded=!1}render(){return this.style.cssText=`
      width: ${this.width};
      height: ${this.height};
    `,this.dataset.rounded=this.rounded?"true":"false",d`<slot></slot>`}};_e.styles=[qi];De([u()],_e.prototype,"width",void 0);De([u()],_e.prototype,"height",void 0);De([u()],_e.prototype,"variant",void 0);De([u({type:Boolean})],_e.prototype,"rounded",void 0);_e=De([N("wui-shimmer")],_e);var Fi=U`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`,jt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Ge=class extends F{constructor(){super(),this.basic=!1,this.forceUpdate=()=>{this.requestUpdate()},window.addEventListener("resize",this.forceUpdate)}firstUpdated(){this.basic||H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:k.state.view}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(t=>t()),window.removeEventListener("resize",this.forceUpdate)}render(){return this.onRenderProxy(),d`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","5","5","5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.timeout=setTimeout(()=>{this.ready=!0},200))}qrCodeTemplate(){if(!this.uri||!this.ready)return null;const t=this.getBoundingClientRect().width-40,o=this.wallet?this.wallet.name:void 0;P.setWcLinking(void 0),P.setRecentWallet(this.wallet);let r=this.uri;if(this.wallet?.mobile_link){const{redirect:n}=B.formatNativeUrl(this.wallet?.mobile_link,this.uri,null);r=n}return d` <wui-qr-code
      size=${t}
      theme=${ct.state.themeMode}
      uri=${r}
      imageSrc=${D(me.getWalletImage(this.wallet))}
      color=${D(ct.state.themeVariables["--w3m-qr-color"])}
      alt=${D(o)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){return d`<wui-button
      .disabled=${!this.uri||!this.ready}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};Ge.styles=Fi;jt([u({type:Boolean})],Ge.prototype,"basic",void 0);Ge=jt([N("w3m-connecting-wc-qrcode")],Ge);var Vi=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Rt=class extends z{constructor(){if(super(),this.wallet=k.state.data?.wallet,!this.wallet)throw new Error("w3m-connecting-wc-unsupported: No wallet provided");H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:k.state.view}})}render(){return d`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${D(me.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};Rt=Vi([N("w3m-connecting-wc-unsupported")],Rt);var Dt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},ut=class extends F{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw new Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=At.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(P.subscribeKey("wcUri",()=>{this.updateLoadingState()})),H.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:k.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;const{webapp_link:t,name:o}=this.wallet,{redirect:r,href:n}=B.formatUniversalUrl(t,this.uri);P.setWcLinking({name:o,href:n}),P.setRecentWallet(this.wallet),B.openHref(r,"_blank")}catch{this.error=!0}}};Dt([R()],ut.prototype,"isLoading",void 0);ut=Dt([N("w3m-connecting-wc-web")],ut);var Hi=U`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`,Ie=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},he=class extends z{constructor(){super(),this.wallet=k.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!V.state.siwx,this.remoteFeatures=V.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(V.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){return V.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),d`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return!this.remoteFeatures?.reownBranding||!this.displayBranding?null:d`<wui-ux-by-reown></wui-ux-by-reown>`}async initializeConnection(t=!1){if(!(this.platform==="browser"||V.state.manualWCControl&&!t))try{const{wcPairingExpiry:o,status:r}=P.state,{redirectView:n}=k.state.data??{};if(t||V.state.enableEmbedded||B.isPairingExpired(o)||r==="connecting"){const i=P.getConnections(ge.state.activeChain),a=this.remoteFeatures?.multiWallet,s=i.length>0;await P.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(s&&a?(k.replace("ProfileWallets"),Me.showSuccess("New Wallet Added")):n?k.replace(n):Bt.close())}}catch(o){if(o instanceof Error&&o.message.includes("An error occurred when attempting to switch chain")&&!V.state.enableNetworkSwitch&&ge.state.activeChain){ge.setActiveCaipNetwork(ii.getUnsupportedNetwork(`${ge.state.activeChain}:${ge.state.activeCaipNetwork?.id}`)),ge.showUnsupportedChainUI();return}o instanceof kt&&o.originalName===Wt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?H.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:o.message}}):H.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:o?.message??"Unknown"}}),P.setWcError(!0),Me.showError(o.message??"Connection error"),P.resetWcConnection(),k.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;const{mobile_link:t,desktop_link:o,webapp_link:r,injected:n,rdns:i}=this.wallet,a=n?.map(({injected_id:v})=>v).filter(Boolean),s=[...i?[i]:a??[]],l=V.state.isUniversalProvider?!1:s.length,c=t,h=r,W=P.checkInstalled(s),m=l&&W,w=o&&!B.isMobile();m&&!ge.state.noAdapters&&this.platforms.push("browser"),c&&this.platforms.push(B.isMobile()?"mobile":"qrcode"),h&&this.platforms.push("web"),w&&this.platforms.push("desktop"),!m&&l&&!ge.state.noAdapters&&this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return d`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return d`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return d`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return d`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return d`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return d`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?d`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(t){const o=this.shadowRoot?.querySelector("div");o&&(await o.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=t,o.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};he.styles=Hi;Ie([R()],he.prototype,"platform",void 0);Ie([R()],he.prototype,"platforms",void 0);Ie([R()],he.prototype,"isSiwxEnabled",void 0);Ie([R()],he.prototype,"remoteFeatures",void 0);Ie([u({type:Boolean})],he.prototype,"displayBranding",void 0);Ie([u({type:Boolean})],he.prototype,"basic",void 0);he=Ie([N("w3m-connecting-wc-view")],he);var ft=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Je=class extends z{constructor(){super(),this.unsubscribe=[],this.isMobile=B.isMobile(),this.remoteFeatures=V.state.remoteFeatures,this.unsubscribe.push(V.subscribeKey("remoteFeatures",t=>this.remoteFeatures=t))}disconnectedCallback(){this.unsubscribe.forEach(t=>t())}render(){if(this.isMobile){const{featured:t,recommended:o}=L.state,{customWallets:r}=V.state,n=Yt.getRecentWallets();return d`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${t.length||o.length||r?.length||n.length?d`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return d`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?d` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};ft([R()],Je.prototype,"isMobile",void 0);ft([R()],Je.prototype,"remoteFeatures",void 0);Je=ft([N("w3m-connecting-wc-basic-view")],Je);var{I:On}=Qt;var Ki=e=>e.strings===void 0;var Oe=(e,t)=>{const o=e._$AN;if(o===void 0)return!1;for(const r of o)r._$AO?.(t,!1),Oe(r,t);return!0},Ye=e=>{let t,o;do{if((t=e._$AM)===void 0)break;o=t._$AN,o.delete(e),e=t}while(o?.size===0)},Ut=e=>{for(let t;t=e._$AM;e=t){let o=t._$AN;if(o===void 0)t._$AN=o=new Set;else if(o.has(e))break;o.add(e),Yi(t)}};function Gi(e){this._$AN!==void 0?(Ye(this),this._$AM=e,Ut(this)):this._$AM=e}function Ji(e,t=!1,o=0){const r=this._$AH,n=this._$AN;if(n!==void 0&&n.size!==0)if(t)if(Array.isArray(r))for(let i=o;i<r.length;i++)Oe(r[i],!1),Ye(r[i]);else r!=null&&(Oe(r,!1),Ye(r));else Oe(this,e)}var Yi=e=>{e.type==Zt.CHILD&&(e._$AP??(e._$AP=Ji),e._$AQ??(e._$AQ=Gi))},Qi=class extends Xt{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,t,o){super._$AT(e,t,o),Ut(this),this.isConnected=e._$AU}_$AO(e,t=!0){e!==this.isConnected&&(this.isConnected=e,e?this.reconnected?.():this.disconnected?.()),t&&(Oe(this,e),Ye(this))}setValue(e){if(Ki(this._$Ct))this._$Ct._$AI(e,this);else{const t=[...this._$Ct._$AH];t[this._$Ci]=e,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}},gt=()=>new Xi,Xi=class{},lt=new WeakMap,mt=ei(class extends Qi{render(e){return Ct}update(e,[t]){const o=t!==this.G;return o&&this.G!==void 0&&this.rt(void 0),(o||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),Ct}rt(e){if(this.isConnected||(e=void 0),typeof this.G=="function"){const t=this.ht??globalThis;let o=lt.get(t);o===void 0&&(o=new WeakMap,lt.set(t,o)),o.get(this.G)!==void 0&&this.G.call(this.ht,void 0),o.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return typeof this.G=="function"?lt.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),Zi=U`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`,it=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Be=class extends z{constructor(){super(...arguments),this.inputElementRef=gt(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return d`
      <label data-size=${this.size}>
        <input
          ${mt(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};Be.styles=[Y,pe,Zi];it([u({type:Boolean})],Be.prototype,"checked",void 0);it([u({type:Boolean})],Be.prototype,"disabled",void 0);it([u()],Be.prototype,"size",void 0);Be=it([N("wui-toggle")],Be);var en=U`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`,qt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Qe=class extends z{constructor(){super(...arguments),this.checked=!1}render(){return d`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(t){t.stopPropagation(),this.checked=t.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};Qe.styles=[Y,pe,en];qt([u({type:Boolean})],Qe.prototype,"checked",void 0);Qe=qt([N("wui-certified-switch")],Qe);var tn=U`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`,Z=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},K=class extends z{constructor(){super(...arguments),this.inputElementRef=gt(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return d` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${mt(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${D(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?d`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){return this.onSubmit?d`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?d`<wui-icon name="spinner" size="md"></wui-icon>`:d`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?d`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?d`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};K.styles=[Y,pe,tn];Z([u()],K.prototype,"icon",void 0);Z([u({type:Boolean})],K.prototype,"disabled",void 0);Z([u({type:Boolean})],K.prototype,"loading",void 0);Z([u()],K.prototype,"placeholder",void 0);Z([u()],K.prototype,"type",void 0);Z([u()],K.prototype,"value",void 0);Z([u()],K.prototype,"errorText",void 0);Z([u()],K.prototype,"warningText",void 0);Z([u()],K.prototype,"onSubmit",void 0);Z([u()],K.prototype,"size",void 0);Z([u({attribute:!1})],K.prototype,"onKeyDown",void 0);K=Z([N("wui-input-text")],K);var nn=U`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`,Ft=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Xe=class extends z{constructor(){super(...arguments),this.inputComponentRef=gt(),this.inputValue=""}render(){return d`
      <wui-input-text
        ${mt(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?d`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(t){this.inputValue=t.detail||""}clearValue(){const t=this.inputComponentRef.value?.inputElementRef.value;t&&(t.value="",this.inputValue="",t.focus(),t.dispatchEvent(new Event("input")))}};Xe.styles=[Y,nn];Ft([u()],Xe.prototype,"inputValue",void 0);Xe=Ft([N("wui-search-bar")],Xe);var rn=Ne`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`,on=U`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`,Vt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Ze=class extends z{constructor(){super(...arguments),this.type="wallet"}render(){return d`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return this.type==="network"?d` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${rn}`:d`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};Ze.styles=[Y,pe,on];Vt([u()],Ze.prototype,"type",void 0);Ze=Vt([N("wui-card-select-loader")],Ze);var an=It`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`,ee=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},G=class extends z{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&de.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&de.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&de.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&de.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&de.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&de.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&de.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&de.getSpacingStyles(this.margin,3)};
    `,d`<slot></slot>`}};G.styles=[Y,an];ee([u()],G.prototype,"gridTemplateRows",void 0);ee([u()],G.prototype,"gridTemplateColumns",void 0);ee([u()],G.prototype,"justifyItems",void 0);ee([u()],G.prototype,"alignItems",void 0);ee([u()],G.prototype,"justifyContent",void 0);ee([u()],G.prototype,"alignContent",void 0);ee([u()],G.prototype,"columnGap",void 0);ee([u()],G.prototype,"rowGap",void 0);ee([u()],G.prototype,"gap",void 0);ee([u()],G.prototype,"padding",void 0);ee([u()],G.prototype,"margin",void 0);G=ee([N("wui-grid")],G);var sn=U`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[0]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e[4]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`,oe=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Q=class extends z{constructor(){super(),this.observer=new IntersectionObserver(()=>{}),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(t=>{t.forEach(o=>{o.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){const t=this.wallet?.badge_type==="certified";return d`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${D(t?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${t?d`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return!this.visible&&!this.imageSrc||this.imageLoading?this.shimmerTemplate():d`
      <wui-wallet-image
        size="lg"
        imageSrc=${D(this.imageSrc)}
        name=${D(this.wallet?.name)}
        .installed=${this.wallet?.installed??!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `}shimmerTemplate(){return d`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=me.getWalletImage(this.wallet),!this.imageSrc&&(this.imageLoading=!0,this.imageSrc=await me.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){!this.wallet||this.isImpressed||(this.isImpressed=!0,H.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:k.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};Q.styles=sn;oe([R()],Q.prototype,"visible",void 0);oe([R()],Q.prototype,"imageSrc",void 0);oe([R()],Q.prototype,"imageLoading",void 0);oe([R()],Q.prototype,"isImpressed",void 0);oe([u()],Q.prototype,"explorerId",void 0);oe([u()],Q.prototype,"walletQuery",void 0);oe([u()],Q.prototype,"certified",void 0);oe([u()],Q.prototype,"displayIndex",void 0);oe([u({type:Object})],Q.prototype,"wallet",void 0);Q=oe([N("w3m-all-wallets-list-item")],Q);var ln=U`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:e})=>e[4]};
    padding-bottom: ${({spacing:e})=>e[4]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`,be=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Tt="local-paginator",re=class extends z{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!L.state.wallets.length,this.wallets=L.state.wallets,this.recommended=L.state.recommended,this.featured=L.state.featured,this.filteredWallets=L.state.filteredWallets,this.mobileFullScreen=V.state.enableMobileFullScreen,this.unsubscribe.push(L.subscribeKey("wallets",t=>this.wallets=t),L.subscribeKey("recommended",t=>this.recommended=t),L.subscribeKey("featured",t=>this.featured=t),L.subscribeKey("filteredWallets",t=>this.filteredWallets=t))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(t=>t()),this.paginationObserver?.disconnect()}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),d`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;const t=this.shadowRoot?.querySelector("wui-grid");t&&(await L.fetchWalletsByPage({page:1}),await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(t,o){return[...Array(t)].map(()=>d`
        <wui-card-select-loader type="wallet" id=${D(o)}></wui-card-select-loader>
      `)}getWallets(){const t=[...this.featured,...this.recommended];this.filteredWallets?.length>0?t.push(...this.filteredWallets):t.push(...this.wallets);const o=B.uniqueBy(t,"id"),r=dt.markWalletsAsInstalled(o);return dt.markWalletsWithDisplayIndex(r)}walletsTemplate(){return this.getWallets().map((t,o)=>d`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${t.id}"
          @click=${()=>this.onConnectWallet(t)}
          .wallet=${t}
          explorerId=${t.id}
          certified=${this.badge==="certified"}
          displayIndex=${o}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){const{wallets:t,recommended:o,featured:r,count:n,mobileFilteredOutWalletsLength:i}=L.state,a=window.innerWidth<352?3:4,s=t.length+o.length;let l=Math.ceil(s/a)*a-s+a;return l-=t.length?r.length%a:0,n===0&&r.length>0?null:n===0||[...r,...t,...o].length<n-(i??0)?this.shimmerTemplate(l,Tt):null}createPaginationObserver(){const t=this.shadowRoot?.querySelector(`#${Tt}`);t&&(this.paginationObserver=new IntersectionObserver(([o])=>{if(o?.isIntersecting&&!this.loading){const{page:r,count:n,wallets:i}=L.state;i.length<n&&L.fetchWalletsByPage({page:r+1})}}),this.paginationObserver.observe(t))}onConnectWallet(t){J.selectWalletConnector(t)}};re.styles=ln;be([R()],re.prototype,"loading",void 0);be([R()],re.prototype,"wallets",void 0);be([R()],re.prototype,"recommended",void 0);be([R()],re.prototype,"featured",void 0);be([R()],re.prototype,"filteredWallets",void 0);be([R()],re.prototype,"badge",void 0);be([R()],re.prototype,"mobileFullScreen",void 0);re=be([N("w3m-all-wallets-list")],re);var cn=It`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`,Ue=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},Ee=class extends z{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=V.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?d`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await L.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){const{search:t}=L.state,o=dt.markWalletsAsInstalled(t);return t.length?d`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${o.map((r,n)=>d`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(r)}
              .wallet=${r}
              data-testid="wallet-search-item-${r.id}"
              explorerId=${r.id}
              certified=${this.badge==="certified"}
              walletQuery=${this.query}
              displayIndex=${n}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:d`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(t){J.selectWalletConnector(t)}};Ee.styles=cn;Ue([R()],Ee.prototype,"loading",void 0);Ue([R()],Ee.prototype,"mobileFullScreen",void 0);Ue([u()],Ee.prototype,"query",void 0);Ue([u()],Ee.prototype,"badge",void 0);Ee=Ue([N("w3m-all-wallets-search")],Ee);var wt=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},et=class extends z{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=B.debounce(t=>{this.search=t})}render(){const t=this.search.length>=2;return d`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge==="certified"}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${t||this.badge?d`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:d`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(t){this.onDebouncedSearch(t.detail)}onCertifiedSwitchChange(t){t.detail?(this.badge="certified",Me.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return B.isMobile()?d`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){k.push("ConnectingWalletConnect")}};wt([R()],et.prototype,"search",void 0);wt([R()],et.prototype,"badge",void 0);et=wt([N("w3m-all-wallets-view")],et);var dn=U`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, scale;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-image {
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,ae=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},X=class extends z{constructor(){super(...arguments),this.imageSrc="google",this.loading=!1,this.disabled=!1,this.rightIcon=!0,this.rounded=!1,this.fullSize=!1}render(){return this.dataset.rounded=this.rounded?"true":"false",d`
      <button
        ?disabled=${this.loading?!0:!!this.disabled}
        data-loading=${this.loading}
        tabindex=${D(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `}templateLeftIcon(){return this.icon?d`<wui-image
        icon=${this.icon}
        iconColor=${D(this.iconColor)}
        ?boxed=${!0}
        ?rounded=${this.rounded}
      ></wui-image>`:d`<wui-image
      ?boxed=${!0}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      src=${this.imageSrc}
    ></wui-image>`}templateRightIcon(){return this.rightIcon?this.loading?d`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:d`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`:null}};X.styles=[Y,pe,dn];ae([u()],X.prototype,"imageSrc",void 0);ae([u()],X.prototype,"icon",void 0);ae([u()],X.prototype,"iconColor",void 0);ae([u({type:Boolean})],X.prototype,"loading",void 0);ae([u()],X.prototype,"tabIdx",void 0);ae([u({type:Boolean})],X.prototype,"disabled",void 0);ae([u({type:Boolean})],X.prototype,"rightIcon",void 0);ae([u({type:Boolean})],X.prototype,"rounded",void 0);ae([u({type:Boolean})],X.prototype,"fullSize",void 0);X=ae([N("wui-list-item")],X);var un=function(e,t,o,r){var n=arguments.length,i=n<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,o):r,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(i=(n<3?a(i):n>3?a(t,o,i):a(t,o))||i);return n>3&&i&&Object.defineProperty(t,o,i),i},St=class extends z{constructor(){super(...arguments),this.wallet=k.state.data?.wallet}render(){if(!this.wallet)throw new Error("w3m-downloads-view");return d`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?d`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?d`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?d`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?d`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(t){t.href&&this.wallet&&(H.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:t.type}}),B.openHref(t.href,"_blank"))}onChromeStore(){this.wallet?.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){this.wallet?.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){this.wallet?.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){this.wallet?.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};St=un([N("w3m-downloads-view")],St);export{et as W3mAllWalletsView,Je as W3mConnectingWcBasicView,St as W3mDownloadsView};
