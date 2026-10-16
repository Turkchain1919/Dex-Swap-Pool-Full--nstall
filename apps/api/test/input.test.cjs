const {test}=require('node:test'),assert=require('node:assert/strict'),{input}=require('../server.cjs')
test('Turkchain quote validation permits arbitrary addresses for later on-chain ERC-20 verification',()=>{
 const result=input({chainId:1919,tokenIn:'0x34974f5c83915762e3ba9c487e09465c801ad9e3',tokenOut:'0xcd0d7b9eeec0897afcca0f0739ddecb830171271',amount:'1000000000000000000',protocols:['V4']})
 assert.equal(result.tokenIn.toLowerCase(),'0x34974f5c83915762e3ba9c487e09465c801ad9e3')
 assert.equal(result.tokenOut.toLowerCase(),'0xcd0d7b9eeec0897afcca0f0739ddecb830171271')
})
