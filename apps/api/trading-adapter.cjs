'use strict'
const {ethers}=require('ethers'),{randomUUID}=require('node:crypto'),p=require('./protocol.cjs'),core=require('@uniswap/sdk-core'),v4=require('@uniswap/v4-sdk')
const ZERO=ethers.constants.AddressZero
function v4ProductionAuthorized(){return require('../registry.json').v4ProductionAuthorized===true||process.env.TURKDEX_V4_PRODUCTION_AUTHORIZED==='true'}
async function metadata(address,provider){
 if(address===ZERO)return {chainId:1919,address,decimals:'18',symbol:'TURK'}
 const token=Object.values(p.tokens).find(t=>t.address.toLowerCase()===address.toLowerCase())
 if(token)return {chainId:1919,address:token.address,decimals:String(token.decimals),symbol:token.symbol}
 if(await provider.getCode(address)==='0x')throw Object.assign(Error('Route token has no deployed code'),{status:422,code:'TOKEN_NOT_CONTRACT'})
 const c=new ethers.Contract(address,['function symbol() view returns(string)','function decimals() view returns(uint8)'],provider)
 const [symbol,decimals]=await Promise.all([c.symbol(),c.decimals()])
 if(!symbol||!Number.isInteger(decimals)||decimals>36)throw Object.assign(Error('Route token metadata is not ERC-20 compatible'),{status:422,code:'TOKEN_METADATA_UNAVAILABLE'})
 return {chainId:1919,address:ethers.utils.getAddress(address),decimals:String(decimals),symbol}
}
async function quoteGasMetadata({provider,gasEstimate,swapper,source,status}){
 const base={gasEstimateStatus:status,gasEstimateSource:source,gasEstimateError:null}
 if(!gasEstimate)return {...base,gasEstimateStatus:'UNAVAILABLE',gasEstimateError:'Gas estimate unavailable for this route.'}
 try{
  const fee=await p.feeQuote(provider,gasEstimate,swapper)
  return {...base,gasUseEstimate:String(gasEstimate),gasFee:fee.estimatedFeeWei,gasPrice:fee.gasPriceWei,maxFeePerGas:fee.maxFeePerGasWei||undefined,maxPriorityFeePerGas:fee.maxPriorityFeePerGasWei||undefined,estimatedFeeTURK:fee.estimatedFeeTURK,maxEstimatedFeeTURK:fee.maximumFeeTURK||fee.estimatedFeeTURK,gasModel:fee.model}
 }catch(error){
  return {...base,gasEstimateStatus:'UNAVAILABLE',gasEstimateError:error?.message||'Unable to read Turkchain gas price.'}
 }
}
async function tradingQuote({body,provider,quote}){
 if(!body||body.tokenInChainId!==1919||body.tokenOutChainId!==1919)throw Object.assign(Error('Only Turkchain 1919 is supported'),{status:400,code:'WRONG_CHAIN'})
 const slippage=body.slippageTolerance??0.5
 if(typeof slippage!=='number'||!Number.isFinite(slippage)||slippage<0||slippage>5)throw Object.assign(Error('Slippage must be from 0 to 5 percent'),{status:400,code:'INVALID_SLIPPAGE'})
 if(!['EXACT_INPUT','EXACT_OUTPUT'].includes(body.type))throw Object.assign(Error('Invalid trade type'),{status:400,code:'INVALID_TRADE_TYPE'})
 let swapper;try{swapper=ethers.utils.getAddress(body.swapper)}catch{throw Object.assign(Error('Invalid swapper address'),{status:400,code:'INVALID_ADDRESS'})}
 const result=await quote({chainId:1919,tokenIn:body.tokenIn,tokenOut:body.tokenOut,amount:body.amount,tradeType:body.type,protocols:body.protocols})
 const best=result.routes[0],block=result.blockNumber,options={blockTag:block},input={token:result.tokenIn,amount:best.amountIn},output={token:result.tokenOut,amount:best.amountOut,recipient:swapper}
 const common={swapper,input,output,chainId:1919,tradeType:result.tradeType,blockNumber:String(block)}
 if(['WRAP','UNWRAP'].includes(best.protocol))return {requestId:randomUUID(),routing:best.protocol,permitData:null,quote:common,execution:{enabled:false,simulationRequired:true}}
 const nativeWrapped=a=>a===ZERO?p.addresses.WTURK:a
 const tokenIn=await metadata(best.protocol==='V4'?result.tokenIn:nativeWrapped(result.tokenIn),provider),tokenOut=await metadata(best.protocol==='V4'?result.tokenOut:nativeWrapped(result.tokenOut),provider)
 const route={type:best.protocol.toLowerCase()+'-pool',tokenIn,tokenOut,amountIn:best.amountIn,amountOut:best.amountOut}
 if(best.protocol==='V2'){
  const factory=new ethers.Contract(p.addresses.V2Factory,['function getPair(address,address) view returns(address)'],provider)
  route.address=await factory.getPair(tokenIn.address,tokenOut.address,options)
  if(route.address===ZERO)throw Error('Quoted pair no longer exists')
  const pair=new ethers.Contract(route.address,['function token0() view returns(address)','function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)'],provider)
  const [a,b,res]=await Promise.all([pair.token0(options),pair.token1(options),pair.getReserves(options)])
  route.reserve0={token:await metadata(a,provider),quotient:res[0].toString()};route.reserve1={token:await metadata(b,provider),quotient:res[1].toString()}
 }else if(best.protocol==='V3'){
  const pool=new ethers.Contract(best.pool,['function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns(uint128)'],provider)
  const [slot,liquidity]=await Promise.all([pool.slot0(options),pool.liquidity(options)])
  Object.assign(route,{address:best.pool,fee:String(best.fee),sqrtRatioX96:slot[0].toString(),tickCurrent:String(slot[1]),liquidity:liquidity.toString()})
 }else if(best.protocol==='V4'){
  const state=new ethers.Contract(p.addresses.StateView,['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'],provider)
  const [slot,liquidity]=await Promise.all([state.getSlot0(best.poolId,options),state.getLiquidity(best.poolId,options)])
  Object.assign(route,{address:best.poolId,fee:String(best.poolKey.fee),tickSpacing:String(best.poolKey.tickSpacing),hooks:best.poolKey.hooks,sqrtRatioX96:slot[0].toString(),tickCurrent:String(slot[1]),liquidity:liquidity.toString()})
 }else throw Error('Unsupported route protocol')
 const bips=Math.round(slippage*100)
 const minAmount=result.tradeType==='EXACT_OUTPUT'?best.amountOut:ethers.BigNumber.from(best.amountOut).mul(10000-bips).div(10000).toString()
 // Quoter gas is advisory until the complete router transaction is simulated.
 // V2 quote cannot be estimated with eth_estimateGas before allowance; use the
 // published SOR heuristic (135k base + 36k native unwrap for a direct route).
 const v2Estimate=best.protocol==='V2'?135000+Math.max(0,(route.hops||1)-1)*50000+(String(body.tokenOut).toLowerCase()===ZERO.toLowerCase()?36000:0):undefined
 const gasEstimate=best.gasEstimate||v2Estimate
 const gasSource=best.gasEstimate?(best.protocol+'_QUOTER'):'UNISWAP_SOR_V2_HEURISTIC'
 const gasStatus=best.gasEstimate?'QUOTER_ESTIMATE':'APPROXIMATE'
 const gas=await quoteGasMetadata({provider,gasEstimate,swapper,source:gasSource,status:gasStatus})
 return {requestId:randomUUID(),routing:'CLASSIC',permitData:null,quote:{...common,slippage,route:[[route]],aggregatedOutputs:[{...output,bps:10000,minAmount}],...gas},execution:{enabled:false,simulationRequired:true}}
}

