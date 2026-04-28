import{ct as g,st as l,ut as c}from"./vendor-J89_OWP8.js";import{n as d,r as e,t as u}from"./lit-element-D8HVZO93.js";var f=Object.defineProperty,w=Object.getOwnPropertyDescriptor,s=(a,o,p,i)=>{for(var r=i>1?void 0:i?w(o,p):o,h=a.length-1,n;h>=0;h--)(n=a[h])&&(r=(i?n(o,p,r):n(r))||r);return i&&r&&f(o,p,r),r},t=class extends u{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var a;return d`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${t.weightsMap.get((a=this.weight)!=null?a:"regular")}
    </svg>`}};t.weightsMap=new Map([["thin",e`<path d="M162.83,205.17a4,4,0,0,1-5.66,5.66l-80-80a4,4,0,0,1,0-5.66l80-80a4,4,0,1,1,5.66,5.66L85.66,128Z"/>`],["light",e`<path d="M164.24,203.76a6,6,0,1,1-8.48,8.48l-80-80a6,6,0,0,1,0-8.48l80-80a6,6,0,0,1,8.48,8.48L88.49,128Z"/>`],["regular",e`<path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/>`],["bold",e`<path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/>`],["fill",e`<path d="M168,48V208a8,8,0,0,1-13.66,5.66l-80-80a8,8,0,0,1,0-11.32l80-80A8,8,0,0,1,168,48Z"/>`],["duotone",e`<path d="M160,48V208L80,128Z" opacity="0.2"/><path d="M163.06,40.61a8,8,0,0,0-8.72,1.73l-80,80a8,8,0,0,0,0,11.32l80,80A8,8,0,0,0,168,208V48A8,8,0,0,0,163.06,40.61ZM152,188.69,91.31,128,152,67.31Z"/>`]]);t.styles=c`
    :host {
      display: contents;
    }
  `;s([l({type:String,reflect:!0})],t.prototype,"size",2);s([l({type:String,reflect:!0})],t.prototype,"weight",2);s([l({type:String,reflect:!0})],t.prototype,"color",2);s([l({type:Boolean,reflect:!0})],t.prototype,"mirrored",2);t=s([g("ph-caret-left")],t);export{t as PhCaretLeft};
