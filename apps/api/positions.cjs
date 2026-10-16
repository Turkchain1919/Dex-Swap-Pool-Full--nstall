'use strict'
const {ethers}=require('ethers'),{Token}=require('@uniswap/sdk-core'),{NonfungiblePositionManager}=require('@uniswap/v3-sdk'),{V4PositionManager,Pool:V4Pool,Position:V4Position}=require('@uniswap/v4-sdk')
function named(args){return Object.fromEntries(Object.entries(args).filter(([k])=>!/^\d+$/.test(k)).map(([k,v])=>[k,ethers.BigNumber.isBigNumber(v)?v.toString():Array.isArray(v)?named(v):v]))}
async function positions({provider,indexer,registry,owner,offset=0,limit=25}){
 const state=indexer.state,block=state.confirmedBlock
 if(!state.nftHistoryComplete)throw Object.assign(Error('Position history is still indexing'),{status:503,code:'INDEXING'})
 const result={chainId:1919,owner,blockNumber:block,offset,limit,positions:[],errors:[],transactionsEnabled:false}
 const refs=[]
 for(const [version,name]of [['V3','V3PositionManager'],['V4','V4PositionManager']]){
  for(const tokenId of indexer.owners(registry.contracts[name],owner))refs.push({version,name,tokenId})
 }
 result.totalNftPositions=refs.length;result.nextOffset=offset+limit<refs.length?offset+limit:null
 for(const ref of refs.slice(offset,offset+limit)){
  const abi=ref.version==='V3'?NonfungiblePositionManager.INTERFACE:V4PositionManager.INTERFACE
  const manager=new ethers.Contract(registry.contracts[ref.name],abi,provider)
  try{
   const actual=await manager.ownerOf(ref.tokenId,{blockTag:block})
   if(actual.toLowerCase()!==owner.toLowerCase())throw Error('Indexed owner differs from chain')
   if(ref.version==='V3'){
    const data=await manager.positions(ref.tokenId,{blockTag:block})
    result.positions.push({protocol:'V3',manager:manager.address,tokenId:ref.tokenId,owner:actual,parameters:named(data)})
   }else{
    const data=await manager.getPoolAndPositionInfo(ref.tokenId,{blockTag:block}),liquidity=await manager.getPositionLiquidity(ref.tokenId,{blockTag:block}),poolKey={currency0:data[0][0],currency1:data[0][1],fee:Number(data[0][2]),tickSpacing:Number(data[0][3]),hooks:data[0][4]}
    const poolId=V4Pool.getPoolId(new Token(1919,poolKey.currency0,18),new Token(1919,poolKey.currency1,18),poolKey.fee,poolKey.tickSpacing,poolKey.hooks)
    const stateView=new ethers.Contract(registry.contracts.StateView,['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'],provider)
    let slot,poolLiquidity
    try{[slot,poolLiquidity]=await Promise.all([stateView.getSlot0(poolId,{blockTag:block}),stateView.getLiquidity(poolId,{blockTag:block})])}catch(stateError){result.errors.push({protocol:'V4_STATE',tokenId:ref.tokenId,message:stateError.reason||stateError.message})}
    const modifyInterface=new ethers.utils.Interface(['event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'])
    const tokenSalt=ethers.utils.hexZeroPad(ethers.BigNumber.from(ref.tokenId).toHexString(),32)
    let positionTicks
    for(const log of indexer.state.v4LiquidityEvents||[]){
     if(log.blockNumber&&parseInt(log.blockNumber,16)<=block&&log.topics[1]?.toLowerCase()===poolId.toLowerCase()&&log.topics[2]?.toLowerCase()===ethers.utils.hexZeroPad(registry.contracts.V4PositionManager.toLowerCase(),32).toLowerCase()){
      try{const event=modifyInterface.parseLog(log);if(event.args.salt.toLowerCase()===tokenSalt.toLowerCase())positionTicks={tickLower:event.args.tickLower,tickUpper:event.args.tickUpper}}catch{}
     }
    }
    const currentTick=slot?Number(slot[1]):undefined,positionLiquidity=liquidity.toString()
    const mintLog=(indexer.state.nftTransfers||[]).find(log=>log.address.toLowerCase()===manager.address.toLowerCase()&&log.topics?.[3]?.toLowerCase()===tokenSalt.toLowerCase()&&log.topics?.[1]===ethers.utils.hexZeroPad(ethers.constants.AddressZero,32))
    const poolLog=(state.contracts.find(c=>c.name==='V4PoolManager')?.logs||[]).find(log=>log.topics?.[1]?.toLowerCase()===poolId.toLowerCase())
    let amounts
    if(slot&&poolLiquidity&&!liquidity.isZero()&&positionTicks){
     try{
      const tokenAbi=['function decimals() view returns(uint8)']
      const [decimals0,decimals1]=await Promise.all([new ethers.Contract(poolKey.currency0,tokenAbi,provider).decimals({blockTag:block}),new ethers.Contract(poolKey.currency1,tokenAbi,provider).decimals({blockTag:block})])
      const token0=new Token(1919,poolKey.currency0,decimals0),token1=new Token(1919,poolKey.currency1,decimals1)
      const pool=new V4Pool(token0,token1,poolKey.fee,poolKey.tickSpacing,poolKey.hooks,slot[0].toString(),poolLiquidity.toString(),currentTick)
      const position=new V4Position({pool,liquidity:positionLiquidity,tickLower:positionTicks.tickLower,tickUpper:positionTicks.tickUpper})
      amounts={currency0:position.amount0.quotient.toString(),currency1:position.amount1.quotient.toString(),decimals0,decimals1}
     }catch(amountError){result.errors.push({protocol:'V4_AMOUNTS',tokenId:ref.tokenId,message:amountError.reason||amountError.message})}
    }
    result.positions.push({protocol:'V4',manager:manager.address,tokenId:ref.tokenId,owner:actual,poolId,poolKey,positionInfo:data[1].toString(),liquidity:positionLiquidity,poolLiquidity:poolLiquidity?.toString(),sqrtPriceX96:slot?.[0]?.toString(),currentTick,tickLower:positionTicks?.tickLower,tickUpper:positionTicks?.tickUpper,fee:poolKey.fee,tickSpacing:poolKey.tickSpacing,hooks:poolKey.hooks,inRange:positionTicks&&currentTick!==undefined?currentTick>=positionTicks.tickLower&&currentTick<positionTicks.tickUpper:null,amounts,mintTransaction:mintLog?.transactionHash,mintBlock:mintLog?parseInt(mintLog.blockNumber,16):undefined,poolCreatedTransaction:poolLog?.transactionHash,status:liquidity.isZero()?'CLOSED':'ACTIVE'})
   }
  }catch(e){result.errors.push({protocol:ref.version,tokenId:ref.tokenId,message:e.reason||e.message})}
 }
 // V2 ERC20 liquidity ownership is read directly at the same confirmed block.
 if(offset===0)for(const pool of state.contracts.find(c=>c.name==='V2Factory').logs){
  const event=new ethers.utils.Interface(['event PairCreated(address indexed token0,address indexed token1,address pair,uint256)']).parseLog(pool)
  const pair=new ethers.Contract(event.args.pair,['function balanceOf(address) view returns(uint256)','function totalSupply() view returns(uint256)','function getReserves() view returns(uint112,uint112,uint32)'],provider)
  try{
   const balance=await pair.balanceOf(owner,{blockTag:block})
   if(balance.isZero())continue
   const supply=await pair.totalSupply({blockTag:block}),reserves=await pair.getReserves({blockTag:block})
   result.positions.push({protocol:'V2',pair:pair.address,token0:event.args.token0,token1:event.args.token1,balance:balance.toString(),totalSupply:supply.toString(),reserves:reserves.slice(0,2).map(n=>n.toString())})
  }catch(e){result.errors.push({protocol:'V2',pair:pair.address,message:e.reason||e.message})}
 }
 return result
}
module.exports={positions,named}
