import { INestApplication } from "@nestjs/common";
import { createApp } from "../../test/test-app.factory";
import { OcppCommandService } from "./services/ocpp-command.service";
import { OcppConnectionRegistry } from "./services/ocpp-connection.registry";
import { OcppMessageRouter } from "./services/ocpp-message.router";


describe("OCPP Module Regression", () => {

  let app: INestApplication;
  let commandService: OcppCommandService;
  let registry: OcppConnectionRegistry;


  const chargePointId =
    "016b95c7-6a6f-478f-896d-a79319ef683e";


  const fakeSocket = () => ({
    readyState: 1,
    send: jest.fn(),
  } as any);



  beforeAll(async () => {

    const result =
      await createApp();

    app =
      result.app;

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

    });



    it("MeterValues accepted", async () => {

      const router =
        app.get(OcppMessageRouter);


      const result =
        await router.route(
          chargePointId,
          "MeterValues",
          {
            connectorId:1,
            transactionId:1788760657,
            meterValue:[
              {
                sampledValue:[
                  {
                    value:"2500",
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


      const result =
        await router.route(
          chargePointId,
          "StopTransaction",
          {
            transactionId:1788760657,
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

      const result =
        await commandService.remoteStopTransaction(
          chargePointId,
          1788760657,
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
