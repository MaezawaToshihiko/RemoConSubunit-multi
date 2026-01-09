const Promise = require("bluebird");
const fs = require("fs-extra");
const path = require("path");
const luxon = require("luxon");
const execSync = require("child_process").execSync;
const crypto = require("crypto");
const { sprintf } = require("sprintf-js");

const joind_dir = path.resolve(__dirname, "..", "joind");
// メッセージ送信間隔
const status_interval = 10 * 60 * 1000; // 10分
const analog_interval = 1 * 60 * 1000; // 1分
const monitor_interval = 10 * 1000; // 10秒

var device_no = 1;
console.log("start at " + luxon.DateTime.utc());

// プロセスclose
process.on("close", (code, signal) => {
  console.log(`process closed. (CODE=${code}, SIGNAL=${signal})`);
});
// プロセスexit
process.on("exit", (code, signal) => {
  console.log(`process exit. (CODE=${code}, SIGNAL=${signal})`);
});
// 未キャッチ例外
process.on("uncaughtException", (error) => {
  console.log(`process caught exception. (error=${error})`);
});
// Promise reject
process.on("unhandledRejection", (reason, p) => {
  console.log(`process caught unhandle rejection at ${p}. (reason=${reason})`);
});

// Azure向けにメッセージ送信（joind経由）
function send_azure(tx_data, status_dir) {
  let utc_now = luxon.DateTime.utc();

  tx_data.datetime = utc_now.toISO();

  const msg_str = JSON.stringify(tx_data).replace(/[\n\r]/g, "");
  const msg_str2 = msg_str.replace(/\\r/g, "");
  const msg_str_cmp = msg_str2.replace(/\\n/g, "　");

  const uuid = crypto.randomUUID();
  const file_name = "subunit_status_" + utc_now.toFormat("yyyyMMddHHmmssSSS") + "_" + uuid;
  const send_work_file = path.join(status_dir, file_name + ".tmp");
  fs.writeFileSync(send_work_file, msg_str_cmp);

  const send_file = path.join(status_dir, file_name + ".json");
  console.log(send_file, tx_data);
  fs.renameSync(send_work_file, send_file);
}

// 子機起動通知
function send_start(device) {
  console.log("start:", device);

  // status message template
  let utc_now = luxon.DateTime.utc();
  let tx_data = {
    datetime: utc_now,
    value: {
      type: 200,
      src: device.src_fpga,
      msg: "STATUS_REP",
      sw_state: 1,
      version: "v1.4.0-multi/v1.0.0/v3.0.6-multi/",
      started_at: utc_now.toISO(),
    },
  };

  send_azure(tx_data, device.send_dir);
}

