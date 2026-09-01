// 轻量 DOCX 生成/解析工具（不依赖第三方库）
// 导出：将纯文本打包为最小可用 .docx（STORE 方式 ZIP）
// 导入：解析本工具生成的 .docx，还原纯文本
// 说明：仅支持 STORE(0) 条目；用 Word/Pages 编辑保存过的文件可能解析失败

// ===== UTF-8 编解码 =====
function utf8Encode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
      const c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
        c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        i++;
      }
    }
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    } else if (c < 0x10000) {
      bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    } else {
      bytes.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
  }
  return new Uint8Array(bytes);
}

function utf8Decode(bytes) {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i++;
    } else if (b < 0xE0 && i + 1 < bytes.length) {
      out += String.fromCharCode(((b & 0x1F) << 6) | (bytes[i + 1] & 0x3F));
      i += 2;
    } else if (b < 0xF0 && i + 2 < bytes.length) {
      out += String.fromCharCode(
        ((b & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F)
      );
      i += 3;
    } else if (i + 3 < bytes.length) {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3F) << 12) |
        ((bytes[i + 2] & 0x3F) << 6) |
        (bytes[i + 3] & 0x3F);
      out += String.fromCodePoint(cp);
      i += 4;
    } else {
      i++;
    }
  }
  return out;
}

// ===== CRC32（ZIP 校验） =====
const CRC_TABLE = (() => {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ===== ZIP（仅 STORE 方式）打包/解包 =====
function concatArrays(arrays) {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// entries: [{ name: string, data: Uint8Array }] -> ArrayBuffer
function zipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = utf8Encode(e.name);
    const dataBytes = e.data;
    const nameLen = nameBytes.length;
    const dataLen = dataBytes.length;
    const crc = crc32(dataBytes);

    // Local File Header
    const lh = new Uint8Array(30 + nameLen);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);       // version needed
    lv.setUint16(6, 0x0800, true);    // flags: UTF-8 文件名
    lv.setUint16(8, 0, true);         // method: STORE
    lv.setUint16(10, 0, true);        // mod time
    lv.setUint16(12, 0x21, true);     // mod date (1980-01-01)
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataLen, true);
    lv.setUint32(22, dataLen, true);
    lv.setUint16(26, nameLen, true);
    lv.setUint16(28, 0, true);        // extra len
    lh.set(nameBytes, 30);
    localParts.push(lh, dataBytes);

    // Central Directory File Header
    const ch = new Uint8Array(46 + nameLen);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);        // version made by
    cv.setUint16(6, 20, true);        // version needed
    cv.setUint16(8, 0x0800, true);    // flags
    cv.setUint16(10, 0, true);        // method
    cv.setUint16(12, 0, true);        // time
    cv.setUint16(14, 0x21, true);     // date
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataLen, true);
    cv.setUint32(24, dataLen, true);
    cv.setUint16(28, nameLen, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);   // local header offset
    ch.set(nameBytes, 46);
    centralParts.push(ch);

    offset += 30 + nameLen + dataLen;
  }

  const centralStart = offset;
  const centralBytes = concatArrays(centralParts);

  // End of Central Directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralBytes.length, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);

  return concatArrays(localParts.concat([centralBytes, eocd])).buffer;
}

// ArrayBuffer -> { name: Uint8Array | null }（null 表示非 STORE，不支持）
function unzipStore(buffer) {
  const bytes = new Uint8Array(buffer);
  const result = {};
  let i = 0;
  while (i + 30 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + i, 30);
    if (view.getUint32(0, true) !== 0x04034b50) break;
    const method = view.getUint16(8, true);
    const compSize = view.getUint32(18, true);
    const nameLen = view.getUint16(26, true);
    const extraLen = view.getUint16(28, true);
    const dataStart = i + 30 + nameLen + extraLen;
    const name = utf8Decode(bytes.subarray(i + 30, i + 30 + nameLen));
    if (method === 0) {
      result[name] = bytes.subarray(dataStart, dataStart + compSize);
    } else {
      result[name] = null;
    }
    i = dataStart + compSize;
  }
  return result;
}

// ===== XML 转义 =====
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#xD;/g, '')
    .replace(/&#10;/g, '\n')
    .replace(/&amp;/g, '&');
}

// ===== DOCX 生成 =====
// text -> ArrayBuffer（合法 .docx 文件）
function createDocx(text) {
  const lines = String(text).split('\n');
  const paras = lines
    .map((l) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(l)}</w:t></w:r></w:p>`)
    .join('');

  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + paras + '</w:body></w:document>';

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const entries = [
    { name: '[Content_Types].xml', data: utf8Encode(contentTypes) },
    { name: '_rels/.rels', data: utf8Encode(rels) },
    { name: 'word/document.xml', data: utf8Encode(documentXml) }
  ];
  return zipStore(entries);
}

// ===== DOCX 解析 =====
// ArrayBuffer -> string（提取 document.xml 中的纯文本，段落以换行连接）
function parseDocx(buffer) {
  const files = unzipStore(buffer);
  const docXml = files['word/document.xml'];
  if (!docXml) {
    throw new Error('DOCX 缺少 document.xml');
  }
  const xml = utf8Decode(docXml);
  const paras = xml.split('</w:p>');
  const lines = [];
  const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  for (const p of paras) {
    const texts = [];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(p)) !== null) {
      texts.push(m[1]);
    }
    lines.push(unescapeXml(texts.join('')));
  }
  // 去掉末尾空行
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

module.exports = {
  createDocx,
  parseDocx,
  isDocxName: (name) => /\.docx$/i.test(name || '')
};
