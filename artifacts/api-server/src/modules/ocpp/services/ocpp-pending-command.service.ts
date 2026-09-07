import { Injectable, Logger } from "@nestjs/common";

type PendingCommand = {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timer: NodeJS.Timeout;
  action: string;
};

@Injectable()
export class OcppPendingCommandService {

  private readonly logger =
    new Logger(OcppPendingCommandService.name);


  private readonly pending =
    new Map<string, PendingCommand>();


  register(
    messageId: string,
    action: string,
    timeoutMs = 30000,
  ): Promise<any> {

    return new Promise((resolve, reject) => {

      const timer =
        setTimeout(() => {

          this.pending.delete(messageId);

          this.logger.warn(
            `OCPP command timeout ${action} ${messageId}`,
          );

          reject(
            new Error(
              `OCPP timeout ${action}`,
            ),
          );

        }, timeoutMs);


      this.pending.set(
        messageId,
        {
          resolve,
          reject,
          timer,
          action,
        },
      );

    });

  }



  resolve(
    messageId: string,
    payload: any,
  ) {

    const command =
      this.pending.get(messageId);


    if (!command) {
      return;
    }


    clearTimeout(
      command.timer,
    );


    this.pending.delete(
      messageId,
    );


    command.resolve(
      payload,
    );

  }



  reject(
    messageId: string,
    error: any,
  ) {

    const command =
      this.pending.get(messageId);


    if (!command) {
      return;
    }


    clearTimeout(
      command.timer,
    );


    this.pending.delete(
      messageId,
    );


    command.reject(
      error,
    );

  }

}
