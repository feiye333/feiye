/**
 * 解析 GitHub Issue 内容，写入飞书多维表格
 * 在 GitHub Actions 中运行（由 add-data.yml 触发）
 */

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
const TABLE_ID = process.env.FEISHU_TABLE_ID;
const ISSUE_BODY = process.env.ISSUE_BODY || "";
const FEISHU_BASE = "https://open.feishu.cn/open-apis";

function parseField(body, field) {
  var regex = new RegExp(field + ":\\s*(.+)");
  var match = body.match(regex);
  return match ? match[1].trim() : null;
}

async function main() {
  console.log("1. 解析 Issue 内容...");
  var info1 = parseField(ISSUE_BODY, "身份");
  var info2 = parseField(ISSUE_BODY, "车辆");
  var jine = parseField(ISSUE_BODY, "金额");
  var zhongliang = parseField(ISSUE_BODY, "重量");

  console.log("   身份=" + info1);
  console.log("   车辆=" + info2);
  console.log("   金额=" + jine);
  console.log("   重量=" + zhongliang);

  if (!info1 || !info2 || !jine || !zhongliang) {
    console.log("   字段不完整，跳过");
    process.exit(0);
  }

  console.log("2. 获取 tenant_access_token...");
  var tokenResp = await fetch(FEISHU_BASE + "/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  var tokenData = await tokenResp.json();
  if (!tokenData.tenant_access_token) {
    throw new Error("获取token失败: " + JSON.stringify(tokenData));
  }
  var token = tokenData.tenant_access_token;
  console.log("   token 获取成功");

  console.log("3. 写入飞书多维表格...");
  var createResp = await fetch(
    FEISHU_BASE + "/bitable/v1/apps/" + APP_TOKEN + "/tables/" + TABLE_ID + "/records",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "编号1": info1,
          "编号2": info2,
          "金额": Number(jine),
          "重量": Number(zhongliang),
        },
      }),
    }
  );
  var createData = await createResp.json();

  if (createData.code !== 0) {
    throw new Error("写入飞书失败: " + createData.msg);
  }

  console.log("   写入成功！记录ID: " + createData.data.record.record_id);
}

main().catch(function (err) {
  console.error("Error:", err.message);
  process.exit(1);
});
