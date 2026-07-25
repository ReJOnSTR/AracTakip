import SwiftUI
import ExpoModulesCore
import UIKit

// Official Apple UITabBar Implementation with UITabBarDelegate & UITabBarAppearance
class NativeUiTabBarViewWrapper: ExpoView, UITabBarDelegate {
  private let tabBar = UITabBar()
  private var activeTab: String = "index"
  private var colorScheme: String = "dark"
  
  let onTabPress = EventDispatcher()
  let onPlusPress = EventDispatcher()
  
  private let tabItemsMap: [(id: String, title: String, icon: String, selectedIcon: String)] = [
    ("index", "Panel", "house", "house.fill"),
    ("vehicles", "Araçlar", "car", "car.fill"),
    ("employees", "Personel", "person.2", "person.2.fill"),
    ("more", "Diğer", "ellipsis.circle", "ellipsis.circle.fill"),
    ("profile", "Profil", "person.crop.circle", "person.crop.circle.fill")
  ]
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    isOpaque = false
    setupTabBar()
  }
  
  private func setupTabBar() {
    tabBar.delegate = self
    tabBar.isTranslucent = true
    tabBar.backgroundColor = .clear
    
    var uiTabBarItems: [UITabBarItem] = []
    for (index, item) in tabItemsMap.enumerated() {
      let normalImg = UIImage(systemName: item.icon)
      let selectedImg = UIImage(systemName: item.selectedIcon)
      let tabBarItem = UITabBarItem(title: item.title, image: normalImg, selectedImage: selectedImg)
      tabBarItem.tag = index
      uiTabBarItems.append(tabBarItem)
    }
    
    tabBar.setItems(uiTabBarItems, animated: false)
    if let first = uiTabBarItems.first {
      tabBar.selectedItem = first
    }
    
    addSubview(tabBar)
    updateAppearance()
  }
  
  private func updateAppearance() {
    let isDark = colorScheme == "dark"
    let appearance = UITabBarAppearance()
    appearance.configureWithTransparentBackground()
    appearance.backgroundColor = .clear
    appearance.backgroundEffect = UIBlurEffect(style: isDark ? .systemUltraThinMaterialDark : .systemUltraThinMaterialLight)
    appearance.shadowColor = .clear
    appearance.shadowImage = UIImage()
    
    // Configure item tint colors
    let activeColor = isDark ? UIColor.white : UIColor.black
    let inactiveColor = isDark ? UIColor.white.withAlphaComponent(0.55) : UIColor.black.withAlphaComponent(0.45)
    
    appearance.stackedLayoutAppearance.selected.iconColor = activeColor
    appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: activeColor]
    
    appearance.stackedLayoutAppearance.normal.iconColor = inactiveColor
    appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: inactiveColor]
    
    tabBar.standardAppearance = appearance
    if #available(iOS 15.0, *) {
      tabBar.scrollEdgeAppearance = appearance
    }
    tabBar.tintColor = activeColor
    tabBar.barTintColor = .clear
    tabBar.backgroundColor = .clear
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    tabBar.frame = bounds
    tabBar.backgroundColor = .clear
  }
  
  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    let index = item.tag
    if index >= 0 && index < tabItemsMap.count {
      let selectedId = tabItemsMap[index].id
      self.activeTab = selectedId
      onTabPress(["tabName": selectedId])
    }
  }
  
  func setActiveTab(_ activeTab: String) {
    self.activeTab = activeTab
    if let index = tabItemsMap.firstIndex(where: { $0.id == activeTab }),
       let items = tabBar.items, index < items.count {
      tabBar.selectedItem = items[index]
    }
  }
  
  func setShowPlusButton(_ show: Bool) {}
  
  func setColorScheme(_ scheme: String) {
    self.colorScheme = scheme
    updateAppearance()
  }
}
