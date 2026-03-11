const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/Grooming Treatment Agreement.docx';
const outputPath = 'public/Grooming_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

/**
 * Super Safe Surgical Tagger
 */
function tagField(labelText, tag, needsColon = false, removeExtra = null) {
    const p = labelText.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*').join('');
    const regex = new RegExp(`(${p})((?:(?!<w:t).)*?)(_{3,})`, 'gs');
    
    xml = xml.replace(regex, (match, labelPart, gap, underscores) => {
        if (match.includes(`{${tag}}`)) return match;
        
        console.log(`Tagged ${labelText} -> {${tag}}`);

        let displayLabel = labelText.trim();
        if (needsColon && !displayLabel.endsWith(':')) {
            displayLabel += ':';
        }

        return `${displayLabel}</w:t></w:r>` + 
               `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>` + 
               `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` + 
               `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"> `;
    });

    if (removeExtra) {
        const extraP = removeExtra.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:<[^>]+>)*').join('');
        const extraRegex = new RegExp(extraP, 'g');
        xml = xml.replace(extraRegex, '');
    }
}

// 1. Tag fields
tagField('my pet', 'pet_name', false, '(Name of pet)');
tagField('THIS', 'day', false);
tagField('DAY OF', 'month', false);
tagField(', 20', 'year_2dig', false);
tagField('ADDRESS:', 'owner_address', true);
tagField('CONTACT NO:', 'owner_contact', true);

// 2. Extra Cleanup: Remove remaining underscores around the date
xml = xml.replace(/(_{3,})(\s*DAY OF)/g, '$2'); // remove underscores before "DAY OF"
xml = xml.replace(/(DAY OF\s*)(_{3,})/g, '$1'); // remove underscores after "DAY OF" if any remain

zip.file('word/document.xml', xml);
fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
console.log('Grooming template updated successfully.');
