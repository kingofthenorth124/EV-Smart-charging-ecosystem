import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";


@Injectable()
export class RefundService {


constructor(
private prisma:PrismaService
){}



async refund(paymentId:string){


return this.prisma.payment.update({

where:{
id:paymentId
},

data:{

status:"REFUNDED"

}

});


}


}
