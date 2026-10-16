const fs=require('fs'),path=require('path'),{ethers}=require('ethers'),v4=require('@uniswap/v4-sdk'),ur=require('@uniswap/universal-router-sdk'),p=require('../protocol.cjs')
const provider=new ethers.providers.JsonRpcProvider({url:'https://rpc.turkscan.com',timeout:20000},1919),sender='0x1111111111111111111111111111111111111111'
const pool=new v4.Pool(p.tokens.WTURK,p.tokens.USDT,3000,60,ethers.constants.AddressZero,ethers.BigNumber.from(2).pow(96).toString(),0,0)
async function main(){
 const report={chainId:1919,broadcast:false,poolId:pool.poolId,expectedUninitializedSelector:ethers.utils.id('PoolNotInitialized()').slice(0,10),attempts:[]}
 for(const version of ['2.0','2.1.1']){
  const tx=p.v4Swap({chainId:1919,pool,zeroForOne:true,amountSpecified:'1',limit:'1',expires:Math.floor(Date.now()/1000)+600,routerVersion:version})
  try{const value=await provider.send('eth_call',[{from:sender,to:tx.to,data:tx.data,value:'0x0'},'latest']);report.attempts.push({version,callSucceeded:true,value})}
  catch(e){const serialized=JSON.stringify(e);report.attempts.push({version,callSucceeded:false,reason:e.reason,containsPoolNotInitialized:serialized.includes(report.expectedUninitializedSelector.slice(2)),error:e.error?.error?.data||e.error?.data||e.data})}
 }
 const planner=new ur.RoutePlanner();planner.addCommand(ur.CommandType.V4_SWAP,[new v4.V4Planner().finalize()])
 const iface=new ethers.utils.Interface(['function execute(bytes,bytes[],uint256) payable'])
 try{report.emptyV4Plan={ok:true,result:await provider.send('eth_call',[{from:sender,to:p.addresses.UniversalRouter,data:iface.encodeFunctionData('execute',[planner.commands,planner.inputs,Math.floor(Date.now()/1000)+600])},'latest'])}}catch(e){report.emptyV4Plan={ok:false,error:e.reason||e.message}}
 fs.writeFileSync(path.resolve(__dirname,'../../reports/v4-command-simulations.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1})
