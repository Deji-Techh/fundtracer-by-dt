import{d as f,i as a,b as d,a as p}from"./appkit-BaD83J1h.js";import"./index-xWA2Lbiv.js";import"./wagmi-DcZqQoR7.js";import"./vendor-DlsDZ-Ab.js";import"./firebase-OJIFOzyt.js";const m=f`
  :host > wui-flex:first-child {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }
`;var u=function(n,t,i,o){var r=arguments.length,e=r<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,i):o,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(n,t,i,o);else for(var s=n.length-1;s>=0;s--)(l=n[s])&&(e=(r<3?l(e):r>3?l(t,i,e):l(t,i))||e);return r>3&&e&&Object.defineProperty(t,i,e),e};let c=class extends a{render(){return d`
      <wui-flex flexDirection="column" .padding=${["0","3","3","3"]} gap="3">
        <w3m-activity-list page="activity"></w3m-activity-list>
      </wui-flex>
    `}};c.styles=m;c=u([p("w3m-transactions-view")],c);export{c as W3mTransactionsView};
