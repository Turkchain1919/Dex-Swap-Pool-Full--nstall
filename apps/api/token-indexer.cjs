'use strict'
const fs=require('node:fs'),path=require('node:path'),{DatabaseSync}=require('node:sqlite'),{ethers}=require('ethers')
const TRANSFER=ethers.utils.id('Transfer(address,address,uint256)')
const ZERO=ethers.constants.AddressZero
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const hexNumber=n=>ethers.utils.hexValue(n)
const num=v=>typeof v==='number'?v:parseInt(v,16)
const lower=v=>String(v).toLowerCase()
function trustedLogo(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='turkscan.com'&&u.pathname.startsWith('/uploads/')&&/\.(png|jpe?g|webp|avif)$/i.test(u.pathname)?u.toString():null}catch{return null}
}
const EXCLUDED_NAMES=['V3PositionManager','V4PositionManager']
const ERC721='0x80ac58cd',ERC1155='0xd9b67a26'
function asString(raw){try{return ethers.utils.defaultAbiCoder.decode(['string'],raw)[0]}catch{try{return ethers.utils.parseBytes32String(ethers.utils.defaultAbiCoder.decode(['bytes32'],raw)[0])}catch{return null}}}
class TokenIndexer{
 constructor({provider,registry,dataDir,confirmations=5,range=32,explorer='https://turkscan.com/api/v2/tokens',intervalMs=15000,maxExplorerPages=2,maxVerifications=20}){
  if(range<1||range>128)throw Error('Token index ranges must be between 1 and 128')
  this.provider=provider;this.registry=registry;this.dataDir=dataDir;this.file=path.join(dataDir,'tokens.json');this.dbFile=path.join(dataDir,'tokens.sqlite');this.confirmations=confirmations;this.range=range;this.explorer=explorer;this.intervalMs=intervalMs;this.maxExplorerPages=maxExplorerPages;this.maxVerifications=maxVerifications;this.busy=false;this.timer=null
  fs.mkdirSync(dataDir,{recursive:true})
  const seed={chainId:1919,schemaVersion:1,tokens:{},creationScanBlock:-1,transferScanBlock:-1,recentScanBlock:-1,recentInitialized:false,explorer:{params:null,done:false},headers:[],historyHeaders:[],updatedAt:null,lastError:null}
  this.db=new DatabaseSync(this.dbFile);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS token_index_state (id INTEGER PRIMARY KEY CHECK (id=1), chain_id INTEGER NOT NULL CHECK (chain_id=1919), state_json TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS tokens (chain_id INTEGER NOT NULL CHECK (chain_id=1919), address TEXT NOT NULL COLLATE NOCASE, name TEXT, symbol TEXT, decimals INTEGER, total_supply TEXT, verification_status TEXT NOT NULL, trust_status TEXT NOT NULL, token_json TEXT NOT NULL, PRIMARY KEY(chain_id,address));')
  const persisted=this.db.prepare('SELECT state_json FROM token_index_state WHERE id=1').get()
  this.state=persisted?JSON.parse(persisted.state_json):(fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file)):seed)
  if(this.state.chainId!==1919)throw Error('Token index snapshot chain mismatch')
  this.state.tokens||={};this.state.headers||=[];this.state.historyHeaders||=[];this.state.explorer||={params:null,done:false};this.state.recentScanBlock??=-1;this.state.recentInitialized??=false;this.state.traceAvailable??=null;this.state.traceFailures||=[]
  if(!persisted)this.persist()
 }
 persist(){const json=JSON.stringify(this.state),now=new Date().toISOString();this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('INSERT INTO token_index_state(id,chain_id,state_json,updated_at) VALUES(1,1919,?,?) ON CONFLICT(id) DO UPDATE SET state_json=excluded.state_json,updated_at=excluded.updated_at').run(json,now);this.db.prepare('DELETE FROM tokens WHERE chain_id=1919').run();const insert=this.db.prepare('INSERT INTO tokens(chain_id,address,name,symbol,decimals,total_supply,verification_status,trust_status,token_json) VALUES(1919,?,?,?,?,?,?,?,?)');for(const token of Object.values(this.state.tokens))insert.run(token.address,token.name||null,token.symbol||null,Number.isInteger(token.decimals)?token.decimals:null,token.totalSupply||null,token.verificationStatus||'pending',token.trustStatus||'unverified',JSON.stringify(token));this.db.exec('COMMIT')}catch(e){this.db.exec('ROLLBACK');throw e}const tmp=this.file+'.next';fs.writeFileSync(tmp,json,{mode:0o600});fs.renameSync(tmp,this.file);fs.chmodSync(this.dbFile,0o600);for(const suffix of ['-wal','-shm'])try{fs.chmodSync(this.dbFile+suffix,0o600)}catch{}}
 async send(method,args){let error;for(let attempt=0;attempt<3;attempt++){try{return await this.provider.send(method,args)}catch(e){error=e;if(attempt<2)await delay(250*(attempt+1))}}throw error}
 async candidate(address,source){
  let normalized;try{normalized=ethers.utils.getAddress(address)}catch{return false}
  if(normalized===ZERO||EXCLUDED_NAMES.some(n=>normalized.toLowerCase()===String(this.registry.contracts[n]||'').toLowerCase()))return false
  const key=lower(normalized),entry=this.state.tokens[key]||{chainId:1919,address:normalized,sources:[],trustStatus:'unverified',verificationStatus:'pending'}
  if(source&&!entry.sources.some(s=>s.type===source.type&&s.blockNumber===source.blockNumber&&s.txHash===source.txHash))entry.sources.push(source)
  this.state.tokens[key]=entry
  return true
 }
 async verify(address){
  const key=lower(address),entry=this.state.tokens[key];if(!entry)return false
  entry.verificationAttemptAt=new Date().toISOString()
  try{
   const code=await this.provider.getCode(entry.address);if(!code||code==='0x'){entry.verificationStatus='rejected';entry.rejectionReason='NO_CONTRACT_CODE';return false}
   const probe=async(signature,types,args=[])=>this.provider.call({to:entry.address,data:new ethers.utils.Interface([signature]).encodeFunctionData(signature.slice(9,signature.indexOf('(')),args)})
   const readText=async(fn)=>{const iface=new ethers.utils.Interface(['function '+fn+'() view returns (string)']);try{return asString(await this.provider.call({to:entry.address,data:iface.encodeFunctionData(fn)}))}catch{return null}}
   const [name,symbol]=await Promise.all([readText('name'),readText('symbol')])
   if(!name||!symbol||name.length>256||symbol.length>64)throw Error('INVALID_NAME_OR_SYMBOL')
   const decimalsIface=new ethers.utils.Interface(['function decimals() view returns (uint8)']),decimalsRaw=await this.provider.call({to:entry.address,data:decimalsIface.encodeFunctionData('decimals')})
   const decimals=Number(decimalsIface.decodeFunctionResult('decimals',decimalsRaw)[0]);if(!Number.isInteger(decimals)||decimals<0||decimals>255)throw Error('INVALID_DECIMALS')
   const supplyIface=new ethers.utils.Interface(['function totalSupply() view returns (uint256)','function balanceOf(address) view returns(uint256)'])
   const [supplyRaw,balanceRaw]=await Promise.all([
    this.provider.call({to:entry.address,data:supplyIface.encodeFunctionData('totalSupply')}),
    this.provider.call({to:entry.address,data:supplyIface.encodeFunctionData('balanceOf',[ZERO])})
   ])
   const totalSupply=supplyIface.decodeFunctionResult('totalSupply',supplyRaw)[0].toString()
   supplyIface.decodeFunctionResult('balanceOf',balanceRaw)[0].toString()
   const supports=async(id)=>{try{const iface=new ethers.utils.Interface(['function supportsInterface(bytes4) view returns(bool)']);return iface.decodeFunctionResult('supportsInterface',await this.provider.call({to:entry.address,data:iface.encodeFunctionData('supportsInterface',[id])}))[0]}catch{return false}}
   const [is721,is1155]=await Promise.all([supports(ERC721),supports(ERC1155)])
   if(is721||is1155){entry.verificationStatus='rejected';entry.rejectionReason=is721?'ERC721':'ERC1155';return false}
   entry.name=name;entry.symbol=symbol;entry.decimals=decimals;entry.totalSupply=totalSupply
   entry.verificationStatus='verified-erc20-interface';entry.trustStatus='unverified';entry.verifiedAt=new Date().toISOString();entry.rejectionReason=null
   return true
  }catch(e){entry.verificationStatus='rejected';entry.rejectionReason=String(e.reason||e.code||e.message||'CALL_FAILED').slice(0,120);return false}
 }
 async fetchExplorerPage(refresh=false){
  if(this.state.explorer.done&&!refresh)return 0
  const url=new URL(this.explorer)
  url.searchParams.set('type','ERC-20')
  if(!refresh&&this.state.explorer.params)for(const [k,v]of Object.entries(this.state.explorer.params))url.searchParams.set(k,String(v))
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)})
  if(!response.ok)throw Error('BLOCKSCOUT_HTTP_'+response.status)
  const payload=await response.json();if(!Array.isArray(payload.items))throw Error('BLOCKSCOUT_INVALID_RESPONSE')
  const candidates=[]
  for(const item of payload.items){
   const address=item.address_hash||item.address?.hash
   if(!address)continue
   await this.candidate(address,{type:'blockscout'})
   const token=this.state.tokens[lower(address)],logo=trustedLogo(item.icon_url)
   if(token&&logo){token.logoUrl=logo;token.logoSource='turkscan-blockscout'}
  }
  for(const item of payload.items){const address=item.address_hash||item.address?.hash;if(address&&this.shouldVerify(this.state.tokens[lower(address)]))candidates.push(address)}
  await this.verifyMany(candidates.slice(0,this.maxVerifications))
  if(!refresh){this.state.explorer.params=payload.next_page_params||null;this.state.explorer.done=!payload.next_page_params}this.state.explorer.lastError=null;if(refresh)this.state.explorer.lastRefreshedAt=new Date().toISOString()
  this.persist();return payload.items.length
 }
 shouldVerify(token){return Boolean(token&&(token.verificationStatus==='pending'||(token.verificationStatus==='rejected'&&Date.now()-Date.parse(token.verificationAttemptAt||0)>3600000)))}
 async verifyMany(addresses){
  for(let i=0;i<addresses.length;i+=4){await Promise.all(addresses.slice(i,i+4).map(a=>this.verify(a)));this.persist();if(i+4<addresses.length)await delay(150)}
 }
 async scanBlocks(){
  const latest=num(await this.send('eth_blockNumber',[])),target=Math.max(0,latest-this.confirmations)
  await this.checkReorg()
  let from=Math.min(this.state.creationScanBlock,this.state.transferScanBlock)+1
  if(from>target)return
  const to=Math.min(target,from+this.range-1),creations=[],headers=[]
  for(let height=from;height<=to;height++){
   const block=await this.send('eth_getBlockByNumber',[hexNumber(height),true])
   if(!block)throw Error('BLOCK_UNAVAILABLE_'+height)
   headers.push({number:height,hash:block.hash})
   for(const tx of block.transactions||[])if(tx.to===null){
    const receipt=await this.send('eth_getTransactionReceipt',[tx.hash]).catch(()=>null)
    if(receipt?.status==='0x1'&&receipt.contractAddress&&receipt.contractAddress!==ZERO)creations.push({address:receipt.contractAddress,source:{type:'contract-creation',blockNumber:height,txHash:tx.hash}})
   }
   creations.push(...await this.traceCreations(height))
  }
  const logs=await this.send('eth_getLogs',[{fromBlock:hexNumber(from),toBlock:hexNumber(to),topics:[TRANSFER]}])
  const transfers=[]
  for(const log of logs){
   if(log.topics?.length!==3||!/^0x[0-9a-fA-F]{64}$/.test(log.data||''))continue
   if(Number.isFinite(num(log.blockNumber))===false)continue
   transfers.push({address:log.address,source:{type:'transfer-event',blockNumber:num(log.blockNumber),txHash:log.transactionHash}})
  }
  const headerByNumber=new Map(headers.map(h=>[h.number,h.hash]))
  for(const item of [...creations,...transfers]){
   const n=item.source.blockNumber,canonical=headerByNumber.get(n)
   if(canonical&&canonical.toLowerCase()!==String((await this.send('eth_getBlockByNumber',[hexNumber(n),false]))?.hash).toLowerCase())throw Error('CANONICAL_BLOCK_CHANGED')
   await this.candidate(item.address,item.source)
  }
  this.state.historyHeaders=[...this.state.historyHeaders,...headers].slice(-128)
  this.state.creationScanBlock=to;this.state.transferScanBlock=to;this.state.currentBlock=latest;this.state.confirmedBlock=target
  await this.verifyMany([...new Set([...creations,...transfers].map(x=>lower(x.address)))].filter(a=>this.shouldVerify(this.state.tokens[a])).slice(0,this.maxVerifications))
  this.state.updatedAt=new Date().toISOString();this.state.lastError=null;this.persist()
 }
 async scanRecentBlocks(){
  const latest=num(await this.send('eth_blockNumber',[])),target=Math.max(0,latest-this.confirmations)
  if(!this.state.recentInitialized){this.state.recentScanBlock=Math.max(-1,target-this.range);this.state.recentInitialized=true}
  const from=this.state.recentScanBlock+1;if(from>target)return
  const to=Math.min(target,from+this.range-1),headers=[],candidates=[]
  for(let height=from;height<=to;height++){
   const block=await this.send('eth_getBlockByNumber',[hexNumber(height),true]);if(!block)throw Error('RECENT_BLOCK_UNAVAILABLE_'+height)
   headers.push({number:height,hash:block.hash})
   for(const tx of block.transactions||[])if(tx.to===null){const receipt=await this.send('eth_getTransactionReceipt',[tx.hash]).catch(()=>null);if(receipt?.status==='0x1'&&receipt.contractAddress&&receipt.contractAddress!==ZERO)candidates.push({address:receipt.contractAddress,source:{type:'contract-creation',blockNumber:height,txHash:tx.hash}})}
   candidates.push(...await this.traceCreations(height))
  }
  const logs=await this.send('eth_getLogs',[{fromBlock:hexNumber(from),toBlock:hexNumber(to),topics:[TRANSFER]}])
  for(const log of logs)if(log.topics?.length===3&&/^0x[0-9a-fA-F]{64}$/.test(log.data||''))candidates.push({address:log.address,source:{type:'transfer-event',blockNumber:num(log.blockNumber),txHash:log.transactionHash}})
  for(const item of candidates)await this.candidate(item.address,item.source)
  this.state.headers=[...this.state.headers,...headers].slice(-128);this.state.recentScanBlock=to;this.state.currentBlock=latest;this.state.confirmedBlock=target
  await this.verifyMany([...new Set(candidates.map(x=>lower(x.address)))].filter(a=>this.shouldVerify(this.state.tokens[a])).slice(0,this.maxVerifications))
  this.state.updatedAt=new Date().toISOString();this.persist()
 }
 async traceCreations(height){
  if(this.state.traceAvailable===false)return []
  try{
   const traces=await this.send('debug_traceBlockByNumber',[hexNumber(height),{tracer:'callTracer',tracerConfig:{onlyTopCall:false}}])
   this.state.traceAvailable=true
   this.state.traceFailures=(this.state.traceFailures||[]).filter(f=>f.blockNumber!==height)
   const found=[]
   const walk=(frame,txHash)=>{if(!frame||typeof frame!=='object')return;if((frame.type==='CREATE'||frame.type==='CREATE2')&&/^0x[a-fA-F0-9]{40}$/.test(frame.to||'')&&frame.to!==ZERO)found.push({address:frame.to,source:{type:'internal-contract-creation',blockNumber:height,txHash}});for(const child of frame.calls||[])walk(child,txHash)}
   for(const tx of traces||[])walk(tx.result||tx,tx.txHash||tx.transactionHash||null)
   return found
  }catch(e){
   const text=String(e.code||e.message||'').toLowerCase()
   if(/method not found|not available|unsupported|\\-32601/.test(text)){
    this.state.traceAvailable=false;this.state.traceUnavailableReason=String(e.code||e.message||'TRACE_UNAVAILABLE').slice(0,120);this.state.traceFailures=[]
    return []
   }
   this.state.traceAvailable=true
   const failures=this.state.traceFailures||[],previous=failures.find(f=>f.blockNumber===height)
   const failure={blockNumber:height,attempts:(previous?.attempts||0)+1,lastAttemptAt:Date.now(),message:String(e.code||e.message||'TRACE_ERROR').slice(0,120)}
   this.state.traceFailures=[...failures.filter(f=>f.blockNumber!==height),failure].slice(-10000)
   return []
  }
 }
 async retryTraceFailures(max=4){
  if(this.state.traceAvailable===false)return
  const now=Date.now(),due=(this.state.traceFailures||[]).filter(f=>now-f.lastAttemptAt>=30000).slice(0,max)
  for(const failure of due)await this.traceCreations(failure.blockNumber)
 }
 async checkReorg(){
  const last=this.state.headers[this.state.headers.length-1];if(!last)return
  const block=await this.send('eth_getBlockByNumber',[hexNumber(last.number),false]);if(block?.hash?.toLowerCase()===last.hash.toLowerCase())return
  let common=null
  for(const h of [...this.state.headers].reverse())if((await this.send('eth_getBlockByNumber',[hexNumber(h.number),false]))?.hash?.toLowerCase()===h.hash.toLowerCase()){common=h;break}
  const rewind=common?.number??0
  for(const [key,token]of Object.entries(this.state.tokens)){
   token.sources=token.sources.filter(s=>!s.blockNumber||s.blockNumber<=rewind)
   if(!token.sources.length)delete this.state.tokens[key]
   else if(token.verificationStatus==='rejected'&&token.rejectionReason)token.verificationStatus='pending'
  }
  this.state.creationScanBlock=Math.min(this.state.creationScanBlock,rewind);this.state.transferScanBlock=Math.min(this.state.transferScanBlock,rewind);this.state.recentScanBlock=rewind;this.state.headers=this.state.headers.filter(h=>h.number<=rewind)
  this.state.lastReorg={time:new Date().toISOString(),rewoundTo:rewind};this.persist()
 }
 async tick(){
  if(this.busy)return
  this.busy=true
  try{
   const chain=num(await this.send('eth_chainId',[]));if(chain!==1919)throw Error('RPC_CHAIN_MISMATCH')
   if(this.state.explorer.done&&Date.now()-Date.parse(this.state.explorer.lastRefreshedAt||0)>60000){try{await this.fetchExplorerPage(true)}catch(e){this.state.explorer.lastError=String(e.message||'BLOCKSCOUT_ERROR').slice(0,120)}}
   for(let i=0;i<this.maxExplorerPages&&!this.state.explorer.done;i++){try{await this.fetchExplorerPage();this.state.explorer.lastError=null}catch(e){this.state.explorer.lastError=String(e.message||'BLOCKSCOUT_ERROR').slice(0,120);break}}
   await this.scanBlocks();await this.scanRecentBlocks();await this.retryTraceFailures()
   this.state.lastError=null
  }catch(e){this.state.lastError={time:new Date().toISOString(),message:String(e.reason||e.message||'INDEXER_ERROR').slice(0,180)};this.persist()}
  finally{this.busy=false}
 }
 start(){if(this.timer)return;this.tick();this.timer=setInterval(()=>this.tick(),this.intervalMs);this.timer.unref()}
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;if(this.db?.isOpen)this.db.close()}
 list({page=1,limit=50,search='',verified='',source='',verificationStatus='verified-erc20-interface'}={}){
  const all=Object.values(this.state.tokens).filter(t=>t.chainId===1919&&(verificationStatus==='all'||t.verificationStatus===verificationStatus))
  const q=String(search).trim().toLowerCase()
  let filtered=all.filter(t=>(!q||(t.name||'').toLowerCase().includes(q)||(t.symbol||'').toLowerCase().includes(q)||t.address.toLowerCase().includes(q))&&(!verified||(verified==='true'?t.trustStatus==='verified':t.trustStatus!=='verified'))&&(!source||t.sources.some(s=>s.type===source)))
  filtered.sort((a,b)=>(a.symbol||'').localeCompare(b.symbol||'')||a.address.localeCompare(b.address))
  const start=(page-1)*limit
  return {chainId:1919,page,limit,total:filtered.length,hasMore:start+limit<filtered.length,tokens:filtered.slice(start,start+limit).map(t=>({...t,icon_url:t.logoUrl||null,logoUrl:t.logoUrl||null,metadataSource:t.logoSource||null,price:null,tvl:null,volume24h:null}))}
 }
 status(){return {scannedThroughBlock:this.state.creationScanBlock,recentScanBlock:this.state.recentScanBlock,confirmedBlock:this.state.confirmedBlock||0,currentBlock:this.state.currentBlock||0,tokenCount:Object.keys(this.state.tokens).length,verifiedTokenCount:Object.values(this.state.tokens).filter(t=>t.verificationStatus==='verified-erc20-interface').length,explorerComplete:this.state.explorer.done,explorerError:this.state.explorer.lastError||null,pendingTokenCount:Object.values(this.state.tokens).filter(t=>t.verificationStatus==='pending').length,rejectedCandidateCount:Object.values(this.state.tokens).filter(t=>t.verificationStatus==='rejected').length,traceAvailable:this.state.traceAvailable,traceUnavailableReason:this.state.traceUnavailableReason||null,traceFailureCount:(this.state.traceFailures||[]).length,updatedAt:this.state.updatedAt,lastError:this.state.lastError||null}}
}
module.exports={TokenIndexer,TRANSFER,trustedLogo}
