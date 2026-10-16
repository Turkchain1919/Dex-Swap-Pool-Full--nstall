'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),{ethers}=require('ethers')
const adapter=require('../trading-adapter.cjs'),protocol=require('../protocol.cjs')
const input='0xcd0d7b9eeec0897afcca0f0739ddecb830171271'
const output='0x34974f5c83915762e3ba9c487e09465c801ad9e3'
const owner='0xb49b53f2d258a17e0fcc9d97ad2b93cb3ef65dbd'
const manager=protocol.addresses
const ercIface=new ethers.utils.Interface([
 'function balanceOf(address) view returns(uint256)',
 'function allowance(address,address) view returns(uint256)',
 'function symbol() view returns(string)',
 'function decimals() view returns(uint8)',
])
const permitIface=new ethers.utils.Interface(['function allowance(address,address,address) view returns(uint160,uint48,uint48)'])
const stateIface=new ethers.utils.Interface([
 'function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)',
 'function getLiquidity(bytes32) view returns(uint128)',
])
const permitApprovalIface=new ethers.utils.Interface(['function approve(address,address,uint160,uint48)'])
const ercApprovalIface=new ethers.utils.Interface(['function approve(address,uint256)'])
const poolId='0xc2b96c347958913dee895779c1719354b8b6d159a9bd8daefe9ddb8e1deeee6f'
const poolKey={currency0:output,currency1:input,fee:3000,tickSpacing:60,hooks:ethers.constants.AddressZero}
function fixture({balance='10000000000000000000',ercAllowance='0',p2Amount='0',p2Expiration=0}={}){
 const amount='1000000000000000000'
 const body={chainId:1919,tokenInChainId:1919,tokenOutChainId:1919,tokenIn:input,tokenOut:output,amount,swapper:owner,slippageTolerance:0.5,poolId}
 let simulationCalls=0
 const provider={
  _isProvider:true,
  getCode:async()=> '0x60006000',
  getNetwork:async()=>({chainId:1919}),getBlockNumber:async()=>100,getBlock:async()=>({baseFeePerGas:null}),
  getBalance:async()=>ethers.BigNumber.from(10).pow(20),estimateGas:async()=>ethers.BigNumber.from(47614),
  send:async method=>{if(method==='eth_gasPrice')return '0x430e2340';if(method==='eth_maxPriorityFeePerGas')return '0x7735940';throw Error('Unexpected RPC '+method)},
  call:async tx=>{
   const to=String(tx.to).toLowerCase(),data=tx.data
   if(to===input||to===output){
    const method=data.slice(0,10)
    if(method===ercIface.getSighash('balanceOf'))return ercIface.encodeFunctionResult('balanceOf',[balance])
    if(method===ercIface.getSighash('allowance'))return ercIface.encodeFunctionResult('allowance',[ercAllowance])
    if(method===ercIface.getSighash('symbol'))return ercIface.encodeFunctionResult('symbol',[to===input?'7777':'8888'])
    if(method===ercIface.getSighash('decimals'))return ercIface.encodeFunctionResult('decimals',[18])
   }
   if(to===manager.Permit2.toLowerCase()&&data.slice(0,10)===permitIface.getSighash('allowance')){
    return permitIface.encodeFunctionResult('allowance',[p2Amount,p2Expiration,0])
   }
   if(data.slice(0,10)===ercApprovalIface.getSighash('approve')||data.slice(0,10)===permitApprovalIface.getSighash('approve'))return '0x'
   if(to===manager.StateView.toLowerCase()){
    if(data.slice(0,10)===stateIface.getSighash('getSlot0'))return stateIface.encodeFunctionResult('getSlot0',[ethers.BigNumber.from(2).pow(96),0,3000,3000])
    if(data.slice(0,10)===stateIface.getSighash('getLiquidity'))return stateIface.encodeFunctionResult('getLiquidity',['999999999999999999'])
   }
   throw Error('Unexpected RPC call '+to+' '+data.slice(0,10))
  },
 }
 const quote=async()=>({routes:[{protocol:'V4',poolId,poolKey,amountIn:amount,amountOut:'499248873309964947'}]})
 const oldSimulate=protocol.simulate
 protocol.simulate=async()=>{simulationCalls++;return {success:true,gas:'250000'}}
 return {body,provider,quote,get simulationCalls(){return simulationCalls},restore(){protocol.simulate=oldSimulate}}
}
test('ERC20 allowance is prepared for Permit2 before the execution authorization gate',async()=>{
 const f=fixture()
 try{
  const result=await adapter.prepareV4Swap(f)
  assert.equal(result.execution.stage,'APPROVAL_REQUIRED')
  assert.equal(result.execution.approval.kind,'ERC20_TO_PERMIT2')
  assert.equal(result.execution.approval.spender,manager.Permit2)
  const decoded=ercApprovalIface.decodeFunctionData('approve',result.execution.approval.transaction.data)
  assert.equal(decoded[0],manager.Permit2)
  assert.equal(decoded[1].toString(),f.body.amount)
  assert.equal(result.execution.enabled,false)
  assert.equal(f.simulationCalls,0)
 }finally{f.restore()}
})
test('expired Permit2 allowance prepares a finite authorization for Universal Router',async()=>{
 const f=fixture({ercAllowance:ethers.constants.MaxUint256.toString(),p2Amount:'0',p2Expiration:0})
 try{
  const result=await adapter.prepareV4Swap(f)
  assert.equal(result.execution.stage,'APPROVAL_REQUIRED')
  assert.equal(result.execution.approval.kind,'PERMIT2_TO_UNIVERSAL_ROUTER')
  assert.equal(result.execution.approval.spender,manager.UniversalRouter)
  const decoded=permitApprovalIface.decodeFunctionData('approve',result.execution.approval.transaction.data)
  assert.equal(decoded[0].toLowerCase(),input)
  assert.equal(decoded[1].toLowerCase(),manager.UniversalRouter.toLowerCase())
  assert.equal(decoded[2].toString(),f.body.amount)
  assert.ok(Number(decoded[3])>Math.floor(Date.now()/1000)+1200)
  assert.equal(result.execution.enabled,false)
  assert.equal(f.simulationCalls,0)
 }finally{f.restore()}
})
test('verified allowances remain blocked by authorization and do not simulate or submit a swap',async()=>{
 const f=fixture({ercAllowance:ethers.constants.MaxUint256.toString(),p2Amount:'1000000000000000000',p2Expiration:Math.floor(Date.now()/1000)+3600})
 try{
  const result=await adapter.prepareV4Swap(f)
  assert.equal(result.execution.stage,'AUTHORIZATION_PENDING')
  assert.equal(result.execution.enabled,false)
  assert.equal(result.execution.reason,'V4_PRODUCTION_AUTHORIZATION_PENDING')
  assert.equal(result.execution.transaction,undefined)
  assert.equal(result.execution.simulationRequired,false)
  assert.equal(result.execution.simulation.success,true)
  assert.equal(f.simulationCalls,1)
 }finally{f.restore()}
})
test('failed router simulation is propagated while authorization remains closed',async()=>{
 const f=fixture({ercAllowance:ethers.constants.MaxUint256.toString(),p2Amount:'100000000000000000000',p2Expiration:Math.floor(Date.now()/1000)+3600})
 const original=protocol.simulate
 protocol.simulate=async()=>{throw Object.assign(Error('AllowanceExpired(0)'),{code:'CALL_EXCEPTION',details:{revertData:'0x'}})}
 try{await assert.rejects(adapter.prepareV4Swap(f),e=>e.code==='CALL_EXCEPTION'&&e.message==='AllowanceExpired(0)')}
 finally{protocol.simulate=original;f.restore()}
})
test('insufficient input balance fails before approval preparation',async()=>{
 const f=fixture({balance:'10'})
 try{
  const result=await adapter.prepareV4Swap(f)
  assert.equal(result.execution.stage,'FAILED')
  assert.equal(result.execution.reason,'INSUFFICIENT_TOKEN_BALANCE')
  assert.equal(f.simulationCalls,0)
 }finally{f.restore()}
})
test('approval endpoint reports missing Permit2 authorization while production is gated',async()=>{
 const f=fixture({ercAllowance:ethers.constants.MaxUint256.toString(),p2Amount:'0',p2Expiration:0})
 try{
  const result=await adapter.checkSwapApproval({body:{chainId:1919,walletAddress:owner,token:input,amount:f.body.amount},provider:f.provider})
  assert.equal(result.authorizationPending,true)
  assert.equal(result.approval.to.toLowerCase(),manager.Permit2.toLowerCase())
 }finally{f.restore()}
})
