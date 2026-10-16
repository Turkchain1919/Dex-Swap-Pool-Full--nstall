import pathlib,json,urllib.request,concurrent.futures,time,datetime
r=pathlib.Path(pathlib.Path("/root/turkchain-uniswap-staging-path").read_text().strip());reg=json.loads((r/"registry.json").read_text())
def rpc(method,params):
 for attempt in range(3):
  try:
   req=urllib.request.Request(reg["rpc"],data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),headers={"Content-Type":"application/json"})
   d=json.load(urllib.request.urlopen(req,timeout=25))
   if "error" in d:raise RuntimeError(str(d["error"]))
   return d["result"]
  except Exception:
   if attempt==2:raise
   time.sleep(2**attempt)
end=int(rpc("eth_blockNumber",[]),16)-5
contracts={n:reg["contracts"][n] for n in ["V2Factory","V3Factory","V4PoolManager"]}
topics=["0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9","0x783cca1c0412dd0d695e784568c96da2e9c22ff989357a2e8b1d9b2b4e6b7118"]
# Derive exact V3/V4 signatures using the installed official ABI tooling remotely.
import subprocess
script="const{ethers}=require('ethers');console.log(ethers.utils.id('PoolCreated(address,address,uint24,int24,address)'));console.log(ethers.utils.id('Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)'))"
out=subprocess.check_output(["/root/.nvm/versions/node/v22.22.2/bin/node","-e",script],cwd=r/"integration",text=True).splitlines();topics=[topics[0]]+out
d=r/"reports/log-ranges";d.mkdir(exist_ok=True)
def scan(start):
 finish=min(start+9999,end);p=d/(str(start)+"-"+str(finish)+".json")
 if p.exists():return json.loads(p.read_text())
 result={"fromBlock":start,"toBlock":finish,"logs":rpc("eth_getLogs",[{"fromBlock":hex(start),"toBlock":hex(finish),"address":list(contracts.values()),"topics":[topics]}])}
 p.write_text(json.dumps(result));return result
allranges=[];errors=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures={pool.submit(scan,start):start for start in range(0,end+1,10000)}
 for f in concurrent.futures.as_completed(futures):
  try:allranges.append(f.result())
  except Exception as e:errors.append({"fromBlock":futures[f],"error":str(e)})
  (r/"reports/discovery-progress.json").write_text(json.dumps({"completedRanges":len(allranges),"totalRanges":len(futures),"errors":errors,"confirmedBlock":end}))
logs=[log for item in allranges for log in item["logs"]]
result={"chainId":1919,"confirmedBlock":end,"completed":not errors,"errors":errors,"ranges":len(allranges),"contracts":[{"name":name,"address":address,"logs":[x for x in logs if x["address"].lower()==address.lower()]} for name,address in contracts.items()]}
(r/"reports/full-pool-discovery.json").write_text(json.dumps(result,indent=2))
print(json.dumps({**result,"contracts":[{"name":x["name"],"events":len(x["logs"])} for x in result["contracts"]]},indent=2))
