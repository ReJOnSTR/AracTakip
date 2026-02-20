// Import/Export module — company data backup and restore
module.exports = function (helpers, entityModules) {
    const { runQuery, runQueryOne, runExec, getDb } = helpers
    const { vehicles, maintenances, inspections, insurances, assignments, services, documents } = entityModules

    function getCompanyCompleteData(companyId) {
        try {
            const company = runQueryOne('SELECT * FROM companies WHERE id = ?', [companyId])
            if (!company) return { success: false, error: 'Company not found' }

            const vehicleList = vehicles.getVehicles(companyId).data || []

            const allDocuments = documents.getDocumentsByCompany(companyId).data || []
            const getDocs = (type, id) => allDocuments.filter(d => d.related_type === type && d.related_id === id)

            const detailedVehicles = vehicleList.map(v => {
                const mtnList = (maintenances.getMaintenances(v.id).data || []).map(m => ({ ...m, documents: getDocs('maintenance', m.id) }))
                const inspList = (inspections.getInspections(v.id).data || []).map(i => ({ ...i, documents: getDocs('periodic_inspection', i.id) }))
                const insList = (insurances.getInsurances(v.id).data || []).map(ins => ({ ...ins, documents: getDocs('insurance', ins.id) }))
                const asgList = (assignments.getAssignments(v.id).data || []).map(a => ({ ...a, documents: getDocs('assignment', a.id) }))
                const svcList = (services.getServices(v.id).data || []).map(s => ({ ...s, documents: getDocs('service', s.id) }))
                const vehicleDocs = getDocs('vehicle', v.id) || []

                return {
                    ...v,
                    documents: vehicleDocs,
                    maintenances: mtnList,
                    inspections: inspList,
                    insurances: insList,
                    assignments: asgList,
                    services: svcList
                }
            })

            return {
                success: true,
                data: {
                    company,
                    vehicles: detailedVehicles,
                    allDocuments,
                    exportedAt: new Date().toISOString(),
                    version: '1.1'
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function importCompanyData(userId, backupData) {
        try {
            if (!backupData.company || !backupData.vehicles) {
                return { success: false, error: 'Invalid backup format' }
            }

            const insertDoc = (vId, type, rId, d) => {
                runExec(
                    'INSERT INTO documents (vehicle_id, related_type, related_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)',
                    [vId, type, rId, d.file_name, d.file_path, d.file_type]
                )
            }

            const compInfo = runExec(
                'INSERT INTO companies (user_id, name, tax_number, address, phone) VALUES (?, ?, ?, ?, ?)',
                [userId, `${backupData.company.name} (Imported)`, backupData.company.tax_number, backupData.company.address, backupData.company.phone]
            )
            const newCompanyId = compInfo.lastInsertRowid

            const db = getDb()
            const executeImport = db.transaction(() => {
                for (const v of backupData.vehicles) {
                    const vInfo = runExec(
                        'INSERT INTO vehicles (company_id, type, plate, brand, model, year, color, status, notes, km, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [newCompanyId, v.type, v.plate, v.brand, v.model, v.year, v.color, v.status, v.notes, v.km, v.image]
                    )
                    const newVehicleId = vInfo.lastInsertRowid

                    if (v.documents) {
                        for (const d of v.documents) insertDoc(newVehicleId, 'vehicle', newVehicleId, d)
                    }

                    if (v.maintenances) {
                        for (const m of v.maintenances) {
                            const mInfo = maintenances.createMaintenance({
                                vehicleId: newVehicleId, type: m.type, description: m.description,
                                date: m.date, cost: m.cost, nextKm: m.next_km, nextDate: m.next_date,
                                notes: m.notes, isArchived: m.is_archived
                            })
                            if (mInfo.success && m.documents) {
                                for (const d of m.documents) insertDoc(newVehicleId, 'maintenance', mInfo.id, d)
                            }
                        }
                    }
                    if (v.inspections) {
                        for (const i of v.inspections) {
                            const iInfo = inspections.createInspection({
                                vehicleId: newVehicleId, type: i.type, inspectionDate: i.inspection_date,
                                nextInspection: i.next_inspection, result: i.result, cost: i.cost,
                                notes: i.notes, skipValidation: true, isArchived: i.is_archived
                            })
                            if (iInfo.success && i.documents) {
                                for (const d of i.documents) insertDoc(newVehicleId, 'periodic_inspection', iInfo.id, d)
                            }
                        }
                    }
                    if (v.insurances) {
                        for (const ins of v.insurances) {
                            const insInfo = insurances.createInsurance({
                                vehicleId: newVehicleId, company: ins.company, policyNo: ins.policy_no,
                                type: ins.type, startDate: ins.start_date, endDate: ins.end_date,
                                premium: ins.premium, notes: ins.notes, skipValidation: true, isArchived: ins.is_archived
                            })
                            if (insInfo.success && ins.documents) {
                                for (const d of ins.documents) insertDoc(newVehicleId, 'insurance', insInfo.id, d)
                            }
                        }
                    }
                    if (v.assignments) {
                        for (const a of v.assignments) {
                            const aInfo = assignments.createAssignment({
                                vehicleId: newVehicleId, itemName: a.item_name, quantity: a.quantity,
                                assignedTo: a.assigned_to, department: a.department,
                                startDate: a.start_date, endDate: a.end_date,
                                notes: a.notes, isArchived: a.is_archived
                            })
                            if (aInfo.success && a.documents) {
                                for (const d of a.documents) insertDoc(newVehicleId, 'assignment', aInfo.id, d)
                            }
                        }
                    }
                    if (v.services) {
                        for (const s of v.services) {
                            const sInfo = services.createService({
                                vehicleId: newVehicleId, type: s.type, serviceName: s.service_name,
                                description: s.description, date: s.date, km: s.km,
                                cost: s.cost, notes: s.notes, isArchived: s.is_archived
                            })
                            if (sInfo.success && s.documents) {
                                for (const d of s.documents) insertDoc(newVehicleId, 'service', sInfo.id, d)
                            }
                        }
                    }
                }
            })

            executeImport()

            return { success: true, companyId: newCompanyId }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function archiveItem(table, id, isArchived = 1) {
        try {
            runExec(`UPDATE ${table} SET is_archived = ? WHERE id = ?`, [isArchived, id])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getCompanyCompleteData, importCompanyData, archiveItem }
}
