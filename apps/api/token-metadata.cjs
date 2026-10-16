'use strict'
const fs=require('node:fs'),path=require('node:path'),{ethers}=require('ethers')
let writeQueue=Promise.resolve()
const abi=['function name() view returns(string)','function symbol() view returns(string)','function decimals() view returns(uint8)','function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)']
const address=(v)=>{try{return ethers.utils.getAddress(v)}catch{throw Object.assign(Error('Token address is invalid'),{status:400,code:'INVALID_ADDRESS'})}}
const optionalUrl=(v,name)=>{if(v===undefined||v==='')return '';if(typeof v!=='string'||v.length>2048)throw Object.assign(Error(name+' URL is too long'),{status:400,code:'INVALID_METADATA'});let u;try{u=new URL(v)}catch{throw Object.assign(Error(name+' must be an HTTP(S) URL'),{status:400,code:'INVALID_METADATA'})}if(!['http:','https:'].includes(u.protocol))throw Object.assign(Error(name+' must be an HTTP(S) URL'),{status:400,code:'INVALID_METADATA'});return u.toString()}
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
async function save({provider,dataDir,body}){
 if(body.chainId!==1919)throw Object.assign(Error('Only Turkchain Mainnet (1919) is supported'),{status:400,code:'WRONG_CHAIN'})
 const tokenAddress=address(body.address),creator=address(body.creator),recipient=address(body.recipient)
 if(typeof body.hash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(body.hash))throw Object.assign(Error('Successful deployment transaction hash is required'),{status:400,code:'INVALID_RECEIPT'})
 const description=String(body.description||'');if(description.length>500)throw Object.assign(Error('Description exceeds 500 characters'),{status:400,code:'INVALID_METADATA'})
 let logo=String(body.logo||'')
 if(logo&&(logo.length>280000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(logo)))throw Object.assign(Error('Logo must be a small PNG, JPEG, or WebP data URL'),{status:400,code:'INVALID_LOGO'})
 const metadata={description,logo,website:optionalUrl(body.website,'Website'),twitter:optionalUrl(body.twitter,'X/Twitter'),telegram:optionalUrl(body.telegram,'Telegram'),github:optionalUrl(body.github,'GitHub')}
 const receipt=await provider.getTransactionReceipt(body.hash)
 if(!receipt||receipt.status!==1||!receipt.contractAddress||receipt.contractAddress.toLowerCase()!==tokenAddress.toLowerCase())throw Object.assign(Error('Deployment receipt is not confirmed for this token'),{status:409,code:'RECEIPT_NOT_CONFIRMED'})
 if(await provider.getCode(tokenAddress)==='0x')throw Object.assign(Error('Token contract has no deployed bytecode'),{status:400,code:'TOKEN_NOT_CONTRACT'})
 const c=new ethers.Contract(tokenAddress,abi,provider)
 let name,symbol,decimals,totalSupply,recipientBalance
 try{[name,symbol,decimals,totalSupply,recipientBalance]=await Promise.all([c.name(),c.symbol(),c.decimals(),c.totalSupply(),c.balanceOf(recipient)])}catch{throw Object.assign(Error('Contract does not expose the required ERC-20 metadata and balance functions'),{status:400,code:'NOT_ERC20'})}
 if(name!==body.name||symbol!==body.symbol||Number(decimals)!==Number(body.decimals)||!ethers.utils.parseUnits(String(body.supply),Number(decimals)).eq(totalSupply)||recipientBalance.lt(totalSupply))throw Object.assign(Error('Submitted metadata does not match the deployed ERC-20 token'),{status:400,code:'TOKEN_DATA_MISMATCH'})
 const file=path.join(dataDir,'token-metadata.json'),key='1919:'+tokenAddress.toLowerCase()
 const record={chainId:1919,address:tokenAddress,name,symbol,decimals:Number(decimals),totalSupply:totalSupply.toString(),creator,recipient,transactionHash:receipt.transactionHash,createdAt:new Date().toISOString(),verificationStatus:'unverified',explorerVerification:'not-submitted',metadata}
 const write=writeQueue.then(()=>{
  const records=read(file);records[key]=record;fs.mkdirSync(dataDir,{recursive:true})
  const temp=file+'.'+require('node:crypto').randomUUID()+'.tmp'
  fs.writeFileSync(temp,JSON.stringify(records,null,2)+'\n',{mode:0o600});fs.renameSync(temp,file)
 })
 writeQueue=write.catch(()=>undefined)
 await write
 return record
}
function get({dataDir,address:tokenAddress}){const target=address(tokenAddress),record=read(path.join(dataDir,'token-metadata.json'))['1919:'+target.toLowerCase()];if(!record)throw Object.assign(Error('Token metadata was not submitted'),{status:404,code:'METADATA_NOT_FOUND'});return record}
module.exports={save,get}
