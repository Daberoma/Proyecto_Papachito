import AsyncStorage from '@react-native-async-storage/async-storage';
export type OfflineSale={id:string,seller:string,items:any[],total:number,paymentMethod?:'cash'|'digital',createdAt:string,status:'pending'|'synced'|'error',remoteUuid?:string,error?:string};
const SALES_KEY='papachito.offline.sales';
const SELLER_KEY='papachito.seller';
const API_KEY='papachito.api.base';
const CATALOG_KEY='papachito.catalog';
export async function getSales():Promise<OfflineSale[]>{try{return JSON.parse(await AsyncStorage.getItem(SALES_KEY)||'[]')}catch{return[]}}
export async function queueSale(s:OfflineSale){const all=await getSales();all.push(s);await AsyncStorage.setItem(SALES_KEY,JSON.stringify(all));return all}
export async function replaceSales(s:OfflineSale[]){await AsyncStorage.setItem(SALES_KEY,JSON.stringify(s))}
export async function removeSale(id:string){const all=await getSales();await replaceSales(all.filter((sale)=>sale.id!==id));}
export async function getSeller(){return (await AsyncStorage.getItem(SELLER_KEY))||''}
export async function setSeller(v:string){await AsyncStorage.setItem(SELLER_KEY,v.trim())}
export async function clearSeller(){await AsyncStorage.removeItem(SELLER_KEY)}
export async function getApiBase(){return (await AsyncStorage.getItem(API_KEY))||''}
export async function setApiBase(v:string){await AsyncStorage.setItem(API_KEY,v)}
export async function getCatalog<T=any[]>():Promise<T>{try{return JSON.parse(await AsyncStorage.getItem(CATALOG_KEY)||'[]')}catch{return [] as T}}
export async function setCatalog(value:any[]){await AsyncStorage.setItem(CATALOG_KEY,JSON.stringify(value))}
export async function detectApiBase(candidates:string[]):Promise<string>{
 const saved=await getApiBase();
 // La IP guardada puede pertenecer al Wi‑Fi anterior. Se prueban primero
 // los hosts detectados en la sesión actual y se deja la guardada como respaldo.
 const unique=Array.from(new Set([saved,...candidates].filter(Boolean)));
 for(let offset=0;offset<unique.length;offset+=24){
  const batch=unique.slice(offset,offset+24);
  const results=await Promise.all(batch.map(async(base)=>{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),900);
   try{const res=await fetch(`${base}/api/salud`,{signal:controller.signal});return res.ok?base:''}
   catch{return ''} finally{clearTimeout(timer)}
  }));
  const found=results.find(Boolean);
  if(found){await setApiBase(found);return found}
 }
 return unique[0]||'http://127.0.0.1:8090';
}
export async function discoverApiBase(candidates:string[], ipAddress?:string):Promise<string>{
 const saved=await getApiBase();
 const generated:string[]=[];
 const ip=String(ipAddress||'');
 const match=ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
 if(match){for(let n=1;n<=254;n+=1) generated.push(`http://${match[1]}.${n}:8090`)}
 return detectApiBase(Array.from(new Set([...candidates,...generated,saved])));
}
export async function syncPendingSales(apiBase:string):Promise<{online:boolean,synced:number}>{
 const all=await getSales();
 const pending=all.filter((sale)=>sale.status!=='synced');
 if(pending.length===0){
  try{
   const res=await fetch(`${apiBase}/api/catalogo`);
   return {online:res.ok,synced:0};
  }catch{
   return {online:false,synced:0};
  }
 }
 let changed=false;
 let synced=0;
 for(const sale of all){
  if(sale.status==='synced') continue;
  try{
   const res=await fetch(`${apiBase}/api/ventas/sincronizar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sale)});
   const data=await res.json();
   if(!res.ok||!data.ok) throw new Error(data.message||'No sincronizo');
   sale.status='synced';
   sale.remoteUuid=data.uuid;
   sale.error=undefined;
   synced++;
   changed=true;
  }catch(err:any){
   sale.status='error';
   sale.error=err?.message||'Sin conexion';
   changed=true;
   break;
  }
 }
 if(changed) await replaceSales(all);
 return {online:synced>0||all.every((sale)=>sale.status==='synced'),synced};
}
