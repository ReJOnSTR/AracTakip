Pod::Spec.new do |s|
  s.name           = 'NativeUi'
  s.version        = '1.0.0'
  s.summary        = 'Native SwiftUI components for AracTakip'
  s.description    = 'Native SwiftUI components for AracTakip'
  s.author         = 'Halil Sak'
  s.homepage       = 'https://github.com/ReJOnSTR/AracTakip'
  s.platforms      = { :ios => '26.0' }
  s.source         = { :git => '' }
  s.source_files   = '**/*.{h,m,swift}'
  s.dependency 'ExpoModulesCore'

  s.swift_version = '5.4'
end
