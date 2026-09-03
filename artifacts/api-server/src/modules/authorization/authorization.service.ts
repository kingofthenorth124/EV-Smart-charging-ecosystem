import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AuthorizationService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async authorize(identifier: string) {

    const credential =
      await this.prisma.chargingCredential.findUnique({
        where:{
          identifier,
        },
        include:{
          user:{
            include:{
              wallet:true,
            }
          }
        }
      });


    if(!credential){
      throw new ForbiddenException(
        "Charging credential not found"
      );
    }


    if(credential.status !== "ACTIVE"){
      throw new ForbiddenException(
        "Credential inactive"
      );
    }


    if(
      credential.expiryDate &&
      credential.expiryDate < new Date()
    ){
      throw new ForbiddenException(
        "Credential expired"
      );
    }


    await this.prisma.chargingCredential.update({
      where:{
        id:credential.id,
      },
      data:{
        lastUsedAt:new Date(),
      }
    });


    return {
      authorized:true,
      userId:credential.userId,
      credentialId:credential.id,
      walletBalanceKobo:
        credential.user.wallet?.balanceKobo ?? 0,
    };
  }
}