const datas_analog_fpga = [
  "111122223333444455556666777788889999aaaabbbbcccc,22223333444455556666777788889999aaaabbbbccccdddd,3333444455556666777788889999aaaabbbbccccddddeeee,444455556666777788889999aaaabbbbccccddddeeeeffff",
  "22223333444455556666777788889999aaaabbbbccccdddd,3333444455556666777788889999aaaabbbbccccddddeeee,444455556666777788889999aaaabbbbccccddddeeeeffff,55556666777788889999aaaabbbbccccddddeeeeffff1111",
  "3333444455556666777788889999aaaabbbbccccddddeeee,444455556666777788889999aaaabbbbccccddddeeeeffff,55556666777788889999aaaabbbbccccddddeeeeffff1111,6666777788889999aaaabbbbccccddddeeeeffff11112222",
  "444455556666777788889999aaaabbbbccccddddeeeeffff,55556666777788889999aaaabbbbccccddddeeeeffff1111,6666777788889999aaaabbbbccccddddeeeeffff11112222,777788889999aaaabbbbccccddddeeeeffff111122223333",
  "55556666777788889999aaaabbbbccccddddeeeeffff1111,6666777788889999aaaabbbbccccddddeeeeffff11112222,777788889999aaaabbbbccccddddeeeeffff111122223333,88889999aaaabbbbccccddddeeeeffff1111222233334444",
  "6666777788889999aaaabbbbccccddddeeeeffff11112222,777788889999aaaabbbbccccddddeeeeffff111122223333,88889999aaaabbbbccccddddeeeeffff1111222233334444,9999aaaabbbbccccddddeeeeffff11112222333344445555",
  "777788889999aaaabbbbccccddddeeeeffff111122223333,88889999aaaabbbbccccddddeeeeffff1111222233334444,9999aaaabbbbccccddddeeeeffff11112222333344445555,aaaabbbbccccddddeeeeffff111122223333444455556666",
  "88889999aaaabbbbccccddddeeeeffff1111222233334444,9999aaaabbbbccccddddeeeeffff11112222333344445555,aaaabbbbccccddddeeeeffff111122223333444455556666,bbbbccccddddeeeeffff1111222233334444555566667777",
  "9999aaaabbbbccccddddeeeeffff11112222333344445555,aaaabbbbccccddddeeeeffff111122223333444455556666,bbbbccccddddeeeeffff1111222233334444555566667777,ccccddddeeeeffff11112222333344445555666677778888",
  "aaaabbbbccccddddeeeeffff111122223333444455556666,bbbbccccddddeeeeffff1111222233334444555566667777,ccccddddeeeeffff11112222333344445555666677778888,ddddeeeeffff111122223333444455556666777788889999",
  "bbbbccccddddeeeeffff1111222233334444555566667777,ccccddddeeeeffff11112222333344445555666677778888,ddddeeeeffff111122223333444455556666777788889999,eeeeffff111122223333444455556666777788889999aaaa",
  "ccccddddeeeeffff11112222333344445555666677778888,ddddeeeeffff111122223333444455556666777788889999,eeeeffff111122223333444455556666777788889999aaaa,ffff111122223333444455556666777788889999aaaabbbb",
  "ddddeeeeffff111122223333444455556666777788889999,eeeeffff111122223333444455556666777788889999aaaa,ffff111122223333444455556666777788889999aaaabbbb,111122223333444455556666777788889999aaaabbbbcccc",
  "eeeeffff111122223333444455556666777788889999aaaa,ffff111122223333444455556666777788889999aaaabbbb,111122223333444455556666777788889999aaaabbbbcccc,22223333444455556666777788889999aaaabbbbccccdddd",
  "ffff111122223333444455556666777788889999aaaabbbb,111122223333444455556666777788889999aaaabbbbcccc,22223333444455556666777788889999aaaabbbbccccdddd,3333444455556666777788889999aaaabbbbccccddddeeee",
  "000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000",
];
const datas_status_fpga = [
  "000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffff,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff,000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff",
  "000000000000000000000000000000000000000000000000,ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff",
  "000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,ffffffffffffffffffffffffffffffffffffffffffffffff,ffffffffffffffffffffffffffffffffffffffffffffffff",
  "000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,000000000000000000000000000000000000000000000000,ffffffffffffffffffffffffffffffffffffffffffffffff",
];
const datas_analog_lan = [
  "111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff1111222233334444",
  "22223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff11112222333344445555",
  "3333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666",
  "444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff1111222233334444555566667777",
  "55556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff11112222333344445555666677778888",
  "6666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999",
  "777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaa",
  "88889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbb",
  "9999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbcccc",
  "aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccdddd",
  "bbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeee",
  "ccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff",
  "ddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff1111",
  "eeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff11112222",
  "ffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333444455556666777788889999aaaabbbbccccddddeeeeffff111122223333",
];
const datas_status_lan = [
  "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000",
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffff",
];

function make_monitorData(id, ch, level) {
  const monitor_status = (id, ch, level) => {
    const status_template = "%d,CH%d,%s,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d";
    return sprintf(
      status_template,
      Number(id),
      Number(ch),
      String(level),
      ...Array.from({ length: 14 }, () => (Math.random() < 0.5 ? 0 : 1)),
    );
  };
  const monitor_analog = () => {
    const analog_template = "%1.1f,%1.1f,%1.1f,%1.1e,%1.1e,%1.1e";
    let a = [
      Number(crypto.randomInt(-100, 100)),
      Number(crypto.randomInt(0, 100) / 100),
      Number(crypto.randomInt(0, 100) / 100),
      Number(crypto.randomInt(0, 10) / 10 ** crypto.randomInt(1, 9)),
      Number(crypto.randomInt(0, 10) / 10 ** crypto.randomInt(1, 9)),
      Number(crypto.randomInt(0, 10) / 10 ** crypto.randomInt(1, 9)),
    ];
    return sprintf(analog_template, a[0], a[1], a[2], a[3], a[4], a[5]);
  };

  let data = [];

  // <日時>
  const now = luxon.DateTime.now().setZone("Asia/Tokyo");
  data.push(now.toFormat("yyyy/MM/dd HH:mm:ss"));

  // <アラーム番号>,<チャネル番号>,<BER測定階層>,<各種状態>
  data.push(monitor_status(id, ch, level));

  // <瞬時値>
  data.push(monitor_analog());

  // <network_id値>
  data.push("0");

  // 定期配信データは 最大値，最小値，平均値を乗せる
  if (id == 0) {
    // <最大値>
    data.push(monitor_analog());
    // <最小値>
    data.push(monitor_analog());
    // <平均値>
    data.push(monitor_analog());
  }

  return data.join(",");
}

