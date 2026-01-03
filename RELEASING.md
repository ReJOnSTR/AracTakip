# 🚀 Güncelleme Yayınlama Rehberi

Kullanıcılara otomatik güncelleme göndermek için yapman gerekenler:

## 1. Hazırlık
Önce GitHub erişimi için bir **Token** almalısın.
1. GitHub > Settings > Developer settings > Personal access tokens (Tokens (classic)).
2. `Generate new token` de.
3. `repo` kutucuğunu işaretle (tüm repo izinlerini ver).
4. Token'ı kopyala.

Mac/Linux terminalinde token'ı tanımla (her terminal açtığında veya `.zshrc` dosyana ekleyebilirsin):
```bash
export GH_TOKEN="ghp_SENIN_TOKEN_KODUN_BURAYA"
```

## 2. Versiyon Yükseltme
`package.json` dosyasını aç ve versiyonu artır.
Örn: `"version": "1.0.0"` -> `"version": "1.0.1"`

## 3. Güncellemeyi Yayınla
Terminalde şu komutu çalıştır:
```bash
npm run publish
```

Bu komut şunları yapar:
1. Projeyi derler (Build).
2. `dmg` ve `zip` dosyalarını oluşturur.
3. GitHub Releases kısmına yeni bir "Draft" release olarak yükler.

## 4. Son Adım (GitHub)
1. GitHub reponda **Releases** sekmesine git.
2. Yeni oluşan (Draft) versiyonu gör.
3. "Edit" diyip "Publish release" butonuna bas.

✅ **Bitti!**
Kullanıcılar uygulamayı açtıklarında (veya Ayarlar > Denetle dediklerinde) yeni sürümü görüp indirecekler.
