# ENV değişkenleri: anlamı ve doğru değer kaynağı

Bu sayfa `.env.example` dosyasındaki değişkenlerin açıklamasıdır. `.env.example` içindeki dolu Turkchain adresleri bu kurulum için bildirilen envanterdir; yeni zincire kopyalanırken aynen bırakılmamalı, yeni zincirden doğrulanmış deployment adresleriyle değiştirilmelidir. Adresleri kontrat deploy manifestinden alın ve hedef RPC’de bytecode kontrolü yapın. Bu dosyada olmayan secret/şifreyi örnek dosyaya koymayın.

## Zincir, native coin, RPC

| Değişken | Ne işe yarar / nasıl doldurulur |
|---|---|
| `CHAIN_NAME` | Wallet ve API’deki ağın görünen adı; ağ dokümantasyonundaki ad. |
| `CHAIN_ID` | Decimal EVM chain ID; chain explorer/RPC ağ kaydından alınır. |
| `CHAIN_ID_HEX` | Aynı ID’nin hexadecimal biçimi; decimal ile aynı değeri göstermeli. |
| `NATIVE_TOKEN_NAME` | Ağın native gas coin adı. |
| `NATIVE_TOKEN_SYMBOL` | Native coin sembolü; örneğin Turkchain’de TURK. |
| `NATIVE_TOKEN_DECIMALS` | Native coin’in ondalık hassasiyeti; ağ dokümantasyonundan alınır. |
| `GAS_UNIT_NAME` | Gas fiyatının en küçük alt birimi için ağ sağlayıcısının kullandığı etiket. Bu sadece etiket; wei ölçeğini değiştirmez. |
| `RPC_HTTP_URL` | JSON-RPC HTTPS/HTTP endpoint. Sağlayıcı panelinden alınır; zorunlu, zincir ID’si kurulumda denetlenir. |
| `RPC_WSS_URL` | JSON-RPC WebSocket endpoint. Yalnızca sağlayıcı gerçekten verdiyse doldurun; yoksa boş. |
| `RPC_FALLBACK_URL` | Aynı chain ID için doğrulanmış yedek HTTP RPC; yoksa boş. |
| `RPC_TIMEOUT_MS` | RPC istek zaman aşımı milisaniye cinsinden. |
| `TURKCHAIN_WS_RPC_URL` | Kopyalanan API’nin şu an okuduğu websocket RPC override’ı. Bu isim Turkchain’e özeldir; başka zincire genel ENV adıyla refactor edilmeden kullanılamaz. |
| `TURKDEX_DATA_DIR` | API indexer/snapshot/SQLite verisinin kalıcı yazılacağı sunucu yolu. Boş bırakılırsa uygulamanın varsayılanı kullanılır; release klasörü dışındaki kalıcı disk tercih edilir. |
| `TURKDEX_V4_PRODUCTION_AUTHORIZED` | V4 işlem yürütme için backend kilidi. `false` kalmalı; yalnızca route’a özel izin, calldata, simülasyon, gas ve güvenlik doğrulamaları ve operatör onayı tamamlanınca değerlendirilebilir. |
| `BLOCK_EXPLORER_URL` | Transaction/token/pool bağlantılarının explorer kök URL’si; doğru ağ explorer’ı. |

## Marka, uygulama URL’leri ve sosyal bağlantılar

