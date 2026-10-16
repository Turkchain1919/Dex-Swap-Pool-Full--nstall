'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {ethers}=require('ethers'),{DatabaseSync}=require('node:sqlite'),{TokenIndexer,TRANSFER,trustedLogo}=require('../token-indexer.cjs')
const address=n=>ethers.utils.getAddress('0x'+BigInt(n).toString(16).padStart(40,'0'))
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'turkdex-tokens-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 const iface=new ethers.utils.Interface(['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)','function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)','function supportsInterface(bytes4) view returns(bool)'])
 const code=new Map(),failed=new Set(),nfts=new Set(),blocks=new Map()
 for(let i=0;i<32;i++)blocks.set(i,{hash:'0x'+i.toString(16).padStart(64,'0'),transactions:[]})
 let latest=31
 const provider={getCode:async a=>code.has(a.toLowerCase())?'0x6000':'0x',call:async({to,data})=>{
  if(failed.has(to.toLowerCase()))throw Error('CALL_REVERTED')
  const parsed=iface.parseTransaction({data})
  if(parsed.name==='name')return iface.encodeFunctionResult('name',['Turk Token'])
  if(parsed.name==='symbol')return iface.encodeFunctionResult('symbol',['TRK'])
  if(parsed.name==='decimals')return iface.encodeFunctionResult('decimals',[18])
  if(parsed.name==='totalSupply')return iface.encodeFunctionResult('totalSupply',[1000])
  if(parsed.name==='balanceOf')return iface.encodeFunctionResult('balanceOf',[0])
  if(parsed.name==='supportsInterface')return iface.encodeFunctionResult('supportsInterface',[nfts.has(to.toLowerCase())])
  throw Error('UNKNOWN_CALL')
 },send:async(method,args)=>{
  if(method==='eth_chainId')return '0x77f'
  if(method==='eth_blockNumber')return ethers.utils.hexValue(latest)
  if(method==='eth_getBlockByNumber'){const n=parseInt(args[0],16);return blocks.get(n)||null}
  if(method==='eth_getTransactionReceipt')return {status:'0x1',contractAddress:null}
  if(method==='eth_getLogs')return []
  if(method==='debug_traceBlockByNumber')return []
  throw Error(method)
 }}
 const ix=new TokenIndexer({provider,registry:{contracts:{V3PositionManager:address(700),V4PositionManager:address(701)}},dataDir:dir,explorer:'https://invalid.local/tokens',range:4,maxExplorerPages:1})
 return {ix,provider,dir,code,failed,nfts,blocks,address,setLatest:n=>latest=n}
}
test('validates each ERC20 independently and excludes ERC721 and ERC1155',async t=>{
 const f=fixture(t),good=f.address(1),bad=f.address(2),nft=f.address(3)
 f.code.set(good.toLowerCase(),true);f.code.set(bad.toLowerCase(),true);f.code.set(nft.toLowerCase(),true);f.nfts.add(nft.toLowerCase())
 f.failed.add(bad.toLowerCase())
 await f.ix.candidate(good,{type:'transfer-event',blockNumber:1});await f.ix.candidate(bad,{type:'transfer-event',blockNumber:1});await f.ix.candidate(nft,{type:'transfer-event',blockNumber:1})
 assert.equal(await f.ix.verify(good),true);assert.equal(await f.ix.verify(bad),false);assert.equal(await f.ix.candidate(nft,{type:'transfer-event',blockNumber:1}),true);assert.equal(await f.ix.verify(nft),false)
 assert.deepEqual(f.ix.list().tokens.map(x=>x.address),[good])
})
test('chain and contract address uniquely key tokens; trust stays unverified',async t=>{
 const f=fixture(t),a=f.address(1);f.code.set(a.toLowerCase(),true)
 await f.ix.candidate(a,{type:'blockscout'});assert.equal(await f.ix.verify(a),true)
 assert.equal(Object.keys(f.ix.state.tokens).length,1);assert.equal(f.ix.state.tokens[a.toLowerCase()].chainId,1919);assert.equal(f.ix.state.tokens[a.toLowerCase()].trustStatus,'unverified')
 assert.equal(f.ix.state.tokens[a.toLowerCase()].totalSupply,'1000');f.ix.persist()
 const db=new DatabaseSync(f.ix.dbFile);const row=db.prepare('SELECT chain_id,address,verification_status,trust_status FROM tokens WHERE chain_id=? AND address=?').get(1919,a.toLowerCase());assert.equal(row.chain_id,1919);assert.equal(row.verification_status,'verified-erc20-interface');assert.equal(row.trust_status,'unverified');assert.throws(()=>db.prepare('INSERT INTO tokens(chain_id,address,verification_status,trust_status,token_json) VALUES(1919,?,?,?,?)').run(a.toLowerCase(),'duplicate','unverified','{}'));db.close()
})
test('token list pagination, filtering and search return only verified Turkchain ERC20 records',async t=>{
 const f=fixture(t),a=f.address(1),b=f.address(2)
 for(const x of [a,b]){f.code.set(x.toLowerCase(),true);await f.ix.candidate(x,{type:'blockscout'});await f.ix.verify(x)}
 f.ix.state.tokens[b.toLowerCase()].symbol='OTHER'
 assert.equal(f.ix.list({page:1,limit:1}).total,2);assert.equal(f.ix.list({page:2,limit:1}).tokens.length,1)
 assert.equal(f.ix.list({search:'other'}).tokens[0].symbol,'OTHER')
 assert.equal(f.ix.list({verified:'true'}).tokens.length,0)
 assert.equal(f.ix.list({source:'blockscout'}).total,2)
})
test('snapshot persists resumable cursors and reorg drops orphan-only candidates',async t=>{
 const f=fixture(t),a=f.address(1);f.code.set(a.toLowerCase(),true)
 await f.ix.candidate(a,{type:'transfer-event',blockNumber:3});await f.ix.verify(a)
 f.ix.state.headers=[{number:3,hash:f.blocks.get(3).hash}];f.ix.state.creationScanBlock=3;f.ix.state.transferScanBlock=3;f.ix.persist()
 const restored=new TokenIndexer({provider:f.provider,registry:{contracts:{}},dataDir:f.dir,explorer:'https://invalid.local'})
 assert.equal(restored.state.creationScanBlock,3);assert.equal(Object.keys(restored.state.tokens).length,1);assert.ok(fs.existsSync(path.join(f.dir,'tokens.sqlite')))
 const db=new DatabaseSync(restored.dbFile);assert.equal(db.prepare('SELECT chain_id FROM token_index_state WHERE id=1').get().chain_id,1919);db.close()
 f.blocks.set(3,{hash:'0xff',transactions:[]});await restored.checkReorg()
 assert.equal(restored.state.creationScanBlock,0);assert.equal(Object.keys(restored.state.tokens).length,0)
})
test('new block scan identifies Transfer logs and direct contract creations',async t=>{
 const f=fixture(t),created=f.address(4),transferred=f.address(5);f.code.set(created.toLowerCase(),true);f.code.set(transferred.toLowerCase(),true)
 f.blocks.set(1,{hash:'0x01',transactions:[{to:null,hash:'0xcreate'}]})
 const send=f.provider.send.bind(f.provider)
 f.provider.send=async(method,args)=>{
  if(method==='eth_getTransactionReceipt')return {status:'0x1',contractAddress:created}
  if(method==='eth_getLogs')return [{address:transferred,topics:[TRANSFER,'0x'+'0'.repeat(64),'0x'+'1'.repeat(64)],data:'0x'+'0'.repeat(64),blockNumber:'0x1',transactionHash:'0xtransfer'}]
  if(method==='eth_blockNumber')return '0x6'
  return send(method,args)
 }
 f.ix.state.creationScanBlock=0;f.ix.state.transferScanBlock=0;f.ix.range=4
 await f.ix.scanBlocks()
 assert.ok(f.ix.state.tokens[created.toLowerCase()].sources.some(s=>s.type==='contract-creation'))
 assert.ok(f.ix.state.tokens[transferred.toLowerCase()].sources.some(s=>s.type==='transfer-event'))
})
test('per-token metadata reverts are recorded without aborting unrelated records',async t=>{
 const f=fixture(t),a=f.address(1),b=f.address(2)
 for(const x of [a,b]){f.code.set(x.toLowerCase(),true);await f.ix.candidate(x,{type:'blockscout'})}
 f.failed.add(a.toLowerCase())
 await f.ix.verifyMany([a.toLowerCase(),b.toLowerCase()])
 assert.equal(f.ix.state.tokens[a.toLowerCase()].verificationStatus,'rejected')
 assert.equal(f.ix.state.tokens[b.toLowerCase()].verificationStatus,'verified-erc20-interface')
})

