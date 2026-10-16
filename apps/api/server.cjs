'use strict'
const http=require('node:http'),fs=require('node:fs'),path=require('node:path')
const {ethers}=require('ethers'),protocol=require('./protocol.cjs')
const registry=require('../registry.json')
const provider=new ethers.providers.JsonRpcProvider({url:registry.rpc,timeout:12000},1919)
const base=path.resolve(__dirname,'..')
const {PoolIndexer}=require('./indexer.cjs')
const {TokenIndexer}=require('./token-indexer.cjs')
const {TurkchainRealtime}=require('./realtime.cjs')
const seed=JSON.parse(fs.readFileSync(path.join(base,'reports/full-pool-discovery.json')))
const dataDir=process.env.TURKDEX_DATA_DIR||path.join(base,'data')
const indexer=new PoolIndexer({provider,registry,dataDir,seed,deployments:require('../reports/position-manager-deployment-blocks.json')})
const tokenIndexer=new TokenIndexer({provider,registry,dataDir})
let indexerRefreshTimer=null
const refreshFromWebSocket=()=>{if(indexerRefreshTimer)return;indexerRefreshTimer=setTimeout(()=>{indexerRefreshTimer=null;void indexer.tick();void tokenIndexer.tick()},4000);indexerRefreshTimer.unref?.()}
const realtime=new TurkchainRealtime({url:process.env.TURKCHAIN_WS_RPC_URL||registry.websocketRpc,registry,onHead:refreshFromWebSocket,onPoolEvent:refreshFromWebSocket})
const rate=new Map()
function address(value){try{return ethers.utils.getAddress(value)}catch{throw fail(400,'INVALID_ADDRESS','Use a valid EVM address')}}
function payload(body){if(!body||typeof body!=='object'||Array.isArray(body))throw fail(400,'INVALID_BODY','Use a JSON object');return body}
function indexStatus(){const s=indexer.state;return {confirmedBlock:s.confirmedBlock,currentBlock:s.currentBlock,lagBlocks:s.lagBlocks,updatedAt:s.updatedAt||null,completed:s.completed,nftHistoryComplete:s.nftHistoryComplete,v4LiquidityBackfillComplete:s.v4LiquidityBackfillComplete,v4LiquidityEventCount:(s.v4LiquidityEvents||[]).length,v4LiquidityBackfillError:s.v4LiquidityBackfillError||null,lastError:s.lastError||null}}
function ready(){const s=indexer.state;if(!s.completed||s.lastError||!s.updatedAt||Date.now()-Date.parse(s.updatedAt)>60000)throw fail(503,'INDEXING','A current canonical pool index is not yet available')}
function response(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))}
function fail(status,code,message){return Object.assign(new Error(message),{status,code})}
function input(body){payload(body);if(body.chainId!==1919)throw fail(400,'WRONG_CHAIN','Only Turkchain 1919 is supported');if(typeof body.amount!=='string'||!/^\d{1,78}$/.test(body.amount)||ethers.BigNumber.from(body.amount).lte(0)||ethers.BigNumber.from(body.amount).gt(ethers.constants.MaxUint256))throw fail(400,'INVALID_AMOUNT','Use positive integer base units');const tokenIn=address(body.tokenIn),tokenOut=address(body.tokenOut);if(tokenIn===tokenOut)throw fail(400,'IDENTICAL_TOKENS','Select two tokens');if(body.protocols!==undefined&&(!Array.isArray(body.protocols)||!body.protocols.length||body.protocols.some(p=>!['V2','V3','V4'].includes(p))))throw fail(400,'INVALID_PROTOCOLS','Use V2, V3 or V4');return {...body,tokenIn,tokenOut}}
async function pools(){
 const discovery=indexer.state
 const events={
 V2Factory:'event PairCreated(address indexed token0,address indexed token1,address pair,uint256)',
 V3Factory:'event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)',
 V4PoolManager:'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
 }
 const found=discovery.contracts.flatMap(c=>{const iface=new ethers.utils.Interface([events[c.name]]);return c.logs.map(log=>{const args=iface.parseLog(log).args;return {protocol:c.name==='V2Factory'?'V2':c.name==='V3Factory'?'V3':'V4',blockNumber:parseInt(log.blockNumber,16),transactionHash:log.transactionHash,parameters:Object.fromEntries(Object.entries(args).filter(([key])=>!/^[0-9]+$/.test(key)).map(([k,v])=>[k,ethers.BigNumber.isBigNumber(v)?v.toString():v]))}})})
 const stateView=new ethers.Contract(registry.contracts.StateView,['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'],provider)
 await Promise.all(found.filter(pool=>pool.protocol==='V4').map(async pool=>{
  const id=pool.parameters.id
  try{const [slot,liquidity]=await Promise.all([stateView.getSlot0(id,{blockTag:discovery.confirmedBlock}),stateView.getLiquidity(id,{blockTag:discovery.confirmedBlock})]);pool.currentState={sqrtPriceX96:slot[0].toString(),tick:Number(slot[1]),liquidity:liquidity.toString()}}
  catch(error){pool.currentStateError=error.reason||error.message}
 }))
 return {chainId:1919,confirmedBlock:discovery.confirmedBlock,completeThroughBlock:discovery.completed,indexStatus:indexStatus(),pools:found}
}
async function quote(body){
 const q=input(body);ready()
 const erc20=new ethers.utils.Interface(['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)'])
 for(const tokenAddress of [q.tokenIn,q.tokenOut]){
  if(tokenAddress===ethers.constants.AddressZero)continue
  if(await provider.getCode(tokenAddress)==='0x')throw fail(400,'TOKEN_NOT_CONTRACT','Token address has no deployed bytecode')
  try{
   const c=new ethers.Contract(tokenAddress,['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)'],provider)
   const [name,symbol,decimals]=await Promise.all([c.name(),c.symbol(),c.decimals()])
   if(!name||!symbol||!Number.isInteger(decimals)||decimals>36)throw Error('Invalid ERC-20 metadata')
  }catch{throw fail(400,'TOKEN_NOT_ERC20','Token does not expose readable ERC-20 name, symbol, and decimals')}
 }
 const block=indexer.state.confirmedBlock,routes=[],errors=[]
 const selected=new Set(q.protocols||['V2','V3','V4']);const exactOut=q.tradeType==='EXACT_OUTPUT';if(q.tradeType&&!['EXACT_INPUT','EXACT_OUTPUT'].includes(q.tradeType))throw fail(400,'INVALID_TRADE_TYPE','Use EXACT_INPUT or EXACT_OUTPUT')
 const wrappedIn=q.tokenIn===ethers.constants.AddressZero?protocol.addresses.WTURK:q.tokenIn
 const wrappedOut=q.tokenOut===ethers.constants.AddressZero?protocol.addresses.WTURK:q.tokenOut
 if(wrappedIn===wrappedOut)return {chainId:1919,blockNumber:block,quotedAt:new Date().toISOString(),tradeType:exactOut?'EXACT_OUTPUT':'EXACT_INPUT',tokenIn:q.tokenIn,tokenOut:q.tokenOut,routes:[{protocol:q.tokenIn===ethers.constants.AddressZero?'WRAP':'UNWRAP',amountIn:q.amount,amountOut:q.amount}],errors:[],executable:false,executionStatus:'Wallet signing remains blocked until production activation'}
 const router=new ethers.Contract(protocol.addresses.V2Router02,['function getAmountsOut(uint256,address[]) view returns(uint256[])','function getAmountsIn(uint256,address[]) view returns(uint256[])'],provider)
 if(selected.has('V2'))try{const values=await router[exactOut?'getAmountsIn':'getAmountsOut'](q.amount,[wrappedIn,wrappedOut],{blockTag:block});routes.push({protocol:'V2',amountIn:values[0].toString(),amountOut:values[1].toString()})}catch(e){errors.push({protocol:'V2',reason:e.reason||'NO_LIQUIDITY'})}
 const factory=new ethers.Contract(protocol.addresses.V3Factory,['function getPool(address,address,uint24) view returns(address)'],provider)
 const quoter=new ethers.Contract(protocol.addresses.QuoterV2,['function quoteExactInputSingle((address,address,uint256,uint24,uint160)) returns(uint256,uint160,uint32,uint256)','function quoteExactOutputSingle((address,address,uint256,uint24,uint160)) returns(uint256,uint160,uint32,uint256)'],provider)
 for(const fee of selected.has('V3')?[500,3000,10000]:[]){
  try{
   const pool=await factory.getPool(wrappedIn,wrappedOut,fee,{blockTag:block});if(pool===ethers.constants.AddressZero)continue
   const result=await quoter.callStatic[exactOut?'quoteExactOutputSingle':'quoteExactInputSingle']([wrappedIn,wrappedOut,q.amount,fee,0],{blockTag:block})
   routes.push({protocol:'V3',pool,fee,amountIn:exactOut?result[0].toString():q.amount,amountOut:exactOut?q.amount:result[0].toString(),gasEstimate:result[3].toString()})
  }catch(e){errors.push({protocol:'V3',fee,reason:e.reason||'QUOTE_REVERTED'})}
 }
 const v4Quoter=new ethers.Contract(protocol.addresses.V4Quoter,['function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256,uint256)','function quoteExactOutputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256,uint256)'],provider)
 let discovered
 try{discovered=await pools()}catch(e){errors.push({protocol:'V4',reason:e.code})}
 for(const pool of discovered?.pools.filter(p=>selected.has('V4')&&p.protocol==='V4')||[]){
  const k=pool.parameters;if(k.hooks!==ethers.constants.AddressZero)continue
  const pair=[k.currency0.toLowerCase(),k.currency1.toLowerCase()]
  if(!pair.includes(q.tokenIn.toLowerCase())||!pair.includes(q.tokenOut.toLowerCase()))continue
  try{const result=await v4Quoter.callStatic[exactOut?'quoteExactOutputSingle':'quoteExactInputSingle']([[k.currency0,k.currency1,k.fee,k.tickSpacing,k.hooks],k.currency0.toLowerCase()===q.tokenIn.toLowerCase(),q.amount,'0x'],{blockTag:block});routes.push({protocol:'V4',poolId:k.id,poolKey:k,amountIn:exactOut?result[0].toString():q.amount,amountOut:exactOut?q.amount:result[0].toString(),gasEstimate:result[1].toString(),productionAuthorizationPending:!registry.v4ProductionAuthorized})}catch(e){errors.push({protocol:'V4',poolId:k.id,reason:e.reason||'QUOTE_REVERTED'})}
 }
 routes.sort((a,b)=>{const x=ethers.BigNumber.from(exactOut?a.amountIn:a.amountOut),y=ethers.BigNumber.from(exactOut?b.amountIn:b.amountOut);return x.eq(y)?0:(x.lt(y)?(exactOut?-1:1):(exactOut?1:-1))})
 const result={chainId:1919,blockNumber:block,quotedAt:new Date().toISOString(),tradeType:exactOut?'EXACT_OUTPUT':'EXACT_INPUT',tokenIn:q.tokenIn,tokenOut:q.tokenOut,routes,errors,executable:false,executionStatus:'Transaction paths remain subject to simulation and production activation'}
 if(!routes.length)throw Object.assign(fail(422,'NO_LIQUIDITY','No verified direct pool quote is available'),{details:result})
 return result
}
async function readBody(req,limit=16384){let body='';for await(const chunk of req){body+=chunk;if(body.length>limit)throw fail(413,'BODY_TOO_LARGE','Request exceeds body limit')}try{return JSON.parse(body)}catch{throw fail(400,'INVALID_JSON','Request must contain JSON')}}
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;if(origin&&origin!=='https://dex.turkscan.com')return response(res,403,{error:{code:'ORIGIN_DENIED',message:'Origin is not allowed'}})
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);return res.end()}
 const peer=req.socket.remoteAddress||'unknown',forwarded=req.headers['x-real-ip'];const key=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)&&typeof forwarded==='string'&&require('node:net').isIP(forwarded)?forwarded:peer,now=Date.now();let bucket=rate.get(key)
 if(!bucket||now-bucket.start>60000){bucket={start:now,count:0};rate.set(key,bucket)}
 if(rate.size>10000){for(const [k,v]of rate)if(now-v.start>60000)rate.delete(k)}
 if(++bucket.count>120)return response(res,429,{error:{code:'RATE_LIMIT',message:'120 requests per minute exceeded'}})
 try{
  const url=new URL(req.url,'http://127.0.0.1')
  if(req.method==='GET'&&url.pathname==='/api/v1/stream/heads'){
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n')
   const send=(event)=>{if(!res.destroyed)res.write(`data: ${JSON.stringify(event)}\n\n`)}
   const unsubscribe=realtime.subscribe(send);const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': ping\n\n')},15000);heartbeat.unref?.()
   if(realtime.lastBlock!==null)send({type:'newHead',blockNumber:realtime.lastBlock})
   res.on('close',()=>{clearInterval(heartbeat);unsubscribe()});return
  }
  if(req.method==='GET'&&url.pathname==='/api/v1/health'){const network=await provider.getNetwork();if(network.chainId!==1919)throw fail(503,'WRONG_RPC_CHAIN','RPC returned unexpected chain');return response(res,200,{status:'ok',chainId:1919,blockNumber:await provider.getBlockNumber(),transactionsEnabled:false,realtime:realtime.status(),indexer:indexStatus(),tokenIndex:tokenIndexer.status()})}
  if(req.method==='GET'&&url.pathname==='/api/v1/chain')return response(res,200,{chainId:1919,name:'Turkchain Mainnet',nativeCurrency:registry.nativeCurrency,rpcUrls:[registry.rpc],websocketRpcUrls:[registry.websocketRpc],blockExplorerUrls:['https://turkscan.com']})
  if(req.method==='GET'&&url.pathname==='/api/v1/contracts')return response(res,200,registry)
  if(req.method==='GET'&&url.pathname==='/api/v1/tokens'){const pageRaw=url.searchParams.get('page'),offsetRaw=url.searchParams.get('offset'),limitRaw=url.searchParams.get('limit')||url.searchParams.get('per_page')||'50';const limit=Number(limitRaw);const page=pageRaw?Number(pageRaw):(offsetRaw?Math.floor(Number(offsetRaw)/limit)+1:1);if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(page)||page<1)throw fail(400,'INVALID_PAGINATION','Use page >= 1 and limit from 1 to 100');const verificationStatus=url.searchParams.get('verificationStatus')||'verified-erc20-interface';if(!['verified-erc20-interface','pending','rejected','all'].includes(verificationStatus))throw fail(400,'INVALID_FILTER','Use a supported token verification status');const result=tokenIndexer.list({page,limit,search:url.searchParams.get('search')||url.searchParams.get('q')||'',verified:url.searchParams.get('trusted')||'',source:url.searchParams.get('source')||'',verificationStatus});return response(res,200,{name:'Turkchain ERC-20 Tokens',timestamp:tokenIndexer.state.updatedAt||new Date().toISOString(),version:{major:1,minor:0,patch:0},...result})}
  if(req.method==='GET'&&url.pathname==='/api/v1/tokens/status')return response(res,200,{chainId:1919,indexer:tokenIndexer.status()})
  if(req.method==='POST'&&url.pathname==='/api/v1/token-metadata'){
   const body=payload(await readBody(req,320000))
   return response(res,201,await require('./token-metadata.cjs').save({provider,dataDir,body}))
  }
  const metadataMatch=url.pathname.match(/^\/api\/v1\/token-metadata\/(0x[0-9a-fA-F]{40})$/)
  if(req.method==='GET'&&metadataMatch)return response(res,200,require('./token-metadata.cjs').get({dataDir,address:metadataMatch[1]}))
  if(req.method==='GET'&&url.pathname==='/api/v1/pools'){ready();return response(res,200,await pools())}
  if(req.method==='GET'&&url.pathname==='/api/v1/transactions'){
   ready()
   const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||50)))
   const eventInterface=new ethers.utils.Interface(['event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'])
   const poolResult=await pools(),poolById=new Map(poolResult.pools.map(pool=>[String(pool.parameters.id||'').toLowerCase(),pool]))
   const events=indexer.state.v4LiquidityEvents||[],items=[]
   for(const log of events){
    try{
     const parsed=eventInterface.parseLog(log),pool=poolById.get(parsed.args.id.toLowerCase()),tx=await provider.getTransaction(log.transactionHash)
     items.push({chainId:1919,protocol:'V4',type:parsed.args.liquidityDelta.gt(0)?'LIQUIDITY_ADDED':'LIQUIDITY_REMOVED',hash:log.transactionHash,blockNumber:Number(log.blockNumber),logIndex:Number(log.logIndex),poolId:parsed.args.id,sender:tx?.from||parsed.args.sender,tickLower:parsed.args.tickLower,tickUpper:parsed.args.tickUpper,liquidityDelta:parsed.args.liquidityDelta.toString(),token0:pool?.parameters.currency0||null,token1:pool?.parameters.currency1||null,fee:pool?.parameters.fee||null})
    }catch{}
   }
   const unique=[...new Map(items.map(item=>[item.hash+':'+item.logIndex,item])).values()].sort((a,b)=>b.blockNumber-a.blockNumber||b.logIndex-a.logIndex)
   return response(res,200,{chainId:1919,confirmedBlock:indexer.state.confirmedBlock,items:unique.slice(0,limit),source:'PoolManager ModifyLiquidity events',usdValuesAvailable:false})
  }
  if(req.method==='GET'&&url.pathname==='/api/v1/positions'){
   ready();const owner=address(url.searchParams.get('owner')),offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||25)
   if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>50)throw fail(400,'INVALID_PAGINATION','Use a nonnegative offset and a limit from 1 to 50')
   return response(res,200,await require('./positions.cjs').positions({provider,indexer,registry,owner,offset,limit}))
  }
  if(req.method==='POST'&&url.pathname==='/api/v1/liquidity/prepare'){const body=payload(await readBody(req));return response(res,200,await require('./initial-pools.cjs').prepare({provider,body}))}
  if(req.method==='POST'&&url.pathname==='/api/v1/trading/quote')return response(res,200,await require('./trading-adapter.cjs').tradingQuote({body:payload(await readBody(req)),provider,quote}))
  if(req.method==='POST'&&url.pathname==='/api/v1/trading/prepare')return response(res,200,await require('./trading-adapter.cjs').prepareSwap({body:payload(await readBody(req)),provider,quote}))
  if(req.method==='POST'&&url.pathname==='/api/v1/trading/approval')return response(res,200,await require('./trading-adapter.cjs').checkSwapApproval({body:payload(await readBody(req)),provider,quote}))
  if(req.method==='POST'&&url.pathname==='/api/v1/quote')return response(res,200,await quote(await readBody(req)))
  if(req.method==='POST'&&url.pathname==='/api/v1/simulate'){const body=payload(await readBody(req));return response(res,200,await protocol.simulate(provider,body.transaction,body.sender))}
  return response(res,404,{error:{code:'NOT_FOUND',message:'Endpoint is not implemented'}})
 }catch(e){return response(res,e.status||502,{error:{code:e.code||'UPSTREAM_ERROR',message:e.status?e.message:'RPC request or simulation failed',...(e.details?{details:e.details}:{})}})}
})
server.requestTimeout=20000;server.headersTimeout=10000;server.keepAliveTimeout=5000
server.on('close',()=>{indexer.stop();tokenIndexer.stop();realtime.stop();if(indexerRefreshTimer)clearTimeout(indexerRefreshTimer)})
if(require.main===module){indexer.start();tokenIndexer.start();server.listen(Number(process.env.PORT||3919),'127.0.0.1',()=>{realtime.start();console.log('Turkchain read-only API listening on loopback')})}
module.exports={server,quote,pools,indexer,tokenIndexer,realtime,input}
