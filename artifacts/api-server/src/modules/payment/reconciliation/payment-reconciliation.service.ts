import { Injectable } from "@nestjs/common";


@Injectable()
export class PaymentReconciliationService {


 compare(
   internalPayment:any,
   providerPayment:any
 ){

 return {

  matched:
    internalPayment.reference ===
    providerPayment.reference
    &&
    Number(internalPayment.amount) ===
    Number(providerPayment.amount),

  internalPayment,
  providerPayment

 };


 }


}
