import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";


@Injectable()
export class WebhookSecurityService {


 verifySignature(
   payload:string,
   signature:string,
   secret:string
 ){

 const hash =
 crypto
 .createHmac("sha512",secret)
 .update(payload)
 .digest("hex");


 return crypto.timingSafeEqual(
 Buffer.from(hash),
 Buffer.from(signature)
 );

 }


}
