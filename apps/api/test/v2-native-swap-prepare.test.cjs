'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),{ethers}=require('ethers')
const adapter=require('../trading-adapter.cjs'),p=require('../protocol.cjs')
const owner='0xb49B53f2d258a17E0fcC9d97ad2b93CB3eF65dBD',token=p.tokens.USDT.address,wrapped=p.addresses.WTURK,pair='0x1111111111111111111111111111111111111111'
const factoryAbi=new ethers.utils.Interface(['function getPair(address,address) view returns(address)'])
const tokenAbi=new ethers.utils.Interface(['function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256) returns(bool)'])
function fixture(allowance='0'){
 const provider={_isProvider:true,getCode:async()=> '0x60006000',getNetwork:async()=>({chainId:1919}),getBlockNumber:async()=>2655,getBlock:async()=>({baseFeePerGas:null}),getBalance:async()=>ethers.BigNumber.from(10).pow(20),estimateGas:async()=>ethers.BigNumber.from(47614),send:async method=>{if(method==='eth_gasPrice')return '0x430e2340';if(method==='eth_maxPriorityFeePerGas')return '0x7735940';throw Error(method)},call:async tx=>{
  const to=String(tx.to).toLowerCase(),selector=tx.data.slice(0,10)
  if(to===p.addresses.V2Factory.toLowerCase()&&selector===factoryAbi.getSighash('getPair'))return factoryAbi.encodeFunctionResult('getPair',[pair])
  if(to===token.toLowerCase()){
   if(selector===tokenAbi.getSighash('balanceOf'))return tokenAbi.encodeFunctionResult('balanceOf',['100000000'])
   if(selector===tokenAbi.getSighash('allowance'))return tokenAbi.encodeFunctionResult('allowance',[allowance])
   if(selector===tokenAbi.getSighash('approve'))return '0x'
  }
  throw Error('Unexpected call '+to+' '+selector)
 }}
 const body={chainId:1919,tokenInChainId:1919,tokenOutChainId:1919,tokenIn:token,tokenOut:ethers.constants.AddressZero,amount:'1000000',type:'EXACT_INPUT',swapper:owner,slippageTolerance:0.5}
 const quote=async()=>({blockNumber:2655,routes:[{protocol:'V2',amountIn:'1000000',amountOut:'748311'}]})
 return {body,provider,quote}
}
test('6663/native quote requires ERC20 approval to the V2 Router02, not Permit2 or Universal Router',async()=>{
 const f=fixture()
 const result=await adapter.prepareV2Swap(f)
 assert.equal(result.execution.stage,'APPROVAL_REQUIRED')
 assert.equal(result.execution.approval.kind,'ERC20_TO_V2_ROUTER')
 assert.equal(result.execution.approval.spender,p.addresses.V2Router02)
 assert.equal(result.route.nativeOutput,true)
 assert.equal(result.execution.approvalSimulation.broadcast,false)
 assert.equal(result.execution.approvalSimulation.gas,'47614')
 const decoded=tokenAbi.decodeFunctionData('approve',result.execution.approval.transaction.data)
 assert.equal(decoded[0],p.addresses.V2Router02);assert.equal(decoded[1].toString(),'1000000')
})
test('V2 native output encodes swapExactTokensForETH and enables only after successful simulation',async()=>{
 const f=fixture('1000000'),original=p.simulate;let captured
 p.simulate=async(_provider,tx,sender)=>{captured={tx,sender};return {success:true,broadcast:false,gas:'180000',fee:{sufficientBalance:true,estimatedFeeWei:'202500000000000',estimatedFeeTURK:'0.0002025'}}}
 try{
  const result=await adapter.prepareV2Swap(f)
  assert.equal(result.execution.enabled,true);assert.equal(result.execution.stage,'READY')
  assert.equal(captured.tx.to,p.addresses.V2Router02);assert.equal(captured.sender,owner)
  const iface=new ethers.utils.Interface(['function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns(uint256[])'])
  const decoded=iface.decodeFunctionData('swapExactTokensForETH',captured.tx.data)
  assert.equal(decoded[0].toString(),'1000000');assert.equal(decoded[1].toString(),'744569')
  assert.deepEqual(decoded[2],[token,wrapped]);assert.equal(decoded[3],owner);assert.equal(captured.tx.value,'0x0')
  assert.equal(result.execution.simulation.fee.estimatedFeeTURK,'0.0002025')
 }finally{p.simulate=original}
})
test('a failed V2 simulation is surfaced and never enabled',async()=>{
 const f=fixture('1000000'),original=p.simulate;p.simulate=async()=>{throw Object.assign(Error('TransferHelper: TRANSFER_FROM_FAILED'),{code:'CALL_EXCEPTION',data:'0x08c379a0'})}
 try{await assert.rejects(adapter.prepareV2Swap(f),e=>e.code==='SWAP_SIMULATION_FAILED'&&e.status===422&&e.details.router===p.addresses.V2Router02)}finally{p.simulate=original}
})
