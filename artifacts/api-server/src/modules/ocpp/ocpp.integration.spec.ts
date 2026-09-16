import { INestApplication } from "@nestjs/common";
import { createApp } from "../../test/test-app.factory";
import { OcppCommandService } from "./services/ocpp-command.service";
import { OcppConnectionRegistry } from "./services/ocpp-connection.registry";
import { OcppPendingCommandService } from "./services/ocpp-pending-command.service";
import { OcppMessageRouter } from "./services/ocpp-message.router";


describe("OCPP Module Regression", () => {

  let remoteStopSpy: jest.SpyInstance;

  let app: INestApplication;
  let prisma: any;
  let testUserId: string;
  let activeTransactionId: number;
  let commandService: OcppCommandService;
  let registry: OcppConnectionRegistry;


  const chargePointId =
    "016b95c7-6a6f-478f-896d-a79319ef683e";


  const fakeSocket = () => ({
    readyState: 1,
    send: jest.fn(),
  } as any);



  const createRegisteredChargerFixture = async () => {

    const station =
      await prisma.station.create({
        data:{
          name:"Test OCPP Station",
          location:"Test Location",
          powerKw:22,
          connectorType:"Type2",
          connectorsTotal:1,
          connectorsAvailable:1,
          tariffKoboPerKwh:100,
          status:"AVAILABLE",
        },
      });


    const existingChargePoint =
      await prisma.chargePoint.findUnique({
        where:{
          serialNumber:chargePointId,
        },
      });


const chargePoint =
      existingChargePoint ||
      await prisma.chargePoint.create({
        data:{
          serialNumber:chargePointId,
          vendor:"Test Vendor",
          model:"Test Charger",
          protocolVersion:"OCPP1.6",
          status:"AVAILABLE",
        },
      });


    await prisma.connector.upsert({

      where:{
        chargePointId_connectorNumber:{
          chargePointId: chargePoint.id,
          connectorNumber: 1,
        },
      },

      update:{
        stationId: station.id,
        status:"AVAILABLE",
      },

      create:{
        chargePointId:chargePoint.id,
        stationId:station.id,
        connectorNumber:1,
        status:"AVAILABLE",
      },

    });


    return {
      station,
      chargePoint,
    };

  };


  const createChargingTransaction = async () => {

    await prisma.wallet.update({
      where:{
        userId:testUserId,
      },
      data:{
        balanceKobo:100000,
      },
    });
    const router =
      app.get(OcppMessageRouter);
const result =
      await router.route(
        chargePointId,
        "StartTransaction",
        {
          connectorId:1,
          idTag:"TEST123",
          meterStart:0,
          timestamp:
            new Date().toISOString(),
        },
      );
if (!result.transactionId) {
      throw new Error(
        "Failed to create charging transaction fixture: "
        + JSON.stringify(result),
      );
    }


    return result.transactionId;
  };



  beforeEach(async () => {

    await prisma.chargingSession.updateMany({
      where:{
        userId:testUserId,
        status:"ACTIVE",
      },
      data:{
        status:"STOPPED",
        endedAt:new Date(),
      },
    });

  });



  beforeEach(() => {

    remoteStopSpy =
      jest.spyOn(
        OcppCommandService.prototype,
        "remoteStopTransaction",
      )
      .mockResolvedValue({
        accepted:true,
      } as any);

  });


  afterEach(() => {

    remoteStopSpy?.mockRestore();

  });



  const createRegisteredChargePoint = async () => {

    const station =
      await prisma.station.findFirst();


    const chargePoint =
      await prisma.chargePoint.upsert({

        where:{
          serialNumber: chargePointId,
        },

        update:{},

        create:{

          serialNumber: chargePointId,

          vendor:"TestVendor",

          model:"TestModel",

          status:"AVAILABLE",

          connectors:{
            create:{
              connectorNumber:1,
              stationId:station.id,
              status:"AVAILABLE",
            },
          },

        },

      });


    return chargePoint;

  };


  beforeAll(async () => {

    const result =
      await createApp();

    app =
      result.app;

    prisma =
      result.prisma;


    await createRegisteredChargerFixture();

    const testUser =
      await prisma.user.upsert({
        where: {
          email: "rfid-test@example.com",
        },

        update: {},

        create: {
          firstName: "Test",
          lastName: "RFID",
          email: "rfid-test@example.com",
          phone: "08000000001",
          passwordHash: "test",
          status: "ACTIVE",

          wallet: {
            create: {
              balanceKobo: 100000,
              status: "ACTIVE",
            },
          },

          credentials: {
            create: {
              identifier: "TEST123",
              status: "ACTIVE",
            },
          },
        },
      });

    testUserId = testUser.id;


    await prisma.chargingCredential.upsert({
      where: {
        identifier: "TEST123",
      },

      update: {
        userId: testUser.id,
        status: "ACTIVE",
      },

      create: {
        identifier: "TEST123",
        userId: testUser.id,
        status: "ACTIVE",
      },
    });

    commandService =
      app.get(OcppCommandService);

    registry =
      app.get(OcppConnectionRegistry);

  });



  afterAll(async () => {

    await app.close();

  });



  describe("Charger → Server handlers", () => {


    it("BootNotification accepted", async () => {

    const credentialCheck =
      await prisma.chargingCredential.findUnique({
        where:{
          identifier:"TEST123",
        },
        include:{
          user:{
            include:{
              wallet:true,
            },
          },
        },
      });

    console.log(
      "TEST123 OWNER",
      JSON.stringify(
        {
          userId:credentialCheck?.userId,
          wallet:credentialCheck?.user?.wallet?.balanceKobo,
        },
        null,
        2
      )
    );


      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "BootNotification",
          {
            vendor:
              "TestVendor",

            model:
              "TestModel",
          },
        );


      expect(result.status)
        .toBe("Accepted");

    });



    it("Heartbeat accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "Heartbeat",
          {},
        );


      expect(result.currentTime)
        .toBeDefined();

    });



    it("StatusNotification accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "StatusNotification",
          {
            connectorId:1,
            status:"Available",
            errorCode:"NoError",
          },
        );


      expect(result)
        .toBeDefined();

    });



    it("Authorize accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "Authorize",
          {
            idTag:"TEST123",
          },
        );


      expect(
        result.idTagInfo.status,
      )
        .toBe("Accepted");

    });




    it("StartTransaction rejects unknown RFID", async () => {

      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "StartTransaction",
          {
            connectorId:1,
            idTag:"UNKNOWN_RFID_CARD",
            meterStart:0,
          },
        );


      expect(
        result.idTagInfo.status,
      )
        .toBe("Invalid");


      expect(
        result.transactionId,
      )
        .toBe(0);

    });



    it("StartTransaction rejects RFID with insufficient wallet balance", async () => {

      await prisma.wallet.update({
        where:{
          userId: testUserId,
        },
        data:{
          balanceKobo: 500,
        },
      });


      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "StartTransaction",
          {
            connectorId:1,
            idTag:"TEST123",
            meterStart:0,
          },
        );


      expect(
        result.idTagInfo.status,
      )
        .toBe("Invalid");


      expect(
        result.transactionId,
      )
        .toBe(0);

    });


    it("StartTransaction accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "StartTransaction",
          {
            connectorId:1,
            idTag:"TEST123",
            meterStart:0,
            timestamp:
              new Date().toISOString(),
          },
        );


      expect(result.transactionId)
        .toBeDefined();


      activeTransactionId =
        result.transactionId;

    });




    it("MeterValues stops charging when prepaid wallet is depleted", async () => {

      const router =
        app.get(OcppMessageRouter);


      await prisma.wallet.update({
        where: {
          userId: testUserId,
        },
        data: {
          balanceKobo: 100000,
        },
      });


      const start =
        await router.route(
          chargePointId,
          "StartTransaction",
          {
            connectorId:1,
            idTag:"TEST123",
            meterStart:0,
            timestamp:
              new Date().toISOString(),
          },
        );


      const transactionId =
        start.transactionId;
await prisma.wallet.update({
        where:{
          userId:testUserId,
        },
        data:{
          balanceKobo:1,
        },
      });


      const handlerCommandService =
        app.get(OcppCommandService);

      const commandSpy =
        jest
          .spyOn(
            handlerCommandService,
            "remoteStopTransaction",
          )
          .mockResolvedValue({
            accepted:true,
          } as any);
const result =
        await router.route(
          chargePointId,
          "MeterValues",
          {
            connectorId:1,
            transactionId,
            meterValue:[
              {
                sampledValue:[
                  {
                    value:"50000",
                    unit:"Wh",
                  },
                ],
              },
            ],
          },
        );


      expect(result.accepted)
        .toBeDefined();
expect(commandSpy)
        .toHaveBeenCalled();


      commandSpy.mockRestore();

    });


    it("MeterValues accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const transactionId =
        await createChargingTransaction();


      const result =
        await router.route(
          chargePointId,
          "MeterValues",
          {
            connectorId:1,
            transactionId,
            meterValue:[
              {
                sampledValue:[
                  {
                    value:"250000",
                    unit:"Wh",
                  },
                ],
              },
            ],
          },
        );


      expect(result.accepted)
        .toBe(true);

    });



    it("StopTransaction accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const transactionId =
        await createChargingTransaction();


      const result =
        await router.route(
          chargePointId,
          "StopTransaction",
          {
            transactionId,
            meterStop:5000,
            reason:"Local",
          },
        );


      expect(result.idTagInfo.status)
        .toBe("Accepted");

    });

  });



  describe("Server → Charger commands", () => {


    beforeEach(async () => {

      await createRegisteredChargePoint();

      registry.register(
        chargePointId,
        fakeSocket(),
      );

    });



    it("RemoteStartTransaction dispatches", async()=>{

      const socket =
        fakeSocket();

      registry.register(
        chargePointId,
        socket,
      );


      const result =
        await commandService.remoteStartTransaction(
          chargePointId,
          1,
          "TEST_USER",
        );


      expect(result.accepted)
        .toBe(true);

    });



    it("RemoteStopTransaction dispatches", async()=>{

      const transactionId =
        await createChargingTransaction();


      const result =
        await commandService.remoteStopTransaction(
          chargePointId,
          transactionId,
        );


      expect(result.accepted)
        .toBe(true);

    });



    it("Reset dispatches", async()=>{

      const result =
        await commandService.reset(
          chargePointId,
          "Soft",
        );


      expect(result.accepted)
        .toBe(true);

    });



    it("UnlockConnector dispatches", async()=>{

      const result =
        await commandService.unlockConnector(
          chargePointId,
          1,
        );


      expect(result.accepted)
        .toBe(true);

    });



    it("ChangeAvailability dispatches", async()=>{

      const result =
        await commandService.changeAvailability(
          chargePointId,
          1,
          "Inoperative",
        );


      expect(result.accepted)
        .toBe(true);

    });


  });


});


