const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/CONSENT FOR CONFINEMENT.docx';
const outputPath = 'public/Confinement_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

/**
 * Super Precise Tagger
 * Uses careful boundary detection to avoid accidentally catching w:rPr as w:r.
 */
function tagField(labelText, tag) {
    const p = labelText.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*').join('');
    const labelRegex = new RegExp(p, 'g');
    
    let match;
    while ((match = labelRegex.exec(xml)) !== null) {
        const labelEnd = match.index + match[0].length;
        
        // Find next tab
        const tabPos = xml.indexOf('<w:tab/>', labelEnd);
        if (tabPos === -1) continue;

        // Find the start of the <w:r> containing this tab.
        // We MUST carefully search backwards for an OPENING run tag.
        let runStart = -1;
        let searchBack = tabPos;
        while ((searchBack = xml.lastIndexOf('<w:r', searchBack)) !== -1) {
            // Check if it's <w:r> or <w:r ... > and NOT <w:rPr
            const afterTag = xml.charAt(searchBack + 4);
            if (afterTag === '>' || afterTag === ' ') {
                runStart = searchBack;
                break;
            }
            searchBack--; // Continue searching backwards
        }

        // Find the end of this run.
        const runEnd = xml.indexOf('</w:r>', tabPos);
        
        if (runStart === -1 || runEnd === -1 || runStart < labelEnd) {
            // Skip if first found tab isn't in a valid run after the label.
            continue;
        }

        // Potential check to avoid crossing paragraph boundary if needed
        // (but for these forms, it's usually label then tab in same paragraph)

        // Avoid double tagging
        const currentSlice = xml.substring(runStart, runEnd + 6);
        if (currentSlice.includes(`{${tag}}`)) continue;

        console.log(`Tagging ${labelText} -> {${tag}} at run pos ${runStart}`);

        // Balanced replacement
        const newRuns = 
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` + 
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` + 
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;

        xml = xml.substring(0, runStart) + newRuns + xml.substring(runEnd + 6);
        
        labelRegex.lastIndex = runStart + newRuns.length;
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
tagField('estimated cost of treatment is', 'first_day_cost');
tagField('on the first day and', 'succeeding_day_cost');

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
    console.log('Confinement template created successfully.');
} catch (e) {
    console.error('XML Validation: FAILED');
    console.error(e.message);
    process.exit(1);
}
