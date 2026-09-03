import { Injectable } from "@nestjs/common";


@Injectable()
export class PaymentRecoveryService {


 shouldRetry(
   status:string,
   attempts:number
 ){

 if(attempts >= 5)
 return false;


 return [
  "PENDING",
  "PROCESSING"
 ].includes(status);


 }


}