describe("OCPP Failure Regression", () => {

  let app: any;
  let commandService: any;
  let registry: any;


  const chargePointId =
    "016b95c7-6a6f-478f-896d-a79319ef683e";



  const createRegisteredChargePoint = async () => {

    const station =
      await prisma.station.findFirst();


    const chargePoint =
      await prisma.chargePoint.upsert({

        where:{
          serialNumber: chargePointId,
        },

        update:{},

        create:{

          serialNumber: chargePointId,

          vendor:"TestVendor",

          model:"TestModel",

          status:"AVAILABLE",

          connectors:{
            create:{
              connectorNumber:1,
              stationId:station.id,
              status:"AVAILABLE",
            },
          },

        },

      });


    return chargePoint;

  };


  beforeAll(async () => {

    const result =
      await createApp();

    app = result.app;

    commandService =
      app.get(OcppCommandService);

    registry =
      app.get(OcppConnectionRegistry);

  });


  afterAll(async () => {

    await app.close();

  });



  it("rejects command when charger is offline", async()=>{

    registry.remove(
      chargePointId,
    );


    const result =
      await commandService.remoteStartTransaction(
        chargePointId,
        1,
        "OFFLINE_TEST",
      );


    expect(result.accepted)
      .toBe(false);

  });



  it("rejects unknown charger", async()=>{


    const result =
      await commandService.remoteStartTransaction(
        "UNKNOWN-CHARGER",
        1,
        "TEST",
      );


    expect(result.accepted)
      .toBe(false);


  });



  it("replaces old charger connection",()=>{


    const oldSocket:any =
      {
        readyState:1,
        close:jest.fn(),
      };


    const newSocket:any =
      {
        readyState:1,
        close:jest.fn(),
      };


    registry.register(
      chargePointId,
      oldSocket,
    );


    registry.register(
      chargePointId,
      newSocket,
    );


    expect(oldSocket.close)
      .toHaveBeenCalled();


    expect(
      registry.get(chargePointId),
    )
      .toBe(newSocket);


  });


});


