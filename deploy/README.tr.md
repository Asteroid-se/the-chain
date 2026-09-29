# The Chain'i internete açma

Bu kurulum tek bir Linux sunucuda Docker Compose ile çalışır. SQLite verisi `chain_data`, indirilen medya dosyaları `chain_files` adlı kalıcı Docker biriminde tutulur. Caddy, HTTPS sertifikasını alır ve tüm sayfalar ile API uç noktalarını tek bir parola ile korur. Doğrudan, herkese açık medya dosyası URL'leri gerçek dosya oluşturur; YouTube, Instagram ve TikTok sayfa bağlantıları demo adaptörlerini kullanır. Parolayı bilen herkes aynı kuyruğu, geçmişi, dosyaları ve istatistikleri görür.

## Gerekenler

- Bir Linux VPS ve ona bağlanan bir alan adı veya alt alan adı.
- Sunucuda Docker Engine ve Docker Compose eklentisi.
- GitHub'daki `asteroid-se/the-chain` deposuna erişim. Özel depoysa sunucudan klonlamak için ayrıca GitHub kimlik doğrulaması gerekir.
- Sunucunun güvenlik duvarında TCP 80 ve TCP 443 açık olmalı; isterseniz HTTP/3 için UDP 443 de açın. Next.js'in 3000 numaralı portunu internete açmayın.

## Kurulum

1. Alan adınızın DNS `A` kaydını VPS'nin genel IPv4 adresine yönlendirin. IPv6 kullanıyorsanız `AAAA` kaydını da doğru adrese yönlendirin.
2. Sunucuda projeyi klonlayın ve klasöre girin:

   ```sh
   git clone https://github.com/asteroid-se/the-chain.git
   cd the-chain
   ```

3. Güçlü bir parola seçin. Caddy için bcrypt özeti oluşturun:

   ```sh
   docker run --rm -it caddy:2 caddy hash-password
   ```

4. Komut parola isteyince yazın; terminale yazdığınız karakterler görünmez. `.env.deploy.example` dosyasını `.env.deploy` adıyla kopyalayın. `SITE_DOMAIN` değerini kendi alan adınızla, `SITE_PASSWORD_HASH` değerini komutun çıktısıyla değiştirin. Hash'in etrafındaki tek tırnakları koruyun. Parolayı veya `.env.deploy` dosyasını GitHub'a eklemeyin.
5. Uygulamayı başlatın:

   ```sh
   docker compose up -d --build
   docker compose ps
   docker compose logs --tail=100 app caddy
   ```

6. `https://ALAN_ADINIZ` adresini açın. Tarayıcı kullanıcı adı olarak `demo`, parola olarak seçtiğiniz parolayı ister. Caddy, DNS ve 80/443 bağlantısı çalışıyorsa HTTPS sertifikasını otomatik alır.

## Güncelleme ve veri

```sh
git pull
docker compose up -d --build
```

Güncelleme `chain_data` ve `chain_files` birimlerini silmez. `docker compose down -v` komutu veritabanı, medya ve sertifika birimlerini silebilir; kullanmayın. VPS sağlayıcınızda `chain_data` ve `chain_files` için düzenli yedek alın ve disk kullanımını izleyin. Varsayılan dosya sınırı 512 MB'dir; `compose.yaml` içindeki `MAX_MEDIA_BYTES` ile değiştirilebilir. Bu örnekte başlangıçta `prisma db push` şemayı eşitler. İleride veri şeması değiştirirken sürümlü Prisma migration kullanın.

Bu kurulum tek kullanıcı/parola sınırına sahip. Her ziyaretçinin kendi kuyruğu ve geçmişi olmasını istiyorsanız kullanıcı oturumu, kayıt sahipliği, erişim denetimi ve gerçek bir çok kullanıcılı veritabanı eklenmelidir. Parolayı kaldırıp mevcut API'yi açık internete sunmayın.
