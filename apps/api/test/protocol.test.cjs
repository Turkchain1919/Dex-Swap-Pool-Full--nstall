const {test}=require('node:test'),assert=require('node:assert/strict')
const {ethers}=require('ethers'),core=require('@uniswap/sdk-core'),v3=require('@uniswap/v3-sdk'),v4=require('@uniswap/v4-sdk')
const p=require('../protocol.cjs')
const recipient='0x1111111111111111111111111111111111111111'
const expires=()=>Math.floor(Date.now()/1000)+600
const sqrt=ethers.BigNumber.from(2).pow(96).toString()
const pool3=new v3.Pool(p.tokens.WTURK,p.tokens.USDT,3000,sqrt,'1000000000000000000',0)
const pool4=new v4.Pool(p.tokens.WTURK,p.tokens.USDT,3000,60,ethers.constants.AddressZero,sqrt,'1000000000000000000',0)
const position3=new v3.Position({pool:pool3,liquidity:'1000000000',tickLower:-60,tickUpper:60})
const position4=new v4.Position({pool:pool4,liquidity:'1000000000',tickLower:-60,tickUpper:60})
test('native and token decimal metadata remain independent',()=>{assert.equal(p.native.name,'TC');assert.equal(p.native.symbol,'TURK');assert.equal(p.native.decimals,18);assert.equal(p.native.wrapped.address,p.tokens.WTURK.address);assert.equal(p.tokens.USDT.decimals,6)})
test('all unsigned V2 swaps are restricted to 1919',()=>assert.throws(()=>p.v2Swap({chainId:1}),/1919/))
test('V2 exact input retains minimum received and deadline',()=>{const tx=p.v2Swap({chainId:1919,amountSpecified:'1000',limit:'900',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:expires()});const abi=new ethers.utils.Interface(['function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)']);const args=abi.decodeFunctionData('swapExactTokensForTokens',tx.data);assert.equal(args[1].toString(),'900');assert.equal(tx.to,p.addresses.V2Router02);assert.equal(Object.hasOwn(tx,'simulationRequired'),false)})
test('V2 exact output retains maximum spent',()=>{const tx=p.v2Swap({chainId:1919,exactOutput:true,amountSpecified:'900',limit:'1000',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:expires()});const abi=new ethers.utils.Interface(['function swapTokensForExactTokens(uint256,uint256,address[],address,uint256)']);assert.equal(abi.decodeFunctionData('swapTokensForExactTokens',tx.data)[1].toString(),'1000')})
test('expired calldata cannot be constructed',()=>assert.throws(()=>p.v2Swap({chainId:1919,amountSpecified:'1',limit:'1',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:1}),/Deadline/))
test('zero output floor cannot be constructed',()=>assert.throws(()=>p.v2Swap({chainId:1919,amountSpecified:'1',limit:'0',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:expires()}),/range/))
test('cyclic paths cannot be constructed',()=>assert.throws(()=>p.v2Swap({chainId:1919,amountSpecified:'1',limit:'1',path:[recipient,recipient],recipient,expires:expires()}),/Cyclic/))
test('V2 liquidity encodes the deployed router',()=>{for(const remove of [false,true]){const tx=p.v2Liquidity({chainId:1919,remove,tokenA:p.tokens.WTURK.address,tokenB:p.tokens.USDT.address,amountA:'1000',amountB:'2000',liquidity:'500',minA:'1',minB:'1',recipient,expires:expires()});assert.equal(tx.to,p.addresses.V2Router02)}})
test('V3 mint uses official position math and deployed manager',()=>{const tx=p.positionCall(3,'add',position3,{recipient,deadline:expires().toString(),slippageTolerance:new core.Percent(50,10000)});assert.equal(tx.to,p.addresses.V3PositionManager);assert.ok(tx.data.length>10)})
test('V4 mint uses official action planner and deployed manager',()=>{const tx=p.positionCall(4,'add',position4,{recipient,deadline:expires().toString(),slippageTolerance:new core.Percent(50,10000)});assert.equal(tx.to,p.addresses.V4PositionManager);assert.ok(tx.data.length>10)})
test('V4 initialization uses official pool key encoding',()=>{const tx=p.v4Initialize(pool4,sqrt);assert.equal(tx.to,p.addresses.V4PositionManager);assert.ok(tx.data.length>10)})
test('V4 swaps require verified router command version',()=>assert.throws(()=>p.v4Swap({chainId:1919,pool:pool4,zeroForOne:true,amountSpecified:'1000',limit:'900',expires:expires()}),/2\.2\.0/))
for(const exactOutput of [false,true])test('V4 '+(exactOutput?'exact output':'exact input')+' wraps official actions in UniversalRouter execute',()=>{const tx=p.v4Swap({chainId:1919,pool:pool4,zeroForOne:true,exactOutput,amountSpecified:'1000',limit:'900',expires:expires(),routerVersion:'2.2.0'});const abi=new ethers.utils.Interface(['function execute(bytes,bytes[],uint256) payable']);const args=abi.decodeFunctionData('execute',tx.data);assert.equal(args[0],'0x10');assert.equal(args[1].length,1);assert.equal(tx.to,p.addresses.UniversalRouter);assert.equal(tx.value,'0x0')})
test('excessive position slippage is rejected',()=>assert.throws(()=>p.positionCall(3,'add',position3,{recipient,deadline:expires().toString(),slippageTolerance:new core.Percent(99,100)}),/slippage/))
test('simulation refuses wrong network without broadcasting',async()=>{await assert.rejects(()=>p.simulate({getNetwork:async()=>({chainId:1})},{chainId:1919},recipient),/1919/)})

