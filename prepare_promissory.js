const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/Promissory Note.docx';
const outputPath = 'public/PromissoryNote_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

/**
 * Super Precise Tagger — finds label, then replaces the next tab run.
 */
function tagField(labelText, tag, maxOccurrences = 2) {
    const p = labelText.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*').join('');
    const labelRegex = new RegExp(p, 'g');

    let match;
    let count = 0;
    while ((match = labelRegex.exec(xml)) !== null && count < maxOccurrences) {
        const labelEnd = match.index + match[0].length;

        const nextTab = xml.indexOf('<w:tab/>', labelEnd);
        if (nextTab === -1) continue;
        if (nextTab - labelEnd > 600) continue;

        let runStart = -1;
        let searchBack = nextTab;
        while ((searchBack = xml.lastIndexOf('<w:r', searchBack)) !== -1) {
            const afterTag = xml.charAt(searchBack + 4);
            if (afterTag === '>' || afterTag === ' ') {
                runStart = searchBack;
                break;
            }
            searchBack--;
        }

        const runEnd = xml.indexOf('</w:r>', nextTab);
        if (runStart === -1 || runEnd === -1) continue;

        if (xml.substring(runStart, runEnd + 6).includes(`{${tag}}`)) continue;

        console.log(`Tagging "${labelText}" -> {${tag}} at pos ${runStart} (occurrence ${count + 1})`);

        const newRuns =
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` +
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` +
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;

        xml = xml.substring(0, runStart) + newRuns + xml.substring(runEnd + 6);
        labelRegex.lastIndex = runStart + newRuns.length;
        count++;
    }
}

/**
 * Replace ALL tabs within a specific underlined run after a label.
 * For multi-tab fields like "balance of ___  ___  ___" we want to replace ALL the tabs.
 */
function tagFieldAllTabs(labelText, tag, maxOccurrences = 2) {
    const p = labelText.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*').join('');
    const labelRegex = new RegExp(p, 'g');

    let match;
    let count = 0;
    while ((match = labelRegex.exec(xml)) !== null && count < maxOccurrences) {
        const labelEnd = match.index + match[0].length;
        const paraEnd = xml.indexOf('</w:p>', labelEnd);

        // Find all underlined tab runs between label and next part
        // Specifically match the first underlined run with tabs
        const underRunRegex = /<w:r><w:rPr>(?:[^<]*<[^>]+>)*?<w:u w:val="single"\/>(?:[^<]*<[^>]+>)*?<\/w:rPr>(?:<w:tab\/>)+<\/w:r>/g;
        underRunRegex.lastIndex = labelEnd;
        const tabMatch = underRunRegex.exec(xml);

        if (!tabMatch || tabMatch.index > paraEnd) continue;
        if (xml.substring(tabMatch.index, tabMatch.index + tabMatch[0].length).includes(`{${tag}}`)) continue;

        console.log(`Tagging (AllTabs) "${labelText}" -> {${tag}} at pos ${tabMatch.index} (occurrence ${count + 1})`);

        const newRuns =
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` +
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` +
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;

        xml = xml.substring(0, tabMatch.index) + newRuns + xml.substring(tabMatch.index + tabMatch[0].length);
        labelRegex.lastIndex = tabMatch.index + newRuns.length;
        count++;
    }
}

// Owner name (borrower: "I, ___")
tagField('I,', 'owner_name');

// Balance: there are 2 groups of tabs after "balance of" - one long blank before (Php), one inside (Php ___)
// We need to tag them separately. First the long blank BEFORE "(Php"
tagFieldAllTabs('balance of', 'balance_label');  // The big blank before "(Php"
// Then the blank inside "(Php ___)"
tagField('(Php', 'balance_amount');

// Service description: ") for [blank] of my pet on"
// This part is very delicate due to the tab combinations
let sdCount = 0;
const sdRegex = /\) for <\/w:t><\/w:r><w:r><w:rPr>(?:<[^>]+>)*?<w:u w:val="single"\/>(?:<[^>]+>)*?<\/w:rPr>(?:<w:tab\/>)*<\/w:r>/g;
xml = xml.replace(sdRegex, () => {
    sdCount++;
    return `) for </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{service_description}</w:t></w:r>`;
});
if (sdCount > 0) console.log(`Custom Tagged "service_description" ${sdCount} times.`);

// Permanent address
// The address field is an actual drawing line underneath the text, not a tab
let paCount = 0;
const paRegex = /Name Permanent Address:<\/w:t><\/w:r>/g;
xml = xml.replace(paRegex, () => {
    paCount++;
    return `Name Permanent Address: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{owner_address}</w:t></w:r>`;
});
if (paCount > 0) console.log(`Custom Tagged "owner_address" ${paCount} times.`);

// Date of service (pet visit date)
let pdCount = 0;
const pdRegex = /of my pet on <\/w:t><\/w:r><w:r><w:rPr>(?:<[^>]+>)*?<w:u w:val="single"\/>(?:<[^>]+>)*?<\/w:rPr>(?:<w:tab\/>)*<\/w:r>/g;
xml = xml.replace(pdRegex, () => {
    pdCount++;
    return `of my pet on </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> {service_date} </w:t></w:r>`;
});
if (pdCount > 0) console.log(`Custom Tagged "service_date" ${pdCount} times.`);

// Agreed payment date
tagField('payment on', 'payment_date');

// IN WITNESS date parts: "this ___th day of _____, 20__ and"
// The day number is just underlined spaces: <w:t>  </w:t> right after "under seal this"
let dsCount = 0;
const dsRegex = /under seal this <\/w:t><\/w:r><w:r><w:rPr><w:spacing w:val="80"\/><w:u w:val="single"\/><\/w:rPr><w:t>  <\/w:t><\/w:r>/g;
xml = xml.replace(dsRegex, () => {
    dsCount++;
    return `under seal this </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:spacing w:val="80"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{sign_day}</w:t></w:r>`;
});
if (dsCount > 0) console.log(`Custom Tagged "sign_day" ${dsCount} times.`);

// "day of " has a tab after it, so tagField works
tagField('day of', 'sign_month');

// "20__" is a single underlined space: <w:t> </w:t> before "and I acknowledge"
let yrCount = 0;
const yrRegex = /, 20<\/w:t><\/w:r><w:r><w:rPr><w:spacing w:val="40"\/><w:u w:val="single"\/><\/w:rPr><w:t> <\/w:t><\/w:r>/g;
xml = xml.replace(yrRegex, () => {
    yrCount++;
    return `, 20</w:t></w:r><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:spacing w:val="40"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{sign_year_2dig}</w:t></w:r>`;
});
if (yrCount > 0) console.log(`Custom Tagged "sign_year_2dig" ${yrCount} times.`);

// Contact numbers
tagField('Contact numbers:', 'contact_number');

// Valid ID presented
tagField('Valid ID presented:', 'valid_id');

// Validate
try {
    const { DOMParser } = require('@xmldom/xmldom');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    if (errors.length > 0) throw new Error(errors[0].textContent);
    console.log('XML Validation: PASSED');
    zip.file('word/document.xml', xml);
    fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
    console.log('Promissory Note template created successfully.');
} catch (e) {
    console.error('XML Validation FAILED:', e.message);
    process.exit(1);
}
