const fs=require('node:fs'),path=require('node:path'),{ethers}=require('ethers')
const core=require('@uniswap/sdk-core'),v2=require('@uniswap/v2-sdk'),v3=require('@uniswap/v3-sdk'),v4=require('@uniswap/v4-sdk'),local=require('../protocol.cjs')
const base=path.resolve(__dirname,'../..'),provider=new ethers.providers.JsonRpcProvider({url:'https://rpc.turkscan.com',timeout:25000},1919)
const sender='0x1111111111111111111111111111111111111111'
const result={chainId:1919,broadcast:false,checks:{}}
async function attempt(name,fn){try{result.checks[name]={ok:true,result:JSON.parse(JSON.stringify(await fn()))}}catch(e){result.checks[name]={ok:false,reason:e.reason||e.message}}}
async function main(){
 const block=await provider.getBlockNumber();result.block=block
 const t=local.tokens,addr=local.addresses
 const v2factory=new ethers.Contract(addr.V2Factory,['function createPair(address,address) returns(address)'],provider)
 await attempt('v2CreatePairSimulation',()=>v2factory.callStatic.createPair(t.WTURK.address,t.USDT.address,{from:sender,blockTag:block}))
 result.v2SdkPredicted=v2.computePairAddress({factoryAddress:addr.V2Factory,tokenA:t.WTURK,tokenB:t.USDT})
 const v3factory=new ethers.Contract(addr.V3Factory,['function createPool(address,address,uint24) returns(address)'],provider)
 await attempt('v3CreatePoolSimulation',()=>v3factory.callStatic.createPool(t.WTURK.address,t.USDT.address,3000,{from:sender,blockTag:block}))
 result.v3SdkPredicted=v3.computePoolAddress({factoryAddress:addr.V3Factory,tokenA:t.WTURK,tokenB:t.USDT,fee:3000})
 for(const name of ['v2','v3'])result[name+'CanonicalInitCodeCompatible']=result.checks[name+(name==='v2'?'CreatePairSimulation':'CreatePoolSimulation')].ok&&result.checks[name+(name==='v2'?'CreatePairSimulation':'CreatePoolSimulation')].result.toLowerCase()===result[name+'SdkPredicted'].toLowerCase()
 const erc20=new ethers.utils.Interface(['function deposit() payable','function withdraw(uint256)'])
 await attempt('wrappedDepositZeroSimulation',()=>provider.call({from:sender,to:addr.WTURK,data:erc20.encodeFunctionData('deposit'),value:0},block))
 await attempt('wrappedWithdrawZeroSimulation',()=>provider.call({from:sender,to:addr.WTURK,data:erc20.encodeFunctionData('withdraw',[0])},block))
 const pool=new v4.Pool(t.WTURK,t.USDT,3000,60,ethers.constants.AddressZero,ethers.BigNumber.from(2).pow(96).toString(),0,0)
 result.v4PoolKey=pool.poolKey;result.v4PoolId=pool.poolId
 const stateView=new ethers.Contract(addr.StateView,['function getSlot0(bytes32) view returns(uint160,int24,uint24,uint24)','function getLiquidity(bytes32) view returns(uint128)'],provider)
 await attempt('v4Slot0',()=>stateView.getSlot0(pool.poolId,{blockTag:block}))
 await attempt('v4Liquidity',()=>stateView.getLiquidity(pool.poolId,{blockTag:block}))
 const tx=local.v4Initialize(pool,ethers.BigNumber.from(2).pow(96).toString())
 await attempt('v4InitializeSimulation',()=>provider.call({from:sender,to:tx.to,data:tx.data,value:tx.value},block))
 for(const [name,code] of [['V2Router02',v2.INIT_CODE_HASH],['V3SwapRouter',v3.POOL_INIT_CODE_HASH],['V3PositionManager',v3.POOL_INIT_CODE_HASH],['UniversalRouter',v3.POOL_INIT_CODE_HASH]])result[name+'ContainsCanonicalInitHash']=(await provider.getCode(addr[name],block)).includes(code.slice(2))
 result.permit2DomainExpected=ethers.utils._TypedDataEncoder.hashDomain({name:'Permit2',chainId:1919,verifyingContract:addr.Permit2})
 await attempt('permit2DomainActual',()=>new ethers.Contract(addr.Permit2,['function DOMAIN_SEPARATOR() view returns(bytes32)'],provider).DOMAIN_SEPARATOR({blockTag:block}))
 fs.writeFileSync(path.join(base,'reports/simulations.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1})
