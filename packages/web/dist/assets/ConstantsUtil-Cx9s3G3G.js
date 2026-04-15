import{a as f,i as A,r as be}from"./vendor-BcddyAvY.js";var B=globalThis,q=e=>e,D=B.trustedTypes,J=D?D.createPolicy("lit-html",{createHTML:e=>e}):void 0,Z="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,G="?"+k,xe=`<${G}>`,_=document,E=()=>_.createComment(""),N=e=>e===null||typeof e!="object"&&typeof e!="function",X=Array.isArray,ie=e=>X(e)||typeof e?.[Symbol.iterator]=="function",U=`[ 	
\f\r]`,F=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Q=/-->/g,ee=/>/g,v=RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),te=/'/g,re=/"/g,se=/^(?:script|style|textarea|title)$/i,Y=e=>(t,...r)=>({_$litType$:e,strings:t,values:r}),Me=Y(1),Ie=Y(2),Be=Y(3),H=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),ne=new WeakMap,y=_.createTreeWalker(_,129);function ce(e,t){if(!X(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return J!==void 0?J.createHTML(t):t}var le=(e,t)=>{const r=e.length-1,a=[];let n,i=t===2?"<svg>":t===3?"<math>":"",o=F;for(let s=0;s<r;s++){const c=e[s];let p,u,l=-1,g=0;for(;g<c.length&&(o.lastIndex=g,u=o.exec(c),u!==null);)g=o.lastIndex,o===F?u[1]==="!--"?o=Q:u[1]!==void 0?o=ee:u[2]!==void 0?(se.test(u[2])&&(n=RegExp("</"+u[2],"g")),o=v):u[3]!==void 0&&(o=v):o===v?u[0]===">"?(o=n??F,l=-1):u[1]===void 0?l=-2:(l=o.lastIndex-u[2].length,p=u[1],o=u[3]===void 0?v:u[3]==='"'?re:te):o===re||o===te?o=v:o===Q||o===ee?o=F:(o=v,n=void 0);const h=o===v&&e[s+1].startsWith("/>")?" ":"";i+=o===F?c+xe:l>=0?(a.push(p),c.slice(0,l)+Z+c.slice(l)+k+h):c+k+(l===-2?s:h)}return[ce(e,i+(e[r]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),a]},j=class ue{constructor({strings:t,_$litType$:r},a){let n;this.parts=[];let i=0,o=0;const s=t.length-1,c=this.parts,[p,u]=le(t,r);if(this.el=ue.createElement(p,a),y.currentNode=this.el.content,r===2||r===3){const l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(n=y.nextNode())!==null&&c.length<s;){if(n.nodeType===1){if(n.hasAttributes())for(const l of n.getAttributeNames())if(l.endsWith(Z)){const g=u[o++],h=n.getAttribute(l).split(k),R=/([.?@])?(.*)/.exec(g);c.push({type:1,index:i,name:R[2],strings:h,ctor:R[1]==="."?ge:R[1]==="?"?me:R[1]==="@"?he:P}),n.removeAttribute(l)}else l.startsWith(k)&&(c.push({type:6,index:i}),n.removeAttribute(l));if(se.test(n.tagName)){const l=n.textContent.split(k),g=l.length-1;if(g>0){n.textContent=D?D.emptyScript:"";for(let h=0;h<g;h++)n.append(l[h],E()),y.nextNode(),c.push({type:2,index:++i});n.append(l[g],E())}}}else if(n.nodeType===8)if(n.data===G)c.push({type:2,index:i});else{let l=-1;for(;(l=n.data.indexOf(k,l+1))!==-1;)c.push({type:7,index:i}),l+=k.length-1}i++}}static createElement(t,r){const a=_.createElement("template");return a.innerHTML=t,a}};function C(e,t,r=e,a){if(t===H)return t;let n=a!==void 0?r._$Co?.[a]:r._$Cl;const i=N(t)?void 0:t._$litDirective$;return n?.constructor!==i&&(n?._$AO?.(!1),i===void 0?n=void 0:(n=new i(e),n._$AT(e,r,a)),a!==void 0?(r._$Co??(r._$Co=[]))[a]=n:r._$Cl=n),n!==void 0&&(t=C(e,n._$AS(e,t.values),n,a)),t}var de=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:r}=this._$AD,a=(e?.creationScope??_).importNode(t,!0);y.currentNode=a;let n=y.nextNode(),i=0,o=0,s=r[0];for(;s!==void 0;){if(i===s.index){let c;s.type===2?c=new L(n,n.nextSibling,this,e):s.type===1?c=new s.ctor(n,s.name,s.strings,this,e):s.type===6&&(c=new fe(n,this,e)),this._$AV.push(c),s=r[++o]}i!==s?.index&&(n=y.nextNode(),i++)}return y.currentNode=_,a}p(e){let t=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}},L=class pe{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,r,a,n){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=r,this._$AM=a,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const r=this._$AM;return r!==void 0&&t?.nodeType===11&&(t=r.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,r=this){t=C(this,t,r),N(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==H&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ie(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(_.createTextNode(t)),this._$AH=t}$(t){const{values:r,_$litType$:a}=t,n=typeof a=="number"?this._$AC(t):(a.el===void 0&&(a.el=j.createElement(ce(a.h,a.h[0]),this.options)),a);if(this._$AH?._$AD===n)this._$AH.p(r);else{const i=new de(n,this),o=i.u(this.options);i.p(r),this.T(o),this._$AH=i}}_$AC(t){let r=ne.get(t.strings);return r===void 0&&ne.set(t.strings,r=new j(t)),r}k(t){X(this._$AH)||(this._$AH=[],this._$AR());const r=this._$AH;let a,n=0;for(const i of t)n===r.length?r.push(a=new pe(this.O(E()),this.O(E()),this,this.options)):a=r[n],a._$AI(i),n++;n<r.length&&(this._$AR(a&&a._$AB.nextSibling,n),r.length=n)}_$AR(t=this._$AA.nextSibling,r){for(this._$AP?.(!1,!0,r);t!==this._$AB;){const a=q(t).nextSibling;q(t).remove(),t=a}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},P=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,a,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=e,this.name=t,this._$AM=a,this.options=n,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=d}_$AI(e,t=this,r,a){const n=this.strings;let i=!1;if(n===void 0)e=C(this,e,t,0),i=!N(e)||e!==this._$AH&&e!==H,i&&(this._$AH=e);else{const o=e;let s,c;for(e=n[0],s=0;s<n.length-1;s++)c=C(this,o[r+s],t,s),c===H&&(c=this._$AH[s]),i||(i=!N(c)||c!==this._$AH[s]),c===d?e=d:e!==d&&(e+=(c??"")+n[s+1]),this._$AH[s]=c}i&&!a&&this.j(e)}j(e){e===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},ge=class extends P{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===d?void 0:e}},me=class extends P{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==d)}},he=class extends P{constructor(e,t,r,a,n){super(e,t,r,a,n),this.type=5}_$AI(e,t=this){if((e=C(this,e,t,0)??d)===H)return;const r=this._$AH,a=e===d&&r!==d||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,n=e!==d&&(r===d||a);a&&this.element.removeEventListener(this.name,this,r),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},fe=class{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){C(this,e)}},De={M:Z,P:k,A:G,C:1,L:le,R:de,D:ie,V:C,I:L,H:P,N:me,U:he,B:ge,F:fe},$e=B.litHtmlPolyfillSupport;$e?.(j,L),(B.litHtmlVersions??(B.litHtmlVersions=[])).push("3.3.2");var ke=(e,t,r)=>{const a=r?.renderBefore??t;let n=a._$litPart$;if(n===void 0){const i=r?.renderBefore??null;a._$litPart$=n=new L(t.insertBefore(E(),i),i,void 0,r??{})}return n._$AI(e),n},K=globalThis,I=class extends be{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e;const t=super.createRenderRoot();return(e=this.renderOptions).renderBefore??(e.renderBefore=t.firstChild),t}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ke(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return H}};I._$litElement$=!0,I.finalized=!0,K.litElementHydrateSupport?.({LitElement:I});var Ae=K.litElementPolyfillSupport;Ae?.({LitElement:I});(K.litElementVersions??(K.litElementVersions=[])).push("4.2.2");var ve={black:"#202020",white:"#FFFFFF",white010:"rgba(255, 255, 255, 0.1)",accent010:"rgba(9, 136, 240, 0.1)",accent020:"rgba(9, 136, 240, 0.2)",accent030:"rgba(9, 136, 240, 0.3)",accent040:"rgba(9, 136, 240, 0.4)",accent050:"rgba(9, 136, 240, 0.5)",accent060:"rgba(9, 136, 240, 0.6)",accent070:"rgba(9, 136, 240, 0.7)",accent080:"rgba(9, 136, 240, 0.8)",accent090:"rgba(9, 136, 240, 0.9)",accent100:"rgba(9, 136, 240, 1.0)",accentSecondary010:"rgba(199, 185, 148, 0.1)",accentSecondary020:"rgba(199, 185, 148, 0.2)",accentSecondary030:"rgba(199, 185, 148, 0.3)",accentSecondary040:"rgba(199, 185, 148, 0.4)",accentSecondary050:"rgba(199, 185, 148, 0.5)",accentSecondary060:"rgba(199, 185, 148, 0.6)",accentSecondary070:"rgba(199, 185, 148, 0.7)",accentSecondary080:"rgba(199, 185, 148, 0.8)",accentSecondary090:"rgba(199, 185, 148, 0.9)",accentSecondary100:"rgba(199, 185, 148, 1.0)",productWalletKit:"#FFB800",productAppKit:"#FF573B",productCloud:"#0988F0",productDocumentation:"#008847",neutrals050:"#F6F6F6",neutrals100:"#F3F3F3",neutrals200:"#E9E9E9",neutrals300:"#D0D0D0",neutrals400:"#BBB",neutrals500:"#9A9A9A",neutrals600:"#6C6C6C",neutrals700:"#4F4F4F",neutrals800:"#363636",neutrals900:"#2A2A2A",neutrals1000:"#252525",semanticSuccess010:"rgba(48, 164, 107, 0.1)",semanticSuccess020:"rgba(48, 164, 107, 0.2)",semanticSuccess030:"rgba(48, 164, 107, 0.3)",semanticSuccess040:"rgba(48, 164, 107, 0.4)",semanticSuccess050:"rgba(48, 164, 107, 0.5)",semanticSuccess060:"rgba(48, 164, 107, 0.6)",semanticSuccess070:"rgba(48, 164, 107, 0.7)",semanticSuccess080:"rgba(48, 164, 107, 0.8)",semanticSuccess090:"rgba(48, 164, 107, 0.9)",semanticSuccess100:"rgba(48, 164, 107, 1.0)",semanticError010:"rgba(223, 74, 52, 0.1)",semanticError020:"rgba(223, 74, 52, 0.2)",semanticError030:"rgba(223, 74, 52, 0.3)",semanticError040:"rgba(223, 74, 52, 0.4)",semanticError050:"rgba(223, 74, 52, 0.5)",semanticError060:"rgba(223, 74, 52, 0.6)",semanticError070:"rgba(223, 74, 52, 0.7)",semanticError080:"rgba(223, 74, 52, 0.8)",semanticError090:"rgba(223, 74, 52, 0.9)",semanticError100:"rgba(223, 74, 52, 1.0)",semanticWarning010:"rgba(243, 161, 63, 0.1)",semanticWarning020:"rgba(243, 161, 63, 0.2)",semanticWarning030:"rgba(243, 161, 63, 0.3)",semanticWarning040:"rgba(243, 161, 63, 0.4)",semanticWarning050:"rgba(243, 161, 63, 0.5)",semanticWarning060:"rgba(243, 161, 63, 0.6)",semanticWarning070:"rgba(243, 161, 63, 0.7)",semanticWarning080:"rgba(243, 161, 63, 0.8)",semanticWarning090:"rgba(243, 161, 63, 0.9)",semanticWarning100:"rgba(243, 161, 63, 1.0)"},W={core:{backgroundAccentPrimary:"#0988F0",backgroundAccentCertified:"#C7B994",backgroundWalletKit:"#FFB800",backgroundAppKit:"#FF573B",backgroundCloud:"#0988F0",backgroundDocumentation:"#008847",backgroundSuccess:"rgba(48, 164, 107, 0.20)",backgroundError:"rgba(223, 74, 52, 0.20)",backgroundWarning:"rgba(243, 161, 63, 0.20)",textAccentPrimary:"#0988F0",textAccentCertified:"#C7B994",textWalletKit:"#FFB800",textAppKit:"#FF573B",textCloud:"#0988F0",textDocumentation:"#008847",textSuccess:"#30A46B",textError:"#DF4A34",textWarning:"#F3A13F",borderAccentPrimary:"#0988F0",borderSecondary:"#C7B994",borderSuccess:"#30A46B",borderError:"#DF4A34",borderWarning:"#F3A13F",foregroundAccent010:"rgba(9, 136, 240, 0.1)",foregroundAccent020:"rgba(9, 136, 240, 0.2)",foregroundAccent040:"rgba(9, 136, 240, 0.4)",foregroundAccent060:"rgba(9, 136, 240, 0.6)",foregroundSecondary020:"rgba(199, 185, 148, 0.2)",foregroundSecondary040:"rgba(199, 185, 148, 0.4)",foregroundSecondary060:"rgba(199, 185, 148, 0.6)",iconAccentPrimary:"#0988F0",iconAccentCertified:"#C7B994",iconSuccess:"#30A46B",iconError:"#DF4A34",iconWarning:"#F3A13F",glass010:"rgba(255, 255, 255, 0.1)",zIndex:"9999"},dark:{overlay:"rgba(0, 0, 0, 0.50)",backgroundPrimary:"#202020",backgroundInvert:"#FFFFFF",textPrimary:"#FFFFFF",textSecondary:"#9A9A9A",textTertiary:"#BBBBBB",textInvert:"#202020",borderPrimary:"#2A2A2A",borderPrimaryDark:"#363636",borderSecondary:"#4F4F4F",foregroundPrimary:"#252525",foregroundSecondary:"#2A2A2A",foregroundTertiary:"#363636",iconDefault:"#9A9A9A",iconInverse:"#FFFFFF"},light:{overlay:"rgba(230 , 230, 230, 0.5)",backgroundPrimary:"#FFFFFF",borderPrimaryDark:"#E9E9E9",backgroundInvert:"#202020",textPrimary:"#202020",textSecondary:"#9A9A9A",textTertiary:"#6C6C6C",textInvert:"#FFFFFF",borderPrimary:"#E9E9E9",borderSecondary:"#D0D0D0",foregroundPrimary:"#F3F3F3",foregroundSecondary:"#E9E9E9",foregroundTertiary:"#D0D0D0",iconDefault:"#9A9A9A",iconInverse:"#202020"}},we={1:"4px",2:"8px",10:"10px",3:"12px",4:"16px",6:"24px",5:"20px",8:"32px",16:"64px",20:"80px",32:"128px",64:"256px",128:"512px",round:"9999px"},ye={0:"0px","01":"2px",1:"4px",2:"8px",3:"12px",4:"16px",5:"20px",6:"24px",7:"28px",8:"32px",9:"36px",10:"40px",12:"48px",14:"56px",16:"64px",20:"80px",32:"128px",64:"256px"},Se={regular:"KHTeka",mono:"KHTekaMono"},_e={regular:"400",medium:"500"},Ce={h1:"50px",h2:"44px",h3:"38px",h4:"32px",h5:"26px",h6:"20px",large:"16px",medium:"14px",small:"12px"},Te={"h1-regular-mono":{lineHeight:"50px",letterSpacing:"-3px"},"h1-regular":{lineHeight:"50px",letterSpacing:"-1px"},"h1-medium":{lineHeight:"50px",letterSpacing:"-0.84px"},"h2-regular-mono":{lineHeight:"44px",letterSpacing:"-2.64px"},"h2-regular":{lineHeight:"44px",letterSpacing:"-0.88px"},"h2-medium":{lineHeight:"44px",letterSpacing:"-0.88px"},"h3-regular-mono":{lineHeight:"38px",letterSpacing:"-2.28px"},"h3-regular":{lineHeight:"38px",letterSpacing:"-0.76px"},"h3-medium":{lineHeight:"38px",letterSpacing:"-0.76px"},"h4-regular-mono":{lineHeight:"32px",letterSpacing:"-1.92px"},"h4-regular":{lineHeight:"32px",letterSpacing:"-0.32px"},"h4-medium":{lineHeight:"32px",letterSpacing:"-0.32px"},"h5-regular-mono":{lineHeight:"26px",letterSpacing:"-1.56px"},"h5-regular":{lineHeight:"26px",letterSpacing:"-0.26px"},"h5-medium":{lineHeight:"26px",letterSpacing:"-0.26px"},"h6-regular-mono":{lineHeight:"20px",letterSpacing:"-1.2px"},"h6-regular":{lineHeight:"20px",letterSpacing:"-0.6px"},"h6-medium":{lineHeight:"20px",letterSpacing:"-0.6px"},"lg-regular-mono":{lineHeight:"16px",letterSpacing:"-0.96px"},"lg-regular":{lineHeight:"18px",letterSpacing:"-0.16px"},"lg-medium":{lineHeight:"18px",letterSpacing:"-0.16px"},"md-regular-mono":{lineHeight:"14px",letterSpacing:"-0.84px"},"md-regular":{lineHeight:"16px",letterSpacing:"-0.14px"},"md-medium":{lineHeight:"16px",letterSpacing:"-0.14px"},"sm-regular-mono":{lineHeight:"12px",letterSpacing:"-0.72px"},"sm-regular":{lineHeight:"14px",letterSpacing:"-0.12px"},"sm-medium":{lineHeight:"14px",letterSpacing:"-0.12px"}},He={"ease-out-power-2":"cubic-bezier(0.23, 0.09, 0.08, 1.13)","ease-out-power-1":"cubic-bezier(0.12, 0.04, 0.2, 1.06)","ease-in-power-2":"cubic-bezier(0.92, -0.13, 0.77, 0.91)","ease-in-power-1":"cubic-bezier(0.88, -0.06, 0.8, 0.96)","ease-inout-power-2":"cubic-bezier(0.77, 0.09, 0.23, 1.13)","ease-inout-power-1":"cubic-bezier(0.88, 0.04, 0.12, 1.06)"},Fe={xl:"400ms",lg:"200ms",md:"125ms",sm:"75ms"},V={colors:ve,fontFamily:Se,fontWeight:_e,textSize:Ce,typography:Te,tokens:{core:W.core,theme:W.dark},borderRadius:we,spacing:ye,durations:Fe,easings:He},oe="--apkt",$={createCSSVariables(e){const t={},r={};function a(i,o,s=""){for(const[c,p]of Object.entries(i)){const u=s?`${s}-${c}`:c;p&&typeof p=="object"&&Object.keys(p).length?(o[c]={},a(p,o[c],u)):typeof p=="string"&&(o[c]=`${oe}-${u}`)}}function n(i,o){for(const[s,c]of Object.entries(i))c&&typeof c=="object"?(o[s]={},n(c,o[s])):typeof c=="string"&&(o[s]=`var(${c})`)}return a(e,t),n(t,r),{cssVariables:t,cssVariablesVarPrefix:r}},assignCSSVariables(e,t){const r={};function a(n,i,o){for(const[s,c]of Object.entries(n)){const p=o?`${o}-${s}`:s,u=i[s];c&&typeof c=="object"?a(c,u,p):typeof u=="string"&&(r[`${oe}-${p}`]=u)}}return a(e,t),r},createRootStyles(e,t){const r={...V,tokens:{...V.tokens,theme:e==="light"?W.light:W.dark}},{cssVariables:a}=$.createCSSVariables(r),n=$.assignCSSVariables(a,r),i=$.generateW3MVariables(t),o=$.generateW3MOverrides(t),s=$.generateScaledVariables(t),c=$.generateBaseVariables(n),p={...n,...c,...i,...o,...s},u=$.applyColorMixToVariables(t,p),l={...p,...u};return`:root {${Object.entries(l).map(([g,h])=>`${g}:${h.replace("/[:;{}</>]/g","")};`).join("")}}`},generateW3MVariables(e){if(!e)return{};const t={};return t["--w3m-font-family"]=e["--w3m-font-family"]||"KHTeka",t["--w3m-accent"]=e["--w3m-accent"]||"#0988F0",t["--w3m-color-mix"]=e["--w3m-color-mix"]||"#000",t["--w3m-color-mix-strength"]=`${e["--w3m-color-mix-strength"]||0}%`,t["--w3m-font-size-master"]=e["--w3m-font-size-master"]||"10px",t["--w3m-border-radius-master"]=e["--w3m-border-radius-master"]||"4px",t},generateW3MOverrides(e){if(!e)return{};const t={};if(e["--w3m-accent"]){const r=e["--w3m-accent"];t["--apkt-tokens-core-iconAccentPrimary"]=r,t["--apkt-tokens-core-borderAccentPrimary"]=r,t["--apkt-tokens-core-textAccentPrimary"]=r,t["--apkt-tokens-core-backgroundAccentPrimary"]=r}return e["--w3m-font-family"]&&(t["--apkt-fontFamily-regular"]=e["--w3m-font-family"]),e["--w3m-z-index"]&&(t["--apkt-tokens-core-zIndex"]=`${e["--w3m-z-index"]}`),t},generateScaledVariables(e){if(!e)return{};const t={};if(e["--w3m-font-size-master"]){const r=parseFloat(e["--w3m-font-size-master"].replace("px",""));t["--apkt-textSize-h1"]=`${Number(r)*5}px`,t["--apkt-textSize-h2"]=`${Number(r)*4.4}px`,t["--apkt-textSize-h3"]=`${Number(r)*3.8}px`,t["--apkt-textSize-h4"]=`${Number(r)*3.2}px`,t["--apkt-textSize-h5"]=`${Number(r)*2.6}px`,t["--apkt-textSize-h6"]=`${Number(r)*2}px`,t["--apkt-textSize-large"]=`${Number(r)*1.6}px`,t["--apkt-textSize-medium"]=`${Number(r)*1.4}px`,t["--apkt-textSize-small"]=`${Number(r)*1.2}px`}if(e["--w3m-border-radius-master"]){const r=parseFloat(e["--w3m-border-radius-master"].replace("px",""));t["--apkt-borderRadius-1"]=`${Number(r)}px`,t["--apkt-borderRadius-2"]=`${Number(r)*2}px`,t["--apkt-borderRadius-3"]=`${Number(r)*3}px`,t["--apkt-borderRadius-4"]=`${Number(r)*4}px`,t["--apkt-borderRadius-5"]=`${Number(r)*5}px`,t["--apkt-borderRadius-6"]=`${Number(r)*6}px`,t["--apkt-borderRadius-8"]=`${Number(r)*8}px`,t["--apkt-borderRadius-16"]=`${Number(r)*16}px`,t["--apkt-borderRadius-20"]=`${Number(r)*20}px`,t["--apkt-borderRadius-32"]=`${Number(r)*32}px`,t["--apkt-borderRadius-64"]=`${Number(r)*64}px`,t["--apkt-borderRadius-128"]=`${Number(r)*128}px`}return t},generateColorMixCSS(e,t){if(!e?.["--w3m-color-mix"]||!e["--w3m-color-mix-strength"])return"";const r=e["--w3m-color-mix"],a=e["--w3m-color-mix-strength"];if(!a||a===0)return"";const n=Object.keys(t||{}).filter(i=>{const o=i.includes("-tokens-core-background")||i.includes("-tokens-core-text")||i.includes("-tokens-core-border")||i.includes("-tokens-core-foreground")||i.includes("-tokens-core-icon")||i.includes("-tokens-theme-background")||i.includes("-tokens-theme-text")||i.includes("-tokens-theme-border")||i.includes("-tokens-theme-foreground")||i.includes("-tokens-theme-icon"),s=i.includes("-borderRadius-")||i.includes("-spacing-")||i.includes("-textSize-")||i.includes("-fontFamily-")||i.includes("-fontWeight-")||i.includes("-typography-")||i.includes("-duration-")||i.includes("-ease-")||i.includes("-path-")||i.includes("-width-")||i.includes("-height-")||i.includes("-visual-size-")||i.includes("-modal-width")||i.includes("-cover");return o&&!s});return n.length===0?"":` @supports (background: color-mix(in srgb, white 50%, black)) {
      :root {
        ${n.map(i=>{const o=t?.[i]||"";return o.includes("color-mix")||o.startsWith("#")||o.startsWith("rgb")?`${i}: color-mix(in srgb, ${r} ${a}%, ${o});`:`${i}: color-mix(in srgb, ${r} ${a}%, var(${i}-base, ${o}));`}).join("")}
      }
    }`},generateBaseVariables(e){const t={},r=e["--apkt-tokens-theme-backgroundPrimary"];r&&(t["--apkt-tokens-theme-backgroundPrimary-base"]=r);const a=e["--apkt-tokens-core-backgroundAccentPrimary"];return a&&(t["--apkt-tokens-core-backgroundAccentPrimary-base"]=a),t},applyColorMixToVariables(e,t){const r={};if(t?.["--apkt-tokens-theme-backgroundPrimary"]&&(r["--apkt-tokens-theme-backgroundPrimary"]="var(--apkt-tokens-theme-backgroundPrimary-base)"),t?.["--apkt-tokens-core-backgroundAccentPrimary"]&&(r["--apkt-tokens-core-backgroundAccentPrimary"]="var(--apkt-tokens-core-backgroundAccentPrimary-base)"),!e?.["--w3m-color-mix"]||!e["--w3m-color-mix-strength"])return r;const a=e["--w3m-color-mix"],n=e["--w3m-color-mix-strength"];if(!n||n===0)return r;const i=Object.keys(t||{}).filter(o=>{const s=o.includes("-tokens-core-background")||o.includes("-tokens-core-text")||o.includes("-tokens-core-border")||o.includes("-tokens-core-foreground")||o.includes("-tokens-core-icon")||o.includes("-tokens-theme-background")||o.includes("-tokens-theme-text")||o.includes("-tokens-theme-border")||o.includes("-tokens-theme-foreground")||o.includes("-tokens-theme-icon")||o.includes("-tokens-theme-overlay"),c=o.includes("-borderRadius-")||o.includes("-spacing-")||o.includes("-textSize-")||o.includes("-fontFamily-")||o.includes("-fontWeight-")||o.includes("-typography-")||o.includes("-duration-")||o.includes("-ease-")||o.includes("-path-")||o.includes("-width-")||o.includes("-height-")||o.includes("-visual-size-")||o.includes("-modal-width")||o.includes("-cover");return s&&!c});return i.length===0||i.forEach(o=>{const s=t?.[o]||"";o.endsWith("-base")||(o==="--apkt-tokens-theme-backgroundPrimary"||o==="--apkt-tokens-core-backgroundAccentPrimary"?r[o]=`color-mix(in srgb, ${a} ${n}%, var(${o}-base))`:s.includes("color-mix")||s.startsWith("#")||s.startsWith("rgb")?r[o]=`color-mix(in srgb, ${a} ${n}%, ${s})`:r[o]=`color-mix(in srgb, ${a} ${n}%, var(${o}-base, ${s}))`)}),r}},{cssVariablesVarPrefix:Ee}=$.createCSSVariables(V);function Ke(e,...t){return A(e,...t.map(r=>typeof r=="function"?f(r(Ee)):f(r)))}var w=void 0,S=void 0,b=void 0,m=void 0,z=void 0,x={"KHTeka-500-woff2":"https://fonts.reown.com/KHTeka-Medium.woff2","KHTeka-400-woff2":"https://fonts.reown.com/KHTeka-Regular.woff2","KHTeka-300-woff2":"https://fonts.reown.com/KHTeka-Light.woff2","KHTekaMono-400-woff2":"https://fonts.reown.com/KHTekaMono-Regular.woff2","KHTeka-500-woff":"https://fonts.reown.com/KHTeka-Light.woff","KHTeka-400-woff":"https://fonts.reown.com/KHTeka-Regular.woff","KHTeka-300-woff":"https://fonts.reown.com/KHTeka-Light.woff","KHTekaMono-400-woff":"https://fonts.reown.com/KHTekaMono-Regular.woff"};function O(e,t="dark"){w&&document.head.removeChild(w),w=document.createElement("style"),w.textContent=$.createRootStyles(t,e),document.head.appendChild(w)}function We(e,t="dark"){if(z=e,S=document.createElement("style"),b=document.createElement("style"),m=document.createElement("style"),S.textContent=T(e).core.cssText,b.textContent=T(e).dark.cssText,m.textContent=T(e).light.cssText,document.head.appendChild(S),document.head.appendChild(b),document.head.appendChild(m),O(e,t),ae(t),!e?.["--w3m-font-family"])for(const[r,a]of Object.entries(x)){const n=document.createElement("link");n.rel="preload",n.href=a,n.as="font",n.type=r.includes("woff2")?"font/woff2":"font/woff",n.crossOrigin="anonymous",document.head.appendChild(n)}ae(t)}function ae(e="dark"){b&&m&&w&&(e==="light"?(O(z,e),b.removeAttribute("media"),m.media="enabled"):(O(z,e),m.removeAttribute("media"),b.media="enabled"))}function ze(e){if(z=e,S&&b&&m&&(S.textContent=T(e).core.cssText,b.textContent=T(e).dark.cssText,m.textContent=T(e).light.cssText,e?.["--w3m-font-family"])){const t=e["--w3m-font-family"];S.textContent=S.textContent?.replace("font-family: KHTeka",`font-family: ${t}`),b.textContent=b.textContent?.replace("font-family: KHTeka",`font-family: ${t}`),m.textContent=m.textContent?.replace("font-family: KHTeka",`font-family: ${t}`)}w&&O(e,m?.media==="enabled"?"light":"dark")}function T(e){return{core:A`
      ${e?.["--w3m-font-family"]?A``:A`
            @font-face {
              font-family: 'KHTeka';
              src:
                url(${f(x["KHTeka-400-woff2"])}) format('woff2'),
                url(${f(x["KHTeka-400-woff"])}) format('woff');
              font-weight: 400;
              font-style: normal;
              font-display: swap;
            }

            @font-face {
              font-family: 'KHTeka';
              src:
                url(${f(x["KHTeka-300-woff2"])}) format('woff2'),
                url(${f(x["KHTeka-300-woff"])}) format('woff');
              font-weight: 300;
              font-style: normal;
            }

            @font-face {
              font-family: 'KHTekaMono';
              src:
                url(${f(x["KHTekaMono-400-woff2"])}) format('woff2'),
                url(${f(x["KHTekaMono-400-woff"])}) format('woff');
              font-weight: 400;
              font-style: normal;
            }

            @font-face {
              font-family: 'KHTeka';
              src:
                url(${f(x["KHTeka-400-woff2"])}) format('woff2'),
                url(${f(x["KHTeka-400-woff"])}) format('woff');
              font-weight: 400;
              font-style: normal;
            }
          `}

      @keyframes w3m-shake {
        0% {
          transform: scale(1) rotate(0deg);
        }
        20% {
          transform: scale(1) rotate(-1deg);
        }
        40% {
          transform: scale(1) rotate(1.5deg);
        }
        60% {
          transform: scale(1) rotate(-1.5deg);
        }
        80% {
          transform: scale(1) rotate(1deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
        }
      }
      @keyframes w3m-iframe-fade-out {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      @keyframes w3m-iframe-zoom-in {
        0% {
          transform: translateY(50px);
          opacity: 0;
        }
        100% {
          transform: translateY(0px);
          opacity: 1;
        }
      }
      @keyframes w3m-iframe-zoom-in-mobile {
        0% {
          transform: scale(0.95);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      :root {
        --apkt-modal-width: 370px;

        --apkt-visual-size-inherit: inherit;
        --apkt-visual-size-sm: 40px;
        --apkt-visual-size-md: 55px;
        --apkt-visual-size-lg: 80px;

        --apkt-path-network-sm: path(
          'M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z'
        );

        --apkt-path-network-md: path(
          'M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z'
        );

        --apkt-path-network-lg: path(
          'M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z'
        );

        --apkt-width-network-sm: 36px;
        --apkt-width-network-md: 48px;
        --apkt-width-network-lg: 86px;

        --apkt-duration-dynamic: 0ms;
        --apkt-height-network-sm: 40px;
        --apkt-height-network-md: 54px;
        --apkt-height-network-lg: 96px;
      }
    `,dark:A`
      :root {
      }
    `,light:A`
      :root {
      }
    `}}var Oe=A`
  div,
  span,
  iframe,
  a,
  img,
  form,
  button,
  label,
  *::after,
  *::before {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-style: normal;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    backface-visibility: hidden;
  }

  :host {
    font-family: var(--apkt-fontFamily-regular);
  }
`,Le=A`
  button,
  a {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;

    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
    outline: none;
    border: none;
    text-decoration: none;
    transition:
      background-color var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      color var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      border var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      box-shadow var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      width var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      height var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      transform var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      opacity var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      scale var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2),
      border-radius var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2);
    will-change:
      background-color, color, border, box-shadow, width, height, transform, opacity, scale,
      border-radius;
  }

  a:active:not([disabled]),
  button:active:not([disabled]) {
    scale: 0.975;
    transform-origin: center;
  }

  button:disabled {
    cursor: default;
  }

  input {
    border: none;
    outline: none;
    appearance: none;
  }
`,M=".",Ue={getSpacingStyles(e,t){if(Array.isArray(e))return e[t]?`var(--apkt-spacing-${e[t]})`:void 0;if(typeof e=="string")return`var(--apkt-spacing-${e})`},getFormattedDate(e){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(e)},formatCurrency(e=0,t={}){const r=Number(e);return isNaN(r)?"$0.00":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2,...t}).format(r)},getHostName(e){try{return new URL(e).hostname}catch{return""}},getTruncateString({string:e,charsStart:t,charsEnd:r,truncate:a}){return e.length<=t+r?e:a==="end"?`${e.substring(0,t)}...`:a==="start"?`...${e.substring(e.length-r)}`:`${e.substring(0,Math.floor(t))}...${e.substring(e.length-Math.floor(r))}`},generateAvatarColors(e){const t=e.toLowerCase().replace(/^0x/iu,"").replace(/[^a-f0-9]/gu,"").substring(0,6).padEnd(6,"0"),r=this.hexToRgb(t),a=getComputedStyle(document.documentElement).getPropertyValue("--w3m-border-radius-master"),n=100-3*Number(a?.replace("px","")),i=`${n}% ${n}% at 65% 40%`,o=[];for(let s=0;s<5;s+=1){const c=this.tintColor(r,.15*s);o.push(`rgb(${c[0]}, ${c[1]}, ${c[2]})`)}return`
    --local-color-1: ${o[0]};
    --local-color-2: ${o[1]};
    --local-color-3: ${o[2]};
    --local-color-4: ${o[3]};
    --local-color-5: ${o[4]};
    --local-radial-circle: ${i}
   `},hexToRgb(e){const t=parseInt(e,16);return[t>>16&255,t>>8&255,t&255]},tintColor(e,t){const[r,a,n]=e;return[Math.round(r+(255-r)*t),Math.round(a+(255-a)*t),Math.round(n+(255-n)*t)]},isNumber(e){return/^[0-9]+$/u.test(e)},getColorTheme(e){return e||(typeof window<"u"&&window.matchMedia&&typeof window.matchMedia=="function"?window.matchMedia("(prefers-color-scheme: dark)")?.matches?"dark":"light":"dark")},splitBalance(e){const t=e.split(".");return t.length===2?[t[0],t[1]]:["0","00"]},roundNumber(e,t,r){return e.toString().length>=t?Number(e).toFixed(r):e},cssDurationToNumber(e){return e.endsWith("s")?Number(e.replace("s",""))*1e3:e.endsWith("ms")?Number(e.replace("ms","")):0},maskInput({value:e,decimals:t,integers:r}){if(e=e.replace(",","."),e===M)return`0${M}`;const[a="",n]=e.split(M).map(c=>c.replace(/[^0-9]/gu,"")),i=r?a.substring(0,r):a,o=i.length===2?String(Number(i)):i,s=typeof t=="number"?n?.substring(0,t):n;return(typeof s=="string"&&(typeof t!="number"||t>0)?[o,s].join(M):o)??""},capitalize(e){return e?e.charAt(0).toUpperCase()+e.slice(1):""}};function Ne(e,t){const{kind:r,elements:a}=t;return{kind:r,elements:a,finisher(n){customElements.get(e)||customElements.define(e,n)}}}function Pe(e,t){return customElements.get(e)||customElements.define(e,t),t}function je(e){return function(r){return typeof r=="function"?Pe(e,r):Ne(e,r)}}var Ve={ACCOUNT_TABS:[{label:"Tokens"},{label:"Activity"}],SECURE_SITE_ORIGIN:(typeof process<"u"?{}.NEXT_PUBLIC_SECURE_SITE_ORIGIN:void 0)||"https://secure.walletconnect.org",VIEW_DIRECTION:{Next:"next",Prev:"prev"},DEFAULT_CONNECT_METHOD_ORDER:["email","social","wallet"],ANIMATION_DURATIONS:{HeaderText:120,ModalHeight:150,ViewTransition:150},VIEWS_WITH_LEGAL_FOOTER:["Connect","ConnectWallets","OnRampTokenSelect","OnRampFiatSelect","OnRampProviders"],VIEWS_WITH_DEFAULT_FOOTER:["Networks"]};export{Ie as _,We as a,ze as c,I as d,d as f,De as g,Me as h,Le as i,Ke as l,Be as m,je as n,Oe as o,H as p,Ue as r,ae as s,Ve as t,Ee as u};
