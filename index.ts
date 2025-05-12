import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve as pathResolve } from 'path';
import { distance as levenshteinDistance } from 'fastest-levenshtein';

const FILENAME = 'companies.txt';
const inputFilePath = pathResolve(__dirname, FILENAME);

// https://en.wikipedia.org/wiki/Levenshtein_distance
const LEVENSHTEIN_THRESHOLD = 1;
// List of company type suffixes such as Inc, Ltd, etc (list increased by CoPilot)
const COMPANY_TYPES = [
  'inc', 'ltd', 'corp', 'corporation', 'company', 'co', 'llc', 'srl', 'srls', 'gmbh', 'sa', 'sas', 'oy', 'ab', 'bv', 
  'ag', 'kg', 'kft', 'pte', 'plc', 'ltda', 'spa', 'nv', 'as', 'aps', 'sro', 'zrt', 'ooo', 'sde', 'kda', 'kk', 
  'kabushiki', 'kaisha', 'pty', 'limited', 'unlimited', 'partnership', 'llp', 'lllp', 'lp', 'ulc', 'incorporated', 
  'sociedad', 'anonima', 'gesellschaft', 'mit', 'beschrankter', 'haftung', 'aktiengesellschaft', 'societa', 
  'responsabilita', 'limitat', 'societe', 'anonyme', 'naamloze', 'vennootschap', 'aktieselskab', 'aktiebolag', 
  'societate', 'cu', 'raspundere', 'limitata', 'osakeyhtio', 'yhtiot', 'korlátolt', 'felelősségű', 'társaság', 'ansvar'
];
const COMPANY_TYPES_REGEX = new RegExp(`\\b(${COMPANY_TYPES.join('|')})\\b`, 'gi');

/**
 * Function to normalize company names to make them easly comparable.
 * Remove diacritics, common company type suffixes, extra spaces, etc.
 * @param name The company name to normalize
 * @returns normalized company name
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
    .normalize('NFD')
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
    // https://stackoverflow.com/a/37511463
    .replace(/\p{Diacritic}/gu, '') // cafè -> cafe, mañana -> manana, etc
    .replace(COMPANY_TYPES_REGEX, '') // remove common company type suffixes
    .replace(/\s+/g, ' ') // replace multiple spaces with a single space
    .trim();
}

/**
 * Function to find potential duplicate company names in a list.
 * It uses Levenshtein distance to compare the names.
 * The function groups names that are similar enough based on the threshold.
 * @param names Array of company names to check for duplicates
 * @returns groups of potential duplicates
 */
function findDuplicates(names: string[], normalizedNamesMap: Map<string, string>): string[][] {
  const groups: string[][] = []; // Eg: "[["Company A", "Company A Inc", "Còmpany A"], ["Company B", "Company B Ltd"], ...]"
  const processed = new Set<string>(); // Keep track of already processed names to avoid grouping them again
  
  // Complexity should be O(n^2) in the worst case or O(n log n) if the names are sorted
  for (let i = 0; i < names.length; i++) {
    if (processed.has(names[i])) {
      continue;
    }

    const group = [names[i]]; // Start a new group with the current name
    const normalizedNameI = normalizedNamesMap.get(names[i]) || '';
    processed.add(names[i]);

    for (let j = i + 1; j < names.length; j++) {
      if (processed.has(names[j])) {
        continue;
      }

      const normalizedNameJ = normalizedNamesMap.get(names[j]) || '';

      // Early exit if names are way too different in length (performance optimization)
      if (Math.abs(normalizedNameJ.length - normalizedNameI.length) > 10) {
        break;
      }

      if (levenshteinDistance(normalizedNameI, normalizedNameJ) <= LEVENSHTEIN_THRESHOLD) {
        group.push(names[j]);
        processed.add(names[j]);
      } else {
        // Names are not similar enough, exit the inner loop
        break;
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

async function main(filePath: string) {
  const names: string[] = [];
  const normalizedNamesMap = new Map<string, string>();
  
  const file = createInterface({
    input: createReadStream(filePath),
  });

  for await (const line of file) {
    names.push(line.trim());
  }

  for (let i = 0; i < names.length; i++) {
    normalizedNamesMap.set(names[i], normalizeCompanyName(names[i])); // Eg: "Company A Inc" -> "company a"
  }
  const duplicates = findDuplicates(names, normalizedNamesMap);

  if (duplicates.length) {
    console.log('Duplicate groups:\n');
    duplicates.forEach((group, i) => {
      console.log(`Group ${i + 1}:`);
      group.forEach(name => console.log(`- ${name}`));
    });
    console.log(`Total groups found: ${duplicates.length}`);
  }
}

main(inputFilePath).catch(err => console.error(err));
