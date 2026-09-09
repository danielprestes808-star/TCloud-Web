import ShareView from "./ShareView";
export default async function SharedPage({params}:{params:Promise<{token:string}>}) { const {token}=await params; return <ShareView token={token}/>; }
