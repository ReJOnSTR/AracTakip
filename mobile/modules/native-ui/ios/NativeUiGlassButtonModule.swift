import ExpoModulesCore

public class NativeUiGlassButtonModule: Module {
  public func definition() -> ModuleDefinition {
    // The name that will be used to import the native view in JS
    Name("NativeUiGlassButton")

    // Register our SwiftUI glass button view wrapper
    View(NativeUiGlassButtonViewWrapper.self) {
      // Define properties received from React Native
      Prop("icon") { (view: NativeUiGlassButtonViewWrapper, icon: String) in
        view.setIcon(icon)
      }
      
      Prop("size") { (view: NativeUiGlassButtonViewWrapper, size: Double) in
        view.setSize(size)
      }
      
      Prop("prominent") { (view: NativeUiGlassButtonViewWrapper, prominent: Bool) in
        view.setProminent(prominent)
      }
      
      // Define event listeners in React Native (Renamed to avoid reserved name conflict)
      Events("onButtonPress")
    }
  }
}
