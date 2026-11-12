import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const slot=window.draftcraftDesktop?.documentSlot;
if(slot){const keys=new Set(['draftcraft_screenplay_doc_v1','fd13_crash_recovery_state_v1','fd13_crash_recovery_state_v1_temp','fd13_autosave_script_v2']);const proto=Storage.prototype,get=proto.getItem,set=proto.setItem,remove=proto.removeItem;const key=(value:string)=>keys.has(value)?value+':window:'+slot:value;proto.getItem=function(k){return get.call(this,this===localStorage?key(k):k);};proto.setItem=function(k,v){set.call(this,this===localStorage?key(k):k,v);};proto.removeItem=function(k){remove.call(this,this===localStorage?key(k):k);};}

createRoot(document.getElementById('root')!).render(<App />);
