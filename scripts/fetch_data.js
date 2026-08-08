/**
 * 飞书数据抓取脚本
 * 在 GitHub Actions 中运行，从飞书多维表格抓取数据存为 data.json
 * 手机浏览器直接读 data.json，不需要服务端
 */

const fs = require("fs");

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const APP_TOKEN = process.env.FEISHU_APP_TOKEN;
const TABLE_ID = process.env.FEISHU_TABLE_ID;
const FEISHU_BASE = "https://open.feishu.cn/open-apis";

function extractValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return val;
  if (Array.isArray(val)) {
    return val.map(function(s) {
      return typeof s === "object" ? (s.text || "") : String(s);
    }).join("");
  }
  if (typeof val === "object") {
    return val.text || val.value || "";
  }
  return String(val);
}

function toNumber(val) {
  if (typeof val === "number") return val;
  var n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

async function main() {
  console.log("1. 获取 tenant_access_token...");
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

  console.log("2. 获取多维表格记录...");
  var allRecords = [];
  var pageToken = null;
  var pageNum = 0;

  do {
    pageNum++;
    var url = FEISHU_BASE + "/bitable/v1/apps/" + APP_TOKEN + "/tables/" + TABLE_ID + "/records?page_size=100";
    if (pageToken) url += "&page_token=" + pageToken;

    var resp = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });
    var data = await resp.json();

    if (data.code !== 0) {
      throw new Error("飞书API错误: " + data.msg);
    }

    var items = data.data.items || [];
    var processed = items.map(function(r) {
      var f = r.fields || {};
      return {
        bianhao1: String(extractValue(f["编号1"])).trim(),
        bianhao2: String(extractValue(f["编号2"])).trim(),
        jine: toNumber(extractValue(f["金额"])),
        zhongliang: toNumber(extractValue(f["重量"])),
      };
    });
    allRecords = allRecords.concat(processed);
    console.log("   第" + pageNum + "页: " + items.length + " 条");

    pageToken = data.data.has_more ? data.data.page_token : null;
  } while (pageToken);

  console.log("   共获取 " + allRecords.length + " 条记录");

  var output = {
    updated_at: new Date().toISOString(),
    count: allRecords.length,
    records: allRecords,
  };

  fs.writeFileSync("data.json", JSON.stringify(output, null, 2));
  console.log("3. 已保存到 data.json");
}

main().catch(function(err) {
  console.error("Error:", err.message);
  process.exit(1);
});
