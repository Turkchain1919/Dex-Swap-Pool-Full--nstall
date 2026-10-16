'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {PoolIndexer,TRANSFER,V4_MODIFY}=require('../indexer.cjs'),{ethers}=require('ethers')
const registry=require('../../registry.json')
const names=['V2Factory','V3Factory','V4PoolManager']
function fixture(t,{end=12,range=3}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'turkdex-index-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 let fork=0;const requests=[]
 const hash=n=>'0x'+(n>=10&&fork?'bb':'aa')+n.toString(16).padStart(62,'0')
 const provider={send:async(method,args)=>{
  if(method==='eth_chainId')return '0x77f'
  if(method==='eth_blockNumber')return ethers.utils.hexValue(end+5)
  if(method==='eth_getBlockByNumber'){const n=parseInt(args[0],16);return {hash:hash(n)}}
  if(method==='eth_getLogs'){requests.push(args[0]);return []}
  throw Error(method)
 }}
 const seed={chainId:1919,confirmedBlock:8,completed:true,contracts:names.map(name=>({name,address:registry.contracts[name],logs:[]}))}
 const index=new PoolIndexer({provider,registry,dataDir:dir,seed,range})
 return {index,provider,requests,dir,reorg:()=>{fork++}}
}
test('bounded ranges, confirmation lag and restart persistence',async t=>{
 const f=fixture(t);await f.index.tick()
 assert.equal(f.index.state.confirmedBlock,12);assert.equal(f.index.state.lagBlocks,5);assert.equal(f.index.state.completed,true)
 for(const r of f.requests)assert.ok(parseInt(r.toBlock,16)-parseInt(r.fromBlock,16)<3)
 const restored=new PoolIndexer({provider:f.provider,registry,dataDir:f.dir,seed:{chainId:0}})
 assert.equal(restored.state.confirmedBlock,12)
})
test('checkpoint reorg drops orphan logs and rescans canonical blocks',async t=>{
 const f=fixture(t);await f.index.tick()
 f.index.state.contracts[0].logs=[{blockNumber:'0xa',blockHash:'old',transactionHash:'old',logIndex:'0x0'}]
 f.reorg();await f.index.tick()
 assert.equal(f.index.state.lastReorg.rewoundTo,9);assert.equal(f.index.state.contracts[0].logs.length,0)
 assert.equal(f.index.state.confirmedBlock,12)
})
test('wrong RPC chain fails without advancing checkpoint',async t=>{
 const f=fixture(t);f.provider.send=async()=> '0x1'
 await assert.rejects(f.index.tick(),/chain mismatch/)
 assert.equal(f.index.state.confirmedBlock,8);assert.ok(f.index.state.lastError)
})
test('NFT history requires completion and transfer replay respects final owner',async t=>{
 const f=fixture(t),a='0x0000000000000000000000000000000000000001',b='0x0000000000000000000000000000000000000002'
 assert.throws(()=>f.index.owners(registry.contracts.V3PositionManager,a),/incomplete/)
 const log=(to,n)=>({address:registry.contracts.V3PositionManager,topics:[TRANSFER,ethers.utils.hexZeroPad(a,32),ethers.utils.hexZeroPad(to,32),ethers.utils.hexZeroPad('0x01',32)],blockNumber:'0x'+n.toString(16),blockHash:'b'+n,transactionHash:'t'+n,logIndex:'0x0'})
 f.index.state.nftTransfers=[log(a,1),log(b,2)];f.index.state.nftHistoryComplete=true
 assert.deepEqual(f.index.owners(registry.contracts.V3PositionManager,a),[])
 assert.deepEqual(f.index.owners(registry.contracts.V3PositionManager,b),['1'])
})
test('backfill never commits history when checkpoint changes',async t=>{
 const f=fixture(t),original=f.provider.send;let calls=0
 f.provider.send=async(m,a)=>{if(m==='eth_getBlockByNumber')return {hash:++calls===1?'first':'second'};return original(m,a)}
 await assert.rejects(f.index.backfillNfts(),/checkpoint changed/)
 assert.equal(f.index.state.nftHistoryComplete,false)
})
test('backfill failure can be retried without claiming history completeness',async t=>{
 const f=fixture(t),original=f.provider.send;let failures=0
 f.provider.send=async(m,a)=>{if(m==='eth_getLogs'&&failures<3){failures++;throw Error('temporary outage')}return original(m,a)}
 await assert.rejects(f.index.backfillNfts(),/temporary outage/)
 assert.equal(f.index.state.nftHistoryComplete,false)
 await f.index.backfillNfts();assert.equal(f.index.state.nftHistoryComplete,true)
})

test('failed headers leave the batch uncommitted',async t=>{
 const f=fixture(t),original=f.provider.send
 f.provider.send=async(m,a)=>{
  if(m==='eth_getLogs')return [{address:registry.contracts.V2Factory,topics:[ethers.utils.id('PairCreated(address,address,address,uint256)')],blockNumber:'0x9',blockHash:'orphan',transactionHash:'tx',logIndex:'0x0'}]
  if(m==='eth_getBlockByNumber'&&a[0]==='0x9')throw Error('header unavailable')
  return original(m,a)
 }
 await assert.rejects(f.index.tick(),/header unavailable/)
 assert.equal(f.index.state.confirmedBlock,8);assert.equal(f.index.state.contracts[0].logs.length,0)
})

test('V4 ModifyLiquidity events are backfilled idempotently from the position manager deployment block',async t=>{
 const f=fixture(t),id='0x'+'11'.repeat(32),sender='0x'+'22'.repeat(20)
 const log={address:registry.contracts.V4PoolManager,topics:[V4_MODIFY,id,ethers.utils.hexZeroPad(registry.contracts.V4PositionManager,32)],data:'0x',blockNumber:'0x8',blockHash:'0xaa'+'00'.repeat(31),transactionHash:'0x'+'33'.repeat(32),logIndex:'0x1'}
 const original=f.provider.send
 f.provider.send=async(m,a)=>m==='eth_getLogs'?[log]:original(m,a)
 await f.index.backfillV4Liquidity()
 assert.equal(f.index.state.v4LiquidityBackfillComplete,true)
 assert.equal(f.index.state.v4LiquidityEvents.length,1)
 await f.index.backfillV4Liquidity()
 assert.equal(f.index.state.v4LiquidityEvents.length,1)
})
