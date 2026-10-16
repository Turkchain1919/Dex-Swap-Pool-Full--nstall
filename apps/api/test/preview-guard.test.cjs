const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module')
const base=path.resolve(__dirname,'../..'),esbuild=require(path.join(base,'interface/node_modules/esbuild'))
const file=path.join(base,'interface/apps/web/src/components/Web3Provider/guardPreviewProvider.ts')
const compiled=esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:'ts',format:'cjs'}).code
const mod=new Module(file);mod.filename=file;mod.paths=module.paths;mod._compile(compiled,file)
const {guardPreviewProvider}=mod.exports
const router='0xdc7b359f51aede279a03cffecdb67a5e8a95d928',manager3='0x5c94d023888ea4f845fed5b83592f20ce4200945',manager4='0x4546402d50386b42883bd15960054440b8e96b74',token='0x0000000000000000000000000000000000001234'
test('preview preserves read-only wallet requests',async()=>{let calls=0;const provider={request:async({method})=>{calls++;return method==='eth_chainId'?'0x77f':['0x1111111111111111111111111111111111111111']}};guardPreviewProvider(provider);assert.equal(await provider.request({method:'eth_chainId'}),'0x77f');assert.equal(calls,1)})
test('V2 addLiquidity and addLiquidityETH are allowed only on Turkchain',async()=>{let sent=0;const provider={request:async({method})=>{if(method==='eth_chainId')return '0x77f';sent++;return '0xhash'}};guardPreviewProvider(provider);for(const data of ['0xe8e33700','0xf305d719'])assert.equal(await provider.request({method:'eth_sendTransaction',params:[{to:router,data}]}),'0xhash');assert.equal(sent,2)})
function makeV4InitialPositionData(owner){
 const core=require('@uniswap/sdk-core'),v4=require('@uniswap/v4-sdk')
 const token0=new core.Token(1919,'0x34974f5c83915762e3ba9c487e09465c801ad9e3',18,'8888')
 const token1=new core.Token(1919,'0xcd0d7b9eeec0897afcca0f0739ddecb830171271',18,'7777')
 const sqrt=require('jsbi').BigInt('79228162514264337593543950336')
 const pool=new v4.Pool(token0,token1,3000,60,'0x0000000000000000000000000000000000000000',sqrt,'0',0)
 const position=v4.Position.fromAmounts({pool,tickLower:-60,tickUpper:60,amount0:'10000000000000000000',amount1:'10000000000000000000',useFullPrecision:true})
 return v4.V4PositionManager.addCallParameters(position,{recipient:owner,deadline:Math.floor(Date.now()/1000)+600,slippageTolerance:new core.Percent(50,10000),createPool:true,sqrtPriceX96:sqrt.toString(),hookData:'0x'}).calldata
}
test('V3 multicall remains allowlisted and V4 initial pool batch allows only verified initialize plus mint',async()=>{
 const owner='0x1111111111111111111111111111111111111111'
 const provider={request:async({method})=>method==='eth_chainId'?'0x77f':'0xhash'};guardPreviewProvider(provider)
 assert.equal(await provider.request({method:'eth_sendTransaction',params:[{to:manager3,data:'0xac9650d8'}]}),'0xhash')
 const data=makeV4InitialPositionData(owner)
 assert.equal(data.slice(0,10),'0xac9650d8')
 assert.equal(await provider.request({method:'eth_sendTransaction',params:[{from:owner,to:manager4,data}]}),'0xhash')
 const bad=new (require('ethers').utils.Interface)(['function multicall(bytes[])']).encodeFunctionData('multicall',[[data,'0x12345678']])
 await assert.rejects(()=>provider.request({method:'eth_sendTransaction',params:[{from:owner,to:manager4,data:bad}]}),e=>e.code===4100)
})
test('ERC20 approvals are limited to known TurkDex liquidity spenders',async()=>{const provider={request:async({method})=>method==='eth_chainId'?'0x77f':'0xhash'};guardPreviewProvider(provider);const approve=spender=>'0x095ea7b3'+('0'.repeat(24))+spender.slice(2).toLowerCase()+('0'.repeat(64));for(const spender of [router,manager3,'0x000000000022d473030f116ddee9f6b43ac78ba3'])assert.equal(await provider.request({method:'eth_sendTransaction',params:[{to:token,data:approve(spender)}]}),'0xhash')})
test('Permit2 approve is allowlisted only for V4 PositionManager or UniversalRouter',async()=>{const provider={request:async({method})=>method==='eth_chainId'?'0x77f':'0xhash'};guardPreviewProvider(provider);const permit2='0x000000000022d473030f116ddee9f6b43ac78ba3';const word=a=>'0'.repeat(24)+a.slice(2).toLowerCase();const data='0x87517c45'+word(token)+word(manager4)+'0'.repeat(64)+'0'.repeat(64);assert.equal(data.length,266);assert.equal(await provider.request({method:'eth_sendTransaction',params:[{to:permit2,data}]}),'0xhash');const routerPermit='0x87517c45'+word(token)+word('0xed871168347a8fa91d6503a5b1fe9a7fd3c62fab')+'0'.repeat(64)+'0'.repeat(64);assert.equal(await provider.request({method:'eth_sendTransaction',params:[{to:permit2,data:routerPermit}]}),'0xhash');const bad='0x87517c45'+word(token)+word(router)+'0'.repeat(64)+'0'.repeat(64);await assert.rejects(()=>provider.request({method:'eth_sendTransaction',params:[{to:permit2,data:bad}]}),e=>e.code===4100)})

