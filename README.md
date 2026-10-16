# Dex-Swap-Pool-Full--install
# TurkDex — ilk kurulum kılavuzu

Bu paket TurkDex’in tek zincirli kurulum taslağıdır. Turkchain için örnek profil Chain ID `1919` ile gelir. Ayrı bir sunucuya başka bir EVM ağı kurulacaksa o kurulumun kendi `.env` dosyası, RPC/API/explorer adresleri ve o ağda gerçekten dağıtılmış sözleşme adresleri girilmelidir. Zincir seçimi uygulama içinden yapılmaz.

> **Önemli durum:** Bu arşiv şu an canlıya kurulabilir tam sürüm değildir. Temiz kurulum, resmi arayüz kaynağında eksik olan `tools/uniswap-nx` workspace’i nedeniyle bağımlılık kurulumundan önce güvenli biçimde durur. Ayrıca arayüzdeki tüm Uniswap servis isteklerinin TurkDex API karşılıklarına taşınması ve API registry’sinin ENV’den yüklenmesi tamamlanmamıştır. Betik bu eksikleri atlamaz. Ayrıntı: [`docs/INSTALL_REQUIREMENTS.md`](docs/INSTALL_REQUIREMENTS.md), [`STATUS.txt`](STATUS.txt).

İlk kez kuranlar için DNS/TLS, ENV dışı gereksinimler, servis kurulumu, test/production ayrımı ve
mevcut engeller tek sayfalık [`SETUP.txt`](SETUP.txt) içinde de bulunur. ENV satırlarının ayrıntısı
[`docs/ENV_VARIABLES.md`](docs/ENV_VARIABLES.md) içindedir.

## Bu dosyalar ne işe yarar?

- `.env.example`: Zincir, uygulama markası, bütün URL’ler, API yolları, özellik bayrakları ve kontrat adresleri için açıklamalı olmayan örnek değerler. Gerçek kurulumda bunun kopyası `.env` olarak düzenlenir.
- `.env.test.example`: Gizli anahtar veya production DB bilgisi içermeyen ayrı test profili. Test profili ana profilden bağımsız kalır.
- `packages/config`: ENV değerlerini kontrol eden ortak yapılandırma ve testler.
- `deployment/registry.json`: Turkchain’de bilinen dağıtım envanteri. API’nin şu anki kaynak kodu bu envanteri henüz bütünüyle ENV override’larıyla kullanmıyor; ENV ile registry eşleştirmesi yapılmış kabul edilmemelidir.
- `apps/api`: Önceki TurkDex API/indexer kodunun kopyası. İçinde zincir kimliğine ve bazı URL/adreslere sabit bağlar vardır; yeni kurulum veya başka zincir için hazır API değildir.
- `interface`: Resmi Uniswap Interface kaynak checkout’u ve TurkDex için sınırlı yapılandırma başlangıçları. Ürün adı TurkDex/TurkDexX olmalıdır; Uniswap’a ait teknik paket/protokol adları kod kimliği oldukları için global metin değiştirmesiyle yeniden adlandırılmaz.
- `scripts/install.sh`: Önce ENV/RPC doğrulaması yapar; kaynak ve bağımlılık gereksinimleri tamamlanınca lockfile’dan kurulum, test ve build çalıştırmak üzere tasarlanmıştır. Şu an eksik upstream workspace’te durur.

## İlk kurulum adımları

Kurulumu Linux sunucuda, normal bir servis kullanıcısıyla yapın. Root hesabıyla web uygulaması çalıştırmayın. Önce sunucuda Node.js `22.22.2`, Bun `1.3.14+`, Bash, `sort -V`, yeterli disk alanı ve ENV’de belirttiğiniz HTTPS RPC/API erişimi bulunmalıdır. Build için kaynak, paket önbelleği ve build çıktısının toplamını karşılayacak boş alan gerekir.

```bash
unzip TurkDex-first-install-20261016-updated.zip -d turkdex-install
cd turkdex-install
cp .env.example .env
chmod 600 .env
${EDITOR:-vi} .env
```

`.env` dosyasındaki örnek Turkchain değerleri production örneğidir. Başka sunucuya kurarken bütün Turkchain URL’lerini ve kontratları hedef ağa ait doğrulanmış değerlerle değiştirin. API base URL’si ve site URL’si o kurulumun erişilebilir HTTPS adresleri olmalı. Veritabanı, API kimlik bilgileri veya başka sırlar eklenirse bunlar sadece sunucudaki `.env` içinde tutulmalı; `VITE_` değişkeni, ZIP, git veya tarayıcı build’ine sır koymayın.

