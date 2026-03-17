const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const inputPath = 'VHC.docx';
const outputPath = 'public/VHC_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. SURGICAL REPLACEMENT FOR SPLIT LABELS
// Vaccine Used
xml = xml.replace(/(Vacci.*?ne Used.*?)(<w:t>)(_{3,})/gs, (match, prefix, tagOpen, underscores) => {
    if (prefix.includes('<w:p ')) return match;
    console.log("Tagged split: Vaccine Used");
    return `${prefix}${tagOpen}{vaccine_used}${underscores}`;
});

// 2. HELPER TO TAG FIELDS
function tagField(label, tag) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelRegex = new RegExp(`(<w:t>.*?)${escapedLabel}`, 'g');

    let matches = [];
    let m;
    while ((m = labelRegex.exec(xml)) !== null) {
        matches.push({ index: m.index, lastIndex: labelRegex.lastIndex });
    }

    for (let i = matches.length - 1; i >= 0; i--) {
        const matchInfo = matches[i];
        const searchContext = xml.substring(matchInfo.lastIndex, matchInfo.lastIndex + 2000);

        // Specifically find underscores: allows runs like "________" or "__ _____________"
        const underscoreRegex = /(<w:t>)(_{1,}\s*_{1,}|_{2,})/g;
        let uMatch;
        let found = false;

        while ((uMatch = underscoreRegex.exec(searchContext)) !== null) {
            const inBetween = searchContext.substring(0, uMatch.index);
            if (inBetween.includes('<w:p ')) break;

            const textInBetween = inBetween.replace(/<[^>]+>/g, '').trim();
            if (textInBetween.length > 5) continue;

            const underscorePos = matchInfo.lastIndex + uMatch.index;
            const prefix = xml.substring(0, underscorePos + uMatch[1].length);
            const suffix = xml.substring(underscorePos + uMatch[0].length);

            xml = prefix + `{${tag}}` + uMatch[2] + suffix;
            console.log(`Tagged: ${label} -> {${tag}}`);
            found = true;
            break;
        }
    }
}

const fields = [
    ['Control number:', 'control_no'],
    ['Date:', 'current_date'],
    ['Time:', 'time'],
    ['Owned by:', 'owner_name'],
    ['Residing at:', 'owner_address'],
    ['Contact number:', 'owner_contact'],
    ['Email address:', 'owner_email'],
    ['Destination:', 'destination'],
    ['Name of Pet', 'pet_name'],
    ['Species', 'species'],
    ['Breed', 'breed'],
    ['Color', 'color'],
    ['Sex', 'sex'],
    ['Age', 'age'],
    ['Weight ', 'weight'],
    ['Weight', 'weight'],
    ['Vaccine Used', 'vaccine_used']
];

fields.forEach(([label, tag]) => {
    if (label === 'Date:') {
        tagField('Date:', 'current_date');
        tagField('Date :', 'current_date');
        return;
    }
    tagField(label, tag);
});

// 3. CERTIFICATE BODY AUTOMATION
xml = xml.replace(/(the\s+)(?:dog|cat)(\s+described\s+below)/gi, '$1{species_lower}$2');
xml = xml.replace(/(find\s+the\s+)(?:dog|cat)/gi, '$1{species_lower}');
xml = xml.replace(/(vaccinated\s+the\s+above-described\s+)(?:dog|cat)/gi, '$1{species_lower}');

// 4. DIFFERENTIATE CURRENT vs VACCINATION DATE
xml = xml.replace(/(Rabies on.*?){current_date}/gs, '$1{vaccine_date}');

zip.file('word/document.xml', xml);
fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
console.log('Template recreated at:', outputPath);