describe("OCPP Pending Command Lifecycle", () => {

  let pending: OcppPendingCommandService;



  const createRegisteredChargePoint = async () => {

    const station =
      await prisma.station.findFirst();


    const chargePoint =
      await prisma.chargePoint.upsert({

        where:{
          serialNumber: chargePointId,
        },

        update:{},

        create:{

          serialNumber: chargePointId,

          vendor:"TestVendor",

          model:"TestModel",

          status:"AVAILABLE",

          connectors:{
            create:{
              connectorNumber:1,
              stationId:station.id,
              status:"AVAILABLE",
            },
          },

        },

      });


    return chargePoint;

  };


  beforeAll(async () => {

    const result =
      await createApp();

    pending =
      result.app.get(OcppPendingCommandService);

  });








  it("resolves pending command when CALL_RESULT arrives", async () => {

    const messageId =
      "test-message-001";


    const response =
      pending.register(
        messageId,
        "RemoteStartTransaction",
        5000,
      );


    pending.resolve(
      messageId,
      {
        status:"Accepted",
      },
    );


    await expect(response)
      .resolves
      .toEqual({
        status:"Accepted",
      });

  });



  it("times out missing CALL_RESULT", async () => {

    const response =
      pending.register(
        "timeout-message",
        "RemoteStopTransaction",
        50,
      );


    await expect(response)
      .rejects
      .toThrow(
        "OCPP timeout",
      );

  });

});


