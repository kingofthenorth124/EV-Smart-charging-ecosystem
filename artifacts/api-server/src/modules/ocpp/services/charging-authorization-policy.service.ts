import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ChargingAuthorizationPolicyService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async canStartCharging(
    userId: string,
  ) {

    const user =
      await this.prisma.user.findUnique({
        where:{
          id:userId,
        },
        include:{
          wallet:true,
        },
      });


    if (!user) {
      throw new ForbiddenException(
        "User not found",
      );
    }


    if (!user.wallet) {
      throw new ForbiddenException(
        "Wallet not found",
      );
    }


    if (user.wallet.status !== "ACTIVE") {
      throw new ForbiddenException(
        "Wallet inactive",
      );
    }


    const minimumBalanceKobo = 1000;


    if (
      user.wallet.balanceKobo < minimumBalanceKobo
    ) {
      throw new ForbiddenException(
        "Insufficient wallet balance",
      );
    }


    return {
      allowed:true,
      walletBalanceKobo:
        user.wallet.balanceKobo,
    };
  }

  async canContinueCharging(
    transactionId: number,
    currentEnergyWh: number,
  ) {

    const transaction =
      await this.prisma.ocppTransaction.findUnique({
        where:{
          transactionId,
        },
        include:{
          station:true,
        },
      });


    if (!transaction) {
      throw new ForbiddenException(
        "Transaction not found",
      );
    }


    if (!transaction.idTag) {
      throw new ForbiddenException(
        "Missing RFID credential",
      );
    }


    if (!transaction.idTag) {
      throw new ForbiddenException(
        "Missing RFID credential",
      );
    }


    const credential =
      await this.prisma.chargingCredential.findUnique({
        where:{
          identifier: transaction.idTag,
        },
        include:{
          user:{
            include:{
              wallet:true,
            },
          },
        },
      });


    if (!credential?.user.wallet) {
      throw new ForbiddenException(
        "Wallet not found",
      );
    }


    const runningCostKobo =
      Math.ceil(
        (currentEnergyWh / 1000) *
        transaction.station.tariffKoboPerKwh,
      );


    const remainingKobo =
      credential.user.wallet.balanceKobo -
      runningCostKobo;


    if (remainingKobo <= 0) {
      return {
        allowed:false,
        reason:"Wallet depleted",
        runningCostKobo,
        remainingKobo,
      };
    }


    return {
      allowed:true,
      runningCostKobo,
      remainingKobo,
    };
  }

}
