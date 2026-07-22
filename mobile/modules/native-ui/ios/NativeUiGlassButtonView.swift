import SwiftUI
import ExpoModulesCore
import UIKit

// State object for the Glass Button props
class GlassButtonState: ObservableObject {
  @Published var icon: String = "plus"
  @Published var size: Double = 38.0
  @Published var prominent: Bool = false
  @Published var colorScheme: String = "dark"
}

// SwiftUI Native Liquid Glass Button View with Translucent Material Blur & Tint Opacity
struct NativeGlassButtonSwiftUIView: View {
  @ObservedObject var state: GlassButtonState
  var onPress: () -> Void
  
  private var isDark: Bool {
    state.colorScheme == "dark"
  }
  
  var body: some View {
    Button(action: {
      onPress()
    }) {
      Image(systemName: state.icon)
        .font(.system(size: state.size * 0.44, weight: .semibold))
        .foregroundColor(
          state.prominent
            ? Color.white
            : (isDark ? Color.white : Color(red: 0.22, green: 0.32, blue: 0.92))
        )
        .frame(width: state.size, height: state.size)
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .background {
      ZStack {
        // Liquid Glass Translucency with Tint Opacity (0.15 iOS Standard / 0.45 Prominent Accent)
        Circle()
          .fill(
            state.prominent
              ? AnyShapeStyle(Color(red: 0.25, green: 0.35, blue: 0.95).opacity(0.75))
              : AnyShapeStyle(Material.ultraThinMaterial)
          )
        
        // Liquid Glass Ambient Tint Kırılması
        Circle()
          .fill(
            state.prominent
              ? Color.blue.opacity(0.35)
              : (isDark ? Color.white.opacity(0.12) : Color.white.opacity(0.18))
          )
        
        // Ambient Specular Light Reflection
        Circle()
          .fill(
            LinearGradient(
              colors: isDark
                ? [Color.white.opacity(0.18), Color.white.opacity(0.04)]
                : [Color.white.opacity(0.65), Color.white.opacity(0.15)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
      }
    }
    .overlay {
      // Specular Glass Border
      Circle()
        .strokeBorder(
          LinearGradient(
            colors: isDark
              ? [Color.white.opacity(0.35), Color.white.opacity(0.1)]
              : [Color.white.opacity(0.8), Color.white.opacity(0.25)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          ),
          lineWidth: 1.0
        )
    }
    .shadow(color: Color.black.opacity(isDark ? 0.22 : 0.08), radius: 6, x: 0, y: 3)
    .clipShape(Circle())
    .frame(width: state.size, height: state.size)
  }
}

class NativeUiGlassButtonViewWrapper: ExpoView {
  private let hostingController = UIHostingController(rootView: NativeGlassButtonSwiftUIView(state: GlassButtonState(), onPress: {}))
  private let state = GlassButtonState()
  
  let onButtonPress = EventDispatcher()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    
    backgroundColor = .clear
    isOpaque = false
    
    hostingController.view.backgroundColor = .clear
    hostingController.view.isOpaque = false
    
    hostingController.rootView = NativeGlassButtonSwiftUIView(
      state: state,
      onPress: { [weak self] in
        self?.onButtonPress([:])
      }
    )
    
    addSubview(hostingController.view)
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController.view.frame = bounds
    hostingController.view.backgroundColor = .clear
    hostingController.view.isOpaque = false
  }
  
  func setIcon(_ icon: String) {
    DispatchQueue.main.async {
      self.state.icon = icon
    }
  }
  
  func setSize(_ size: Double) {
    DispatchQueue.main.async {
      self.state.size = size
    }
  }
  
  func setProminent(_ prominent: Bool) {
    DispatchQueue.main.async {
      self.state.prominent = prominent
    }
  }
  
  func setColorScheme(_ colorScheme: String) {
    DispatchQueue.main.async {
      self.state.colorScheme = colorScheme
    }
  }
}