Sonra önce salt-okunur doğrulama çalıştırın:

```bash
bash scripts/install.sh --env="$PWD/.env" --validate-only
```

Bu adım ENV’deki chain ID ile `eth_chainId` sonucunu karşılaştırır ve dolu `*_ADDRESS` değerlerinde bytecode olup olmadığını kontrol eder. **Bytecode bulunması kontratın doğru ABI/sürümle uyumlu olduğunu ispatlamaz.** Eksik/yanlış değer varsa install devam ettirilmemelidir.

Normal kurulum komutu:

```bash
bash scripts/install.sh --env="$PWD/.env"
```

Mevcut ZIP’te bu komut, eksik `tools/uniswap-nx` workspace’i nedeniyle `3` koduyla durmalıdır. Bu beklenen korumadır; kontrolü silmeyin, boş Nx paketi üretmeyin ve bu kaynakla Nginx/current symlink’ini değiştirmeyin. Önce `INSTALL_REQUIREMENTS.md` içindeki upstream kaynak ve TurkDex API işlerini tamamlayıp tüm testleri geçirin.

## ENV dosyasını nasıl doldurmalıyım?

Değişkenlerin tek tek anlamı ve doğru değer kaynağı [`docs/ENV_VARIABLES.md`](docs/ENV_VARIABLES.md) içindedir. Kısa özet:

1. Zincir adı/ID ve native coin bilgilerini hedef ağın resmi dokümantasyonundan alın; decimal ve hex Chain ID birbirini tutmalı.
2. HTTP RPC ve gerekiyorsa WSS adresini sağlayıcıdan alın; WSS’yi tahmin etmeyin. Kurulum betiği HTTP RPC’nin gerçek chain ID’sini kontrol eder.
3. Explorer ve web/API adresleri, DNS/TLS yönlendirmesi tamamlanmış gerçek URL’ler olmalı. Yeni servis için yeni subdomain gerekiyorsa önce DNS ve TLS kurulmalıdır.
4. Kontrat adreslerini hedef zincirin deployment manifesti ve RPC `eth_getCode` sonucu ile doğrulayın. Boş adres, o özelliğin dağıtımının bulunmadığını ifade eder; sıfır adres kullanmayın.
5. İlk kurulumda kullanmayacağınız V2/V3/V4 özelliğini `ENABLE_*` ile kapatabilirsiniz. Bayrak, kontrat dağıtmaz veya güvenlik yetkisi vermez.
6. Token fiyatı, logo, grafik, hacim veya APR endpoint’i gerçekten yoksa alanı boş bırakın. Sahte URL veya örnek fiyat eklemeyin.
7. Logo/docs/support/social/legal adresleri boş kalabilir. Boş bağlantılar ekranda gizlenmeli; bunların yerine Uniswap URL’si kullanılmamalıdır.

## Marka ve URL’ler

`DEX_NAME` / `VITE_DEX_NAME` ana marka, `DEX_X_NAME` / `VITE_DEX_X_NAME` genişletilmiş ürün adıdır (TurkDex ve TurkDexX). Site, API, RPC, explorer, WSS, token metadata/logo, fiyat, analytics, dokümantasyon, destek, sosyal medya, hukuki metinler ve durum sayfası için değişkenler aynı `.env` dosyasında tanımlıdır.

**Kaynak entegrasyonu henüz tamamlanmadığı için bu ENV değişkenlerinin tümü şu anda her upstream web bileşenine bağlanmış değildir.** Başarı ölçütü yalnızca ENV’de URL bulunması değil; web build’inde zincire/markaya ait bütün isteklerin bu config üzerinden geçmesi ve Uniswap servis hostlarına istek kalmadığının browser network testiyle kanıtlanmasıdır. Bu şartlar sağlanmadan yeni sürüm canlıya alınmamalıdır.

## Test ve production güvenliği

ENV unit testlerini `node --test packages/config/test/env.test.mjs` ile çalıştırın. Bu testler ağına fon göndermeden yapılandırmayı test eder. `.env.test.example` ayrı test API portu (`13919`) ve kapalı V4 execution gösterir; test için production DB veya write-capable cüzdan kullanmayın.

Bu paket kontrat dağıtmaz, kullanıcı onayı/approval/swap göndermez ve production servislerini etkinleştirmez. Build, browser/API smoke testleri ve rollback planı geçmeden eski canlı release’i silmeyin. Mevcut TurkDex production’ı paketten farklıysa, kurulum başarılı olana kadar çalışan `current` symlink’i ve rollback release’lerini koruyun.
