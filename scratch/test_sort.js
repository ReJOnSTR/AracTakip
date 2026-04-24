const list = ['İbrahim', 'Irmak', 'Zeynep', 'Ahmet'];

const sorted1 = [...list].sort((a, b) => {
    const aStr = String(a).toLocaleLowerCase('tr-TR');
    const bStr = String(b).toLocaleLowerCase('tr-TR');
    return aStr.localeCompare(bStr, 'tr', { sensitivity: 'accent' });
});

console.log('Sorted with tr-TR and accent:', sorted1);

const sorted2 = [...list].sort((a, b) => {
    return String(a).localeCompare(String(b), 'tr', { sensitivity: 'base' });
});

console.log('Sorted with tr and base sensitivity:', sorted2);

const sorted3 = [...list].sort((a, b) => {
    return String(a).localeCompare(String(b), 'tr');
});

console.log('Sorted with tr default:', sorted3);
