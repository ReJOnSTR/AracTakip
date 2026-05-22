import { useState, useEffect } from 'react'
import Modal from './Modal'
import CustomInput from './CustomInput'
import StampSignaturePreview, { STAMP_DEFAULTS } from './StampSignaturePreview'
import { FileText, Download, Check, ArrowLeft, Stamp } from 'lucide-react'
import { documentTemplates } from '../utils/documentTemplates'
import { formatDate, formatDateForInput } from '../utils/helpers'



export default function DocumentGeneratorModal({ isOpen, onClose, employee, company }) {
    const [selectedTemplate, setSelectedTemplate] = useState(documentTemplates[0])
    const [placeholders, setPlaceholders] = useState({})
    const [content, setContent] = useState('')
    const [title, setTitle] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    // 'edit' | 'stamp-preview'
    const [step, setStep] = useState('edit')
    const [stampSettings, setStampSettings] = useState(STAMP_DEFAULTS)

    useEffect(() => {
        if (selectedTemplate && employee && company) {
            const initialPlaceholders = {}
            selectedTemplate.placeholders.forEach(p => {
                if (p.source === 'employee') {
                    if (p.key === 'fullName') initialPlaceholders[p.key] = `${employee.first_name} ${employee.last_name}`
                    else {
                        const empKey = p.keyInEmp || p.key
                        const value = employee[empKey] || ''
                        initialPlaceholders[p.key] = (p.type === 'date' || empKey.includes('date')) && value ? formatDateForInput(value) : value
                    }
                } else if (p.source === 'company') {
                    const compKey = p.keyInComp || p.key
                    let value = company[compKey] || ''
                    if (p.key === 'companyTax' && company.tax_office) {
                        value = `${company.tax_office} / ${company.tax_number || ''}`
                    }
                    initialPlaceholders[p.key] = value
                } else {
                    if (p.default === 'today') {
                        initialPlaceholders[p.key] = new Date().toISOString().split('T')[0]
                    } else if (p.default === 'today+3m') {
                        const d = new Date()
                        d.setMonth(d.getMonth() + 3)
                        initialPlaceholders[p.key] = d.toISOString().split('T')[0]
                    } else {
                        initialPlaceholders[p.key] = p.default || ''
                    }
                }
            })
            setPlaceholders(initialPlaceholders)
            setTitle(selectedTemplate.title)
        }
    }, [selectedTemplate, employee, company])

    useEffect(() => {
        if (placeholders.startDate && placeholders.endDate && 'days' in placeholders) {
            const start = new Date(placeholders.startDate)
            const end = new Date(placeholders.endDate)
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                const diffTime = end - start
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                if (placeholders.days !== diffDays.toString()) {
                    setPlaceholders(prev => ({ ...prev, days: diffDays.toString() }))
                }
            }
        }
    }, [placeholders.startDate, placeholders.endDate])

    useEffect(() => {
        if (selectedTemplate) {
            let newContent = selectedTemplate.content
            Object.entries(placeholders).forEach(([key, value]) => {
                const displayValue = key.toLowerCase().includes('date') && value ? formatDate(value) : value
                newContent = newContent.replace(new RegExp(`{{${key}}}`, 'g'), displayValue || `[${key}]`)
            })
            setContent(newContent)
        }
    }, [placeholders, selectedTemplate])

    // Reset step when modal closes
    useEffect(() => {
        if (!isOpen) setStep('edit')
    }, [isOpen])

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const printData = {
                templateId: selectedTemplate.id,
                title,
                content,
                employeeName: `${employee.first_name} ${employee.last_name}`,
                companyName: company.name,
                companyAddress: company.address,
                companySgk: company.sgk_no,
                companyTax: company.tax_office ? `${company.tax_office} / ${company.tax_number || ''}` : company.tax_number,
                companySignaturePath: company.signature_path,
                companyStampPath: company.stamp_path,
                tcNo: employee.tc_no,
                placeholders,
                stampSettings,
            }
            
            localStorage.setItem('printDocData', JSON.stringify(printData))
            
            // Close the modal FIRST so it doesn't stay as a "lock screen" behind the dialog
            onClose()
            
            const result = await window.electronAPI.saveReportPdf('/print-document')
            if (result && !result.success && !result.canceled) {
                alert('Belge oluşturulurken hata oluştu: ' + result.error)
            }
        } catch (error) {
            console.error('Document generation failed:', error)
            alert('Beklenmedik bir hata oluştu.')
        }
        setIsGenerating(false)
    }

    if (!employee || !company) return null

    const hasStampOrSig = company.stamp_path || company.signature_path

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'stamp-preview' ? 'Kaşe & İmza Konumlandırma — PDF Önizleme' : 'Personel Belgesi Oluştur'}
            size={step === 'stamp-preview' ? 'fullscreen' : 'xl'}
            footer={null}
        >
            {step === 'edit' && (
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
                    {/* Sol Panel: Şablon Seçimi */}
                    <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                            Şablon Seçin
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {documentTemplates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        textAlign: 'left',
                                        border: '1px solid transparent',
                                        transition: 'all 0.2s',
                                        background: selectedTemplate.id === t.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: selectedTemplate.id === t.id ? '#fff' : 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FileText size={16} />
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.name}</span>
                                    {selectedTemplate.id === t.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sağ Panel: Düzenleme */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Değişken Girişleri */}
                        <div style={{ 
                            background: 'var(--bg-tertiary)', 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-color)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px 16px'
                        }}>
                            <div style={{ gridColumn: '1 / -1', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                                Belge Değişkenleri
                            </div>
                            {selectedTemplate.placeholders.map(p => (
                                <CustomInput
                                    key={p.key}
                                    label={p.label}
                                    type={p.type || 'text'}
                                    value={placeholders[p.key] || ''}
                                    onChange={(val) => setPlaceholders(prev => ({ ...prev, [p.key]: val }))}
                                    style={{ marginBottom: 0 }}
                                />
                            ))}
                        </div>

                        {/* Metin Önizleme */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Belge İçeriği
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', background: 'var(--accent-subtle)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    Düzenlenebilir Alan
                                </div>
                            </div>
                            
                            <div style={{ 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '12px', 
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <input 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'center',
                                        fontSize: '18px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        border: 'none',
                                        borderBottom: '1px dashed var(--border-color)',
                                        background: 'transparent',
                                        color: 'var(--text-primary)',
                                        paddingBottom: '10px',
                                        outline: 'none'
                                    }}
                                />
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: '280px',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        fontSize: '14px',
                                        lineHeight: '1.6',
                                        color: 'var(--text-primary)',
                                        resize: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Footer Butonları */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                            <button onClick={onClose} className="btn btn-secondary">İptal</button>
                            {hasStampOrSig && (
                                <button
                                    type="button"
                                    onClick={() => setStep('stamp-preview')}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Stamp size={16} />
                                    Kaşe &amp; İmza Ayarla
                                </button>
                            )}
                            <button 
                                onClick={handleGenerate} 
                                disabled={isGenerating} 
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {isGenerating ? 'Hazırlanıyor...' : (
                                    <>
                                        <Download size={18} />
                                        PDF Olarak Kaydet
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'stamp-preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <StampSignaturePreview
                        docData={{
                            templateId: selectedTemplate.id,
                            title,
                            content,
                            employeeName: `${employee.first_name} ${employee.last_name}`,
                            companyName: company.name,
                            companyAddress: company.address,
                            companySgk: company.sgk_no,
                            companyTax: company.tax_office ? `${company.tax_office} / ${company.tax_number || ''}` : company.tax_number,
                            tcNo: employee.tc_no,
                            placeholders,
                        }}
                        company={company}
                        settings={stampSettings}
                        onChange={setStampSettings}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <button
                            type="button"
                            onClick={() => setStep('edit')}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <ArrowLeft size={16} />
                            Geri Dön
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {isGenerating ? 'Hazırlanıyor...' : (
                                <>
                                    <Download size={18} />
                                    PDF Olarak Kaydet
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    )
}