/**
 * 電波モニタデータを送信(複数まとめ)
 **/
function send_monitor(device, type, src, target) {
  let utc_now = luxon.DateTime.utc();
  let tx_data = {
    datetime: utc_now,
    value: {
      type: type,
      src: src,
      target: target,
      sw_state: 1,
      data: "",
    },
  };
  let data = device.monitor.ch.map((ch) => make_monitorData(0, ch, "A"));
  tx_data.value.data = data.join("　");
  tx_data.value.type = type;
  send_azure(tx_data, device.send_dir);
}

/**
 * analog_dataを送信
 **/
function send_analog(device, type, src, target, datas) {
  let utc_now = luxon.DateTime.utc();
  let tx_data = {
    datetime: utc_now,
    value: {
      type: type,
      src: src,
      target: target,
      sw_state: 1,
      data: "",
      seq_number: 0,
    },
  };
  let data = [];
  for (let m = device.analog.merge; m > 0; --m) {
    data.push([datas[device.analog.data_no], String((-m + 1) * 10000)].join("."));

    device.analog.data_no++;
    if (device.analog.data_no >= datas.length) {
      device.analog.data_no = 0;
    }
  }
  tx_data.value.data = data.join(":");
  tx_data.value.type = type;
  if (!device.analog.seq_number[type]) {
    device.analog.seq_number[type] = 0;
  }
  tx_data.value.seq_number = device.analog.seq_number[type]++;
  send_azure(tx_data, device.send_dir);
}

/**
 * status_dataをキューイングしてまとめて送信
 **/
