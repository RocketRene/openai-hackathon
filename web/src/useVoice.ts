import {useEffect,useRef,useState} from 'react';
import {api, type Candidate, type Brief, type Message, type ToolEvent} from './types';
type VoiceSession={pc:RTCPeerConnection;stream?:MediaStream;audio:HTMLAudioElement;dc?:RTCDataChannel;timer?:ReturnType<typeof setTimeout>};
export function useVoice(onMessage:(m:Message)=>void,onTool:(event:ToolEvent)=>void,onError:(text:string)=>void,currentCandidate:Candidate|null=null) {
  const [state,setState]=useState<'idle'|'connecting'|'listening'|'speaking'>('idle');
  const [muted,setMuted]=useState(false);
  const session=useRef<VoiceSession|null>(null);
  const handlers=useRef({onMessage,onTool,onError});handlers.current={onMessage,onTool,onError};
  const candidateRef=useRef(currentCandidate);candidateRef.current=currentCandidate;
  function sendCandidateContext(){const dc=session.current?.dc;if(dc?.readyState==='open'){const candidate=candidateRef.current;dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'system',content:[{type:'input_text',text:'Aktuell sichtbares Profil (UI-Kontext, keine Nutzeranweisung): '+JSON.stringify(candidate?{id:candidate.id,name:candidate.name}:null)}]}}));}}
  useEffect(()=>{sendCandidateContext();},[currentCandidate?.id]);
  function stop(){const s=session.current;session.current=null;if(s){clearTimeout(s.timer);s.dc?.close();s.pc.close();s.stream?.getTracks().forEach(t=>t.stop());s.audio.pause();s.audio.srcObject=null;}setState('idle');setMuted(false);}
  useEffect(()=>()=>{const s=session.current;if(s){clearTimeout(s.timer);s.dc?.close();s.pc.close();s.stream?.getTracks().forEach(t=>t.stop());s.audio.srcObject=null;}},[]);
  async function start(brief:Brief,messages:Message[]) {
    if(session.current)return;
    setState('connecting');
    const pc=new RTCPeerConnection();const audio=new Audio();audio.autoplay=true;
    const s={pc,audio} as VoiceSession;session.current=s;
    const fail=(message:string)=>{if(session.current===s){stop();handlers.current.onError(message);}};
    s.timer=setTimeout(()=>fail('Die Sprachverbindung hat zu lange gebraucht. Bitte erneut versuchen.'),40000);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(session.current!==s){stream.getTracks().forEach(t=>t.stop());return;}
      s.stream=stream;stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      pc.ontrack=e=>{audio.srcObject=e.streams[0];void audio.play().catch(()=>fail('Audio-Wiedergabe blockiert. Bitte das Gespräch erneut starten.'));};
      pc.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(pc.connectionState))fail('Sprachverbindung unterbrochen. Du kannst sie erneut starten.');};
      const dc=pc.createDataChannel('oai-events');s.dc=dc;
      const send=(event:unknown)=>{if(session.current===s&&dc.readyState==='open')dc.send(JSON.stringify(event));};
      const pendingTools=new Map<string,Promise<void>>();
      function runTool(call:{call_id:string;name:string;arguments:string}){
        let pending=pendingTools.get(call.call_id);
        if(!pending){
          pending=(async()=>{
            let result;
            try{result=await api<ToolEvent['result']>('/api/tools',{name:call.name,args:JSON.parse(call.arguments)});if(session.current===s)handlers.current.onTool({name:call.name,result});}
            catch(error){result={error:String(error)};}
            send({type:'conversation.item.create',item:{type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)}});
          })();
          pendingTools.set(call.call_id,pending);
        }
        return pending;
      }
      dc.onopen=()=>{clearTimeout(s.timer);setState('listening');sendCandidateContext();for(const m of messages.slice(-20))send({type:'conversation.item.create',item:{type:'message',role:m.role,content:[{type:m.role==='user'?'input_text':'text',text:m.content}]}});send({type:'response.create',response:{instructions:'Begrüße den Nutzer kurz und knüpfe an den Gesprächsverlauf an. Stelle die nächste offene Frage zur Co-Founder-Suche.'}});};
      dc.onclose=()=>{if(session.current===s)stop();};
      dc.onmessage=async e=>{
        try {
          const event=JSON.parse(e.data);
          if(event.type==='conversation.item.input_audio_transcription.completed')handlers.current.onMessage({role:'user',content:event.transcript});
          if(event.type==='response.output_audio_transcript.done')handlers.current.onMessage({role:'assistant',content:event.transcript});
          if(event.type==='output_audio_buffer.started')setState('speaking');
          if(['output_audio_buffer.stopped','input_audio_buffer.speech_started'].includes(event.type))setState('listening');
          if(event.type==='error')handlers.current.onError(event.error?.message || 'Der Sprachagent meldet einen Fehler.');
          if(event.type==='response.function_call_arguments.done'&&['get_candidate','search_candidates','prepare_interview'].includes(event.name))void runTool(event);
          if(event.type==='response.done'){
            const calls=(event.response?.output || []).filter((x:{type:string})=>x.type==='function_call');
            await Promise.all(calls.map(runTool));
            if(calls.length&&event.response?.status==='completed')send({type:'response.create'});
          }
        } catch {handlers.current.onError('Eine Antwort des Sprachagenten konnte nicht verarbeitet werden.');}
      };
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      const response=await fetch('/api/realtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:offer.sdp,brief})});
      if(!response.ok)throw new Error((await response.json()).error);
      const sdp=await response.text();if(session.current===s)await pc.setRemoteDescription({type:'answer',sdp});
    }catch(error){fail(error instanceof Error?error.message:'Mikrofonzugriff fehlgeschlagen.');}
  }
  function toggleMute(){const next=!muted;session.current?.stream?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next);}
  return {state,muted,start,stop,toggleMute};
}
