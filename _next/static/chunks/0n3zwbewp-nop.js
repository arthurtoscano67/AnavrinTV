(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,34131,(t,e,i)=>{(function(){"use strict";function e(t){var e=0;return function(){return e<t.length?{done:!1,value:t[e++]}:{done:!0}}}var i,n,o="function"==typeof Object.defineProperties?Object.defineProperty:function(t,e,i){return t==Array.prototype||t==Object.prototype||(t[e]=i.value),t},r=function(e){e=["object"==typeof globalThis&&globalThis,e,"object"==typeof window&&window,"object"==typeof self&&self,t.g];for(var i=0;i<e.length;++i){var n=e[i];if(n&&n.Math==Math)return n}throw Error("Cannot find global object")}(this);function s(t,e){if(e)t:{var i=r;t=t.split(".");for(var n=0;n<t.length-1;n++){var s=t[n];if(!(s in i))break t;i=i[s]}(e=e(n=i[t=t[t.length-1]]))!=n&&null!=e&&o(i,t,{configurable:!0,writable:!0,value:e})}}function l(t){var i="u">typeof Symbol&&Symbol.iterator&&t[Symbol.iterator];return i?i.call(t):{next:e(t)}}function a(t){if(!(t instanceof Array)){t=l(t);for(var e,i=[];!(e=t.next()).done;)i.push(e.value);t=i}return t}s("Symbol",function(t){function e(t,e){this.l=t,o(this,"description",{configurable:!0,writable:!0,value:e})}if(t)return t;e.prototype.toString=function(){return this.l};var i=0;return function t(n){if(this instanceof t)throw TypeError("Symbol is not a constructor");return new e("jscomp_symbol_"+(n||"")+"_"+i++,n)}}),s("Symbol.iterator",function(t){if(t)return t;t=Symbol("Symbol.iterator");for(var i="Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "),n=0;n<i.length;n++){var s=r[i[n]];"function"==typeof s&&"function"!=typeof s.prototype[t]&&o(s.prototype,t,{configurable:!0,writable:!0,value:function(){var t;return(t={next:t=e(this)})[Symbol.iterator]=function(){return this},t}})}return t});var c,d="function"==typeof Object.create?Object.create:function(t){function e(){}return e.prototype=t,new e},u=function(){if("u">typeof Reflect&&Reflect.construct){if(function(){function t(){}return new t,Reflect.construct(t,[],function(){}),new t instanceof t}())return Reflect.construct;var t=Reflect.construct;return function(e,i,n){return e=t(e,i),n&&Reflect.setPrototypeOf(e,n.prototype),e}}return function(t,e,i){return void 0===i&&(i=t),i=d(i.prototype||Object.prototype),Function.prototype.apply.call(t,i,e)||i}}();if("function"==typeof Object.setPrototypeOf)c=Object.setPrototypeOf;else{t:{var h={};try{h.__proto__={a:!0},p=h.a;break t}catch(t){}p=!1}c=p?function(t,e){if(t.__proto__=e,t.__proto__!==e)throw TypeError(t+" is not extensible");return t}:null}var p,f,g=c,m=window;if(void 0===(null==(f=m.CustomElementRegistryPolyfill)?void 0:f.formAssociated)){var v={};v.formAssociated=new Set,m.CustomElementRegistryPolyfill=v}var y=window.HTMLElement,b=window.customElements.define,C=window.customElements.get,w=window.customElements,x=new WeakMap,k=new WeakMap,$=new WeakMap,_=new WeakMap;function A(){var t;this.promise=new Promise(function(e){t=e}),this.resolve=t}function E(){this.h=new Map,this.m=new Map,this.j=new Map,this.i=new Map}function S(t,e,i,n){var o=t.i.get(i);o||t.i.set(i,o=new Set),n?o.add(e):o.delete(e)}function O(t){var e;null!=(e=n)&&e.has(t)&&R(t,x.get(t))}function R(t,e){var i;null==(i=n)||i.delete(t),e.attributeChangedCallback&&e.observedAttributes.forEach(function(i){t.hasAttribute(i)&&e.attributeChangedCallback.call(t,i,null,t.getAttribute(i))})}function L(t,e,o){o=void 0!==o&&o,Object.setPrototypeOf(t,e.g.prototype),x.set(t,e),i=t;try{new e.g}catch(t){(function t(e){var i=Object.getPrototypeOf(e);if(i!==window.HTMLElement)return i===y?Object.setPrototypeOf(e,window.HTMLElement):t(i)})(e.g),new e.g}e.attributeChangedCallback&&(void 0===n||t.hasAttributes()?R(t,e):n.add(t)),o&&e.connectedCallback&&t.isConnected&&e.connectedCallback.call(t)}E.prototype.define=function(t,e){if(t=t.toLowerCase(),void 0!==this.h.get(t))throw new DOMException("Failed to execute 'define' on 'CustomElementRegistry': the name \""+t+'" has already been used with this registry');if(void 0!==this.m.get(e))throw new DOMException("Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry");var i=e.prototype.attributeChangedCallback,n=new Set(e.observedAttributes||[]),o=e,s=n,a=i;if(0!==s.size&&void 0!==a){var c=o.prototype.setAttribute;c&&(o.prototype.setAttribute=function(t,e){if(O(this),t=t.toLowerCase(),s.has(t)){var i=this.getAttribute(t);c.call(this,t,e),a.call(this,t,i,e)}else c.call(this,t,e)});var d=o.prototype.removeAttribute;d&&(o.prototype.removeAttribute=function(t){if(O(this),t=t.toLowerCase(),s.has(t)){var e=this.getAttribute(t);d.call(this,t),a.call(this,t,e,null)}else d.call(this,t)});var u=o.prototype.toggleAttribute;u&&(o.prototype.toggleAttribute=function(t,e){if(O(this),t=t.toLowerCase(),s.has(t)){var i=this.getAttribute(t);u.call(this,t,e),i!==(e=this.getAttribute(t))&&a.call(this,t,i,e)}else u.call(this,t,e)})}var h,p,f=C.call(w,t),g=null!=(p=null==(h=f)?void 0:h.s)?p:e.formAssociated||m.CustomElementRegistryPolyfill.formAssociated.has(t);if(g&&m.CustomElementRegistryPolyfill.formAssociated.add(t),g!=e.formAssociated)try{e.formAssociated=g}catch(t){}if(i={tagName:t,g:e,connectedCallback:e.prototype.connectedCallback,disconnectedCallback:e.prototype.disconnectedCallback,adoptedCallback:e.prototype.adoptedCallback,attributeChangedCallback:i,formAssociated:g,formAssociatedCallback:e.prototype.formAssociatedCallback,formDisabledCallback:e.prototype.formDisabledCallback,formResetCallback:e.prototype.formResetCallback,formStateRestoreCallback:e.prototype.formStateRestoreCallback,observedAttributes:n},this.h.set(t,i),this.m.set(e,i),f||(f=function(t){function e(){var e=Reflect.construct(y,[],this.constructor);Object.setPrototypeOf(e,HTMLElement.prototype);t:{var i=e.getRootNode();if(!(i===document||i instanceof ShadowRoot)){if((i=P[P.length-1])instanceof CustomElementRegistry){var n=i;break t}(i=i.getRootNode())===document||i instanceof ShadowRoot||(i=(null==(n=_.get(i))?void 0:n.getRootNode())||document)}n=i.registry}return(i=(n=n||window.customElements).h.get(t))?L(e,i):k.set(e,n),e}return r.Object.defineProperty(e,"formAssociated",{configurable:!0,enumerable:!0,get:function(){return m.CustomElementRegistryPolyfill.formAssociated.has(t)}}),e.prototype.connectedCallback=function(e){for(var i=[],n=0;n<arguments.length;++n)i[n]=arguments[n];O(this),(n=x.get(this))?n.connectedCallback&&n.connectedCallback.apply(this,i):S(k.get(this),this,t,!0)},e.prototype.disconnectedCallback=function(e){for(var i=[],n=0;n<arguments.length;++n)i[n]=arguments[n];(n=x.get(this))?n.disconnectedCallback&&n.disconnectedCallback.apply(this,i):S(k.get(this),this,t,!1)},e.prototype.adoptedCallback=function(t){for(var e,i,n=[],o=0;o<arguments.length;++o)n[o]=arguments[o];null==(e=x.get(this))||null==(i=e.adoptedCallback)||i.apply(this,n)},e.prototype.formAssociatedCallback=function(t){for(var e,i=[],n=0;n<arguments.length;++n)i[n]=arguments[n];(null==(n=x.get(this))?0:n.formAssociated)&&(null==n||null==(e=n.formAssociatedCallback)||e.apply(this,i))},e.prototype.formDisabledCallback=function(t){for(var e,i=[],n=0;n<arguments.length;++n)i[n]=arguments[n];(null==(n=x.get(this))?0:n.formAssociated)&&(null==n||null==(e=n.formDisabledCallback)||e.apply(this,i))},e.prototype.formResetCallback=function(t){for(var e,i=[],n=0;n<arguments.length;++n)i[n]=arguments[n];(null==(n=x.get(this))?0:n.formAssociated)&&(null==n||null==(e=n.formResetCallback)||e.apply(this,i))},e.prototype.formStateRestoreCallback=function(t){for(var e,i=[],n=0;n<arguments.length;++n)i[n]=arguments[n];(null==(n=x.get(this))?0:n.formAssociated)&&(null==n||null==(e=n.formStateRestoreCallback)||e.apply(this,i))},e}(t),b.call(w,t,f)),this===window.customElements&&($.set(e,i),i.o=f),f=this.i.get(t))for(this.i.delete(t),n=(f=l(f)).next();!n.done;n=f.next())n=n.value,k.delete(n),L(n,i,!0);return void 0!==(f=this.j.get(t))&&(f.resolve(e),this.j.delete(t)),e},E.prototype.upgrade=function(t){for(var e=[],i=0;i<arguments.length;++i)e[i]=arguments[i];P.push(this),w.upgrade.apply(w,a(e)),P.pop()},E.prototype.get=function(t){var e;return null==(e=this.h.get(t))?void 0:e.g},E.prototype.whenDefined=function(t){var e=this.h.get(t);return void 0!==e?Promise.resolve(e.g):(void 0===(e=this.j.get(t))&&(e=new A,this.j.set(t,e)),e.promise)},window.HTMLElement=function(){var t=i;if(t)return i=void 0,t;var e=$.get(this.constructor);if(!e)throw TypeError("Illegal constructor (custom element class must be registered with global customElements registry to be newable)");return Object.setPrototypeOf(t=Reflect.construct(y,[],e.o),this.constructor.prototype),x.set(t,e),t},window.HTMLElement.prototype=y.prototype,window.CustomElementRegistry=E,"loading"===document.readyState&&(n=new Set,document.addEventListener("readystatechange",function(){n.forEach(function(t){return R(t,x.get(t))})},{once:!0}));var M=Element.prototype.attachShadow;Element.prototype.attachShadow=function(t,e){for(var i=[],n=1;n<arguments.length;++n)i[n-1]=arguments[n];var o=Object.assign({},t);return n=t.customElements,n=void 0===t.registry?n:t.registry,delete o.customElements,delete o.registry,i=M.call.apply(M,[this,o].concat(a(i))),void 0!==n&&(i.customElements=i.registry=n),i};var P=[document];function T(t,e,i){var n=(i?Object.getPrototypeOf(i):t.prototype)[e];t.prototype[e]=function(t){for(var e=[],o=0;o<arguments.length;++o)e[o]=arguments[o];return P.push(this),void 0!==(e=n.apply(i||this,e))&&_.set(e,this),P.pop(),e}}function j(t){var e=Object.getOwnPropertyDescriptor(t.prototype,"innerHTML");Object.defineProperty(t.prototype,"innerHTML",Object.assign({},e,{set:function(t){P.push(this),e.set.call(this,t),P.pop()}}))}if(T(ShadowRoot,"createElement",document),T(ShadowRoot,"createElementNS",document),T(ShadowRoot,"importNode",document),T(Element,"insertAdjacentHTML"),j(Element),j(ShadowRoot),Object.defineProperty(window,"customElements",{value:new CustomElementRegistry,configurable:!0,writable:!0}),window.ElementInternals&&window.ElementInternals.prototype.setFormValue){var U=new WeakMap,H=HTMLElement.prototype.attachInternals;HTMLElement.prototype.attachInternals=function(t){for(var e=[],i=0;i<arguments.length;++i)e[i]=arguments[i];return e=H.call.apply(H,[this].concat(a(e))),U.set(e,this),e},["setFormValue","setValidity","checkValidity","reportValidity"].forEach(function(t){var e=window.ElementInternals.prototype,i=e[t];e[t]=function(t){for(var e=[],n=0;n<arguments.length;++n)e[n]=arguments[n];if(n=U.get(this),!0===x.get(n).formAssociated)return null==i?void 0:i.call.apply(i,[this].concat(a(e)));throw new DOMException("Failed to execute "+i+" on 'ElementInternals': The target element is not a form-associated custom element.")}});var N=function(t){var e=u(Array,[].concat(a(t)),this.constructor);return e.l=t,e},D=Array;if(N.prototype=d(D.prototype),N.prototype.constructor=N,g)g(N,D);else for(var F in D)if("prototype"!=F)if(Object.defineProperties){var I=Object.getOwnPropertyDescriptor(D,F);I&&Object.defineProperty(N,F,I)}else N[F]=D[F];N.u=D.prototype,r.Object.defineProperty(N.prototype,"value",{configurable:!0,enumerable:!0,get:function(){var t;return(null==(t=this.l.find(function(t){return!0===t.checked}))?void 0:t.value)||""}});var W=function(t){var e=this,i=new Map;t.forEach(function(t,n){var o=t.getAttribute("name"),r=i.get(o)||[];e[+n]=t,r.push(t),i.set(o,r)}),this.length=t.length,i.forEach(function(t,i){t&&"length"!==i&&"item"!==i&&"namedItem"!==i&&(e[i]=1===t.length?t[0]:new N(t))})};W.prototype.item=function(t){var e;return null!=(e=this[t])?e:null},W.prototype[Symbol.iterator]=function(){throw Error("Method not implemented.")},W.prototype.namedItem=function(t){var e;return null!=(e=this[t])?e:null};var B=Object.getOwnPropertyDescriptor(HTMLFormElement.prototype,"elements");Object.defineProperty(HTMLFormElement.prototype,"elements",{get:function(){var t=B.get.call(this),e=[];t=l(t);for(var i=t.next();!i.done;i=t.next()){i=i.value;var n=x.get(i);n&&!0!==n.formAssociated||e.push(i)}return new W(e)}})}}).call("object"==typeof globalThis?globalThis:window)},68283,(t,e,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0}),i.StoreController=void 0,i.StoreController=class{constructor(t,e){this.host=t,this.atom=e,t.addController(this)}hostConnected(){this.unsubscribe=this.atom.subscribe(()=>{this.host.requestUpdate()})}hostDisconnected(){var t;null==(t=this.unsubscribe)||t.call(this)}get value(){return this.atom.get()}}},77280,(t,e,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0}),i.MultiStoreController=void 0,i.MultiStoreController=class{constructor(t,e){this.host=t,this.atoms=e,t.addController(this)}hostConnected(){this.unsubscribes=this.atoms.map(t=>t.subscribe(()=>this.host.requestUpdate()))}hostDisconnected(){var t;null==(t=this.unsubscribes)||t.forEach(t=>t())}get values(){return this.atoms.map(t=>t.get())}}},61746,(t,e,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0}),i.useStores=void 0;let n=t.r(77280);i.useStores=function(...t){return e=>class extends e{constructor(...e){super(...e),new n.MultiStoreController(this,t)}}}},15637,(t,e,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0}),i.withStores=void 0;let n=t.r(77280);i.withStores=(t,e)=>class extends t{constructor(...t){super(...t),new n.MultiStoreController(this,e)}}},47151,(t,e,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0}),i.withStores=i.useStores=i.MultiStoreController=i.StoreController=void 0;var n=t.r(68283);Object.defineProperty(i,"StoreController",{enumerable:!0,get:function(){return n.StoreController}});var o=t.r(77280);Object.defineProperty(i,"MultiStoreController",{enumerable:!0,get:function(){return o.MultiStoreController}});var r=t.r(61746);Object.defineProperty(i,"useStores",{enumerable:!0,get:function(){return r.useStores}});var s=t.r(15637);Object.defineProperty(i,"withStores",{enumerable:!0,get:function(){return s.withStores}})},96248,t=>{"use strict";let e,i;var n=t.i(44242),o=t.i(71645),r=t.i(43476);let s=new Set(["children","localName","ref","style","className"]),l=new WeakMap,a=(t,e,i,n,o)=>{let r,s,a=o?.[e];void 0===a?(t[e]=i,null==i&&e in HTMLElement.prototype&&t.removeAttribute(e)):i!==n&&(void 0===(r=l.get(t))&&l.set(t,r=new Map),s=r.get(a),void 0!==i?void 0===s?(r.set(a,s={handleEvent:i}),t.addEventListener(a,s)):s.handleEvent=i:void 0!==s&&(r.delete(a),t.removeEventListener(a,s)))},c=({react:t,tagName:e,elementClass:i,events:n,displayName:o})=>{let r=new Set(Object.keys(n??{})),l=t.forwardRef((o,l)=>{let c=t.useRef(new Map),d=t.useRef(null),u={},h={};for(let[t,e]of Object.entries(o))s.has(t)?u["className"===t?"class":t]=e:r.has(t)||t in i.prototype?h[t]=e:u[t]=e;return t.useLayoutEffect(()=>{if(null===d.current)return;let t=new Map;for(let e in h)a(d.current,e,o[e],c.current.get(e),n),c.current.delete(e),t.set(e,o[e]);for(let[t,e]of c.current)a(d.current,t,void 0,e,n);c.current=t}),t.useLayoutEffect(()=>{d.current?.removeAttribute("defer-hydration")},[]),u.suppressHydrationWarning=!0,t.createElement(e,{...u,ref:t.useCallback(t=>{d.current=t,"function"==typeof l?l(t):null!==l&&(l.current=t)},[l])})});return l.displayName=o??i.name,l};var d=t.i(13317),u=t.i(59254),h=t.i(14910),p=t.i(51187);function f(t){if(t.length<=6)return t;let e=2*!!t.startsWith("0x");return`0x${t.slice(e,e+4)}…${t.slice(-4)}`}var g=t.i(52540);t.i(34131);let m=globalThis,v=m.ShadowRoot&&(void 0===m.ShadyCSS||m.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,y=Symbol(),b=new WeakMap;class C{constructor(t,e,i){if(this._$cssResult$=!0,i!==y)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(v&&void 0===t){let i=void 0!==e&&1===e.length;i&&(t=b.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&b.set(e,t))}return t}toString(){return this.cssText}}let w=(t,...e)=>new C(1===t.length?t[0]:e.reduce((e,i,n)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[n+1],t[0]),t,y),x=(t,e)=>{if(v)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let i of e){let e=document.createElement("style"),n=m.litNonce;void 0!==n&&e.setAttribute("nonce",n),e.textContent=i.cssText,t.appendChild(e)}},k=v?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e,i="";for(let e of t.cssRules)i+=e.cssText;return new C("string"==typeof(e=i)?e:e+"",void 0,y)})(t):t,{is:$,defineProperty:_,getOwnPropertyDescriptor:A,getOwnPropertyNames:E,getOwnPropertySymbols:S,getPrototypeOf:O}=Object,R=globalThis,L=R.trustedTypes,M=L?L.emptyScript:"",P=R.reactiveElementPolyfillSupport,T={toAttribute(t,e){switch(e){case Boolean:t=t?M:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},j=(t,e)=>!$(t,e),U={attribute:!0,type:String,converter:T,reflect:!1,useDefault:!1,hasChanged:j};Symbol.metadata??=Symbol("metadata"),R.litPropertyMetadata??=new WeakMap;class H extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=U){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let i=Symbol(),n=this.getPropertyDescriptor(t,i,e);void 0!==n&&_(this.prototype,t,n)}}static getPropertyDescriptor(t,e,i){let{get:n,set:o}=A(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:n,set(e){let r=n?.call(this);o?.call(this,e),this.requestUpdate(t,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??U}static _$Ei(){if(this.hasOwnProperty("elementProperties"))return;let t=O(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty("finalized"))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty("properties")){let t=this.properties;for(let e of[...E(t),...S(t)])this.createProperty(e,t[e])}let t=this[Symbol.metadata];if(null!==t){let e=litPropertyMetadata.get(t);if(void 0!==e)for(let[t,i]of e)this.elementProperties.set(t,i)}for(let[t,e]of(this._$Eh=new Map,this.elementProperties)){let i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t))for(let i of new Set(t.flat(1/0).reverse()))e.unshift(k(i));else void 0!==t&&e.push(k(t));return e}static _$Eu(t,e){let i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map;for(let e of this.constructor.elementProperties.keys())this.hasOwnProperty(e)&&(t.set(e,this[e]),delete this[e]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return x(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){let i=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,i);if(void 0!==n&&!0===i.reflect){let o=(void 0!==i.converter?.toAttribute?i.converter:T).toAttribute(e,i.type);this._$Em=t,null==o?this.removeAttribute(n):this.setAttribute(n,o),this._$Em=null}}_$AK(t,e){let i=this.constructor,n=i._$Eh.get(t);if(void 0!==n&&this._$Em!==n){let t=i.getPropertyOptions(n),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:T;this._$Em=n;let r=o.fromAttribute(e,t.type);this[n]=r??this._$Ej?.get(n)??r,this._$Em=null}}requestUpdate(t,e,i,n=!1,o){if(void 0!==t){let r=this.constructor;if(!1===n&&(o=this[t]),!(((i??=r.getPropertyOptions(t)).hasChanged??j)(o,e)||i.useDefault&&i.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:n,wrapped:o},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==o||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===n&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}let t=this.constructor.elementProperties;if(t.size>0)for(let[e,i]of t){let{wrapped:t}=i,n=this[e];!0!==t||this._$AL.has(e)||void 0===n||this.C(e,void 0,i,n)}}let t=!1,e=this._$AL;try{(t=this.shouldUpdate(e))?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}H.elementStyles=[],H.shadowRootOptions={mode:"open"},H.elementProperties=new Map,H.finalized=new Map,P?.({ReactiveElement:H}),(R.reactiveElementVersions??=[]).push("2.1.2");let N=globalThis,D=t=>t,F=N.trustedTypes,I=F?F.createPolicy("lit-html",{createHTML:t=>t}):void 0,W="$lit$",B=`lit$${Math.random().toFixed(9).slice(2)}$`,V="?"+B,z=`<${V}>`,q=document,Z=()=>q.createComment(""),K=t=>null===t||"object"!=typeof t&&"function"!=typeof t,J=Array.isArray,Y="[ 	\n\f\r]",G=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Q=/-->/g,X=/>/g,tt=RegExp(`>|${Y}(?:([^\\s"'>=/]+)(${Y}*=${Y}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),te=/'/g,ti=/"/g,tn=/^(?:script|style|textarea|title)$/i,to=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),tr=to(1),ts=(to(2),to(3),Symbol.for("lit-noChange")),tl=Symbol.for("lit-nothing"),ta=new WeakMap,tc=q.createTreeWalker(q,129);function td(t,e){if(!J(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==I?I.createHTML(e):e}class tu{constructor({strings:t,_$litType$:e},i){let n;this.parts=[];let o=0,r=0;const s=t.length-1,l=this.parts,[a,c]=((t,e)=>{let i=t.length-1,n=[],o,r=2===e?"<svg>":3===e?"<math>":"",s=G;for(let e=0;e<i;e++){let i=t[e],l,a,c=-1,d=0;for(;d<i.length&&(s.lastIndex=d,null!==(a=s.exec(i)));)d=s.lastIndex,s===G?"!--"===a[1]?s=Q:void 0!==a[1]?s=X:void 0!==a[2]?(tn.test(a[2])&&(o=RegExp("</"+a[2],"g")),s=tt):void 0!==a[3]&&(s=tt):s===tt?">"===a[0]?(s=o??G,c=-1):void 0===a[1]?c=-2:(c=s.lastIndex-a[2].length,l=a[1],s=void 0===a[3]?tt:'"'===a[3]?ti:te):s===ti||s===te?s=tt:s===Q||s===X?s=G:(s=tt,o=void 0);let u=s===tt&&t[e+1].startsWith("/>")?" ":"";r+=s===G?i+z:c>=0?(n.push(l),i.slice(0,c)+W+i.slice(c)+B+u):i+B+(-2===c?e:u)}return[td(t,r+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),n]})(t,e);if(this.el=tu.createElement(a,i),tc.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(n=tc.nextNode())&&l.length<s;){if(1===n.nodeType){if(n.hasAttributes())for(const t of n.getAttributeNames())if(t.endsWith(W)){const e=c[r++],i=n.getAttribute(t).split(B),s=/([.?@])?(.*)/.exec(e);l.push({type:1,index:o,name:s[2],strings:i,ctor:"."===s[1]?tm:"?"===s[1]?tv:"@"===s[1]?ty:tg}),n.removeAttribute(t)}else t.startsWith(B)&&(l.push({type:6,index:o}),n.removeAttribute(t));if(tn.test(n.tagName)){const t=n.textContent.split(B),e=t.length-1;if(e>0){n.textContent=F?F.emptyScript:"";for(let i=0;i<e;i++)n.append(t[i],Z()),tc.nextNode(),l.push({type:2,index:++o});n.append(t[e],Z())}}}else if(8===n.nodeType)if(n.data===V)l.push({type:2,index:o});else{let t=-1;for(;-1!==(t=n.data.indexOf(B,t+1));)l.push({type:7,index:o}),t+=B.length-1}o++}}static createElement(t,e){let i=q.createElement("template");return i.innerHTML=t,i}}function th(t,e,i=t,n){if(e===ts)return e;let o=void 0!==n?i._$Co?.[n]:i._$Cl,r=K(e)?void 0:e._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),void 0===r?o=void 0:(o=new r(t))._$AT(t,i,n),void 0!==n?(i._$Co??=[])[n]=o:i._$Cl=o),void 0!==o&&(e=th(t,o._$AS(t,e.values),o,n)),e}class tp{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:i}=this._$AD,n=(t?.creationScope??q).importNode(e,!0);tc.currentNode=n;let o=tc.nextNode(),r=0,s=0,l=i[0];for(;void 0!==l;){if(r===l.index){let e;2===l.type?e=new tf(o,o.nextSibling,this,t):1===l.type?e=new l.ctor(o,l.name,l.strings,this,t):6===l.type&&(e=new tb(o,this,t)),this._$AV.push(e),l=i[++s]}r!==l?.index&&(o=tc.nextNode(),r++)}return tc.currentNode=q,n}p(t){let e=0;for(let i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class tf{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,n){this.type=2,this._$AH=tl,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){let i;K(t=th(this,t,e))?t===tl||null==t||""===t?(this._$AH!==tl&&this._$AR(),this._$AH=tl):t!==this._$AH&&t!==ts&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):J(i=t)||"function"==typeof i?.[Symbol.iterator]?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==tl&&K(this._$AH)?this._$AA.nextSibling.data=t:this.T(q.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:i}=t,n="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=tu.createElement(td(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===n)this._$AH.p(e);else{let t=new tp(n,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=ta.get(t.strings);return void 0===e&&ta.set(t.strings,e=new tu(t)),e}k(t){J(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,i,n=0;for(let o of t)n===e.length?e.push(i=new tf(this.O(Z()),this.O(Z()),this,this.options)):i=e[n],i._$AI(o),n++;n<e.length&&(this._$AR(i&&i._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let e=D(t).nextSibling;D(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tg{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,n,o){this.type=1,this._$AH=tl,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=tl}_$AI(t,e=this,i,n){let o=this.strings,r=!1;if(void 0===o)(r=!K(t=th(this,t,e,0))||t!==this._$AH&&t!==ts)&&(this._$AH=t);else{let n,s,l=t;for(t=o[0],n=0;n<o.length-1;n++)(s=th(this,l[i+n],e,n))===ts&&(s=this._$AH[n]),r||=!K(s)||s!==this._$AH[n],s===tl?t=tl:t!==tl&&(t+=(s??"")+o[n+1]),this._$AH[n]=s}r&&!n&&this.j(t)}j(t){t===tl?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class tm extends tg{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===tl?void 0:t}}class tv extends tg{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==tl)}}class ty extends tg{constructor(t,e,i,n,o){super(t,e,i,n,o),this.type=5}_$AI(t,e=this){if((t=th(this,t,e,0)??tl)===ts)return;let i=this._$AH,n=t===tl&&i!==tl||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,o=t!==tl&&(i===tl||n);n&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class tb{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){th(this,t)}}let tC=N.litHtmlPolyfillSupport;tC?.(tu,tf),(N.litHtmlVersions??=[]).push("3.3.2");let tw=globalThis;class tx extends H{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{let n=i?.renderBefore??e,o=n._$litPart$;if(void 0===o){let t=i?.renderBefore??null;n._$litPart$=o=new tf(e.insertBefore(Z(),t),t,void 0,i??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return ts}}tx._$litElement$=!0,tx.finalized=!0,tw.litElementHydrateSupport?.({LitElement:tx});let tk=tw.litElementPolyfillSupport;tk?.({LitElement:tx}),(tw.litElementVersions??=[]).push("4.2.2");let t$={attribute:!0,type:String,converter:T,reflect:!1,hasChanged:j};function t_(t){return(e,i)=>{let n;return"object"==typeof i?((t=t$,e,i)=>{let{kind:n,metadata:o}=i,r=globalThis.litPropertyMetadata.get(o);if(void 0===r&&globalThis.litPropertyMetadata.set(o,r=new Map),"setter"===n&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),"accessor"===n){let{name:n}=i;return{set(i){let o=e.get.call(this);e.set.call(this,i),this.requestUpdate(n,o,t,!0,i)},init(e){return void 0!==e&&this.C(n,void 0,t,e),e}}}if("setter"===n){let{name:n}=i;return function(i){let o=this[n];e.call(this,i),this.requestUpdate(n,o,t,!0,i)}}throw Error("Unsupported decorator location: "+n)})(t,e,i):(n=e.hasOwnProperty(i),e.constructor.createProperty(i,t),n?Object.getOwnPropertyDescriptor(e,i):void 0)}}function tA(t){return t_({...t,state:!0,attribute:!1})}let tE=t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},tS=(t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,i),i);function tO(t,e){return(i,n,o)=>{let r=e=>e.renderRoot?.querySelector(t)??null;if(e){let t,{get:e,set:s}="object"==typeof n?i:o??(t=Symbol(),{get(){return this[t]},set(e){this[t]=e}});return tS(i,n,{get(){let t=e.call(this);return void 0===t&&(null!==(t=r(this))||this.hasUpdated)&&s.call(this,t),t}})}return tS(i,n,{get(){return r(this)}})}}var tR=t.i(47151);function tL(t){return class extends t{createRenderRoot(){let t=this.constructor,{registry:e,elementDefinitions:i,shadowRootOptions:n}=t;i&&!e&&(t.registry=new CustomElementRegistry,Object.entries(i).forEach(([e,i])=>t.registry.define(e,i)));let o=this.renderOptions.creationScope=this.attachShadow({...n,customElements:t.registry});return x(o,this.constructor.elementStyles),o}}}class tM{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}let tP=(i=class extends tM{constructor(t){if(super(t),1!==t.type||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){if(void 0===this.st){for(let i in this.st=new Set,void 0!==t.strings&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(t=>""!==t))),e)e[i]&&!this.nt?.has(i)&&this.st.add(i);return this.render(e)}let i=t.element.classList;for(let t of this.st)t in e||(i.remove(t),this.st.delete(t));for(let t in e){let n=!!e[t];n===this.st.has(t)||this.nt?.has(t)||(n?(i.add(t),this.st.add(t)):(i.remove(t),this.st.delete(t)))}return ts}},(...t)=>({_$litDirective$:i,values:t})),tT=Math.min,tj=Math.max,tU=Math.round,tH=Math.floor,tN=t=>({x:t,y:t}),tD={left:"right",right:"left",bottom:"top",top:"bottom"};function tF(t,e){return"function"==typeof t?t(e):t}function tI(t){return t.split("-")[0]}function tW(t){return t.split("-")[1]}function tB(t){return"x"===t?"y":"x"}function tV(t){return"y"===t?"height":"width"}function tz(t){let e=t[0];return"t"===e||"b"===e?"y":"x"}function tq(t){return t.includes("start")?t.replace("start","end"):t.replace("end","start")}let tZ=["left","right"],tK=["right","left"],tJ=["top","bottom"],tY=["bottom","top"];function tG(t){let e=tI(t);return tD[e]+t.slice(e.length)}function tQ(t){let{x:e,y:i,width:n,height:o}=t;return{width:n,height:o,top:i,left:e,right:e+n,bottom:i+o,x:e,y:i}}function tX(t,e,i){let n,{reference:o,floating:r}=t,s=tz(e),l=tB(tz(e)),a=tV(l),c=tI(e),d="y"===s,u=o.x+o.width/2-r.width/2,h=o.y+o.height/2-r.height/2,p=o[a]/2-r[a]/2;switch(c){case"top":n={x:u,y:o.y-r.height};break;case"bottom":n={x:u,y:o.y+o.height};break;case"right":n={x:o.x+o.width,y:h};break;case"left":n={x:o.x-r.width,y:h};break;default:n={x:o.x,y:o.y}}switch(tW(e)){case"start":n[l]-=p*(i&&d?-1:1);break;case"end":n[l]+=p*(i&&d?-1:1)}return n}async function t1(t,e){var i,n;void 0===e&&(e={});let{x:o,y:r,platform:s,rects:l,elements:a,strategy:c}=t,{boundary:d="clippingAncestors",rootBoundary:u="viewport",elementContext:h="floating",altBoundary:p=!1,padding:f=0}=tF(e,t),g="number"!=typeof(n=f)?{top:0,right:0,bottom:0,left:0,...n}:{top:n,right:n,bottom:n,left:n},m=a[p?"floating"===h?"reference":"floating":h],v=tQ(await s.getClippingRect({element:null==(i=await (null==s.isElement?void 0:s.isElement(m)))||i?m:m.contextElement||await (null==s.getDocumentElement?void 0:s.getDocumentElement(a.floating)),boundary:d,rootBoundary:u,strategy:c})),y="floating"===h?{x:o,y:r,width:l.floating.width,height:l.floating.height}:l.reference,b=await (null==s.getOffsetParent?void 0:s.getOffsetParent(a.floating)),C=await (null==s.isElement?void 0:s.isElement(b))&&await (null==s.getScale?void 0:s.getScale(b))||{x:1,y:1},w=tQ(s.convertOffsetParentRelativeRectToViewportRelativeRect?await s.convertOffsetParentRelativeRectToViewportRelativeRect({elements:a,rect:y,offsetParent:b,strategy:c}):y);return{top:(v.top-w.top+g.top)/C.y,bottom:(w.bottom-v.bottom+g.bottom)/C.y,left:(v.left-w.left+g.left)/C.x,right:(w.right-v.right+g.right)/C.x}}let t0=async(t,e,i)=>{let{placement:n="bottom",strategy:o="absolute",middleware:r=[],platform:s}=i,l=s.detectOverflow?s:{...s,detectOverflow:t1},a=await (null==s.isRTL?void 0:s.isRTL(e)),c=await s.getElementRects({reference:t,floating:e,strategy:o}),{x:d,y:u}=tX(c,n,a),h=n,p=0,f={};for(let i=0;i<r.length;i++){let g=r[i];if(!g)continue;let{name:m,fn:v}=g,{x:y,y:b,data:C,reset:w}=await v({x:d,y:u,initialPlacement:n,placement:h,strategy:o,middlewareData:f,rects:c,platform:l,elements:{reference:t,floating:e}});d=null!=y?y:d,u=null!=b?b:u,f[m]={...f[m],...C},w&&p<50&&(p++,"object"==typeof w&&(w.placement&&(h=w.placement),w.rects&&(c=!0===w.rects?await s.getElementRects({reference:t,floating:e,strategy:o}):w.rects),{x:d,y:u}=tX(c,h,a)),i=-1)}return{x:d,y:u,placement:h,strategy:o,middlewareData:f}},t4=new Set(["left","top"]);async function t3(t,e){let{placement:i,platform:n,elements:o}=t,r=await (null==n.isRTL?void 0:n.isRTL(o.floating)),s=tI(i),l=tW(i),a="y"===tz(i),c=t4.has(s)?-1:1,d=r&&a?-1:1,u=tF(e,t),{mainAxis:h,crossAxis:p,alignmentAxis:f}="number"==typeof u?{mainAxis:u,crossAxis:0,alignmentAxis:null}:{mainAxis:u.mainAxis||0,crossAxis:u.crossAxis||0,alignmentAxis:u.alignmentAxis};return l&&"number"==typeof f&&(p="end"===l?-1*f:f),a?{x:p*d,y:h*c}:{x:h*c,y:p*d}}function t2(){return"u">typeof window}function t6(t){return t7(t)?(t.nodeName||"").toLowerCase():"#document"}function t8(t){var e;return(null==t||null==(e=t.ownerDocument)?void 0:e.defaultView)||window}function t5(t){var e;return null==(e=(t7(t)?t.ownerDocument:t.document)||window.document)?void 0:e.documentElement}function t7(t){return!!t2()&&(t instanceof Node||t instanceof t8(t).Node)}function t9(t){return!!t2()&&(t instanceof Element||t instanceof t8(t).Element)}function et(t){return!!t2()&&(t instanceof HTMLElement||t instanceof t8(t).HTMLElement)}function ee(t){return!(!t2()||"u"<typeof ShadowRoot)&&(t instanceof ShadowRoot||t instanceof t8(t).ShadowRoot)}function ei(t){let{overflow:e,overflowX:i,overflowY:n,display:o}=ed(t);return/auto|scroll|overlay|hidden|clip/.test(e+n+i)&&"inline"!==o&&"contents"!==o}function en(t){try{if(t.matches(":popover-open"))return!0}catch(t){}try{return t.matches(":modal")}catch(t){return!1}}let eo=/transform|translate|scale|rotate|perspective|filter/,er=/paint|layout|strict|content/,es=t=>!!t&&"none"!==t;function el(t){let e=t9(t)?ed(t):t;return es(e.transform)||es(e.translate)||es(e.scale)||es(e.rotate)||es(e.perspective)||!ea()&&(es(e.backdropFilter)||es(e.filter))||eo.test(e.willChange||"")||er.test(e.contain||"")}function ea(){return null==e&&(e="u">typeof CSS&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none")),e}function ec(t){return/^(html|body|#document)$/.test(t6(t))}function ed(t){return t8(t).getComputedStyle(t)}function eu(t){return t9(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function eh(t){if("html"===t6(t))return t;let e=t.assignedSlot||t.parentNode||ee(t)&&t.host||t5(t);return ee(e)?e.host:e}function ep(t,e,i){var n;void 0===e&&(e=[]),void 0===i&&(i=!0);let o=function t(e){let i=eh(e);return ec(i)?e.ownerDocument?e.ownerDocument.body:e.body:et(i)&&ei(i)?i:t(i)}(t),r=o===(null==(n=t.ownerDocument)?void 0:n.body),s=t8(o);if(!r)return e.concat(o,ep(o,[],i));{let t=ef(s);return e.concat(s,s.visualViewport||[],ei(o)?o:[],t&&i?ep(t):[])}}function ef(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function eg(t){let e=ed(t),i=parseFloat(e.width)||0,n=parseFloat(e.height)||0,o=et(t),r=o?t.offsetWidth:i,s=o?t.offsetHeight:n,l=tU(i)!==r||tU(n)!==s;return l&&(i=r,n=s),{width:i,height:n,$:l}}function em(t){return t9(t)?t:t.contextElement}function ev(t){let e=em(t);if(!et(e))return tN(1);let i=e.getBoundingClientRect(),{width:n,height:o,$:r}=eg(e),s=(r?tU(i.width):i.width)/n,l=(r?tU(i.height):i.height)/o;return s&&Number.isFinite(s)||(s=1),l&&Number.isFinite(l)||(l=1),{x:s,y:l}}let ey=tN(0);function eb(t){let e=t8(t);return ea()&&e.visualViewport?{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}:ey}function eC(t,e,i,n){var o;void 0===e&&(e=!1),void 0===i&&(i=!1);let r=t.getBoundingClientRect(),s=em(t),l=tN(1);e&&(n?t9(n)&&(l=ev(n)):l=ev(t));let a=(void 0===(o=i)&&(o=!1),n&&(!o||n===t8(s))&&o)?eb(s):tN(0),c=(r.left+a.x)/l.x,d=(r.top+a.y)/l.y,u=r.width/l.x,h=r.height/l.y;if(s){let t=t8(s),e=n&&t9(n)?t8(n):n,i=t,o=ef(i);for(;o&&n&&e!==i;){let t=ev(o),e=o.getBoundingClientRect(),n=ed(o),r=e.left+(o.clientLeft+parseFloat(n.paddingLeft))*t.x,s=e.top+(o.clientTop+parseFloat(n.paddingTop))*t.y;c*=t.x,d*=t.y,u*=t.x,h*=t.y,c+=r,d+=s,o=ef(i=t8(o))}}return tQ({width:u,height:h,x:c,y:d})}function ew(t,e){let i=eu(t).scrollLeft;return e?e.left+i:eC(t5(t)).left+i}function ex(t,e){let i=t.getBoundingClientRect();return{x:i.left+e.scrollLeft-ew(t,i),y:i.top+e.scrollTop}}function ek(t,e,i){var n;let o;if("viewport"===e)o=function(t,e){let i=t8(t),n=t5(t),o=i.visualViewport,r=n.clientWidth,s=n.clientHeight,l=0,a=0;if(o){r=o.width,s=o.height;let t=ea();(!t||t&&"fixed"===e)&&(l=o.offsetLeft,a=o.offsetTop)}let c=ew(n);if(c<=0){let t=n.ownerDocument,e=t.body,i=getComputedStyle(e),o="CSS1Compat"===t.compatMode&&parseFloat(i.marginLeft)+parseFloat(i.marginRight)||0,s=Math.abs(n.clientWidth-e.clientWidth-o);s<=25&&(r-=s)}else c<=25&&(r+=c);return{width:r,height:s,x:l,y:a}}(t,i);else if("document"===e){let e,i,r,s,l,a,c;n=t5(t),e=t5(n),i=eu(n),r=n.ownerDocument.body,s=tj(e.scrollWidth,e.clientWidth,r.scrollWidth,r.clientWidth),l=tj(e.scrollHeight,e.clientHeight,r.scrollHeight,r.clientHeight),a=-i.scrollLeft+ew(n),c=-i.scrollTop,"rtl"===ed(r).direction&&(a+=tj(e.clientWidth,r.clientWidth)-s),o={width:s,height:l,x:a,y:c}}else if(t9(e)){let t,n,r,s,l,a;n=(t=eC(e,!0,"fixed"===i)).top+e.clientTop,r=t.left+e.clientLeft,s=et(e)?ev(e):tN(1),l=e.clientWidth*s.x,a=e.clientHeight*s.y,o={width:l,height:a,x:r*s.x,y:n*s.y}}else{let i=eb(t);o={x:e.x-i.x,y:e.y-i.y,width:e.width,height:e.height}}return tQ(o)}function e$(t){return"static"===ed(t).position}function e_(t,e){if(!et(t)||"fixed"===ed(t).position)return null;if(e)return e(t);let i=t.offsetParent;return t5(t)===i&&(i=i.ownerDocument.body),i}function eA(t,e){var i;let n=t8(t);if(en(t))return n;if(!et(t)){let e=eh(t);for(;e&&!ec(e);){if(t9(e)&&!e$(e))return e;e=eh(e)}return n}let o=e_(t,e);for(;o&&(i=o,/^(table|td|th)$/.test(t6(i)))&&e$(o);)o=e_(o,e);return o&&ec(o)&&e$(o)&&!el(o)?n:o||function(t){let e=eh(t);for(;et(e)&&!ec(e);){if(el(e))return e;if(en(e))break;e=eh(e)}return null}(t)||n}let eE=async function(t){let e=this.getOffsetParent||eA,i=this.getDimensions,n=await i(t.floating);return{reference:function(t,e,i){let n=et(e),o=t5(e),r="fixed"===i,s=eC(t,!0,r,e),l={scrollLeft:0,scrollTop:0},a=tN(0);if(n||!n&&!r)if(("body"!==t6(e)||ei(o))&&(l=eu(e)),n){let t=eC(e,!0,r,e);a.x=t.x+e.clientLeft,a.y=t.y+e.clientTop}else o&&(a.x=ew(o));r&&!n&&o&&(a.x=ew(o));let c=!o||n||r?tN(0):ex(o,l);return{x:s.left+l.scrollLeft-a.x-c.x,y:s.top+l.scrollTop-a.y-c.y,width:s.width,height:s.height}}(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:n.width,height:n.height}}},eS={convertOffsetParentRelativeRectToViewportRelativeRect:function(t){let{elements:e,rect:i,offsetParent:n,strategy:o}=t,r="fixed"===o,s=t5(n),l=!!e&&en(e.floating);if(n===s||l&&r)return i;let a={scrollLeft:0,scrollTop:0},c=tN(1),d=tN(0),u=et(n);if((u||!u&&!r)&&(("body"!==t6(n)||ei(s))&&(a=eu(n)),u)){let t=eC(n);c=ev(n),d.x=t.x+n.clientLeft,d.y=t.y+n.clientTop}let h=!s||u||r?tN(0):ex(s,a);return{width:i.width*c.x,height:i.height*c.y,x:i.x*c.x-a.scrollLeft*c.x+d.x+h.x,y:i.y*c.y-a.scrollTop*c.y+d.y+h.y}},getDocumentElement:t5,getClippingRect:function(t){let{element:e,boundary:i,rootBoundary:n,strategy:o}=t,r=[..."clippingAncestors"===i?en(e)?[]:function(t,e){let i=e.get(t);if(i)return i;let n=ep(t,[],!1).filter(t=>t9(t)&&"body"!==t6(t)),o=null,r="fixed"===ed(t).position,s=r?eh(t):t;for(;t9(s)&&!ec(s);){let e=ed(s),i=el(s);i||"fixed"!==e.position||(o=null),(r?i||o:!(!i&&"static"===e.position&&o&&("absolute"===o.position||"fixed"===o.position)||ei(s)&&!i&&function t(e,i){let n=eh(e);return!(n===i||!t9(n)||ec(n))&&("fixed"===ed(n).position||t(n,i))}(t,s)))?o=e:n=n.filter(t=>t!==s),s=eh(s)}return e.set(t,n),n}(e,this._c):[].concat(i),n],s=ek(e,r[0],o),l=s.top,a=s.right,c=s.bottom,d=s.left;for(let t=1;t<r.length;t++){let i=ek(e,r[t],o);l=tj(i.top,l),a=tT(i.right,a),c=tT(i.bottom,c),d=tj(i.left,d)}return{width:a-d,height:c-l,x:d,y:l}},getOffsetParent:eA,getElementRects:eE,getClientRects:function(t){return Array.from(t.getClientRects())},getDimensions:function(t){let{width:e,height:i}=eg(t);return{width:e,height:i}},getScale:ev,isElement:t9,isRTL:function(t){return"rtl"===ed(t).direction}};function eO(t,e){return t.x===e.x&&t.y===e.y&&t.width===e.width&&t.height===e.height}let eR=Symbol();class eL{get taskComplete(){return this.t||(1===this.i?this.t=new Promise((t,e)=>{this.o=t,this.h=e}):3===this.i?this.t=Promise.reject(this.l):this.t=Promise.resolve(this.u)),this.t}constructor(t,e,i){this.p=0,this.i=0,(this._=t).addController(this);const n="object"==typeof e?e:{task:e,args:i};this.v=n.task,this.j=n.args,this.m=n.argsEqual??eM,this.k=n.onComplete,this.A=n.onError,this.autoRun=n.autoRun??!0,"initialValue"in n&&(this.u=n.initialValue,this.i=2,this.O=this.T?.())}hostUpdate(){!0===this.autoRun&&this.S()}hostUpdated(){"afterUpdate"===this.autoRun&&this.S()}T(){if(void 0===this.j)return;let t=this.j();if(!Array.isArray(t))throw Error("The args function must return an array");return t}async S(){let t=this.T(),e=this.O;this.O=t,t===e||void 0===t||void 0!==e&&this.m(e,t)||await this.run(t)}async run(t){let e,i;t??=this.T(),this.O=t,1===this.i?this.q?.abort():(this.t=void 0,this.o=void 0,this.h=void 0),this.i=1,"afterUpdate"===this.autoRun?queueMicrotask(()=>this._.requestUpdate()):this._.requestUpdate();let n=++this.p;this.q=new AbortController;let o=!1;try{e=await this.v(t,{signal:this.q.signal})}catch(t){o=!0,i=t}if(this.p===n){if(e===eR)this.i=0;else{if(!1===o){try{this.k?.(e)}catch{}this.i=2,this.o?.(e)}else{try{this.A?.(i)}catch{}this.i=3,this.h?.(i)}this.u=e,this.l=i}this._.requestUpdate()}}abort(t){1===this.i&&this.q?.abort(t)}get value(){return this.u}get error(){return this.l}get status(){return this.i}render(t){switch(this.i){case 0:return t.initial?.();case 1:return t.pending?.();case 2:return t.complete?.(this.value);case 3:return t.error?.(this.error);default:throw Error("Unexpected status: "+this.i)}}}let eM=(t,e)=>t===e||t.length===e.length&&t.every((t,i)=>!j(t,e[i]));function eP(){return function(t,e){let i=Symbol(),n=Symbol();Object.defineProperty(t,e,{get(){return this[n]},set(t){let o=this[n];if(o===t)return;this[n]=t;let r=this[i];r&&(r.hostDisconnected(),this.removeController(r));let s=t?new tR.MultiStoreController(this,Object.values(t.stores)):void 0;this[i]=s,r&&!s&&this.requestUpdate(e,o)},configurable:!0,enumerable:!0})}}let eT=w`
	* {
		box-sizing: border-box;
		-webkit-font-smoothing: antialiased;
		font-family: var(--dapp-kit-font-sans);
		outline-color: color-mix(in oklab, var(--dapp-kit-ring) 50%, transparent);
	}

	button {
		appearance: none;
		background-color: transparent;
		font-size: inherit;
		font-family: inherit;
		line-height: inherit;
		letter-spacing: inherit;
		color: inherit;
		border: 0;
		padding: 0;
		margin: 0;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	p,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		font-size: inherit;
		font-weight: inherit;
		color: var(--dapp-kit-foreground);
		margin: 0;
	}
`,ej=[w`
	:host {
		/** Colors */
		--dapp-kit-background: var(--background, oklch(1 0 0));
		--dapp-kit-foreground: var(--foreground, oklch(0.145 0 0));
		--dapp-kit-primary: var(--primary, oklch(0.216 0.006 56.043));
		--dapp-kit-primary-foreground: var(--primary-foreground, oklch(0.985 0.001 106.423));
		--dapp-kit-secondary: var(--secondary, oklch(0.97 0.001 106.424));
		--dapp-kit-secondary-foreground: var(--secondary-foreground, oklch(0.216 0.006 56.043));
		--dapp-kit-border: var(--border, oklch(0.922 0 0));
		--dapp-kit-accent: var(--accent, oklch(0.97 0.001 106.424));
		--dapp-kit-accent-foreground: var(--accent-foreground, oklch(0.205 0 0));
		--dapp-kit-muted: var(--muted, oklch(0.97 0.001 106.424));
		--dapp-kit-muted-foreground: var(--muted-foreground, oklch(0.553 0.013 58.071));
		--dapp-kit-popover: var(--popover, oklch(1 0 0));
		--dapp-kit-popover-foreground: var(--popover-foreground, oklch(0.145 0 0));
		--dapp-kit-destructive: var(--destructive, oklch(0.577 0.245 27.325));
		--dapp-kit-positive: var(--positive, oklch(0.862 0.127 146.2));
		--dapp-kit-ring: var(--ring, oklch(0.708 0 0));
		--dapp-kit-input: var(--input, oklch(0.922 0 0));

		/** Radii */
		--dapp-kit-radius: var(--radius, 12px);
		--dapp-kit-radius-xs: calc(var(--dapp-kit-radius) - 4px);
		--dapp-kit-radius-sm: calc(var(--dapp-kit-radius) - 4px);
		--dapp-kit-radius-md: calc(var(--dapp-kit-radius) - 2px);
		--dapp-kit-radius-lg: var(--dapp-kit-radius);
		--dapp-kit-radius-xl: calc(var(--dapp-kit-radius) + 4px);

		/** Typography */
		--dapp-kit-font-sans: var(
			--font-sans,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			'Noto Sans',
			sans-serif,
			'Apple Color Emoji',
			'Segoe UI Emoji',
			'Segoe UI Symbol',
			'Noto Color Emoji'
		);
		--dapp-kit-font-weight-medium: var(--font-medium, 500);
		--dapp-kit-font-weight-semibold: var(--font-semibold, 600);
	}
`,eT],eU=[ej,w`
		.wallet-button {
			transition-property: background-color;
			transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
			transition-duration: 0.15s;
			text-decoration: none;
			background-color: var(--dapp-kit-secondary);
			border-radius: var(--dapp-kit-radius-lg);
			display: flex;
			align-items: center;
			gap: 12px;
			width: 100%;
			padding: 12px;
		}

		.wallet-button:hover {
			background-color: oklab(from var(--dapp-kit-secondary) calc(l - 0.01) a b);
		}

		img {
			width: 32px;
			height: 32px;
			border-radius: var(--dapp-kit-radius-lg);
		}

		p {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			font-weight: var(--dapp-kit-font-weight-medium);
		}
	`];function eH(t,e,i,n){var o,r=arguments.length,s=r<3?e:null===n?n=Object.getOwnPropertyDescriptor(e,i):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,i,n);else for(var l=t.length-1;l>=0;l--)(o=t[l])&&(s=(r<3?o(s):r>3?o(e,i,s):o(e,i))||s);return r>3&&s&&Object.defineProperty(e,i,s),s}var eN=class extends tx{constructor(...t){super(...t),this.autofocus=!1}static{this.styles=eU}render(){return tr`
			<li>
				<button
					type="button"
					class="wallet-button"
					@click=${this.#t}
					?autofocus=${this.autofocus}
				>
					<img src=${this.wallet.icon} alt=${`${this.wallet.name} logo`} />
					<p>${this.wallet.name}</p>
				</button>
			</li>
		`}#t(){this.dispatchEvent(new CustomEvent("wallet-selected",{detail:{wallet:this.wallet},bubbles:!0,composed:!0}))}};eH([t_()],eN.prototype,"wallet",void 0),eH([t_({type:Boolean,reflect:!0})],eN.prototype,"autofocus",void 0);let eD=[ej,w`
		:host {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
		}

		ul {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.no-wallets-container {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
		}

		.no-wallets-content {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			flex-grow: 1;
			gap: 32px;
		}

		.title {
			font-weight: var(--dapp-kit-font-weight-semibold);
			text-align: center;
			font-size: 28px;
		}

		.wallet-cta {
			display: flex;
			flex-direction: column;
			width: 100%;
		}
	`],eF=[ej,w`
		.button {
			transition-property: background-color;
			transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
			transition-duration: 0.15s;
			border-radius: var(--dapp-kit-radius-md);
			font-weight: var(--dapp-kit-font-weight-semibold);
			text-decoration: none;
			outline-style: none;
			display: inline-flex;
			justify-content: center;
			align-items: center;
			gap: 12px;
			padding-left: 16px;
			padding-right: 16px;
			padding-top: 8px;
			padding-bottom: 8px;
			height: 40px;
		}

		.button:focus-visible {
			border-color: var(--dapp-kit-ring);
			box-shadow:
				0 0 0 3px color-mix(in oklab, var(--dapp-kit-ring) 50%, transparent),
				rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
		}

		.button.primary {
			background-color: var(--dapp-kit-primary);
			color: var(--dapp-kit-primary-foreground);
		}

		.button.primary:hover:not(:disabled) {
			background-color: color-mix(in oklab, var(--dapp-kit-primary) 90%, transparent);
		}

		.button.secondary {
			background-color: var(--dapp-kit-secondary);
			color: var(--dapp-kit-secondary-foreground);
		}

		.button.secondary:hover:not(:disabled) {
			background-color: color-mix(in oklab, var(--dapp-kit-secondary) 80%, transparent);
		}
	`];var eI=class extends tx{constructor(...t){super(...t),this.variant="primary",this.href="",this.disabled=!1}static{this.shadowRootOptions={...tx.shadowRootOptions,delegatesFocus:!0}}static{this.styles=eF}render(){return this.href?tr`
					<a
						part="trigger"
						href=${this.href}
						?disabled=${this.disabled}
						target="_blank"
						rel="noreferrer"
						class=${tP({button:!0,[this.variant]:!0})}
					>
						<slot part="button-content"></slot>
					</a>
				`:tr`
					<button
						part="trigger"
						type="button"
						?disabled=${this.disabled}
						class=${tP({button:!0,[this.variant]:!0})}
					>
						<slot part="button-content"></slot>
					</button>
				`}};eH([t_({type:String})],eI.prototype,"variant",void 0),eH([t_({type:String})],eI.prototype,"href",void 0),eH([t_({type:Boolean,reflect:!0})],eI.prototype,"disabled",void 0);let eW=tr`<svg
	width="80"
	height="80"
	viewBox="0 0 80 80"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M0 40C0 17.9086 17.9086 0 40 0C62.0914 0 80 17.9086 80 40C80 62.0914 62.0914 80 40 80C17.9086 80 0 62.0914 0 40Z"
		fill="currentColor"
		fill-opacity="0.08"
	/>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M39.6881 28.8311C39.4347 28.9111 39.1675 29.1669 39.0607 29.4318L39.0041 29.572L38.9977 35.5349L38.9914 41.4978L37.8217 40.3324C36.5477 39.063 36.5486 39.0637 36.228 39.0138C35.7909 38.9458 35.3452 39.1858 35.1541 39.592C35.0986 39.7101 35.0921 39.7532 35.0921 40C35.0921 40.4608 34.9004 40.2321 37.3099 42.6471C39.1553 44.4968 39.4299 44.763 39.5579 44.8263C39.8344 44.9632 40.1614 44.9624 40.4441 44.8244C40.5705 44.7626 40.843 44.4987 42.679 42.659C45.0881 40.2451 44.9081 40.4599 44.9081 40C44.9081 39.7458 44.9027 39.7132 44.8403 39.586C44.6384 39.1748 44.2051 38.9438 43.7678 39.0142C43.4501 39.0654 43.4497 39.0657 42.1784 40.3324L41.0087 41.4978L41.0024 35.5349L40.9961 29.572L40.9395 29.4318C40.8294 29.1587 40.5615 28.9075 40.2964 28.8288C40.1444 28.7836 39.8347 28.7848 39.6881 28.8311ZM31.114 46.0981C30.9593 46.1346 30.7812 46.2398 30.647 46.374C30.4216 46.5994 30.3357 46.8708 30.3627 47.272C30.3949 47.7507 30.4603 48.0732 30.6081 48.484C31.0707 49.7693 32.1522 50.7474 33.4841 51.0852C33.9919 51.2141 33.6619 51.2078 39.9943 51.2079C46.331 51.208 46.0036 51.2142 46.5161 51.085C47.8428 50.7503 48.9303 49.7668 49.392 48.484C49.5851 47.9478 49.6896 47.2429 49.6266 46.9026C49.5428 46.4495 49.1756 46.1129 48.7285 46.0791C48.3302 46.0489 47.9715 46.2363 47.7705 46.5793C47.687 46.7218 47.6625 46.8267 47.6335 47.1663C47.5846 47.7384 47.4064 48.16 47.0574 48.5289C46.6981 48.9088 46.2476 49.1338 45.7272 49.1934C45.5791 49.2103 43.6721 49.2161 39.8441 49.2112L34.1801 49.204L33.9966 49.1516C33.5867 49.0347 33.3159 48.8845 33.0317 48.6166C32.6281 48.2363 32.4192 47.7806 32.3667 47.1663C32.3377 46.8267 32.3132 46.7218 32.2297 46.5793C32.1479 46.4397 31.9572 46.2518 31.8327 46.1882C31.6225 46.0807 31.3388 46.0451 31.114 46.0981Z"
		fill="currentColor"
	/>
</svg>`,eB=tr`<svg
	width="17"
	height="16"
	viewBox="0 0 17 16"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M4.19888 1.05645C4.0026 1.08501 3.7911 1.24624 3.706 1.43215C3.62348 1.61237 3.62622 1.84103 3.71297 2.01403C3.79982 2.18722 3.99089 2.3325 4.17827 2.36781C4.23528 2.37855 5.77091 2.38405 8.71417 2.38405H13.1639L7.41745 8.13205C2.23561 13.3153 1.66614 13.8898 1.62155 13.9796C1.48908 14.2462 1.5436 14.5657 1.75579 14.7664C1.95884 14.9584 2.23582 15.003 2.50305 14.8868C2.59953 14.8449 2.8643 14.5828 8.36009 9.0896L14.1161 3.33629V7.78598C14.1161 10.7292 14.1216 12.2649 14.1323 12.3219C14.1819 12.5852 14.4093 12.8046 14.6761 12.8467C15.0449 12.9048 15.3918 12.6521 15.4446 12.2868C15.4668 12.1329 15.465 1.71239 15.4427 1.59173C15.3934 1.32528 15.1749 1.10672 14.9084 1.05746C14.7978 1.03703 4.33916 1.03603 4.19888 1.05645Z"
		fill="currentColor"
	/>
</svg> `;var eV=class extends tL(tx){constructor(...t){super(...t),this.wallets=[]}static{this.elementDefinitions={"wallet-list-item":eN,"internal-button":eI}}static{this.styles=eD}render(){return 0===this.wallets.length?tr`<div class="no-wallets-container">
					<div class="no-wallets-content">
						${eW}
						<h2 class="title">Install a wallet to get started on Sui</h2>
					</div>
					<internal-button class="wallet-cta" href="https://sui.io/get-started">
						Select a wallet to install ${eB}
					</internal-button>
				</div>`:tr`<ul class="wallet-list">
					${this.wallets.map((t,e)=>tr`<wallet-list-item
								.wallet=${t}
								?autofocus=${0===e}
							></wallet-list-item>`)}
				</ul>`}};eH([t_({type:Object})],eV.prototype,"wallets",void 0);var ez=class extends tx{#e=!1;#i=!1;#n=(0,h.promiseWithResolvers)();#o;#r=!1;static{this.shadowRootOptions={...tx.shadowRootOptions,delegatesFocus:!0}}get open(){return this.#e}set open(t){t!==this.#e&&(this.#e=t,this.#e?(this.setAttribute("open",""),this.show()):(this.removeAttribute("open"),this.close()))}async show(){if(this.#i=!0,await this.#n.promise,await this.updateComplete,this._dialog.open||!this.#i){this.#i=!1;return}if(!this.dispatchEvent(new Event("open",{cancelable:!0}))){this.open=!1,this.#i=!1;return}this._dialog.showModal(),this.open=!0,this.dispatchEvent(new Event("opened")),this.#i=!1}async close(t=this.#o){if(this.#i=!1,!this.isConnected||(await this.updateComplete,!this._dialog.open||this.#i)){this.open=!1;return}let e=this.#o;if(this.#o=t,!this.dispatchEvent(new Event("close",{cancelable:!0}))){this.#o=e;return}this._dialog.close(this.#o),this.open=!1,this.dispatchEvent(new Event("closed"))}connectedCallback(){super.connectedCallback(),this.#n.resolve()}disconnectedCallback(){super.disconnectedCallback(),this.#n=Promise.withResolvers()}handleContentClick(){this.#r=!0}handleDialogClick(){if(this.#r){this.#r=!1;return}this.dispatchEvent(new Event("cancel",{cancelable:!0}))&&this.close()}};eH([t_({type:Boolean})],ez.prototype,"open",null),eH([tO("dialog")],ez.prototype,"_dialog",void 0);let eq=tr`<svg
	width="16"
	height="16"
	viewBox="0 0 16 16"
	fill="currentColor"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M2.04841 1.59812C2.00001 1.61375 1.93695 1.63878 1.90828 1.65375C1.83709 1.69091 1.68775 1.84287 1.65047 1.91606C1.54047 2.13201 1.54381 2.37028 1.6597 2.57601C1.68564 2.62206 2.66404 3.61254 4.37417 5.32401L7.04809 8.00001L4.37417 10.676C2.67052 12.381 1.68551 13.3781 1.65959 13.424C1.49234 13.7201 1.56607 14.0843 1.83583 14.2945C2.04141 14.4547 2.34161 14.4734 2.57641 14.3408C2.62228 14.3149 3.61943 13.3299 5.32441 11.6262L8.00041 8.95233L10.6764 11.6262C12.3814 13.3299 13.3785 14.3149 13.4244 14.3408C13.6592 14.4734 13.9594 14.4547 14.165 14.2945C14.4347 14.0843 14.5085 13.7201 14.3412 13.424C14.3153 13.3781 13.3303 12.381 11.6266 10.676L8.95273 8.00001L11.6266 5.32401C13.3303 3.61903 14.3153 2.62188 14.3412 2.57601C14.4738 2.34121 14.4551 2.04102 14.2949 1.83543C14.0847 1.56567 13.7205 1.49195 13.4244 1.65919C13.3785 1.68511 12.3814 2.67012 10.6764 4.37377L8.00041 7.04769L5.32441 4.37377C3.61293 2.66364 2.62245 1.68524 2.57641 1.65931C2.41372 1.56766 2.21439 1.54457 2.04841 1.59812Z"
	/>
</svg> `,eZ=tr`<svg
	width="15"
	height="16"
	viewBox="0 0 15 16"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M6.90786 1.05824C6.70479 1.08877 6.91965 0.871204 3.62561 4.38197C0.943351 7.24072 0.593731 7.6189 0.554431 7.70397C0.501166 7.81932 0.480376 7.96424 0.497641 8.09997C0.525721 8.32084 0.315931 8.08477 3.59808 11.5887C5.25324 13.3557 6.6377 14.8229 6.67466 14.8493C6.76715 14.9153 6.88374 14.9481 7.01883 14.9464C7.19993 14.9441 7.32822 14.8862 7.45368 14.7503C7.6404 14.5479 7.68581 14.2362 7.56597 13.9793C7.53443 13.9117 7.06523 13.403 5.08008 11.2841L2.63307 8.67231L8.31776 8.66796C13.6185 8.66392 14.0073 8.6618 14.0739 8.63648C14.173 8.59888 14.3009 8.50512 14.3625 8.425C14.5276 8.21008 14.553 7.89213 14.4239 7.65714C14.3438 7.51138 14.1733 7.38224 14.013 7.34596C13.9549 7.33282 12.4096 7.32797 8.28312 7.32797H2.63276L5.07993 4.71597C7.0652 2.59698 7.53443 2.08824 7.56597 2.02063C7.68584 1.76365 7.6404 1.452 7.45358 1.24956C7.30854 1.09239 7.1201 1.02632 6.90786 1.05824Z"
		fill="currentColor"
	/>
</svg> `,eK=[ej,w`
		:host {
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
			flex-grow: 1;
			gap: 40px;
		}

		.logo {
			width: 120px;
			height: 120px;
			border-radius: var(--dapp-kit-radius-lg);
		}

		.container {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			gap: 12px;
		}

		.title {
			font-size: 24px;
			font-weight: var(--dapp-kit-font-weight-medium);
		}

		.copy {
			color: var(--dapp-kit-muted-foreground);
		}

		::slotted(*) {
			display: flex;
			flex-direction: column;
			width: 100%;
		}
	`];var eJ=class extends tx{constructor(...t){super(...t),this.title="",this.copy=""}static{this.styles=eK}render(){return tr`
			<img class="logo" src=${this.wallet.icon} alt=${`${this.wallet.name} logo`} />
			<div class="container">
				<h3 class="title">${this.title}</h3>
				<p class="copy">${this.copy}</p>
			</div>
			<slot name="call-to-action"></slot>
		`}};eH([t_({type:Object})],eJ.prototype,"wallet",void 0),eH([t_({type:String})],eJ.prototype,"title",void 0),eH([t_({type:String})],eJ.prototype,"copy",void 0);let eY=[ej,w`
		dialog {
			width: 360px;
			height: 480px;
			border: 1px solid var(--dapp-kit-border);
			padding: 0;
			background: var(--dapp-kit-background);
			border-radius: var(--dapp-kit-radius-lg);
		}

		.content {
			display: flex;
			flex-direction: column;
			height: 100%;
			gap: 32px;
			padding: 24px;
		}

		.connect-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 8px;
		}

		.title {
			font-size: 18px;
			font-weight: var(--dapp-kit-font-weight-semibold);
			white-space: nowrap;
		}

		.close-button {
			margin-left: auto;
		}

		.cancel-button {
			margin-top: auto;
		}
	`],eG=w`
	.icon-button {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: inherit;
		color: var(--dapp-kit-foreground);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 200ms,
			transform 100ms;
	}

	.icon-button:hover {
		background-color: var(--dapp-kit-accent);
	}

	.icon-button:active {
		transform: scale(0.9);
	}
`,eQ=class extends tL(ez){constructor(...t){super(...t),this._state={view:"wallet-selection"}}static{this.styles=[eY,eG]}static{this.elementDefinitions={"wallet-list":eV,"internal-button":eI,"connection-status":eJ}}#s;render(){let t="connecting"===this._state.view||"error"===this._state.view,e=this.#l();return tr`<dialog @click=${this.handleDialogClick} @close=${this.#a}>
			<div class="content" @click=${this.handleContentClick}>
				<div class="connect-header">
					${t?tr`<button
								class="icon-button back-button"
								aria-label="Go back"
								@click=${this.#a}
							>
								${eZ}
							</button>`:tl}
					<h2 class="title">${e.length>0?"Connect a wallet":"No wallets installed"}</h2>
					<button
						class="icon-button close-button"
						aria-label="Close"
						@click=${()=>{this.close("cancel")}}
					>
						${eq}
					</button>
				</div>
				${this.#c(e)}
			</div>
		</dialog>`}#c(t){switch(this._state.view){case"wallet-selection":return tr`<wallet-list
					.wallets=${t}
					@wallet-selected=${async t=>{this.#d(t.detail.wallet)}}
				></wallet-list>`;case"connecting":return tr`<connection-status
					.title=${"Awaiting connection..."}
					.copy=${`Accept the request from ${this._state.wallet.name} in order to proceed`}
					.wallet=${this._state.wallet}
				>
					<internal-button
						slot="call-to-action"
						.variant=${"secondary"}
						@click=${this.#a}
					>
						Cancel
					</internal-button>
				</connection-status>`;case"error":let{wallet:e,error:i}=this._state,n=(0,u.isWalletStandardError)(i,d.WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED);return tr`<connection-status
					.title=${n?"Request canceled":"Connection failed"}
					.copy=${n?"You canceled the request":"Something went wrong. Please try again"}
					.wallet=${e}
				>
					<internal-button
						slot="call-to-action"
						@click=${()=>{this.#d(e)}}
					>
						Retry
					</internal-button>
				</connection-status>`;default:throw Error(`Encountered unknown view state: ${this._state}`)}}async #d(t){let e;try{let i=new Promise((t,e)=>{this.#s=new AbortController,this.#s.signal.addEventListener("abort",()=>e(new DOMException("Aborted","AbortError")),{once:!0})});e=setTimeout(()=>{this._state={view:"connecting",wallet:t}},100),await Promise.race([i,this.instance.connectWallet({wallet:t})]),this.close("successful-connection")}catch(e){e instanceof Error&&"AbortError"===e.name?this._state={view:"wallet-selection"}:this._state={view:"error",wallet:t,error:e}}finally{clearTimeout(e)}}#a(){"connecting"===this._state.view?this.#s?.abort("cancelled"):this._state={view:"wallet-selection"}}#l(){let t=this.instance.stores.$wallets.get(),e=this.filterFn?t.filter(this.filterFn):t;return this.sortFn?e.toSorted(this.sortFn):e}};eH([eP()],eQ.prototype,"instance",void 0),eH([tA()],eQ.prototype,"_state",void 0),eH([t_({attribute:!1})],eQ.prototype,"filterFn",void 0),eH([t_({attribute:!1})],eQ.prototype,"sortFn",void 0),eQ=eH([tE("mysten-dapp-kit-connect-modal")],eQ);let eX=tr`<svg
	width="17"
	height="16"
	viewBox="0 0 17 16"
	fill="currentColor"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M11.22 0.538749C10.6265 0.598285 10.1912 0.722509 9.66001 0.983949C9.37775 1.12286 9.12319 1.28297 8.87601 1.47704C8.69228 1.62129 6.93319 3.37158 6.85697 3.48597C6.78033 3.60101 6.75383 3.69451 6.75437 3.84801C6.75508 4.04564 6.81122 4.18171 6.94887 4.31936C7.14239 4.51288 7.43207 4.56667 7.68401 4.45585C7.78109 4.41317 7.84866 4.34988 8.70001 3.50432C9.20161 3.00612 9.65881 2.56196 9.71601 2.51731C10.0519 2.25499 10.4706 2.05141 10.892 1.94537C11.2092 1.86557 11.7213 1.84326 12.0514 1.89489C12.9243 2.03139 13.651 2.49584 14.1437 3.23201C14.3077 3.47704 14.4669 3.8423 14.5477 4.15877C14.6587 4.59373 14.6616 5.18297 14.5546 5.60801C14.4471 6.03561 14.2443 6.45003 13.9762 6.79022C13.9268 6.85281 13.489 7.30361 13.0031 7.79201C12.5173 8.28041 12.1015 8.7095 12.0793 8.74557C12.0217 8.83864 11.988 8.96494 11.9882 9.08693C11.9885 9.27032 12.0513 9.42179 12.1808 9.55125C12.3159 9.68635 12.4532 9.74419 12.644 9.74638C12.7905 9.74808 12.9047 9.71592 13.016 9.64171C13.1301 9.56558 14.864 7.82219 15.0147 7.63201C15.502 7.01705 15.8117 6.30936 15.9321 5.53601C15.9672 5.31038 15.9813 4.73297 15.9576 4.48801C15.9054 3.94678 15.7771 3.48822 15.5414 3.00001C15.3126 2.52614 15.0685 2.18312 14.6927 1.80733C13.9789 1.09355 13.1035 0.668781 12.1059 0.552077C11.9206 0.530397 11.3837 0.522333 11.22 0.538749ZM5.2445 1.05827C5.0433 1.08664 4.84421 1.23966 4.75012 1.43825L4.70001 1.54401L4.69549 2.46219C4.69154 3.26985 4.69412 3.39117 4.71692 3.47019C4.76266 3.62872 4.85655 3.75208 5.00476 3.84838C5.20802 3.98045 5.48217 3.98582 5.69402 3.8619C5.77233 3.81611 5.90889 3.67566 5.94727 3.60145C6.01841 3.46387 6.01965 3.44486 6.01983 2.49262C6.02001 1.61425 6.01895 1.58238 5.98692 1.49678C5.87002 1.18435 5.57716 1.01137 5.2445 1.05827ZM2.59673 1.58549C2.4178 1.62057 2.22357 1.77176 2.14122 1.94009C2.08143 2.06232 2.05881 2.21302 2.08055 2.34425C2.11277 2.53877 2.15631 2.60016 2.52401 2.96969C2.81721 3.26435 2.87423 3.31429 2.97162 3.36169C3.07791 3.41342 3.09167 3.41601 3.25962 3.41601C3.4238 3.41601 3.44327 3.41257 3.541 3.36627C3.67756 3.30155 3.80154 3.17757 3.86626 3.04101C3.91257 2.94328 3.91601 2.9238 3.91601 2.75963C3.91601 2.59168 3.91341 2.57792 3.86169 2.47163C3.81428 2.37424 3.76434 2.31721 3.46969 2.02401C3.10991 1.66603 3.04322 1.61725 2.86836 1.58408C2.77031 1.56549 2.69684 1.56587 2.59673 1.58549ZM2.02801 4.21445C1.85482 4.26936 1.69453 4.40416 1.61634 4.56062C1.53162 4.73012 1.5306 4.97821 1.61388 5.14899C1.67375 5.27179 1.8045 5.39857 1.93497 5.46037L2.04401 5.51201L2.96401 5.51667C3.92485 5.52155 3.95385 5.51987 4.09084 5.45173C4.17271 5.41101 4.31301 5.27763 4.36189 5.19403C4.57817 4.82427 4.38473 4.33845 3.97309 4.21753C3.89789 4.19545 3.76553 4.19216 2.98909 4.19309C2.31132 4.19389 2.07636 4.19912 2.02801 4.21445ZM10.4794 5.24865C10.4373 5.25573 10.3545 5.28401 10.2954 5.3115C10.1935 5.35891 10.0767 5.47275 8.02474 7.52475C5.98373 9.56576 5.85868 9.694 5.81218 9.794C5.68556 10.0662 5.73263 10.3648 5.93393 10.5661C6.13521 10.7674 6.4338 10.8145 6.70602 10.6878C6.80602 10.6413 6.93426 10.5163 8.97527 8.47528C11.0163 6.43427 11.1413 6.30603 11.1878 6.20603C11.2829 6.00173 11.2838 5.80633 11.1907 5.61C11.1022 5.42347 10.9104 5.28238 10.6982 5.24763C10.5933 5.23045 10.5875 5.23048 10.4794 5.24865ZM4.25201 6.25709C4.13005 6.27627 4.07709 6.29624 3.98469 6.35787C3.87025 6.43421 2.13679 8.17691 1.98524 8.36801C1.7866 8.61848 1.62597 8.87236 1.48417 9.16001C1.25775 9.61931 1.14644 9.96928 1.0669 10.472C1.03255 10.6891 1.01855 11.2894 1.04242 11.5218C1.13201 12.3938 1.44233 13.1559 1.99106 13.8515C2.11753 14.0118 2.48823 14.3825 2.64853 14.509C3.34417 15.0577 4.10626 15.368 4.9782 15.4576C5.21338 15.4818 5.80996 15.4674 6.03601 15.4322C6.811 15.3113 7.51625 15.0026 8.13201 14.5147C8.32218 14.364 10.0656 12.6301 10.1417 12.516C10.2159 12.4047 10.2481 12.2905 10.2464 12.144C10.2442 11.9532 10.1863 11.8159 10.0512 11.6808C9.92178 11.5513 9.77031 11.4885 9.58692 11.4882C9.46493 11.488 9.33863 11.5217 9.24556 11.5793C9.20949 11.6015 8.78041 12.0173 8.29201 12.5031C7.80361 12.989 7.35281 13.4268 7.29021 13.4762C6.95002 13.7443 6.53561 13.9471 6.10801 14.0547C5.68297 14.1616 5.09372 14.1587 4.65876 14.0477C4.1114 13.9079 3.64604 13.6439 3.25109 13.2489C2.7846 12.7824 2.49877 12.2158 2.39489 11.5514C2.35978 11.3269 2.35981 10.8808 2.39497 10.656C2.47809 10.1242 2.69338 9.62913 3.02385 9.20981C3.07317 9.14721 3.51778 8.68921 4.01186 8.19201C4.85073 7.34785 4.91322 7.28113 4.95589 7.18401C5.06609 6.93325 5.01277 6.6423 4.82162 6.45115C4.66466 6.29419 4.45981 6.2244 4.25201 6.25709ZM13.548 10.5024C13.3666 10.56 13.2147 10.6922 13.1337 10.863C13.0874 10.9607 13.084 10.9802 13.084 11.1444C13.084 11.3106 13.0869 11.3268 13.1354 11.4252C13.2206 11.5981 13.3733 11.7304 13.5493 11.7838C13.6613 11.8178 14.8548 11.819 14.9659 11.7852C15.1861 11.7184 15.3611 11.5473 15.4232 11.3381C15.455 11.2312 15.4542 11.0513 15.4215 10.9388C15.3698 10.7611 15.1977 10.5858 15.0032 10.5131C14.919 10.4816 14.8842 10.4801 14.2634 10.4811C13.7842 10.4819 13.5951 10.4875 13.548 10.5024ZM11.4431 12.5983C11.2533 12.6712 11.1165 12.7929 11.0377 12.959L10.988 13.064L10.9834 13.7377C10.9789 14.3897 10.9798 14.4143 11.0124 14.5015C11.0858 14.6977 11.2604 14.8696 11.4388 14.9215C11.8061 15.0283 12.1748 14.8298 12.2852 14.4659C12.319 14.3548 12.3177 13.1613 12.2838 13.0494C12.2305 12.8735 12.0981 12.7206 11.9257 12.6357C11.8326 12.5899 11.8052 12.5842 11.6609 12.5806C11.5544 12.5779 11.4808 12.5839 11.4431 12.5983ZM13.5391 12.5983C13.3493 12.6712 13.2125 12.7929 13.1337 12.959C13.0874 13.0567 13.084 13.0762 13.084 13.2404C13.084 13.4083 13.0866 13.4221 13.1383 13.5284C13.1857 13.6258 13.2357 13.6828 13.5303 13.976C13.9023 14.3462 13.9559 14.3839 14.1582 14.4172C14.3748 14.453 14.5719 14.3886 14.7303 14.2303C14.8886 14.0719 14.953 13.8748 14.9172 13.6582C14.8838 13.4559 14.8462 13.4023 14.476 13.0303C14.1833 12.7362 14.1257 12.6857 14.0289 12.6386C13.9283 12.5896 13.9028 12.5842 13.7569 12.5806C13.6504 12.5779 13.5768 12.5839 13.5391 12.5983Z"
	/>
</svg>`,e1=[ej,eG,w`
		:host {
			display: block;
			width: fit-content;
		}

		.menu {
			display: none;
		}

		[aria-expanded='true'] + .menu {
			display: flex;
			flex-direction: column;
			max-width: fit-content;
			min-width: 396px;
			gap: 16px;
			padding: 16px;
			position: absolute;
			outline: none;
			background-color: var(--dapp-kit-popover);
			color: var(--dapp-kit-popover-foreground);
			border-radius: var(--dapp-kit-radius-lg);
			border: 1px solid var(--dapp-kit-border);
			box-shadow:
				0 4px 6px -1px rgba(0, 0, 0, 0.1),
				0 2px 4px -2px rgba(0, 0, 0, 0.1);
		}

		.header-container {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		.header-title {
			font-size: 18px;
			font-weight: var(--dapp-kit-font-weight-semibold);
			letter-spacing: -0.18px;
		}

		img {
			width: 24px;
			height: 24px;
			border-radius: 96px;
		}

		[aria-expanded='true'] .chevron {
			transition: transform 0.3s ease;
			transform: rotate(180deg);
		}

		.chevron {
			display: flex;
		}

		.chevron svg {
			width: 12px;
			height: 12px;
		}

		.trigger-content {
			display: flex;
			align-items: center;
			font-weight: var(--dapp-kit-font-weight-semibold);
			gap: 12px;
		}

		.accounts-list {
			display: flex;
			flex-direction: column;
			gap: 12px;
			max-height: 240px;
			overflow-y: auto;
		}

		.disconnect-button {
			background-color: rgba(0, 0, 0, 0.8);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			background-color: var(--dapp-kit-secondary);
			color: var(--dapp-kit-destructive);
			border-radius: var(--dapp-kit-radius-md);
			font-weight: var(--dapp-kit-font-weight-medium);
			height: 48px;
			padding: 16px;
			gap: 8px;
		}

		.disconnect-button:hover {
			background-color: color-mix(in oklab, var(--dapp-kit-secondary) 80%, transparent);
		}

		.container {
			padding-top: 12px;
			padding-bottom: 12px;
			padding-left: 16px;
			padding-right: 16px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			width: 100%;
			border-radius: var(--dapp-kit-radius-sm);
		}

		.container[data-checked='true'] {
			background-color: var(--dapp-kit-accent);
		}

		.account-title {
			font-weight: var(--dapp-kit-font-weight-semibold);
		}

		.account-subtitle {
			color: var(--dapp-kit-muted-foreground);
			font-weight: var(--dapp-kit-font-weight-medium);
			font-size: 14px;
		}

		.account-info {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.content {
			display: flex;
			flex-grow: 1;
			gap: 12px;
		}

		.copy-address-button {
			display: inline-flex;
		}

		.copy-address-button svg {
			width: 16px;
			height: 16px;
		}

		.radio-indicator {
			width: 20px;
			height: 20px;
			border-radius: 100%;
			background-color: var(--dapp-kit-input);
			border: 1px solid var(--dapp-kit-border);
			display: inline-flex;
			justify-content: center;
			align-items: center;
		}

		.content:focus-visible .radio-indicator {
			border-color: var(--dapp-kit-ring);
			box-shadow: 0 0 0 3px var(--dapp-kit-ring) / 0.5;
			outline: none;
		}

		[data-checked='true'] .radio-indicator {
			color: var(--dapp-kit-positive);
			border-color: var(--dapp-kit-positive);
		}

		.radio-input {
			appearance: none;
			-webkit-appearance: none;
			width: 20px;
			height: 20px;
			margin: 0;
			border-radius: 50%;
			background-color: var(--dapp-kit-input);
			border: 1px solid var(--dapp-kit-input);
			cursor: pointer;
			position: relative;
			outline: none;
			transition: box-shadow 0.2s;
		}

		.radio-input::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: 8px;
			height: 8px;
			background-color: var(--dapp-kit-positive);
			border-radius: 100%;
			transform: translate(-50%, -50%) scale(0);
			transition: transform 0.2s ease;
		}

		.radio-input:checked {
			background-color: transparent;
			border-color: var(--dapp-kit-positive);
		}

		.radio-input:checked::before {
			transform: translate(-50%, -50%) scale(1);
		}

		.radio-input:focus-visible {
			border-color: var(--dapp-kit-ring);
			box-shadow: 0 0 0 3px var(--dapp-kit-ring);
		}
	`],e0=tr`<svg
	width="16"
	height="16"
	viewBox="0 0 16 16"
	fill="currentColor"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M2.57602 1.05841C1.96473 1.12213 1.42869 1.52667 1.18005 2.11198C1.1061 2.28603 1.0777 2.39982 1.05682 2.60568C1.03369 2.83379 1.03361 9.476 1.05673 9.71992C1.12471 10.4367 1.60071 11.0082 2.31202 11.227L2.45602 11.2713L3.58402 11.2796L4.71202 11.288L4.72098 12.416C4.7307 13.6405 4.7262 13.5765 4.82061 13.8331C4.95698 14.2037 5.26674 14.5566 5.62014 14.7439C5.85567 14.8688 6.02999 14.9204 6.29721 14.9443C6.5825 14.9699 13.4137 14.9564 13.544 14.9301C14.2457 14.7881 14.7885 14.2454 14.9301 13.544C14.9564 13.4135 14.9699 6.582 14.9444 6.29717C14.9204 6.02992 14.8688 5.8556 14.744 5.62009C14.5566 5.2667 14.2038 4.95694 13.8332 4.82057C13.5766 4.72616 13.6405 4.73065 12.416 4.72094L11.288 4.71198L11.2797 3.58398L11.2713 2.45598L11.227 2.31198C11.1329 2.00597 10.9791 1.74963 10.7655 1.54273C10.4634 1.25013 10.1311 1.09568 9.71996 1.05669C9.50114 1.03595 2.77607 1.03757 2.57602 1.05841ZM2.64002 2.40489C2.56149 2.42965 2.42756 2.56833 2.40348 2.64984C2.38845 2.70067 2.3841 3.50549 2.38437 6.17784C2.38473 9.62633 2.38485 9.64027 2.41732 9.71198C2.45749 9.80075 2.51625 9.86424 2.60002 9.90945C2.66343 9.94366 2.67351 9.94403 3.69159 9.94843L4.71916 9.95288L4.72359 8.03643L4.72802 6.11998L4.77265 5.97758C4.96105 5.37641 5.37855 4.9584 5.97602 4.77273L6.12002 4.72798L8.03647 4.72355L9.95292 4.71912L9.94847 3.69155C9.94407 2.67347 9.9437 2.66339 9.9095 2.59998C9.86428 2.51621 9.80079 2.45745 9.71202 2.41728C9.64026 2.3848 9.62818 2.38469 6.16802 2.38597C3.68466 2.38688 2.68007 2.39227 2.64002 2.40489ZM6.33593 6.06286C6.22594 6.09651 6.14185 6.16683 6.08585 6.27198C6.05701 6.32613 6.05602 6.44379 6.05602 9.83198V13.336L6.09108 13.4015C6.1358 13.4851 6.21761 13.5568 6.30634 13.5904C6.37039 13.6146 6.65799 13.6164 9.86402 13.6124C13.1284 13.6083 13.3553 13.6062 13.4023 13.5804C13.4667 13.5452 13.5453 13.4666 13.5805 13.4023C13.6063 13.3552 13.6083 13.1283 13.6124 9.86398C13.6164 6.65795 13.6146 6.37035 13.5904 6.3063C13.5569 6.21757 13.4851 6.13576 13.4015 6.09104L13.336 6.05598L9.85602 6.05328C7.94202 6.05181 6.35798 6.05611 6.33593 6.06286Z"
	/>
</svg> `,e4=new Map;async function e3(t,e){if(e4.has(e))return e4.get(e);try{let i=(await t.core.defaultNameServiceName?.({address:e}))?.data.name;return e4.set(e,i?(0,g.normalizeSuiNSName)(i,"at"):null),i}catch{return e4.set(e,null),null}}let e2=tr`<svg
	xmlns="http://www.w3.org/2000/svg"
	width="24"
	height="24"
	viewBox="0 0 24 24"
	fill="none"
	stroke="var(--dapp-kit-positive)"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<circle cx="12" cy="12" r="10" />
	<path d="m9 12 2 2 4-4" />
</svg> `;var e6=class extends tx{constructor(...t){super(...t),this.selected=!1,this._wasCopySuccessful=!1}createRenderRoot(){return this}#u=new eL(this,{args:()=>[this.client,this.account.address],task:async([t,e])=>e3(t,e)});connectedCallback(){super.connectedCallback(),this.addEventListener("click",this.#h)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("click",this.#h)}render(){var t,e;return tr`
			<div class="container" data-checked=${this.selected}>
				<input
					type="radio"
					name="wallet-address"
					tabindex="${this.selected?"0":"-1"}"
					value=${this.account.address}
					?checked=${this.selected}
					@change=${this.#h}
					class="radio-input"
					id=${this.account.address}
				/>
				<label class="content" for=${this.account.address}>
					${t=this.account.icon,e=t=>tr`<img src=${t} alt="" />`,t?e(t):void 0}
					${this.#u.render({pending:this.#p,complete:this.#p,error:()=>this.#p()})}
				</label>
				<button
					class="copy-address-button"
					@click=${this.#f}
					aria-label="Copy address"
				>
					${this._wasCopySuccessful?e2:e0}
				</button>
			</div>
		`}async #f(t){t.stopPropagation();try{await navigator.clipboard.writeText(this.account.address),this._wasCopySuccessful=!0,setTimeout(()=>{this._wasCopySuccessful=!1},2e3)}catch{}}#p=t=>{var e;let{address:i,label:n}=this.account,o=f(i),r=t||n;return tr`<div class="account-info">
			<div class="account-title">${r||o}</div>
			${e=()=>tr`<div class="account-subtitle">${o}</div>`,r?e(r):void 0}
		</div>`};#h(){this.dispatchEvent(new CustomEvent("account-selected",{detail:{account:this.account},bubbles:!0,composed:!0}))}};eH([t_({type:Object})],e6.prototype,"account",void 0),eH([t_({type:Object})],e6.prototype,"client",void 0),eH([t_({type:Boolean})],e6.prototype,"selected",void 0),eH([tA()],e6.prototype,"_wasCopySuccessful",void 0);let e8=tr`<svg
	width="12"
	height="12"
	viewBox="0 0 12 12"
	fill="currentColor"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M0.749783 3.16083C0.616367 3.20313 0.499715 3.30493 0.439031 3.432C0.404351 3.50463 0.401783 3.5191 0.401783 3.642C0.401783 3.8842 0.122795 3.58063 2.91474 6.3763C4.25842 7.72175 5.39718 8.85432 5.44534 8.8931C5.61112 9.02664 5.77771 9.084 5.99978 9.084C6.22186 9.084 6.38845 9.02664 6.55423 8.8931C6.60239 8.85432 7.74115 7.72175 9.08483 6.3763C11.8768 3.58063 11.5978 3.8842 11.5978 3.642C11.5978 3.5191 11.5952 3.50463 11.5605 3.432C11.512 3.33045 11.4169 3.23542 11.3163 3.18797C11.2247 3.14475 11.0777 3.13074 10.9826 3.15618C10.8399 3.19439 10.9127 3.12454 8.39678 5.63854L5.99978 8.03374L3.60278 5.6387C1.98712 4.02436 1.18712 3.23308 1.14854 3.21119C1.11707 3.19332 1.06577 3.17095 1.03454 3.16149C0.965327 3.14049 0.815051 3.14014 0.749783 3.16083Z"
	/>
</svg>`,e5=tr`<svg
	width="16"
	height="16"
	viewBox="0 0 16 16"
	fill="currentColor"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M7.89082 1.05657C7.62439 1.0948 7.38895 1.33323 7.34347 1.61086C7.33421 1.66737 7.32818 2.80358 7.32813 4.49999L7.32803 7.296H4.4625C1.27722 7.296 1.51488 7.28764 1.34404 7.40553C1.22967 7.48444 1.11213 7.63921 1.07837 7.75534C1.04733 7.86214 1.04613 8.06073 1.07597 8.15199C1.1289 8.3138 1.2622 8.47769 1.39693 8.54657C1.55365 8.62668 1.43055 8.6236 4.47604 8.6238L7.32803 8.62399L7.32813 11.46C7.32818 13.2384 7.33408 14.3318 7.34392 14.392C7.38999 14.6737 7.62421 14.9044 7.90416 14.944C8.26109 14.9945 8.59807 14.7471 8.65615 14.392C8.66599 14.3318 8.67189 13.2384 8.67194 11.46L8.67203 8.62399L11.524 8.6238C14.5695 8.6236 14.4464 8.62668 14.6031 8.54657C14.7379 8.47769 14.8712 8.3138 14.9241 8.15199C14.9539 8.06073 14.9527 7.86214 14.9217 7.75534C14.8879 7.63921 14.7704 7.48444 14.656 7.40553C14.4852 7.28764 14.7229 7.296 11.5376 7.296H8.67203L8.67194 4.49999C8.67189 2.80358 8.66586 1.66737 8.65659 1.61086C8.6172 1.37032 8.44339 1.16228 8.21551 1.08292C8.12912 1.05284 7.99355 1.04184 7.89082 1.05657Z"
	/>
</svg>`;var e7=class extends tL(tx){constructor(...t){super(...t),this._open=!1}static{this.elementDefinitions={"internal-button":eI,"account-menu-item":e6}}static{this.styles=e1}#g;#u=new eL(this,{args:()=>[this.client,this.connection.account.address],task:async([t,e])=>e3(t,e)});connectedCallback(){super.connectedCallback(),document.addEventListener("click",this.#m)}disconnectedCallback(){super.disconnectedCallback(),this.#v(),document.removeEventListener("click",this.#m)}render(){var t,e;return tr`<internal-button
				exportparts="trigger"
				id="menu-button"
				aria-haspopup="true"
				aria-controls="menu"
				aria-expanded="${this._open}"
				@click=${this.#y}
			>
				<div class="trigger-content">
					<img src=${this.connection.account.icon??this.connection.wallet.icon} alt="" />
					${this.#u.render({pending:this.#b,complete:this.#b,error:()=>this.#b})}
					<div class="chevron">${e8}</div>
				</div>
			</internal-button>
			<div class="menu" id="menu" tabindex="-1" aria-labelledby="menu-button">
				<div class="header-container">
					<h2 class="header-title">Connected accounts</h2>
					${t=this.connection.wallet.name.startsWith(p.SLUSH_WALLET_NAME),e=()=>tr`<button
								class="icon-button"
								aria-label="Add more accounts"
								@click=${this.#C}
							>
								${e5}
							</button>`,t?e(t):void 0}
				</div>
				<div class="accounts-container" role="radiogroup">
					<ul class="accounts-list">
						${this.connection.wallet.accounts.map(t=>tr`
								<li>
									<account-menu-item
										.account=${t}
										.client=${this.client}
										.selected=${t.address===this.connection.account.address}
									></account-menu-item>
								</li>
							`)}
					</ul>
				</div>
				<button class="disconnect-button" @click=${this.#w}>
					${eX} Disconnect all
				</button>
			</div>`}#w(){this.dispatchEvent(new CustomEvent("disconnect-click",{bubbles:!0,composed:!0}))}#C(){this.dispatchEvent(new CustomEvent("manage-connection-click",{bubbles:!0,composed:!0}))}#b=t=>t||this.connection.account.label||f(this.connection.account.address);#m=t=>{this._open&&(t.composedPath().includes(this)||this.#x())};#y(){this._open?this.#x():this.#k()}async #k(){this._open=!0,await this.updateComplete,this._menu.focus(),this.#$()}#x(){this._open=!1,this.#v()}#$(){this.#g=function(t,e,i,n){let o;void 0===n&&(n={});let{ancestorScroll:r=!0,ancestorResize:s=!0,elementResize:l="function"==typeof ResizeObserver,layoutShift:a="function"==typeof IntersectionObserver,animationFrame:c=!1}=n,d=em(t),u=r||s?[...d?ep(d):[],...e?ep(e):[]]:[];u.forEach(t=>{r&&t.addEventListener("scroll",i,{passive:!0}),s&&t.addEventListener("resize",i)});let h=d&&a?function(t,e){let i,n=null,o=t5(t);function r(){var t;clearTimeout(i),null==(t=n)||t.disconnect(),n=null}return!function s(l,a){void 0===l&&(l=!1),void 0===a&&(a=1),r();let c=t.getBoundingClientRect(),{left:d,top:u,width:h,height:p}=c;if(l||e(),!h||!p)return;let f={rootMargin:-tH(u)+"px "+-tH(o.clientWidth-(d+h))+"px "+-tH(o.clientHeight-(u+p))+"px "+-tH(d)+"px",threshold:tj(0,tT(1,a))||1},g=!0;function m(e){let n=e[0].intersectionRatio;if(n!==a){if(!g)return s();n?s(!1,n):i=setTimeout(()=>{s(!1,1e-7)},1e3)}1!==n||eO(c,t.getBoundingClientRect())||s(),g=!1}try{n=new IntersectionObserver(m,{...f,root:o.ownerDocument})}catch(t){n=new IntersectionObserver(m,f)}n.observe(t)}(!0),r}(d,i):null,p=-1,f=null;l&&(f=new ResizeObserver(t=>{let[n]=t;n&&n.target===d&&f&&e&&(f.unobserve(e),cancelAnimationFrame(p),p=requestAnimationFrame(()=>{var t;null==(t=f)||t.observe(e)})),i()}),d&&!c&&f.observe(d),e&&f.observe(e));let g=c?eC(t):null;return c&&function e(){let n=eC(t);g&&!eO(g,n)&&i(),g=n,o=requestAnimationFrame(e)}(),i(),()=>{var t;u.forEach(t=>{r&&t.removeEventListener("scroll",i),s&&t.removeEventListener("resize",i)}),null==h||h(),null==(t=f)||t.disconnect(),f=null,c&&cancelAnimationFrame(o)}}(this._trigger,this._menu,async()=>{var t,e,i,n,o;let r,s,l,a=await (i=this._trigger,n=this._menu,o={placement:"bottom-end",middleware:[{name:"offset",options:12,async fn(t){var e,i;let{x:n,y:o,placement:r,middlewareData:s}=t,l=await t3(t,12);return r===(null==(e=s.offset)?void 0:e.placement)&&null!=(i=s.arrow)&&i.alignmentOffset?{}:{x:n+l.x,y:o+l.y,data:{...l,placement:r}}}},(void 0===t&&(t={}),{name:"flip",options:t,async fn(e){var i,n,o,r,s,l,a,c;let d,u,h,{placement:p,middlewareData:f,rects:g,initialPlacement:m,platform:v,elements:y}=e,{mainAxis:b=!0,crossAxis:C=!0,fallbackPlacements:w,fallbackStrategy:x="bestFit",fallbackAxisSideDirection:k="none",flipAlignment:$=!0,..._}=tF(t,e);if(null!=(i=f.arrow)&&i.alignmentOffset)return{};let A=tI(p),E=tz(m),S=tI(m)===m,O=await (null==v.isRTL?void 0:v.isRTL(y.floating)),R=w||(S||!$?[tG(m)]:(d=tG(m),[tq(m),d,tq(d)])),L="none"!==k;!w&&L&&R.push(...(u=tW(m),h=function(t,e,i){switch(t){case"top":case"bottom":if(i)return e?tK:tZ;return e?tZ:tK;case"left":case"right":return e?tJ:tY;default:return[]}}(tI(m),"start"===k,O),u&&(h=h.map(t=>t+"-"+u),$&&(h=h.concat(h.map(tq)))),h));let M=[m,...R],P=await v.detectOverflow(e,_),T=[],j=(null==(n=f.flip)?void 0:n.overflows)||[];if(b&&T.push(P[A]),C){let t,e,i,n,o=(l=p,a=g,void 0===(c=O)&&(c=!1),t=tW(l),i=tV(e=tB(tz(l))),n="x"===e?t===(c?"end":"start")?"right":"left":"start"===t?"bottom":"top",a.reference[i]>a.floating[i]&&(n=tG(n)),[n,tG(n)]);T.push(P[o[0]],P[o[1]])}if(j=[...j,{placement:p,overflows:T}],!T.every(t=>t<=0)){let t=((null==(o=f.flip)?void 0:o.index)||0)+1,e=M[t];if(e&&("alignment"!==C||E===tz(e)||j.every(t=>tz(t.placement)!==E||t.overflows[0]>0)))return{data:{index:t,overflows:j},reset:{placement:e}};let i=null==(r=j.filter(t=>t.overflows[0]<=0).sort((t,e)=>t.overflows[1]-e.overflows[1])[0])?void 0:r.placement;if(!i)switch(x){case"bestFit":{let t=null==(s=j.filter(t=>{if(L){let e=tz(t.placement);return e===E||"y"===e}return!0}).map(t=>[t.placement,t.overflows.filter(t=>t>0).reduce((t,e)=>t+e,0)]).sort((t,e)=>t[1]-e[1])[0])?void 0:s[0];t&&(i=t);break}case"initialPlacement":i=m}if(p!==i)return{reset:{placement:i}}}return{}}}),{name:"shift",options:e={padding:16},async fn(t){let{x:i,y:n,placement:o,platform:r}=t,{mainAxis:s=!0,crossAxis:l=!1,limiter:a={fn:t=>{let{x:e,y:i}=t;return{x:e,y:i}}},...c}=tF(e,t),d={x:i,y:n},u=await r.detectOverflow(t,c),h=tz(tI(o)),p=tB(h),f=d[p],g=d[h];if(s){let t="y"===p?"top":"left",e="y"===p?"bottom":"right",i=f+u[t],n=f-u[e];f=tj(i,tT(f,n))}if(l){let t="y"===h?"top":"left",e="y"===h?"bottom":"right",i=g+u[t],n=g-u[e];g=tj(i,tT(g,n))}let m=a.fn({...t,[p]:f,[h]:g});return{...m,data:{x:m.x-i,y:m.y-n,enabled:{[p]:s,[h]:l}}}}}]},r=new Map,l={...(s={platform:eS,...o}).platform,_c:r},t0(i,n,{...s,platform:l}));Object.assign(this._menu.style,{left:`${a.x}px`,top:`${a.y}px`})})}#v(){this.#g&&(this.#g(),this.#g=void 0)}};eH([t_({type:Object})],e7.prototype,"connection",void 0),eH([t_({type:Object})],e7.prototype,"client",void 0),eH([tO("#menu-button")],e7.prototype,"_trigger",void 0),eH([tO("#menu")],e7.prototype,"_menu",void 0),eH([tA()],e7.prototype,"_open",void 0);let e9=class extends tL(tx){static{this.elementDefinitions={"internal-button":eI,"mysten-dapp-kit-connect-modal":eQ,"connected-account-menu":e7}}static{this.shadowRootOptions={...tx.shadowRootOptions,delegatesFocus:!0}}static{this.styles=ej}render(){let t=this.instance.stores.$connection.get(),e=this.instance.stores.$currentClient.get();return t.account?tr`<connected-account-menu
					exportparts="trigger"
					.connection=${t}
					.client=${e}
					@account-selected=${t=>{this.instance.switchAccount({account:t.detail.account})}}
					@disconnect-click=${()=>{this.instance.disconnectWallet()}}
					@manage-connection-click=${()=>{this.instance.connectWallet({wallet:t.wallet})}}
				></connected-account-menu>`:tr`<internal-button exportparts="trigger" @click=${this.#_}>
						<slot>Connect Wallet</slot>
					</internal-button>
					<mysten-dapp-kit-connect-modal
						.instance=${this.instance}
						.filterFn=${this.modalOptions?.filterFn}
						.sortFn=${this.modalOptions?.sortFn}
					></mysten-dapp-kit-connect-modal>`}#_(){this._modal.show()}};eH([t_({type:Object})],e9.prototype,"modalOptions",void 0),eH([eP()],e9.prototype,"instance",void 0),eH([tO("mysten-dapp-kit-connect-modal")],e9.prototype,"_modal",void 0);let it=c({react:o,tagName:"mysten-dapp-kit-connect-button",elementClass:e9=eH([tE("mysten-dapp-kit-connect-button")],e9)}),ie=c({react:o,tagName:"mysten-dapp-kit-connect-modal",elementClass:eQ});t.s(["ConnectButton",0,function({instance:t,...e}){let i=(0,n.t)(t);return(0,r.jsx)(it,{...e,instance:i})},"ConnectModal",0,function({instance:t,...e}){let i=(0,n.t)(t);return(0,r.jsx)(ie,{...e,instance:i})}],96248)}]);