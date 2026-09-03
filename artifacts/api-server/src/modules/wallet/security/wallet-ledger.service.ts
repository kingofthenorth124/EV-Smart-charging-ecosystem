import { Injectable } from "@nestjs/common";


@Injectable()
export class WalletLedgerService {


 validate(amount:number){

    if(amount <=0){
      throw new Error(
        "Invalid wallet transaction amount"
      );
    }

    return true;
 }


 validateBalance(
    balance:number
 ){

    if(balance < 0){
      throw new Error(
        "Wallet balance cannot be negative"
      );
    }

    return true;
 }

}
