const {test,after,before}=require('node:test'),assert=require('node:assert/strict')
const {server,tokenIndexer,realtime,indexer}=require('../server.cjs'),p=require('../protocol.cjs')
let url
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port})
after(async()=>{await new Promise(resolve=>server.close(resolve))})
test('API confirms live RPC chain 1919',async()=>{const res=await fetch(url+'/api/v1/health');assert.equal(res.status,200);const data=await res.json();assert.equal(data.chainId,1919);assert.ok(data.blockNumber>0);assert.equal(data.transactionsEnabled,false)})
test('token list supports pagination and exposes only verified chain tokens',async()=>{const key=p.tokens.USDT.address.toLowerCase();tokenIndexer.state.tokens[key]={chainId:1919,address:p.tokens.USDT.address,name:'Tether USD',symbol:'USDT',decimals:6,totalSupply:'1000000',sources:[{type:'blockscout'}],verificationStatus:'verified-erc20-interface',trustStatus:'unverified'};const res=await fetch(url+'/api/v1/tokens?page=1&limit=1&search=usdt');const data=await res.json();assert.equal(data.total,1);assert.equal(data.tokens[0].decimals,6);assert.equal(data.tokens[0].trustStatus,'unverified');assert.equal(data.chainId,1919)})
test('token index status is available',async()=>{const res=await fetch(url+'/api/v1/tokens/status');assert.equal(res.status,200);assert.equal((await res.json()).chainId,1919)})
test('token list rejects invalid pagination',async()=>{const res=await fetch(url+'/api/v1/tokens?page=0&limit=200');assert.equal(res.status,400)})
test('API rejects foreign origins',async()=>{const res=await fetch(url+'/api/v1/chain',{headers:{Origin:'https://example.com'}});assert.equal(res.status,403)})
test('API exposes configured native metadata',async()=>{const res=await fetch(url+'/api/v1/chain',{headers:{Origin:'https://dex.turkscan.com'}});assert.equal(res.headers.get('access-control-allow-origin'),'https://dex.turkscan.com');const data=await res.json();assert.equal(data.nativeCurrency.name,'TC');assert.equal(data.nativeCurrency.symbol,'TURK')})
test('quote rejects wrong chains before RPC route construction',async()=>{const res=await fetch(url+'/api/v1/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chainId:1})});assert.equal(res.status,400);assert.equal((await res.json()).error.code,'WRONG_CHAIN')})
test('quote rejects zero amounts',async()=>{const res=await fetch(url+'/api/v1/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chainId:1919,amount:'0',tokenIn:p.tokens.WTURK.address,tokenOut:p.tokens.USDT.address})});assert.equal(res.status,400)})
test('invalid JSON produces a structured 400 response',async()=>{const res=await fetch(url+'/api/v1/quote',{method:'POST',body:'{'});assert.equal(res.status,400);assert.equal((await res.json()).error.code,'INVALID_JSON')})
test('missing endpoints return 404 without claiming availability',async()=>{const res=await fetch(url+'/api/v1/not-implemented');assert.equal(res.status,404);assert.equal(res.headers.get('cache-control'),'no-store')})

test('malformed addresses are client errors',async()=>{const res=await fetch(url+'/api/v1/quote',{method:'POST',body:JSON.stringify({chainId:1919,amount:'1',tokenIn:'broken',tokenOut:p.tokens.USDT.address})});assert.equal(res.status,400);assert.equal((await res.json()).error.code,'INVALID_ADDRESS')})
test('null request bodies are client errors',async()=>{const res=await fetch(url+'/api/v1/quote',{method:'POST',body:'null'});assert.equal(res.status,400)})
test('quote cannot use an uninitialized or stale index',async()=>{const res=await fetch(url+'/api/v1/quote',{method:'POST',body:JSON.stringify({chainId:1919,amount:'1',tokenIn:p.tokens.WTURK.address,tokenOut:p.tokens.USDT.address})});assert.equal(res.status,503);assert.equal((await res.json()).error.code,'INDEXING')})
test('trading quote validates 8888 and 7777 from chain rather than requiring static token registry entries',async()=>{
 const previous={...indexer.state}
 try{
  indexer.state.completed=true;indexer.state.lastError=null;indexer.state.updatedAt=new Date().toISOString()
  indexer.state.confirmedBlock=await require('../server.cjs').tokenIndexer.provider.getBlockNumber()
  const res=await fetch(url+'/api/v1/trading/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tokenInChainId:1919,tokenOutChainId:1919,tokenIn:'0x34974f5c83915762e3ba9C487E09465c801aD9E3',tokenOut:'0xCD0d7B9eEEc0897aFCcA0f0739DDECb830171271',amount:'1000000000000000000',type:'EXACT_INPUT',swapper:'0x1111111111111111111111111111111111111111',slippageTolerance:0.5,protocols:['V2']})})
  assert.notEqual(res.status,400,await res.clone().text())
  if(res.status===422)assert.equal((await res.json()).error.code,'NO_LIQUIDITY')
  else assert.equal(res.status,200,await res.clone().text())
 }finally{Object.assign(indexer.state,previous)}
})

test('SSE relays WSS head updates and releases listeners on disconnect',async()=>{const controller=new AbortController();const res=await fetch(url+'/api/v1/stream/heads',{signal:controller.signal,headers:{Origin:'https://dex.turkscan.com'}});assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/text\/event-stream/);assert.equal(res.headers.get('x-accel-buffering'),'no');const reader=res.body.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.match(first,/connected/);const next=reader.read();realtime.publish({type:'newHead',blockNumber:2645000});const frame=new TextDecoder().decode((await next).value);assert.match(frame,/"type":"newHead"/);assert.match(frame,/2645000/);controller.abort();await reader.cancel().catch(()=>undefined)})
