export interface PunctuationSettings {
  enabled:boolean;
  fullStops:boolean;
  questions:boolean;
  conservativeExclamations:boolean;
  incompleteSentences:boolean;
  onEnter:boolean;
  whileTyping:boolean;
}
export const DEFAULT_PUNCTUATION:PunctuationSettings={enabled:true,fullStops:true,questions:true,conservativeExclamations:true,incompleteSentences:true,onEnter:true,whileTyping:false};
export function normalizePunctuation(value:unknown):PunctuationSettings {
  const source=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const result={...DEFAULT_PUNCTUATION};
  if(typeof value==='boolean')result.enabled=value;
  for(const key of Object.keys(result) as (keyof PunctuationSettings)[])if(typeof source[key]==='boolean')result[key]=source[key] as boolean;
  return result;
}
