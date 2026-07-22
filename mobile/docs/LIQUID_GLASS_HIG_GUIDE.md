# Apple SwiftUI Liquid Glass & Material Design Guide (HIG)

Bu doküman, Apple'ın iOS / visionOS tasarım dilindeki **Liquid Glass (Likit Cam)** ve **SwiftUI Material System** resmi yönergelerine göre hazırlanmıştır.

## 1. Likit Cam (Liquid Glass) Temel İlkeleri

Likit Cam, düz buzlu camın (frosted glass) ötesinde; optik kırılma (refraction), canlı ortam ışığı yansıması (specular highlight) ve dinamik derinlik sağlayan dijital meta-materyal sistemidir.

### Temel Tasarım Bileşenleri:
1. **Zemin Materyali (Base Material)**: 
   - `Material.ultraThinMaterial` (Koyu Mod için maksimum şeffaf kırılma)
   - `Material.thinMaterial` (Açık Mod için dengeli okunabilirlik)
2. **Işık Yansıması & Speküler İşıma (Ambient Light Highlight)**:
   - Üstten alta doğru yumuşak beyaz/açık ton geçişli `LinearGradient` katmanı.
3. **Işık Kırılma Sınırı (Glass Edge Border Stroke)**:
   - Kapsül veya yuvarlatılmış dikdörtgen kenarlarında ışığın kırılmasını simüle eden inceltilmiş gradyan `strokeBorder`.
4. **Derinlik Gölgesi (Elevated Depth Shadow)**:
   - İçeriğin üzerinde süzüldüğünü hissettiren geniş yarıçaplı yumuşak siyah gölge (`radius: 16-20, opacity: 0.12 - 0.35`).
5. **Aktif Sekme İndikatörü (Active Tab Indicator)**:
   - Cam kapsül içerisinde aktifleşen sekmenin arkasında akıcı yay animasyonu (`.matchedGeometryEffect` + `.spring()`) ile hareket eden transparan vurgu pill'i.

---

## 2. SwiftUI Kod Şablonu (HIG Standartlarına Uygun)

```swift
import SwiftUI

struct LiquidGlassCapsule: ViewModifier {
    var isDark: Bool
    
    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    // 1. Base Material
                    Capsule()
                        .fill(isDark ? Material.ultraThinMaterial : Material.thinMaterial)
                    
                    // 2. Ambient Light Gradient
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: isDark
                                    ? [Color.white.opacity(0.09), Color.white.opacity(0.02)]
                                    : [Color.white.opacity(0.65), Color.white.opacity(0.2)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                }
            )
            .overlay(
                // 3. Glass Refraction Border
                Capsule()
                    .strokeBorder(
                        LinearGradient(
                            colors: isDark
                                ? [Color.white.opacity(0.25), Color.white.opacity(0.06)]
                                : [Color.white.opacity(0.85), Color.white.opacity(0.4)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(
                // 4. Soft Ambient Shadow
                color: Color.black.opacity(isDark ? 0.35 : 0.12),
                radius: 16,
                x: 0,
                y: 8
            )
    }
}
```
