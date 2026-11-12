import type {Voice,SynthesisRequest} from './model';
import type {GeneratedSpeech} from './player';
export interface EngineStatus {platform:string;macos:boolean;configured:boolean;formats:string[];cache:{files:number;bytes:number;limitBytes:number};qualityNote:string}
export interface VoiceCatalogue {voices:Voice[];models:{id:string;name:string;languages:string[]}[]}
export type ExportItem={request:SynthesisRequest;gapMs:number;scene:string;sceneId:string;speaker:string;paragraphId:string};
export type ExportResult={saved:boolean;canceled?:boolean;name?:string;files?:string[];duration?:number;bytes?:number};
export interface TableReadApi {status:()=>Promise<EngineStatus>;voices:(engine:string,options:unknown)=>Promise<VoiceCatalogue>;configure:(key:string)=>Promise<{configured:boolean}>;authorize:(requests:SynthesisRequest[])=>Promise<{token:string;characters:number}>;synthesize:(request:SynthesisRequest,id:string,token?:string)=>Promise<GeneratedSpeech>;cancel:(prefix:string)=>Promise<unknown>;clear:()=>Promise<EngineStatus['cache']>;limit:(mb:number)=>Promise<unknown>;export:(payload:{plan:ExportItem[];format:string;separate:boolean;cueSheet:boolean;title:string;id:string;token?:string})=>Promise<ExportResult>;onProgress:(fn:(p:{id:string;done:number;total:number;phase:string})=>void)=>()=>void}
export function tableReadApi():TableReadApi|undefined{return window.draftcraftDesktop?.tableRead;}
