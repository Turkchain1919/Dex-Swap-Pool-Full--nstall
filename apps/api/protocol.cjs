'use strict'
const { ethers } = require('ethers')
const core = require('@uniswap/sdk-core')
const v2 = require('@uniswap/v2-sdk')
const v3 = require('@uniswap/v3-sdk')
const v4 = require('@uniswap/v4-sdk')
const ur = require('@uniswap/universal-router-sdk')
const { AllowanceTransfer } = require('@uniswap/permit2-sdk')
const registry = require('../registry.json')
const addresses = Object.fromEntries(Object.entries(registry.contracts).map(([name,address])=>[name,ethers.utils.getAddress(address.toLowerCase())]))
const CHAIN_ID = 1919
const permit2Errors=new ethers.utils.Interface(['error AllowanceExpired(uint256 deadline)','error InsufficientAllowance(uint256 amount)','error InvalidNonce()'])
function decodeRevert(data){
 if(typeof data!=='string'||!/^0x[0-9a-fA-F]{8,}$/.test(data))return null
 const selector=data.slice(0,10).toLowerCase()
 if(selector==='0x08c379a0')try{return {name:'Error',reason:ethers.utils.defaultAbiCoder.decode(['string'],'0x'+data.slice(10))[0],selector}}catch{}
 if(selector==='0x4e487b71')try{return {name:'Panic',code:ethers.BigNumber.from('0x'+data.slice(10)).toString(),selector}}catch{}
 try{const parsed=permit2Errors.parseError(data);return {name:parsed.name,args:parsed.args.map(v=>ethers.BigNumber.isBigNumber(v)?v.toString():String(v)),selector}}catch{return {selector}}
}
function assertChain(chainId){ if(chainId!==CHAIN_ID)throw new Error('Only Turkchain Mainnet (1919) is supported') }
function checkedAddress(value){const a=ethers.utils.getAddress(value);if(a===ethers.constants.AddressZero)throw new Error('Zero address is not a recipient');return a}
function amount(value,allowZero=false){if(typeof value!=='string'||!/^\d+$/.test(value))throw new Error('Expected integer base units');const n=ethers.BigNumber.from(value);if((!allowZero&&n.isZero())||n.gt(ethers.constants.MaxUint256))throw new Error('Amount out of range');return n.toString()}
function deadline(value,now=Math.floor(Date.now()/1000)){if(!Number.isSafeInteger(value)||value<=now||value>now+3600)throw new Error('Deadline must be within the next hour');return value}
function transaction(to,parameters){const hex=ethers.BigNumber.from(parameters.value||0).toHexString();const value='0x'+hex.slice(2).replace(/^0+(?=[0-9a-f])/i,'');return {chainId:CHAIN_ID,to,data:parameters.calldata,value}}
function token(address,decimals,symbol){return new core.Token(CHAIN_ID,ethers.utils.getAddress(address.toLowerCase()),decimals,symbol)}
const tokens={WTURK:token(addresses.WTURK,18,'WTURK'),USDT:token(addresses.USDT,6,'USDT')}
class TurkNative extends core.NativeCurrency{
 constructor(){super(CHAIN_ID,18,'TURK','TC')}
 get wrapped(){return tokens.WTURK}
 equals(other){return other.isNative&&other.chainId===CHAIN_ID}
}
const native=new TurkNative()
const v2Router=new ethers.utils.Interface([
 'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns(uint256[])',
 'function swapTokensForExactTokens(uint256,uint256,address[],address,uint256) returns(uint256[])',
 'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns(uint256,uint256,uint256)',
 'function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns(uint256,uint256)'
])
function v2Swap({chainId,exactOutput=false,amountSpecified,limit,path,recipient,expires}){
 assertChain(chainId);if(!Array.isArray(path)||path.length<2||path.length>5)throw new Error('Invalid swap path')
 const validPath=path.map(checkedAddress);if(new Set(validPath.map(x=>x.toLowerCase())).size!==path.length)throw new Error('Cyclic swap path')
 const method=exactOutput?'swapTokensForExactTokens':'swapExactTokensForTokens'
 return transaction(addresses.V2Router02,{calldata:v2Router.encodeFunctionData(method,[amount(amountSpecified),amount(limit),validPath,checkedAddress(recipient),deadline(expires)]),value:0})
}
function v2NativeSwap({chainId,nativeInput,exactOutput=false,amountSpecified,limit,path,recipient,expires}){
 assertChain(chainId)
 if(typeof nativeInput!=='boolean'||typeof exactOutput!=='boolean')throw Error('Invalid swap direction')
 if(!Array.isArray(path)||path.length<2||path.length>5)throw Error('Invalid swap path')
 path=path.map(checkedAddress)
 if(new Set(path.map(x=>x.toLowerCase())).size!==path.length)throw Error('Cyclic swap path')
 if(path[nativeInput?0:path.length-1]!==addresses.WTURK)throw Error('Native swap path must use WTURK')
 const specified=amount(amountSpecified),bound=amount(limit),to=checkedAddress(recipient),until=deadline(expires)
 const iface=new ethers.utils.Interface([
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns(uint256[])',
  'function swapETHForExactTokens(uint256,address[],address,uint256) payable returns(uint256[])',
  'function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns(uint256[])',
  'function swapTokensForExactETH(uint256,uint256,address[],address,uint256) returns(uint256[])'
 ])
 const method=nativeInput?(exactOutput?'swapETHForExactTokens':'swapExactETHForTokens'):(exactOutput?'swapTokensForExactETH':'swapExactTokensForETH')
 const args=nativeInput?[exactOutput?specified:bound,path,to,until]:[specified,bound,path,to,until]
 return transaction(addresses.V2Router02,{calldata:iface.encodeFunctionData(method,args),value:nativeInput?(exactOutput?bound:specified):0})
}
function wrapNative({chainId,unwrap=false,amountSpecified}){
 assertChain(chainId)
 if(typeof unwrap!=='boolean')throw Error('Invalid wrap direction')
 const value=amount(amountSpecified),iface=new ethers.utils.Interface(['function deposit() payable','function withdraw(uint256)'])
 return transaction(addresses.WTURK,{calldata:iface.encodeFunctionData(unwrap?'withdraw':'deposit',unwrap?[value]:[]),value:unwrap?0:value})
}
function v2Liquidity({chainId,remove=false,tokenA,tokenB,amountA,amountB,liquidity,minA,minB,recipient,expires}){
 assertChain(chainId);tokenA=checkedAddress(tokenA);tokenB=checkedAddress(tokenB);if(tokenA.toLowerCase()===tokenB.toLowerCase())throw new Error('Identical tokens')
 const args=remove?[tokenA,tokenB,amount(liquidity),amount(minA,true),amount(minB,true),checkedAddress(recipient),deadline(expires)]:[tokenA,tokenB,amount(amountA),amount(amountB),amount(minA,true),amount(minB,true),checkedAddress(recipient),deadline(expires)]
 return transaction(addresses.V2Router02,{calldata:v2Router.encodeFunctionData(remove?'removeLiquidity':'addLiquidity',args),value:0})
}
function positionCall(version,operation,position,options){
 assertChain(position.pool.chainId)
 if(![3,4].includes(version))throw new Error('Unsupported position version')
 deadline(Number(options.deadline))
 if(options.recipient)checkedAddress(options.recipient)
 if(!options.slippageTolerance||options.slippageTolerance.lessThan(0)||options.slippageTolerance.greaterThan(new core.Percent(500,10000)))throw new Error('Invalid slippage tolerance')
 const manager=version===3?v3.NonfungiblePositionManager:v4.V4PositionManager
 const fn={add:'addCallParameters',remove:'removeCallParameters',collect:'collectCallParameters'}[operation]
 if(!fn)throw new Error('Unsupported position operation')
 const parameters=version===3&&operation==='collect'?manager[fn](options):manager[fn](position,options)
 return transaction(version===3?addresses.V3PositionManager:addresses.V4PositionManager,parameters)
}
function v3Swap(trade,options){
 assertChain(trade.inputAmount.currency.chainId);assertChain(trade.outputAmount.currency.chainId)
 checkedAddress(options.recipient);deadline(Number(options.deadline))
 if(!options.slippageTolerance||options.slippageTolerance.lessThan(0)||options.slippageTolerance.greaterThan(new core.Percent(500,10000)))throw new Error('Invalid slippage tolerance')
 return transaction(addresses.V3SwapRouter,v3.SwapRouter.swapCallParameters(trade,options))
}
function v4Initialize(pool,sqrtPriceX96){assertChain(pool.chainId);return transaction(addresses.V4PositionManager,v4.V4PositionManager.createCallParameters(pool.poolKey,sqrtPriceX96))}
function v4Swap({chainId,pool,zeroForOne,exactOutput=false,amountSpecified,limit,expires,routerVersion}){
 assertChain(chainId);assertChain(pool.chainId);deadline(expires)
 // The deployed router version must be established by source/bytecode verification.
 if(routerVersion!=='2.2.0')throw new Error('Verified UniversalRouter 2.2.0 layout required for Turkchain')
 if(typeof zeroForOne!=='boolean')throw new Error('Invalid swap direction')
 if(pool.hooks.toLowerCase()!==ethers.constants.AddressZero)throw new Error('Hook requires separate compatibility review')
 const specified=amount(amountSpecified),bound=amount(limit)
 if(ethers.BigNumber.from(specified).gt('0xffffffffffffffffffffffffffffffff')||ethers.BigNumber.from(bound).gt('0xffffffffffffffffffffffffffffffff'))throw new Error('V4 amount exceeds uint128')
 const planner=new v4.V4Planner()
 const swap={poolKey:pool.poolKey,zeroForOne,hookData:'0x',minHopPriceX36:0}
 if(exactOutput){swap.amountOut=specified;swap.amountInMaximum=bound}else{swap.amountIn=specified;swap.amountOutMinimum=bound}
 planner.addAction(exactOutput?v4.Actions.SWAP_EXACT_OUT_SINGLE:v4.Actions.SWAP_EXACT_IN_SINGLE,[swap],routerVersion)
 const currencyIn=zeroForOne?pool.currency0:pool.currency1,currencyOut=zeroForOne?pool.currency1:pool.currency0
 const currencyAddress=c=>c.isNative?ethers.constants.AddressZero:c.address
 planner.addAction(v4.Actions.SETTLE_ALL,[currencyAddress(currencyIn),exactOutput?bound:specified])
 planner.addAction(v4.Actions.TAKE_ALL,[currencyAddress(currencyOut),exactOutput?specified:bound])
 const route=new ur.RoutePlanner();route.addCommand(ur.CommandType.V4_SWAP,[planner.finalize()])
 const iface=new ethers.utils.Interface(['function execute(bytes,bytes[],uint256) payable'])
 return transaction(addresses.UniversalRouter,{calldata:iface.encodeFunctionData('execute',[route.commands,route.inputs,expires]),value:currencyIn.isNative?(exactOutput?bound:specified):0})
}
function permitData({chainId,permit,spender}){
 assertChain(chainId);if(ethers.utils.getAddress(permit.spender)!==checkedAddress(spender))throw new Error('Permit spender mismatch')
 if(![addresses.UniversalRouter,addresses.V4PositionManager].includes(checkedAddress(spender)))throw new Error('Unsupported Permit2 spender')
 deadline(Number(permit.sigDeadline))
 return AllowanceTransfer.getPermitData(permit,addresses.Permit2,CHAIN_ID)
}
async function feeQuote(provider,gasEstimate,sender){
 const gas=ethers.BigNumber.from(gasEstimate)
 const [gasPrice,block,priority,balance]=await Promise.all([
  provider.send('eth_gasPrice',[]).then(ethers.BigNumber.from),
  provider.getBlock('latest'),
  provider.send('eth_maxPriorityFeePerGas',[]).then(ethers.BigNumber.from).catch(()=>null),
  provider.getBalance(sender),
 ])
 const baseFee=block?.baseFeePerGas==null?null:ethers.BigNumber.from(block.baseFeePerGas)
 if(baseFee){
  const priorityFee=priority||ethers.constants.Zero
  const effective=gasPrice.gt(baseFee)?gasPrice:baseFee.add(priorityFee)
  const maxFee=baseFee.mul(2).add(priorityFee)
  const estimated=gas.mul(effective),maximum=gas.mul(maxFee)
  return {model:'eip1559',nativeSymbol:'TURK',nativeDecimals:18,gasEstimate:gas.toString(),gasPriceWei:gasPrice.toString(),baseFeePerGasWei:baseFee.toString(),maxPriorityFeePerGasWei:priorityFee.toString(),maxFeePerGasWei:maxFee.toString(),estimatedFeeWei:estimated.toString(),estimatedFeeTURK:ethers.utils.formatEther(estimated),maximumFeeWei:maximum.toString(),maximumFeeTURK:ethers.utils.formatEther(maximum),nativeBalanceWei:balance.toString(),sufficientBalance:balance.gte(maximum)}
 }
 const estimated=gas.mul(gasPrice)
 return {model:'legacy',nativeSymbol:'TURK',nativeDecimals:18,gasEstimate:gas.toString(),gasPriceWei:gasPrice.toString(),estimatedFeeWei:estimated.toString(),estimatedFeeTURK:ethers.utils.formatEther(estimated),nativeBalanceWei:balance.toString(),sufficientBalance:balance.gte(estimated)}
}
async function simulate(provider,tx,sender){
 assertChain((await provider.getNetwork()).chainId);assertChain(tx.chainId);sender=checkedAddress(sender)
 if(!Object.values(addresses).includes(ethers.utils.getAddress(tx.to)))throw new Error('Unknown transaction target')
 const request={from:sender,to:tx.to,data:tx.data,value:ethers.utils.hexValue(tx.value||0)}
 const block=await provider.getBlockNumber()
 let result
 try{result=await provider.send('eth_call',[request,ethers.utils.hexValue(block)])}
 catch(error){const revertData=error.data??error.error?.data??null;error.details={...(error.details||{}),rpcCode:error.code??null,revertData,decodedError:decodeRevert(revertData),reason:error.reason??null};throw error}
 // Some Turkchain RPC paths return ABI-encoded revert data as a successful eth_call result.
 // Decode known revert payloads before gas estimation so they cannot be mistaken for a successful simulation.
 const callRevert=decodeRevert(result)
 if(callRevert?.name){
  const error=Object.assign(Error(callRevert.reason||callRevert.name),{code:'CALL_REVERTED',data:result})
  error.details={rpcCode:'CALL_REVERTED',revertData:result,decodedError:callRevert,reason:callRevert.reason||callRevert.name}
  throw error
 }
 const gas=await provider.estimateGas(request)
 const fee=await feeQuote(provider,gas,sender)
 return {success:true,blockNumber:block,result,gas:gas.toString(),fee,transaction:{...request,chainId:CHAIN_ID},broadcast:false}
}
module.exports={assertChain,addresses,tokens,native,feeQuote,decodeRevert,v2Swap,v2NativeSwap,wrapNative,v2Liquidity,v3Swap,v4Swap,v4Initialize,positionCall,permitData,simulate}