async function simulateApproval(provider,owner,transaction){
 const request={from:owner,to:transaction.to,data:transaction.data,value:transaction.value||'0x0'}
 try{
  await provider.call(request)
  const gas=await provider.estimateGas(request)
  const fee=await p.feeQuote(provider,gas,owner)
  return {gas:gas.toString(),fee,broadcast:false}
 }catch(error){
  const data=error.data??error.error?.data??null
  const decoded=p.decodeRevert(data)
  throw Object.assign(Error(error.reason||decoded?.reason||'Approval simulation failed'),{status:422,code:'APPROVAL_SIMULATION_FAILED',details:{rpcCode:error.code??null,revertData:data,decodedError:decoded,reason:error.reason??null}})
 }
}
async function prepareV2Swap({body,provider,quote}){
 if(!body||Number(body.chainId)!==1919||Number(body.tokenInChainId)!==1919||Number(body.tokenOutChainId)!==1919)throw Object.assign(Error('Only Turkchain Mainnet (1919) is supported'),{status:400,code:'WRONG_CHAIN'})
 const owner=ethers.utils.getAddress(body.swapper||body.walletAddress||'')
 const tokenIn=ethers.utils.getAddress(body.tokenIn),tokenOut=ethers.utils.getAddress(body.tokenOut)
 const amountIn=ethers.BigNumber.from(String(body.amount||'0'))
 if(amountIn.lte(0))throw Object.assign(Error('Input amount must be positive'),{status:400,code:'INVALID_AMOUNT'})
 if((body.type||body.tradeType||'EXACT_INPUT')!=='EXACT_INPUT')throw Object.assign(Error('This V2 route currently supports exact input only'),{status:422,code:'UNSUPPORTED_TRADE_TYPE'})
 const slippage=Number(body.slippageTolerance??0.5)
 if(!Number.isFinite(slippage)||slippage<0||slippage>5)throw Object.assign(Error('Slippage must be from 0 to 5 percent'),{status:400,code:'INVALID_SLIPPAGE'})
 const quoted=await quote({chainId:1919,tokenIn,tokenOut,amount:amountIn.toString(),tradeType:'EXACT_INPUT',protocols:['V2']})
 const best=quoted.routes[0]
 if(!best||best.protocol!=='V2')throw Object.assign(Error('No verified V2 route is available for this token pair'),{status:422,code:'NO_V2_ROUTE'})
 const nativeIn=tokenIn===ZERO,nativeOut=tokenOut===ZERO
 if(nativeIn&&nativeOut)throw Object.assign(Error('Native-to-native swap is invalid'),{status:422,code:'INVALID_NATIVE_ROUTE'})
 const wrappedIn=nativeIn?p.addresses.WTURK:tokenIn,wrappedOut=nativeOut?p.addresses.WTURK:tokenOut
 const factory=new ethers.Contract(p.addresses.V2Factory,['function getPair(address,address) view returns(address)'],provider)
 const pair=await factory.getPair(wrappedIn,wrappedOut,{blockTag:quoted.blockNumber})
 if(pair===ZERO||await provider.getCode(pair)==='0x')throw Object.assign(Error('The quoted V2 pair is no longer deployed'),{status:409,code:'PAIR_UNAVAILABLE'})
 const minOut=ethers.BigNumber.from(best.amountOut).mul(10000-Math.round(slippage*100)).div(10000)
 if(minOut.lte(0))throw Object.assign(Error('Minimum output is zero'),{status:422,code:'ZERO_MIN_OUTPUT'})
 const expires=Math.floor(Date.now()/1000)+1200
 const path=[wrappedIn,wrappedOut]
 const tx=nativeIn||nativeOut?p.v2NativeSwap({chainId:1919,nativeInput:nativeIn,exactOutput:false,amountSpecified:amountIn.toString(),limit:minOut.toString(),path,recipient:owner,expires}):p.v2Swap({chainId:1919,amountSpecified:amountIn.toString(),limit:minOut.toString(),path,recipient:owner,expires})
 const tokenInInfo=await metadata(wrappedIn,provider),tokenOutInfo=await metadata(wrappedOut,provider)
 if(!nativeIn){
  const erc20=new ethers.Contract(tokenIn,['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)'],provider)
  const [balance,allowance]=await Promise.all([erc20.balanceOf(owner),erc20.allowance(owner,p.addresses.V2Router02)])
  if(balance.lt(amountIn))return {requestId:randomUUID(),routing:'CLASSIC',quote:{input:{token:tokenIn,amount:amountIn.toString()},output:{token:tokenOut,amount:best.amountOut,recipient:owner},slippage,blockNumber:String(quoted.blockNumber)},route:{protocol:'V2',pair,path,nativeOutput:nativeOut},execution:{enabled:false,stage:'FAILED',reason:'INSUFFICIENT_TOKEN_BALANCE',message:'Token bakiyesi yetersiz.'}}
  if(allowance.lt(amountIn)){
   const approval={chainId:1919,from:owner,to:tokenIn,data:new ethers.utils.Interface(['function approve(address,uint256) returns(bool)']).encodeFunctionData('approve',[p.addresses.V2Router02,amountIn]),value:'0x0'}
   const approvalSimulation=await simulateApproval(provider,owner,approval)
   return {requestId:randomUUID(),routing:'CLASSIC',quote:{input:{token:tokenIn,amount:amountIn.toString()},output:{token:tokenOut,amount:best.amountOut,recipient:owner},slippage,blockNumber:String(quoted.blockNumber)},route:{protocol:'V2',pair,path,nativeOutput:nativeOut,tokenIn:tokenInInfo,tokenOut:tokenOutInfo},execution:{enabled:false,stage:'APPROVAL_REQUIRED',reason:'ERC20_ALLOWANCE_REQUIRED',approval:{kind:'ERC20_TO_V2_ROUTER',token:tokenIn,spender:p.addresses.V2Router02,amount:amountIn.toString(),transaction:approval},approvalSimulation}}
  }
 }
 let simulation
 try{simulation=await p.simulate(provider,tx,owner)}catch(error){
  const details=error.details||{rpcCode:error.code??null,revertData:error.data??error.error?.data??null,decodedError:p.decodeRevert(error.data??error.error?.data??null),reason:error.reason??null}
  throw Object.assign(Error(error.reason||details.decodedError?.reason||'V2 router simulation failed'),{status:422,code:'SWAP_SIMULATION_FAILED',details:{...details,router:p.addresses.V2Router02,pair,path,calldata:tx.data,chainId:1919}})
 }
 if(!simulation.fee?.sufficientBalance)return {requestId:randomUUID(),routing:'CLASSIC',quote:{input:{token:tokenIn,amount:amountIn.toString()},output:{token:tokenOut,amount:best.amountOut,recipient:owner},slippage,blockNumber:String(quoted.blockNumber)},route:{protocol:'V2',pair,path,nativeOutput:nativeOut},execution:{enabled:false,stage:'FAILED',reason:'INSUFFICIENT_TURK_BALANCE',message:'Tahmini ağ ücretini karşılayacak TURK bakiyesi yok.',simulation}}
 return {requestId:randomUUID(),routing:'CLASSIC',quote:{input:{token:tokenIn,amount:amountIn.toString()},output:{token:tokenOut,amount:best.amountOut,recipient:owner},slippage,blockNumber:String(quoted.blockNumber),minimumOutput:minOut.toString(),gasUseEstimate:simulation.gas,gasFee:simulation.fee.estimatedFeeWei,gasPrice:simulation.fee.gasPriceWei,maxFeePerGas:simulation.fee.maxFeePerGasWei,maxPriorityFeePerGas:simulation.fee.maxPriorityFeePerGasWei,estimatedFeeTURK:simulation.fee.estimatedFeeTURK,maxEstimatedFeeTURK:simulation.fee.maximumFeeTURK,gasEstimateStatus:'SIMULATED',gasEstimateSource:'RPC_ETH_ESTIMATE_GAS',gasEstimateError:null},route:{protocol:'V2',pair,path,nativeOutput:nativeOut,tokenIn:tokenInInfo,tokenOut:tokenOutInfo},execution:{enabled:true,stage:'READY',simulationRequired:false,simulation,transaction:{...tx,from:owner},router:p.addresses.V2Router02,recipient:owner,deadline:expires}}
}
async function prepareSwap({body,provider,quote}){
 const routeProtocol=String(body?.protocol||'').toUpperCase()
 if(routeProtocol==='V2')return prepareV2Swap({body,provider,quote})
 if(routeProtocol==='V4')return prepareV4Swap({body,provider,quote})
 if(routeProtocol==='V3')throw Object.assign(Error('V3 execution preparation is not enabled for this route'),{status:422,code:'UNSUPPORTED_ROUTE_EXECUTION',details:{protocol:routeProtocol}})
 const inputBody=body||{}
 const quoted=await quote({chainId:1919,tokenIn:inputBody.tokenIn,tokenOut:inputBody.tokenOut,amount:String(inputBody.amount||'0'),tradeType:inputBody.type||'EXACT_INPUT',protocols:['V2','V3','V4']})
 const selected=quoted.routes[0]?.protocol
 if(selected==='V2')return prepareV2Swap({body,provider,quote})
 if(selected==='V4')return prepareV4Swap({body,provider,quote})
 throw Object.assign(Error('No safe local execution adapter is enabled for this route'),{status:422,code:selected==='V3'?'UNSUPPORTED_ROUTE_EXECUTION':'NO_VERIFIED_ROUTE',details:{protocol:selected||null}})
}

