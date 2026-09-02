import { Injectable } from "@nestjs/common";


@Injectable()
export class WalletLedgerService {


 createEntry(input:{
   walletId:string,
   type:string,
   amount:number,
   reference:string
 }){


 return {

   walletId:input.walletId,
   type:input.type,
   amount:input.amount,
   reference:input.reference,
   createdAt:new Date()

 };


 }


}