function makeV4SwapData(){
 const {ethers}=require('ethers'),v4=require('@uniswap/v4-sdk'),ur=require('@uniswap/universal-router-sdk')
 const planner=new v4.V4Planner(),a='0x34974f5c83915762e3ba9c487e09465c801ad9e3',b='0xcd0d7b9eeec0897afcca0f0739ddecb830171271'
 const poolKey={currency0:a,currency1:b,fee:3000,tickSpacing:60,hooks:'0x0000000000000000000000000000000000000000'}
 planner.addAction(v4.Actions.SWAP_EXACT_IN_SINGLE,[{poolKey,zeroForOne:true,amountIn:'1000',amountOutMinimum:'1',hookData:'0x',minHopPriceX36:0}],'2.2.0')
 planner.addAction(v4.Actions.SETTLE_ALL,[a,'1000'])
 planner.addAction(v4.Actions.TAKE_ALL,[b,'1'])
 const route=new ur.RoutePlanner();route.addCommand(ur.CommandType.V4_SWAP,[planner.finalize()])
 return new ethers.utils.Interface(['function execute(bytes,bytes[],uint256)']).encodeFunctionData('execute',[route.commands,route.inputs,Math.floor(Date.now()/1000)+600])
}
test('only canonical V4 exact-input UniversalRouter execute is allowlisted',async()=>{
 const provider={request:async({method})=>method==='eth_chainId'?'0x77f':'0xhash'};guardPreviewProvider(provider)
 const data=makeV4SwapData()
 assert.equal(await provider.request({method:'eth_sendTransaction',params:[{from:'0x1111111111111111111111111111111111111111',to:'0xed871168347a8fa91d6503a5b1fe9a7fd3c62fab',data}]}),'0xhash')
 await assert.rejects(()=>provider.request({method:'eth_sendTransaction',params:[{to:'0xed871168347a8fa91d6503a5b1fe9a7fd3c62fab',data:'0x12345678'}]}),e=>e.code===4100)
})

test('swaps, unknown targets, wrong chain and raw/signature methods remain blocked',async()=>{let sends=0;const provider={request:async({method})=>{if(method==='eth_chainId')return '0x1';sends++;return 'unexpected'}};guardPreviewProvider(provider);for(const request of [
 {method:'eth_sendTransaction',params:[{to:router,data:'0x38ed1739'}]},
 {method:'eth_sendTransaction',params:[{to:'0x0000000000000000000000000000000000009999',data:'0xe8e33700'}]},
 {method:'eth_sendTransaction',params:[{to:manager3,data:'0xac9650d8'}]},
 {method:'eth_sendRawTransaction',params:['0x1234']},{method:'eth_sign',params:[]},{method:'eth_signTypedData_v4',params:[]},{method:'personal_sign',params:[]},{method:'wallet_sendCalls',params:[]}
 ])await assert.rejects(()=>provider.request(request),e=>e.code===4100);assert.equal(sends,0)})
test('preview guard installation is idempotent',async()=>{let calls=0;const provider={request:async()=>{calls++;return '0x77f'}};guardPreviewProvider(provider);guardPreviewProvider(provider);assert.equal(await provider.request({method:'eth_chainId'}),'0x77f');assert.equal(calls,1)})

test('standard fixed-supply TurkDex token deployment is allowed only as exact creation bytecode on 1919',async()=>{
 const artifact=require('../../interface/apps/web/src/features/tokens/TurkDexFixedSupplyToken.json')
 const {ethers}=require('ethers')
 const data=new ethers.ContractFactory(artifact.abi,artifact.bytecode).getDeployTransaction('Demo Token','DEMO',18,ethers.utils.parseUnits('1000',18),'0x1111111111111111111111111111111111111111').data
 let sent=0
 const provider={request:async({method})=>{if(method==='eth_chainId')return '0x77f';sent++;return '0xdeployhash'}}
 guardPreviewProvider(provider)
 assert.equal(await provider.request({method:'eth_sendTransaction',params:[{data}]}),'0xdeployhash')
 assert.equal(sent,1)
 const other={request:async({method})=>method==='eth_chainId'?'0x1':'unexpected'}
 guardPreviewProvider(other)
 await assert.rejects(other.request({method:'eth_sendTransaction',params:[{data}]}),e=>e.code===4100)
})