// メッセージ送信要求（複数データのマージ対応）
const sendReq = (tx_data, status_dir) => {
  try {
    const utc_now = luxon.DateTime.utc();

    // 1オブジェクト -> JSON文字列化 + 改行/復帰の除去（実体・エスケープ）
    const sanitizeJson = (obj) => {
      // JSON文字列化
      const s = JSON.stringify(obj);
      // 実体の改行/復帰を除去（万一含まれていても1行にする）
      const s1 = s.replace(/[\n\r]/g, "");
      // 文字列中のエスケープ改行/復帰を除去 or 置換
      const s2 = s1.replace(/\\r/g, "");
      // 既存仕様を踏襲：\\n を全角スペースに置換
      const s3 = s2.replace(/\\n/g, "　");
      return s3;
    };

    let body; // ファイルに書き出す本文
    let ext; // 拡張子

    if (Array.isArray(tx_data)) {
      // 各要素がオブジェクトか検証しつつ、NDJSON化（1要素＝1行）
      const lines = tx_data.map((elem, idx) => {
        if (elem === null || typeof elem !== "object" || Array.isArray(elem)) {
          throw new Error(`sendReq: tx_data[${idx}] はオブジェクトではありません`);
        }
        return sanitizeJson(elem); // 各行は1行のJSON文字列
      });
      body = lines.join("\n"); // NDJSON（行区切り）
      ext = ".json";
    } else if (tx_data !== null && typeof tx_data === "object") {
      // 単一オブジェクト -> 1行のJSON文字列
      body = sanitizeJson(tx_data);
      ext = ".json";
    } else {
      throw new Error("sendReq: tx_data はオブジェクトまたはオブジェクト配列である必要があります");
    }

    // 作業ディレクトリに生成（拡張子は種別に応じて .json / .ndjson）
    const uuid = crypto.randomUUID();
    const file_name = "subunit_status_" + utc_now.toFormat("yyyyMMddHHmmssSSS") + "_" + uuid;
    const send_work_file = path.join(status_dir, file_name + ".tmp");
    fs.writeFileSync(send_work_file, body);

    const send_file = path.join(status_dir, file_name + ".json");
    console.log(send_file, tx_data);
    fs.renameSync(send_work_file, send_file);

    return body.length;
  } catch (error) {
    logger.error("[sendReq]", error);
    return -1; // 作成できなかったとして -1 を返す
  }
};
// status_dataのデキュー
const status_data_expire = (device) => {
  let now = luxon.DateTime.local().toMillis();

  // 消す前に保存済ステータスデータをすべてクラウドへ送信(リモコンマスク解除時)
  send_status_data_2_cloud(device);

  device.status_data_timer = null;
  while (device.status_data_queue.length > 0) {
    if (device.status_data_queue[0].expire < now) {
      // 廃棄時間超過
      device.status_data_queue.shift(); // 先頭要素を削除
    } else {
      device.status_data_timer = setTimeout(status_data_expire, device.status_data_queue[0].expire - now, device);
      break;
    }
  }
};
// status_dataのエンキュー
function add_status_data(tx_data, device) {
  const utc_now = luxon.DateTime.utc(); // 現在時刻（= ステータスの変化時刻）
  const expire = luxon.DateTime.local().toMillis() + device.status_data_ttl; // データの有効期限

  // キューにstatus_dataを保存
  tx_data.datetime = utc_now.toISO();
  tx_data.seq_no = device.status_data_number++;
  if (device.status_data_number >= Number.MAX_SAFE_INTEGER) {
    device.status_data_number = 0;
  }
  delete tx_data.sw_state; // sw_stateは外側に最新状態を乗せるため削除
  device.status_data_queue.push({
    expire: expire,
    tx_data: tx_data,
  });

  if (device.status_data_timer == null) {
    // キューイングしたstatus_dataの破棄タイマ起動
    device.status_data_timer = setTimeout(status_data_expire, device.status_data_ttl, device);
  } else {
    // すでにタイマは起動しているのでなにもしない
  }
}
// status_dataキュー全体を送信
function send_status_data_2_cloud(device) {
  try {
    const mqtt_max = 256 * 1000; // 256KB
    const utc_now = luxon.DateTime.utc();
    const tx_data = {
      datetime: utc_now.toISO(),
      values: device.status_data_queue.map((data) => {
        return data.tx_data;
      }),
    };

    // マスク状態を乗せる
    tx_data.sw_state = 0x01;

    // 送信状態遷移に「送信要求」を発行
    const message_size = sendReq(tx_data, device.send_dir);
    // D2Cメッセージサイズ上限チェック（上限超えでもログは記録、そのまま送信）
    if (message_size >= mqtt_max) {
      logger.warn("[AZURE] mqtt message size over 256KB");
    }
  } catch (error) {
    error_log(error);
  }
}
function send_status(device, type, src, target, datas) {
  let utc_now = luxon.DateTime.utc();
  let tx_data = {
    datetime: utc_now,
    value: {
      type: type,
      src: src,
      target: target,
      sw_state: 1,
      data: "",
    },
  };
  let data = [];
  for (let m = device.status.merge ?? 1; m > 0; --m) {
    data.push([datas[device.status.data_no], String((-m + 1) * 10000)].join("."));

    device.status.data_no++;
    if (device.status.data_no >= datas.length) {
      device.status.data_no = 0;
    }
  }
  tx_data.value.data = data.join(":");
  tx_data.value.type = type;

  add_status_data(tx_data.value, device);
  send_status_data_2_cloud(device);
}