test('recent block cursor discovers a fresh token without waiting for genesis scan',async t=>{
 const f=fixture(t),created=f.address(8);f.code.set(created.toLowerCase(),true)
 f.setLatest(20);f.blocks.set(15,{hash:'0x'+(15).toString(16).padStart(64,'0'),transactions:[{to:null,hash:'0xnew-token'}]})
 f.provider.send=async(method,args)=>{
  if(method==='eth_chainId')return '0x77f'
  if(method==='eth_blockNumber')return '0x14'
  if(method==='eth_getTransactionReceipt')return {status:'0x1',contractAddress:created}
  if(method==='eth_getLogs')return []
  if(method==='eth_getBlockByNumber'){const n=parseInt(args[0],16);return f.blocks.get(n)||null}
  throw Error(method)
 }
 await f.ix.scanRecentBlocks()
 assert.equal(f.ix.state.recentScanBlock,15)
 assert.ok(f.ix.state.tokens[created.toLowerCase()].sources.some(s=>s.type==='contract-creation'))
})

test('call traces discover no-transfer CREATE2 token deployments',async t=>{
 const f=fixture(t),created=f.address(9);f.code.set(created.toLowerCase(),true);f.setLatest(20)
 f.provider.send=async(method,args)=>{
  if(method==='eth_chainId')return '0x77f'
  if(method==='eth_blockNumber')return '0x14'
  if(method==='eth_getLogs')return []
  if(method==='debug_traceBlockByNumber'){const height=parseInt(args[0],16);return height===14?[{txHash:'0xfactory',result:{type:'CALL',calls:[{type:'CREATE2',to:created,calls:[]}]}}]:[]}
  if(method==='eth_getBlockByNumber'){const n=parseInt(args[0],16);return f.blocks.get(n)||null}
  throw Error(method)
 }
 await f.ix.scanRecentBlocks()
 assert.ok(f.ix.state.tokens[created.toLowerCase()].sources.some(s=>s.type==='internal-contract-creation'&&s.txHash==='0xfactory'))
})

