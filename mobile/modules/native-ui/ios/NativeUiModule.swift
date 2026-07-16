import ExpoModulesCore

public class NativeUiModule: Module {
  public func definition() -> ModuleDefinition {
    // The name that will be used to import the native module
    Name("NativeUi")

    // Register our SwiftUI tab bar view wrapper
    View(NativeUiTabBarViewWrapper.self) {
      // Define properties received from React Native
      Prop("activeTab") { (view: NativeUiTabBarViewWrapper, activeTab: String) in
        view.setActiveTab(activeTab)
      }
      
      Prop("showPlusButton") { (view: NativeUiTabBarViewWrapper, showPlusButton: Bool) in
        view.setShowPlusButton(showPlusButton)
      }
      
      Prop("colorScheme") { (view: NativeUiTabBarViewWrapper, colorScheme: String) in
        view.setColorScheme(colorScheme)
      }
      
      // Define event listeners in React Native
      Events("onTabPress", "onPlusPress")
    }
  }
}
