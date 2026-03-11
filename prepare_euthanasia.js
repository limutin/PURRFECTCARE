const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const inputPath = 'Clinical Forms/Consent for Euthanasia.docx';
const outputPath = 'public/Euthanasia_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

/**
 * Safer tagger that avoids "Malformed XML" by properly balancing tags.
 */
function tagField(tag, labelPattern) {
    const p = labelPattern.split('').map(c => {
        const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return esc + '(?:<[^>]+>)*';
    }).join('');

    // Matches the label, then optional non-underscore chars, then underscores.
    const regex = new RegExp(`(${p})((?:(?!<w:p|<w:br|_).)*?)(_{3,})`, 'gs');

    let matches = 0;
    xml = xml.replace(regex, (match, labelBase, separator, underscores) => {
        if (match.includes(`{${tag}}`)) return match;

        matches++;
        console.log(`Tagged {${tag}} at instance ${matches} using label "${labelPattern}"`);

        // Clean label: Keep the original label text and ensure it ends with a colon.
        let labelText = (labelBase + separator).replace(/<[^>]+>/g, '').replace(/:/g, '').trim();
        let finalLabel = labelText + ':';

        // REPLACEMENT LOGIC (to avoid Malformed XML):
        // 1. We keep the label in the CURRENT <w:t>.
        // 2. We close the current <w:t> and <w:r>.
        // 3. We open a NEW <w:r> with underlining for the tag.
        // 4. We open a NEW <w:r> to "resume" the original run's context (mostly for underscores/spacing).

        // This ensures that whatever </w:t></w:r> follows naturally in the document 
        // will correctly close the last tags we open here.

        return `${finalLabel} </w:t></w:r>` +
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">{${tag}}</w:t></w:r>` +
            `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">  `;
    });
}

const config = [
    { tag: 'current_date', label: 'Date:' },
    { tag: 'owner_name', label: 'Owner’s Name:' },
    { tag: 'owner_address', label: 'Address' },
    { tag: 'pet_name', label: 'Pet’s Name:' },
    { tag: 'color', label: 'Color:' },
    { tag: 'sex', label: 'Sex:' },
    { tag: 'species', label: 'Species:' },
    { tag: 'breed', label: 'Breed:' }
];

config.forEach(c => tagField(c.tag, c.label));

zip.file('word/document.xml', xml);
fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
console.log('Final Euthanasia template created with XML safety fix.');
