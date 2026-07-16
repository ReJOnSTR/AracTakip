import SwiftUI
import ExpoModulesCore

// State object for the Glass Button props
class GlassButtonState: ObservableObject {
  @Published var icon: String = "plus"
  @Published var size: Double = 40.0
  @Published var prominent: Bool = false
}

struct NativeGlassButtonSwiftUIView: View {
  @ObservedObject var state: GlassButtonState
  var onPress: () -> Void
  
  var body: some View {
    Button(action: {
      onPress()
    }) {
      Image(systemName: state.icon)
        .font(.system(size: state.size * 0.45, weight: .bold))
        .foregroundColor(state.prominent ? .white : Color.pink) // Uses Apple Music Pink for accent
        .frame(width: state.size, height: state.size)
    }
    .buttonStyle(.glass) // Uses Apple's official iOS 26 GlassButtonStyle
    .frame(width: state.size, height: state.size)
  }
}

class NativeUiGlassButtonViewWrapper: ExpoView {
  private let hostingController = UIHostingController(rootView: NativeGlassButtonSwiftUIView(state: GlassButtonState(), onPress: {}))
  private let state = GlassButtonState()
  
  let onButtonPress = EventDispatcher()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    
    hostingController.rootView = NativeGlassButtonSwiftUIView(
      state: state,
      onPress: { [weak self] in
        self?.onButtonPress([:])
      }
    )
    
    addSubview(hostingController.view)
    hostingController.view.backgroundColor = .clear
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController.view.frame = bounds
  }
  
  func setIcon(_ icon: String) {
    state.icon = icon
  }
  
  func setSize(_ size: Double) {
    state.size = size
  }
  
  func setProminent(_ prominent: Bool) {
    state.prominent = prominent
  }
}
