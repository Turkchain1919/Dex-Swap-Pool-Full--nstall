'use strict'
const {ethers}=require('ethers'),core=require('@uniswap/sdk-core'),v3=require('@uniswap/v3-sdk'),v4=require('@uniswap/v4-sdk'),JSBI=require('jsbi'),protocol=require('./protocol.cjs')
const CHAIN=1919,ZERO=ethers.constants.AddressZero
const permit2Abi=new ethers.utils.Interface(['function approve(address,address,uint160,uint48)'])
const erc20=new ethers.utils.Interface(['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)','function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)'])
const bps=n=>{if(!Number.isInteger(n)||n<0||n>1000)throw Error('slippageBps 0..1000 gerekli');return n},addr=x=>ethers.utils.getAddress(x)
const raw=(x,d)=>{if(typeof x!=='string'||!/^\d+(\.\d+)?$/.test(x))throw Error('Miktar/fiyat pozitif ondalik olmalı');const n=ethers.utils.parseUnits(x,d);if(n.isZero())throw Error('Sıfır miktar/fiyat kullanılamaz');return n}
const sorted=(a,b)=>{if(a.toLowerCase()===b.toLowerCase())throw Error('Aynı token iki kez seçilemez');if(a.toLowerCase()>b.toLowerCase())throw Error('token0/token1 adres sırası küçükten büyüğe olmalı')}
const sqrt=(p,d0,d1)=>{if(p.initialSqrtPriceX96!==undefined){if(typeof p.initialSqrtPriceX96!=='string'||!/^\d{1,78}$/.test(p.initialSqrtPriceX96))throw Error('sqrtPriceX96 geçersiz');const n=JSBI.BigInt(p.initialSqrtPriceX96);if(JSBI.lessThanOrEqual(n,JSBI.BigInt(v3.TickMath.MIN_SQRT_RATIO.toString()))||JSBI.greaterThanOrEqual(n,JSBI.BigInt(v3.TickMath.MAX_SQRT_RATIO.toString())))throw Error('sqrtPriceX96 izin verilen tick aralığı dışında');return n}return v3.encodeSqrtRatioX96(JSBI.BigInt(raw(p.initialPrice,d1).toString()),JSBI.BigInt(ethers.BigNumber.from(10).pow(d0).toString()))}
const range=s=>[Math.ceil(v3.TickMath.MIN_TICK/s)*s,Math.floor(v3.TickMath.MAX_TICK/s)*s]
async function info(provider,address,sender,spender,isNative=false){
 if(await provider.getCode(address)==='0x')throw Error('Token bytecode bulunamadı: '+address)
 const c=new ethers.Contract(address,erc20,provider)
 const [name,symbol,decimals,totalSupply,balance,allowance]=await Promise.all([c.name().catch(()=>null),c.symbol().catch(()=>null),c.decimals(),c.totalSupply().catch(()=>null),isNative?provider.getBalance(sender):c.balanceOf(sender),isNative?ethers.constants.MaxUint256:c.allowance(sender,spender)])
 if(!Number.isInteger(decimals)||decimals>36)throw Error('Token decimals geçersiz: '+address)
 return {address,name,symbol,decimals,totalSupply:totalSupply?.toString()??null,balance:balance.toString(),allowance:allowance.toString(),isNative}
}
function approval(token,spender,amount){return {chainId:CHAIN,to:token,data:erc20.encodeFunctionData('approve',[spender,amount]),value:'0x00'}}
async function prepare({provider,body}){
 if(!body||body.chainId!==CHAIN)throw Object.assign(Error('Yalnızca Turkchain Chain ID 1919 desteklenir'),{status:400,code:'WRONG_CHAIN'})
 const version=body.protocol;if(!['V2','V3','V4'].includes(version))throw Object.assign(Error('V2/V3/V4 protokolü gerekli'),{status:400,code:'INVALID_PROTOCOL'})
 const token0=addr(body.token0),token1=addr(body.token1),sender=addr(body.sender);sorted(token0,token1)
 const nativeSide=body.nativeSide??null
 if(nativeSide!==null&&(version!=='V2'||!['token0','token1'].includes(nativeSide)||[token0,token1][nativeSide==='token0'?0:1].toLowerCase()!==protocol.addresses.WTURK.toLowerCase()))throw Object.assign(Error('Native TURK yalnızca WTURK eşleşmesiyle V2 addLiquidityETH yolunda desteklenir'),{status:400,code:'UNSUPPORTED_NATIVE_SIDE'})
 const slip=bps(body.slippageBps??50),deadline=Number(body.deadline||Math.floor(Date.now()/1000)+600),now=Math.floor(Date.now()/1000)
 if(!Number.isSafeInteger(deadline)||deadline<=now||deadline>now+3600)throw Error('deadline bir saat içinde olmalı')
 const spender=version==='V2'?protocol.addresses.V2Router02:version==='V3'?protocol.addresses.V3PositionManager:protocol.addresses.Permit2
 const [t0,t1]=await Promise.all([info(provider,token0,sender,spender,nativeSide==='token0'),info(provider,token1,sender,spender,nativeSide==='token1')])
 const amount0=raw(body.amount0,t0.decimals),amount1=raw(body.amount1,t1.decimals),txApprovals=[]
 if(version==='V4'){const p2=new ethers.Contract(protocol.addresses.Permit2,['function allowance(address,address,address) view returns(uint160,uint48,uint48)'],provider);for(const t of [t0,t1]){if(ethers.BigNumber.from(t.allowance).lt(ethers.constants.MaxUint256.div(2)))txApprovals.push(approval(t.address,protocol.addresses.Permit2,ethers.constants.MaxUint256));const a=await p2.allowance(sender,t.address,protocol.addresses.V4PositionManager);if(ethers.BigNumber.from(a[0]).lt(ethers.BigNumber.from(2).pow(160).sub(1).div(2))||Number(a[1])<=now)txApprovals.push({chainId:CHAIN,to:protocol.addresses.Permit2,data:permit2Abi.encodeFunctionData('approve',[t.address,protocol.addresses.V4PositionManager,ethers.BigNumber.from(2).pow(160).sub(1),now+3600]),value:'0x00'})}}
 else for(const [t,a] of [[t0,amount0],[t1,amount1]])if(ethers.BigNumber.from(t.allowance).lt(a))txApprovals.push(approval(t.address,spender,a))
 const currencies=[new core.Token(CHAIN,token0,t0.decimals,t0.symbol||undefined),new core.Token(CHAIN,token1,t1.decimals,t1.symbol||undefined)]
 let poolState,tx,fee,tickSpacing,sqrtX,tickLower,tickUpper,poolId,tick,creationSimulation
 if(version==='V2'){
  const factory=new ethers.Contract(protocol.addresses.V2Factory,['function getPair(address,address) view returns(address)'],provider),router=new ethers.Contract(protocol.addresses.V2Router02,['function factory() view returns(address)','function WETH() view returns(address)'],provider)
  const [pair,routerFactory,wrapped]=await Promise.all([factory.getPair(token0,token1),router.factory(),router.WETH()])
  if(routerFactory.toLowerCase()!==factory.address.toLowerCase()||wrapped.toLowerCase()!==protocol.addresses.WTURK.toLowerCase())throw Error('V2 Router factory/WTURK bağlantısı uyuşmuyor')
  poolState={initialized:pair!==ZERO,pair:pair===ZERO?null:pair}
  if(pair===ZERO){try{const iface=new ethers.utils.Interface(['function createPair(address,address) returns(address)']),call={chainId:CHAIN,to:factory.address,data:iface.encodeFunctionData('createPair',[token0,token1]),value:'0x00'};const result=await protocol.simulate(provider,call,sender);creationSimulation={attempted:true,success:true,simulatedPair:ethers.utils.getAddress(ethers.utils.defaultAbiCoder.decode(['address'],result.result)[0]),gas:result.gas,blockNumber:result.blockNumber}}catch(e){creationSimulation={attempted:true,success:false,reason:e.reason||e.message,code:e.code||null}}}
  const min0=amount0.mul(10000-slip).div(10000),min1=amount1.mul(10000-slip).div(10000)
  if(nativeSide){const tokenIs0=nativeSide==='token1',token=tokenIs0?token0:token1,tokenAmount=tokenIs0?amount0:amount1,nativeAmount=tokenIs0?amount1:amount0,tokenMin=tokenIs0?min0:min1,nativeMin=tokenIs0?min1:min0;const router=new ethers.utils.Interface(['function addLiquidityETH(address token,uint amountTokenDesired,uint amountTokenMin,uint amountETHMin,address to,uint deadline) payable returns(uint amountToken,uint amountETH,uint liquidity)']);tx={chainId:CHAIN,to:protocol.addresses.V2Router02,data:router.encodeFunctionData('addLiquidityETH',[token,tokenAmount,tokenMin,nativeMin,sender,deadline]),value:nativeAmount.toHexString()}}
  else tx=protocol.v2Liquidity({chainId:CHAIN,tokenA:token0,tokenB:token1,amountA:amount0.toString(),amountB:amount1.toString(),minA:min0.toString(),minB:min1.toString(),recipient:sender,expires:deadline})
 } else if(version==='V3'){
  fee=Number(body.fee);if(!Number.isInteger(fee))throw Error('V3 fee tier gerekli')
  const factory=new ethers.Contract(protocol.addresses.V3Factory,['function getPool(address,address,uint24) view returns(address)','function feeAmountTickSpacing(uint24) view returns(int24)'],provider)
  const [pool,spacing]=await Promise.all([factory.getPool(token0,token1,fee),factory.feeAmountTickSpacing(fee)])
  tickSpacing=Number(spacing);if(!tickSpacing)throw Error('V3 Factory fee tier etkin değil')
  poolState={initialized:pool!==ZERO,pool:pool===ZERO?null:pool}
  const createPool=!poolState.initialized
  if(createPool){sqrtX=sqrt(body,t0.decimals,t1.decimals);tick=v3.TickMath.getTickAtSqrtRatio(sqrtX)}else{const onchain=new ethers.Contract(pool,['function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns(uint128)'],provider);const [slot,liq]=await Promise.all([onchain.slot0(),onchain.liquidity()]);sqrtX=JSBI.BigInt(slot.sqrtPriceX96.toString());tick=Number(slot.tick)}
tickLower=body.tickLower===undefined?range(tickSpacing)[0]:Number(body.tickLower);tickUpper=body.tickUpper===undefined?range(tickSpacing)[1]:Number(body.tickUpper);if(!Number.isInteger(tickLower)||!Number.isInteger(tickUpper)||tickLower>=tickUpper||tickLower%tickSpacing||tickUpper%tickSpacing)throw Error('tick aralığı Factory/tickSpacing ile uyumsuz')
  const poolModel=new v3.Pool(currencies[0],currencies[1],fee,sqrtX.toString(),'0',tick)
  const position=v3.Position.fromAmounts({pool:poolModel,tickLower,tickUpper,amount0:amount0.toString(),amount1:amount1.toString(),useFullPrecision:true})
  if(createPool)try{const create=v3.NonfungiblePositionManager.createCallParameters(poolModel),ct={chainId:CHAIN,to:protocol.addresses.V3PositionManager,data:create.calldata,value:create.value},result=await protocol.simulate(provider,ct,sender);creationSimulation={attempted:true,success:true,simulatedPool:ethers.utils.getAddress(ethers.utils.defaultAbiCoder.decode(['address'],result.result)[0]),gas:result.gas,blockNumber:result.blockNumber}}catch(e){creationSimulation={attempted:true,success:false,reason:e.reason||e.message,code:e.code||null}}
  const params=v3.NonfungiblePositionManager.addCallParameters(position,{recipient:sender,deadline,slippageTolerance:new core.Percent(slip,10000),createPool})
  tx={chainId:CHAIN,to:protocol.addresses.V3PositionManager,data:params.calldata,value:params.value}
 } else {
  fee=Number(body.fee);tickSpacing=Number(body.tickSpacing);const hooks=addr(body.hooks||ZERO)
  if(!Number.isInteger(fee)||fee<0||fee>1000000||!Number.isInteger(tickSpacing)||tickSpacing<1||tickSpacing>32767)throw Error('V4 fee/tickSpacing geçersiz')
  if(hooks!==ZERO)throw Error('Hook callback uyumluluğu doğrulanmadı')
  poolId=v4.Pool.getPoolId(currencies[0],currencies[1],fee,tickSpacing,hooks)
  const state=new ethers.Contract(protocol.addresses.StateView,['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'],provider)
  const [slot,liquidity]=await Promise.all([state.getSlot0(poolId),state.getLiquidity(poolId)])
  const initialized=!ethers.BigNumber.from(slot[0]).isZero()
  poolState={initialized,poolId,sqrtPriceX96:slot[0].toString(),tick:Number(slot[1]),liquidity:liquidity.toString()}
  const createPool=!initialized
  if(createPool){sqrtX=sqrt(body,t0.decimals,t1.decimals);tick=v3.TickMath.getTickAtSqrtRatio(sqrtX)}else{sqrtX=JSBI.BigInt(slot[0].toString());tick=Number(slot[1])}
tickLower=body.tickLower===undefined?range(tickSpacing)[0]:Number(body.tickLower);tickUpper=body.tickUpper===undefined?range(tickSpacing)[1]:Number(body.tickUpper);if(!Number.isInteger(tickLower)||!Number.isInteger(tickUpper)||tickLower>=tickUpper||tickLower%tickSpacing||tickUpper%tickSpacing)throw Error('tick aralığı V4 tickSpacing ile uyumsuz')
  const poolModel=new v4.Pool(currencies[0],currencies[1],fee,tickSpacing,hooks,sqrtX.toString(),'0',tick)
  if(createPool)try{const manager=new ethers.Contract(protocol.addresses.V4PoolManager,['function initialize((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks),uint160) returns(int24)'],provider),data=manager.interface.encodeFunctionData('initialize',[poolModel.poolKey,sqrtX.toString()]),result=await protocol.simulate(provider,{chainId:CHAIN,to:protocol.addresses.V4PoolManager,data,value:'0x00'},sender);creationSimulation={attempted:true,success:true,initializedTick:manager.interface.decodeFunctionResult('initialize',result.result)[0].toString(),gas:result.gas,blockNumber:result.blockNumber}}catch(e){creationSimulation={attempted:true,success:false,reason:e.reason||e.message,code:e.code||null}}
  const position=v4.Position.fromAmounts({pool:poolModel,tickLower,tickUpper,amount0:amount0.toString(),amount1:amount1.toString(),useFullPrecision:true})
  const params=v4.V4PositionManager.addCallParameters(position,{recipient:sender,deadline,slippageTolerance:new core.Percent(slip,10000),createPool,sqrtPriceX96:createPool?sqrtX.toString():undefined,hookData:'0x'})
  tx={chainId:CHAIN,to:protocol.addresses.V4PositionManager,data:params.calldata,value:params.value}
 }
 const approvalsNeeded=txApprovals.length>0,balancesOkay=ethers.BigNumber.from(t0.balance).gte(amount0)&&ethers.BigNumber.from(t1.balance).gte(amount1)
 let simulation={attempted:false,success:false,reason:approvalsNeeded?'Önce allowance işlemleri gerekli':!balancesOkay?'İlk yatırımı karşılayacak bakiye yok':'Simülasyon yapılamadı'}
 if(!approvalsNeeded&&balancesOkay){try{simulation={...(await protocol.simulate(provider,tx,sender)),attempted:true}}catch(e){simulation={attempted:true,success:false,reason:e.reason||e.error?.message||e.message,code:e.code||null}}}
 // If approvals are required, the client performs eth_call + estimateGas again
 // after their receipts and immediately before requesting the liquidity signature.
 const transactionsEnabled=balancesOkay&&(simulation.success||approvalsNeeded)
 return {chainId:CHAIN,protocol:version,token0:t0,token1:t1,initialPrice:version==='V2'?{source:'deposit-ratio',amount0:amount0.toString(),amount1:amount1.toString(),marketReference:null}:poolState.initialized?{source:'on-chain',sqrtPriceX96:sqrtX?.toString()??null}:{source:'user',sqrtPriceX96:sqrtX?.toString()??null},poolState,creationSimulation:creationSimulation||{attempted:false,success:false,reason:'Havuz zaten mevcut'},fee:fee??null,tickSpacing:tickSpacing??null,sqrtPriceX96:sqrtX?.toString()??null,tickLower:tickLower??null,tickUpper:tickUpper??null,amount0:amount0.toString(),amount1:amount1.toString(),slippageBps:slip,deadline,allowanceTransactions:txApprovals,balancesSufficient:balancesOkay,transaction:tx,simulation,transactionsEnabled,broadcast:false}
}
module.exports={prepare}