test('raw RPC reverts cannot be treated as successful simulations',async()=>{
 let estimated=false
 const provider={getNetwork:async()=>({chainId:1919}),getBlockNumber:async()=>123,send:async()=>{throw new Error('execution reverted')},estimateGas:async()=>{estimated=true;return ethers.BigNumber.from(1)}}
 await assert.rejects(()=>p.simulate(provider,{chainId:1919,to:p.addresses.UniversalRouter,data:'0x',value:'0x00'},recipient),/execution reverted/)
 assert.equal(estimated,false)
})

test('ABI-encoded revert payload returned by eth_call is decoded before gas estimation',async()=>{
 let estimated=false
 const revert=ethers.utils.hexConcat(['0x08c379a0',ethers.utils.defaultAbiCoder.encode(['string'],['TransferHelper::transferFrom: transferFrom failed'])])
 const provider={getNetwork:async()=>({chainId:1919}),getBlockNumber:async()=>123,send:async()=>revert,estimateGas:async()=>{estimated=true;return ethers.BigNumber.from(1)}}
 await assert.rejects(()=>p.simulate(provider,{chainId:1919,to:p.addresses.V2Router02,data:'0x',value:'0x00'},recipient),/TransferHelper::transferFrom: transferFrom failed/)
 assert.equal(estimated,false)
})

test('Turkchain verified UniversalRouter 2.2.0 layout is required',()=>{for(const routerVersion of ['2.0','2.1.1'])assert.throws(()=>p.v4Swap({chainId:1919,pool:pool4,zeroForOne:true,amountSpecified:'1000',limit:'900',expires:expires(),routerVersion}),/2\.2\.0/)})

test('native V2 exact-input sends exactly the chosen TURK amount',()=>{
 const tx=p.v2NativeSwap({chainId:1919,nativeInput:true,amountSpecified:'1000',limit:'900',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:expires()})
 assert.equal(ethers.BigNumber.from(tx.value).toString(),'1000')
 const iface=new ethers.utils.Interface(['function swapExactETHForTokens(uint256,address[],address,uint256) payable'])
 assert.equal(iface.decodeFunctionData('swapExactETHForTokens',tx.data)[0].toString(),'900')
})
test('native V2 exact-output caps TURK payment at maximum',()=>{
 const tx=p.v2NativeSwap({chainId:1919,nativeInput:true,exactOutput:true,amountSpecified:'900',limit:'1000',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:expires()})
 assert.equal(ethers.BigNumber.from(tx.value).toString(),'1000')
})
test('native output sends no TURK and unwraps only the correct path',()=>{
 const tx=p.v2NativeSwap({chainId:1919,nativeInput:false,amountSpecified:'1000',limit:'900',path:[p.tokens.USDT.address,p.tokens.WTURK.address],recipient,expires:expires()})
 assert.equal(ethers.BigNumber.from(tx.value).toString(),'0')
 assert.throws(()=>p.v2NativeSwap({chainId:1919,nativeInput:false,amountSpecified:'1000',limit:'900',path:[p.tokens.WTURK.address,p.tokens.USDT.address],recipient,expires:expires()}),/WTURK/)
})
test('native wrap and unwrap retain exact base-unit amounts',()=>{
 const wrap=p.wrapNative({chainId:1919,amountSpecified:'1000'}),unwrap=p.wrapNative({chainId:1919,unwrap:true,amountSpecified:'1000'})
 assert.equal(wrap.to,p.addresses.WTURK);assert.equal(wrap.data,'0xd0e30db0');assert.equal(ethers.BigNumber.from(wrap.value).toString(),'1000')
 const iface=new ethers.utils.Interface(['function withdraw(uint256)']);assert.equal(iface.decodeFunctionData('withdraw',unwrap.data)[0].toString(),'1000')
})

test('successful Turkchain simulation reports RPC-derived TURK gas and balance',async()=>{
 const provider={
  getNetwork:async()=>({chainId:1919}),getBlockNumber:async()=>123,
  send:async(method)=>method==='eth_call'?'0x':method==='eth_gasPrice'?'0x430e2340':method==='eth_maxPriorityFeePerGas'?'0x7735940':(()=>{throw Error(method)})(),
  getBlock:async()=>({baseFeePerGas:'0x3b9aca00'}),estimateGas:async()=>ethers.BigNumber.from(100000),
  getBalance:async()=>ethers.BigNumber.from(10).pow(18)
 }
 const result=await p.simulate(provider,{chainId:1919,to:p.addresses.UniversalRouter,data:'0x',value:'0x0'},recipient)
 assert.equal(result.success,true);assert.equal(result.broadcast,false)
 assert.equal(result.fee.model,'eip1559');assert.equal(result.fee.gasEstimate,'100000')
 assert.equal(result.fee.estimatedFeeTURK,'0.0001125');assert.equal(result.fee.maximumFeeTURK,'0.0002125')
 assert.equal(result.fee.sufficientBalance,true)
})

test('Permit2 revert selectors decode without masking unknown errors',()=>{
 const iface=new ethers.utils.Interface(['error AllowanceExpired(uint256 deadline)'])
 const data=iface.encodeErrorResult('AllowanceExpired',[0])
 assert.deepEqual(p.decodeRevert(data),{name:'AllowanceExpired',args:['0'],selector:'0xd81b2f2e'})
 assert.deepEqual(p.decodeRevert('0x12345678'),{selector:'0x12345678'})
 assert.equal(p.decodeRevert('not-data'),null)
})
