const PizZip = require('pizzip');
const fs = require('fs');

const inputPath = 'Clinical Forms/Waiver of Release.docx';
const outputPath = 'public/Waiver_Template.docx';

if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
}

const content = fs.readFileSync(inputPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// 1. Date
// "Date:  ___________________" or "Date: ___________________"
xml = xml.replace(/(Date:\s*)(_{3,})/g,
    (match, prefix, underscores) => {
        return `${prefix}</w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">{current_date}</w:t></w:r><w:r><w:t xml:space="preserve">  `;
    }
);

// 2. Owner
// "I, __________________________,"
xml = xml.replace(/(I,\s*)(_{3,})/g,
    (match, prefix, underscores) => {
        return `${prefix}</w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">{owner_name}</w:t></w:r><w:r><w:t xml:space="preserve">`;
    }
);

// 3. Pet Name
// "named ______________,"
xml = xml.replace(/(named\s+)(_{3,})/g,
    (match, prefix, underscores) => {
        return `${prefix}</w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">{pet_name}</w:t></w:r><w:r><w:t xml:space="preserve">`;
    }
);

zip.file('word/document.xml', xml);
fs.writeFileSync(outputPath, zip.generate({ type: 'nodebuffer' }));
console.log('Waiver template prepared.');