| Değişken | Ne işe yarar / nasıl doldurulur |
|---|---|
| `DEX_NAME`, `VITE_DEX_NAME` | Ana ürün markası. İkincisi frontend build ortamına aktarılacak public değerdir. TurkDex kullanın. |
| `DEX_X_NAME`, `VITE_DEX_X_NAME` | Genişletilmiş ürün adı. TurkDexX kullanın. Bunlar protokol/SDK kod adlarını global değiştirmek için kullanılmaz. |
| `DEX_PUBLIC_URL` | Kullanıcının açtığı DEX’in HTTPS kök adresi. DNS/TLS sonrası girilir. |
| `DEX_LOGO_URL` | TurkDex logosunun HTTPS adresi; yoksa boş. |
| `CHAIN_LOGO_URL` | Ağ logosu; yalnızca doğru ağ görseli varsa. |
| `NATIVE_TOKEN_LOGO_URL` | Native coin logosu; token kontratı logosuyla karıştırmayın. |
| `DEX_DOCS_URL` | Kullanıcı dokümantasyonu. |
| `DEX_SUPPORT_URL` | Destek sayfası/e-posta URL’si. |
| `DEX_SOCIAL_X_URL` | TurkDex X hesabı URL’si. |
| `DEX_TELEGRAM_URL` | Resmî Telegram topluluk/grup URL’si. |
| `DEX_DISCORD_URL` | Resmî Discord davet URL’si. |
| `DEX_GITHUB_URL` | TurkDex kaynak deposu. |
| `DEX_TERMS_URL` | Kullanım koşulları. |
| `DEX_PRIVACY_URL` | Gizlilik bildirimi. |
| `DEX_STATUS_URL` | Servis durum sayfası. |
| Yukarıdaki marka URL’leri | Değeriniz yoksa boş bırakın. Örnek veya Uniswap linkiyle doldurmayın. |

## TurkDex API adresleri ve endpoint yolları

| Değişken | Ne işe yarar / nasıl doldurulur |
|---|---|
| `DEX_API_BASE_URL` | Frontend’in kullandığı API public kök URL’si; mevcut ana ortamda `https://dexapi.turkscan.com`. |
| `DEX_API_PUBLIC_URL` | Tarayıcıdan erişilebilir API URL’si. Genellikle base URL ile aynı. |
| `DEX_API_INTERNAL_URL` | Sunucu içi servislerin API’ye erişim adresi; reverse proxy/topolojiye göre, yoksa boş. |
| `WALLETCONNECT_PROJECT_ID` | WalletConnect bağlantısı için WalletConnect Cloud projesinin public project ID’si. Bu bir private key değildir. WalletConnect kullanılmayacaksa boş bırakılmalı ve o connector build/config içinde kapatılmalıdır; doğrudan MetaMask provider’ı için bu değer gerekli olmamalıdır. |
| `DEX_API_HOST` | API listener bind adresi. Güvenlik için dışarı açılmayan loopback/private interface kullanın. |
| `DEX_API_PORT`, `PORT` | API portu. Bu API kodu `PORT` okuyor; reverse proxy ile eşleşmeli. |
| `DEX_API_PREFIX` | API sürümlü kök yolu; mevcut API `/api/v1`. |
| `DEX_API_HEALTH_PATH` | Health route. Yalnızca API’de gerçekten varsa kullanın. |
| `DEX_API_CHAIN_PATH` | Chain metadata route. |
| `DEX_API_CONTRACTS_PATH` | Contract registry route. |
| `DEX_API_TOKENS_PATH` | Token keşif/list route. |
| `DEX_API_POOLS_PATH` | Pool discovery/list route. |
| `DEX_API_POSITIONS_PATH` | Wallet position route. |
| `DEX_API_TRANSACTIONS_PATH` | Indexed protocol transaction route. |
| `DEX_API_METADATA_PATH` | Token metadata route. Mevcut API POST/GET davranışını route kodundan doğrulayın. |
| `DEX_API_EVENTS_PATH` | Realtime event route. Mevcut kaynak `/api/v1/stream/heads` SSE’dir. |
| `DEX_API_EVENT_STREAM_PATH` | Aynı SSE stream için alias. WebSocket değildir. |
| `DEX_API_QUOTE_PATH` | Quote endpoint. |
| `DEX_API_PREPARE_PATH` | Swap transaction preparation endpoint. |
| `DEX_API_APPROVAL_PATH` | Approval preparation endpoint. |
| `DEX_API_SIMULATE_PATH` | Transaction simulation endpoint. |
| `DEX_API_LIQUIDITY_PREPARE_PATH` | Likidite işlemi hazırlama route’u; mevcut API’de varlığı doğrulanmalı. |
| `DEX_API_PRICE_URL` | First-party price endpoint. Doğrulanmış endpoint yoksa boş; sahte fiyat kaynağı eklemeyin. |
| `DEX_API_ANALYTICS_URL` | First-party analytics endpoint. Mevcut değilse boş. |
| `DEX_API_LOGO_URL` | First-party logo/metadata endpoint’i; yoksa boş. |
| `DEX_API_INDEXER_URL` | Ayrı indexer servisi varsa adresi; API ile aynıysa boş/aynı base tasarıma göre. |
| `DEX_RPC_PROXY_URL` | Frontend’e özel RPC proxy varsa public URL; yoksa boş. Secret’lı proxy key frontend’e yazılmaz. |
| `DEX_API_WS_URL` | Gerçek WebSocket API varsa URL. SSE endpoint’i buraya yazılmaz; yoksa boş. |
| `DEX_API_TIMEOUT_MS` | API HTTP timeout milisaniyesi. |
| `DEX_API_RETRY_COUNT` | Tekrar denenebilir read-only HTTP isteklerinde retry adedi. İşlem gönderiminde kör retry kullanılmaz. |
| `TOKEN_METADATA_API_URL` | Token metadata için TurkDex API adresi; sadece gerçekten route varsa. |
| `TOKEN_PRICE_API_URL` | Güvenilir first-party price API; yoksa boş. |
| `TOKEN_LOGO_BASE_URL` | Adres bazlı logo kaynağı kökü; kaynağı doğrulanmadıysa boş. |

