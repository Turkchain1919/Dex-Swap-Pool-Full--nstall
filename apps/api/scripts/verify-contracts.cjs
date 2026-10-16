const fs = require('node:fs')
const path = require('node:path')
const { ethers } = require('ethers')
const { Token, CurrencyAmount } = require('@uniswap/sdk-core')
const { Pair, computePairAddress } = require('@uniswap/v2-sdk')
const { computePoolAddress, Pool, Route, Trade } = require('@uniswap/v3-sdk')
const base = path.resolve(__dirname, '../..')
const registry = JSON.parse(fs.readFileSync(path.join(base, 'registry.json')))
const address = Object.fromEntries(Object.entries(registry.contracts).map(([k,v])=>[k,ethers.utils.getAddress(v.toLowerCase())]))
const provider = new ethers.providers.JsonRpcProvider({url:registry.rpc, timeout:20000}, 1919)
const report = { started: new Date().toISOString(), chainId:1919, contracts:{}, v2:{}, v3:{}, v4:{}, rpc:{} }
let block
function json(value){return JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v))}
async function attempt(fn) {try {return {ok:true,value:json(await fn())}} catch(e){return {ok:false,error:e.reason||e.message}}}
async function read(name, abi, method, args=[]) {
 const result = await attempt(()=>new ethers.Contract(address[name],abi,provider)[method](...args,{blockTag:block}))
 report.contracts[name] ||= {}
 report.contracts[name][method+(args.length?'('+args.join(',')+')':'')]=result
 return result
}
async function main(){
 block=await provider.getBlockNumber(); report.block=block
 report.network=await provider.getNetwork()
 if(report.network.chainId!==1919) throw Error('Unexpected chain')
 for(const [name,addr] of Object.entries(address)){
  const code=await provider.getCode(addr,block)
  report.contracts[name]={address:addr,codeBytes:(code.length-2)/2,runtimeKeccak256:ethers.utils.keccak256(code)}
 }
 const tokenABI=['function decimals() view returns(uint8)','function symbol() view returns(string)','function name() view returns(string)']
 for(const name of ['WTURK','USDT'])for(const method of ['decimals','symbol','name'])await read(name,tokenABI,method)
 const wrapped = new Token(1919,address.WTURK,report.contracts.WTURK.decimals.value,'WTURK')
 const stable = new Token(1919,address.USDT,report.contracts.USDT.decimals.value,'USDT')
 const links=['function factory() view returns(address)','function WETH9() view returns(address)','function WETH() view returns(address)','function poolManager() view returns(address)','function permit2() view returns(address)']
 for(const name of ['V2Router02','V3SwapRouter','QuoterV2','V3PositionManager','V3Migrator','SwapRouter02','V4PositionManager','StateView','V4Quoter','UniversalRouter']) {
  const methods=name==='V2Router02'?['factory','WETH']:name.startsWith('V4')||['StateView','UniversalRouter'].includes(name)?['poolManager','permit2']:['factory','WETH9']
  for(const method of methods)await read(name,links,method)
 }
 const v2ABI=['function allPairsLength() view returns(uint256)','function allPairs(uint256) view returns(address)','function getPair(address,address) view returns(address)','function feeToSetter() view returns(address)','function pairCodeHash() view returns(bytes32)']
 for(const method of ['allPairsLength','feeToSetter','pairCodeHash'])await read('V2Factory',v2ABI,method)
 const pairRes=await read('V2Factory',v2ABI,'getPair',[wrapped.address,stable.address])
 const pairAddress=pairRes.value
 report.v2.canonicalSdkComputedPair=computePairAddress({factoryAddress:address.V2Factory,tokenA:wrapped,tokenB:stable})
 if(pairRes.ok&&pairAddress!==ethers.constants.AddressZero){
  const pair=new ethers.Contract(pairAddress,['function token0() view returns(address)','function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)','function totalSupply() view returns(uint256)'],provider)
  const t0=await pair.token0({blockTag:block}),t1=await pair.token1({blockTag:block}),res=await pair.getReserves({blockTag:block})
  report.v2.pool={address:pairAddress,token0:t0,token1:t1,reserves:res.map(x=>x.toString()),sdkAddressMatches:report.v2.canonicalSdkComputedPair.toLowerCase()===pairAddress.toLowerCase()}
  if(res[0].gt(0)&&res[1].gt(0)){
   const ordered=t0.toLowerCase()===wrapped.address.toLowerCase()?[wrapped,stable]:[stable,wrapped]
   const sdkPair=new Pair(CurrencyAmount.fromRawAmount(ordered[0],res[0].toString()),CurrencyAmount.fromRawAmount(ordered[1],res[1].toString()))
   const input=CurrencyAmount.fromRawAmount(wrapped,'1000000000000000')
   report.v2.sdkQuote={inputRaw:input.quotient.toString(),outputRaw:sdkPair.getOutputAmount(input)[0].quotient.toString(),executable:false,reason:'V2 fee and router simulation still required'}
   report.v2.routerQuote=await read('V2Router02',['function getAmountsOut(uint256,address[]) view returns(uint256[])'],'getAmountsOut',[input.quotient.toString(),[wrapped.address,stable.address]])
  }
 }
 const v3ABI=['function feeAmountTickSpacing(uint24) view returns(int24)','function getPool(address,address,uint24) view returns(address)']
 report.v3.pools=[]
 for(const fee of [100,500,2500,3000,10000]){
  await read('V3Factory',v3ABI,'feeAmountTickSpacing',[fee])
  const found=await read('V3Factory',v3ABI,'getPool',[wrapped.address,stable.address,fee])
  if(!found.ok||found.value===ethers.constants.AddressZero)continue
  const poolAddress=found.value
  const pool=new ethers.Contract(poolAddress,['function token0() view returns(address)','function token1() view returns(address)','function fee() view returns(uint24)','function tickSpacing() view returns(int24)','function liquidity() view returns(uint128)','function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)'],provider)
  const state={}
  for(const method of ['token0','token1','fee','tickSpacing','liquidity','slot0'])state[method]=await attempt(()=>pool[method]({blockTag:block}))
  const computed=computePoolAddress({factoryAddress:address.V3Factory,tokenA:wrapped,tokenB:stable,fee})
  // Quoter is non-view; callStatic avoids any transaction.
  const quoter=new ethers.Contract(address.QuoterV2,['function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns(uint256,uint160,uint32,uint256)'],provider)
  const quoted=await attempt(()=>quoter.callStatic.quoteExactInputSingle([wrapped.address,stable.address,'1000000000000000',fee,0],{blockTag:block}))
  report.v3.pools.push({address:poolAddress,fee,state,canonicalSdkComputedPool:computed,sdkAddressMatches:computed.toLowerCase()===poolAddress.toLowerCase(),quote:quoted})
 }
 const v4Data=JSON.parse(fs.readFileSync(path.join(base,'audit/deployed/V4PoolManager.json')))
 const manager=new ethers.Contract(address.V4PoolManager,v4Data.abi,provider)
 const init=manager.interface.getEventTopic('Initialize')
 report.v4.discoveryRange={fromBlock:Math.max(0,block-2000),toBlock:block,completeHistory:false}
 report.v4.initializeLogs=await attempt(()=>provider.getLogs({...report.v4.discoveryRange,completeHistory:undefined,address:address.V4PoolManager,topics:[init]}))
 report.rpc.block=await attempt(()=>provider.getBlock(block))
 report.rpc.estimateGas=await attempt(()=>provider.estimateGas({to:address.WTURK,data:'0x313ce567'}))
 report.rpc.feeHistory=await attempt(()=>provider.send('eth_feeHistory',['0x3',ethers.utils.hexValue(block),[50]]))
 report.rpc.permit2Domain=await read('Permit2',['function DOMAIN_SEPARATOR() view returns(bytes32)'],'DOMAIN_SEPARATOR')
 report.rpc.multicall=await read('Multicall3',['function getChainId() view returns(uint256)'],'getChainId')
 report.finished=new Date().toISOString()
 fs.writeFileSync(path.join(base,'reports/protocol-verification.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify({block,contracts:Object.keys(report.contracts).length,v2:report.v2,v3:report.v3,v4:report.v4},null,2))
}
main().catch(e=>{report.fatal=e.stack;fs.writeFileSync(path.join(base,'reports/protocol-verification.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1})
