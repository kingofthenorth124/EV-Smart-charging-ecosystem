import { Injectable } from "@nestjs/common";


@Injectable()
export class SessionPaymentGuard {


 validateSessionCharge(
    session:any
 ){

    if(!session.userId){
      throw new Error(
        "Charging session requires user authorization"
      );
    }


    if(!session.walletId){
      throw new Error(
        "Charging session requires wallet linkage"
      );
    }


    return true;

 }

}

