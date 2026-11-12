'use strict';
const {parentPort,workerData}=require('node:worker_threads');
try{const result=normalizeWav(Buffer.from(workerData.bytes),workerData.sampleRate),bytes=Uint8Array.from(result.wav);parentPort.postMessage({...result,wav:bytes},[bytes.buffer]);}catch(error){parentPort.postMessage({error:error.message});}finally{parentPort.close();}
