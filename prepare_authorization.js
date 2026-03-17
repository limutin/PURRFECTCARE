const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/AUTHORIZING TREATMENT(S) MEDICAL TESTS VACCINATION.docx';
const outputPath = 'public/Authorization_Template.docx';

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
    const p = labelText.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*?').join('');
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

const checkboxTags = [
    'chk_vaccine', 'chk_vaccine', 
    'chk_treatment', 'chk_treatment', 
    'chk_medical', 'chk_medical', 
    'chk_other', 'chk_other'
];

let chkIdx = 0;
const boxRegex = /<w:t>\[<\/w:t><\/w:r>(.*?)<w:t>\]<\/w:t><\/w:r>/g;
xml = xml.replace(boxRegex, (match, inner) => {
    const tag = checkboxTags[chkIdx++];
    if (tag) {
        console.log(`Tagging Checkbox ${chkIdx} -> {${tag}}`);
        return `<w:t>[</w:t></w:r>${inner.replace(/<w:t> <\/w:t>/, `<w:t xml:space="preserve">{${tag}}</w:t>`)}<w:t>]</w:t></w:r>`;
    }
    return match;
});

// "Date:"
tagField('Date:', 'date');

// "I, \t,"
tagField('I, ', 'owner_name');

// "For (pet's name)"
tagField('name)', 'pet_name');

// Validate
try {
    const { DOMParser } = require('@xmldom/xmldom');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    if (errors.length > 0) throw new Error(errors[0].textContent);
    console.log('XML Validation: PASSED');
    zip.file('word/document.xml', xml);
    fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
    console.log('Authorization template created successfully.');
} catch (e) {
    console.error('XML Validation FAILED:', e.message);
    process.exit(1);
}
