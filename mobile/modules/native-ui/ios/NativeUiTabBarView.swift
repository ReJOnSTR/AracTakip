import SwiftUI
import ExpoModulesCore

// State object to share react native props with SwiftUI view
class TabBarState: ObservableObject {
  @Published var activeTab: String = "index"
  @Published var showPlusButton: Bool = false
  @Published var colorScheme: String = "dark"
}

// SwiftUI Native Tab Bar Layout - Pure Official TabView with sidebarAdaptable (iOS 18 / iOS 26 Style)
struct NativeTabBarSwiftUIView: View {
  @ObservedObject var state: TabBarState
  var onTabPress: (String) -> Void
  
  var body: some View {
    // 1. Apple's Official TabView with the new Adaptive Sidebar style
    TabView(selection: Binding(
      get: { state.activeTab },
      set: { newValue in
        // Sync selection changes back to React Native
        state.activeTab = newValue
        onTabPress(newValue)
      }
    )) {
      // 2. Modern Tab views with native titles and SF Symbols
      Tab("Panel", systemImage: "house", value: "index") {
        Color.clear // Transparent content since screens are managed in React Native JS
      }
      
      Tab("Araçlar", systemImage: "car", value: "vehicles") {
        Color.clear
      }
      
      Tab("Personel", systemImage: "person.2", value: "employees") {
        Color.clear
      }
      
      Tab("Diğer", systemImage: "ellipsis.circle", value: "more") {
        Color.clear
      }
      
      Tab("Profil", systemImage: "person.crop.circle", value: "profile") {
        Color.clear
      }
    }
    .tabViewStyle(.sidebarAdaptable)
    .background(Color.clear)
    .onAppear {
      // Remove default UIKit tab bar backgrounds to allow absolute transparency
      let appearance = UITabBarAppearance()
      appearance.configureWithTransparentBackground()
      UITabBar.appearance().standardAppearance = appearance
      UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    .ignoresSafeArea()
  }
}

// UIKit wrapper class that Expo will mount
class NativeUiTabBarViewWrapper: ExpoView {
  private let hostingController = UIHostingController(rootView: NativeTabBarSwiftUIView(state: TabBarState(), onTabPress: { _ in }))
  private let state = TabBarState()
  
  // React Native event dispatcher
  let onTabPress = EventDispatcher()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    
    // Bind actions
    hostingController.rootView = NativeTabBarSwiftUIView(
      state: state,
      onTabPress: { [weak self] tabName in
        self?.onTabPress([
          "tabName": tabName
        ])
      }
    )
    
    addSubview(hostingController.view)
    hostingController.view.backgroundColor = .clear
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    hostingController.view.frame = bounds
  }
  
  // Prop setters
  func setActiveTab(_ activeTab: String) {
    state.activeTab = activeTab
  }
  
  func setShowPlusButton(_ show: Bool) {
    state.showPlusButton = show
  }
  
  func setColorScheme(_ scheme: String) {
    state.colorScheme = scheme
  }
}
