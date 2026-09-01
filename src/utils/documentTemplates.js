export const documentTemplates = [
    {
        id: 'assignment',
        name: 'Görevlendirme Belgesi',
        title: 'GÖREVLENDİRME BELGESİ',
        type: 'structured',
        content: `Yukarıda adresi ve niteliği belirtilen işte çalışma yeri değişikliği yaparak ve çalışma süresinde işveren tarafından yapılacak değişiklikleri şimdiden onaylayarak çalışmayı kabul ediyorum.`,
        placeholders: [
            { key: 'companyName', label: 'İşveren Ünvanı', source: 'company', keyInComp: 'name' },
            { key: 'companyAddress', label: 'İşyeri Adresi', source: 'company', keyInComp: 'address' },
            { key: 'companySgk', label: 'İşyeri SGK No', source: 'company', keyInComp: 'sgk_no' },
            { key: 'companyTax', label: 'Vergi Dairesi / No', source: 'company', keyInComp: 'tax_number' },
            { key: 'fullName', label: 'Personel Adı Soyadı', source: 'employee' },
            { key: 'tcNo', label: 'T.C. Kimlik No', source: 'employee', keyInEmp: 'tc_no' },
            { key: 'workplaceName', label: 'Gidilecek İşyeri', type: 'text' },
            { key: 'workplaceAddress', label: 'İşyeri Adresi', type: 'text' },
            { key: 'workType', label: 'Yapılacak İş', type: 'text', default: 'VİNÇ OPERATÖRÜ' },
            { key: 'startDate', label: 'Gidiş Tarihi', type: 'date', default: 'today' },
            { key: 'endDate', label: 'Dönüş Tarihi', type: 'date', default: 'today+3m' }
        ]
    },
    {
        id: 'leave',
        name: 'İzin Talep Formu',
        title: 'PERSONEL İZİN TALEP FORMU',
        content: `{{companyName}} MÜDÜRLÜĞÜ'NE,

Şirketinizde {{position}} olarak görev yapmaktayım. {{startDate}} tarihinden {{endDate}} tarihine kadar toplam {{days}} gün süreyle {{leaveType}} iznimi kullanmak istiyorum.

İzinli olduğum süre boyunca bulunacağım adres: {{addressDuringLeave}}
İletişim Numaram: {{phoneDuringLeave}}

İznimin onaylanmasını saygılarımla arz ederim.`,
        placeholders: [
            { key: 'companyName', label: 'Şirket Adı', source: 'company', keyInComp: 'name' },
            { key: 'fullName', label: 'Personel Adı Soyadı', source: 'employee' },
            { key: 'position', label: 'Pozisyon', source: 'employee' },
            { key: 'startDate', label: 'İzin Başlangıç', type: 'date', default: 'today' },
            { key: 'endDate', label: 'İzin Bitiş', type: 'date' },
            { key: 'days', label: 'Gün Sayısı', type: 'number' },
            { key: 'leaveType', label: 'İzin Türü', type: 'text', default: 'Yıllık Ücretli İzin' },
            { key: 'addressDuringLeave', label: 'İzin Adresi', type: 'text' },
            { key: 'phoneDuringLeave', label: 'İzin İletişim No', type: 'text', source: 'employee', keyInEmp: 'phone' }
        ]
    },
    {
        id: 'resignation',
        name: 'İstifa Dilekçesi',
        title: 'İSTİFA DİLEKÇESİ',
        content: `{{companyName}} YÖNETİM KURULU BAŞKANLIĞI'NA,

Şirketiniz bünyesinde {{startDate}} tarihinden bu yana {{position}} olarak görev yapmaktayım. 

Gördüğüm lüzum üzerine, {{resignationDate}} tarihi itibariyle görevimden kendi isteğimle ayrılmak istiyorum. İstifamın kabulünü ve gerekli işlemlerin yapılmasını saygılarımla arz ederim.`,
        placeholders: [
            { key: 'companyName', label: 'Şirket Adı', source: 'company', keyInComp: 'name' },
            { key: 'startDate', label: 'İşe Giriş Tarihi', source: 'employee' },
            { key: 'position', label: 'Pozisyon', source: 'employee' },
            { key: 'resignationDate', label: 'İşten Ayrılma Tarihi', type: 'date', default: 'today' }
        ]
    },
    {
        id: 'custom',
        name: 'Serbest Metin Belgesi',
        title: 'BİLGİ / DUYURU',
        content: `Sayın {{fullName}},

... buraya istediğiniz metni yazabilirsiniz ...

Bilgilerinize sunarız.`,
        placeholders: [
            { key: 'fullName', label: 'Personel Adı Soyadı', source: 'employee' }
        ]
    }
];
