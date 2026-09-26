import {useEffect,useRef,useState} from 'react';
import {RealtimeKitProvider,useRealtimeKitClient} from '@cloudflare/realtimekit-react';
import {RtkMeeting} from '@cloudflare/realtimekit-react-ui';
import {api} from './types';
export default function InterviewRoom(){
  const [meeting,initMeeting]=useRealtimeKitClient();
  const [error,setError]=useState('');const init=useRef(initMeeting);const current=useRef(meeting);current.current=meeting;
  useEffect(()=>{let cancelled=false;api<{authToken:string}>('/api/room',{}).then(async({authToken})=>{if(!cancelled)await init.current({authToken,defaults:{audio:false,video:false}});}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;void current.current?.leave();};},[]);
  if(error)return <div className="empty"><h3>Interviewraum noch nicht eingerichtet</h3><p>{error}</p><p>Ein RealtimeKit-Meeting und ein Teilnehmertoken werden benötigt. Der Raum verbindet Gesprächsteilnehmer; er enthält keinen KI-Bot.</p></div>;
  return <div className="meeting">{meeting?<RealtimeKitProvider value={meeting}><RtkMeeting meeting={meeting} mode="fill" showSetupScreen={true}/></RealtimeKitProvider>:<p>Interviewraum wird vorbereitet …</p>}</div>;
}
