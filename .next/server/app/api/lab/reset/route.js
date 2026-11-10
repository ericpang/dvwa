(()=>{var a={};a.id=395,a.ids=[395],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},2530:(a,b,c)=>{"use strict";c.d(b,{fN:()=>o,nL:()=>k,Sv:()=>i,ap:()=>p,wU:()=>n,Tv:()=>r,aj:()=>m,F4:()=>q,$3:()=>l,NO:()=>s});var d=c(9608),e=c(24842);let f=["DROP TABLE IF EXISTS uploaded_files CASCADE","DROP TABLE IF EXISTS coupons CASCADE","DROP TABLE IF EXISTS reviews CASCADE","DROP TABLE IF EXISTS order_items CASCADE","DROP TABLE IF EXISTS orders CASCADE","DROP TABLE IF EXISTS products CASCADE","DROP TABLE IF EXISTS sessions CASCADE","DROP TABLE IF EXISTS users CASCADE","DROP TABLE IF EXISTS lab_settings CASCADE",`CREATE TABLE lab_settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
  )`,`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'customer',
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
    full_name VARCHAR(120),
    shipping_address TEXT,
    phone VARCHAR(40),
    api_key VARCHAR(120),
    reset_token VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,`CREATE TABLE sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,`CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 25,
    image_url TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE
  )`,`CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'paid',
    shipping_address TEXT NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(40) NOT NULL,
    credit_card_last4 VARCHAR(16) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,`CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(160) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
  )`,`CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(120) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,`CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    times_used INTEGER NOT NULL DEFAULT 0
  )`,`CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    content_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,"INSERT INTO lab_settings (key, value) VALUES ('security_level', 'low')",`INSERT INTO users (id, username, email, password_hash, role, wallet_balance, full_name, shipping_address, phone, api_key, reset_token)
   VALUES
   (1, 'alice', 'alice@vulnlab.local', 'password123', 'customer', 150.00, 'Alice Mercer (Test User A)', '742 Evergreen Terrace, Apt 4B, Springfield, IL 62704', '+1-555-0101', 'usr_live_alice_88a1b2c3', 'reset_1001'),
   (2, 'bob', 'bob@vulnlab.local', 'hunter2', 'customer', 2850.00, 'Bob Vance (Victim User B)', '1408 Slough Avenue, Suite 210, Scranton, PA 18503', '+1-555-0199', 'usr_live_bob_secret_77f8e9', 'reset_1002'),
   (3, 'admin', 'admin@vulnlab.local', 'admin123', 'admin', 99999.00, 'System Administrator', '1 Nexus Cyber Command Center, Vault Floor 9, Austin, TX 78701', '+1-555-0001', 'adm_master_key_FLAG{SQLI_AND_IDOR_MASTER_KEY_2026}', 'reset_1003')`,`INSERT INTO products (id, name, category, description, price, stock, image_url, is_hidden)
   VALUES
   (1, 'Flipper Zero Multi-Tool Lab Edition', 'Hardware', 'Portable multi-tool for pentesters and hardware geeks in a toy-like body. Supports Sub-1 GHz, RFID, NFC, and IR.', 169.00, 18, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80', FALSE),
   (2, 'Nexus WiFi Pineapple Mark VII', 'Wireless', 'Automated wireless auditing and penetration testing platform with dual-band rogue AP reconnaissance.', 199.99, 12, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80', FALSE),
   (3, 'Proxmark3 RDV4 RFID Research Kit', 'RFID / NFC', 'Compact high-frequency and low-frequency RFID security analysis and cloning research instrument.', 349.00, 7, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', FALSE),
   (4, 'Rubber Ducky USB Keystroke Injector', 'Hardware', 'Looks like a standard flash drive, types like a keyboard at 1000 words per minute for authorized physical tests.', 59.99, 40, 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80', FALSE),
   (5, 'HackRF One Software Defined Radio', 'SDR', '1 MHz to 6 GHz half-duplex software defined radio transceiver for RF protocol analysis.', 319.00, 9, 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80', FALSE),
   (6, 'INTERNAL PROTOTYPE: Zero-Day Vault Key [FLAG{HIDDEN_PRODUCT_SQLI_DISCOVERED}]', 'Classified', 'Unreleased internal Red Team hardware HSM containing staging root credentials. Should NEVER appear in public catalog.', 0.01, 1, 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=600&q=80', TRUE)`,`INSERT INTO orders (id, user_id, total_amount, status, shipping_address, customer_name, customer_email, customer_phone, credit_card_last4, notes)
   VALUES
   (1001, 1, 228.99, 'shipped', '742 Evergreen Terrace, Apt 4B, Springfield, IL 62704', 'Alice Mercer', 'alice@vulnlab.local', '+1-555-0101', '4242 (Visa)', 'Leave package at front desk'),
   (1002, 2, 548.99, 'paid', '1408 Slough Avenue, Suite 210, Scranton, PA 18503', 'Bob Vance', 'bob@vulnlab.local', '+1-555-0199', '8819 (Amex Corp)', 'CONFIDENTIAL: Contains Bob corporate tax ID #99-4810221 and door code #4920'),
   (1003, 3, 0.01, 'delivered', '1 Nexus Cyber Command Center, Vault Floor 9, Austin, TX 78701', 'System Administrator', 'admin@vulnlab.local', '+1-555-0001', '0000 (Internal)', 'ADMIN VAULT KEY: FLAG{IDOR_ORDER_ENUMERATION_SUCCESS}')`,`INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
   VALUES
   (1001, 1, 'Flipper Zero Multi-Tool Lab Edition', 1, 169.00),
   (1001, 4, 'Rubber Ducky USB Keystroke Injector', 1, 59.99),
   (1002, 2, 'Nexus WiFi Pineapple Mark VII', 1, 199.99),
   (1002, 3, 'Proxmark3 RDV4 RFID Research Kit', 1, 349.00),
   (1003, 6, 'INTERNAL PROTOTYPE: Zero-Day Vault Key', 1, 0.01)`,`INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
   VALUES
   (1, 1, 'Alice Mercer', 5, 'Awesome lab hardware! Works out of the box with Sub-GHz capture.'),
   (1, 2, 'Bob Vance', 4, 'Fast shipping. Note to self: do not leave default PIN enabled.'),
   (2, 2, 'Bob Vance', 5, 'Great for demonstrating rogue AP detection in our corporate SOC training.')`,`INSERT INTO coupons (code, discount_amount, max_uses, times_used)
   VALUES
   ('WELCOME50', 50.00, 1, 0),
   ('PENTEST100', 100.00, 1, 0),
   ('VIP25', 25.00, 5, 0)`],g=globalThis;g.__vulnLabDb||(g.__vulnLabDb={pool:null,initialized:!1,initializingPromise:null,queryLogs:[],securityLevel:"low",sessionCounter:10040});let h=g.__vulnLabDb;function i(){return process.env.DATABASE_URL&&process.env.DATABASE_URL.trim().length>0?"neon-postgres":"in-memory-postgres"}function j(){if(h.pool)return h.pool;if("neon-postgres"===i())h.pool=new d.bC({connectionString:process.env.DATABASE_URL});else{let a=(0,e.newDb)({autoCreateForeignKeyIndices:!0});a.public.registerFunction({name:"version",returns:e.DataType.text,implementation:()=>"PostgreSQL 16.4 (Neon Serverless / VulnLab Sandbox) on x86_64-pc-linux-gnu"}),a.public.registerFunction({name:"current_database",returns:e.DataType.text,implementation:()=>"neondb_vulnlab"}),a.public.registerFunction({name:"current_user",returns:e.DataType.text,implementation:()=>"neondb_owner"}),a.public.registerFunction({name:"pg_sleep",args:[e.DataType.float],returns:e.DataType.text,implementation:a=>`slept_${a}s`});let{Pool:b}=a.adapters.createPg();h.pool=new b}return h.pool}async function k(){if(!h.initialized){if(h.initializingPromise)return void await h.initializingPromise;h.initializingPromise=(async()=>{let a=j();try{let b=await a.query("SELECT value FROM lab_settings WHERE key = 'security_level'");if(b.rows?.length>0){h.securityLevel=b.rows[0].value,h.initialized=!0;return}}catch{}for(let b of f){let c=b.trim();c&&await a.query(c)}h.initialized=!0})();try{await h.initializingPromise}finally{h.initializingPromise=null}}}async function l(){"in-memory-postgres"===i()&&(h.pool=null);let a=j();for(let b of f){let c=b.trim();c&&await a.query(c)}h.initialized=!0,h.securityLevel="low",h.sessionCounter=10040,h.queryLogs=[],m({endpoint:"/api/lab/reset",vulnId:"FACTORY-RESTORE",sql:"-- Full Factory Restore: All tables, parameters, sessions & settings reset to original values --",durationMs:10,rowCount:f.length})}function m(a){let b={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,timestamp:new Date().toISOString(),mode:i(),...a};h.queryLogs.unshift(b),h.queryLogs.length>40&&(h.queryLogs.length=40)}function n(){return h.queryLogs}function o(){h.queryLogs=[]}function p(){return h.sessionCounter+=1,`00000000000${h.sessionCounter}`.slice(-12)}async function q(a,b,c){await k();let d=j(),e=Date.now(),f=a.match(/pg_sleep\(\s*(\d+(?:\.\d+)?)\s*\)/i);if(f&&"in-memory-postgres"===i()){let a=Math.min(parseFloat(f[1])||0,10);a>0&&await new Promise(b=>setTimeout(b,1e3*a))}try{let f=b&&b.length>0?await d.query(a,b):await d.query(a),g=Date.now()-e,h=Array.isArray(f)?f[f.length-1]?.rows??[]:f.rows??[],i=Array.isArray(f)?f[f.length-1]?.rowCount??h.length:f.rowCount??h.length;return m({endpoint:c?.endpoint,vulnId:c?.vulnId,sql:a,params:b,durationMs:g,rowCount:i}),{rows:h,rowCount:i}}catch(f){let d=Date.now()-e;throw m({endpoint:c?.endpoint,vulnId:c?.vulnId,sql:a,params:b,durationMs:d,error:f?.message||String(f)}),f}}async function r(){await k();try{let a=j(),b=await a.query("SELECT value FROM lab_settings WHERE key = 'security_level'");if(b.rows?.length>0){let a=b.rows[0].value;if(["low","medium","high","fixed"].includes(a))return h.securityLevel=a,a}}catch{}return h.securityLevel}async function s(a){await k(),h.securityLevel=a;let b=j();await b.query("UPDATE lab_settings SET value = $1 WHERE key = 'security_level'",[a])}},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},17812:a=>{function b(a){var b=Error("Cannot find module '"+a+"'");throw b.code="MODULE_NOT_FOUND",b}b.keys=()=>[],b.resolve=b,b.id=17812,a.exports=b},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{"use strict";a.exports=require("path")},43360:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>D,patchFetch:()=>C,routeModule:()=>y,serverHooks:()=>B,workAsyncStorage:()=>z,workUnitAsyncStorage:()=>A});var d={};c.r(d),c.d(d,{POST:()=>x});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(34679),u=c(51356),v=c(10641),w=c(2530);async function x(){await (0,w.$3)();let a=await (0,w.Tv)(),b=v.NextResponse.json({ok:!0,message:"All database tables, user balances, orders, reviews, coupons, sessions, and lab parameters have been restored to factory original values.",securityLevel:a,dbMode:(0,w.Sv)()});return b.cookies.delete("vulnlab_sid"),b}let y=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/lab/reset/route",pathname:"/api/lab/reset",filename:"route",bundlePath:"app/api/lab/reset/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Projects\\Gemini\\DVWA\\src\\app\\api\\lab\\reset\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:z,workUnitAsyncStorage:A,serverHooks:B}=y;function C(){return(0,g.patchFetch)({workAsyncStorage:z,workUnitAsyncStorage:A})}async function D(a,b,c){var d;let e="/api/lab/reset/route";"/index"===e&&(e="/");let g=await y.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:v,params:w,nextConfig:x,isDraftMode:z,prerenderManifest:A,routerServerContext:B,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:E}=g,F=(0,j.normalizeAppPath)(e),G=!!A.routes[E]&&(y.isDev||(0,t.isRouteCacheOwner)(E,y.cacheOwner,A.routes[E])),H=!!(A.dynamicRoutes[F]||G);if(H&&!z){let a=A.dynamicRoutes[F];if(a&&!1===a.fallback&&!G)throw new s.NoFallbackError}let I=null;!H||y.isDev||z||(I="/index"===(I=E)?"/":I);let J=!0===y.isDev||!H,K=H&&!J,L=a.method||"GET",M=(0,i.getTracer)(),N=M.getActiveScopeSpan(),O={params:w,prerenderManifest:A,renderOpts:{experimental:{cacheComponents:!!x.experimental.cacheComponents,authInterrupts:!!x.experimental.authInterrupts},supportsDynamicResponse:J,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=x.experimental)?void 0:d.cacheLife,isRevalidate:K,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>y.onRequestError(a,b,d,B)},sharedContext:{buildId:v}},P=new k.NodeNextRequest(a),Q=new k.NodeNextResponse(b),R=l.NextRequestAdapter.fromNodeNextRequest(P,(0,l.signalFromNodeResponse)(b));try{let d=async c=>y.handle(R,O).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=M.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${L} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${L} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&C&&D&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=O.renderOpts.fetchMetrics;let i=O.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=O.renderOpts.collectedTags;if(!H)return await (0,o.I)(P,Q,e,O.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==O.renderOpts.collectedRevalidate&&!(O.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&O.renderOpts.collectedRevalidate,d=void 0===O.renderOpts.collectedExpire||O.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:O.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await y.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:K,isOnDemandRevalidate:C})},B),b}},l=await y.handleResponse({req:a,nextConfig:x,cacheKey:I,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:k,waitUntil:c.waitUntil});if(!H)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",C?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),z&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&H||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(P,Q,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};N?await g(N):await M.withPropagatedContext(a.headers,()=>M.trace(m.BaseServerSpan.handleRequest,{spanName:`${L} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":L,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await y.onRequestError(a,b,{routerKind:"App Router",routePath:F,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:K,isOnDemandRevalidate:C})}),H)throw b;return await (0,o.I)(P,Q,new Response(null,{status:500})),null}}},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{"use strict";a.exports=require("crypto")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96487:()=>{}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[897,692,132],()=>b(b.s=43360));module.exports=c})();