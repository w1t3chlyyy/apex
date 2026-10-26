import crypto from "crypto";

const LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN || "";
const TEST = process.env.ROBOKASSA_TEST_MODE === "1";
const ALGO = process.env.ROBOKASSA_HASH_ALGO || "sha256";

const PASS1 = TEST ? process.env.ROBOKASSA_TEST_PASSWORD_1 || "" : process.env.ROBOKASSA_PASSWORD_1 || "";
const PASS2 = TEST ? process.env.ROBOKASSA_TEST_PASSWORD_2 || "" : process.env.ROBOKASSA_PASSWORD_2 || "";

function hash(s: string) {
  return crypto.createHash(ALGO).update(s, "utf8").digest("hex");
}

export function robokassaConfigured() {
  return Boolean(LOGIN && PASS1 && PASS2);
}

export function formatOutSum(amount: number) {
  return amount.toFixed(2); // Robokassa ждёт "1490.00"
}

export function buildPaymentUrl(opts: { invId: number; amount: number; description: string }) {
  const outSum = formatOutSum(opts.amount);
  const signature = hash(`${LOGIN}:${outSum}:${opts.invId}:${PASS1}`);

  const params = new URLSearchParams({
    MerchantLogin: LOGIN,
    OutSum: outSum,
    InvId: String(opts.invId),
    Description: opts.description,
    SignatureValue: signature,
    Culture: "ru",
  });
  if (TEST) params.set("IsTest", "1");

  return `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`;
}

export function verifyResultSignature(outSum: string, invId: string, signature: string) {
  const expected = hash(`${outSum}:${invId}:${PASS2}`).toLowerCase();
  const got = (signature || "").toLowerCase();
  if (expected.length !== got.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}
