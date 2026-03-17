const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/REFUSAL OF OPTIONAL TREATMENT(S) OR MEDICAL TESTS.docx';
const outputPath = 'public/Refusal_Template.docx';

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

        const originalRun = xml.substring(runStart, runEnd + 6);
        if (originalRun.includes(`{${tag}}`)) continue;

        console.log(`Tagging "${labelText}" -> {${tag}} at pos ${runStart} (occurrence ${count + 1})`);

        // Insert the docxtemplater tag text just before the first tab stop in this run.
        // This leverages the native document style and preserves exact column spacings!
        const newRun = originalRun.replace('<w:tab/>', `<w:t xml:space="preserve">{${tag}}</w:t><w:tab/>`);

        xml = xml.substring(0, runStart) + newRun + xml.substring(runEnd + 6);
        labelRegex.lastIndex = runStart + newRun.length;
        count++;
    }
}

const checkboxTags = [
    'chk_treatment', 'chk_presurgical', 'chk_cbc', 'chk_urinalysis', 'chk_serum', 'chk_radiographs', 'chk_other',
    'chk_treatment', 'chk_presurgical', 'chk_cbc', 'chk_urinalysis', 'chk_serum', 'chk_radiographs', 'chk_other'
];

let chkIdx = 0;
let searchPos = 0;
while (chkIdx < 14) {
    const startBracket = xml.indexOf('[', searchPos);
    if (startBracket === -1) break;
    const endBracket = xml.indexOf(']', startBracket);
    if (endBracket !== -1 && endBracket - startBracket < 200) {
        const inner = xml.substring(startBracket, endBracket);
        const tag = checkboxTags[chkIdx++];
        console.log(`Tagging Checkbox ${chkIdx} -> {${tag}}`);
        const replacedInner = inner.replace(/<w:t>[ \u00A0]*<\/w:t>/, `<w:t xml:space="preserve">{${tag}}</w:t>`);
        xml = xml.substring(0, startBracket) + replacedInner + xml.substring(endBracket);
        searchPos = startBracket + replacedInner.length + 1;
    } else {
        searchPos = startBracket + 1;
    }
}

// "Date:"
tagField('Date:', 'date');

// "I, (Owner’s name)"
tagField('name) ', 'owner_name');

// "For (pet's name)"
tagField(`pet’s name)`, 'pet_name');

// Text Blanks
tagField('Treatment (describe) ', 'treatment_desc');
tagField('Radiographs (describe) ', 'radiographs_desc');

tagField('ADDRESS: ', 'owner_address');
tagField('CONTACT NO: ', 'contact_number');


// Validate
try {
    const { DOMParser } = require('@xmldom/xmldom');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    if (errors.length > 0) throw new Error(errors[0].textContent);
    console.log('XML Validation: PASSED');
    zip.file('word/document.xml', xml);
    fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
    console.log('Refusal template created successfully.');
} catch (e) {
    console.error('XML Validation FAILED:', e.message);
    process.exit(1);
}
