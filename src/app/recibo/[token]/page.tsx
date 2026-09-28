import { notFound } from 'next/navigation';
import { adminClient } from '@/lib/server';
import { Receipt } from '@/components/receipt';
import {receiptData,type Order} from '@/lib/domain';
export const dynamic='force-dynamic';
export const metadata={title:'Comprobante de servicio',robots:{index:false,follow:false}};
export default async function SharedReceipt({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const {data,error}=await adminClient().from('receipt_links').select('snapshot').eq('token',token).is('revoked_at',null).maybeSingle();
  if(error||!data) notFound();
  return <main className="public-receipt"><Receipt order={receiptData(data.snapshot as Order)} /></main>;
}