API yolları `.env.example` içinde mevcut production API route’larından alınmıştır. Yeni zincir sunucusunda bu endpoint’ler kurulmadan URL’yi doldurmak, endpoint’i oluşturmaz. TLS, CORS, authentication, rate limits ve health kontrolü de API sahibi tarafından ayarlanmalıdır.

## Feature ve gas bayrakları

| Değişken | Ne işe yarar / nasıl doldurulur |
|---|---|
| `ENABLE_V2`, `ENABLE_V3`, `ENABLE_V4` | İlgili protokol modülünün UI/API’de kullanılabilirliği. Gerekli kontrat/ABI yoksa `false`. |
| `ENABLE_SWAP`, `ENABLE_POOLS`, `ENABLE_POSITIONS` | Uygulama sayfası/feature bayrakları. Güvenlik yetkilendirmesi değildir. |
| `GAS_ESTIMATION_ENABLED` | Zincir RPC üzerinden gas tahmini. |
| `GAS_ESTIMATION_RPC_TIMEOUT_MS` | Gas/RPC işlemleri için timeout. |

## Kontrat ENV adresleri

Tüm adresler hedef chain üzerindeki deploy manifestinden gelmeli, 20 byte EVM adresi olmalı ve `eth_getCode` ile bytecode kontrolü yapılmalıdır. Blank ise özellik devre dışı kalmalıdır; Ethereum mainnet adresini varsayılan yapmayın.

