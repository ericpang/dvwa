import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    instanceId: "i-09988776655vulnlab",
    accountId: "123456789012",
    region: "us-east-1",
    iamRole: "vulnlab-prod-admin-role",
    credentials: {
      AccessKeyId: "AKIAVULNLABPROD99281",
      SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYVULNLABKEY",
      Token: "FLAG{SSRF_INTERNAL_METADATA_ENDPOINT_REACHED}",
    },
  });
}
