import SwiftUI
import ExpoModulesCore
import UIKit

// State object for Glass Button props
class GlassButtonState: ObservableObject {
  @Published var icon: String = "plus"
  @Published var size: Double = 38.0
  @Published var colorScheme: String = "dark"
}

// GlassButton View (Exact code provided by user without color tint)
struct GlassButtonView: View {
  @ObservedObject var state: GlassButtonState
  var action: () -> Void
  
  private var btnSize: CGFloat {
    CGFloat(state.size > 0 ? state.size : 38.0)
  }
  
  private var isDark: Bool {
    state.colorScheme == "dark"
  }
  
  var body: some View {
    if #available(iOS 18.0, *) {
      Button {
        action()
      } label: {
        Image(systemName: state.icon)
          .font(.system(size: btnSize * 0.44, weight: .semibold))
          .foregroundStyle(isDark ? Color.white : Color.black)
          .frame(width: btnSize, height: btnSize)
      }
      .frame(width: btnSize, height: btnSize)
      .contentShape(Circle())
      .clipShape(Circle())
      .glassEffect(
        .regular.interactive(),
        in: Circle()
      )
    } else {
      Button {
        action()
      } label: {
        Image(systemName: state.icon)
          .font(.system(size: btnSize * 0.44, weight: .semibold))
          .foregroundColor(isDark ? .white : .black)
          .frame(width: btnSize, height: btnSize)
      }
      .frame(width: btnSize, height: btnSize)
      .contentShape(Circle())
      .clipShape(Circle())
      .buttonStyle(.borderedProminent)
      .tint(.clear)
    }
  }
}

// Native Expo View wrapper around GlassButtonView UIHostingController
class NativeUiGlassButtonViewWrapper: ExpoView {
  private let state = GlassButtonState()
  private var hostingController: UIHostingController<GlassButtonView>?
  
  let onButtonPress = EventDispatcher()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    
    backgroundColor = .clear
    isOpaque = false
    
    let glassButton = GlassButtonView(
      state: state,
      action: { [weak self] in
        self?.onButtonPress([:])
      }
    )
    
    let host = UIHostingController(rootView: glassButton)
    host.view.backgroundColor = .clear
    host.view.isOpaque = false
    self.hostingController = host
    
    addSubview(host.view)
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    if let hostView = hostingController?.view {
      let size = CGFloat(state.size > 0 ? state.size : 38.0)
      hostView.frame = CGRect(
        x: (bounds.width - size) / 2,
        y: (bounds.height - size) / 2,
        width: size,
        height: size
      )
      hostView.backgroundColor = .clear
      hostView.isOpaque = false
    }
  }
  
  func setIcon(_ icon: String) {
    DispatchQueue.main.async {
      self.state.icon = icon
    }
  }
  
  func setSize(_ size: Double) {
    DispatchQueue.main.async {
      self.state.size = size
      self.setNeedsLayout()
    }
  }
  
  func setProminent(_ prominent: Bool) {
    DispatchQueue.main.async {
    }
  }
  
  func setColorScheme(_ colorScheme: String) {
    DispatchQueue.main.async {
      self.state.colorScheme = colorScheme
    }
  }
}
