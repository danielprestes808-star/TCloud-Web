"use client";
import { FormEvent, useState } from "react";

type Item = { id:string; name:string; kind:string; mime:string; size:number };
type Data = { name:string; kind:string; accessToken:string; items:Item[] };
export default function ShareView({ token }: { token:string }) {
  const [password,setPassword]=useState(""); const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function open(e?:FormEvent){e?.preventDefault();setBusy(true);setError("");
    const r=await fetch(`/api/public/shares/${token}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});
    if(!r.ok){setError(r.status===401?"Senha incorreta.":"Este link expirou ou foi revogado.");setBusy(false);return;}
    setData(await r.json());setBusy(false);
  }
  if(!data)return <main className="share-shell"><form onSubmit={open} className="share-panel"><div className="share-logo">TCloud</div><h1>Abrir compartilhamento</h1><p>Digite a senha se o proprietário protegeu este link.</p><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha (opcional)"/><button disabled={busy}>{busy?"Abrindo…":"Continuar"}</button>{error&&<b className="share-error">{error}</b>}</form></main>;
  return <main className="share-shell"><section className="share-browser"><header><div><span>TCLOUD COMPARTILHADO</span><h1>{data.name}</h1><p>{data.items.length} arquivo(s) · acesso somente leitura</p></div></header><div className="share-list">{data.items.map(item=>{const url=`/api/public/shares/${token}/media/${item.id}?access=${data.accessToken}`;return <a key={item.id} href={url} target="_blank" rel="noreferrer"><i>▣</i><div><b>{item.name}</b><small>{item.mime} · {(item.size/1048576).toFixed(1)} MB</small></div><span>Baixar</span></a>})}</div></section></main>;
}
