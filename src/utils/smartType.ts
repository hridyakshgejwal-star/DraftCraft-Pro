import { Paragraph, ElementType } from '../types/script';
import { characterName } from '../writing/model';

export interface SmartTypeDictionary {
  characters: string[];
  extensions: string[];
  intros: string[];
  locations: string[];
  timesOfDay: string[];
  transitions: string[];
}

export const DEFAULT_EXTENSIONS = [
  '(ON PHONE)',
  '(V.O.)',
  '(O.S.)',
  '(O.C.)',
  '(CONT\'D)',
  '(PRE-LAP)',
  '(INTO PHONE)',
  '(FILTERED)',
  '(SUBTITLED)',
  '(ON MONITOR)',
];

export const DEFAULT_INTROS = [
  'INT.',
  'EXT.',
  'INT./EXT.',
  'I/E.',
];

export const DEFAULT_TIMES = [
  'DAY',
  'NIGHT','MORNING','AFTERNOON','EVENING',
  'DUSK',
  'DAWN',
  'CONTINUOUS',
  'LATER',
  'MOMENTS LATER',
  'SAME TIME',
  'FLASHBACK',
];

export const DEFAULT_TRANSITIONS = [
  'CUT TO:','FADE TO BLACK.','INTERCUT:','BACK TO:',
  'FADE IN:',
  'FADE OUT.',
  'DISSOLVE TO:',
  'SMASH CUT TO:',
  'MATCH CUT TO:',
  'JUMP CUT TO:',
  'TIME CUT:',
  'BLACKOUT.',
];

export function buildSmartTypeFromScript(paragraphs: Paragraph[],separator=' - '): SmartTypeDictionary {
  const characters = new Set<string>();
  const locations = new Set<string>();
  const extensions = new Set<string>(DEFAULT_EXTENSIONS);
  const intros = new Set<string>(DEFAULT_INTROS);
  const timesOfDay = new Set<string>(DEFAULT_TIMES);
  const transitions = new Set<string>(DEFAULT_TRANSITIONS);

  for (const p of paragraphs) {
    if (p.type === 'Character') {
      const name=characterName(p.text);
      if(name)characters.add(name);
      for(const extension of p.text.match(/\([^()]*\)/gu) || [])extensions.add(extension.toLocaleUpperCase('en-US'));
    } else if (p.type === 'Scene Heading') {
      const text = p.text.trim();
      // Parse INT./EXT. LOCATION - TIME
      const introMatch = text.match(/^(INT\.?\/EXT\.|INT\.|EXT\.|I\/E\.)/i);
      if (introMatch) {
        intros.add(introMatch[1].toUpperCase());
      }

      // Only a field separator divides location and time. Preserve US-101 and
      // other internal location hyphens, including with a template separator.
      const at=separator?text.lastIndexOf(separator):-1;
      const location=(at>=0?text.slice(0,at):text).replace(/^(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|INT\.?|EXT\.?|I\/E\.?)(?=\s|$)/i,'').trim().toUpperCase();
      if(location)locations.add(location);
      if(at>=0){const time=text.slice(at+separator.length).trim().toUpperCase();if(time)timesOfDay.add(time);}
    } else if (p.type === 'Transition') {
      transitions.add(p.text.trim().toUpperCase());
    }
  }

  return {
    characters: Array.from(characters).sort(),
    extensions: Array.from(extensions).sort(),
    intros: Array.from(intros),
    locations: Array.from(locations).sort(),
    timesOfDay: Array.from(timesOfDay),
    transitions: Array.from(transitions).sort(),
  };
}

export function getSmartTypeSuggestions(
  elementType: ElementType,
  currentInput: string,
  dict: SmartTypeDictionary,
  separator = ' - '
): string[] {
  const query = currentInput.trim().toUpperCase();

  switch (elementType) {
    case 'Character': {
      if (!query) return dict.characters.slice(0, 8);
      // If typing opening parenthesis, suggest extensions
      if (currentInput.includes('(')) {
        const extPart = currentInput.substring(currentInput.indexOf('(')).toUpperCase();
        return dict.extensions.filter((e) => e.startsWith(extPart));
      }
      return dict.characters.filter((c) => c.startsWith(query));
    }
    case 'Scene Heading': {
      if (!query) return dict.intros;
      // If starts with INT/EXT, suggest locations or times
      const split=separator?currentInput.toUpperCase().lastIndexOf(separator.toUpperCase()):-1;
      if (split>=0) {
        const timeQuery = currentInput.slice(split+separator.length).trim().toUpperCase();
        return dict.timesOfDay.filter((t) => t.startsWith(timeQuery)).map(t=>currentInput.slice(0,split+separator.length)+t);
      }
      const hasIntro = dict.intros.some((intro) => query.startsWith(intro));
      if (hasIntro) {
        const intro = [...dict.intros].sort((a,b)=>b.length-a.length).find((i) => query.startsWith(i)) || '';
        const locQuery = query.substring(intro.length).trim();
        if (locQuery) {
          return dict.locations
            .filter((l) => l.startsWith(locQuery))
            .map((l) => `${intro} ${l}`);
        }
        return dict.locations.slice(0, 6).map((l) => `${intro} ${l}`);
      }
      return dict.intros.filter((i) => i.startsWith(query));
    }
    case 'Transition': {
      if (!query) return dict.transitions;
      return dict.transitions.filter((t) => t.startsWith(query));
    }
    default:
      return [];
  }
}
