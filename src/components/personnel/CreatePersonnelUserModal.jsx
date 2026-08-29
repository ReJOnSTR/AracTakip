import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services';
import CustomInput from '../CustomInput';
import CustomSelect from '../CustomSelect';
import { KeyRound, UserCheck, Shield } from 'lucide-react';

export default function CreatePersonnelUserModal({ employee, isOpen, onClose, onSuccess }) {
    const toast = useToast();
    const [formData, setFormData] = useState({
        username: employee ? `${employee.first_name.toLowerCase()}.${employee.last_name.toLowerCase()}`.replace(/\s+/g, '') : '',
        email: employee?.email || '',
        password: '123456Password!',
        role: 'personnel'
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen || !employee) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await authService.createEmployeeUser({
                employeeId: employee.id,
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: formData.role
            });

            if (res.success) {
                toast.success(`${employee.first_name} ${employee.last_name} için kullanıcı girişi başarıyla oluşturuldu.`);
                if (onSuccess) onSuccess();
                onClose();
            } else {
                toast.error(res.error || 'Kullanıcı hesabı oluşturulamadı.');
            }
        } catch (error) {
            toast.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#121522] border border-gray-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-800 mb-5">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <UserCheck size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-white">Personel Girişi Tanımla</h3>
                        <p className="text-xs text-gray-400">{employee.first_name} {employee.last_name} ({employee.department || 'Personel'})</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <CustomInput 
                        label="Kullanıcı Adı"
                        required
                        value={formData.username}
                        onChange={(val) => setFormData({...formData, username: val})}
                        maxLength={50}
                    />

                    <CustomInput 
                        label="E-Posta Adresi"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(val) => setFormData({...formData, email: val})}
                        maxLength={100}
                    />

                    <div>
                        <CustomInput 
                            label="Geçici Şifre"
                            required
                            value={formData.password}
                            onChange={(val) => setFormData({...formData, password: val})}
                            maxLength={64}
                        />
                        <span className="text-[10px] text-amber-400 mt-1 block">💡 Personel ilk girişte şifresini değiştirmeye zorlanacaktır.</span>
                    </div>

                    <CustomSelect 
                        label="Sistem Rolü"
                        value={formData.role}
                        onChange={(val) => setFormData({...formData, role: val})}
                        options={[
                            { value: 'personnel', label: 'Personel (Kısıtlı Portal & Talep Girişi)' },
                            { value: 'manager', label: 'Departman Müdürü (Onay Yetkisi)' }
                        ]}
                    />

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs hover:bg-gray-700"
                        >
                            İptal
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30"
                        >
                            {loading ? 'Oluşturuluyor...' : 'Giriş Hesabını Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
