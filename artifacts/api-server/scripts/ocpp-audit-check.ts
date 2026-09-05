import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter =
  new PrismaPg({
    connectionString:
      process.env.DATABASE_URL!,
  });

const prisma =
  new PrismaClient({
    adapter,
  });


async function main() {

  const total =
    await prisma.ocppAuditEvent.count();


  const latest =
    await prisma.ocppAuditEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });


  console.log("================================");
  console.log("OCPP AUDIT LEDGER CHECK");
  console.log("================================");

  console.log(
    "Total audit events:",
    total,
  );


  console.log(
    JSON.stringify(
      latest,
      null,
      2,
    ),
  );
}


main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