async function prepareV4Swap({body,provider,quote}){
 if(!body||body.chainId!==1919||body.tokenInChainId!==1919||body.tokenOutChainId!==1919)throw Object.assign(Error('Only Turkchain Mainnet (1919) is supported'),{status:400,code:'WRONG_CHAIN'})
 const owner=ethers.utils.getAddress(body.swapper||body.walletAddress||'')
 const amountIn=ethers.BigNumber.from(String(body.amount||'0'))
 if(amountIn.lte(0))throw Object.assign(Error('Input amount must be positive'),{status:400,code:'INVALID_AMOUNT'})
 const slippage=Number(body.slippageTolerance??0.5)
 if(!Number.isFinite(slippage)||slippage<0||slippage>5)throw Object.assign(Error('Slippage must be from 0 to 5 percent'),{status:400,code:'INVALID_SLIPPAGE'})
 const quoted=await quote({chainId:1919,tokenIn:body.tokenIn,tokenOut:body.tokenOut,amount:amountIn.toString(),tradeType:'EXACT_INPUT',protocols:['V4']})
 const best=quoted.routes[0]
 if(!best||best.protocol!=='V4')throw Object.assign(Error('No verified V4 route is available'),{status:422,code:'NO_V4_ROUTE'})
 if(body.poolId&&String(body.poolId).toLowerCase()!==String(best.poolId).toLowerCase())throw Object.assign(Error('The quoted pool changed; request a fresh quote'),{status:409,code:'STALE_POOL'})
 if(!best.poolKey||best.poolKey.hooks!==ethers.constants.AddressZero)throw Object.assign(Error('This V4 hook route is not enabled'),{status:422,code:'UNSUPPORTED_HOOK'})
 const tokenIn=await metadata(body.tokenIn,provider),tokenOut=await metadata(body.tokenOut,provider)
 const state=new ethers.Contract(p.addresses.StateView,['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'],provider)
 const [slot,liquidity]=await Promise.all([state.getSlot0(best.poolId),state.getLiquidity(best.poolId)])
 if(ethers.BigNumber.from(slot[0]).isZero()||ethers.BigNumber.from(liquidity).isZero())throw Object.assign(Error('V4 pool has no active initialized liquidity'),{status:422,code:'POOL_NOT_ACTIVE'})
 const t0=new core.Token(1919,ethers.utils.getAddress(best.poolKey.currency0),Number((await metadata(best.poolKey.currency0,provider)).decimals),'C0')
 const t1=new core.Token(1919,ethers.utils.getAddress(best.poolKey.currency1),Number((await metadata(best.poolKey.currency1,provider)).decimals),'C1')
 const pool=new v4.Pool(t0,t1,Number(best.poolKey.fee),Number(best.poolKey.tickSpacing),best.poolKey.hooks,slot[0].toString(),liquidity.toString(),Number(slot[1]))
 const bips=Math.round(slippage*100),minOut=ethers.BigNumber.from(best.amountOut).mul(10000-bips).div(10000)
 if(minOut.lte(0))throw Object.assign(Error('Minimum output is zero'),{status:422,code:'ZERO_MIN_OUTPUT'})
 const expires=Math.floor(Date.now()/1000)+1200
 const approvalExpires=expires+1800
 const tx=p.v4Swap({chainId:1919,pool,zeroForOne:ethers.utils.getAddress(body.tokenIn).toLowerCase()===best.poolKey.currency0.toLowerCase(),amountSpecified:amountIn.toString(),limit:minOut.toString(),expires,routerVersion:'2.2.0'})
 const erc20=new ethers.Contract(body.tokenIn,['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)'],provider)
 const permit2=new ethers.Contract(p.addresses.Permit2,['function allowance(address,address,address) view returns(uint160,uint48,uint48)'],provider)
 const [balance,ercAllowance,p2]=await Promise.all([erc20.balanceOf(owner),erc20.allowance(owner,p.addresses.Permit2),permit2.allowance(owner,body.tokenIn,p.addresses.UniversalRouter)])
 if(balance.lt(amountIn))return {execution:{enabled:false,stage:'FAILED',reason:'INSUFFICIENT_TOKEN_BALANCE',message:'Token bakiyesi yetersiz.'},route:{poolId:best.poolId},minimumOutput:minOut.toString()}
 if(ercAllowance.lt(amountIn))return {execution:{enabled:false,stage:'APPROVAL_REQUIRED',approval:{kind:'ERC20_TO_PERMIT2',token:body.tokenIn,spender:p.addresses.Permit2,amount:amountIn.toString(),transaction:{chainId:1919,to:body.tokenIn,data:new ethers.utils.Interface(['function approve(address,uint256) returns(bool)']).encodeFunctionData('approve',[p.addresses.Permit2,amountIn]),value:'0x0'}},reason:'ERC20_ALLOWANCE_REQUIRED'},route:{poolId:best.poolId},minimumOutput:minOut.toString()}
 const expiration=Number(p2[1]),now=Math.floor(Date.now()/1000)
 if(ethers.BigNumber.from(p2[0]).lt(amountIn)||expiration<now+1200)return {execution:{enabled:false,stage:'APPROVAL_REQUIRED',approval:{kind:'PERMIT2_TO_UNIVERSAL_ROUTER',token:body.tokenIn,spender:p.addresses.UniversalRouter,amount:amountIn.toString(),expiration:approvalExpires,transaction:{chainId:1919,to:p.addresses.Permit2,data:new ethers.utils.Interface(['function approve(address,address,uint160,uint48)']).encodeFunctionData('approve',[body.tokenIn,p.addresses.UniversalRouter,amountIn,approvalExpires]),value:'0x0'}},reason:'PERMIT2_ALLOWANCE_REQUIRED'},route:{poolId:best.poolId},minimumOutput:minOut.toString()}
 const simulation=await p.simulate(provider,tx,owner)
 if(!v4ProductionAuthorized()){
  const {transaction:simulatedTransaction,...simulationResult}=simulation
  return {execution:{enabled:false,stage:'AUTHORIZATION_PENDING',reason:'V4_PRODUCTION_AUTHORIZATION_PENDING',message:'Simülasyon başarılı olsa bile V4 takas gönderimi üretim yetkilendirme kilidi nedeniyle kapalı.',simulationRequired:false,simulation:simulationResult},quote:{amountIn:amountIn.toString(),amountOut:best.amountOut,minimumOutput:minOut.toString(),slippageTolerance:slippage},route:{protocol:'V4',poolId:best.poolId,poolKey:best.poolKey,fee:best.poolKey.fee,tickSpacing:best.poolKey.tickSpacing,tokenIn,tokenOut},requestId:randomUUID()}
 }
 return {execution:{enabled:true,stage:'READY',simulationRequired:false,simulation,transaction:tx,router:p.addresses.UniversalRouter,recipient:owner,deadline:expires},quote:{amountIn:amountIn.toString(),amountOut:best.amountOut,minimumOutput:minOut.toString(),slippageTolerance:slippage},route:{protocol:'V4',poolId:best.poolId,poolKey:best.poolKey,fee:best.poolKey.fee,tickSpacing:best.poolKey.tickSpacing,tokenIn,tokenOut},requestId:randomUUID()}
}