| Değişken | Beklenen kontrat |
|---|---|
| `WNATIVE_TOKEN_ADDRESS` | Hedef chain’in wrapped-native ERC-20’si (native coin adresi değildir). |
| `USDT_ADDRESS` | Yalnızca o chain’deki gerçek USDT deployment’ı; başka chain’de USDT adresi varsaymayın. |
| `V2_FACTORY_ADDRESS` | V2 Factory. |
| `V2_ROUTER01_ADDRESS` | V2 Router01; deploy edilmemişse boş. |
| `V2_ROUTER02_ADDRESS` | V2 Router02. |
| `V2_INIT_CODE_HASH` | Factory pair CREATE2 init-code hash; yalnızca deployment source/factory ile doğrulanırsa. |
| `V3_FACTORY_ADDRESS` | V3 Factory. |
| `V3_SWAP_ROUTER_ADDRESS` | V3 SwapRouter. |
| `V3_SWAP_ROUTER02_ADDRESS` | V3 SwapRouter02. |
| `V3_QUOTER_ADDRESS` | Eski V3 Quoter; deployment yoksa boş. |
| `V3_QUOTER_V2_ADDRESS` | V3 QuoterV2. |
| `V3_POSITION_MANAGER_ADDRESS` | V3 NFT NonfungiblePositionManager. |
| `V3_TICK_LENS_ADDRESS` | V3 TickLens. |
| `V3_NFT_DESCRIPTOR_LIBRARY_ADDRESS` | V3 NFT descriptor library; sadece gerekiyorsa. |
| `V3_POSITION_DESCRIPTOR_ADDRESS` | V3 PositionDescriptor. |
| `V3_MIGRATOR_ADDRESS` | V3 migration helper. |
| `V4_POOL_MANAGER_ADDRESS` | V4 PoolManager. |
| `V4_POSITION_MANAGER_ADDRESS` | V4 PositionManager. |
| `V4_POSITION_DESCRIPTOR_ADDRESS` | V4 PositionDescriptor. |
| `V4_STATE_VIEW_ADDRESS` | V4 StateView. |
| `V4_QUOTER_ADDRESS` | V4 Quoter. |
| `V4_UNIVERSAL_ROUTER_ADDRESS` | Uygulamanın kullandığı, chain’de uyumluluğu doğrulanmış Universal Router. |
| `V4_HOOK_REGISTRY_ADDRESS` | Hook allowlist/registry varsa; mevcut değilse boş. |
| `CREATE2_FACTORY_ADDRESS` | CREATE2 deployment factory; protokol contract’ı olarak token listesine eklenmez. |
| `PERMIT2_ADDRESS` | Permit2. İzin spender’ı router/PositionManager işlemine göre ayrılır. |
| `MULTICALL3_ADDRESS` | Multicall3. |
| `UNISWAP_INTERFACE_MULTICALL_ADDRESS` | Interface multicall deployment; eksikse boş. Teknik adı upstream ABI kimliğidir. |
| `UNSUPPORTED_PROTOCOL_ADDRESS` | Deployment’ta bulunan protocol guard/helper. |
| `V3_ORDER_QUOTER_ADDRESS` | Order quoter yardımcı kontratı (deployed listing’de UniswapX OrderQuoter olarak belirtilmiş). |
| `V3_DUTCH_ORDER_REACTOR_ADDRESS` | Dutch order reactor. Bu V3 core pool sözleşmesi değildir. |
| `CONTINUOUS_AUCTION_FACTORY_ADDRESS` | Auction Factory. |
| `LIQUIDITY_LAUNCHER_ADDRESS` | Liquidity Launcher. |
| `TOKEN_SPLITTER_ADDRESS` | TokenSplitter yardımcı kontratı. |
| `LBP_STRATEGY_ADDRESS` | LBP strategy. |
| `UNIVERSAL_ROUTER_STRATEGY_ADDRESS` | Router strategy. |
| `UERC20_FACTORY_ADDRESS` | Token factory. Bu adres tek başına token listesine eklenmez. |
| `FEE_ON_TRANSFER_DETECTOR_ADDRESS` | Fee-on-transfer detector. |
| `TOKEN_REGISTRY_ADDRESS` | Token registry kontratı varsa; yoksa boş. |
| `PRICE_ORACLE_ADDRESS` | Fiyat oracle kontratı varsa ve güven modeli doğrulanmışsa; yoksa boş. |
| `SWAP_HELPER_ADDRESS` | Özel swap helper varsa; yoksa boş. |
| `LIQUIDITY_HELPER_ADDRESS` | Özel liquidity helper varsa; yoksa boş. |

## Bu paketteki önemli eksik

`.env.example` değerleri merkezi config ve zincir bytecode ön kontrolü için hazırlanmıştır; ancak mevcut upstream web bileşenlerinin tamamı henüz bu config’i kullanmıyor ve API’nin bazı registry/Chain ID değerleri kodda sabit. Bu sebeple ENV’nin açıklanmış olması, uygulamanın her değeri runtime’da kullandığı anlamına gelmez. Tamamlanma için API, SDK, frontend ve browser Network isteklerinin merkezi config’e geçirilmesi; başka zincire yönelik profile ise o zincir için gerçek deployment ve API ile uçtan uca test edilmesi gerekir.
