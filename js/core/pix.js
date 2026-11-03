// Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase();

/** @returns {string} payload Pix copia e cola */
export function payloadPix({ chave, nome, cidade = "MANAUS", txid = "***", valor = null }) {
  const mai = campo("00", "br.gov.bcb.pix") + campo("01", chave.trim());
  let p = campo("00", "01") + campo("26", mai) + campo("52", "0000") + campo("53", "986");
  if (valor) p += campo("54", Number(valor).toFixed(2));
  p += campo("58", "BR") + campo("59", semAcento(nome).slice(0, 25)) + campo("60", semAcento(cidade).slice(0, 15));
  p += campo("62", campo("05", txid));
  p += "6304";
  return p + crc16(p);
}

export const chaveEhPlaceholder = (c) => !c || /^\[.*\]$/.test(c.trim());
