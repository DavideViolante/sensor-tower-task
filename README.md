# Sensor Tower task
TypeScript project to find (potential) duplicates in a file using Levenshtein distance.

## How it works
1. Reads the list of company names from a file.
2. Normalizes the company names by removing diacritics, common company type suffixes, extra spaces and converting to lowercase.
3. Uses [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) to compare normalized names and identify potential duplicates.
4. Groups similar names into groups based on a predefined similarity threshold (see `LEVENSHTEIN_THRESHOLD` variable).
5. Outputs the groups of potential duplicate company names.

## How to run
1. Install deps: `npm i`
2. Run: `npm start`