const RemoConSubunit = async (joind) => {
  let device = { analog: {}, status: {}, monitor: {} };

  // device設定作成
  device.no = device_no;
  device.dir = path.join(joind, "mailbox");
  device.src_fpga = "192.168.1.10/24";
  device.src_lan = ["192.168.1.11/24", "192.168.1.21/24", "192.168.1.31/24", "192.168.1.41/24"];
  device.src_mon = "192.168.1.51/24";
  device.send_dir = path.join(device.dir, "send", "status");

  device.analog.data_no = 0;
  device.analog.merge = 6;
  device.analog.seq_number = {};

  device.monitor.type = 5;
  device.monitor.ch = [21, 18];

  device.status.data_no = 0;
  device.status.merge = 1;
  device.status.seq_number = {};

  device.status_data_queue = []; // 送信するstatus_dataをキューイング
  device.status_data_timer = null; // キューイングしたstatus_dataの破棄タイマ
  device.status_data_ttl = 10 * 60 * 1000; // 10分
  device.status_data_number = 0;

  // 起動通知
  setTimeout(
    () => {
      send_start(device);
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // アナログデータ通知(FPGA)
  setTimeout(
    () => {
      device.analog.timer_fpga = setInterval(
        async (device) => {
          send_analog(device, 102, device.src_fpga, 0, datas_analog_fpga);
        },
        analog_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // アナログデータ通知(LAN)
  setTimeout(
    () => {
      device.analog.timer_lan_0 = setInterval(
        async (device) => {
          send_analog(device, 106, device.src_lan[0], 0, datas_analog_lan);
        },
        analog_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // アナログデータ通知(LAN)
  setTimeout(
    () => {
      device.analog.timer_lan_1 = setInterval(
        async (device) => {
          send_analog(device, 106, device.src_lan[1], 1, datas_analog_lan);
        },
        analog_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // アナログデータ通知(LAN)
  setTimeout(
    () => {
      device.analog.timer_lan_2 = setInterval(
        async (device) => {
          send_analog(device, 106, device.src_lan[2], 2, datas_analog_lan);
        },
        analog_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // アナログデータ通知(LAN)
  setTimeout(
    () => {
      device.analog.timer_lan_3 = setInterval(
        async (device) => {
          send_analog(device, 106, device.src_lan[3], 3, datas_analog_lan);
        },
        analog_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // アナログデータ通知(電波モニタ)
  setTimeout(
    () => {
      device.monitor.timer = setInterval(
        async (device) => {
          send_monitor(device, device.monitor.type + 100, device.src_fpga, 0);
        },
        monitor_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // ステータスデータ通知(FPGA)
  setTimeout(
    () => {
      device.status.timer_fpga = setInterval(
        async (device) => {
          send_status(device, 2, device.src_fpga, 0, datas_status_fpga);
        },
        status_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // ステータスデータ通知(LAN)
  setTimeout(
    () => {
      device.status.timer_lan_0 = setInterval(
        async (device) => {
          send_status(device, 6, device.src_lan[0], 0, datas_status_lan);
        },
        status_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // ステータスデータ通知(LAN)
  setTimeout(
    () => {
      device.status.timer_lan_1 = setInterval(
        async (device) => {
          send_status(device, 6, device.src_lan[1], 1, datas_status_lan);
        },
        status_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // ステータスデータ通知(LAN)
  setTimeout(
    () => {
      device.status.timer_lan_2 = setInterval(
        async (device) => {
          send_status(device, 6, device.src_lan[2], 2, datas_status_lan);
        },
        status_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );

  // ステータスデータ通知(LAN)
  setTimeout(
    () => {
      device.status.timer_lan_3 = setInterval(
        async (device) => {
          send_status(device, 6, device.src_lan[3], 3, datas_status_lan);
        },
        status_interval,
        device,
      );
    },
    crypto.randomInt(10, 60 * 1000),
  );
};

/**
 * 入力JSONファイル（配列の配列）を読み込み、各ディレクトリに serial.json を生成する
 * @param {string} inputJsonPath - 入力JSONファイルのパス
 * @param {string} fixedPassword - password に使用する固定文字列
 * @returns {Promise<number>} - 生成（書き込み）した件数
 */
async function makeSerialFiles(inputJsonPath) {
  // 1) 入力の読み込み
  const raw = await fs.readFile(inputJsonPath, "utf8");
  let entries;
  try {
    entries = JSON.parse(raw);
  } catch (e) {
    throw new Error(`入力JSONの構文が不正です: ${e.message}`);
  }

  if (!Array.isArray(entries)) {
    throw new Error("入力JSONは配列である必要があります");
  }

  let written = [];

  // 2) 各要素の処理
  for (const item of entries) {
    if (!Array.isArray(item) || item.length < 2) {
      console.warn("[warn] スキップ: 2要素配列ではありません ->", item);
      continue;
    }
    const [dir, mac] = item;

    if (typeof dir !== "string" || typeof mac !== "string") {
      console.warn("[warn] スキップ: 要素が文字列ではありません ->", item);
      continue;
    }

    // 3) ディレクトリとファイルパスの決定
    const data_dir = path.resolve(joind_dir, "volumes", dir);
    console.log(`joind = ${data_dir}`);
    written.push(data_dir);
  }

  return written;
}

async function wakeup_RemoConSubunits(workers) {
  if (workers && workers.length > 0) {
    const results = await Promise.all(workers.map((w) => RemoConSubunit(w)));
    console.log("wakeup finaly");
  }
}

(async () => {
  const input = process.argv[2]; // 例: ./remocons.json

  if (!input) {
    console.error("使い方: node post.js <remocons.json>");
    process.exit(1);
  }

  console.log(`input = ${input}`);

  // joind ディレクトリ列を生成
  const workers = await makeSerialFiles(path.resolve(input));

  console.log(`start ${workers.length} RemoConSubunit.`);
  await wakeup_RemoConSubunits(workers);
})().catch((error) => {
  console.error("エラー:", error.message);
  process.exit(1);
});