test('transient trace response errors are recorded and do not freeze token block progress',async t=>{
 const f=fixture(t);f.setLatest(20);let failTrace=true
 f.provider.send=async(method,args)=>{
  if(method==='eth_chainId')return '0x77f'
  if(method==='eth_blockNumber')return '0x14'
  if(method==='eth_getBlockByNumber'){const n=parseInt(args[0],16);return f.blocks.get(n)||null}
  if(method==='eth_getTransactionReceipt')return {status:'0x1',contractAddress:null}
  if(method==='eth_getLogs')return []
  if(method==='debug_traceBlockByNumber'&&failTrace&&parseInt(args[0],16)===14)throw Error('processing response error')
  if(method==='debug_traceBlockByNumber')return []
  throw Error(method)
 }
 await f.ix.scanRecentBlocks()
 assert.equal(f.ix.state.recentScanBlock,15)
 assert.equal(f.ix.state.traceFailures[0].blockNumber,14)
 f.ix.state.traceFailures[0].lastAttemptAt=0;failTrace=false
 await f.ix.retryTraceFailures()
 assert.deepEqual(f.ix.state.traceFailures,[])
})

test('accepts only HTTPS raster logos hosted by the Turkscan uploads path',()=>{
 assert.equal(trustedLogo('https://turkscan.com/uploads/token.png'),'https://turkscan.com/uploads/token.png')
 assert.equal(trustedLogo('http://turkscan.com/uploads/token.png'),null)
 assert.equal(trustedLogo('https://turkscan.com/uploads/token.svg'),null)
 assert.equal(trustedLogo('https://other.example/uploads/token.png'),null)
 assert.equal(trustedLogo('javascript:alert(1)'),null)
})
