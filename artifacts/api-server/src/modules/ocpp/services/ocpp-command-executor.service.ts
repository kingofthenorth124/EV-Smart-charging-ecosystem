import { Injectable, Logger } from '@nestjs/common';
import { OcppConnectionRegistry } from './ocpp-connection.registry';
import { OcppCommandService } from './ocpp-command.service';


@Injectable()
export class OcppCommandExecutorService {

  private readonly logger = new Logger(
    OcppCommandExecutorService.name,
  );


  constructor(
    private readonly registry: OcppConnectionRegistry,
    private readonly commandService: OcppCommandService,
  ) {}


  async executePendingCommand(commandId: string) {

    const command =
      await this.commandService.getCommand(commandId);


    if (!command) {
      throw new Error(
        `Command ${commandId} not found`,
      );
    }


    const connection =
      this.registry.get(
        command.chargePointId,
      );


    if (!connection) {

      this.logger.warn(
        `Charge point ${command.chargePointId} offline`,
      );

      return {
        status: 'OFFLINE',
      };
    }


    await this.commandService.markSent(
      command.id,
    );


    const payload = [
      2,
      command.id,
      command.command,
      command.payload ?? {},
    ];


    connection.send(
      JSON.stringify(payload),
    );


    this.logger.log(
      `OCPP command sent ${command.command}`,
    );


    return {
      status: 'SENT',
      commandId: command.id,
    };
  }

}
