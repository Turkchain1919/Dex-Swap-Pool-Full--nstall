const {test}=require('node:test'),assert=require('node:assert/strict'),{ethers}=require('ethers'),{tradingQuote}=require('../trading-adapter.cjs'),p=require('../protocol.cjs')
const owner='0x1111111111111111111111111111111111111111'
const body={tokenInChainId:1919,tokenOutChainId:1919,tokenIn:p.tokens.WTURK.address,tokenOut:p.tokens.USDT.address,amount:'1000',type:'EXACT_INPUT',swapper:owner,slippageTolerance:0.5}
const factoryAbi=new ethers.utils.Interface(['function getPair(address,address) view returns(address)'])
const pairAbi=new ethers.utils.Interface(['function token0() view returns(address)','function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)'])
const v3Abi=new ethers.utils.Interface(['function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)','function liquidity() view returns(uint128)'])
const v4Abi=new ethers.utils.Interface(['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'])
function fixture(version){
 const best={protocol:version,amountIn:'1000',amountOut:'900',pool:owner,fee:3000,poolId:ethers.constants.HashZero,...(version==='V2'?{}:{gasEstimate:'145000'}),poolKey:{fee:3000,tickSpacing:60,hooks:ethers.constants.AddressZero}}
 const quote=async()=>({chainId:1919,blockNumber:100,tokenIn:body.tokenIn,tokenOut:body.tokenOut,tradeType:'EXACT_INPUT',routes:[best]})
 const provider={_isProvider:true,send:async(method)=>method==='eth_gasPrice'?ethers.utils.parseUnits('1','gwei').toHexString():ethers.utils.parseUnits('0.1','gwei').toHexString(),getBlock:async()=>({baseFeePerGas:ethers.utils.parseUnits('0.5','gwei')}),getBalance:async()=>ethers.utils.parseEther('1'),call:async(tx,block)=>{
  assert.equal(block,100)
  for(const [abi,method,result]of [
   [factoryAbi,'getPair',[owner]],[pairAbi,'token0',[p.tokens.WTURK.address]],[pairAbi,'token1',[p.tokens.USDT.address]],[pairAbi,'getReserves',['1000000','1000000',0]],
   [v3Abi,'slot0',[ethers.BigNumber.from(2).pow(96),0,0,1,1,0,true]],[v3Abi,'liquidity',['1000000']],
   [v4Abi,'getSlot0',[ethers.BigNumber.from(2).pow(96),0,0,3000]],[v4Abi,'getLiquidity',['1000000']]
  ])if(tx.data.startsWith(abi.getSighash(method)))return abi.encodeFunctionResult(method,result)
  throw Error('Unexpected call')
 }}
 return {body,provider,quote}
}
for(const version of ['V2','V3','V4'])test(version+' response preserves verified block, raw quote and native precision',async()=>{
 const result=await tradingQuote(fixture(version))
 assert.equal(result.routing,'CLASSIC');assert.equal(result.quote.blockNumber,'100');assert.equal(result.quote.route[0][0].type,version.toLowerCase()+'-pool')
 assert.equal(result.quote.input.amount,'1000');assert.equal(result.quote.output.amount,'900')
 assert.equal(result.quote.route[0][0].tokenOut.decimals,'6');assert.equal(result.execution.enabled,false)
 assert.equal(result.quote.aggregatedOutputs[0].minAmount,'895');assert.equal(result.permitData,null)
 assert.equal('gasFeeUSD' in result.quote,false);assert.equal(result.quote.gasEstimateStatus,version==='V2'?'APPROXIMATE':'QUOTER_ESTIMATE');assert.equal(result.quote.gasUseEstimate,version==='V2'?'135000':'145000');assert.ok(result.quote.estimatedFeeTURK);assert.equal(result.quote.gasEstimateError,null)
})
test('wrap response uses protocol one-to-one amount and no pool fiction',async()=>{
 const f=fixture('WRAP');f.quote=async()=>({blockNumber:100,tradeType:'EXACT_INPUT',tokenIn:ethers.constants.AddressZero,tokenOut:p.tokens.WTURK.address,routes:[{protocol:'WRAP',amountIn:'1000',amountOut:'1000'}]})
 const result=await tradingQuote(f);assert.equal(result.routing,'WRAP');assert.equal(result.quote.input.amount,result.quote.output.amount);assert.equal(result.quote.route,undefined)
})
test('unavailable on-chain quotes remain unavailable in official API adapter',async()=>{
 const f=fixture('V2');f.quote=async()=>{throw Object.assign(Error('No liquidity'),{status:422,code:'NO_LIQUIDITY'})}
 await assert.rejects(tradingQuote(f),e=>e.status===422&&e.code==='NO_LIQUIDITY')
})
test('cross-chain, slippage and malformed swapper are rejected before RPC',async()=>{
 for(const update of [{tokenOutChainId:1},{slippageTolerance:25},{swapper:'broken'}]){
  const f=fixture('V2');f.body={...body,...update};f.quote=async()=>{throw Error('must not query')}
  await assert.rejects(tradingQuote(f),e=>e.status===400)
 }
})

test('V4 production execution requires explicit private environment activation',()=>{
 const had=Object.prototype.hasOwnProperty.call(process.env,'TURKDEX_V4_PRODUCTION_AUTHORIZED'),old=process.env.TURKDEX_V4_PRODUCTION_AUTHORIZED
 delete process.env.TURKDEX_V4_PRODUCTION_AUTHORIZED
 assert.equal(require('../trading-adapter.cjs').v4ProductionAuthorized(),false)
 process.env.TURKDEX_V4_PRODUCTION_AUTHORIZED='true'
 assert.equal(require('../trading-adapter.cjs').v4ProductionAuthorized(),true)
 if(had)process.env.TURKDEX_V4_PRODUCTION_AUTHORIZED=old;else delete process.env.TURKDEX_V4_PRODUCTION_AUTHORIZED
})
