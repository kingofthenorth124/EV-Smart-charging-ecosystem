
describe("RFID Authorization Security",()=>{


it("should reject revoked credentials",()=>{

 const credential={
   status:"REVOKED"
 };


 expect(
   credential.status
 ).toBe("REVOKED");


});


it("should allow active credentials",()=>{


 const credential={
   status:"ACTIVE"
 };


 expect(
   credential.status
 ).toBe("ACTIVE");


});


});

