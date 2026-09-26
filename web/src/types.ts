export type Candidate = {id:string;name:string;avatars:string[];company:string;role:string;headline:string;summary:string;location:string;interests:string[];skills:string[];experience:{title:string;company:string;description:string;start:number|null;end:number|null}[];education:{school:string;degree:string;field:string}[];linkedin:string;enriched:boolean;fetchedAt:string|null;source:string;matches?:string[]};
export type Brief = {idea:string;strengths:string;lookingFor:string;constraints:string};
export type Message = {role:'user'|'assistant';content:string};
export type Interview = {candidateId:string;name:string;title:string;duration:string;sections:{title:string;minutes:number;questions:string[]}[];unknowns:string[]};
export type ToolEvent = {name:string;result:{query?:string;candidate?:Candidate;brief?:Brief;interview?:Interview}};
export async function api<T>(path:string, body?:unknown):Promise<T> {
  const r=await fetch(path,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){const data=await r.json().catch(()=>({error:'Die Anfrage ist fehlgeschlagen.'}));throw new Error(data.error);}
  return r.json();
}
