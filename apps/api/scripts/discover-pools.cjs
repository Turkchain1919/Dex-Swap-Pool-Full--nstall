const fs=require('node:fs'),path=require('node:path')
const {ethers}=require('ethers')
const b=path.resolve(__dirname,'../..')
const r=JSON.parse(fs.readFileSync(path.join(b,'registry.json')))
const p=new ethers.providers.JsonRpcProvider({url:r.rpc,timeout:20000},1919)
const specs=[
 ['V2Factory','event PairCreated(address indexed token0,address indexed token1,address pair,uint256)'],
 ['V3Factory','event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)'],
 ['V4PoolManager','event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)']
]
async function main(){
 const end=(await p.getBlockNumber())-5
 const result={chainId:1919,confirmedBlock:end,completed:false,contracts:[]}
 for(const [name,event]of specs){
  const address=ethers.utils.getAddress(r.contracts[name].toLowerCase()),iface=new ethers.utils.Interface([event])
  let lo=0
  // Historical state is pruned; event scans do not rely on old eth_getCode.
  if(name==='V4PoolManager'){ const metadata=JSON.parse(fs.readFileSync(path.join(b,'audit/deployed/V4PoolManager-address.json')));const receipt=await p.getTransactionReceipt(metadata.creation_transaction_hash);if(receipt)lo=receipt.blockNumber }
  const item={name,address,scanFromBlock:lo,logs:[],scannedThrough:lo-1}
  result.contracts.push(item)
  for(let from=lo;from<=end;from+=100000){
   const to=Math.min(end,from+99999)
   const logs=await p.getLogs({address,fromBlock:from,toBlock:to,topics:[iface.getEventTopic(iface.fragments[0].name)]})
   for(const log of logs)item.logs.push({blockNumber:log.blockNumber,blockHash:log.blockHash,transactionHash:log.transactionHash,logIndex:log.logIndex,args:iface.parseLog(log).args.map(x=>ethers.BigNumber.isBigNumber(x)?x.toString():x)})
   item.scannedThrough=to
   fs.writeFileSync(path.join(b,'reports/full-pool-discovery.json'),JSON.stringify(result,null,2))
  }
  console.log(name,'deployed',lo,'events',item.logs.length)
 }
 result.completed=true
 fs.writeFileSync(path.join(b,'reports/full-pool-discovery.json'),JSON.stringify(result,null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1})
