'use strict'
const fs=require('node:fs'),path=require('node:path'),{ethers}=require('ethers')
const ZERO=ethers.constants.AddressZero
const FACTORIES={
 V2Factory:'PairCreated(address,address,address,uint256)',
 V3Factory:'PoolCreated(address,address,uint24,int24,address)',
 V4PoolManager:'Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)'
}
const TRANSFER=ethers.utils.id('Transfer(address,address,uint256)')
const V4_MODIFY=ethers.utils.id('ModifyLiquidity(bytes32,address,int24,int24,int256,bytes32)')
function number(value){return typeof value==='number'?value:parseInt(value,16)}
function key(log){return log.blockHash+':'+log.transactionHash+':'+log.logIndex}
function ordered(logs){return logs.sort((a,b)=>number(a.blockNumber)-number(b.blockNumber)||number(a.transactionIndex||'0x0')-number(b.transactionIndex||'0x0')||number(a.logIndex)-number(b.logIndex))}
class PoolIndexer{
 constructor({provider,registry,dataDir,seed,deployments={},confirmations=5,range=1000}){
  if(range<1||range>10000)throw Error('Indexer ranges must be between 1 and 10000 blocks')
  this.provider=provider;this.registry=registry;this.deployments=deployments;this.dataDir=dataDir;this.file=path.join(dataDir,'snapshot.json');this.seed=seed;this.confirmations=confirmations;this.range=range;this.busy=false;this.timer=null
  fs.mkdirSync(dataDir,{recursive:true})
  this.state=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file)):JSON.parse(JSON.stringify(seed))
  if(this.state.chainId!==1919)throw Error('Wrong snapshot chain')
  this.state.headers ||= [];this.state.nftTransfers ||= [];this.state.nftHistoryComplete ||= false;this.state.v4LiquidityEvents ||= [];this.state.v4LiquidityBackfillComplete ||= false
  this.state.seedBlock ??= this.state.confirmedBlock
 }
 persist(){const temp=this.file+'.next';fs.writeFileSync(temp,JSON.stringify(this.state),{mode:0o600});fs.renameSync(temp,this.file)}
 async block(height){return this.provider.send('eth_getBlockByNumber',[ethers.utils.hexValue(height),false])}
 async verifyCheckpoint(){
  if(!this.state.headers.length){const b=await this.block(this.state.confirmedBlock);if(!b)throw Error('Checkpoint block unavailable');this.state.headers=[{number:this.state.confirmedBlock,hash:b.hash}];return}
  const last=this.state.headers[this.state.headers.length-1],canonical=await this.block(last.number)
  if(canonical?.hash===last.hash)return
  let common
  for(const header of [...this.state.headers].reverse()){if((await this.block(header.number))?.hash===header.hash){common=header;break}}
  const rewind=common?.number??0
  for(const contract of this.state.contracts)contract.logs=contract.logs.filter(log=>number(log.blockNumber)<=rewind)
  this.state.nftTransfers=this.state.nftTransfers.filter(log=>number(log.blockNumber)<=rewind);this.state.v4LiquidityEvents=this.state.v4LiquidityEvents.filter(log=>number(log.blockNumber)<=rewind);this.state.v4LiquidityBackfillComplete=false
  this.state.confirmedBlock=rewind;this.state.headers=this.state.headers.filter(h=>h.number<=rewind)
  if(!common){this.state.nftHistoryComplete=false;this.state.completed=false;this.state.seedBlock=0}
  this.state.lastReorg={detectedAt:new Date().toISOString(),previousBlock:last.number,rewoundTo:rewind}
  this.persist()
 }
 async tick(){
  if(this.busy)return
  this.busy=true
  try{
   if(number(await this.provider.send('eth_chainId',[]))!==1919)throw Error('RPC chain mismatch')
   await this.verifyCheckpoint()
   const latest=number(await this.provider.send('eth_blockNumber',[])),end=Math.max(0,latest-this.confirmations)
   let batches=0
   while(this.state.confirmedBlock<end&&batches++<4){
    const from=this.state.confirmedBlock+1,to=Math.min(end,from+this.range-1)
    const factoryAddresses=Object.keys(FACTORIES).map(name=>this.registry.contracts[name])
    const nftAddresses=['V3PositionManager','V4PositionManager'].map(name=>this.registry.contracts[name])
    const topics=[...Object.values(FACTORIES).map(ethers.utils.id),TRANSFER,V4_MODIFY]
    const logs=await this.provider.send('eth_getLogs',[{fromBlock:ethers.utils.hexValue(from),toBlock:ethers.utils.hexValue(to),address:[...factoryAddresses,...nftAddresses],topics:[topics]}])
    const headers=[]
    for(let height=Math.max(from,to-31);height<=to;height++){const block=await this.block(height);if(!block)throw Error('Block header unavailable');headers.push({number:height,hash:block.hash})}
    const headerMap=new Map(headers.map(header=>[header.number,header.hash]))
    for(const log of logs){
     const height=number(log.blockNumber)
     if(!headerMap.has(height))headerMap.set(height,(await this.block(height))?.hash)
     if(headerMap.get(height)!==log.blockHash)throw Error('Log block changed during indexing')
    }
    const previous=this.state.headers[this.state.headers.length-1]
    if(previous&&(await this.block(previous.number))?.hash!==previous.hash)throw Error('Checkpoint changed during indexing')
    for(const contract of this.state.contracts){
     const topic=ethers.utils.id(FACTORIES[contract.name])
     const found=logs.filter(log=>log.address.toLowerCase()===contract.address.toLowerCase()&&log.topics[0]===topic)
     const existing=new Map(contract.logs.map(log=>[key(log),log]));for(const log of found)existing.set(key(log),log);contract.logs=ordered([...existing.values()])
    }
    const nft=new Map(this.state.nftTransfers.map(log=>[key(log),log]))
    for(const log of logs)if(nftAddresses.some(address=>address.toLowerCase()===log.address.toLowerCase())&&log.topics[0]===TRANSFER&&log.topics.length===4)nft.set(key(log),log)
    this.state.nftTransfers=ordered([...nft.values()])
    const liquidity=new Map(this.state.v4LiquidityEvents.map(log=>[key(log),log]))
    for(const log of logs)if(log.address.toLowerCase()===this.registry.contracts.V4PoolManager.toLowerCase()&&log.topics[0]===V4_MODIFY)liquidity.set(key(log),log)
    this.state.v4LiquidityEvents=ordered([...liquidity.values()])
    this.state.headers=[...this.state.headers,...headers].slice(-64)
    this.state.confirmedBlock=to;this.state.completed=to===end;this.state.currentBlock=latest;this.state.lagBlocks=latest-to;this.state.updatedAt=new Date().toISOString();this.state.lastError=null;this.persist()
   }
   this.state.completed=this.state.confirmedBlock>=end;this.state.currentBlock=latest;this.state.lagBlocks=latest-this.state.confirmedBlock;this.state.updatedAt=new Date().toISOString();this.state.lastError=null;this.persist()
  }catch(e){this.state.lastError={time:new Date().toISOString(),message:e.reason||e.message};this.persist();throw e}
  finally{this.busy=false}
 }
 async historicalLogs(filter){
  let error
  for(let attempt=0;attempt<3;attempt++){
   try{return await this.provider.send('eth_getLogs',[filter])}catch(e){error=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}
  }
  throw error
 }
 async backfillNfts(){
  if(this.state.nftHistoryComplete)return
  const end=this.state.seedBlock,checkpoint=await this.block(end)
  if(!checkpoint)throw Error('NFT checkpoint unavailable')
  const addresses=['V3PositionManager','V4PositionManager'].map(name=>this.registry.contracts[name])
  const dir=path.join(this.dataDir,'nft-ranges',checkpoint.hash);fs.mkdirSync(dir,{recursive:true})
  let first=0
  const proofs=Object.entries(this.deployments)
  if(proofs.length===2&&['V3PositionManager','V4PositionManager'].every(name=>this.deployments[name])){
   for(const [name,proof]of proofs){
    const receipt=await this.provider.send('eth_getTransactionReceipt',[proof.transactionHash])
    if(!receipt||receipt.status!=='0x1'||receipt.contractAddress?.toLowerCase()!==this.registry.contracts[name].toLowerCase()||number(receipt.blockNumber)!==proof.blockNumber||(await this.block(proof.blockNumber))?.hash!==receipt.blockHash)throw Error('Position manager deployment proof mismatch')
   }
   first=Math.min(...proofs.map(([,proof])=>proof.blockNumber))
  }
  let cursor=first;const collected=[]
  const worker=async()=>{
   while(cursor<=end){
    const from=cursor;cursor+=10000;const to=Math.min(end,from+9999),file=path.join(dir,from+'-'+to+'.json')
    const logs=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):await this.historicalLogs({fromBlock:ethers.utils.hexValue(from),toBlock:ethers.utils.hexValue(to),address:addresses,topics:[TRANSFER]})
    if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(logs),{mode:0o600})
    collected.push(...logs.filter(log=>log.topics.length===4))
   }
  }
  await Promise.all([worker(),worker(),worker()])
  if((await this.block(end))?.hash!==checkpoint.hash)throw Error('NFT checkpoint changed during backfill')
  const merged=new Map(this.state.nftTransfers.map(log=>[key(log),log]))
  for(const log of collected)merged.set(key(log),log)
  this.state.nftTransfers=ordered([...merged.values()]);this.state.nftHistoryComplete=true;this.state.nftBackfillError=null;this.persist()
 }
 async backfillV4Liquidity(){
  if(this.state.v4LiquidityBackfillComplete)return
  const end=this.state.confirmedBlock,checkpoint=await this.block(end)
  if(!checkpoint)throw Error('V4 liquidity checkpoint unavailable')
  const proof=this.deployments.V4PositionManager
  const first=proof?.blockNumber??this.state.seedBlock??0
  let cursor=first;const collected=[];let rangeError
  const worker=async()=>{
   while(cursor<=end){
    const from=cursor;cursor+=10000;const to=Math.min(end,from+9999)
    const logs=await this.historicalLogs({fromBlock:ethers.utils.hexValue(from),toBlock:ethers.utils.hexValue(to),address:this.registry.contracts.V4PoolManager,topics:[V4_MODIFY]})
    collected.push(...logs.filter(log=>log.topics?.[0]===V4_MODIFY))
   }
  }
  try{await Promise.all([worker(),worker(),worker()])}catch(error){rangeError=error}
  if(rangeError)throw rangeError
  if((await this.block(end))?.hash!==checkpoint.hash)throw Error('V4 liquidity checkpoint changed during backfill')
  const merged=new Map(this.state.v4LiquidityEvents.map(log=>[key(log),log]))
  for(const log of collected)merged.set(key(log),log)
  this.state.v4LiquidityEvents=ordered([...merged.values()])
  this.state.v4LiquidityBackfillComplete=true
  this.state.v4LiquidityBackfillBlock=end
  this.state.v4LiquidityBackfillError=null
  this.persist()
 }
 start(){
  const run=async()=>{
   if(this.running)return
   this.running=true
   try{await this.tick();await this.backfillNfts();await this.backfillV4Liquidity();await this.tick()}
   catch(e){this.state.nftBackfillError=e.reason||e.message;this.state.v4LiquidityBackfillError=e.reason||e.message;this.persist()}
   finally{this.running=false}
  }
  run();this.timer=setInterval(run,10000);this.timer.unref()
 }
 stop(){if(this.timer)clearInterval(this.timer)}
 owners(manager,owner){
  if(!this.state.nftHistoryComplete)throw Error('NFT history indexing is incomplete')
  const ownership=new Map()
  for(const log of this.state.nftTransfers)if(log.address.toLowerCase()===manager.toLowerCase()){ownership.set(ethers.BigNumber.from(log.topics[3]).toString(),ethers.utils.getAddress('0x'+log.topics[2].slice(-40)))}
  return [...ownership].filter(([,address])=>address.toLowerCase()===owner.toLowerCase()&&address!==ZERO).map(([tokenId])=>tokenId)
 }
}
module.exports={PoolIndexer,FACTORIES,TRANSFER,V4_MODIFY,number}
