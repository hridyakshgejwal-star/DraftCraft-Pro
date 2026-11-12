import Foundation
import AVFoundation
import Speech
import Dispatch

func emit(_ value:[String:Any]) { if let data=try? JSONSerialization.data(withJSONObject:value),let line=String(data:data,encoding:.utf8){print(line);fflush(stdout)} }
let locale=CommandLine.arguments.dropFirst().first ?? "en-US"
guard let recognizer=SFSpeechRecognizer(locale:Locale(identifier:locale)) else { emit(["type":"error","message":"This recognition language is unavailable."]);exit(1) }
guard recognizer.supportsOnDeviceRecognition else { emit(["type":"error","message":"On-device recognition is unavailable for this language. Download an available dictation language in macOS Settings. No audio was sent to a server."]);exit(1) }
let engine=AVAudioEngine()
var request:SFSpeechAudioBufferRecognitionRequest?
var task:SFSpeechRecognitionTask?
var stopped=false
func stop(){if stopped{return};stopped=true;engine.stop();engine.inputNode.removeTap(onBus:0);request?.endAudio();task?.cancel();emit(["type":"state","state":"stopped"]);exit(0)}
func recognize(){
 let next=SFSpeechAudioBufferRecognitionRequest();next.shouldReportPartialResults=true;next.requiresOnDeviceRecognition=true;request=next
 task=recognizer.recognitionTask(with:next){result,error in
  if stopped{return}
  if let result=result {emit(["type":result.isFinal ? "final":"partial","text":result.bestTranscription.formattedString]);if result.isFinal {task=nil;recognize()}}
  if let error=error {emit(["type":"error","message":error.localizedDescription]);stop()}
 }
}
func begin(){
 do {let input=engine.inputNode,format=input.outputFormat(forBus:0);guard format.sampleRate>0&&format.channelCount>0 else {emit(["type":"error","message":"No microphone input is available."]);exit(1)};recognize();input.installTap(onBus:0,bufferSize:1024,format:format){buffer,_ in request?.append(buffer)};engine.prepare();try engine.start();emit(["type":"state","state":"listening"])}catch{emit(["type":"error","message":error.localizedDescription]);exit(1)}
}
signal(SIGTERM,SIG_IGN);signal(SIGINT,SIG_IGN)
let terminate=DispatchSource.makeSignalSource(signal:SIGTERM,queue:.main);terminate.setEventHandler{stop()};terminate.resume()
let interrupt=DispatchSource.makeSignalSource(signal:SIGINT,queue:.main);interrupt.setEventHandler{stop()};interrupt.resume()
SFSpeechRecognizer.requestAuthorization{authorization in
 guard authorization == .authorized else {emit(["type":"error","message":"Speech Recognition permission was denied. Enable it for DraftCraft in macOS Privacy & Security."]);exit(1)}
 AVCaptureDevice.requestAccess(for:.audio){allowed in DispatchQueue.main.async{if allowed{begin()}else{emit(["type":"error","message":"Microphone permission was denied."]);exit(1)}}}
}
RunLoop.main.run()
