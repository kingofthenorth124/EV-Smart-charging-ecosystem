import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";


@Injectable()
export class WebhookSecurityService {

  private processed = new Set<string>();


  generateHash(payload:any):string {

    return createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");

  }


  isReplay(payload:any):boolean {

    const hash=this.generateHash(payload);

    if(this.processed.has(hash)){
      return true;
    }

    this.processed.add(hash);

    return false;

  }

}