describe("OCPP Command Response Reconciliation", () => {


  let responseService: any;
  let responsePrisma: any;
  let responseApp: INestApplication;
  const responseChargePointId =
    "016b95c7-6a6f-478f-896d-a79319ef683e";




  const createRegisteredChargePoint = async () => {

    const station =
      await prisma.station.findFirst();


    const chargePoint =
      await prisma.chargePoint.upsert({

        where:{
          serialNumber: chargePointId,
        },

        update:{},

        create:{

          serialNumber: chargePointId,

          vendor:"TestVendor",

          model:"TestModel",

          status:"AVAILABLE",

          connectors:{
            create:{
              connectorNumber:1,
              stationId:station.id,
              status:"AVAILABLE",
            },
          },

        },

      });


    return chargePoint;

  };


  beforeAll(async () => {

    const result =
      await createApp();

    responseApp =
      result.app;

    responsePrisma =
      result.prisma;

    responseService =
      responseApp.get(
        require("./services/ocpp-command-response.service")
        .OcppCommandResponseService
      );

  });


  afterAll(async () => {

    await responseApp.close();

  });




  it("marks command COMPLETED after CALL_RESULT response", async () => {


    const command =
      await responsePrisma.ocppCommand.create({

        data: {

          chargePointId: responseChargePointId,

          command:
            "RemoteStartTransaction",

          payload:{
            connectorId:1,
          },

          status:
            "SENT",

        },

      });



    const updated =
      await responseService.handleResponse(
        command.id,
        {
          status:
            "Accepted",
        },
      );



    expect(updated.status)
      .toBe("COMPLETED");


    expect(updated.response)
      .toEqual({
        status:"Accepted",
      });


  });



  it("marks command FAILED after CALL_ERROR response", async () => {


    const command =
      await responsePrisma.ocppCommand.create({

        data: {

          chargePointId: responseChargePointId,

          command:
            "RemoteStopTransaction",

          payload:{
            transactionId:123,
          },

          status:
            "SENT",

        },

      });



    const updated =
      await responseService.markFailed(
        command.id,
        {
          errorCode:
            "InternalError",

          description:
            "Charger rejected request",
        },
      );



    expect(updated.status)
      .toBe("FAILED");


    expect(updated.response)
      .toEqual({
        errorCode:
          "InternalError",

        description:
          "Charger rejected request",
      });


  });


});
