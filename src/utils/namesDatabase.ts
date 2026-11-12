export interface CharacterNameEntry {
  first: string;
  last: string;
  genre: 'Sci-Fi' | 'Noir' | 'Drama' | 'Action' | 'Historical' | 'Thriller';
  role: 'Protagonist' | 'Antagonist' | 'Mentor' | 'Specialist' | 'Ensemble';
  tagline: string;
}

export const CHARACTER_NAMES_DATABASE: CharacterNameEntry[] = [
  { first: 'Elena', last: 'Vance', genre: 'Sci-Fi', role: 'Protagonist', tagline: 'Cybernetic surgeon defying corporate medical hegemony' },
  { first: 'Marcus', last: 'Shaw', genre: 'Sci-Fi', role: 'Antagonist', tagline: 'Cynical bio-tech venture director with military contracts' },
  { first: 'Ren', last: 'Kowalski', genre: 'Sci-Fi', role: 'Specialist', tagline: 'Sub-orbital smuggler with synthetic neural optometry' },
  { first: 'Kira', last: 'Chen', genre: 'Sci-Fi', role: 'Protagonist', tagline: 'Quantum archivist decoding suppressed city memory caches' },
  { first: 'Julian', last: 'Mercer', genre: 'Noir', role: 'Protagonist', tagline: 'Hardboiled private investigator with a drinking habit' },
  { first: 'Vivian', last: 'Cross', genre: 'Noir', role: 'Antagonist', tagline: 'Billionaire heiress with ties to waterfront dock cartels' },
  { first: 'Silas', last: 'Vaughn', genre: 'Action', role: 'Specialist', tagline: 'Former tactical munitions engineer turned whistleblower' },
  { first: 'Camille', last: 'Delacroix', genre: 'Drama', role: 'Protagonist', tagline: 'Diplomatic attache managing fragile ceasefire agreements' },
  { first: 'Cassian', last: 'Drake', genre: 'Thriller', role: 'Antagonist', tagline: 'Deep-cover intelligence operative running false-flag ops' },
  { first: 'Maya', last: 'Lin', genre: 'Sci-Fi', role: 'Mentor', tagline: 'Retired cybernetics professor living off-grid in Sector 9' },
  { first: 'Dexter', last: 'Holt', genre: 'Action', role: 'Protagonist', tagline: 'Precision retrieval specialist operating on borrowed time' },
  { first: 'Sloane', last: 'Sterling', genre: 'Thriller', role: 'Specialist', tagline: 'Forensic digital acoustician tracking synthetic frequencies' },
  { first: 'Arthur', last: 'Pendleton', genre: 'Historical', role: 'Mentor', tagline: 'Exiled royal cartographer charting unmapped territories' },
  { first: 'Nadia', last: 'Volkov', genre: 'Action', role: 'Antagonist', tagline: 'Ruthless syndicate lieutenant with chrome knuckles' },
  { first: 'Gideon', last: 'Frost', genre: 'Noir', role: 'Specialist', tagline: 'Disgraced coroner who notices patterns nobody else sees' },
];
