const {test}=require('node:test'),assert=require('node:assert/strict'),{positions,named}=require('../positions.cjs'),{ethers}=require('ethers')
test('incomplete NFT history cannot masquerade as empty positions',async()=>{await assert.rejects(positions({indexer:{state:{nftHistoryComplete:false,confirmedBlock:1}}}),/still indexing/)})
test('empty fully indexed histories report genuine empty positions without RPC calls',async()=>{
 const registry=require('../../registry.json'),owner='0x0000000000000000000000000000000000000001'
 const result=await positions({provider:{send:()=>{throw Error('unexpected call')}},registry,owner,indexer:{state:{nftHistoryComplete:true,confirmedBlock:5,contracts:[{name:'V2Factory',logs:[]}]},owners:()=>[]}})
 assert.equal(result.blockNumber,5);assert.equal(result.totalNftPositions,0);assert.deepEqual(result.positions,[]);assert.equal(result.transactionsEnabled,false)
})
test('position values retain integer precision for UI consumption',()=>{
 const args=[ethers.BigNumber.from('1234567890123456789012345')];args.liquidity=args[0]
 assert.deepEqual(named(args),{liquidity:'1234567890123456789012345'})
})