async function checkSwapApproval({body,provider,quote}){
 if(!body||Number(body.chainId)!==1919)throw Object.assign(Error('Only Turkchain Mainnet (1919) is supported'),{status:400,code:'WRONG_CHAIN'})
 const owner=ethers.utils.getAddress(body.walletAddress),token=ethers.utils.getAddress(body.token)
 const amount=ethers.BigNumber.from(String(body.amount||'0'))
 if(amount.lte(0))throw Object.assign(Error('Approval amount must be positive'),{status:400,code:'INVALID_AMOUNT'})
 const output=body.tokenOut?ethers.utils.getAddress(body.tokenOut):null
 let protocol=String(body.protocol||'').toUpperCase()
 if(!protocol&&!output)protocol='V4'
 if(!protocol&&output&&quote){
  const q=await quote({chainId:1919,tokenIn:token,tokenOut:output,amount:amount.toString(),tradeType:'EXACT_INPUT',protocols:['V2','V3','V4']})
  protocol=q.routes[0]?.protocol||''
 }
 if(!['V2','V3','V4'].includes(protocol))throw Object.assign(Error('No verified route is available to determine the token spender'),{status:422,code:'NO_VERIFIED_ROUTE'})
 const erc=new ethers.Contract(token,['function allowance(address,address) view returns(uint256)'],provider)
 let approval=null,authorizationPending=false
 if(protocol==='V2'||protocol==='V3'){
  const spender=protocol==='V2'?p.addresses.V2Router02:p.addresses.V3SwapRouter
  const ercAllowance=await erc.allowance(owner,spender)
  if(ercAllowance.lt(amount))approval={chainId:1919,from:owner,to:token,data:new ethers.utils.Interface(['function approve(address,uint256) returns(bool)']).encodeFunctionData('approve',[spender,amount]),value:'0x0'}
 }else{
  const p2=new ethers.Contract(p.addresses.Permit2,['function allowance(address,address,address) view returns(uint160,uint48,uint48)'],provider)
  const [ercAllowance,permitAllowance]=await Promise.all([erc.allowance(owner,p.addresses.Permit2),p2.allowance(owner,token,p.addresses.UniversalRouter)])
  if(ercAllowance.lt(amount))approval={chainId:1919,from:owner,to:token,data:new ethers.utils.Interface(['function approve(address,uint256) returns(bool)']).encodeFunctionData('approve',[p.addresses.Permit2,amount]),value:'0x0'}
  else if(ethers.BigNumber.from(permitAllowance[0]).lt(amount)||Number(permitAllowance[1])<Math.floor(Date.now()/1000)+600){const expiry=Math.floor(Date.now()/1000)+3600;approval={chainId:1919,from:owner,to:p.addresses.Permit2,data:new ethers.utils.Interface(['function approve(address,address,uint160,uint48)']).encodeFunctionData('approve',[token,p.addresses.UniversalRouter,amount,expiry]),value:'0x0'}}
  authorizationPending=!v4ProductionAuthorized()
 }
 let approvalGas
 if(approval){approvalGas=await simulateApproval(provider,owner,approval)}
 return {requestId:randomUUID(),approval,cancel:null,authorizationPending,protocol,spender:protocol==='V2'?p.addresses.V2Router02:protocol==='V3'?p.addresses.V3SwapRouter:p.addresses.UniversalRouter,...(approvalGas?{gasFee:approvalGas.fee.estimatedFeeWei,approvalGas}:{})}
}

module.exports={tradingQuote,prepareSwap,prepareV2Swap,prepareV4Swap,checkSwapApproval,metadata,v4ProductionAuthorized}
