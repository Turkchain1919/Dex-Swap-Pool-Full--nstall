const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{ethers}=require('ethers'),{save,get}=require('../token-metadata.cjs')
const token='0x1111111111111111111111111111111111111111',creator='0x2222222222222222222222222222222222222222',recipient='0x3333333333333333333333333333333333333333',hash='0x'+'ab'.repeat(32),supply=ethers.utils.parseUnits('1000',18)
function fixture(){
 const iface=new ethers.utils.Interface(['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)','function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)'])
 const provider={_isProvider:true,getTransactionReceipt:async()=>({status:1,contractAddress:token,transactionHash:hash}),getCode:async()=> '0x6001',call:async tx=>{
  const parsed=iface.parseTransaction({data:tx.data})
  const values={name:['Demo Token'],symbol:['DEMO'],decimals:[18],totalSupply:[supply],balanceOf:[supply]}
  return iface.encodeFunctionResult(parsed.name,values[parsed.name])
 }}
 return {provider,body:{chainId:1919,address:token,creator,recipient,hash,name:'Demo Token',symbol:'DEMO',decimals:18,supply:'1000',description:'Sample',logo:'',website:'https://example.org',twitter:'',telegram:'',github:''}}
}
test('metadata stores only after matching a successful Turkchain deployment receipt and ERC-20 state',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'turkdex-meta-')),f=fixture()
 try{
  const saved=await save({provider:f.provider,dataDir:dir,body:f.body})
  assert.equal(saved.chainId,1919);assert.equal(saved.address,token);assert.equal(saved.verificationStatus,'unverified');assert.equal(saved.explorerVerification,'not-submitted')
  assert.equal(get({dataDir:dir,address:token}).metadata.description,'Sample')
  assert.equal((fs.statSync(path.join(dir,'token-metadata.json')).mode&0o777),0o600)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('metadata rejects wrong chains, bad receipts, and non-image data URLs',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'turkdex-meta-')),f=fixture()
 try{
  await assert.rejects(save({provider:f.provider,dataDir:dir,body:{...f.body,chainId:1}}),e=>e.code==='WRONG_CHAIN')
  await assert.rejects(save({provider:f.provider,dataDir:dir,body:{...f.body,logo:'data:text/html;base64,PHNjcmlwdD4='}}),e=>e.code==='INVALID_LOGO')
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
