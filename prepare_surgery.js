const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/CONSENT FOR SURGERY.docx';
const outputPath = 'public/Surgery_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

/**
 * Super Precise Tagger with Paragraph Boundary Check
 */
function tagField(labelText, tag, type = 'tab') {
    const p = labelText.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*').join('');
    const labelRegex = new RegExp(p, 'g');
    
    let match;
    while ((match = labelRegex.exec(xml)) !== null) {
        const labelEnd = match.index + match[0].length;
        
        // Find next run end after label
        const currentParaEnd = xml.indexOf('</w:p>', labelEnd);
        const nextTab = xml.indexOf('<w:tab/>', labelEnd);

        // If type is tab, the tab must be before the end of the paragraph
        if (type === 'tab' && nextTab !== -1 && nextTab < currentParaEnd) {
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
            
            if (runStart !== -1 && runEnd !== -1) {
                const newRuns = 
                    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` + 
                    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` + 
                    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;
                
                xml = xml.substring(0, runStart) + newRuns + xml.substring(runEnd + 6);
                console.log(`Tagged ${labelText} -> {${tag}} using tab`);
                labelRegex.lastIndex = runStart + newRuns.length;
                continue;
            }
        }

        // If type is end or tab didn't work, we inject at the end of the label run or paragraph
        // But for consistency with Word forms, let's inject after the label's run.
        const runEndAfterLabel = xml.indexOf('</w:r>', labelEnd);
        if (runEndAfterLabel !== -1 && runEndAfterLabel < currentParaEnd + 50) {
            const newRuns = 
                `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` + 
                `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` + 
                `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;
            
            xml = xml.substring(0, runEndAfterLabel + 6) + newRuns + xml.substring(runEndAfterLabel + 6);
            console.log(`Tagged ${labelText} -> {${tag}} at end of run`);
            labelRegex.lastIndex = runEndAfterLabel + 6 + newRuns.length;
        }
    }
}

// Perform tagging
tagField('Owner’s Name', 'owner_name');
tagField('Address', 'owner_address');
tagField('Pet’s Name', 'pet_name');
tagField('Color', 'color');
tagField('Sex', 'sex');
tagField('Species', 'species');
tagField('Breed', 'breed');
tagField('Surgical Procedure', 'procedure_cost');
tagField('to perform', 'procedure_name');
tagField('Estimated Cost', 'cost');
tagField('Deposit', 'deposit');
tagField('Medication', 'medication');
tagField('Balance', 'balance');
tagField('Laboratory Test(s)', 'lab_tests');
tagField('TOTAL', 'total');
// tagField('to perform', 'procedure'); // removed duplicate

// Validate XML and save
try {
    const { DOMParser } = require('@xmldom/xmldom');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const errors = doc.getElementsByTagName('parsererror');
    if (errors.length > 0) {
        throw new Error(errors[0].textContent);
    }
    console.log('XML Validation: PASSED');
    
    zip.file('word/document.xml', xml);
    fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
    console.log('Surgery template created successfully.');
} catch (e) {
    console.error('XML Validation: FAILED');
    console.error(e.message);
    process.exit(1);
}
