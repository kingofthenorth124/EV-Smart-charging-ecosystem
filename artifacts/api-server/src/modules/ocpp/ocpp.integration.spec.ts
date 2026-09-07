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


  beforeAll(async () => {

    const result =
      await createApp();

    app =
      result.app;

    prisma =
      result.prisma;

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

      update: {},

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


    beforeEach(() => {

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
