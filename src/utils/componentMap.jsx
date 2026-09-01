import Dashboard from '../pages/Dashboard'
import PersonelDashboard from '../pages/PersonelDashboard'
import Companies from '../pages/Companies'
import Vehicles from '../pages/Vehicles'
import VehicleDetail from '../pages/VehicleDetail'
import Maintenance from '../pages/Maintenance'
import Inspections from '../pages/Inspections'
import PeriodicInspections from '../pages/PeriodicInspections'
import Insurance from '../pages/Insurance'
import Assignments from '../pages/Assignments'
import Services from '../pages/Services'
import Employees from '../pages/Employees'
import EmployeeDetail from '../pages/EmployeeDetail'
import Settings from '../pages/Settings'
import Reports from '../pages/Reports'

import Leaves from '../pages/Leaves'
import Salaries from '../pages/Salaries'
import Works from '../pages/Works'
import WorkDetails from '../pages/WorkDetails'
import Finance from '../pages/Finance'

export const componentMap = {
    'dashboard': { component: Dashboard, title: 'Panel' },
    'personel-dashboard': { component: PersonelDashboard, title: 'Personel Paneli' },
    'companies': { component: Companies, title: 'Şirketler' },
    'vehicles': { component: Vehicles, title: 'Araçlar' },
    'vehicle-detail': { component: VehicleDetail, title: 'Araç Detayı' },
    'maintenance': { component: Maintenance, title: 'Bakım Kayıtları' },
    'inspections': { component: Inspections, title: 'Muayene Takibi' },
    'periodic-inspections': { component: PeriodicInspections, title: 'Periyodik Kontroller' },
    'insurance': { component: Insurance, title: 'Sigorta Takibi' },
    'assignments': { component: Assignments, title: 'Zimmetler' },
    'services': { component: Services, title: 'Servis İşlemleri' },
    'employees': { component: Employees, title: 'Personeller' },
    'employee-detail': { component: EmployeeDetail, title: 'Personel Detayı' },
    'leaves': { component: Leaves, title: 'İzinler' },
    'salaries': { component: Salaries, title: 'Ödemeler' },
    'works': { component: Works, title: 'İş Takibi' },
    'work-details': { component: WorkDetails, title: 'İş Detayları' },
    'finance': { component: Finance, title: 'Kasa Takibi' },
    'settings': { component: Settings, title: 'Ayarlar' },
    'reports': { component: Reports, title: 'Raporlar' }
}
